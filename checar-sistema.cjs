// =============================================
// VERIFICADOR DO SISTEMA — AGENDO Integra
// Rodar na raiz do projeto:  node checar-sistema.cjs
// =============================================
const fs = require('fs')
const path = require('path')

let erros = 0
const ok = msg => console.log('  \x1b[32m✓\x1b[0m ' + msg)
const falha = msg => { console.log('  \x1b[31m✗\x1b[0m ' + msg); erros++ }

function existe(p, desc) {
  fs.existsSync(p) ? ok(desc + ' → ' + p) : falha(desc + ' FALTANDO em ' + p)
}
function contem(p, trecho, desc) {
  if (!fs.existsSync(p)) return falha(p + ' não existe')
  fs.readFileSync(p, 'utf8').includes(trecho) ? ok(desc) : falha(desc + ' — trecho não encontrado em ' + p)
}
function naoContem(p, trecho, desc) {
  if (!fs.existsSync(p)) return falha(p + ' não existe')
  !fs.readFileSync(p, 'utf8').includes(trecho) ? ok(desc) : falha(desc + ' — trecho ANTIGO ainda presente em ' + p)
}

console.log('\n1. ARQUIVOS NOVOS NO LUGAR CERTO')
existe('src/lib/ui.js', 'ui.js (modal + CSV)')
existe('src/lib/auditoria.js', 'auditoria.js')
existe('src/lib/pdf.js', 'pdf.js')
existe('src/components/Layout.jsx', 'Layout.jsx')

console.log('\n2. TODAS AS PÁGINAS (46)')
;['Aplicacoes','Atendimentos','Backup','Campanhas','Categorias','Classificacoes','Cobrancas',
  'Conciliacao','ConciliacaoInteligente','Configuracoes','Contas','ControleDividas','Doacoes',
  'Documentos','DocumentosFiscais','Entradas','Equipe','Eventos','EventosCampanhas','Fechamento',
  'FornecedorHistorico','Fornecedores','Importar','Instituicao','Lancamentos','LancamentosLista',
  'Login','NovaSenha','Painel','PainelAdmin','PainelDiretoria','PainelOperacional','ParceriaDetalhe',
  'Parcerias','Patrimonio','Pendencias','PlanoTrabalho','PlanosExecucao','PrestacaoContas','Projetos',
  'RelatorioExecucao','Relatorios','RelatoriosCentral','Sociedade','Usuarios','UsuariosAtendidos'
].forEach(p => existe(`src/pages/${p}.jsx`, p))
existe('src/App.jsx', 'App.jsx')
existe('src/components/CatSelect.jsx', 'CatSelect')
existe('src/hooks/useAuth.js', 'useAuth')
existe('src/hooks/useIsMobile.js', 'useIsMobile')
existe('src/lib/supabase.js', 'supabase.js')
existe('src/lib/db.js', 'db.js')

console.log('\n3. FUNCIONALIDADES NOVAS PRESENTES')
contem('src/components/Layout.jsx', 'buscaAberta', 'Busca global Ctrl+K')
contem('src/components/Layout.jsx', 'menuColapsado', 'Menu colapsável')
contem('src/components/Layout.jsx', 'secFechadas', 'Seções colapsáveis')
contem('src/lib/ui.js', 'export function confirmar', 'Modal de confirmação')
contem('src/lib/ui.js', 'export function exportarCSV', 'Export CSV')
contem('src/lib/pdf.js', 'gerarPDFParecerAnual', 'Parecer anual')
contem('src/lib/pdf.js', 'win.document.images', 'PDF aguarda logo')
contem('src/pages/Fechamento.jsx', 'anosCompletos', 'Botão parecer anual')
contem('src/pages/LancamentosLista.jsx', 'Carregar mais', 'Paginação')
contem('src/pages/Usuarios.jsx', 'sessaoAdmin', 'Sessão admin preservada')
contem('src/index.css', "'Inter'", 'Fonte Inter')
contem('src/index.css', 'skeleton', 'Skeleton loading')
contem('index.html', 'fonts.googleapis.com', 'Inter no index.html')
contem('vercel.json', '(?!api/)', 'Rewrite exclui /api')

console.log('\n4. NADA ANTIGO SOBROU')
naoContem('src/pages/Sociedade.jsx', "display:'flex', gap:2 }}>\n              {LOGO.map", 'Logo duplicada removida')
const pages = fs.readdirSync('src/pages').filter(f => f.endsWith('.jsx'))
let antigos = 0, azulAntigo = 0
pages.forEach(f => {
  const c = fs.readFileSync(path.join('src/pages', f), 'utf8')
  if (c.includes("background:'#fff', border:'0.5px solid #E0DDD5'")) antigos++
  if (c.includes('#4A8FD4')) azulAntigo++
})
antigos === 0 ? ok('Zero cards com estilo antigo') : falha(`${antigos} páginas com cards antigos`)
azulAntigo === 0 ? ok('Zero azul antigo (#4A8FD4)') : falha(`${azulAntigo} páginas com azul antigo`)

console.log('\n5. BANCO (lembrete manual)')
console.log('  → Rodar MIGRACAO_AUDITORIA.sql no Supabase SQL Editor (tabela auditoria)')

console.log('\n' + (erros === 0
  ? '\x1b[32m✔ TUDO NO LUGAR — pode buildar e publicar.\x1b[0m'
  : `\x1b[31m✘ ${erros} problema(s) acima — corrigir antes do deploy.\x1b[0m`))
process.exit(erros === 0 ? 0 : 1)
