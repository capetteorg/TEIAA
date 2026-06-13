// =============================================
// GERADOR DE PDF — FINOSC CAPETTE
// Usa window.print() com CSS otimizado
// =============================================

const CAPETTE_INFO = {
  nome: 'Casa do Pequeno Trabalhador de Teresópolis',
  cnpj: '29.213.717/0001-01',
  registros: [
    'Certificado de entidade de fins filantrópicos: Proc. 200606/77',
    'Instituição de utilidade pública Federal — Dec. 89.439/94',
    'Estadual — Dec. 6.651/83 · Municipal — Lei 868/76',
    'Conselho Nacional de Serviço Social do MEC Reg. 236.580/76',
    'Coordenadoria Estadual de Desenvolvimento Social Reg. nº 166/76',
    'Certificado de Reg. no Cadastro da FEEM nº 0189',
    'Prefeitura Municipal de Teresópolis Reg. nº 03/76 · Código CENSO: 33042694',
  ],
  endereco: 'Rua Juruena, 73, Agriões, Teresópolis — RJ',
  whatsapp: '(21) 3726-1753',
  email: 'capette@capette.org',
  instagram: 'CAPETTE74',
}

// CSS base para todos os relatórios
const CSS_BASE = `
  /* === RESET E BASE === */
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4 portrait;
    margin: 0;
  }
  @page landscape {
    size: A4 landscape;
    margin: 0;
  }
  @media print {
    html, body { background: #fff; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
  }
  thead { display: table-header-group; }

  /* Variáveis */
  :root {
    --agendo: #0E7EA8;
    --agendo-dark: #06344F;
    --agendo-soft: #EAF5F8;
    --ink: #171A1F;
    --muted: #626B76;
    --soft: #F5F2EA;
    --line: #D7D0C2;
    --line-soft: #ECE6DA;
    --paper: #FFFEFA;
    --green: #2E6F3E;
    --red: #A7352C;
    --sans: Inter, Arial, sans-serif;
    --serif: Georgia, 'Times New Roman', serif;
  }

  body {
    font-family: var(--sans);
    font-size: 11px;
    color: var(--ink);
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* === WRAPPER DA PÁGINA === */
  .pg {
    width: 210mm;
    min-height: 297mm;
    padding: 16mm 17mm 18mm 14mm;
    position: relative;
    background: #fff;
    margin: 0 auto;
  }
  .pg-landscape {
    width: 297mm;
    min-height: 210mm;
    padding: 12mm 14mm 14mm;
  }

  /* === FAIXA AZUL LATERAL (identidade) === */
  .pg::before {
    content: '';
    position: fixed;
    top: 0; left: 0;
    width: 5px;
    height: 100%;
    background: linear-gradient(180deg, var(--agendo), var(--agendo-dark));
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* === CABEÇALHO INTERNO === */
  .cab {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: flex-start;
    border-bottom: 1px solid var(--line);
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .cab-nome {
    font-size: 13px;
    font-weight: 700;
    color: var(--agendo-dark);
    letter-spacing: -.01em;
    margin-bottom: 2px;
  }
  .cab-sub {
    font-size: 9px;
    color: var(--muted);
    line-height: 1.5;
  }
  .cab-dir {
    text-align: right;
    font-size: 8.5px;
    color: var(--muted);
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    line-height: 1.6;
  }
  .cab-dir span {
    display: block;
    color: var(--agendo);
  }

  /* === CABEÇALHO LOGO COMPLETO (capa e 1ª página) === */
  .cab-full {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 2px solid var(--agendo);
  }
  .cab-full-dir {
    text-align: right;
    font-size: 9px;
    color: #5F6874;
    max-width: 380px;
    line-height: 1.5;
  }
  .cab-full-dir strong {
    font-size: 12px;
    color: var(--ink);
    display: block;
    margin-bottom: 2px;
  }
  .cab-full-dir .cnpj {
    font-size: 10px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 3px;
  }
  .cab-registros {
    font-size: 7.5px;
    color: #9199A2;
    line-height: 1.5;
    text-align: right;
  }

  /* === TÍTULO DO DOCUMENTO === */
  .titulo-bloco {
    text-align: center;
    margin-bottom: 18px;
    padding: 14px;
    background: var(--agendo-soft);
    border-radius: 4px;
    border-top: 3px solid var(--agendo);
  }
  .titulo-principal {
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--agendo-dark);
  }
  .titulo-sub {
    font-size: 10px;
    color: var(--muted);
    margin-top: 3px;
  }
  .titulo-status {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 99px;
    font-size: 9.5px;
    font-weight: 700;
    margin-top: 5px;
  }
  .status-preliminar { background: #FAEEDA; color: #854F0B; }
  .status-final { background: #E8F4E8; color: #2E6F3E; }

  /* === GRIDS DE INFO === */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; font-size: 10px; }
  .info-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; font-size: 10px; }
  .info-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 14px; font-size: 10px; }
  .info-item {
    background: #F8F7F2;
    border-radius: 4px;
    padding: 7px 10px;
    border: 1px solid var(--line-soft);
  }
  .info-label {
    color: #6B7280;
    font-size: 7.5px;
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: .4px;
  }
  .info-valor { font-weight: 700; color: var(--ink); }

  /* === RESUMO FINANCEIRO === */
  .resumo-box {
    border: 1px solid var(--line);
    border-top: 3px solid var(--agendo);
    border-radius: 4px;
    padding: 12px 14px;
    margin-bottom: 16px;
    background: var(--paper);
  }
  .resumo-titulo {
    font-size: 9px;
    font-weight: 700;
    margin-bottom: 10px;
    color: var(--agendo-dark);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .resumo-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
  .resumo-item {
    text-align: center;
    background: #fff;
    border-radius: 4px;
    padding: 8px 6px;
    border: 1px solid var(--line-soft);
  }
  .resumo-label { font-size: 7.5px; color: #6B7280; margin-bottom: 3px; text-transform: uppercase; letter-spacing: .3px; }
  .resumo-valor { font-size: 13px; font-weight: 700; }
  .verde { color: var(--green); }
  .vermelho { color: var(--red); }
  .azul { color: var(--agendo); }

  /* === SEÇÕES === */
  .secao { margin-bottom: 18px; }
  .secao-titulo {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 10px;
    padding: 6px 10px 6px 14px;
    border-left: 3px solid var(--agendo);
    background: var(--agendo-soft);
    color: var(--agendo-dark);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .secao-titulo-verde { border-left-color: var(--green); background: #EEF8F1; color: var(--green); }
  .secao-titulo-vermelho { border-left-color: var(--red); background: #FFF0F0; color: var(--red); }
  .secao-titulo-azul { border-left-color: var(--agendo); background: var(--agendo-soft); color: var(--agendo-dark); }

  /* === TABELAS EDITORIAIS === */
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead tr { background: #F2F6F7; }
  th {
    padding: 8px 9px;
    text-align: left;
    font-size: 8px;
    font-weight: 700;
    color: #525B66;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    letter-spacing: .12em;
    text-transform: uppercase;
  }
  td {
    padding: 7px 9px;
    border-bottom: 1px solid var(--line-soft);
    vertical-align: top;
    color: #20252C;
  }
  .total-row td {
    background: #F5F2EA !important;
    font-weight: 700;
    border-top: 1.5px solid var(--line);
    border-bottom: none;
  }
  .num { text-align: right; white-space: nowrap; }
  .center { text-align: center; }
  .muted { color: var(--muted); }

  /* Extrato — indicador entrada/saída */
  .ext-entrada td:first-child { border-left: 2px solid var(--green); }
  .ext-saida td:first-child { border-left: 2px solid var(--red); }

  /* === ALERTAS === */
  .alerta { padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; font-size: 10px; }
  .alerta-critico { background: #FFF0F0; border-left: 3px solid var(--red); color: var(--red); }
  .alerta-aviso { background: #FFF6E8; border-left: 3px solid #C07A1A; color: #854F0B; }
  .alerta-ok { background: #EEF8F1; border-left: 3px solid var(--green); color: var(--green); }

  /* === ASSINATURAS === */
  .assinaturas { margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--line); }
  .assin-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; margin-top: 16px; }
  .assin-item { text-align: center; }
  .assin-linha { border-bottom: 1px solid #9199A2; margin-bottom: 6px; height: 44px; }
  .assin-label { font-size: 9px; color: var(--agendo-dark); font-weight: 700; }
  .assin-cargo { font-size: 8.5px; color: var(--muted); margin-top: 2px; }

  /* === RODAPÉ PRÓPRIO === */
  .rodape {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5px;
    color: var(--muted);
  }
  .rodape-sistema { font-size: 7.5px; color: #9199A2; }
`

// Gera o HTML do cabeçalho
function htmlCabecalho(opts = {}) {
  const tipo = opts.tipo || 'cab'  // 'cab' = compacto, 'full' = com logo e registros
  if (tipo === 'full') {
    return `
  <div class="cab-full">
    <div>
      <img src="https://capette-financeiro.vercel.app/logo.png" alt="CAPETTE" style="height:56px;width:auto;object-fit:contain;display:block"
        onerror="this.outerHTML='<div style=\'display:flex;flex-direction:column;gap:2px\'><div style=\'display:flex;gap:1px\'><span style=\'font-size:20px;font-weight:900;color:#F5C800\'>C</span><span style=\'font-size:20px;font-weight:900;color:#F4821F\'>A</span><span style=\'font-size:20px;font-weight:900;color:#8B2FC9\'>P</span><span style=\'font-size:20px;font-weight:900;color:#E8212A\'>E</span><span style=\'font-size:20px;font-weight:900;color:#6BBF2B\'>T</span><span style=\'font-size:20px;font-weight:900;color:#0E7EA8\'>T</span><span style=\'font-size:20px;font-weight:900;color:#E8207A\'>E</span></div><div style=\'font-size:9px;color:#888\'>Desde 1974</div></div>'" />
    </div>
    <div class="cab-full-dir">
      <strong>${CAPETTE_INFO.nome}</strong>
      <div class="cnpj">CNPJ: ${CAPETTE_INFO.cnpj}</div>
      <div class="cab-registros">${CAPETTE_INFO.registros.join('<br>')}</div>
    </div>
  </div>`
  }
  // compacto: cabeçalho de página interna
  return `
  <div class="cab">
    <div>
      <div class="cab-nome">${opts.titulo || 'Relatório Financeiro'}</div>
      <div class="cab-sub">${CAPETTE_INFO.nome} · ${opts.sub || 'CAPETTE'}</div>
    </div>
    <div class="cab-dir">
      AGENDO Integra<span>${opts.ref || ''}</span>
    </div>
  </div>`
}

// Gera o HTML do rodapé
function htmlRodape(opts = {}) {
  const protocolo = opts.protocolo || ''
  return `
  <div class="rodape">
    <div>${CAPETTE_INFO.endereco} · ${CAPETTE_INFO.whatsapp} · ${CAPETTE_INFO.email}</div>
    <div class="rodape-sistema">AGENDO Integra · Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}${protocolo ? ' · ' + protocolo : ''}</div>
  </div>`
}

// Gera assinaturas
function htmlAssinaturas(campos = ['Responsável Financeiro', 'Representante Legal / Diretoria', 'Responsável pela Conferência']) {
  const itens = campos.map(c => `
    <div class="assin-item">
      <div class="assin-linha"></div>
      <div class="assin-label">${c}</div>
    </div>`).join('')
  return `
  <div class="assinaturas">
    <div style="font-size:10px;color:#444;">Teresópolis — RJ, _______ de _________________ de _______</div>
    <div class="assin-grid">${itens}</div>
  </div>`
}

// Formata moeda
const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// Abre janela de impressão
function abrirImpressao(html, titulo, paisagem = false) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('O navegador bloqueou a janela do relatório. Permita pop-ups para este site e tente novamente.')
    return
  }
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
${CSS_BASE}
${paisagem ? '@page { size: A4 landscape; margin: 0; } .pg { width: 297mm; min-height: 210mm; padding: 12mm 14mm; }' : ''}
</style>
</head>
<body>${html}</body>
</html>`)
  win.document.close()
  win.focus()
  // Aguardar TODAS as imagens (logo) carregarem antes de imprimir
  const imgs = Array.from(win.document.images)
  const prontas = Promise.all(imgs.map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })
  ))
  const timeout = new Promise(r => setTimeout(r, 2500)) // máx 2,5s de espera
  Promise.race([prontas, timeout]).then(() => setTimeout(() => win.print(), 200))
}

// =============================================
// RELATÓRIO DE CONCILIAÇÃO
// =============================================
export function gerarPDFConciliacao(dados, dataInicio, dataFim, opts = {}) {
  const { lista, totalEnt, totalSai, saldo, contaDados } = dados

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const periodoLabel = `${fmtData(dataInicio)} a ${fmtData(dataFim)}`

  const infoConta = contaDados ? `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
    <div class="info-item"><div class="info-label">Conta</div><div class="info-valor">${contaDados.nome||'—'}</div></div>
    <div class="info-item"><div class="info-label">Banco</div><div class="info-valor">${contaDados.banco||'—'}</div></div>
    <div class="info-item"><div class="info-label">Agência</div><div class="info-valor">${contaDados.agencia||'—'}</div></div>
    <div class="info-item"><div class="info-label">Número da conta</div><div class="info-valor">${contaDados.conta_num||'—'}</div></div>
  </div>` : ''

  const conciliadas = lista.filter(m => m.conciliado).length
  const pendentes = lista.filter(m => !m.conciliado).length

  const linhas = lista.map((m,i) => {
    const isEnt = Number(m.valor) > 0
    const partes = m._partes || []
    const fornecedor = m.fornecedor || m.lancamento?.fornecedor || '—'
    const numNota = m.num_nota || m.lancamento?.num_nota || '—'
    const subLinhas = partes.map(p => `
      <tr style="background:#F8F7F2">
        <td></td>
        <td style="padding-left:16px;font-size:9px;color:#888;font-style:italic">└ ${p.descricao||'—'}</td>
        <td style="font-size:9px;color:#5F5E5A">${p.categoria?.nome||'—'}</td>
        <td style="font-size:9px;color:#888">${p.subcategoria?.nome||'—'}</td>
        <td></td><td></td><td></td><td></td>
      </tr>`).join('')
    return `<tr>
      <td style="white-space:nowrap">${fmtData(m.data)}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.descricao||'—'}${partes.length>0?` <span style="font-size:9px;color:#185FA5">(${partes.length} itens)</span>`:''}</td>
      <td>${partes.length>0?'<em style="color:#888;font-size:9px">ver abaixo</em>':(m.categoria?.nome||'—')}</td>
      <td style="color:#888;font-size:9px">${partes.length>0?'':m.subcategoria?.nome||'—'}</td>
      <td style="font-size:9px">${fornecedor}</td>
      <td style="font-family:monospace;font-size:9px">${numNota}</td>
      <td class="num" style="font-weight:600;color:${isEnt?'#3B6D11':'#A32D2D'}">${isEnt?'+':'-'} ${fmt(Math.abs(Number(m.valor)))}</td>
      <td class="center"><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:9px;font-weight:600;background:${m.conciliado?'#EAF3DE':'#FAEEDA'};color:${m.conciliado?'#3B6D11':'#854F0B'}">${m.conciliado?'✓ OK':'Pendente'}</span></td>
    </tr>${subLinhas}`
  }).join('')

  const html = `
  <div class="pg">
  ${htmlCabecalho({ titulo: 'Conciliação Bancária', sub: contaDados?.nome || 'CAPETTE', ref: 'Período: ' + periodoLabel })}
  <div class="titulo-bloco">
    <div class="titulo-principal">Relatório de Conciliação Bancária</div>
    <div class="titulo-sub">Período: ${periodoLabel}</div>
  </div>

  ${infoConta}

  <div class="resumo-box">
    <div class="resumo-titulo">Resumo do Período</div>
    <div class="resumo-grid" style="grid-template-columns:repeat(6,1fr)">
      <div class="resumo-item"><div class="resumo-label">Entradas</div><div class="resumo-valor verde">${fmt(totalEnt)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Saídas</div><div class="resumo-valor vermelho">${fmt(totalSai)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Saldo</div><div class="resumo-valor ${saldo>=0?'verde':'vermelho'}">${fmt(saldo)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Movimentações</div><div class="resumo-valor azul">${lista.length}</div></div>
      <div class="resumo-item"><div class="resumo-label">Conciliadas</div><div class="resumo-valor verde">${conciliadas}</div></div>
      <div class="resumo-item"><div class="resumo-label">Pendentes</div><div class="resumo-valor" style="color:${pendentes>0?'#854F0B':'#3B6D11'}">${pendentes}</div></div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo secao-titulo-azul">⇅ Movimentações (${lista.length})</div>
    <table>
      <thead><tr>
        <th>Data</th><th>Descrição</th><th>Categoria</th><th>Subcategoria</th>
        <th>Fornecedor</th><th>Nº Nota</th><th class="num">Valor</th><th class="center">Situação</th>
      </tr></thead>
      <tbody>
        ${linhas}
        <tr class="total-row">
          <td colspan="6"><strong>SALDO DO PERÍODO</strong></td>
          <td class="num ${saldo>=0?'verde':'vermelho'}"><strong>${saldo>=0?'+':'-'} ${fmt(saldo)}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  ${opts.assinaturas ? htmlAssinaturas(['Responsável pela Administração', 'Representante Legal', 'Conselho Fiscal']) : ''}
  ${htmlRodape()}
  </div>`

  abrirImpressao(html, 'Relatório de Conciliação', true)
}

// =============================================
// RELATÓRIO FINANCEIRO GERAL
// =============================================
export function gerarPDFRelatorio(dados, dataInicio, dataFim, opts = {}) {
  const { entradas, saidas, totalEnt, totalSai, saldo, lista, contaDados, saldoInicialBancario, saldoFinalBancario } = dados

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const periodoLabel = `${fmtData(dataInicio)} a ${fmtData(dataFim)}`

  const infoConta = contaDados ? `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
    <div class="info-item"><div class="info-label">Conta</div><div class="info-valor">${contaDados.nome || '—'}</div></div>
    <div class="info-item"><div class="info-label">Banco</div><div class="info-valor">${contaDados.banco || '—'}</div></div>
    <div class="info-item"><div class="info-label">Agência</div><div class="info-valor">${contaDados.agencia || '—'}</div></div>
    <div class="info-item"><div class="info-label">Número da conta</div><div class="info-valor">${contaDados.conta_num || contaDados.numero || '—'}</div></div>
  </div>` : `<div style="margin-bottom:16px;padding:8px 12px;background:#F8F7F2;border-radius:6px;font-size:10px;color:#888">Todas as contas</div>`

  // Agrupar entradas por categoria
  const grupoEnt = {}
  entradas.forEach(m => {
    const cat = m.categoria?.nome || 'Sem categoria'
    if (!grupoEnt[cat]) grupoEnt[cat] = { total: 0, qtd: 0 }
    grupoEnt[cat].total += Math.abs(Number(m.valor))
    grupoEnt[cat].qtd++
  })

  // Agrupar saídas por categoria
  const grupoSai = {}
  saidas.forEach(m => {
    const cat = m.categoria?.nome || 'Sem categoria'
    if (!grupoSai[cat]) grupoSai[cat] = { total: 0, qtd: 0 }
    grupoSai[cat].total += Math.abs(Number(m.valor))
    grupoSai[cat].qtd++
  })

  // Linhas de resumo entradas
  const linhasResEnt = Object.entries(grupoEnt).sort((a,b)=>b[1].total-a[1].total).map(([cat,info]) => {
    return `<tr>
      <td>${cat}</td>
      <td class="center">${info.qtd}</td>
      <td class="num verde">${fmt(info.total)}</td>
      <td class="num">${totalEnt>0?Math.round(info.total/totalEnt*100):0}%</td>
    </tr>`
  }).join('')

  // Linhas de resumo saídas
  const linhasResSai = Object.entries(grupoSai).sort((a,b)=>b[1].total-a[1].total).map(([cat,info]) => {
    return `<tr>
      <td>${cat}</td>
      <td class="center">${info.qtd}</td>
      <td class="num vermelho">${fmt(info.total)}</td>
      <td class="num">${totalSai>0?Math.round(info.total/totalSai*100):0}%</td>
    </tr>`
  }).join('')

  // Linhas detalhadas de entradas
  const linhasDetEnt = entradas.map((m, i) => `<tr>
    <td style="white-space:nowrap">${fmtData(m.data)}</td>
    <td>${m.categoria?.nome || '—'}</td>
    <td style="color:#888">${m.subcategoria?.nome || '—'}</td>
    <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.descricao || '—'}</td>
    <td class="num verde">${fmt(m.valor)}</td>
  </tr>`).join('')

  // Linhas detalhadas de saídas
  const linhasDetSai = saidas.map((m, i) => `<tr>
    <td style="white-space:nowrap">${fmtData(m.data)}</td>
    <td>${m.categoria?.nome || '—'}</td>
    <td style="color:#888">${m.subcategoria?.nome || '—'}</td>
    <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.descricao || '—'}</td>
    <td class="num vermelho">${fmt(Math.abs(Number(m.valor)))}</td>
  </tr>`).join('')

  // Linhas do extrato cronológico
  const linhasExtrato = lista.map((m) => {
    const isEnt = Number(m.valor) > 0
    return `<tr class="${isEnt ? 'ext-entrada' : 'ext-saida'}">
      <td style="white-space:nowrap">${fmtData(m.data)}</td>
      <td style="font-weight:600;color:${isEnt?'#3B6D11':'#A32D2D'}">${isEnt ? '↑ Entrada' : '↓ Saída'}</td>
      <td>${m.categoria?.nome || '—'}</td>
      <td style="color:#888;font-size:9px">${m.subcategoria?.nome || '—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px">${m.descricao || '—'}</td>
      <td class="num" style="font-weight:700;color:${isEnt?'#3B6D11':'#A32D2D'}">${isEnt ? '+' : '-'} ${fmt(Math.abs(Number(m.valor)))}</td>
    </tr>`
  }).join('')

  const temSaldoBancario = saldoInicialBancario != null && saldoFinalBancario != null
  const cardsSaldoBancario = temSaldoBancario ? `
      <div class="resumo-item"><div class="resumo-label">Saldo Bancário Inicial</div><div class="resumo-valor azul">${fmt(saldoInicialBancario)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Saldo Bancário Final</div><div class="resumo-valor azul">${fmt(saldoFinalBancario)}</div></div>
    ` : ''
  const colunasResumo = temSaldoBancario ? 6 : 4

  const anoRelatorio = dataFim ? new Date(dataFim+'T12:00:00').getFullYear() : new Date().getFullYear()
  const protocolo = `AG-CAP-${anoRelatorio}-RF`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const contaNome = contaDados?.nome || 'Todas as contas'
  const bancNome = contaDados?.banco || '—'
  const agNome = contaDados?.agencia || '—'
  const ctNum = contaDados?.conta_num || contaDados?.numero || '—'

  // Demonstrativo mensal (agrupa por mês)
  const mesesMap = {}
  lista.forEach(m => {
    const mes = m.data?.slice(0,7)
    if (!mes) return
    if (!mesesMap[mes]) mesesMap[mes] = { ent: 0, sai: 0, qtd: 0 }
    const v = Number(m.valor)
    if (v > 0) mesesMap[mes].ent += v
    else mesesMap[mes].sai += Math.abs(v)
    mesesMap[mes].qtd++
  })
  const linhasMensais = Object.entries(mesesMap).sort().map(([mes, d]) => {
    const [ano, mo] = mes.split('-')
    const nomeMes = new Date(+ano, +mo-1, 1).toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
    const resultado = d.ent - d.sai
    return `<tr>
      <td style="text-transform:capitalize">${nomeMes}</td>
      <td class="num verde">${fmt(d.ent)}</td>
      <td class="num vermelho">${fmt(d.sai)}</td>
      <td class="num ${resultado>=0?'verde':'vermelho'}">${resultado>=0?'+':'-'} ${fmt(resultado)}</td>
      <td class="num">${d.qtd}</td>
    </tr>`
  }).join('')

  const html = `
  <div class="pg">
    <!-- CAPA -->
    ${htmlCabecalho({ tipo: 'full' })}

    <div style="margin-top:48px">
      <div style="font-size:10px;font-weight:700;color:var(--agendo);letter-spacing:.18em;text-transform:uppercase;margin-bottom:14px">
        Documento institucional
      </div>
      <div style="font-family:Georgia,serif;font-size:52px;line-height:.96;font-weight:400;letter-spacing:-.04em;color:var(--agendo-dark);margin-bottom:20px">
        Relatório<br>Financeiro
      </div>
      <div style="width:120px;height:2px;background:#A98E54;margin-bottom:28px"></div>
      <div style="font-size:14px;color:#303944;line-height:1.55;margin-bottom:36px">
        Exercício ${anoRelatorio} &nbsp;·&nbsp; Período: ${periodoLabel}
      </div>
    </div>

    <div style="margin-top:40px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
      <div style="display:grid;grid-template-columns:1fr 1fr">
        <div style="padding:16px 20px 16px 0;border-right:1px solid var(--line-soft)">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.13em;color:#6B7280;margin-bottom:7px">Instituição</div>
          <div style="font-size:13px;color:#20252C;font-weight:600">${CAPETTE_INFO.nome}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">CNPJ: ${CAPETTE_INFO.cnpj}</div>
        </div>
        <div style="padding:16px 0 16px 20px">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.13em;color:#6B7280;margin-bottom:7px">Conta analisada</div>
          <div style="font-size:13px;color:#20252C;font-weight:600">${contaNome}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${bancNome} · Ag. ${agNome} · Cc. ${ctNum}</div>
        </div>
        <div style="padding:16px 20px 16px 0;border-right:1px solid var(--line-soft);border-top:1px solid var(--line-soft)">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.13em;color:#6B7280;margin-bottom:7px">Sistema gerador</div>
          <div style="font-size:13px;color:#20252C">AGENDO Integra</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Gestão integrada para OSCs</div>
        </div>
        <div style="padding:16px 0 16px 20px;border-top:1px solid var(--line-soft)">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.13em;color:#6B7280;margin-bottom:7px">Protocolo de emissão</div>
          <div style="font-size:13px;color:#20252C;font-weight:600">${protocolo}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Emitido em ${dataEmissao}</div>
        </div>
      </div>
    </div>

    <div style="position:absolute;bottom:40px;left:17mm;right:17mm;border-top:1px solid var(--line);padding-top:12px;display:flex;justify-content:space-between;color:#59636F;font-size:10px">
      <div><strong style="color:var(--agendo-dark)">AGENDO Integra</strong> · Gestão integrada para OSCs</div>
      <div>${protocolo}</div>
    </div>
  </div>

  <!-- PÁGINA 2: FICHA TÉCNICA + RESUMO EXECUTIVO -->
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:20px;letter-spacing:-.02em">Ficha técnica</div>

    <table style="margin-bottom:24px;font-size:11px">
      <tbody>
        <tr><td style="color:#6B7280;width:40%;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Instituição titular</td><td style="font-weight:600;border-bottom:1px solid var(--line-soft)">${CAPETTE_INFO.nome}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">CNPJ</td><td style="border-bottom:1px solid var(--line-soft)">${CAPETTE_INFO.cnpj}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Sistema gerador</td><td style="border-bottom:1px solid var(--line-soft)">AGENDO Integra — Gestão integrada para OSCs</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Protocolo de emissão</td><td style="font-weight:600;border-bottom:1px solid var(--line-soft)">${protocolo}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Conta analisada</td><td style="border-bottom:1px solid var(--line-soft)">${contaNome} · ${bancNome} · Ag. ${agNome} · Cc. ${ctNum}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Período</td><td style="border-bottom:1px solid var(--line-soft)">${periodoLabel}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Tipo de emissão</td><td style="border-bottom:1px solid var(--line-soft)">${opts.assinaturas ? 'Para assinatura e arquivo' : 'Conferência interna'}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0">Data de emissão</td><td>${dataEmissao}</td></tr>
      </tbody>
    </table>

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:16px;letter-spacing:-.02em">Resumo executivo</div>

    <div style="font-size:12px;line-height:1.65;color:#303842;margin-bottom:20px">
      O presente relatório consolida as movimentações financeiras registradas na ${contaNome} da CAPETTE, conforme dados lançados no sistema AGENDO Integra, para fins de conferência interna, acompanhamento institucional e suporte à prestação de contas.
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);margin:20px 0 28px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
      ${temSaldoBancario ? `
      <div style="padding:16px 14px;border-right:1px solid var(--line-soft)">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Saldo Bancário Inicial</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:var(--agendo)">${fmt(saldoInicialBancario)}</div>
      </div>
      <div style="padding:16px 14px;border-right:1px solid var(--line-soft)">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Saldo Bancário Final</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:var(--agendo)">${fmt(saldoFinalBancario)}</div>
      </div>` : ''}
      <div style="padding:16px 14px;border-right:1px solid var(--line-soft)">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Total de Entradas</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:var(--green)">${fmt(totalEnt)}</div>
      </div>
      <div style="padding:16px 14px;border-right:1px solid var(--line-soft)">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Total de Saídas</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:var(--red)">${fmt(totalSai)}</div>
      </div>
      <div style="padding:16px 14px">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Resultado do Período</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:${saldo>=0?'var(--green)':'var(--red)'}">${saldo>=0?'+':'-'} ${fmt(saldo)}</div>
      </div>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

  <!-- PÁGINA 3: CATEGORIAS -->
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div class="secao">
      <div class="secao-titulo secao-titulo-verde">▲ Entradas por Categoria</div>
      <table>
        <thead><tr><th>Categoria</th><th class="center">Qtd</th><th class="num">Total</th><th class="num">%</th></tr></thead>
        <tbody>
          ${linhasResEnt || '<tr><td colspan="4" style="text-align:center;color:#888">Sem entradas</td></tr>'}
          <tr class="total-row"><td><strong>TOTAL ENTRADAS</strong></td><td></td><td class="num verde"><strong>${fmt(totalEnt)}</strong></td><td class="num"><strong>100%</strong></td></tr>
        </tbody>
      </table>
    </div>

    <div class="secao" style="margin-top:20px">
      <div class="secao-titulo secao-titulo-vermelho">▼ Saídas por Categoria</div>
      <table>
        <thead><tr><th>Categoria</th><th class="center">Qtd</th><th class="num">Total</th><th class="num">%</th></tr></thead>
        <tbody>
          ${linhasResSai || '<tr><td colspan="4" style="text-align:center;color:#888">Sem saídas</td></tr>'}
          <tr class="total-row"><td><strong>TOTAL SAÍDAS</strong></td><td></td><td class="num vermelho"><strong>${fmt(totalSai)}</strong></td><td class="num"><strong>100%</strong></td></tr>
        </tbody>
      </table>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

  <!-- PÁGINA 4: DEMONSTRATIVO MENSAL -->
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:16px;letter-spacing:-.02em">Demonstrativo mensal</div>

    <table style="font-size:11px">
      <thead>
        <tr style="background:var(--agendo-dark)">
          <th style="color:#fff;background:var(--agendo-dark)">Mês</th>
          <th class="num" style="color:#fff;background:var(--agendo-dark)">Entradas</th>
          <th class="num" style="color:#fff;background:var(--agendo-dark)">Saídas</th>
          <th class="num" style="color:#fff;background:var(--agendo-dark)">Resultado</th>
          <th class="num" style="color:#fff;background:var(--agendo-dark)">Movs.</th>
        </tr>
      </thead>
      <tbody>
        ${linhasMensais || '<tr><td colspan="5" style="text-align:center;color:#888">Sem movimentações</td></tr>'}
        <tr class="total-row">
          <td><strong>TOTAL DO PERÍODO</strong></td>
          <td class="num verde"><strong>${fmt(totalEnt)}</strong></td>
          <td class="num vermelho"><strong>${fmt(totalSai)}</strong></td>
          <td class="num ${saldo>=0?'verde':'vermelho'}"><strong>${saldo>=0?'+':'-'} ${fmt(saldo)}</strong></td>
          <td class="num"><strong>${lista.length}</strong></td>
        </tr>
      </tbody>
    </table>

    ${htmlRodape({ protocolo })}
  </div>

  <!-- PÁGINAS SEGUINTES: DETALHAMENTO -->
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div class="secao">
      <div class="secao-titulo secao-titulo-verde">▲ Detalhamento de Entradas (${entradas.length} registros)</div>
      <table style="font-size:9.5px">
        <thead><tr><th>Data</th><th>Categoria</th><th>Subcategoria</th><th>Descrição</th><th class="num">Valor</th></tr></thead>
        <tbody>
          ${linhasDetEnt || '<tr><td colspan="5" style="text-align:center;color:#888">Sem entradas</td></tr>'}
          <tr class="total-row"><td colspan="4"><strong>TOTAL ENTRADAS</strong></td><td class="num verde"><strong>${fmt(totalEnt)}</strong></td></tr>
        </tbody>
      </table>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div class="secao">
      <div class="secao-titulo secao-titulo-vermelho">▼ Detalhamento de Saídas (${saidas.length} registros)</div>
      <table style="font-size:9.5px">
        <thead><tr><th>Data</th><th>Categoria</th><th>Subcategoria</th><th>Descrição</th><th class="num">Valor</th></tr></thead>
        <tbody>
          ${linhasDetSai || '<tr><td colspan="5" style="text-align:center;color:#888">Sem saídas</td></tr>'}
          <tr class="total-row"><td colspan="4"><strong>TOTAL SAÍDAS</strong></td><td class="num vermelho"><strong>${fmt(totalSai)}</strong></td></tr>
        </tbody>
      </table>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

<!-- PÁGINA FINAL: ENCAMINHAMENTO E ASSINATURAS -->
  ${opts.assinaturas ? `
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:20px;letter-spacing:-.02em">Encaminhamento institucional</div>

    <div style="font-size:12px;line-height:1.7;color:#303842;margin-bottom:24px">
      Declaramos, para fins de conferência interna, prestação de contas e acompanhamento institucional, que o presente relatório consolida as movimentações financeiras registradas no sistema AGENDO Integra referentes ao período de <strong>${periodoLabel}</strong>.
    </div>

    <div style="font-size:11.5px;color:#303842;margin:32px 0 52px">
      Teresópolis — RJ, _______ de _________________________ de _______.
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:52px 40px">
      ${['Presidente / Representante Legal','Responsável pela Emissão','Responsável Financeiro','Conselho Fiscal — Membro 1','Conselho Fiscal — Membro 2','Conselho Fiscal — Membro 3'].map(n => `
      <div>
        <div style="height:50px;border-bottom:1px solid #9199A2;margin-bottom:8px"></div>
        <div style="font-size:11px;font-weight:700;color:var(--agendo-dark)">${n}</div>
      </div>`).join('')}
    </div>

    <div style="margin-top:40px;border:1px dashed #A8A08F;padding:16px 18px;color:#555E6A;font-size:11px;line-height:1.55;background:#FFFEFA">
      <div style="font-weight:700;margin-bottom:6px;color:var(--agendo-dark)">Espaço reservado para assinatura eletrônica</div>
      Assinatura eletrônica GOV.BR ou certificação digital, quando aplicável.
    </div>

    ${htmlRodape({ protocolo })}
  </div>` : ''}
`
  abrirImpressao(html, 'Relatório Financeiro')
}

export function gerarPDFTransparencia(dados, mes) {
  const { totalEnt, totalSai, grupoEnt, grupoSai } = dados
  const mesLabel = new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

  const linhasEnt = Object.entries(grupoEnt).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
    const total = Object.values(grupoEnt).reduce((a,v)=>a+v,0)
    return `<tr><td>${cat}</td><td class="num verde">${fmt(val)}</td><td class="num">${total>0?Math.round(val/total*100):0}%</td></tr>`
  }).join('')

  const linhasSai = Object.entries(grupoSai).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
    const total = Object.values(grupoSai).reduce((a,v)=>a+v,0)
    return `<tr><td>${cat}</td><td class="num vermelho">${fmt(val)}</td><td class="num">${total>0?Math.round(val/total*100):0}%</td></tr>`
  }).join('')

  const html = `
  <div class="pg">
  ${htmlCabecalho({ titulo: 'Prestação de Contas', sub: dados.conta?.nome || 'CAPETTE', ref: 'AGENDO Integra' })}
  <div class="titulo-bloco">
    <div class="titulo-principal">Relatório de Transparência Financeira</div>
    <div class="titulo-sub">Período: ${mesLabel}</div>
  </div>

  <div class="resumo-box">
    <div class="resumo-grid">
      <div class="resumo-item"><div class="resumo-label">Total Entradas</div><div class="resumo-valor verde">${fmt(totalEnt)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Total Gastos</div><div class="resumo-valor vermelho">${fmt(totalSai)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Resultado</div><div class="resumo-valor ${totalEnt-totalSai>=0?'verde':'vermelho'}">${fmt(totalEnt-totalSai)}</div></div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">De onde veio o dinheiro</div>
    <table>
      <thead><tr><th>Categoria</th><th class="num">Total</th><th class="num">%</th></tr></thead>
      <tbody>${linhasEnt}<tr class="total-row"><td><strong>TOTAL</strong></td><td class="num verde"><strong>${fmt(totalEnt)}</strong></td><td></td></tr></tbody>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">Como foi gasto</div>
    <table>
      <thead><tr><th>Categoria</th><th class="num">Total</th><th class="num">%</th></tr></thead>
      <tbody>${linhasSai}<tr class="total-row"><td><strong>TOTAL</strong></td><td class="num vermelho"><strong>${fmt(totalSai)}</strong></td><td></td></tr></tbody>
    </table>
  </div>

  <div style="font-size:9px;color:#888;margin-top:12px;padding:8px;background:#F8F7F2;border-radius:4px;">
    <strong>Nota de transparência:</strong> Este relatório apresenta um resumo das movimentações financeiras da ${CAPETTE_INFO.nome}, 
    atualizado mensalmente após a conciliação bancária. Para informações detalhadas, entre em contato com a administração.
  </div>

  ${htmlRodape()}
  </div>`

  abrirImpressao(html, 'Transparência Financeira')
}

// =============================================
// RELATÓRIO DE EVENTO
// =============================================
export function gerarPDFEvento(evento, entradas, saidas, opts = {}) {
  const totalEnt = entradas.reduce((a,m)=>a+Number(m.valor||0),0)
  const totalSai = Math.abs(saidas.reduce((a,m)=>a+Number(m.valor||0),0))
  const saldo = totalEnt - totalSai

  const linhasEnt = entradas.map(m => `<tr>
    <td>${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.subcategoria?.nome||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td class="num verde">${fmt(m.valor)}</td>
    <td class="center">${m.conciliado?'✓ Conciliado':'Pendente'}</td>
  </tr>`).join('')

  const linhasSai = saidas.map(m => `<tr>
    <td>${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.subcategoria?.nome||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td>${m.num_nota||'—'}</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor))}</td>
    <td class="center">${m.conciliado?'✓ Conciliado':'Pendente'}</td>
  </tr>`).join('')

  const html = `
  <div class="pg">
  ${htmlCabecalho({ titulo: 'Prestação de Contas', sub: dados.conta?.nome || 'CAPETTE', ref: 'AGENDO Integra' })}
  <div class="titulo-bloco">
    <div class="titulo-principal">Relatório Financeiro de Evento</div>
    <div class="titulo-sub">${evento.nome}</div>
  </div>

  <div class="info-grid-3">
    <div class="info-item"><div class="info-label">Evento</div><div class="info-valor">${evento.nome}</div></div>
    <div class="info-item"><div class="info-label">Período</div><div class="info-valor">${evento.data_inicio||'—'} ${evento.data_fim?'a '+evento.data_fim:''}</div></div>
    <div class="info-item"><div class="info-label">Status</div><div class="info-valor">${evento.status||'—'}</div></div>
  </div>

  <div class="resumo-box">
    <div class="resumo-grid">
      <div class="resumo-item"><div class="resumo-label">Total Entradas</div><div class="resumo-valor verde">${fmt(totalEnt)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Total Despesas</div><div class="resumo-valor vermelho">${fmt(totalSai)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Saldo do Evento</div><div class="resumo-valor ${saldo>=0?'verde':'vermelho'}">${fmt(saldo)}</div></div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">Entradas do Evento</div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Subcategoria</th><th>Pagador/Doador</th><th class="num">Valor</th><th class="center">Situação</th></tr></thead>
      <tbody>${linhasEnt||'<tr><td colspan="7" style="text-align:center;color:#888">Sem entradas</td></tr>'}
        <tr class="total-row"><td colspan="5"><strong>TOTAL ENTRADAS</strong></td><td class="num verde"><strong>${fmt(totalEnt)}</strong></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">Despesas do Evento</div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Subcategoria</th><th>Fornecedor</th><th>Nota/Doc</th><th class="num">Valor</th><th class="center">Situação</th></tr></thead>
      <tbody>${linhasSai||'<tr><td colspan="8" style="text-align:center;color:#888">Sem despesas</td></tr>'}
        <tr class="total-row"><td colspan="6"><strong>TOTAL DESPESAS</strong></td><td class="num vermelho"><strong>${fmt(totalSai)}</strong></td><td></td></tr>
      </tbody>
    </table>
  </div>

  ${opts.assinaturas ? htmlAssinaturas(['Responsável pelo Evento', 'Responsável Financeiro', 'Diretoria']) : ''}
  ${htmlRodape()}
  </div>`

  abrirImpressao(html, `Evento — ${evento.nome}`)
}

// =============================================
// RELATÓRIO DE CAMPANHA
// =============================================
export function gerarPDFCampanha(campanha, entradas, saidas, opts = {}) {
  const totalEnt = entradas.reduce((a,m)=>a+Number(m.valor||0),0)
  const totalSai = Math.abs(saidas.reduce((a,m)=>a+Number(m.valor||0),0))
  const saldo = totalEnt - totalSai
  const pctMeta = campanha.meta_financeira > 0 ? Math.round(totalEnt/campanha.meta_financeira*100) : 0

  const linhasEnt = entradas.map(m => `<tr>
    <td>${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td class="num verde">${fmt(m.valor)}</td>
    <td class="center">${m.conciliado?'✓':'Pendente'}</td>
  </tr>`).join('')

  const linhasSai = saidas.map(m => `<tr>
    <td>${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td>${m.num_nota||'—'}</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor))}</td>
    <td class="center">${m.conciliado?'✓':'Pendente'}</td>
  </tr>`).join('')

  const html = `
  <div class="pg">
  ${htmlCabecalho({ titulo: 'Prestação de Contas', sub: dados.conta?.nome || 'CAPETTE', ref: 'AGENDO Integra' })}
  <div class="titulo-bloco">
    <div class="titulo-principal">Relatório Financeiro de Campanha</div>
    <div class="titulo-sub">${campanha.nome}</div>
  </div>

  <div class="info-grid">
    <div class="info-item"><div class="info-label">Campanha</div><div class="info-valor">${campanha.nome}</div></div>
    <div class="info-item"><div class="info-label">Objetivo</div><div class="info-valor">${campanha.objetivo||'—'}</div></div>
    <div class="info-item"><div class="info-label">Período</div><div class="info-valor">${campanha.data_inicio||'—'} ${campanha.data_fim?'a '+campanha.data_fim:''}</div></div>
    <div class="info-item"><div class="info-label">Status</div><div class="info-valor">${campanha.status||'—'}</div></div>
  </div>

  <div class="resumo-box">
    <div class="resumo-grid">
      <div class="resumo-item"><div class="resumo-label">Meta Financeira</div><div class="resumo-valor azul">${fmt(campanha.meta_financeira)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Total Arrecadado</div><div class="resumo-valor verde">${fmt(totalEnt)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Total Gasto</div><div class="resumo-valor vermelho">${fmt(totalSai)}</div></div>
      <div class="resumo-item"><div class="resumo-label">% da Meta</div><div class="resumo-valor ${pctMeta>=100?'verde':'azul'}">${pctMeta}%</div></div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">Entradas da Campanha</div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Doador/Pagador</th><th class="num">Valor</th><th class="center">Situação</th></tr></thead>
      <tbody>${linhasEnt||'<tr><td colspan="6" style="text-align:center;color:#888">Sem entradas</td></tr>'}
        <tr class="total-row"><td colspan="4"><strong>TOTAL ARRECADADO</strong></td><td class="num verde"><strong>${fmt(totalEnt)}</strong></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">Despesas da Campanha</div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Fornecedor</th><th>Nota/Doc</th><th class="num">Valor</th><th class="center">Situação</th></tr></thead>
      <tbody>${linhasSai||'<tr><td colspan="7" style="text-align:center;color:#888">Sem despesas</td></tr>'}
        <tr class="total-row"><td colspan="5"><strong>TOTAL GASTO</strong></td><td class="num vermelho"><strong>${fmt(totalSai)}</strong></td><td></td></tr>
      </tbody>
    </table>
  </div>

  ${opts.assinaturas ? htmlAssinaturas(['Responsável pela Campanha', 'Responsável Financeiro', 'Diretoria']) : ''}
  ${htmlRodape()}
  </div>`

  abrirImpressao(html, `Campanha — ${campanha.nome}`)
}

// =============================================
// RELATÓRIO DE COBRANÇAS
// =============================================
export function gerarPDFCobrancas(cobrancas, filtros) {
  const totalAberto = cobrancas.filter(c=>!c.pago_confirmado).reduce((a,c)=>a+Number(c.valor),0)
  const totalConfirmado = cobrancas.filter(c=>c.pago_confirmado).reduce((a,c)=>a+Number(c.valor),0)
  const totalInformado = cobrancas.filter(c=>c.pago_informado&&!c.pago_confirmado).reduce((a,c)=>a+Number(c.valor),0)

  const linhas = cobrancas.map((c,i) => `<tr>
    <td class="center">${i+1}</td>
    <td>${c.pagador}</td>
    <td class="center">${new Date(c.data_vencimento+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td class="num">${fmt(c.valor)}</td>
    <td class="center">${c.status||'Pendente'}</td>
    <td class="center">${c.pago_confirmado?'✓ Confirmado':c.pago_informado?'Informado':'—'}</td>
    <td class="center">${c.data_promessa?new Date(c.data_promessa+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td>
    <td>${c.ultima_obs||'—'}</td>
  </tr>`).join('')

  const html = `
  <div class="pg">
  ${htmlCabecalho({ titulo: 'Prestação de Contas', sub: dados.conta?.nome || 'CAPETTE', ref: 'AGENDO Integra' })}
  <div class="titulo-bloco">
    <div class="titulo-principal">Relatório de Cobranças / Boletos Vencidos</div>
    <div class="titulo-sub">Período: ${filtros.periodo||'Todos'} · Status: ${filtros.status||'Todos'}</div>
  </div>

  <div class="resumo-box">
    <div class="resumo-grid">
      <div class="resumo-item"><div class="resumo-label">Total Boletos</div><div class="resumo-valor azul">${cobrancas.length}</div></div>
      <div class="resumo-item"><div class="resumo-label">Valor em Aberto</div><div class="resumo-valor vermelho">${fmt(totalAberto)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Pago Informado</div><div class="resumo-valor" style="color:#854F0B">${fmt(totalInformado)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Pago Confirmado</div><div class="resumo-valor verde">${fmt(totalConfirmado)}</div></div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">Relação de Boletos</div>
    <table>
      <thead><tr><th class="center">Nº</th><th>Pagador</th><th class="center">Vencimento</th><th class="num">Valor</th><th class="center">Status</th><th class="center">Pagamento</th><th class="center">Promessa</th><th>Observação</th></tr></thead>
      <tbody>${linhas||'<tr><td colspan="8" style="text-align:center;color:#888">Sem registros</td></tr>'}
        <tr class="total-row">
          <td colspan="3"><strong>TOTAIS</strong></td>
          <td class="num"><strong>${fmt(cobrancas.reduce((a,c)=>a+Number(c.valor),0))}</strong></td>
          <td colspan="4"></td>
        </tr>
      </tbody>
    </table>
  </div>

  ${htmlRodape()}
  </div>`

  abrirImpressao(html, 'Relatório de Cobranças', true)
}

// =============================================
// PRESTAÇÃO DE CONTA — EMENDA / EDITAL
// =============================================
export function gerarPDFPrestacaoContas(dados, pendencias, tipo, opts = {}) {
  const { conta, entradas, saidas, totalRepasses, totalRendimentos, totalDisponivel, totalDespesas, saldoFinal, bens, rateadas, porPlano, totalMovs, totalConciliados } = dados

  const isPreliminar = tipo === 'preliminar'
  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const TIPO_LABEL = { emenda:'Emenda Parlamentar', edital:'Edital', fomento:'Termo de Fomento', colaboracao:'Termo de Colaboração', convenio:'Convênio', projeto:'Projeto Específico' }
  const tipoLabel = TIPO_LABEL[conta.tipo_conta] || conta.tipo_conta

  const pendCriticas = pendencias.reduce((a,m) => a + m.pendencias.filter(p=>p.gravidade==='crítica').length, 0)

  // Receitas
  const linhasReceitas = entradas.map(m => `<tr>
    <td>${fmtData(m.data)}</td>
    <td>${m.tipo_receita||m.categoria?.nome||'—'}</td>
    <td>${m.descricao||'—'}</td>
    <td style="font-family:monospace;font-size:9px">${m.doc||'—'}</td>
    <td class="num verde">${fmt(m.valor)}</td>
    <td>${m.obs_prestacao||'—'}</td>
  </tr>`).join('')

  // Despesas
  let seq = 1
  const linhasDespesas = saidas.map(m => `<tr>
    <td class="center">${seq++}</td>
    <td>${fmtData(m.data)}</td>
    <td>${m.fornecedor||'—'}</td>
    <td style="font-size:9px">${m.cpf_cnpj||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.subcategoria?.nome||'—'}</td>
    <td>${m.plano?.nome||'—'}</td>
    <td style="font-family:monospace;font-size:9px">${m.num_nota||'—'}</td>
    <td>${fmtData(m.data_documento)}</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor))}</td>
    <td style="font-size:9px;color:#666">${m.local_comprovante||'—'}</td>
    <td class="center">${m.conciliado?'✓ OK':'Pend.'}</td>
  </tr>`).join('')

  // Plano de trabalho
  const linhasPlano = Object.values(porPlano).map(p => {
    const saldo = p.valor_previsto - p.executado
    const pct = p.valor_previsto > 0 ? Math.round(p.executado/p.valor_previsto*100) : 0
    const sit = pct===0?'Não iniciado':pct>=100?'Executado integralmente':'Em execução'
    return `<tr>
      <td>${p.nome}</td>
      <td class="num">${fmt(p.valor_previsto)}</td>
      <td class="num vermelho">${fmt(p.executado)}</td>
      <td class="num ${saldo>=0?'verde':'vermelho'}">${fmt(saldo)}</td>
      <td class="center">${pct}%</td>
      <td class="center">${sit}</td>
    </tr>`
  }).join('')

  // Bens
  const linhasBens = bens.map((m,i) => `<tr>
    <td class="center">${i+1}</td>
    <td>${m.descricao_produto||m.descricao||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td style="font-size:9px">${m.cpf_cnpj||'—'}</td>
    <td style="font-family:monospace;font-size:9px">${m.num_nota||'—'}</td>
    <td>${fmtData(m.data)}</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor))}</td>
    <td>${m.plano?.nome||'—'}</td>
    <td>${m.local_guarda_bem||'—'}</td>
  </tr>`).join('')

  // Rateios
  const linhasRateio = rateadas.map(m => `<tr>
    <td>${fmtData(m.data)}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td style="font-family:monospace;font-size:9px">${m.num_nota||'—'}</td>
    <td class="num">${fmt(Math.abs(m.valor))}</td>
    <td class="center">${m.percentual_rateio||'—'}%</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor)*(m.percentual_rateio||100)/100)}</td>
    <td>${m.fonte_restante||'—'}</td>
    <td>${m.justificativa_rateio||'—'}</td>
  </tr>`).join('')

  // Pendências
  const linhasPend = pendencias.flatMap(m => m.pendencias.map(p => `<tr>
    <td>${fmtData(m.data)}</td>
    <td>${m.descricao?.slice(0,40)||'—'}</td>
    <td class="num">${fmt(Math.abs(m.valor))}</td>
    <td>${p.tipo}</td>
    <td class="center"><span style="padding:1px 6px;border-radius:99px;font-size:9px;background:${p.gravidade==='crítica'?'#FCEBEB':'#FAEEDA'};color:${p.gravidade==='crítica'?'#A32D2D':'#854F0B'}">${p.gravidade}</span></td>
  </tr>`)).join('')

  const pctConc = totalMovs > 0 ? Math.round(totalConciliados/totalMovs*100) : 0

  const html = `
  <div class="pg">
  ${htmlCabecalho()}

  <div class="titulo-bloco">
    <div class="titulo-principal">Prestação de Conta — ${tipoLabel}</div>
    <div class="titulo-sub">Relatório de Execução Financeira</div>
    <span class="titulo-status ${isPreliminar?'status-preliminar':'status-final'}">
      ${isPreliminar ? 'RELATÓRIO PRELIMINAR' : 'RELATÓRIO FINAL CONSOLIDADO'}
    </span>
    ${isPreliminar ? '<div style="font-size:10px;color:#854F0B;margin-top:4px">Este relatório contém movimentações pendentes de consolidação bancária.</div>' : ''}
  </div>

  <div class="info-grid">
    <div class="info-item"><div class="info-label">Conta / Parceria</div><div class="info-valor">${conta.nome}</div></div>
    <div class="info-item"><div class="info-label">Banco / Agência / Conta</div><div class="info-valor">${conta.banco||'—'} / ${conta.agencia||'—'} / ${conta.conta_num||'—'}</div></div>
    <div class="info-item"><div class="info-label">Parlamentar / Origem</div><div class="info-valor">${conta.parlamentar||'—'}</div></div>
    <div class="info-item"><div class="info-label">Órgão concedente</div><div class="info-valor">${conta.orgao_concedente||'—'}</div></div>
    <div class="info-item"><div class="info-label">Nº Termo / Processo</div><div class="info-valor">${conta.num_termo||'—'} / ${conta.num_processo||'—'}</div></div>
    <div class="info-item"><div class="info-label">Vigência</div><div class="info-valor">${fmtData(conta.vigencia_inicio)} a ${fmtData(conta.vigencia_fim)}</div></div>
    <div class="info-item"><div class="info-label">Responsável financeiro</div><div class="info-valor">${conta.responsavel_financeiro||'—'}</div></div>
    <div class="info-item"><div class="info-label">Representante legal</div><div class="info-valor">${conta.representante_legal||'—'}</div></div>
  </div>

  ${conta.objeto ? `<div style="background:#F8F7F2;border-radius:4px;padding:6px 10px;margin-bottom:12px;font-size:10px"><strong>Objeto:</strong> ${conta.objeto}</div>` : ''}

  <div class="resumo-box">
    <div class="resumo-titulo">Resumo Financeiro</div>
    <div class="resumo-grid">
      <div class="resumo-item"><div class="resumo-label">Repasses recebidos</div><div class="resumo-valor verde">${fmt(totalRepasses)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Rendimentos</div><div class="resumo-valor azul">${fmt(totalRendimentos)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Total disponível</div><div class="resumo-valor azul">${fmt(totalDisponivel)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Total despesas</div><div class="resumo-valor vermelho">${fmt(totalDespesas)}</div></div>
    </div>
    <div class="resumo-grid" style="margin-top:8px">
      <div class="resumo-item"><div class="resumo-label">Saldo remanescente</div><div class="resumo-valor ${saldoFinal>=0?'verde':'vermelho'}">${fmt(saldoFinal)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Movimentações</div><div class="resumo-valor">${totalMovs}</div></div>
      <div class="resumo-item"><div class="resumo-label">Conciliado</div><div class="resumo-valor ${pctConc===100?'verde':'vermelho'}">${pctConc}%</div></div>
      <div class="resumo-item"><div class="resumo-label">Situação</div><div class="resumo-valor" style="font-size:11px">${pendCriticas>0?'⚠ Com pendências críticas':pctConc<100?'Com pendências':'✓ Consolidado'}</div></div>
    </div>
  </div>

  ${pendencias.length > 0 ? `
  <div class="alerta ${pendCriticas>0?'alerta-critico':'alerta-aviso'}">
    <strong>⚠ Pendências encontradas:</strong> ${pendencias.length} movimentações com pendências — ${pendCriticas} críticas.
    ${pendCriticas>0&&!isPreliminar?'<strong>Este relatório não deveria ser emitido como Final Consolidado com pendências críticas.</strong>':''}
  </div>` : ''}

  <div class="secao">
    <div class="secao-titulo">1. Relação de Receitas</div>
    <table>
      <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Doc. Bancário</th><th class="num">Valor</th><th>Obs.</th></tr></thead>
      <tbody>
        ${linhasReceitas||'<tr><td colspan="6" style="text-align:center;color:#888">Sem receitas</td></tr>'}
        <tr class="total-row"><td colspan="4"><strong>TOTAL RECEITAS</strong></td><td class="num verde"><strong>${fmt(totalDisponivel)}</strong></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">2. Relação de Pagamentos Efetuados</div>
    <table>
      <thead><tr><th class="center">Nº</th><th>Data</th><th>Fornecedor</th><th>CPF/CNPJ</th><th>Categoria</th><th>Subcategoria</th><th>Item do Plano</th><th>Nota/Recibo</th><th>Data Doc.</th><th class="num">Valor</th><th>Local Comprovante</th><th class="center">Status</th></tr></thead>
      <tbody>
        ${linhasDespesas||'<tr><td colspan="12" style="text-align:center;color:#888">Sem despesas</td></tr>'}
        <tr class="total-row"><td colspan="9"><strong>TOTAL DESPESAS</strong></td><td class="num vermelho"><strong>${fmt(totalDespesas)}</strong></td><td colspan="2"></td></tr>
      </tbody>
    </table>
  </div>

  ${Object.keys(porPlano).length > 0 ? `
  <div class="secao">
    <div class="secao-titulo">3. Execução por Item do Plano de Trabalho</div>
    <table>
      <thead><tr><th>Item do Plano</th><th class="num">Valor Previsto</th><th class="num">Executado</th><th class="num">Saldo</th><th class="center">% Exec.</th><th class="center">Situação</th></tr></thead>
      <tbody>
        ${linhasPlano}
        <tr class="total-row">
          <td><strong>TOTAL</strong></td>
          <td class="num"><strong>${fmt(Object.values(porPlano).reduce((a,p)=>a+p.valor_previsto,0))}</strong></td>
          <td class="num vermelho"><strong>${fmt(Object.values(porPlano).reduce((a,p)=>a+p.executado,0))}</strong></td>
          <td class="num"><strong>${fmt(Object.values(porPlano).reduce((a,p)=>a+(p.valor_previsto-p.executado),0))}</strong></td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>` : ''}

  <div class="secao">
    <div class="secao-titulo">4. Conciliação Bancária</div>
    <table>
      <thead><tr><th>Item</th><th class="num">Valor / Qtd</th></tr></thead>
      <tbody>
        <tr><td>Total de movimentações importadas</td><td class="num">${totalMovs}</td></tr>
        <tr><td>Total conciliado</td><td class="num verde">${totalConciliados}</td></tr>
        <tr><td>Total pendente</td><td class="num ${totalMovs-totalConciliados>0?'vermelho':'verde'}">${totalMovs-totalConciliados}</td></tr>
        <tr><td>Percentual conciliado</td><td class="num">${pctConc}%</td></tr>
        <tr class="total-row"><td><strong>Situação da conciliação</strong></td><td class="num"><strong>${pendCriticas>0?'⚠ Com pendências críticas':pctConc<100?'Com pendências':'✓ Conciliado'}</strong></td></tr>
      </tbody>
    </table>
  </div>

  ${bens.length > 0 ? `
  <div class="secao">
    <div class="secao-titulo">5. Relação de Bens Adquiridos</div>
    <table>
      <thead><tr><th class="center">Nº</th><th>Especificação do Bem</th><th>Fornecedor</th><th>CPF/CNPJ</th><th>Nota</th><th>Data</th><th class="num">Valor</th><th>Item do Plano</th><th>Local de Guarda</th></tr></thead>
      <tbody>
        ${linhasBens}
        <tr class="total-row"><td colspan="6"><strong>TOTAL BENS</strong></td><td class="num vermelho"><strong>${fmt(bens.reduce((a,m)=>a+Math.abs(Number(m.valor)),0))}</strong></td><td colspan="2"></td></tr>
      </tbody>
    </table>
  </div>` : ''}

  ${rateadas.length > 0 ? `
  <div class="secao">
    <div class="secao-titulo">6. Memória de Cálculo de Rateio de Despesas</div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Fornecedor</th><th>Nota</th><th class="num">Valor Total</th><th class="center">% Emenda</th><th class="num">Valor Emenda</th><th>Fonte Restante</th><th>Justificativa</th></tr></thead>
      <tbody>${linhasRateio}</tbody>
    </table>
  </div>` : ''}

  ${pendencias.length > 0 ? `
  <div class="secao">
    <div class="secao-titulo">7. Pendências da Consolidação</div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th class="num">Valor</th><th>Pendência</th><th class="center">Gravidade</th></tr></thead>
      <tbody>${linhasPend}</tbody>
    </table>
  </div>` : ''}

  <div class="secao">
    <div class="secao-titulo">Declaração Final</div>
    <div style="font-size:10px;line-height:1.7;padding:10px;border:1px solid #E8E6DE;border-radius:4px;margin-bottom:12px">
      Declaramos que as informações financeiras apresentadas neste relatório foram extraídas dos registros do sistema FinOSC Capette, 
      com base nos extratos bancários importados, conciliações realizadas e dados informados pela equipe responsável. 
      Os documentos comprobatórios físicos ou digitais encontram-se arquivados externamente, conforme referências indicadas neste relatório.
    </div>
  </div>

  ${opts.assinaturas ? htmlAssinaturas(['Responsável Financeiro', 'Representante Legal / Diretoria', 'Responsável pela Conferência']) : ''}
  ${htmlRodape()}`

  abrirImpressao(html, `Prestação de Conta — ${conta.nome}`, true)
}

// =============================================
// RELATÓRIO DE PARECER DO CONSELHO FISCAL
// =============================================
export function gerarPDFParecer({ fechamento, movs, instituicao }) {
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const fmtMes = comp => {
    if (!comp) return '—'
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
    const [y,m] = comp.split('-')
    return `${meses[parseInt(m)-1]} de ${y}`
  }

  const tipoLabel = { aprovado:'APROVADO', aprovado_ressalva:'APROVADO COM RESSALVA', reprovado:'REPROVADO' }
  const tipoCor = { aprovado:'#3B6D11', aprovado_ressalva:'#854F0B', reprovado:'#A32D2D' }
  const tipoBg = { aprovado:'#EAF3DE', aprovado_ressalva:'#FAEEDA', reprovado:'#FEF2F2' }
  const modalLabel = { presencial:'Presencial', online:'Online (videoconferência)', hibrida:'Híbrida' }

  const entradas = movs.filter(m=>Number(m.valor)>0).reduce((a,m)=>a+Number(m.valor),0)
  const saidas = Math.abs(movs.filter(m=>Number(m.valor)<0).reduce((a,m)=>a+Number(m.valor),0))
  const saldo = entradas - saidas

  const membros = (fechamento.membros_presentes||'').split(',').map(s=>s.trim()).filter(Boolean)

  const html = `
  <div class="pg">
  ${htmlCabecalho()}

  <div class="titulo-bloco">
    <div class="titulo-principal">Relatório de Aprovação de Contas</div>
    <div class="titulo-sub">Parecer do Conselho Fiscal — ${fmtMes(fechamento.competencia)}</div>
  </div>

  <div class="secao">
    <div class="secao-titulo secao-titulo-verde">1. Resumo Financeiro — ${fmtMes(fechamento.competencia)}</div>
    <div class="resumo-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="resumo-item">
        <div class="resumo-label">Entradas</div>
        <div class="resumo-valor verde">${fmt(entradas)}</div>
      </div>
      <div class="resumo-item">
        <div class="resumo-label">Saídas</div>
        <div class="resumo-valor vermelho">${fmt(saidas)}</div>
      </div>
      <div class="resumo-item">
        <div class="resumo-label">Resultado</div>
        <div class="resumo-valor ${saldo>=0?'azul':'vermelho'}">${fmt(saldo)}</div>
      </div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo secao-titulo-azul">2. Reunião do Conselho Fiscal</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Data da reunião</div>
        <div class="info-valor">${fmtData(fechamento.reuniao_data)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Modalidade</div>
        <div class="info-valor">${modalLabel[fechamento.reuniao_modalidade]||'Presencial'}</div>
      </div>
    </div>
    ${fechamento.reuniao_local ? `<div class="info-item" style="margin-bottom:10px">
      <div class="info-label">Local / Plataforma</div>
      <div class="info-valor">${fechamento.reuniao_local}</div>
    </div>` : ''}
  </div>

  <div class="secao">
    <div class="secao-titulo">3. Parecer do Conselho Fiscal</div>
    <div style="border:2px solid ${tipoCor[fechamento.tipo_aprovacao]};background:${tipoBg[fechamento.tipo_aprovacao]};border-radius:8px;padding:16px;text-align:center;margin-bottom:16px">
      <div style="font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;color:${tipoCor[fechamento.tipo_aprovacao]}">${tipoLabel[fechamento.tipo_aprovacao]||'—'}</div>
      <div style="font-size:12px;line-height:1.7">
        Reunidos em ${fmtData(fechamento.reuniao_data)}, o Conselho Fiscal da ${CAPETTE_INFO.nome}
        examinou as contas referentes ao mês de <strong>${fmtMes(fechamento.competencia)}</strong>
        e deliberou pela <strong>${(tipoLabel[fechamento.tipo_aprovacao]||'—').toLowerCase()}</strong>
        das contas apresentadas.
      </div>
    </div>
    ${fechamento.ressalvas ? `<div class="alerta alerta-aviso">
      <strong>Ressalvas / Observações:</strong><br/>${fechamento.ressalvas}
    </div>` : ''}
    ${fechamento.observacoes ? `<div style="font-size:11px;margin-bottom:12px;color:#5F5E5A">${fechamento.observacoes}</div>` : ''}
  </div>

  <div class="secao" style="break-inside:avoid">
    <div class="secao-titulo">4. Assinaturas</div>
    <div style="font-size:11px;color:#5F5E5A;margin-bottom:16px">
      Teresópolis, ${fmtData(fechamento.reuniao_data)}
    </div>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(membros.length||3,3)},1fr);gap:24px;margin-top:24px">
      ${(membros.length > 0 ? membros : ['Membro do Conselho Fiscal','Membro do Conselho Fiscal','Membro do Conselho Fiscal']).map(nome => `
        <div style="border-top:1px solid #2C2C2A;margin-top:40px;padding-top:6px;text-align:center">
          <div style="font-size:11px;font-weight:600">${nome}</div>
          <div style="font-size:10px;color:#888">Conselho Fiscal — ${CAPETTE_INFO.nome}</div>
        </div>
      `).join('')}
    </div>
  </div>

  ${htmlRodape()}`

  abrirImpressao(html, `Parecer Conselho Fiscal — ${fechamento.competencia}`)
}


// =============================================
// PARECER ANUAL DO CONSELHO FISCAL
// Gerado quando todos os 12 meses do ano estão aprovados
// =============================================
export function gerarPDFParecerAnual({ ano, fechamentos, movs, instituicao }) {
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const tipoLabel = { aprovado:'Aprovado', aprovado_ressalva:'Aprovado c/ ressalva', reprovado:'Reprovado' }

  const entradas = movs.filter(m=>Number(m.valor)>0).reduce((a,m)=>a+Number(m.valor),0)
  const saidas = Math.abs(movs.filter(m=>Number(m.valor)<0).reduce((a,m)=>a+Number(m.valor),0))
  const saldo = entradas - saidas

  const comRessalva = fechamentos.filter(f => f.tipo_aprovacao === 'aprovado_ressalva')
  const ultimoAprovado = [...fechamentos].sort((a,b)=>(b.aprovado_em||'').localeCompare(a.aprovado_em||''))[0]
  const membros = (ultimoAprovado?.membros_presentes||'').split(',').map(s=>s.trim()).filter(Boolean)

  const linhasMeses = fechamentos
    .sort((a,b)=>a.competencia.localeCompare(b.competencia))
    .map(f => {
      const m = parseInt(f.competencia.split('-')[1]) - 1
      return `<tr>
        <td>${MESES[m]}</td>
        <td>${tipoLabel[f.tipo_aprovacao]||'—'}</td>
        <td>${f.aprovado_em ? new Date(f.aprovado_em).toLocaleDateString('pt-BR') : '—'}</td>
        <td>${f.ressalvas ? f.ressalvas : '—'}</td>
      </tr>`
    }).join('')

  const html = `
  <div class="pg">
  ${htmlCabecalho()}

  <div class="titulo-bloco">
    <div class="titulo-principal">Parecer Anual do Conselho Fiscal</div>
    <div class="titulo-sub">Consolidação das aprovações mensais — Exercício de ${ano}</div>
  </div>

  <div class="secao">
    <div class="secao-titulo secao-titulo-verde">1. Resumo Financeiro Consolidado — ${ano}</div>
    <div class="resumo-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="resumo-item">
        <div class="resumo-label">Total de entradas</div>
        <div class="resumo-valor verde">${fmt(entradas)}</div>
      </div>
      <div class="resumo-item">
        <div class="resumo-label">Total de saídas</div>
        <div class="resumo-valor vermelho">${fmt(saidas)}</div>
      </div>
      <div class="resumo-item">
        <div class="resumo-label">Resultado do exercício</div>
        <div class="resumo-valor ${saldo>=0?'azul':'vermelho'}">${fmt(saldo)}</div>
      </div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo secao-titulo-azul">2. Aprovações Mensais</div>
    <table>
      <thead><tr><th>Mês</th><th>Parecer</th><th>Aprovado em</th><th>Ressalvas</th></tr></thead>
      <tbody>${linhasMeses}</tbody>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">3. Parecer Consolidado</div>
    <div style="border:2px solid #3B6D11;background:#EAF3DE;border-radius:8px;padding:16px;text-align:center;margin-bottom:16px">
      <div style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;color:#3B6D11">CONTAS DO EXERCÍCIO ${ano} APROVADAS</div>
      <div style="font-size:12px;line-height:1.7">
        O Conselho Fiscal da ${CAPETTE_INFO.nome}, tendo examinado e aprovado as contas de todos
        os 12 (doze) meses do exercício de <strong>${ano}</strong>, conforme registros mensais detalhados acima,
        manifesta parecer pela <strong>regularidade das contas do exercício</strong>${comRessalva.length>0?`, registrando-se ${comRessalva.length} aprovação(ões) com ressalva conforme tabela`:''}.
      </div>
    </div>
  </div>

  <div class="secao" style="break-inside:avoid">
    <div class="secao-titulo">4. Assinaturas</div>
    <div style="font-size:11px;color:#5F5E5A;margin-bottom:16px">
      Teresópolis, ${fmtData(new Date().toISOString().slice(0,10))}
    </div>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(membros.length||3,3)},1fr);gap:24px;margin-top:24px">
      ${(membros.length > 0 ? membros : ['Membro do Conselho Fiscal','Membro do Conselho Fiscal','Membro do Conselho Fiscal']).map(nome => `
        <div style="border-top:1px solid #2C2C2A;margin-top:40px;padding-top:6px;text-align:center">
          <div style="font-size:11px;font-weight:600">${nome}</div>
          <div style="font-size:10px;color:#888">Conselho Fiscal — ${CAPETTE_INFO.nome}</div>
        </div>
      `).join('')}
    </div>
  </div>

  ${htmlRodape()}
  </div>`

  abrirImpressao(html, `Parecer Anual ${ano} — Conselho Fiscal`)
}
