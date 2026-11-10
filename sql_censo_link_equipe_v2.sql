-- =====================================================================
-- CENSO SUAS — LINK: pessoa nova vira ficha na EQUIPE — TEIAA
-- ---------------------------------------------------------------------
-- Quando o administrativo inclui alguém pelo link e salva com nome, CPF,
-- início na função, função e vínculo (no formato da Equipe/RH), a pessoa é cadastrada na
-- Equipe (ativa, "Cadastrada pelo Censo SUAS <ano>") e passa a ser uma
-- pessoa da Equipe no Censo. Sem esses dados, continua só no Censo.
--
-- PRÉ-REQUISITO: sql_censo_link_equipe.sql (rodado em 09/11/2026).
-- Como rodar: Supabase (projeto da TEIAA) -> SQL Editor -> New query ->
-- colar -> Run. Idempotente. Rodar ANTES do deploy.
-- =====================================================================

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
  v_criado boolean := false;
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

  -- pessoa nova (incluída no Censo) com os dados do RH: vira ficha na Equipe
  if v_id is null and coalesce(trim(p_pessoa->>'nome'), '') <> '' and coalesce(p_pessoa->>'cpf', '') <> ''
     and coalesce(p_pessoa->'casa'->>'funcao', '') <> '' and coalesce(p_pessoa->'casa'->>'tipo_vinculo', '') <> '' and coalesce(p_pessoa->>'inicio', '') <> '' then
    insert into public.equipe (nome, cpf, data_nascimento, data_entrada, sexo, rg_numero, rg_orgao, rg_uf, email, escolaridade, formacao,
                               funcao, tipo_vinculo, carga_horaria, dias_atuacao, situacao, orgao_origem, observacoes)
    values (trim(p_pessoa->>'nome'), p_pessoa->>'cpf', nullif(p_pessoa->>'nascimento', '')::date, nullif(p_pessoa->>'inicio', '')::date,
            nullif(p_pessoa->>'sexo', ''), nullif(p_pessoa->>'rg_numero', ''), nullif(p_pessoa->>'rg_orgao', ''), nullif(p_pessoa->>'rg_uf', ''),
            nullif(p_pessoa->>'email', ''), nullif(p_pessoa->>'escolaridade_txt', ''), nullif(p_pessoa->>'formacao_txt', ''),
            p_pessoa->'casa'->>'funcao', p_pessoa->'casa'->>'tipo_vinculo', nullif(p_pessoa->'casa'->>'carga_horaria', ''),
            nullif(p_pessoa->'casa'->>'dias_atuacao', ''), 'ativo', 'TEIAA', 'Cadastrada pelo Censo SUAS ' || v_link.ano)
    returning id into v_id;
    v_criado := true;
  end if;

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
      v_nova := v_nova || jsonb_build_array(case when v_criado then (x || v_patch) - 'mid' else x || v_patch end);
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

  return jsonb_build_object('ok', true, 'link_em', v_patch->>'link_em', 'equipe_id', case when v_criado then v_id end);
end $$;

notify pgrst, 'reload schema';
