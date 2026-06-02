-- =============================================
-- CAPETTE FINANCEIRO — Schema do banco de dados
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- Tabela de usuários (perfis)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'diretoria', 'operacional')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de contas bancárias
CREATE TABLE contas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  banco TEXT NOT NULL,
  agencia TEXT,
  conta_num TEXT,
  preponderancia TEXT DEFAULT 'rateio',
  cor TEXT DEFAULT '#6BBF2B',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de categorias
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'despesa')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lançamentos
CREATE TABLE lancamentos (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  nf TEXT,
  conta_id INTEGER REFERENCES contas(id),
  categoria_id INTEGER REFERENCES categorias(id),
  conciliado BOOLEAN DEFAULT FALSE,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de rateio por preponderância
CREATE TABLE rateios (
  id SERIAL PRIMARY KEY,
  lancamento_id INTEGER REFERENCES lancamentos(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  percentual NUMERIC(5,2) NOT NULL
);

-- Tabela de classificações automáticas do extrato
CREATE TABLE classificacoes (
  id SERIAL PRIMARY KEY,
  tipo_doc TEXT NOT NULL,
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  classificacao TEXT NOT NULL,
  categoria TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de aplicações financeiras
CREATE TABLE aplicacoes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  conta_id INTEGER REFERENCES contas(id),
  saldo_atual NUMERIC(12,2) DEFAULT 0,
  data_inicio DATE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de rendimentos de aplicações
CREATE TABLE rendimentos (
  id SERIAL PRIMARY KEY,
  aplicacao_id INTEGER REFERENCES aplicacoes(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POLÍTICAS DE SEGURANÇA (Row Level Security)
-- =============================================

ALTER TABLE usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rateios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE classificacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aplicacoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendimentos     ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para pegar perfil do usuário autenticado
CREATE OR REPLACE FUNCTION perfil_atual()
RETURNS TEXT AS $$
  SELECT perfil FROM usuarios WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Políticas: admin acessa tudo
-- Operacional: só lê e insere lançamentos de despesa
-- Diretoria: só leitura geral

CREATE POLICY "Todos autenticados leem categorias"   ON categorias     FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin gerencia categorias"             ON categorias     FOR ALL    USING (perfil_atual() = 'admin');

CREATE POLICY "Todos autenticados leem contas"        ON contas         FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin gerencia contas"                 ON contas         FOR ALL    USING (perfil_atual() = 'admin');

CREATE POLICY "Todos leem lançamentos"                ON lancamentos    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin e operacional inserem"           ON lancamentos    FOR INSERT WITH CHECK (perfil_atual() IN ('admin','operacional'));
CREATE POLICY "Admin atualiza lançamentos"            ON lancamentos    FOR UPDATE USING (perfil_atual() = 'admin');

CREATE POLICY "Todos leem rateios"                    ON rateios        FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin e operacional inserem rateios"   ON rateios        FOR INSERT WITH CHECK (perfil_atual() IN ('admin','operacional'));

CREATE POLICY "Admin gerencia classificações"         ON classificacoes FOR ALL    USING (perfil_atual() = 'admin');

CREATE POLICY "Todos leem aplicações"                 ON aplicacoes     FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin gerencia aplicações"             ON aplicacoes     FOR ALL    USING (perfil_atual() = 'admin');

CREATE POLICY "Todos leem rendimentos"                ON rendimentos    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin gerencia rendimentos"            ON rendimentos    FOR ALL    USING (perfil_atual() = 'admin');

CREATE POLICY "Usuário lê próprio perfil"             ON usuarios       FOR SELECT USING (auth.uid() = id OR perfil_atual() = 'admin');
CREATE POLICY "Admin gerencia usuários"               ON usuarios       FOR ALL    USING (perfil_atual() = 'admin');

-- =============================================
-- DADOS INICIAIS
-- =============================================

INSERT INTO contas (nome, banco, agencia, conta_num, preponderancia, cor) VALUES
('Conta Principal', 'Sicredi', '0717', '13502-9', 'rateio', '#6BBF2B'),
('Emenda Parlamentar I', 'CEF', '', '', 'Educação', '#4A8FD4'),
('Emenda Parlamentar II', 'BB', '', '', 'Assistência Social', '#8B2FC9'),
('Emenda Parlamentar III', 'Itaú', '', '', 'Saúde', '#F4821F');

INSERT INTO categorias (nome, tipo) VALUES
('Contribuição de associados', 'entrada'),
('Recebimento PIX', 'entrada'),
('Repasse / Convênio', 'entrada'),
('Distribuição de sobras', 'entrada'),
('Doação abelha', 'entrada'),
('Serviços terceiros', 'despesa'),
('Contas de consumo', 'despesa'),
('Impostos e taxas', 'despesa'),
('Material de consumo / Papelaria', 'despesa'),
('Bens permanentes / Equipamentos', 'despesa'),
('Manutenção', 'despesa'),
('Outros', 'despesa');

INSERT INTO classificacoes (tipo_doc, direcao, classificacao, categoria) VALUES
('COB000001', 'entrada', 'Contribuição de associados', 'Receita associativa'),
('COB000001', 'saida',   'Taxa de cobrança',           'Impostos e taxas'),
('PIXCOBRAN', 'entrada', 'Contribuição de associados', 'Receita associativa'),
('SOBRCC',    'entrada', 'Distribuição de sobras',     'Rendimento'),
('TED',       'entrada', 'Repasse / Convênio',         'Convênio'),
('175707',    'entrada', 'Repasse / Convênio',         'Convênio'),
('PIX_CRED',  'entrada', 'Recebimento PIX',            'A classificar'),
('PIX_DEB',   'saida',   'Pagamento PIX',              'A classificar');
