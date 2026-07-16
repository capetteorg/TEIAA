-- =====================================================================
-- ANAMNESE TEACOLHER — CAMPOS COMPLETOS (fase 2)
-- Amplia a tabela "anamneses" com os blocos que as fichas de papel das
-- profissionais já cobriam: diagnostico/laudo, gestacao e parto detalhados,
-- marcos com idade, perfil sensorial, estereotipias, comunicacao (TEA),
-- comportamento/rigidez, seletividade alimentar, antropometria e
-- antecedentes familiares.
--
-- PRE-REQUISITO: rodar antes o sql_prontuario_teacolher.sql (cria a tabela).
-- Como rodar: Supabase -> SQL Editor -> New query -> colar tudo -> Run.
-- Pode rodar mais de uma vez sem problema (tudo IF NOT EXISTS).
-- =====================================================================

-- 1. Queixa e diagnóstico
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS diagnostico text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS diagnostico_cid text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS diagnostico_profissional text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS diagnostico_data date;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS possui_laudo text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS expectativa_familia text;

-- 2. Gestação, parto e primeiros meses
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS gravidez_planejada text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS pre_natal text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS pre_natal_inicio text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS intercorrencias_gestacao jsonb DEFAULT '[]'::jsonb;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS tipo_parto text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS semanas_gestacao text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS prematuro text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS apgar text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS intercorrencias_parto jsonb DEFAULT '[]'::jsonb;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS amamentacao text;

-- 3. Marcos do desenvolvimento
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS marco_rolou text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS marco_sentou text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS marco_engatinhou text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS marco_andou text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS marco_primeiras_palavras text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS marco_frases text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS marco_esfincter_diurno text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS marco_esfincter_noturno text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS dominancia_manual text;

-- 4. Saúde
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS condicoes_saude jsonb DEFAULT '[]'::jsonb;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS problemas_visao text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS problemas_audicao text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS vacinas text;

-- 5. Perfil sensorial e estereotipias
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS sensibilidade_auditiva text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS sensibilidade_visual text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS sensibilidade_tatil text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS sensibilidade_gustativa_olfativa text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS sensibilidade_vestibular text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS reacoes_sensoriais text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS estereotipias jsonb DEFAULT '[]'::jsonb;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS estereotipias_detalhes text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS estrategias_regulacao text;

-- 6. Comunicação e linguagem
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS forma_comunicacao jsonb DEFAULT '[]'::jsonb;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS contato_visual text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS responde_ao_nome text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS fala_compreensivel text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS compreende_ordens text;

-- 7. Comportamento, interação e rotina
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS brincadeira_preferencia text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS brincadeira_funcional text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS interesses_restritos text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS reacao_mudanca_rotina text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS reacao_frustracao text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS comportamentos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS medos text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS tempo_telas text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS reacao_saida_telas text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS socializacao text;

-- 8. Alimentação e sono
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS seletividade_alimentar text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS seletividade_detalhes text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS reacao_novos_alimentos text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS rituais_refeicao text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS peso text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS altura text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS imc text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS sono_caracteristicas jsonb DEFAULT '[]'::jsonb;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS sono_detalhes text;

-- 9. Vida escolar
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS escola_tipo text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS tem_mediador text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS adaptacoes_escolares text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS queixas_escola text;

-- 10. Contexto sociofamiliar e antecedentes
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS com_quem_mora text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS antecedentes_familiares jsonb DEFAULT '[]'::jsonb;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS antecedentes_familiares_detalhes text;
