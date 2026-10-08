-- =====================================================================
-- QUEM FOI ATENDIDO NA SESSÃO — TEAcolher
-- Às vezes o atendimento é com o pai/mãe/responsável do usuário, não com a
-- própria criança. Esta coluna guarda essa relação de forma estruturada, para
-- os relatórios distinguirem "atendimento à criança" de "atendimento à família".
-- O atendimento continua ligado à criança (usuario_atendido_id) — só marca
-- QUEM foi atendido. Sessões com a família NÃO entram na assiduidade da criança.
--
-- Valores: 'usuario' (a própria criança/adolescente — padrão), 'mae', 'pai',
--          'responsavel', 'outro'.
--
-- Como rodar: Supabase -> SQL Editor -> New query -> colar -> Run.
-- Idempotente (pode rodar de novo sem problema). Registros antigos ficam como
-- 'usuario' automaticamente (eram atendimentos à própria criança).
-- =====================================================================

ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS atendido_relacao text DEFAULT 'usuario';

-- Garante que linhas já existentes fiquem marcadas como atendimento à criança.
UPDATE atendimentos SET atendido_relacao = 'usuario' WHERE atendido_relacao IS NULL;
