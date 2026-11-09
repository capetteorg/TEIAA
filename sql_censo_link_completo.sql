-- =====================================================================
-- CENSO SUAS — LINK DO CENSO INTEIRO — TEIAA
-- ---------------------------------------------------------------------
-- O mesmo link do administrativo (censo_links) passa a abrir o Censo
-- todo, não só a equipe. A equipe (Q37) continua passando pelas funções
-- censo_equipe_* (sql_censo_link_equipe.sql), com CPF/RG mascarados.
--
-- censo_link_abrir_censo  → devolve as respostas SEM a equipe
-- censo_link_salvar_censo → grava as respostas SEM mexer na equipe;
--                           p_terminei = true marca status 'enviado'
--                           (o administrativo terminou; o admin revisa e
--                           marca 'concluido' na tela do sistema).
-- Censo já 'concluido' não aceita mais gravação pelo link.
--
-- PRÉ-REQUISITO: sql_censo_link_equipe.sql (rodado em 09/11/2026).
-- Como rodar: Supabase (projeto da TEIAA) -> SQL Editor -> New query ->
-- colar -> Run. Idempotente. Rodar ANTES do deploy.
-- =====================================================================

create or replace function public.censo_link_abrir_censo(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link public.censo_links;
  v_row  public.censo_suas;
  v_inst text;
begin
  select * into v_link from public.censo_links where token = p_token;
  if v_link.id is null or not v_link.ativo or v_link.expira_em < now() then
    raise exception 'link_invalido';
  end if;
  select * into v_row from public.censo_suas where ano = v_link.ano and tipo = 'centro_dia';
  select coalesce(nome_fantasia, nome_completo) into v_inst from public.instituicao limit 1;
  return jsonb_build_object(
    'ano', v_link.ano, 'instituicao', v_inst, 'expira_em', v_link.expira_em,
    'status', coalesce(v_row.status, 'rascunho'),
    'respostas', coalesce(v_row.respostas, '{}'::jsonb) - 'equipe');
end $$;

create or replace function public.censo_link_salvar_censo(p_token text, p_respostas jsonb, p_terminei boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link public.censo_links;
  v_row  public.censo_suas;
  v_nova jsonb;
begin
  select * into v_link from public.censo_links where token = p_token;
  if v_link.id is null or not v_link.ativo or v_link.expira_em < now() then
    raise exception 'link_invalido';
  end if;
  if jsonb_typeof(p_respostas) is distinct from 'object' then raise exception 'respostas_invalidas'; end if;

  insert into public.censo_suas (ano, tipo) values (v_link.ano, 'centro_dia') on conflict (ano, tipo) do nothing;
  select * into v_row from public.censo_suas where ano = v_link.ano and tipo = 'centro_dia' for update;
  if v_row.status = 'concluido' then raise exception 'censo_concluido'; end if;

  -- tudo do link, menos a equipe (que é gravada pessoa a pessoa por censo_equipe_salvar)
  v_nova := (p_respostas - 'equipe')
            || jsonb_build_object('equipe', coalesce(v_row.respostas->'equipe', '[]'::jsonb),
                                  '_link_salvo_em', now());

  update public.censo_suas
     set respostas = v_nova,
         atualizado_em = now(),
         status = case when p_terminei then 'enviado' else status end
   where id = v_row.id;

  return jsonb_build_object('ok', true, 'status', case when p_terminei then 'enviado' else v_row.status end);
end $$;

revoke all on function public.censo_link_abrir_censo(text) from public;
revoke all on function public.censo_link_salvar_censo(text, jsonb, boolean) from public;
grant execute on function public.censo_link_abrir_censo(text) to anon, authenticated;
grant execute on function public.censo_link_salvar_censo(text, jsonb, boolean) to anon, authenticated;

notify pgrst, 'reload schema';
