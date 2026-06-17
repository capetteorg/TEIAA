// =============================================
// GERADOR DE PDF — AGENDO INTEGRA TEIAA
// Usa window.print() com CSS otimizado
// =============================================

const TEIAA_INFO = {
  nome: 'Associação TEIAA - Troca de Experiências e Integração entre Amigos de Autistas',
  cnpj: '27.837.768/0001-70',
  registros: [
    'Associação de Pais e Amigos de Autistas de Teresópolis',
    'CTA - Centro TEIAA de Atendimentos',
    'Atuação: inclusão social, defesa de direitos e apoio a pessoas com TEA',
    'Sistema AGENDO Integra para gestão institucional e prestação de contas',
  ],
  endereco: 'Rua Prefeito Sebastião Teixeira, 58, Várzea, Teresópolis — RJ, CEP 25953-200',
  whatsapp: '(21) 97335-8220',
  email: 'associacaoteiaa@gmail.com',
  site: 'www.associacaoteiaa.org.br',
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
      <img src="https://teiaa.agendoas.com/logo.png" alt="TEIAA" style="height:56px;width:auto;object-fit:contain;display:block"
        onerror="this.outerHTML='<div style=\'display:flex;flex-direction:column;gap:2px\'><div style=\'font-size:20px;font-weight:900;color:#0E7EA8;letter-spacing:.04em\'>TEIAA</div><div style=\'font-size:9px;color:#888\'>Centro TEIAA de Atendimentos</div></div>'" />
    </div>
    <div class="cab-full-dir">
      <strong>${TEIAA_INFO.nome}</strong>
      <div class="cnpj">CNPJ: ${TEIAA_INFO.cnpj}</div>
      <div class="cab-registros">${TEIAA_INFO.registros.join('<br>')}</div>
    </div>
  </div>`
  }
  // compacto: cabeçalho de página interna
  return `
  <div class="cab">
    <div>
      <div class="cab-nome">${opts.titulo || 'Relatório Financeiro'}</div>
      <div class="cab-sub">${TEIAA_INFO.nome} · ${opts.sub || 'TEIAA'}</div>
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
    <div>${TEIAA_INFO.endereco} · ${TEIAA_INFO.whatsapp} · ${TEIAA_INFO.email}</div>
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


// Cabeçalho completo com logo (capa de todos os documentos)
function cabFull(subtitulo) {
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0E7EA8;padding-bottom:11px;margin-bottom:18px">
    <div><img src="https://teiaa.agendoas.com/logo.png" alt="TEIAA" style="height:46px;width:auto;object-fit:contain;display:block" onerror="this.outerHTML='<div style=\'font-size:16px;font-weight:900;color:#0E7EA8;letter-spacing:.04em\'>TEIAA</div><div style=\'font-size:8px;color:#888\'>Centro TEIAA de Atendimentos</div>'" /></div>
    <div style="text-align:right;font-size:9px;color:#5F6874;max-width:260px;line-height:1.5">
      <div style="font-size:11px;font-weight:700;color:#20252C">${TEIAA_INFO.nome}</div>
      <div style="font-size:9.5px;font-weight:700;color:#20252C;margin:2px 0">CNPJ: ${TEIAA_INFO.cnpj}</div>
      <div style="font-size:7.5px;color:#9199A2;line-height:1.5">${TEIAA_INFO.registros.slice(0,3).join('<br>')}</div>
    </div>
  </div>
  ${subtitulo ? `<div style="font-size:9px;color:#626B76;margin-bottom:12px">${subtitulo}</div>` : ''}
  `
}

// Cabeçalho compacto (páginas internas)
function cabCompact(titulo, sub, ref) {
  return `
  <div style="display:grid;grid-template-columns:1fr auto;gap:16px;border-bottom:1px solid #D7D0C2;padding-bottom:10px;margin-bottom:16px">
    <div>
      <div style="font-size:14px;font-weight:700;color:#06344F;letter-spacing:-.01em">${titulo}</div>
      <div style="margin-top:3px;color:#66717E;font-size:9px">${sub}</div>
    </div>
    <div style="text-align:right;font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#06344F">
      AGENDO Integra<span style="display:block;margin-top:3px;color:#0E7EA8;font-weight:400;text-transform:none;letter-spacing:0">${ref}</span>
    </div>
  </div>`
}

// Título editorial (serif grande + linha dourada)
function tituloEditorial(kicker, linha1, linha2, periodo, badge) {
  return `
  <div style="font-size:9px;font-weight:700;color:#0E7EA8;letter-spacing:.18em;text-transform:uppercase;margin-bottom:7px">${kicker}</div>
  <div style="font-family:Georgia,serif;font-size:40px;line-height:.95;font-weight:400;letter-spacing:-.04em;color:#06344F;margin-bottom:9px">${linha1}${linha2?'<br>'+linha2:''}</div>
  <div style="width:65px;height:2px;background:#A98E54;margin-bottom:11px"></div>
  <div style="font-size:12px;color:#303944;margin-bottom:${badge?'10px':'16px'}">${periodo}</div>
  ${badge ? `<div style="margin-bottom:16px">${badge}</div>` : ''}
  `
}

// Grid de identificação 2x2
function metaGrid(itens) {
  const cells = itens.map((it, i) => {
    const odd = i % 2 === 0
    const lastTwo = i >= itens.length - 2
    return `<div style="padding:10px ${odd?'16px':'0'} 10px ${odd?'0':'16px'};${odd?'border-right:1px solid #ECE6DA;':''}${!lastTwo?'border-bottom:1px solid #ECE6DA;':''}">
      <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">${it.label}</div>
      <div style="font-size:11px;color:${it.cor||'#20252C'};font-weight:600">${it.val}</div>
      ${it.sub ? `<div style="font-size:9px;color:#626B76;margin-top:2px">${it.sub}</div>` : ''}
    </div>`
  }).join('')
  return `<div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;margin:12px 0">${cells}</div>`
}

// Indicadores financeiros
function figuras(itens, cols) {
  const cells = itens.map((it, i) => `
    <div style="padding:11px 8px;${i<itens.length-1?'border-right:1px solid #ECE6DA;':''}">
      <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">${it.label}</div>
      <div style="font-family:Georgia,serif;font-size:16px;color:${it.cor||'#20252C'}">${it.val}</div>
    </div>`).join('')
  return `<div style="display:grid;grid-template-columns:repeat(${cols||itens.length},1fr);border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;margin:12px 0">${cells}</div>`
}

// Cabeçalho de seção
function secTitle(texto) {
  return `<div style="font-family:Georgia,serif;font-size:17px;color:#06344F;margin:14px 0 9px;letter-spacing:-.02em">${texto}</div>`
}

// Rodapé
function rodape(protocolo) {
  return `
  <div style="border-top:1px solid #D7D0C2;padding-top:8px;display:flex;justify-content:space-between;color:#66717E;font-size:8.5px;margin-top:14px">
    <div>${TEIAA_INFO.endereco} · ${TEIAA_INFO.whatsapp} · ${TEIAA_INFO.email}</div>
    <div><strong style="color:#06344F">AGENDO Integra</strong> · ${protocolo}</div>
  </div>`
}

// Tabela padrão
function tabelaHeader(colunas) {
  const ths = colunas.map(c => `<th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:${c.align||'left'}">${c.label}</th>`).join('')
  return `<thead><tr>${ths}</tr></thead>`
}

// =============================================
// RELATÓRIO DE CONCILIAÇÃO
// =============================================
export function gerarPDFConciliacao(dados, dataInicio, dataFim, opts = {}) {
  const { lista, totalEnt, totalSai, saldo, contaDados } = dados

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const periodoLabel = `${fmtData(dataInicio)} a ${fmtData(dataFim)}`
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-CONC`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const contaNome = contaDados?.nome || 'Conta'
  const bancNome  = contaDados?.banco || '—'
  const agNome    = contaDados?.agencia || '—'
  const ctNum     = contaDados?.conta_num || '—'

  const conciliadas = lista.filter(m => m.conciliado).length
  const pendentes   = lista.filter(m => !m.conciliado).length
  const statusCor   = pendentes > 0 ? '#854F0B' : '#2E6F3E'
  const statusTxt   = pendentes > 0 ? `${pendentes} pendente(s)` : 'Totalmente conciliado'
  const statusBg    = pendentes > 0 ? '#FFF6ED' : '#EEF8F1'

  // ── Demonstrativo mensal ──
  const mesesMap = {}
  lista.forEach(m => {
    const mes = m.data?.slice(0,7)
    if (!mes) return
    if (!mesesMap[mes]) mesesMap[mes] = { ent:0, sai:0, qtd:0 }
    const v = Number(m.valor)
    if (v > 0) mesesMap[mes].ent += v
    else mesesMap[mes].sai += Math.abs(v)
    mesesMap[mes].qtd++
  })
  const linhasMensais = Object.entries(mesesMap).sort().map(([mes, d], i) => {
    const [ano, mo] = mes.split('-')
    const nomeMes = new Date(+ano, +mo-1, 1).toLocaleDateString('pt-BR', {month:'long', year:'numeric'})
    const res = d.ent - d.sai
    const resCor = res >= 0 ? '#2E6F3E' : '#A7352C'
    const bg = i % 2 === 0 ? '#fff' : '#F8F7F2'
    return `<tr style="background:${bg}">
      <td style="padding:7px 10px;border-bottom:1px solid #ECE6DA;font-size:10px">${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</td>
      <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #ECE6DA;color:#2E6F3E;font-weight:600;font-size:10px">${fmt(d.ent)}</td>
      <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #ECE6DA;color:#A7352C;font-weight:600;font-size:10px">${fmt(d.sai)}</td>
      <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #ECE6DA;color:${resCor};font-weight:700;font-size:10px">${res>=0?'+ ':'\u2212 '}${fmt(Math.abs(res))}</td>
      <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #ECE6DA;color:#626B76;font-size:10px">${d.qtd}</td>
    </tr>`
  }).join('')

  // ── Linhas de detalhamento ──
  const linhas = lista.map((m, i) => {
    const isEnt  = Number(m.valor) > 0
    const partes = m._partes || []
    const fornecedor = m.fornecedor || m.lancamento?.fornecedor || '—'
    const numNota    = m.num_nota  || m.lancamento?.num_nota   || '—'
    const catTxt     = partes.length > 0 ? '' : (m.categoria?.nome || '—')
    const subCatTxt  = partes.length > 0 ? '' : (m.subcategoria?.nome || '')
    const bg = isEnt ? '#F5FBF0' : (i % 2 === 0 ? '#fff' : '#FEFEFE')
    const valCor = isEnt ? '#2E6F3E' : '#A7352C'
    const sinal  = isEnt ? '+' : '\u2212'

    const subLinhas = partes.map(p => `
      <tr style="background:#F8F7F4">
        <td style="padding:3px 8px;border-bottom:1px solid #ECE6DA"></td>
        <td colspan="2" style="padding:3px 8px 3px 20px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#888;font-style:italic">
          └ ${p.descricao||'—'}
        </td>
        <td style="padding:3px 8px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#626B76">${p.categoria?.nome||'—'}</td>
        <td style="padding:3px 8px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#888">${p.subcategoria?.nome||'—'}</td>
        <td colspan="3" style="border-bottom:1px solid #ECE6DA"></td>
      </tr>`).join('')

    return `<tr style="background:${bg}">
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;white-space:nowrap;color:#626B76;font-size:9px">${fmtData(m.data)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-size:9px;max-width:180px">
        ${m.descricao||'—'}${partes.length>0?` <span style="font-size:8px;color:#0E7EA8;font-weight:600">(${partes.length})</span>`:''}
      </td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-size:8.5px;color:#444">${catTxt}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#888">${subCatTxt}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#888;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${fornecedor==='—'?'—':fornecedor.split(' ').slice(0,2).join(' ')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-family:monospace;font-size:8px;color:#aaa">${numNota}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;text-align:right;font-weight:700;white-space:nowrap;font-size:9.5px;color:${valCor}">${sinal} ${fmt(Math.abs(Number(m.valor)))}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;text-align:center;font-weight:700;font-size:10px;color:${m.conciliado?'#2E6F3E':'#854F0B'}">${m.conciliado?'✓':'⏳'}</td>
    </tr>${subLinhas}`
  }).join('')

  const logoFallback = `<div style="font-size:16px;font-weight:900;color:#0E7EA8;letter-spacing:.04em">TEIAA</div><div style="font-size:8px;color:#888">Centro TEIAA de Atendimentos</div>`

  // ── Cabeçalho compacto para páginas internas ──
  const cabecalhoPagina = `
  <div style="display:grid;grid-template-columns:1fr auto;gap:20px;border-bottom:1.5px solid #0E7EA8;padding-bottom:10px;margin-bottom:16px;align-items:end">
    <div>
      <div style="font-size:7.5px;font-weight:700;color:#0E7EA8;letter-spacing:.15em;text-transform:uppercase;margin-bottom:3px">Conciliação Bancária · ${new Date().getFullYear()}</div>
      <div style="font-size:12px;font-weight:700;color:#06344F">${contaNome} · ${bancNome}</div>
      <div style="font-size:9px;color:#66717E;margin-top:2px">${periodoLabel}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:7.5px;font-weight:700;color:#06344F;letter-spacing:.1em;text-transform:uppercase">AGENDO Integra</div>
      <div style="font-size:9px;color:#0E7EA8;margin-top:2px">${protocolo}</div>
    </div>
  </div>`

  const rodapeHtml = `
  <div style="border-top:1px solid #D7D0C2;padding-top:8px;display:flex;justify-content:space-between;color:#9199A2;font-size:8px;margin-top:20px">
    <div>${TEIAA_INFO.endereco} · ${TEIAA_INFO.whatsapp} · ${TEIAA_INFO.email}</div>
    <div>AGENDO Integra · ${protocolo}</div>
  </div>`

  // ── TH helper ──
  const th = (txt, align='left') =>
    `<th style="background:#1A2535;color:#C8D0DA;font-size:7px;text-transform:uppercase;letter-spacing:.12em;padding:8px 8px;text-align:${align};font-weight:700;border:none">${txt}</th>`

  const html = `
  <div class="pg">

    <!-- ── CABEÇALHO COM LOGO ── -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #0E7EA8;padding-bottom:14px;margin-bottom:20px">
      <div>
        <img src="https://teiaa.agendoas.com/logo.png" alt="TEIAA"
          style="height:50px;width:auto;object-fit:contain;display:block"
          onerror="this.outerHTML='${logoFallback}'" />
      </div>
      <div style="text-align:right;font-size:9px;color:#5F6874;max-width:290px;line-height:1.6">
        <div style="font-size:12px;font-weight:700;color:#20252C;margin-bottom:2px">${TEIAA_INFO.nome}</div>
        <div style="font-size:9.5px;font-weight:700;color:#444;margin-bottom:3px">CNPJ: ${TEIAA_INFO.cnpj}</div>
        <div style="font-size:7.5px;color:#9199A2;line-height:1.6">${TEIAA_INFO.registros.slice(0,3).join('<br>')}</div>
      </div>
    </div>

    <!-- ── KICKER + TÍTULO ── -->
    <div style="font-size:9px;font-weight:700;color:#0E7EA8;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">Documento Operacional</div>
    <div style="font-family:Georgia,serif;font-size:44px;line-height:.92;font-weight:400;letter-spacing:-.04em;color:#06344F;margin-bottom:10px">Conciliação<br>Bancária</div>
    <div style="width:60px;height:2.5px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:12px;color:#444;margin-bottom:20px">Período: <strong>${periodoLabel}</strong></div>

    <!-- ── 4 KPIs ── -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
      <div style="border-top:3px solid #2E6F3E;background:#F5FBF0;border-radius:4px;padding:10px 12px">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#5A8060;margin-bottom:5px">Total Entradas</div>
        <div style="font-size:15px;font-weight:700;color:#2E6F3E">${fmt(totalEnt)}</div>
      </div>
      <div style="border-top:3px solid #A7352C;background:#FFF5F5;border-radius:4px;padding:10px 12px">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#8A4040;margin-bottom:5px">Total Saídas</div>
        <div style="font-size:15px;font-weight:700;color:#A7352C">${fmt(totalSai)}</div>
      </div>
      <div style="border-top:3px solid #0E7EA8;background:#EAF5F8;border-radius:4px;padding:10px 12px">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#1A6080;margin-bottom:5px">Saldo do Período</div>
        <div style="font-size:15px;font-weight:700;color:${saldo>=0?'#2E6F3E':'#A7352C'}">${saldo>=0?'+ ':'\u2212 '}${fmt(Math.abs(saldo))}</div>
      </div>
      <div style="border-top:3px solid #6B7280;background:#F8F7F2;border-radius:4px;padding:10px 12px">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#5F6874;margin-bottom:5px">Movimentações</div>
        <div style="font-size:15px;font-weight:700;color:#1A1F1C">${lista.length.toLocaleString('pt-BR')}</div>
      </div>
    </div>

    <!-- ── METADADOS ── -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #E0DDD5;border-radius:4px;margin-bottom:20px;overflow:hidden">
      <div style="padding:10px 12px;border-right:1px solid #E0DDD5;background:#FAFAF8">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#888780;margin-bottom:4px">Instituição</div>
        <div style="font-size:9.5px;font-weight:600;color:#1A1F1C;line-height:1.3">${TEIAA_INFO.nome}</div>
        <div style="font-size:8px;color:#888780;margin-top:2px">${TEIAA_INFO.cnpj}</div>
      </div>
      <div style="padding:10px 12px;border-right:1px solid #E0DDD5;background:#FAFAF8">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#888780;margin-bottom:4px">Conta analisada</div>
        <div style="font-size:9.5px;font-weight:600;color:#1A1F1C">${contaNome}</div>
        <div style="font-size:8px;color:#888780;margin-top:2px">${bancNome} · Ag. ${agNome} · Cc. ${ctNum}</div>
      </div>
      <div style="padding:10px 12px;border-right:1px solid #E0DDD5;background:#FAFAF8">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#888780;margin-bottom:4px">Protocolo</div>
        <div style="font-size:9.5px;font-weight:600;color:#1A1F1C">${protocolo}</div>
        <div style="font-size:8px;color:#888780;margin-top:2px">Emitido em ${dataEmissao}</div>
      </div>
      <div style="padding:10px 12px;background:${statusBg}">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#888780;margin-bottom:4px">Status</div>
        <div style="font-size:9.5px;font-weight:700;color:${statusCor}">${statusTxt}</div>
        <div style="font-size:8px;color:#888780;margin-top:2px">${conciliadas} conciliadas · ${pendentes} pendentes</div>
      </div>
    </div>

    <!-- ── DEMONSTRATIVO MENSAL ── -->
    <div style="font-family:Georgia,serif;font-size:19px;color:#06344F;margin-bottom:10px;letter-spacing:-.02em">Demonstrativo mensal</div>
    <table style="border-collapse:collapse;width:100%;border-radius:4px;overflow:hidden">
      <thead>
        <tr>
          ${th('Mês')}
          ${th('Entradas','right')}
          ${th('Saídas','right')}
          ${th('Resultado','right')}
          ${th('Movs.','right')}
        </tr>
      </thead>
      <tbody>
        ${linhasMensais}
        <tr style="background:#F0EDE4;font-weight:700;border-top:2px solid #1A2535">
          <td style="padding:9px 10px;font-size:10.5px;color:#1A1F1C">Total do período</td>
          <td style="padding:9px 10px;text-align:right;font-size:10.5px;color:#2E6F3E">${fmt(totalEnt)}</td>
          <td style="padding:9px 10px;text-align:right;font-size:10.5px;color:#A7352C">${fmt(totalSai)}</td>
          <td style="padding:9px 10px;text-align:right;font-size:10.5px;color:${saldo>=0?'#2E6F3E':'#A7352C'}">${saldo>=0?'+ ':'\u2212 '}${fmt(Math.abs(saldo))}</td>
          <td style="padding:9px 10px;text-align:right;font-size:10.5px;color:#626B76">${lista.length}</td>
        </tr>
      </tbody>
    </table>

    ${rodapeHtml}
  </div>

  <!-- ── PÁGINAS DE DETALHAMENTO ── -->
  <div class="pg page-break">
    ${cabecalhoPagina}

    <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:7px 12px 7px 14px;border-left:3px solid #0E7EA8;background:#EAF5F8;color:#06344F;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span>⇅ Detalhamento das movimentações (${lista.length})</span>
      <span style="font-size:8px;font-weight:400;color:#0E7EA8">
        <span style="display:inline-block;width:10px;height:10px;background:#F5FBF0;border:1px solid #2E6F3E;border-radius:2px;vertical-align:middle;margin-right:3px"></span>Entrada &nbsp;
        <span style="display:inline-block;width:10px;height:10px;background:#FFF5F5;border:1px solid #A7352C;border-radius:2px;vertical-align:middle;margin-right:3px"></span>Saída
      </span>
    </div>

    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead>
        <tr>
          ${th('Data')}
          ${th('Descrição / Fornecedor')}
          ${th('Categoria')}
          ${th('Subcategoria')}
          ${th('Fornecedor')}
          ${th('Nº Nota')}
          ${th('Valor','right')}
          ${th('✓','center')}
        </tr>
      </thead>
      <tbody>
        ${linhas}
        <tr style="background:#F0EDE4;font-weight:700;border-top:2px solid #1A2535">
          <td colspan="6" style="padding:8px 8px;font-size:10px;color:#1A1F1C">Saldo do período</td>
          <td style="padding:8px 8px;text-align:right;font-size:10.5px;color:${saldo>=0?'#2E6F3E':'#A7352C'}">${saldo>=0?'+ ':'\u2212 '}${fmt(Math.abs(saldo))}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    ${opts.assinaturas ? htmlAssinaturas(['Responsável pela Administração', 'Representante Legal', 'Conselho Fiscal']) : ''}
    ${rodapeHtml}
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
  const protocolo = `AG-TEIAA-${anoRelatorio}-RF`
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
          <div style="font-size:13px;color:#20252C;font-weight:600">${TEIAA_INFO.nome}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">CNPJ: ${TEIAA_INFO.cnpj}</div>
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
        <tr><td style="color:#6B7280;width:40%;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Instituição titular</td><td style="font-weight:600;border-bottom:1px solid var(--line-soft)">${TEIAA_INFO.nome}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">CNPJ</td><td style="border-bottom:1px solid var(--line-soft)">${TEIAA_INFO.cnpj}</td></tr>
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
      O presente relatório consolida as movimentações financeiras registradas na ${contaNome} da TEIAA, conforme dados lançados no sistema AGENDO Integra, para fins de conferência interna, acompanhamento institucional e suporte à prestação de contas.
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

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-TP`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const saldo = totalEnt - totalSai

  const linhasEnt2 = Object.entries(grupoEnt).sort((a,b)=>b[1]-a[1]).map(([cat,val]) =>
    `<tr><td>${cat}</td><td style="text-align:right;color:#2E6F3E;white-space:nowrap">${fmt(val)}</td><td style="text-align:right">${totalEnt>0?Math.round(val/totalEnt*100):0}%</td></tr>`
  ).join('')

  const linhasSai2 = Object.entries(grupoSai).sort((a,b)=>b[1]-a[1]).map(([cat,val]) =>
    `<tr><td>${cat}</td><td style="text-align:right;color:#A7352C;white-space:nowrap">${fmt(val)}</td><td style="text-align:right">${totalSai>0?Math.round(val/totalSai*100):0}%</td></tr>`
  ).join('')

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Documento público','Transparência','Financeira',`Competência: ${mesLabel}`)}

    <div style="border-left:3px solid #0E7EA8;padding:10px 14px;background:#EAF5F8;margin:12px 0;font-size:10px;color:#06344F;line-height:1.55">
      Este relatório é disponibilizado publicamente pela TEIAA em cumprimento às obrigações de transparência previstas na Lei nº 13.019/2014 e demais normas aplicáveis às organizações da sociedade civil.
    </div>

    ${figuras([
      { label:'Total entradas', val:fmt(totalEnt), cor:'#2E6F3E' },
      { label:'Total saídas', val:fmt(totalSai), cor:'#A7352C' },
      { label:'Resultado do período', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
    ], 3)}

    ${secTitle('Entradas por categoria')}
    <table style="border-collapse:collapse;width:100%;font-size:9px;margin-bottom:14px">
      ${tabelaHeader([{label:'Categoria'},{label:'Total',align:'right'},{label:'%',align:'right'}])}
      <tbody>
        ${linhasEnt2}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td style="padding:5px;border-bottom:none">Total entradas</td><td style="text-align:right;color:#2E6F3E;padding:5px;border-bottom:none">${fmt(totalEnt)}</td><td style="text-align:right;padding:5px;border-bottom:none">100%</td></tr>
      </tbody>
    </table>

    ${secTitle('Saídas por categoria')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Categoria'},{label:'Total',align:'right'},{label:'%',align:'right'}])}
      <tbody>
        ${linhasSai2}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td style="padding:5px;border-bottom:none">Total saídas</td><td style="text-align:right;color:#A7352C;padding:5px;border-bottom:none">${fmt(totalSai)}</td><td style="text-align:right;padding:5px;border-bottom:none">100%</td></tr>
      </tbody>
    </table>

    <div style="margin-top:14px;font-size:9px;color:#9199A2;line-height:1.55">
      Informações disponibilizadas em conformidade com a Lei nº 13.019/2014 — MROSC. Os valores apresentados correspondem às movimentações registradas no sistema AGENDO Integra, conforme dados conciliados com o extrato bancário.
    </div>

    ${rodape(protocolo)}
  </div>`
  abrirImpressao(html, 'Transparência Pública')
}


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

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-EV`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const periodoLabel = evento.data_inicio ? (new Date(evento.data_inicio+'T12:00:00').toLocaleDateString('pt-BR') + (evento.data_fim && evento.data_fim!==evento.data_inicio ? ' a '+new Date(evento.data_fim+'T12:00:00').toLocaleDateString('pt-BR') : '')) : '—'
  const pctMeta = evento.meta_financeira > 0 ? Math.round(totalEnt/evento.meta_financeira*100) : null

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Relatório de evento', evento.nome||'Evento', '', periodoLabel)}

    ${metaGrid([
      { label:'Tipo', val:'Evento institucional', sub:'Realização TEIAA' },
      { label:'Protocolo', val:protocolo, sub:'Emitido em '+dataEmissao },
      { label:'Período', val:periodoLabel, sub:'Data de realização' },
      { label:'Meta financeira', val:evento.meta_financeira?fmt(evento.meta_financeira):'—', sub:pctMeta!=null?pctMeta+'% atingido':'' },
    ])}

    ${figuras([
      { label:'Total entradas', val:fmt(totalEnt), cor:'#2E6F3E' },
      { label:'Total saídas', val:fmt(totalSai), cor:'#A7352C' },
      { label:'Resultado', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
      { label:'Meta atingida', val:pctMeta!=null?pctMeta+'%':'—', cor:'#A98E54' },
    ])}

    ${secTitle('Entradas realizadas')}
    <table style="border-collapse:collapse;width:100%;font-size:9px;margin-bottom:12px">
      ${tabelaHeader([{label:'Data'},{label:'Descrição'},{label:'Categoria'},{label:'Valor',align:'right'}])}
      <tbody>
        ${entradas.map(m=>`<tr><td style="white-space:nowrap;color:#626B76">${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>${m.descricao||'—'}</td><td style="font-size:8.5px">${m.categoria?.nome||'—'}</td><td style="text-align:right;color:#2E6F3E;white-space:nowrap">+ ${fmt(m.valor)}</td></tr>`).join('')}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td colspan="3" style="padding:5px;border-bottom:none">Total entradas</td><td style="text-align:right;color:#2E6F3E;padding:5px;border-bottom:none">${fmt(totalEnt)}</td></tr>
      </tbody>
    </table>

    ${secTitle('Saídas realizadas')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Data'},{label:'Descrição'},{label:'Categoria'},{label:'Valor',align:'right'}])}
      <tbody>
        ${saidas.map(m=>`<tr><td style="white-space:nowrap;color:#626B76">${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>${m.descricao||'—'}</td><td style="font-size:8.5px">${m.categoria?.nome||'—'}</td><td style="text-align:right;color:#A7352C;white-space:nowrap">- ${fmt(Math.abs(Number(m.valor)))}</td></tr>`).join('')}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td colspan="3" style="padding:5px;border-bottom:none">Total saídas</td><td style="text-align:right;color:#A7352C;padding:5px;border-bottom:none">${fmt(totalSai)}</td></tr>
      </tbody>
    </table>

    ${opts.assinaturas ? htmlAssinaturas(['Responsável pelo Evento','Responsável Financeiro','Diretoria']) : ''}
    ${rodape(protocolo)}
  </div>`
  abrirImpressao(html, 'Relatório de Evento')
}


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

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-CA`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const periodoLabel = campanha.data_inicio ? (new Date(campanha.data_inicio+'T12:00:00').toLocaleDateString('pt-BR') + (campanha.data_fim?' a '+new Date(campanha.data_fim+'T12:00:00').toLocaleDateString('pt-BR'):'')) : '—'

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Relatório de campanha', campanha.nome||'Campanha', '', periodoLabel)}

    ${metaGrid([
      { label:'Tipo', val:'Campanha de arrecadação', sub:'Realização TEIAA' },
      { label:'Protocolo', val:protocolo, sub:'Emitido em '+dataEmissao },
      { label:'Período', val:periodoLabel, sub:'Duração da campanha' },
      { label:'Meta financeira', val:campanha.meta_financeira?fmt(campanha.meta_financeira):'—', sub:pctMeta>0?pctMeta+'% atingido':'' },
    ])}

    ${campanha.meta_financeira > 0 ? `
    <div style="margin:12px 0;background:#F5F2EA;border-radius:4px;padding:12px 14px;display:flex;align-items:center;gap:14px">
      <div style="font-size:9px;color:#06344F;font-weight:700;white-space:nowrap">Meta: ${pctMeta}%</div>
      <div style="flex:1;height:7px;background:#D7D0C2;border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${Math.min(pctMeta,100)}%;background:#0E7EA8;border-radius:99px"></div>
      </div>
      <div style="font-size:9px;color:#626B76;white-space:nowrap">${fmt(totalEnt)} / ${fmt(campanha.meta_financeira)}</div>
    </div>` : ''}

    ${figuras([
      { label:'Total arrecadado', val:fmt(totalEnt), cor:'#2E6F3E' },
      { label:'Total despesas', val:fmt(totalSai), cor:'#A7352C' },
      { label:'Resultado', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
      { label:'Meta atingida', val:pctMeta>0?pctMeta+'%':'—', cor:'#A98E54' },
    ])}

    ${secTitle('Movimentações')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Data'},{label:'Descrição'},{label:'Tipo'},{label:'Valor',align:'right'}])}
      <tbody>
        ${[...entradas.map(m=>({...m,isEnt:true})),...saidas.map(m=>({...m,isEnt:false}))].sort((a,b)=>a.data.localeCompare(b.data)).map(m=>`<tr>
          <td style="white-space:nowrap;color:#626B76">${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
          <td>${m.descricao||'—'}</td>
          <td style="font-size:8.5px;color:${m.isEnt?'#2E6F3E':'#A7352C'}">${m.isEnt?'Entrada':'Saída'}</td>
          <td style="text-align:right;color:${m.isEnt?'#2E6F3E':'#A7352C'};white-space:nowrap">${m.isEnt?'+':'-'} ${fmt(Math.abs(Number(m.valor)))}</td>
        </tr>`).join('')}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td colspan="3" style="padding:5px;border-bottom:none">Resultado</td><td style="text-align:right;color:${saldo>=0?'#2E6F3E':'#A7352C'};padding:5px;border-bottom:none">${saldo>=0?'+ ':'- '}${fmt(saldo)}</td></tr>
      </tbody>
    </table>

    ${opts.assinaturas ? htmlAssinaturas(['Responsável pela Campanha','Responsável Financeiro','Diretoria']) : ''}
    ${rodape(protocolo)}
  </div>`
  abrirImpressao(html, 'Relatório de Campanha')
}


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

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-COB`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const statusCor = { 'pago confirmado no extrato':'#2E6F3E', 'pago - aguardando confirmação':'#854F0B', 'em aberto':'#626B76', 'vencido':'#A7352C', 'cancelado':'#9199A2', 'incobrável':'#9199A2' }
  const statusBg  = { 'pago confirmado no extrato':'#EEF8F1', 'pago - aguardando confirmação':'#FFF6E8', 'em aberto':'#F1EFE8', 'vencido':'#FEF2F2', 'cancelado':'#F5F2EA', 'incobrável':'#F5F2EA' }
  const hoje = new Date().toISOString().slice(0,10)

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Relatório de cobranças','Cobranças','e Boletos',`Emitido em ${dataEmissao}`)}

    ${figuras([
      { label:'Em aberto', val:fmt(totalAberto), cor:'#A7352C' },
      { label:'Informado pago', val:fmt(totalInformado), cor:'#854F0B' },
      { label:'Confirmado', val:fmt(totalConfirmado), cor:'#2E6F3E' },
      { label:'Total cobranças', val:cobrancas.length, cor:'#0E7EA8' },
    ])}

    ${secTitle('Detalhamento das cobranças')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Devedor'},{label:'Descrição'},{label:'Vencimento'},{label:'Valor',align:'right'},{label:'Status',align:'center'}])}
      <tbody>
        ${cobrancas.map(cob => {
          const st = cob.status||'em aberto'
          const venc = cob.data_vencimento
          const isVenc = venc && venc < hoje && st==='em aberto'
          const stReal = isVenc ? 'vencido' : st
          return `<tr>
            <td>${cob.devedor||'—'}</td>
            <td style="font-size:8.5px">${cob.descricao||'—'}</td>
            <td style="white-space:nowrap;color:${isVenc?'#A7352C':'#626B76'}">${venc?new Date(venc+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td>
            <td style="text-align:right;white-space:nowrap">${fmt(cob.valor)}</td>
            <td style="text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:7.5px;font-weight:700;background:${statusBg[stReal]||'#F1EFE8'};color:${statusCor[stReal]||'#626B76'}">${stReal}</span></td>
          </tr>`
        }).join('')}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2">
          <td colspan="3" style="padding:5px;border-bottom:none">Total em aberto</td>
          <td style="text-align:right;color:#A7352C;padding:5px;border-bottom:none;white-space:nowrap">${fmt(totalAberto)}</td>
          <td style="border-bottom:none"></td>
        </tr>
      </tbody>
    </table>
    ${rodape(protocolo)}
  </div>`
  abrirImpressao(html, 'Relatório de Cobranças')
}


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

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-PC`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const tipoLabel2 = TIPO_LABEL[conta.tipo_conta] || conta.tipo_conta

  const logoFallback = `<div style="font-size:16px;font-weight:900;color:#0E7EA8;letter-spacing:.04em">TEIAA</div><div style="font-size:8px;color:#888">Centro TEIAA de Atendimentos</div>`

  const cabFull = `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0E7EA8;padding-bottom:11px;margin-bottom:20px">
    <div><img src="https://teiaa.agendoas.com/logo.png" alt="TEIAA" style="height:46px;width:auto;object-fit:contain;display:block" onerror="this.outerHTML='${logoFallback}'" /></div>
    <div style="text-align:right;font-size:9px;color:#5F6874;max-width:260px;line-height:1.5">
      <div style="font-size:11px;font-weight:700;color:#20252C">${TEIAA_INFO.nome}</div>
      <div style="font-size:9.5px;font-weight:700;color:#20252C;margin:2px 0">CNPJ: ${TEIAA_INFO.cnpj}</div>
      <div style="font-size:7.5px;color:#9199A2;line-height:1.5">${TEIAA_INFO.registros.slice(0,3).join('<br>')}</div>
    </div>
  </div>`

  const cabCompact = `
  <div style="display:grid;grid-template-columns:1fr auto;gap:16px;border-bottom:1px solid #D7D0C2;padding-bottom:10px;margin-bottom:16px">
    <div>
      <div style="font-size:14px;font-weight:700;color:#06344F;letter-spacing:-.01em">Prestação de Contas — ${tipoLabel2}</div>
      <div style="margin-top:4px;color:#66717E;font-size:9px">${TEIAA_INFO.nome} · ${protocolo}</div>
    </div>
    <div style="text-align:right;font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#06344F">
      AGENDO Integra<span style="display:block;margin-top:3px;color:#0E7EA8;font-weight:400;text-transform:none;letter-spacing:0">${protocolo}</span>
    </div>
  </div>`

  const rodapeHtml = `
  <div style="border-top:1px solid #D7D0C2;padding-top:9px;display:flex;justify-content:space-between;color:#66717E;font-size:8.5px;margin-top:18px">
    <div>${TEIAA_INFO.endereco} · ${TEIAA_INFO.whatsapp} · ${TEIAA_INFO.email}</div>
    <div><strong style="color:#06344F">AGENDO Integra</strong> · ${protocolo}</div>
  </div>`

  const html = `
  <div class="pg">
    ${cabFull}

    <div style="font-size:9px;font-weight:700;color:#0E7EA8;letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">Documento institucional</div>
    <div style="font-family:Georgia,serif;font-size:42px;line-height:.95;font-weight:400;letter-spacing:-.04em;color:#06344F;margin-bottom:10px">Prestação<br>de Contas</div>
    <div style="width:70px;height:2px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:12px;color:#303944;margin-bottom:14px">${tipoLabel2} · Exercício ${new Date().getFullYear()}</div>
    <div style="margin-bottom:16px;display:flex;gap:8px;align-items:center">
      <span style="display:inline-block;padding:3px 12px;border-radius:4px;font-size:8.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:${isPreliminar?'#FAEEDA':'#EEF8F1'};color:${isPreliminar?'#854F0B':'#2E6F3E'}">${isPreliminar?'RELATÓRIO PRELIMINAR':'RELATÓRIO FINAL CONSOLIDADO'}</span>
      ${isPreliminar?`<span style="font-size:9px;color:#854F0B">Aguardando consolidação bancária</span>`:''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;margin-bottom:16px">
      <div style="padding:11px 18px 11px 0;border-right:1px solid #ECE6DA;border-bottom:1px solid #ECE6DA">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:4px">Instrumento</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${tipoLabel2}</div>
        <div style="font-size:9px;color:#626B76;margin-top:2px">${conta.nome||'—'}</div>
      </div>
      <div style="padding:11px 0 11px 18px;border-bottom:1px solid #ECE6DA">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:4px">Período</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${conta.data_inicio ? fmt(conta.data_inicio) : '—'} a ${conta.data_fim ? fmt(conta.data_fim) : '—'}</div>
        <div style="font-size:9px;color:#626B76;margin-top:2px">Exercício de execução</div>
      </div>
      <div style="padding:11px 18px 11px 0;border-right:1px solid #ECE6DA">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:4px">Protocolo</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${protocolo}</div>
        <div style="font-size:9px;color:#626B76;margin-top:2px">Emitido em ${dataEmissao}</div>
      </div>
      <div style="padding:11px 0 11px 18px">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:4px">Conciliação bancária</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${pctConc}% conciliado</div>
        <div style="font-size:9px;color:#626B76;margin-top:2px">${totalConciliados} de ${totalMovs} movimentações</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;margin-bottom:18px">
      <div style="padding:11px 8px;border-right:1px solid #ECE6DA">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Total repasses</div>
        <div style="font-family:Georgia,serif;font-size:16px;color:#0E7EA8">${fmt(totalRepasses)}</div>
      </div>
      <div style="padding:11px 8px;border-right:1px solid #ECE6DA">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Total despesas</div>
        <div style="font-family:Georgia,serif;font-size:16px;color:#A7352C">${fmt(totalDespesas)}</div>
      </div>
      <div style="padding:11px 8px;border-right:1px solid #ECE6DA">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Saldo disponível</div>
        <div style="font-family:Georgia,serif;font-size:16px;color:${saldoFinal>=0?'#2E6F3E':'#A7352C'}">${fmt(saldoFinal)}</div>
      </div>
      <div style="padding:11px 8px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Movimentações</div>
        <div style="font-family:Georgia,serif;font-size:16px;color:#0E7EA8">${totalMovs}</div>
      </div>
    </div>

    <div style="font-family:Georgia,serif;font-size:20px;color:#06344F;margin-bottom:11px;letter-spacing:-.02em">Execução por plano de trabalho</div>
    <table style="font-size:9.5px;border-collapse:collapse;width:100%">
      <thead>
        <tr>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:left">Plano / Meta</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Previsto</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Executado</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Saldo</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">%</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:left">Situação</th>
        </tr>
      </thead>
      <tbody>
        ${linhasPlano || '<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:10px">Sem planos vinculados</td></tr>'}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2">
          <td style="padding:6px 5px;border-bottom:none">Total</td>
          <td style="padding:6px 5px;text-align:right;border-bottom:none">${fmt(totalDisponivel)}</td>
          <td style="padding:6px 5px;text-align:right;color:#A7352C;border-bottom:none">${fmt(totalDespesas)}</td>
          <td style="padding:6px 5px;text-align:right;color:${saldoFinal>=0?'#2E6F3E':'#A7352C'};border-bottom:none">${fmt(saldoFinal)}</td>
          <td style="padding:6px 5px;text-align:center;border-bottom:none">${totalDisponivel>0?Math.round(totalDespesas/totalDisponivel*100):0}%</td>
          <td style="border-bottom:none"></td>
        </tr>
      </tbody>
    </table>

    ${pendCriticas > 0 ? `<div style="margin-top:14px;padding:10px 14px;border-left:3px solid #A7352C;background:#FEF2F2;font-size:10px;color:#A7352C"><strong>${pendCriticas} pendência(s) crítica(s)</strong> identificada(s) neste período — verificar antes da aprovação final.</div>` : ''}

    ${rodapeHtml}
  </div>

  <!-- PÁGINAS SEGUINTES: DESPESAS, RECEITAS, ETC -->
  <div class="pg page-break">
    ${cabCompact}

    <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:6px 10px 6px 13px;border-left:3px solid #A7352C;background:#FFF0F0;color:#A7352C;margin-bottom:12px">▼ Despesas realizadas (${saidas.length} registros)</div>
    <table style="font-size:8.5px;border-collapse:collapse;width:100%">
      <thead>
        <tr>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px;text-align:center">Seq.</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Data</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Fornecedor</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">CPF/CNPJ</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Categoria</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Plano</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Nº Doc.</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px;text-align:right">Valor</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px;text-align:center">Conc.</th>
        </tr>
      </thead>
      <tbody>
        ${linhasDespesas || '<tr><td colspan="9" style="text-align:center;color:#9199A2;padding:10px">Sem despesas registradas</td></tr>'}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2">
          <td colspan="7" style="padding:5px 4px;border-bottom:none">Total despesas</td>
          <td style="padding:5px 4px;text-align:right;color:#A7352C;border-bottom:none">${fmt(totalDespesas)}</td>
          <td style="border-bottom:none"></td>
        </tr>
      </tbody>
    </table>

    ${rodapeHtml}
  </div>

  ${opts.assinaturas ? `
  <div class="pg page-break">
    ${cabCompact}
    <div style="font-family:Georgia,serif;font-size:22px;color:#06344F;margin-bottom:16px;letter-spacing:-.02em">Encaminhamento e assinaturas</div>
    <div style="font-size:11.5px;line-height:1.7;color:#303842;margin-bottom:24px">
      Declaramos que o presente relatório consolida as movimentações financeiras referentes à execução do instrumento <strong>${tipoLabel2}</strong>, conforme registros no sistema AGENDO Integra.
    </div>
    <div style="font-size:11px;color:#303842;margin:28px 0 44px">Teresópolis — RJ, _______ de _________________________ de _______.</div>
    ${htmlAssinaturas(['Responsável Financeiro', 'Representante Legal / Diretoria', 'Responsável pela Conferência'])}
    ${rodapeHtml}
  </div>` : ''}
`
  abrirImpressao(html, `Prestação de Contas — ${tipoLabel}`)
}


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

  const vcor  = { aprovado:'#2E6F3E', aprovado_ressalva:'#854F0B', reprovado:'#A7352C' }
  const vbg   = { aprovado:'#EEF8F1', aprovado_ressalva:'#FFF6E8', reprovado:'#FEF2F2' }
  const vicon = { aprovado:'✓', aprovado_ressalva:'!', reprovado:'✗' }
  const vlabel= { aprovado:'Aprovado', aprovado_ressalva:'Aprovado com ressalva', reprovado:'Reprovado' }
  const tipo_apr = fechamento.tipo_aprovacao || 'aprovado'
  const protocolo = `AG-TEIAA-${fechamento.competencia||new Date().getFullYear()}-CF`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Documento do Conselho Fiscal','Parecer','Mensal',`Competência: ${fmtMes(fechamento.competencia)}`)}

    ${metaGrid([
      { label:'Instituição', val:TEIAA_INFO.nome, sub:'CNPJ: '+TEIAA_INFO.cnpj },
      { label:'Competência', val:fmtMes(fechamento.competencia), sub:'Período mensal' },
      { label:'Protocolo', val:protocolo, sub:'Emitido em '+dataEmissao },
      { label:'Modalidade', val:modalLabel[fechamento.modalidade_reuniao]||fechamento.modalidade_reuniao||'—', sub:fechamento.data_reuniao?'Reunião em '+fmtData(fechamento.data_reuniao):'—' },
    ])}

    <div style="border:1.5px solid ${vcor[tipo_apr]};background:${vbg[tipo_apr]};padding:18px 20px;margin:14px 0;display:flex;align-items:center;gap:18px">
      <div style="width:44px;height:44px;border-radius:50%;background:${vcor[tipo_apr]};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;font-weight:900;color:#fff">${vicon[tipo_apr]}</div>
      <div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.14em;color:${vcor[tipo_apr]};font-weight:700;margin-bottom:4px">Decisão do Conselho Fiscal</div>
        <div style="font-family:Georgia,serif;font-size:24px;color:${vcor[tipo_apr]};font-weight:400;line-height:1">${vlabel[tipo_apr]}</div>
        ${fechamento.ressalvas ? `<div style="font-size:9px;color:${vcor[tipo_apr]};margin-top:5px;opacity:.85">${fechamento.ressalvas}</div>` : ''}
      </div>
    </div>

    ${figuras([
      { label:'Total entradas', val:fmt(entradas), cor:'#2E6F3E' },
      { label:'Total saídas', val:fmt(saidas), cor:'#A7352C' },
      { label:'Resultado do período', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
      { label:'Movimentações', val:movs.length, cor:'#0E7EA8' },
    ])}

    ${membros.length > 0 ? `
    ${secTitle('Membros presentes')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:10px">
      ${membros.map(n=>`<div style="text-align:center">
        <div style="height:36px;border-bottom:1px solid #9199A2;margin-bottom:6px"></div>
        <div style="font-size:9px;font-weight:700;color:#06344F">${n}</div>
        <div style="font-size:8.5px;color:#626B76;margin-top:2px">Conselho Fiscal</div>
      </div>`).join('')}
    </div>` : ''}

    ${fechamento.observacoes ? `
    <div style="margin-top:14px;border-left:3px solid #0E7EA8;padding:10px 14px;background:#EAF5F8;font-size:10px;color:#303842;line-height:1.6">
      <strong style="font-size:8.5px;color:#06344F;text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Observações</strong>
      ${fechamento.observacoes}
    </div>` : ''}

    ${rodape(protocolo)}
  </div>`

  abrirImpressao(html, `Parecer CF — ${fmtMes(fechamento.competencia)}`)
}


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

  const protocolo = `AG-TEIAA-${ano}-CFAN`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const tipoLabel2 = { aprovado:'Aprovado', aprovado_ressalva:'Aprovado c/ ressalva', reprovado:'Reprovado' }
  const tipoCor2 = { aprovado:'#2E6F3E', aprovado_ressalva:'#854F0B', reprovado:'#A7352C' }
  const tipoBg2 = { aprovado:'#EEF8F1', aprovado_ressalva:'#FFF6E8', reprovado:'#FEF2F2' }

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Documento do Conselho Fiscal','Parecer','Anual',`Consolidação das aprovações mensais · Exercício ${ano}`)}

    ${metaGrid([
      { label:'Exercício', val:ano, sub:'Janeiro a Dezembro' },
      { label:'Protocolo', val:protocolo, sub:'Emitido em '+dataEmissao },
      { label:'Meses analisados', val:`${fechamentos.length} de 12`, sub:'Exercício completo' },
      { label:'Com ressalva', val:comRessalva.length > 0 ? comRessalva.length+' mês(es)' : 'Nenhum', cor:comRessalva.length>0?'#854F0B':'#2E6F3E', sub:comRessalva.length>0?'Verificar observações':'Exercício aprovado' },
    ])}

    ${figuras([
      { label:'Total entradas', val:fmt(entradas), cor:'#2E6F3E' },
      { label:'Total saídas', val:fmt(saidas), cor:'#A7352C' },
      { label:'Resultado do exercício', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
      { label:'Movimentações', val:movs.length, cor:'#0E7EA8' },
    ])}

    ${secTitle('Aprovações mensais')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Mês'},{label:'Parecer'},{label:'Data de aprovação'},{label:'Ressalvas'}])}
      <tbody>
        ${linhasMeses}
      </tbody>
    </table>

    ${membros.length > 0 ? `
    ${secTitle('Assinaturas')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:10px">
      ${membros.map(n=>`<div style="text-align:center">
        <div style="height:36px;border-bottom:1px solid #9199A2;margin-bottom:6px"></div>
        <div style="font-size:9px;font-weight:700;color:#06344F">${n}</div>
        <div style="font-size:8.5px;color:#626B76;margin-top:2px">Conselho Fiscal</div>
      </div>`).join('')}
    </div>` : ''}

    <div style="margin-top:16px;font-size:10px;color:#303842;line-height:1.65">
      Teresópolis — RJ, _______ de _________________________ de ${new Date().getFullYear()+1}.
    </div>

    ${rodape(protocolo)}
  </div>`

  abrirImpressao(html, `Parecer Anual CF — ${ano}`)
}

// =============================================
// RELATÓRIOS DA CENTRAL — PLANO DE AÇÃO
// =============================================
export function gerarPDFPlanoAcao(dados, opts = {}) {
  const { plano, projetosCompletos, presidente } = dados
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-PA`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const periodoLabel = plano?.periodo_inicio ? `${fmtData(plano.periodo_inicio)} a ${fmtData(plano.periodo_fim)}` : '—'
  const totalOrc = (projetosCompletos||[]).reduce((a,pv) => a + (pv.orcamento||[]).reduce((b,o)=>b+Number(o.valor_previsto||0),0), 0)

  const linhasProjetos = (projetosCompletos||[]).map(pv => {
    const orcTotal = (pv.orcamento||[]).reduce((a,o)=>a+Number(o.valor_previsto||0),0)
    const equipeNomes = (pv.equipe||[]).map(e=>e.membro?.nome||'—').slice(0,3).join(', ') + ((pv.equipe||[]).length>3?' ...':'')
    return `<tr>
      <td><strong style="font-size:9px">${pv.projeto?.nome||'—'}</strong><div style="font-size:8px;color:#626B76;margin-top:2px">${pv.projeto?.tipo_servico||'—'}</div></td>
      <td style="font-size:8.5px">${pv.projeto?.publico_alvo||'—'}</td>
      <td class="center">${pv.projeto?.capacidade_atendimento||'—'}</td>
      <td style="font-size:8.5px">${equipeNomes||'—'}</td>
      <td class="num">${fmt(orcTotal)}</td>
      <td class="center" style="color:${pv.projeto?.situacao==='ativo'?'var(--green)':'var(--muted)'}">${pv.projeto?.situacao||'—'}</td>
    </tr>`
  }).join('')

  const linhasOrc = (projetosCompletos||[]).flatMap(pv =>
    (pv.orcamento||[]).map(o => `<tr>
      <td style="font-size:8.5px">${pv.projeto?.nome||'—'}</td>
      <td>${o.categoria||'—'}</td>
      <td style="font-size:8.5px">${o.elemento_despesa||'—'}</td>
      <td class="num">${fmt(o.valor_previsto||0)}</td>
      <td style="font-size:8.5px;color:var(--muted)">${o.justificativa||'—'}</td>
    </tr>`)
  ).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ tipo:'full' })}
    <div style="font-size:9px;font-weight:700;color:var(--agendo);letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">Documento institucional</div>
    <div style="font-family:Georgia,serif;font-size:42px;line-height:.95;font-weight:400;letter-spacing:-.04em;color:var(--agendo-dark);margin-bottom:10px">Plano<br>de Ação</div>
    <div style="width:70px;height:2px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:12px;color:#303944;margin-bottom:18px">${plano?.nome_plano||'—'} · ${periodoLabel}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:16px">
      <div style="padding:11px 16px 11px 0;border-right:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Tipo de instrumento</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${plano?.tipo_plano||'—'}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">${plano?.orgao_ou_parceiro||'—'}</div>
      </div>
      <div style="padding:11px 0 11px 16px;border-bottom:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Período de execução</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${periodoLabel}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">Protocolo: ${protocolo}</div>
      </div>
      <div style="padding:11px 16px 11px 0;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Valor total previsto</div>
        <div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${fmt(totalOrc)}</div>
      </div>
      <div style="padding:11px 0 11px 16px">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Projetos / Serviços vinculados</div>
        <div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${(projetosCompletos||[]).length}</div>
      </div>
    </div>

    ${plano?.objeto ? `<div style="border-left:3px solid var(--agendo);padding:10px 14px;background:var(--agendo-soft);font-size:10px;line-height:1.65;color:#303842;margin-bottom:14px"><strong style="font-size:8.5px;color:var(--agendo-dark);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Objeto</strong>${plano.objeto}</div>` : ''}
    ${plano?.objetivo_geral ? `<div style="border-left:3px solid var(--line);padding:10px 14px;background:#F8F7F2;font-size:10px;line-height:1.65;color:#303842;margin-bottom:14px"><strong style="font-size:8.5px;color:var(--agendo-dark);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Objetivo Geral</strong>${plano.objetivo_geral}</div>` : ''}

    <div style="font-family:Georgia,serif;font-size:20px;color:var(--agendo-dark);margin-bottom:11px;letter-spacing:-.02em">Projetos e serviços vinculados</div>
    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto / Serviço</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Público-alvo</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Capacidade</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Equipe</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Orçamento</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Situação</th>
      </tr></thead>
      <tbody>
        ${linhasProjetos||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum projeto vinculado</td></tr>'}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid var(--line)">
          <td colspan="4" style="padding:6px 5px;border-bottom:none">Total previsto</td>
          <td style="padding:6px 5px;text-align:right;color:var(--agendo);border-bottom:none">${fmt(totalOrc)}</td>
          <td style="border-bottom:none"></td>
        </tr>
      </tbody>
    </table>

    ${linhasOrc ? `
    <div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo-dark);margin:18px 0 10px;letter-spacing:-.02em">Detalhamento orçamentário</div>
    <table style="font-size:8.5px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Categoria</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Elemento</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Valor previsto</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Justificativa</th>
      </tr></thead>
      <tbody>${linhasOrc}</tbody>
    </table>` : ''}

    ${opts.assinaturas ? `
    <div style="margin-top:20px;font-size:11px;color:#303842">Teresópolis — RJ, _______ de _________________________ de ${new Date().getFullYear()}.</div>
    ${htmlAssinaturas(['Responsável Técnico / Coordenador', 'Representante Legal / Presidente', 'Responsável pela Conferência'])}` : ''}
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Plano de Ação')
}

// =============================================
// RELATÓRIO ANUAL
// =============================================
export function gerarPDFRelatAnual(dados, opts = {}) {
  const { plano, projetosCompletos, totalEntGeral, totalDespGeral, totalAtendGeral, totalUsersGeral } = dados
  const protocolo = `AG-TEIAA-${plano?.periodo_inicio?.slice(0,4)||new Date().getFullYear()}-RA`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const ano = plano?.periodo_inicio?.slice(0,4) || new Date().getFullYear()
  const saldoGeral = (totalEntGeral||0) - (totalDespGeral||0)

  const linhasProjetos = (projetosCompletos||[]).map(pv => {
    const sP = (pv.totalEnt||0) - (pv.totalDesp||0)
    return `<tr>
      <td><strong style="font-size:9px">${pv.projeto?.nome||'—'}</strong><div style="font-size:8px;color:#626B76">${pv.projeto?.tipo_servico||'—'}</div></td>
      <td class="center">${pv.totalAtend||0}</td>
      <td class="center">${pv.totalUsers||0}</td>
      <td class="num" style="color:var(--green)">${fmt(pv.totalEnt||0)}</td>
      <td class="num" style="color:var(--red)">${fmt(pv.totalDesp||0)}</td>
      <td class="num" style="color:${sP>=0?'var(--green)':'var(--red)'}">${sP>=0?'+ ':'- '}${fmt(sP)}</td>
    </tr>`
  }).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ tipo:'full' })}
    <div style="font-size:9px;font-weight:700;color:var(--agendo);letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">Relatório anual</div>
    <div style="font-family:Georgia,serif;font-size:42px;line-height:.95;font-weight:400;letter-spacing:-.04em;color:var(--agendo-dark);margin-bottom:10px">Relatório<br>Anual</div>
    <div style="width:70px;height:2px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:12px;color:#303944;margin-bottom:18px">${plano?.nome_plano||'—'} · Exercício ${ano}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:16px">
      <div style="padding:11px 16px 11px 0;border-right:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Instrumento</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${plano?.tipo_plano||'—'}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">${plano?.orgao_ou_parceiro||'—'}</div>
      </div>
      <div style="padding:11px 0 11px 16px;border-bottom:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Exercício</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${ano}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">${fmtData(plano?.periodo_inicio)} a ${fmtData(plano?.periodo_fim)}</div>
      </div>
      <div style="padding:11px 16px 11px 0;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Protocolo</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${protocolo}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">Emitido em ${dataEmissao}</div>
      </div>
      <div style="padding:11px 0 11px 16px">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Projetos analisados</div>
        <div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${(projetosCompletos||[]).length}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:20px">
      <div style="padding:13px 10px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:7px">Total entradas</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--green)">${fmt(totalEntGeral||0)}</div>
      </div>
      <div style="padding:13px 10px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:7px">Total despesas</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--red)">${fmt(totalDespGeral||0)}</div>
      </div>
      <div style="padding:13px 10px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:7px">Resultado</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:${saldoGeral>=0?'var(--green)':'var(--red)'}">${saldoGeral>=0?'+ ':'- '}${fmt(saldoGeral)}</div>
      </div>
      <div style="padding:13px 10px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:7px">Atendimentos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${totalAtendGeral||0}</div>
      </div>
    </div>

    <div style="font-family:Georgia,serif;font-size:20px;color:var(--agendo-dark);margin-bottom:11px;letter-spacing:-.02em">Execução por projeto / serviço</div>
    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto / Serviço</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Atendimentos</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Usuários</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Entradas</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Despesas</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Saldo</th>
      </tr></thead>
      <tbody>
        ${linhasProjetos||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum projeto encontrado</td></tr>'}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid var(--line)">
          <td style="padding:6px 5px;border-bottom:none">Total</td>
          <td style="padding:6px 5px;text-align:center;border-bottom:none">${totalAtendGeral||0}</td>
          <td style="padding:6px 5px;text-align:center;border-bottom:none">${totalUsersGeral||0}</td>
          <td style="padding:6px 5px;text-align:right;color:var(--green);border-bottom:none">${fmt(totalEntGeral||0)}</td>
          <td style="padding:6px 5px;text-align:right;color:var(--red);border-bottom:none">${fmt(totalDespGeral||0)}</td>
          <td style="padding:6px 5px;text-align:right;color:${saldoGeral>=0?'var(--green)':'var(--red)'};border-bottom:none">${saldoGeral>=0?'+ ':'- '}${fmt(saldoGeral)}</td>
        </tr>
      </tbody>
    </table>

    ${opts.assinaturas ? `
    <div style="margin-top:20px;font-size:11px;color:#303842">Teresópolis — RJ, _______ de _________________________ de ${new Date().getFullYear()}.</div>
    ${htmlAssinaturas(['Responsável Técnico', 'Representante Legal / Presidente', 'Conselho Fiscal'])}` : ''}
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, `Relatório Anual ${ano}`)
}

// =============================================
// EQUIPE
// =============================================
export function gerarPDFEquipe(dados, opts = {}) {
  const { lista, porTipo, porSit } = dados
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-EQ`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const ativos = lista.filter(e=>e.situacao==='ativo').length

  const linhas = lista.map(e => `<tr>
    <td><strong style="font-size:9px">${e.nome||'—'}</strong>${e.email?`<div style="font-size:8px;color:#626B76">${e.email}</div>`:''}</td>
    <td style="font-size:8.5px">${e.funcao||'—'}</td>
    <td style="font-size:8.5px">${e.tipo_vinculo||'—'}</td>
    <td style="font-size:8.5px">${e.orgao_origem||'—'}</td>
    <td class="center" style="font-size:8px;font-weight:600;color:${e.situacao==='ativo'?'var(--green)':'var(--muted)'}">${e.situacao||'—'}</td>
    <td class="center" style="font-size:8.5px">${e.data_ingresso?fmtData(e.data_ingresso):'—'}</td>
  </tr>`).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ titulo:'Relatório de Equipe', sub:`${TEIAA_INFO.nome} · Emitido em ${dataEmissao}`, ref:protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:14px;letter-spacing:-.02em">Equipe</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:18px">
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Total</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${lista.length}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Ativos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--green)">${ativos}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Inativos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--red)">${lista.length-ativos}</div>
      </div>
      <div style="padding:12px 8px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Tipos de vínculo</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${Object.keys(porTipo||{}).length}</div>
      </div>
    </div>

    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Nome</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Função</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Tipo de vínculo</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Órgão origem</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Situação</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Ingresso</th>
      </tr></thead>
      <tbody>${linhas||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum membro encontrado</td></tr>'}</tbody>
    </table>
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Relatório de Equipe')
}

// =============================================
// USUÁRIOS ATENDIDOS
// =============================================
export function gerarPDFUsuariosAtendidos(dados, periodoLabel, opts = {}) {
  const { lista, ativos, desligados, faixas } = dados
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-UA`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const linhas = lista.map(u => `<tr>
    <td><strong style="font-size:9px">${u.nome||'—'}</strong></td>
    <td class="center" style="font-size:8.5px">${u.data_nascimento?fmtData(u.data_nascimento):'—'}</td>
    <td class="center" style="font-size:8px;font-weight:600;color:${u.situacao==='ativo'?'var(--green)':'var(--muted)'}">${u.situacao||'—'}</td>
    <td style="font-size:8.5px">${u.projeto?.nome||'—'}</td>
    <td style="font-size:8.5px">${u.publico_alvo||'—'}</td>
    <td class="center" style="font-size:8.5px">${u.data_ingresso?fmtData(u.data_ingresso):'—'}</td>
  </tr>`).join('')

  const linhasFaixas = Object.entries(faixas||{}).map(([f,v]) => `<tr><td>${f}</td><td class="num">${v}</td><td class="num">${lista.length>0?Math.round(v/lista.length*100):0}%</td></tr>`).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ titulo:'Usuários Atendidos', sub:`${TEIAA_INFO.nome} · ${periodoLabel||'Período selecionado'}`, ref:protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:14px;letter-spacing:-.02em">Usuários Atendidos</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:18px">
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Total</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${lista.length}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Ativos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--green)">${ativos}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Desligados</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--red)">${desligados}</div>
      </div>
      <div style="padding:12px 8px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Projetos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${[...new Set(lista.map(u=>u.projeto?.nome))].filter(Boolean).length}</div>
      </div>
    </div>

    ${linhasFaixas ? `
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;margin-bottom:16px">
      <div>
        <div style="font-family:Georgia,serif;font-size:16px;color:var(--agendo-dark);margin-bottom:9px;letter-spacing:-.02em">Faixa etária</div>
        <table style="font-size:9px;border-collapse:collapse;width:100%">
          <thead><tr>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px">Faixa</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px;text-align:right">Qtd</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px;text-align:right">%</th>
          </tr></thead>
          <tbody>${linhasFaixas}</tbody>
        </table>
      </div>
      <div>` : '<div>'}
    <div style="font-family:Georgia,serif;font-size:16px;color:var(--agendo-dark);margin-bottom:9px;letter-spacing:-.02em">Lista de usuários</div>
    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Nome</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Nascimento</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Situação</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Público-alvo</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Ingresso</th>
      </tr></thead>
      <tbody>${linhas||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum usuário encontrado</td></tr>'}</tbody>
    </table>
    ${linhasFaixas ? '</div></div>' : ''}
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Usuários Atendidos', true)
}

// =============================================
// ATENDIMENTOS
// =============================================
export function gerarPDFAtendimentos(dados = {}, periodoLabel, opts = {}) {
  const lista = Array.isArray(dados.lista) ? dados.lista : []
  const protocolo = opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-TEACOLHER-AT`
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const esc = v => String(v ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  const valor = v => v === null || v === undefined || v === '' ? '—' : esc(v)
  const normal = v => String(v || '').toLowerCase().trim()
  const nomeAtendido = a => a.usuario_atendido?.nome || a.usuario?.nome || a.pessoa_atendida || a.nome_usuario || 'Usuário/família'
  const nomeProf = a => a.profissional?.nome || a.equipe?.nome || a.profissional_nome || a.tecnico_nome || '—'
  const nomeProjeto = a => a.projeto?.nome || a.projeto_nome || 'Projeto TEAcolher'
  const etapa = a => a.etapa_fluxo || a.tipo_atend || 'Atendimento TEAcolher'
  const tema = a => a.objetivo_atendimento || a.tema || a.descricao || '—'
  const duracao = a => a.duracao_minutos ? `${a.duracao_minutos} min` : '—'
  const periodo = periodoLabel || opts.periodoLabel || 'Período selecionado'
  const totalPart = Number(dados.totalPart ?? lista.reduce((s, a) => s + (Number(a.qtd_participantes) || 0), 0)) || 0

  const realizados = lista.filter(a => normal(a.situacao) === 'realizado').length
  const pendentes = lista.filter(a => ['agendado','reagendado'].includes(normal(a.situacao))).length
  const cancelados = lista.filter(a => ['cancelado','desligado','encerrado'].includes(normal(a.situacao))).length
  const faltas = lista.filter(a => ['faltou','falta justificada','remarcado','cancelado'].includes(String(a.comparecimento || '').toLowerCase()) || ['reagendado','cancelado'].includes(normal(a.situacao))).length
  const encaminhados = lista.filter(a =>
    (a.tipo_encaminhamento && a.tipo_encaminhamento !== 'Sem encaminhamento externo') ||
    (a.rede_encaminhada && a.rede_encaminhada !== 'Não se aplica') ||
    (a.orgao_encaminhamento || '').trim() ||
    (a.encaminhamentos || '').trim()
  ).length
  const devolutivas = lista.filter(a =>
    String(a.devolutiva_familia || '').toLowerCase().includes('sim') ||
    String(a.etapa_fluxo || '').toLowerCase().includes('devolutiva')
  ).length
  const familias = new Set(lista.map(a => a.usuario_atendido_id ? String(a.usuario_atendido_id) : nomeAtendido(a)).filter(Boolean)).size

  function agrupar(chaveFn) {
    const obj = {}
    lista.forEach(a => {
      const k = chaveFn(a) || 'Não informado'
      obj[k] = (obj[k] || 0) + 1
    })
    return obj
  }

  const porProfissional = agrupar(a => nomeProf(a))
  const porArea = agrupar(a => a.area_atendimento || 'Interdisciplinar')
  const porModalidade = agrupar(a => a.modalidade_atendimento || 'Não informado')
  const porComparecimento = agrupar(a => a.comparecimento || a.situacao || 'Não informado')
  const porDesfecho = agrupar(a => a.desfecho_teacolher || 'Sem desfecho registrado')
  const porEtapa = agrupar(a => etapa(a))

  const linhasGrupo = (obj, total = lista.length) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
    <tr>
      <td>${valor(k)}</td>
      <td class="num">${v}</td>
      <td class="num">${total > 0 ? Math.round(v / total * 100) : 0}%</td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#9199A2;padding:8px">Sem dados</td></tr>'

  const linhasDetalhe = lista.map(a => {
    const sit = a.comparecimento || a.situacao || '—'
    const enc = a.tipo_encaminhamento && a.tipo_encaminhamento !== 'Sem encaminhamento externo'
      ? a.tipo_encaminhamento
      : (a.rede_encaminhada && a.rede_encaminhada !== 'Não se aplica' ? a.rede_encaminhada : (a.encaminhamentos || '—'))
    return `<tr>
      <td style="white-space:nowrap;color:#626B76">${fmtData(a.data_atend)}</td>
      <td style="white-space:nowrap;color:#626B76">${a.hora_inicio ? String(a.hora_inicio).slice(0,5) : '—'}</td>
      <td><strong>${valor(nomeAtendido(a))}</strong><div style="font-size:7.5px;color:#888;margin-top:2px">${valor(nomeProjeto(a))}</div></td>
      <td>${valor(nomeProf(a))}</td>
      <td>${valor(a.area_atendimento || 'Interdisciplinar')}</td>
      <td>${valor(a.modalidade_atendimento || '—')}</td>
      <td>${valor(sit)}</td>
      <td class="num">${duracao(a)}</td>
      <td>${valor(a.desfecho_teacolher || enc)}</td>
    </tr>`
  }).join('')

  const registrosTecnicos = lista.filter(a => a.registro_tecnico || a.demanda_identificada || a.orientacao_familia || a.devolutiva_familia || a.proxima_acao || a.encaminhamentos || a.tipo_encaminhamento || a.desfecho_teacolher)
  const blocosRegistro = registrosTecnicos.map(a => `
    <div style="border:1px solid var(--line);border-radius:6px;padding:10px 12px;margin-bottom:10px;page-break-inside:avoid;background:#FFFEFA">
      <div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid var(--line-soft);padding-bottom:6px;margin-bottom:8px">
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--agendo-dark)">${valor(nomeAtendido(a))}</div>
          <div style="font-size:8.5px;color:#626B76;margin-top:2px">${fmtData(a.data_atend)} · ${valor(nomeProf(a))} · ${valor(a.area_atendimento || 'Interdisciplinar')}</div>
        </div>
        <div style="text-align:right;font-size:8.5px;color:#626B76">
          ${valor(a.comparecimento || a.situacao)}<br>${duracao(a)}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:9px;line-height:1.45">
        <div><strong>Demanda identificada:</strong><br>${valor(a.demanda_identificada)}</div>
        <div><strong>Objetivo/etapa:</strong><br>${valor(etapa(a))} · ${valor(tema(a))}</div>
        <div style="grid-column:1 / -1"><strong>Registro técnico / evolução:</strong><br>${valor(a.registro_tecnico || a.descricao)}</div>
        <div><strong>Orientação familiar:</strong><br>${valor(a.orientacao_familia)}</div>
        <div><strong>Devolutiva à família:</strong><br>${valor(a.devolutiva_familia)}</div>
        <div><strong>Encaminhamento:</strong><br>${valor(a.tipo_encaminhamento || a.rede_encaminhada || a.encaminhamentos)}</div>
        <div><strong>Próxima ação / desfecho:</strong><br>${valor(a.proxima_acao || a.desfecho_teacolher)}</div>
      </div>
    </div>`).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ titulo:'Relatório Técnico TEAcolher', sub:`${TEIAA_INFO.nome} · ${periodo}`, ref:protocolo })}

    <div style="font-size:9px;font-weight:700;color:var(--agendo);letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">Prestação técnica de atendimentos</div>
    <div style="font-family:Georgia,serif;font-size:36px;line-height:.95;color:var(--agendo-dark);letter-spacing:-.04em;margin-bottom:10px">Relatório<br>TEAcolher</div>
    <div style="width:80px;height:2px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:11.5px;color:#303944;line-height:1.55;margin-bottom:16px">
      Consolidação dos atendimentos do Projeto TEAcolher para acompanhamento da agenda, execução técnica, encaminhamentos, devolutivas familiares e suporte à prestação de contas.
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:16px">
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)"><div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">Atendimentos</div><div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${lista.length}</div></div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)"><div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">Realizados</div><div style="font-family:Georgia,serif;font-size:18px;color:var(--green)">${realizados}</div></div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)"><div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">Famílias</div><div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo-dark)">${familias}</div></div>
      <div style="padding:12px 8px"><div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">Participantes</div><div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${totalPart.toLocaleString('pt-BR')}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
      <div class="info-item"><div class="info-label">Pendentes de finalização</div><div class="info-valor" style="color:#854F0B">${pendentes}</div></div>
      <div class="info-item"><div class="info-label">Faltas/remarcações/cancel.</div><div class="info-valor" style="color:var(--red)">${faltas + cancelados}</div></div>
      <div class="info-item"><div class="info-label">Encaminhamentos</div><div class="info-valor" style="color:#854F0B">${encaminhados}</div></div>
      <div class="info-item"><div class="info-label">Devolutivas familiares</div><div class="info-valor" style="color:var(--green)">${devolutivas}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div>
        <div class="secao-titulo secao-titulo-azul">Por profissional</div>
        <table><thead><tr><th>Profissional</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porProfissional)}</tbody></table>
      </div>
      <div>
        <div class="secao-titulo secao-titulo-azul">Por área</div>
        <table><thead><tr><th>Área</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porArea)}</tbody></table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div>
        <div class="secao-titulo secao-titulo-verde">Comparecimento / situação</div>
        <table><thead><tr><th>Situação</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porComparecimento)}</tbody></table>
      </div>
      <div>
        <div class="secao-titulo secao-titulo-verde">Desfechos</div>
        <table><thead><tr><th>Desfecho</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porDesfecho)}</tbody></table>
      </div>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

  <div class="pg page-break pg-landscape">
    ${htmlCabecalho({ titulo:'Relatório Técnico TEAcolher — detalhamento', sub:periodo, ref:protocolo })}
    <div class="secao-titulo secao-titulo-azul">Lista de atendimentos, agenda e execução</div>
    <table style="font-size:8.5px">
      <thead><tr>
        <th>Data</th><th>Hora</th><th>Usuário/família</th><th>Profissional</th><th>Área</th><th>Modalidade</th><th>Situação</th><th class="num">Duração</th><th>Desfecho / encaminhamento</th>
      </tr></thead>
      <tbody>${linhasDetalhe || '<tr><td colspan="9" style="text-align:center;color:#9199A2;padding:12px">Nenhum atendimento no período</td></tr>'}</tbody>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px">
      <div><div class="secao-titulo secao-titulo-azul">Por etapa do fluxo</div><table><thead><tr><th>Etapa</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porEtapa)}</tbody></table></div>
      <div><div class="secao-titulo secao-titulo-azul">Por modalidade</div><table><thead><tr><th>Modalidade</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porModalidade)}</tbody></table></div>
      <div><div class="secao-titulo secao-titulo-verde">Síntese de controle</div>
        <table><tbody>
          <tr><td>Período</td><td class="num">${valor(periodo)}</td></tr>
          <tr><td>Famílias acompanhadas</td><td class="num">${familias}</td></tr>
          <tr><td>Atendimentos realizados</td><td class="num">${realizados}</td></tr>
          <tr><td>Atendimentos pendentes</td><td class="num">${pendentes}</td></tr>
          <tr><td>Encaminhamentos</td><td class="num">${encaminhados}</td></tr>
        </tbody></table>
      </div>
    </div>
    ${htmlRodape({ protocolo })}
  </div>

  ${blocosRegistro ? `
  <div class="pg page-break">
    ${htmlCabecalho({ titulo:'Relatório Técnico TEAcolher — registros', sub:periodo, ref:protocolo })}
    <div class="secao-titulo secao-titulo-verde">Registros técnicos, devolutivas e encaminhamentos</div>
    ${blocosRegistro}
    ${htmlRodape({ protocolo })}
  </div>` : ''}
  `

  abrirImpressao(html, 'Relatório Técnico TEAcolher', true)
}

// Agenda limpa do TEAcolher — pode ser usada por painel operacional ou técnico
export function gerarPDFAgendaTeacolher(lista = [], titulo = 'Agenda TEAcolher', opts = {}) {
  const protocolo = opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-AGENDA`
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const esc = v => String(v ?? '—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
  const nomeAtendido = a => a.usuario_atendido?.nome || a.usuario?.nome || a.pessoa_atendida || 'Usuário/família'
  const nomeProf = a => a.profissional?.nome || a.equipe?.nome || a.profissional_nome || '—'
  const subtitulo = opts.subtitulo || opts.periodoLabel || 'Agenda do Projeto TEAcolher'

  const linhas = (Array.isArray(lista) ? lista : []).map(a => `<tr>
    <td style="white-space:nowrap">${fmtData(a.data_atend)}</td>
    <td style="white-space:nowrap">${a.hora_inicio ? String(a.hora_inicio).slice(0,5) : '—'}</td>
    <td><strong>${esc(nomeAtendido(a))}</strong></td>
    <td>${esc(nomeProf(a))}</td>
    <td>${esc(a.area_atendimento || a.etapa_fluxo || a.tipo_atend || 'Atendimento')}</td>
    <td>${esc(a.situacao || 'agendado')}</td>
  </tr>`).join('')

  const html = `<div class="pg">
    ${htmlCabecalho({ titulo, sub:subtitulo, ref:protocolo })}
    <div class="secao-titulo secao-titulo-azul">Agenda limpa para impressão</div>
    <table>
      <thead><tr><th>Data</th><th>Hora</th><th>Usuário/família</th><th>Profissional</th><th>Atendimento</th><th>Situação</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum item na agenda</td></tr>'}</tbody>
    </table>
    ${htmlRodape({ protocolo })}
  </div>`
  abrirImpressao(html, titulo, false)
}

// Ficha individual do atendimento TEAcolher
export function gerarPDFFichaAtendimentoTeacolher(a = {}, opts = {}) {
  const protocolo = opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-FICHA-${a.id || 'AT'}`
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const esc = v => String(v ?? '—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
  const nomeAtendido = a.usuario_atendido?.nome || a.usuario?.nome || a.pessoa_atendida || 'Usuário/família'
  const nomeProf = a.profissional?.nome || a.equipe?.nome || a.profissional_nome || '—'
  const item = (label, value) => `<div class="info-item"><div class="info-label">${label}</div><div class="info-valor">${esc(value || '—')}</div></div>`
  const bloco = (label, value) => `<div style="border:1px solid var(--line);border-radius:5px;padding:10px 12px;margin-bottom:10px"><div style="font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#6B7280;margin-bottom:5px;font-weight:700">${label}</div><div style="font-size:10.5px;line-height:1.55;color:#20252C">${esc(value || '—')}</div></div>`

  const html = `<div class="pg">
    ${htmlCabecalho({ titulo:'Ficha de Atendimento TEAcolher', sub:TEIAA_INFO.nome, ref:protocolo })}
    <div style="font-family:Georgia,serif;font-size:28px;color:var(--agendo-dark);margin-bottom:14px;letter-spacing:-.03em">Ficha individual do atendimento</div>
    <div class="info-grid-3">
      ${item('Usuário/família', nomeAtendido)}
      ${item('Profissional', nomeProf)}
      ${item('Data e hora', `${fmtData(a.data_atend)} · ${a.hora_inicio ? String(a.hora_inicio).slice(0,5) : '—'}`)}
      ${item('Área', a.area_atendimento || 'Interdisciplinar')}
      ${item('Modalidade', a.modalidade_atendimento)}
      ${item('Situação/comparecimento', a.comparecimento || a.situacao)}
      ${item('Duração', a.duracao_minutos ? `${a.duracao_minutos} min` : '')}
      ${item('Etapa do fluxo', a.etapa_fluxo || a.tipo_atend)}
      ${item('Desfecho', a.desfecho_teacolher)}
    </div>
    ${bloco('Demanda identificada', a.demanda_identificada)}
    ${bloco('Objetivo do atendimento', a.objetivo_atendimento || a.tema)}
    ${bloco('Registro técnico / evolução', a.registro_tecnico || a.descricao)}
    ${bloco('Orientação à família', a.orientacao_familia)}
    ${bloco('Devolutiva familiar', a.devolutiva_familia)}
    ${bloco('Encaminhamento / rede', [a.tipo_encaminhamento, a.rede_encaminhada, a.encaminhamentos].filter(Boolean).join(' · '))}
    ${bloco('Próxima ação', a.proxima_acao)}
    ${htmlAssinaturas(['Profissional responsável', 'Responsável/família', 'Coordenação'])}
    ${htmlRodape({ protocolo })}
  </div>`
  abrirImpressao(html, 'Ficha de Atendimento TEAcolher', false)
}

// Compatibilidade: nome explícito para relatórios técnicos do TEAcolher
export function gerarPDFRelatorioTecnicoTeacolher(dados = {}, periodoLabel, opts = {}) {
  return gerarPDFAtendimentos(dados, periodoLabel, opts)
}


// =============================================
// DOAÇÕES
// =============================================
export function gerarPDFDoacoes(dados, periodoLabel, opts = {}) {
  const { lista, totalEstimado, porCategoria, porDoador } = dados
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-DO`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const linhas = lista.map(d => `<tr>
    <td style="white-space:nowrap;color:#626B76">${fmtData(d.data_doacao)}</td>
    <td>${d.doador||'—'}</td>
    <td style="font-size:8.5px">${d.categoria||'—'}</td>
    <td style="font-size:8.5px">${d.projeto?.nome||'—'}</td>
    <td style="font-size:8.5px">${d.forma_doacao||'—'}</td>
    <td class="num" style="color:var(--green)">${d.valor_estimado?fmt(d.valor_estimado):'—'}</td>
  </tr>`).join('')

  const linhasCat = Object.entries(porCategoria||{}).sort((a,b)=>b[1]-a[1]).map(([c,v]) =>
    `<tr><td>${c}</td><td class="num">${v}</td><td class="num" style="color:var(--green)">${fmt(v)}</td></tr>`
  ).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ titulo:'Relatório de Doações', sub:`${TEIAA_INFO.nome} · ${periodoLabel||'Período selecionado'}`, ref:protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:14px;letter-spacing:-.02em">Doações Recebidas</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:18px">
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Doações</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${lista.length}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Valor estimado</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--green)">${fmt(totalEstimado)}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Categorias</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${Object.keys(porCategoria||{}).length}</div>
      </div>
      <div style="padding:12px 8px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Doadores</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${Object.keys(porDoador||{}).length}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;margin-bottom:16px">
      <div>
        <div style="font-family:Georgia,serif;font-size:16px;color:var(--agendo-dark);margin-bottom:9px;letter-spacing:-.02em">Por categoria</div>
        <table style="font-size:9px;border-collapse:collapse;width:100%">
          <thead><tr>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px">Categoria</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px;text-align:right">Qtd</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px;text-align:right">Valor</th>
          </tr></thead>
          <tbody>${linhasCat||'<tr><td colspan="3" style="text-align:center;color:#9199A2;padding:8px">—</td></tr>'}</tbody>
        </table>
      </div>
      <div>
        <div style="font-family:Georgia,serif;font-size:16px;color:var(--agendo-dark);margin-bottom:9px;letter-spacing:-.02em">Detalhamento</div>
        <table style="font-size:9px;border-collapse:collapse;width:100%">
          <thead><tr>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Data</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Doador</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Categoria</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Forma</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Valor est.</th>
          </tr></thead>
          <tbody>
            ${linhas||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhuma doação</td></tr>'}
            <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid var(--line)">
              <td colspan="5" style="padding:5px;border-bottom:none">Total estimado</td>
              <td class="num" style="color:var(--green);padding:5px;border-bottom:none">${fmt(totalEstimado)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Relatório de Doações', true)
}


// =============================================
// ANEXO I — FORMULÁRIO DE CADASTRO PROJETO TEACOLHER
// =============================================
export function gerarPDFAnexoTeacolher(usuario = {}, opts = {}) {
  const esc = v => String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  const norm = v => String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  const fmtData = d => {
    if (!d) return ''
    const dt = new Date(String(d).includes('T') ? d : d + 'T12:00:00')
    if (Number.isNaN(dt.getTime())) return esc(d)
    return dt.toLocaleDateString('pt-BR')
  }

  const fmtMoeda = v => {
    if (v === null || v === undefined || v === '') return ''
    const n = Number(v)
    if (Number.isNaN(n)) return esc(v)
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const generoAtual = norm(usuario.genero)
  const defAtual = norm(usuario.tipo_deficiencia)

  const marcadoGenero = label => {
    const alvo = norm(label)
    const aliases = {
      'mulher cis': ['mulher cis', 'feminino cis', 'mulhercis'],
      'mulher trans': ['mulher trans', 'mulhertrans'],
      'homem cis': ['homem cis', 'masculino cis', 'homemcis'],
      'homem trans': ['homem trans', 'homemtrans'],
      'pessoa nao binaria': ['pessoa nao binaria', 'nao binario', 'nao binaria', 'não binária'],
      'prefiro nao informar': ['prefiro nao informar', 'nao informar', 'não informar'],
      'outro': ['outro', 'outra']
    }
    const lista = aliases[alvo] || [alvo]
    return lista.some(item => generoAtual === norm(item)) ? '☑' : '☐'
  }

  const marcadoDef = label => {
    const alvo = norm(label)
    const aliases = {
      'deficiencia fisica': ['deficiencia fisica', 'física', 'fisica'],
      'deficiencia auditiva': ['deficiencia auditiva', 'auditiva'],
      'deficiencia visual': ['deficiencia visual', 'visual'],
      'deficiencia intelectual': ['deficiencia intelectual', 'intelectual'],
      'deficiencia mental psicossocial': ['deficiencia mental psicossocial', 'mental psicossocial', 'psicossocial'],
      'deficiencia multipla': ['deficiencia multipla', 'multipla', 'múltipla']
    }
    const lista = aliases[alvo] || [alvo]
    return lista.some(item => defAtual === norm(item)) ? '☑' : '☐'
  }

  const campo = (label, valor, extra = '') => `
    <div class="campo ${extra}">
      <div class="campo-label">${label}</div>
      <div class="campo-valor">${valor ? esc(valor) : '&nbsp;'}</div>
    </div>`

  const campoHtml = (label, valorHtml, extra = '') => `
    <div class="campo ${extra}">
      <div class="campo-label">${label}</div>
      <div class="campo-valor">${valorHtml || '&nbsp;'}</div>
    </div>`

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const protocolo = `AG-TEIAA-${ano}-TEACOLHER`

  const generoOutro = usuario.genero_outro || (generoAtual === 'outro' ? usuario.genero : '')
  const cidade = usuario.cidade || 'Teresópolis'

  const css = `
    .anexo-titulo {
      text-align:center;
      margin: 10px 0 14px;
      padding: 10px;
      border: 1px solid var(--line);
      background: var(--agendo-soft);
    }
    .anexo-titulo h1 {
      font-size: 14px;
      letter-spacing: .08em;
      color: var(--agendo-dark);
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .anexo-titulo div { font-size: 10px; color: var(--muted); }
    .bloco {
      border: 1px solid var(--line);
      border-radius: 4px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .bloco h2 {
      background: var(--agendo-dark);
      color: #fff;
      font-size: 10px;
      letter-spacing: .08em;
      text-transform: uppercase;
      padding: 7px 9px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border-top: 1px solid var(--line-soft);
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0;
      border-top: 1px solid var(--line-soft);
    }
    .campo {
      min-height: 38px;
      padding: 7px 8px;
      border-right: 1px solid var(--line-soft);
      border-bottom: 1px solid var(--line-soft);
    }
    .campo:nth-child(2n) { border-right: none; }
    .form-grid-3 .campo:nth-child(2n) { border-right: 1px solid var(--line-soft); }
    .form-grid-3 .campo:nth-child(3n) { border-right: none; }
    .campo.full {
      grid-column: 1 / -1;
      border-right: none;
    }
    .campo-label {
      color: #6B7280;
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 3px;
      font-weight: 700;
    }
    .campo-valor {
      color: #20252C;
      font-size: 10.5px;
      line-height: 1.35;
      min-height: 13px;
    }
    .check-wrap {
      padding: 8px 9px 9px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 18px;
      font-size: 10px;
      line-height: 1.35;
    }
    .check-item { white-space: nowrap; }
    .declaracao {
      padding: 10px 12px;
      font-size: 10.5px;
      line-height: 1.65;
      color: #20252C;
      text-align: justify;
    }
    .linha-data {
      margin-top: 14px;
      font-size: 10.5px;
      text-align: center;
    }
    .linha-assinatura {
      margin: 30px auto 4px;
      width: 78%;
      border-bottom: 1px solid #20252C;
      height: 28px;
    }
    .assinatura-label {
      text-align: center;
      font-size: 9px;
      color: var(--muted);
    }
    .obs {
      padding: 7px 9px;
      background: #F8F7F2;
      color: #626B76;
      font-size: 8.5px;
      border-top: 1px solid var(--line-soft);
    }
  `

  const html = `
  <div class="pg">
    ${htmlCabecalho({ tipo: 'full' })}

    <div class="anexo-titulo">
      <h1>Anexo I — Modelo de Formulário de Cadastro</h1>
      <div>Projeto TEAcolher · Cadastro de participante / responsável legal</div>
    </div>

    <div class="bloco">
      <h2>1. Dados pessoais</h2>
      <div class="form-grid">
        ${campo('Nome completo', usuario.nome)}
        ${campoHtml('Data de nascimento', esc(fmtData(usuario.data_nascimento)))}
      </div>
      <div class="form-grid-3">
        ${campo('Tipo sanguíneo', usuario.tipo_sanguineo)}
        ${campo('CPF', usuario.cpf)}
        ${campo('RG', usuario.rg)}
      </div>
      <div class="form-grid">
        ${campo('Endereço', usuario.endereco)}
        ${campo('Bairro', usuario.bairro)}
        ${campo('Cidade', cidade)}
        ${campo('Telefone/WhatsApp', usuario.telefone)}
        ${campo('E-mail', usuario.email, 'full')}
      </div>

      <div class="campo full" style="border-right:none">
        <div class="campo-label">Gênero</div>
        <div class="check-wrap">
          <div class="check-item">${marcadoGenero('Mulher cis')} Mulher cis</div>
          <div class="check-item">${marcadoGenero('Mulher trans')} Mulher trans</div>
          <div class="check-item">${marcadoGenero('Homem cis')} Homem cis</div>
          <div class="check-item">${marcadoGenero('Homem trans')} Homem trans</div>
          <div class="check-item">${marcadoGenero('Pessoa não binária')} Pessoa não binária</div>
          <div class="check-item">${marcadoGenero('Prefiro não informar')} Prefiro não informar</div>
          <div class="check-item" style="grid-column:1 / -1">${marcadoGenero('Outro')} Outro: ${esc(generoOutro || '____________________________')}</div>
        </div>
      </div>

      <div class="campo full" style="border-right:none">
        <div class="campo-label">Tipo de deficiência</div>
        <div class="check-wrap">
          <div class="check-item">${marcadoDef('Deficiência Física')} Deficiência Física</div>
          <div class="check-item">${marcadoDef('Deficiência Auditiva')} Deficiência Auditiva</div>
          <div class="check-item">${marcadoDef('Deficiência Visual')} Deficiência Visual</div>
          <div class="check-item">${marcadoDef('Deficiência Intelectual')} Deficiência Intelectual</div>
          <div class="check-item">${marcadoDef('Deficiência Mental/Psicossocial')} Deficiência Mental/Psicossocial</div>
          <div class="check-item">${marcadoDef('Deficiência Múltipla')} Deficiência Múltipla</div>
        </div>
      </div>

      <div class="form-grid">
        ${campo('Forneça aqui detalhes sobre a deficiência', usuario.deficiencia_detalhes, 'full')}
      </div>
    </div>

    <div class="bloco">
      <h2>2. Informações complementares</h2>
      <div class="form-grid">
        ${campo('Nome de contato de familiar ou cuidador', usuario.contato_familiar_nome)}
        ${campo('Relação com o participante (parentesco)', usuario.contato_familiar_parentesco)}
        ${campo('Telefone de contato do familiar/cuidador', usuario.contato_familiar_telefone)}
        ${campoHtml('Renda familiar bruta', esc(fmtMoeda(usuario.renda_familiar_bruta)))}
        ${campo('Número de pessoas que residem no núcleo familiar', usuario.pessoas_nucleo_familiar, 'full')}
      </div>
    </div>

    <div class="bloco">
      <h2>3. Declaração</h2>
      <div class="declaracao">
        Declaro, sob pena do artigo 299 do Código Penal Brasileiro, que as informações prestadas são verdadeiras e que resido oficialmente no município indicado. Autorizo o uso dos dados fornecidos para fins de seleção e acompanhamento no âmbito do Projeto TEAcolher.

        <div class="linha-data">
          ${esc(cidade || '______________________')}, _____ de __________________________ de ____________.
        </div>

        <div class="linha-assinatura"></div>
        <div class="assinatura-label">Assinatura do participante ou responsável legal</div>
      </div>
    </div>

    <div class="obs">
      Documento gerado pelo AGENDO Integra para apoio ao cadastro e acompanhamento do Projeto TEAcolher. Protocolo: ${protocolo}.
    </div>

    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(`<style>${css}</style>${html}`, 'Anexo I — Projeto TEAcolher')
}


// Agenda técnica individual do TEAcolher: diária, semanal ou mensal.
// Usada pelo perfil técnico para imprimir somente os próprios atendimentos.
export function gerarPDFAgendaTecnicoTeacolher(lista = [], opts = {}) {
  const profissional = opts.profissionalNome || 'Profissional técnico'
  const funcao = opts.funcao ? ` · ${opts.funcao}` : ''
  const periodo = opts.periodoLabel || 'Período selecionado'
  const titulo = opts.titulo || 'Minha agenda técnica TEAcolher'
  const subtitulo = `Profissional: ${profissional}${funcao} · ${periodo}`

  return gerarPDFAgendaTeacolher(lista, titulo, {
    ...opts,
    subtitulo,
    periodoLabel: periodo,
    protocolo: opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-AGENDA-TEC`,
  })
}
