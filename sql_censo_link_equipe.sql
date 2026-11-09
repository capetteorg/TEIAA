-- =====================================================================
-- CENSO SUAS — LINK DA EQUIPE (questão 37) — TEIAA
-- ---------------------------------------------------------------------
-- Um link público (sem login) pro administrativo da TEIAA preencher a
-- equipe do Censo: /censo-equipe/<token>.
--
-- Segurança:
--  * o link só funciona enquanto ativo e dentro do prazo (expira_em);
--  * o navegador NUNCA lê as tabelas direto: tudo passa pelas funções
--    censo_equipe_abrir / censo_equipe_salvar (security definer), que só
--    mexem na equipe ATIVA e só nos campos do Censo;
--  * CPF e RG já cadastrados voltam MASCARADOS (quem pegar o link não vê
--    o documento inteiro);
--  * campo enviado vazio nunca apaga o que já está na Equipe.
--
-- PRÉ-REQUISITO: sql_censo_suas.sql (já rodado em 08/10/2026).
-- Como rodar: Supabase (projeto da TEIAA) -> SQL Editor -> New query ->
-- colar -> Run. Idempotente. Rodar ANTES do deploy.
-- =====================================================================

-- Formação (profissão do Censo, por extenso) na ficha da Equipe
alter table public.equipe add column if not exists formacao text;

-- Links gerados pelo admin/operacional
create table if not exists public.censo_links (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  ano        int  not null,
  ativo      boolean not null default true,
  expira_em  timestamptz not null default (now() + interval '30 days'),
  criado_em  timestamptz not null default now(),
  criado_por uuid
);

alter table public.censo_links enable row level security;
drop policy if exists "Admin e operacional gerenciam links do censo" on public.censo_links;
create policy "Admin e operacional gerenciam links do censo"
  on public.censo_links for all to authenticated
  using (perfil_atual() in ('admin','operacional'))
  with check (perfil_atual() in ('admin','operacional'));
grant select, insert, update, delete on public.censo_links to authenticated;

-- ---------------------------------------------------------------------
-- Máscaras
-- ---------------------------------------------------------------------
create or replace function public.censo_mascara_cpf(t text) returns text
language sql immutable as $$
  select case
    when coalesce(t, '') = '' then ''
    when length(regexp_replace(t, '\D', '', 'g')) = 11 then
      '***.' || substr(regexp_replace(t, '\D', '', 'g'), 4, 3) || '.' || substr(regexp_replace(t, '\D', '', 'g'), 7, 3) || '-**'
    else '•••' || right(regexp_replace(t, '\s', '', 'g'), 3)
  end
$$;

create or replace function public.censo_mascara_doc(t text) returns text
language sql immutable as $$
  select case when coalesce(t, '') = '' then '' else '•••' || right(regexp_replace(t, '\s', '', 'g'), 3) end
$$;

-- ---------------------------------------------------------------------
-- Abrir: devolve a equipe ativa (dados pessoais mascarados) + o que já
-- está no Censo daquele ano (códigos) + as pessoas incluídas à mão.
-- ---------------------------------------------------------------------
create or replace function public.censo_equipe_abrir(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link public.censo_links;
  v_resp jsonb;
  v_inst text;
  v_pessoas jsonb;
  v_manuais jsonb;
begin
  select * into v_link from public.censo_links where token = p_token;
  if v_link.id is null or not v_link.ativo or v_link.expira_em < now() then
    raise exception 'link_invalido';
  end if;

  select coalesce(respostas, '{}'::jsonb) into v_resp from public.censo_suas where ano = v_link.ano and tipo = 'centro_dia';
  v_resp := coalesce(v_resp, '{}'::jsonb);
  select coalesce(nome_fantasia, nome_completo) into v_inst from public.instituicao limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
      'equipe_id', e.id, 'nome', e.nome,
      'funcao_equipe', e.funcao, 'tipo_vinculo', e.tipo_vinculo, 'carga_horaria', e.carga_horaria, 'dias_atuacao', e.dias_atuacao,
      'nascimento', e.data_nascimento, 'inicio', e.data_entrada, 'sexo', e.sexo,
      'cpf_mask', public.censo_mascara_cpf(e.cpf), 'rg_mask', public.censo_mascara_doc(e.rg_numero),
      'rg_orgao', e.rg_orgao, 'rg_uf', e.rg_uf, 'email', e.email,
      'escolaridade_txt', e.escolaridade, 'formacao_txt', e.formacao,
      'censo', (select x - 'cpf' - 'rg_numero' from jsonb_array_elements(coalesce(v_resp->'equipe', '[]'::jsonb)) x
                where (x->>'equipe_id') = e.id::text limit 1)
    ) order by e.nome), '[]'::jsonb)
  into v_pessoas
  from public.equipe e where e.situacao = 'ativo';

  select coalesce(jsonb_agg((x - 'cpf' - 'rg_numero') || jsonb_build_object(
      'cpf_mask', public.censo_mascara_cpf(x->>'cpf'), 'rg_mask', public.censo_mascara_doc(x->>'rg_numero'))), '[]'::jsonb)
  into v_manuais
  from jsonb_array_elements(coalesce(v_resp->'equipe', '[]'::jsonb)) x
  where x->>'mid' is not null;

  return jsonb_build_object('ano', v_link.ano, 'instituicao', v_inst, 'expira_em', v_link.expira_em,
                            'pessoas', v_pessoas, 'manuais', v_manuais);
end $$;

-- ---------------------------------------------------------------------
-- Salvar UMA pessoa. p_pessoa traz equipe_id (pessoa da Equipe) OU mid
-- (pessoa incluída à mão), mais só os campos preenchidos.
--  * pessoa da Equipe: dados pessoais vão pra ficha da Equipe (vazio não
--    apaga) e os códigos do Censo pra respostas.equipe;
--  * pessoa à mão: tudo fica em respostas.equipe.
-- ---------------------------------------------------------------------
create or replace function public.censo_equipe_salvar(p_token text, p_pessoa jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link public.censo_links;
  v_id   bigint;
  v_mid  text;
  v_resp jsonb;
  v_lista jsonb;
  v_patch jsonb;
  v_achou boolean := false;
  v_nova jsonb := '[]'::jsonb;
  x jsonb;
  k text;
begin
  select * into v_link from public.censo_links where token = p_token;
  if v_link.id is null or not v_link.ativo or v_link.expira_em < now() then
    raise exception 'link_invalido';
  end if;

  v_id  := nullif(p_pessoa->>'equipe_id', '')::bigint;
  v_mid := nullif(p_pessoa->>'mid', '');
  if v_id is null and v_mid is null then raise exception 'pessoa_invalida'; end if;

  -- só os campos do Censo; vazio é ignorado
  v_patch := '{}'::jsonb;
  foreach k in array array['nome','nascimento','sexo','cpf','rg_numero','rg_orgao','rg_uf','email','escolaridade','profissao','vinculo','funcao','carga','inicio'] loop
    if coalesce(p_pessoa->>k, '') <> '' then v_patch := v_patch || jsonb_build_object(k, p_pessoa->>k); end if;
  end loop;
  if p_pessoa ? 'incluir' then v_patch := v_patch || jsonb_build_object('incluir', (p_pessoa->>'incluir')::boolean); end if;
  v_patch := v_patch || jsonb_build_object('link_em', now());

  if v_id is not null then
    if not exists (select 1 from public.equipe where id = v_id and situacao = 'ativo') then
      raise exception 'pessoa_invalida';
    end if;
    v_patch := (v_patch - 'nome') || jsonb_build_object('equipe_id', v_id);
    update public.equipe set
      data_nascimento = coalesce(nullif(p_pessoa->>'nascimento', '')::date, data_nascimento),
      data_entrada    = coalesce(nullif(p_pessoa->>'inicio', '')::date, data_entrada),
      sexo            = coalesce(nullif(p_pessoa->>'sexo', ''), sexo),
      cpf             = coalesce(nullif(p_pessoa->>'cpf', ''), cpf),
      rg_numero       = coalesce(nullif(p_pessoa->>'rg_numero', ''), rg_numero),
      rg_orgao        = coalesce(nullif(p_pessoa->>'rg_orgao', ''), rg_orgao),
      rg_uf           = coalesce(nullif(p_pessoa->>'rg_uf', ''), rg_uf),
      email           = coalesce(nullif(p_pessoa->>'email', ''), email),
      escolaridade    = coalesce(nullif(p_pessoa->>'escolaridade_txt', ''), escolaridade),
      formacao        = coalesce(nullif(p_pessoa->>'formacao_txt', ''), formacao)
    where id = v_id;
  else
    v_patch := v_patch || jsonb_build_object('mid', v_mid);
  end if;

  -- garante a linha do Censo do ano e mescla a pessoa em respostas.equipe
  insert into public.censo_suas (ano, tipo) values (v_link.ano, 'centro_dia') on conflict (ano, tipo) do nothing;
  select coalesce(respostas, '{}'::jsonb) into v_resp from public.censo_suas where ano = v_link.ano and tipo = 'centro_dia' for update;
  v_lista := coalesce(v_resp->'equipe', '[]'::jsonb);
  for x in select * from jsonb_array_elements(v_lista) loop
    if (v_id is not null and x->>'equipe_id' = v_id::text) or (v_mid is not null and x->>'mid' = v_mid) then
      v_nova := v_nova || jsonb_build_array(x || v_patch);
      v_achou := true;
    else
      v_nova := v_nova || jsonb_build_array(x);
    end if;
  end loop;
  if not v_achou then
    v_nova := v_nova || jsonb_build_array(jsonb_build_object('incluir', true, 'rg_uf', 'RJ') || v_patch);
  end if;

  update public.censo_suas
     set respostas = jsonb_set(v_resp, '{equipe}', v_nova), atualizado_em = now()
   where ano = v_link.ano and tipo = 'centro_dia';

  return jsonb_build_object('ok', true, 'link_em', v_patch->>'link_em');
end $$;

-- Remover pessoa incluída à mão (só as de "mid"; pessoa da Equipe se desmarca com incluir=false)
create or replace function public.censo_equipe_remover(p_token text, p_mid text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link public.censo_links;
  v_resp jsonb;
begin
  select * into v_link from public.censo_links where token = p_token;
  if v_link.id is null or not v_link.ativo or v_link.expira_em < now() then
    raise exception 'link_invalido';
  end if;
  select coalesce(respostas, '{}'::jsonb) into v_resp from public.censo_suas where ano = v_link.ano and tipo = 'centro_dia' for update;
  update public.censo_suas
     set respostas = jsonb_set(v_resp, '{equipe}', coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(v_resp->'equipe', '[]'::jsonb)) x where x->>'mid' is distinct from p_mid), '[]'::jsonb)),
         atualizado_em = now()
   where ano = v_link.ano and tipo = 'centro_dia';
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.censo_equipe_abrir(text) from public;
revoke all on function public.censo_equipe_salvar(text, jsonb) from public;
revoke all on function public.censo_equipe_remover(text, text) from public;
grant execute on function public.censo_equipe_abrir(text) to anon, authenticated;
grant execute on function public.censo_equipe_salvar(text, jsonb) to anon, authenticated;
grant execute on function public.censo_equipe_remover(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
