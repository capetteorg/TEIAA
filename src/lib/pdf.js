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
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
  
  /* Cabeçalho */
  .cabecalho { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #2C2C2A; }
  .cab-esq { display: flex; flex-direction: column; gap: 2px; }
  .cab-logo { display: flex; gap: 1px; align-items: center; margin-bottom: 2px; }
  .cab-logo span { font-size: 20px; font-weight: 900; line-height: 1; }
  .cab-desde { font-size: 9px; color: #888; }
  .cab-dir { text-align: right; font-size: 10px; color: #444; }
  .cab-dir strong { font-size: 12px; color: #1a1a1a; display: block; margin-bottom: 2px; }
  .cab-dir .cnpj { font-size: 11px; color: #1a1a1a; margin-bottom: 4px; }
  .cab-registros { font-size: 8px; color: #888; line-height: 1.4; text-align: right; }

  /* Título */
  .titulo-bloco { text-align: center; margin-bottom: 14px; }
  .titulo-principal { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; }
  .titulo-sub { font-size: 11px; color: #444; margin-top: 2px; }
  .titulo-status { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; margin-top: 4px; }
  .status-preliminar { background: #FAEEDA; color: #854F0B; }
  .status-final { background: #EAF3DE; color: #3B6D11; }
  .status-pendencias { background: #FEF2F2; color: #A32D2D; }

  /* Info do relatório */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; font-size: 10px; }
  .info-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; font-size: 10px; }
  .info-item { background: #F8F7F2; border-radius: 4px; padding: 5px 8px; }
  .info-label { color: #888; font-size: 9px; margin-bottom: 1px; }
  .info-valor { font-weight: 600; color: #1a1a1a; }

  /* Resumo financeiro */
  .resumo-box { border: 1px solid #E0DDD5; border-radius: 6px; padding: 10px; margin-bottom: 14px; }
  .resumo-titulo { font-size: 11px; font-weight: 700; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #E0DDD5; }
  .resumo-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
  .resumo-item { text-align: center; }
  .resumo-label { font-size: 9px; color: #888; margin-bottom: 2px; }
  .resumo-valor { font-size: 13px; font-weight: 700; }
  .verde { color: #3B6D11; }
  .vermelho { color: #A32D2D; }
  .azul { color: #185FA5; }

  /* Seção */
  .secao { margin-bottom: 16px; }
  .secao-titulo { font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; padding: 4px 8px; background: #F8F7F2; border-left: 3px solid #2C2C2A; letter-spacing: .3px; }

  /* Tabelas */
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px; }
  thead { background: #2C2C2A; color: #fff; }
  th { padding: 5px 6px; text-align: left; font-size: 9px; font-weight: 600; letter-spacing: .2px; }
  td { padding: 4px 6px; border-bottom: 0.5px solid #E0DDD5; vertical-align: top; }
  tr:nth-child(even) { background: #FAFAF8; }
  .total-row { background: #F1EFE8 !important; font-weight: 700; }
  .total-row td { border-top: 1px solid #D3D1C7; }
  .num { text-align: right; }
  .center { text-align: center; }

  /* Alertas */
  .alerta { padding: 8px 10px; border-radius: 4px; margin-bottom: 10px; font-size: 10px; }
  .alerta-critico { background: #FEF2F2; border-left: 3px solid #E8212A; color: #A32D2D; }
  .alerta-aviso { background: #FAEEDA; border-left: 3px solid #F4821F; color: #854F0B; }
  .alerta-ok { background: #EAF3DE; border-left: 3px solid #6BBF2B; color: #3B6D11; }

  /* Assinaturas */
  .assinaturas { margin-top: 24px; padding-top: 12px; border-top: 1px solid #E0DDD5; }
  .assin-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 12px; }
  .assin-item { text-align: center; }
  .assin-linha { border-bottom: 1px solid #1a1a1a; margin-bottom: 4px; height: 30px; }
  .assin-label { font-size: 9px; color: #444; }
  .assin-cargo { font-size: 9px; color: #888; }

  /* Rodapé */
  .rodape { margin-top: 16px; padding-top: 8px; border-top: 1px solid #E0DDD5; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #888; }
  .rodape-sistema { font-size: 8px; color: #aaa; }

  /* Paisagem */
  @page { margin: 15mm; }
  @media print { body { padding: 0; } .no-print { display: none; } }
`

// Gera o HTML do cabeçalho
function htmlCabecalho() {
  return `
  <div class="cabecalho">
    <div class="cab-esq">
      <div class="cab-logo">
        <span style="color:#F5C800">C</span><span style="color:#F4821F">A</span><span style="color:#8B2FC9">P</span><span style="color:#E8212A">E</span><span style="color:#6BBF2B">T</span><span style="color:#4A8FD4">T</span><span style="color:#E8207A">E</span>
      </div>
      <div class="cab-desde">Desde 1974</div>
    </div>
    <div class="cab-dir">
      <strong>${CAPETTE_INFO.nome}</strong>
      <div class="cnpj">CNPJ: ${CAPETTE_INFO.cnpj}</div>
      <div class="cab-registros">${CAPETTE_INFO.registros.join('<br>')}</div>
    </div>
  </div>`
}

// Gera o HTML do rodapé
function htmlRodape() {
  return `
  <div class="rodape">
    <div>${CAPETTE_INFO.endereco} · WhatsApp: ${CAPETTE_INFO.whatsapp} · ${CAPETTE_INFO.email} · @${CAPETTE_INFO.instagram}</div>
    <div class="rodape-sistema">FinOSC Capette · Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
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
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo} — Capette</title>
<style>
${CSS_BASE}
${paisagem ? '@page { size: A4 landscape; margin: 10mm; }' : ''}
</style>
</head>
<body>${html}</body>
</html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 600)
}

// =============================================
// RELATÓRIO FINANCEIRO GERAL
// =============================================
export function gerarPDFRelatorio(dados, filtros) {
  const { totalEnt, totalSai, resultado, grupoEnt, grupoSai, totalMovs } = dados
  const titulo = filtros.periodo === 'mes'
    ? new Date(filtros.mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
    : filtros.ano

  const linhasEnt = Object.entries(grupoEnt).sort((a,b)=>b[1].total-a[1].total).map(([cat,info],i) => {
    const total = Object.values(grupoEnt).reduce((a,v)=>a+v.total,0)
    return `<tr>
      <td>${cat}</td>
      <td class="center">${info.qtd}</td>
      <td class="num verde">${fmt(info.total)}</td>
      <td class="num">${total>0?Math.round(info.total/total*100):0}%</td>
    </tr>`
  }).join('')

  const linhasSai = Object.entries(grupoSai).sort((a,b)=>b[1].total-a[1].total).map(([cat,info]) => {
    const total = Object.values(grupoSai).reduce((a,v)=>a+v.total,0)
    return `<tr>
      <td>${cat}</td>
      <td class="center">${info.qtd}</td>
      <td class="num vermelho">${fmt(info.total)}</td>
      <td class="num">${total>0?Math.round(info.total/total*100):0}%</td>
    </tr>`
  }).join('')

  const html = `
  ${htmlCabecalho()}
  <div class="titulo-bloco">
    <div class="titulo-principal">Relatório Financeiro Geral</div>
    <div class="titulo-sub">Período: ${titulo} · Conta: ${filtros.contaNome || 'Todas as contas'}</div>
  </div>

  <div class="resumo-box">
    <div class="resumo-titulo">Resumo Financeiro</div>
    <div class="resumo-grid">
      <div class="resumo-item"><div class="resumo-label">Total Entradas</div><div class="resumo-valor verde">${fmt(totalEnt)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Total Gastos</div><div class="resumo-valor vermelho">${fmt(totalSai)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Resultado</div><div class="resumo-valor ${resultado>=0?'verde':'vermelho'}">${resultado>=0?'+':''}${fmt(resultado)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Movimentações</div><div class="resumo-valor azul">${totalMovs}</div></div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">Entradas por Categoria</div>
    <table>
      <thead><tr><th>Categoria</th><th class="center">Qtd</th><th class="num">Total</th><th class="num">%</th></tr></thead>
      <tbody>
        ${linhasEnt || '<tr><td colspan="4" style="text-align:center;color:#888">Sem dados</td></tr>'}
        <tr class="total-row"><td><strong>TOTAL DE ENTRADAS</strong></td><td></td><td class="num verde"><strong>${fmt(totalEnt)}</strong></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">Gastos por Categoria</div>
    <table>
      <thead><tr><th>Categoria</th><th class="center">Qtd</th><th class="num">Total</th><th class="num">%</th></tr></thead>
      <tbody>
        ${linhasSai || '<tr><td colspan="4" style="text-align:center;color:#888">Sem dados</td></tr>'}
        <tr class="total-row"><td><strong>TOTAL DE GASTOS</strong></td><td></td><td class="num vermelho"><strong>${fmt(totalSai)}</strong></td><td></td></tr>
      </tbody>
    </table>
  </div>

  ${htmlRodape()}`

  abrirImpressao(html, 'Relatório Financeiro Geral')
}

// =============================================
// RELATÓRIO DE TRANSPARÊNCIA PÚBLICA
// =============================================
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
  ${htmlCabecalho()}
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

  ${htmlRodape()}`

  abrirImpressao(html, 'Transparência Financeira')
}

// =============================================
// RELATÓRIO DE EVENTO
// =============================================
export function gerarPDFEvento(evento, entradas, saidas) {
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
  ${htmlCabecalho()}
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

  ${htmlAssinaturas(['Responsável pelo Evento', 'Responsável Financeiro', 'Diretoria'])}
  ${htmlRodape()}`

  abrirImpressao(html, `Evento — ${evento.nome}`)
}

// =============================================
// RELATÓRIO DE CAMPANHA
// =============================================
export function gerarPDFCampanha(campanha, entradas, saidas) {
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
  ${htmlCabecalho()}
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

  ${htmlAssinaturas(['Responsável pela Campanha', 'Responsável Financeiro', 'Diretoria'])}
  ${htmlRodape()}`

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
  ${htmlCabecalho()}
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

  ${htmlRodape()}`

  abrirImpressao(html, 'Relatório de Cobranças', true)
}
