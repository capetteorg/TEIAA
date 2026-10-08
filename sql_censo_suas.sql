-- =====================================================================
-- CENSO SUAS — respostas do questionário anual (MDS) — TEIAA
-- ---------------------------------------------------------------------
-- Uma linha por ano + tipo de questionário (hoje só 'centro_dia', o de
-- "Centro Dia e outras unidades de habilitação e reabilitação de pessoas
-- com deficiência"). As respostas ficam num jsonb (`respostas`), porque o
-- questionário muda um pouco todo ano e assim nenhuma pergunta nova exige
-- ALTER TABLE.
--
-- Tem CPF/RG da equipe (questão 37) → só ADMIN e OPERACIONAL.
--
-- ATENÇÃO: rodar ANTES do deploy — as telas Equipe e Usuários Atendidos
-- passam a gravar as colunas novas lá de baixo e quebram sem elas.
--
-- Como rodar: Supabase (projeto da TEIAA) -> SQL Editor -> New query ->
-- colar -> Run. Idempotente (pode rodar de novo sem problema).
-- =====================================================================

create table if not exists public.censo_suas (
  id             uuid primary key default gen_random_uuid(),
  ano            int  not null,
  tipo           text not null default 'centro_dia',
  respostas      jsonb not null default '{}'::jsonb,
  status         text not null default 'rascunho',   -- rascunho / concluido
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid,
  unique (ano, tipo)
);

alter table public.censo_suas enable row level security;

drop policy if exists "Admin e operacional gerenciam censo suas" on public.censo_suas;
create policy "Admin e operacional gerenciam censo suas"
  on public.censo_suas for all
  to authenticated
  using (perfil_atual() in ('admin','operacional'))
  with check (perfil_atual() in ('admin','operacional'));

grant select, insert, update, delete on public.censo_suas to authenticated;

-- ---------------------------------------------------------------------
-- EQUIPE — dados pessoais que o Censo pede (Q37) e a Equipe não tinha.
-- A Equipe é a ficha oficial da pessoa: o que for preenchido no Censo
-- grava AQUI (e aparece na tela Equipe). Os códigos do Censo (vínculo,
-- função, carga) NÃO vêm pra cá — são tradução pro formulário do MDS.
-- escolaridade = texto por extenso ("Ensino Superior Completo").
-- ---------------------------------------------------------------------
alter table public.equipe
  add column if not exists sexo         text,   -- 'F' / 'M'
  add column if not exists rg_numero    text,
  add column if not exists rg_orgao     text,
  add column if not exists rg_uf        text,
  add column if not exists email        text,
  add column if not exists escolaridade text;

-- ---------------------------------------------------------------------
-- USUÁRIOS ATENDIDOS — recebe BPC? (Q33 do Censo)
-- 'sim' / 'nao' / null (= não informado)
-- ---------------------------------------------------------------------
alter table public.usuarios_atendidos
  add column if not exists recebe_bpc text;

notify pgrst, 'reload schema';
