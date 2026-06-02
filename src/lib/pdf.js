// Gerador de PDF usando window.print() com CSS otimizado
// Funciona em todos os browsers sem dependências externas

export function gerarPDFRelatorio(dados, filtros) {
  const { totalEnt, totalSai, resultado, grupoEnt, grupoSai } = dados
  const fmt = v => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const titulo = filtros.periodo === 'mes'
    ? 'Relatório — ' + new Date(filtros.mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
    : 'Relatório anual — ' + filtros.ano

  const linhasEnt = Object.entries(grupoEnt).sort((a,b)=>b[1].total-a[1].total).map(([cat,info]) => {
    const total = Object.values(grupoEnt).reduce((a,v)=>a+v.total,0)
    const pct = total > 0 ? Math.round(info.total/total*100) : 0
    return `<tr><td>${cat}</td><td>${info.qtd}</td><td style="color:#3B6D11;font-weight:600">${fmt(info.total)}</td><td>${pct}%</td></tr>`
  }).join('')

  const linhasSai = Object.entries(grupoSai).sort((a,b)=>b[1].total-a[1].total).map(([cat,info]) => {
    const total = Object.values(grupoSai).reduce((a,v)=>a+v.total,0)
    const pct = total > 0 ? Math.round(info.total/total*100) : 0
    return `<tr><td>${cat}</td><td>${info.qtd}</td><td style="color:#A32D2D;font-weight:600">${fmt(info.total)}</td><td>${pct}%</td></tr>`
  }).join('')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo} — Capette</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #2C2C2A; padding: 30px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #2C2C2A; }
  .logo { display: flex; gap: 2px; }
  .logo span { font-size: 20px; font-weight: 700; }
  .header-info { text-align: right; font-size: 11px; color: #5F5E5A; }
  .titulo { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
  .metricas { display: flex; gap: 16px; margin-bottom: 24px; }
  .metrica { flex: 1; border: 1px solid #E0DDD5; border-radius: 8px; padding: 12px; }
  .metrica-label { font-size: 10px; color: #888780; margin-bottom: 4px; }
  .metrica-valor { font-size: 16px; font-weight: 700; }
  .metrica-sub { font-size: 10px; color: #888780; margin-top: 2px; }
  .secao { margin-bottom: 24px; }
  .secao-titulo { font-size: 13px; font-weight: 700; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #E0DDD5; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 6px 8px; background: #F8F7F2; font-size: 10px; color: #888780; border-bottom: 1px solid #E0DDD5; }
  td { padding: 6px 8px; border-bottom: 1px solid #F1EFE8; }
  .rodape { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E0DDD5; font-size: 10px; color: #888780; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">
      <span style="color:#F5C800">C</span><span style="color:#F4821F">A</span><span style="color:#8B2FC9">P</span><span style="color:#E8212A">E</span><span style="color:#6BBF2B">T</span><span style="color:#4A8FD4">T</span><span style="color:#E8207A">E</span>
    </div>
    <div style="font-size:10px;color:#888780;margin-top:2px">Casa do Pequeno Trabalhador de Teresópolis · Desde 1974</div>
  </div>
  <div class="header-info">
    <div style="font-weight:700">${titulo}</div>
    <div>Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
    <div>Conta: ${filtros.contaNome || 'Todas as contas'}</div>
  </div>
</div>

<div class="titulo">${titulo}</div>

<div class="metricas">
  <div class="metrica">
    <div class="metrica-label">Total entradas</div>
    <div class="metrica-valor" style="color:#3B6D11">${fmt(totalEnt)}</div>
    <div class="metrica-sub">${Object.values(grupoEnt).reduce((a,v)=>a+v.qtd,0)} recebimentos</div>
  </div>
  <div class="metrica">
    <div class="metrica-label">Total gastos</div>
    <div class="metrica-valor" style="color:#A32D2D">${fmt(totalSai)}</div>
    <div class="metrica-sub">${Object.values(grupoSai).reduce((a,v)=>a+v.qtd,0)} pagamentos</div>
  </div>
  <div class="metrica">
    <div class="metrica-label">Resultado</div>
    <div class="metrica-valor" style="color:${resultado>=0?'#3B6D11':'#A32D2D'}">${resultado>=0?'+':''}${fmt(resultado)}</div>
    <div class="metrica-sub">${resultado>=0?'Superávit':'Déficit'}</div>
  </div>
</div>

<div class="secao">
  <div class="secao-titulo" style="color:#3B6D11">Entradas por categoria</div>
  <table>
    <thead><tr><th>Categoria</th><th>Qtd</th><th>Total</th><th>%</th></tr></thead>
    <tbody>${linhasEnt || '<tr><td colspan="4" style="color:#888780;text-align:center">Sem dados</td></tr>'}</tbody>
  </table>
</div>

<div class="secao">
  <div class="secao-titulo" style="color:#A32D2D">Gastos por categoria</div>
  <table>
    <thead><tr><th>Categoria</th><th>Qtd</th><th>Total</th><th>%</th></tr></thead>
    <tbody>${linhasSai || '<tr><td colspan="4" style="color:#888780;text-align:center">Sem dados</td></tr>'}</tbody>
  </table>
</div>

<div class="rodape">
  FinOSC · Sistema Financeiro Capette · Documento gerado automaticamente · ${new Date().toLocaleDateString('pt-BR')}
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}

export function gerarPDFTransparencia(dados, mes) {
  const { totalEnt, totalSai, grupoEnt, grupoSai } = dados
  const fmt = v => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
  const mesLabel = new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

  const linhasEnt = Object.entries(grupoEnt).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
    const total = Object.values(grupoEnt).reduce((a,v)=>a+v,0)
    const pct = total > 0 ? Math.round(val/total*100) : 0
    return `<tr><td>${cat}</td><td style="color:#3B6D11;font-weight:600">${fmt(val)}</td><td>${pct}%</td></tr>`
  }).join('')

  const linhasSai = Object.entries(grupoSai).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
    const total = Object.values(grupoSai).reduce((a,v)=>a+v,0)
    const pct = total > 0 ? Math.round(val/total*100) : 0
    return `<tr><td>${cat}</td><td style="color:#A32D2D;font-weight:600">${fmt(val)}</td><td>${pct}%</td></tr>`
  }).join('')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Transparência Financeira — Capette — ${mesLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #2C2C2A; padding: 30px; }
  .header { background: #2C2C2A; color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
  .logo { display: flex; gap: 2px; margin-bottom: 4px; }
  .logo span { font-size: 20px; font-weight: 700; }
  .sub { font-size: 10px; opacity: .6; margin-bottom: 12px; }
  .titulo-pub { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .metricas { display: flex; gap: 12px; margin-top: 16px; }
  .metrica { flex: 1; background: rgba(255,255,255,.1); border-radius: 6px; padding: 10px; }
  .metrica-label { font-size: 10px; opacity: .7; margin-bottom: 3px; }
  .metrica-valor { font-size: 15px; font-weight: 700; }
  .secao { margin-bottom: 20px; }
  .secao-titulo { font-size: 13px; font-weight: 700; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #E0DDD5; display: flex; align-items: center; gap: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 6px 8px; background: #F8F7F2; font-size: 10px; color: #888780; border-bottom: 1px solid #E0DDD5; }
  td { padding: 6px 8px; border-bottom: 1px solid #F1EFE8; }
  .nota { margin-top: 24px; padding: 12px; background: #F8F7F2; border-radius: 6px; font-size: 10px; color: #888780; line-height: 1.6; }
  .rodape { margin-top: 16px; font-size: 10px; color: #888780; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <span style="color:#F5C800">C</span><span style="color:#F4821F">A</span><span style="color:#8B2FC9">P</span><span style="color:#E8212A">E</span><span style="color:#6BBF2B">T</span><span style="color:#4A8FD4">T</span><span style="color:#E8207A">E</span>
  </div>
  <div class="sub">Casa do Pequeno Trabalhador de Teresópolis · Desde 1974</div>
  <div class="titulo-pub">Transparência financeira — ${mesLabel}</div>
  <div style="font-size:11px;opacity:.7">Prestação de contas à sociedade</div>
  <div class="metricas">
    <div class="metrica"><div class="metrica-label">Entrou em ${mesLabel}</div><div class="metrica-valor" style="color:#9FE1CB">${fmt(totalEnt)}</div></div>
    <div class="metrica"><div class="metrica-label">Foi gasto</div><div class="metrica-valor" style="color:#F09595">${fmt(totalSai)}</div></div>
    <div class="metrica"><div class="metrica-label">Resultado</div><div class="metrica-valor">${fmt(totalEnt-totalSai)}</div></div>
  </div>
</div>

<div class="secao">
  <div class="secao-titulo" style="color:#3B6D11">● De onde veio o dinheiro</div>
  <table>
    <thead><tr><th>Categoria</th><th>Total</th><th>%</th></tr></thead>
    <tbody>${linhasEnt || '<tr><td colspan="3" style="color:#888780;text-align:center">Sem dados</td></tr>'}</tbody>
  </table>
</div>

<div class="secao">
  <div class="secao-titulo" style="color:#A32D2D">● Como foi gasto</div>
  <table>
    <thead><tr><th>Categoria</th><th>Total</th><th>%</th></tr></thead>
    <tbody>${linhasSai || '<tr><td colspan="3" style="color:#888780;text-align:center">Sem dados</td></tr>'}</tbody>
  </table>
</div>

<div class="nota">
  <strong>Nota de transparência:</strong> Esta página apresenta um resumo das movimentações financeiras da Casa do Pequeno Trabalhador de Teresópolis — Capette, atualizado mensalmente após a conciliação bancária. Para informações detalhadas, entre em contato com a administração. CNPJ: 00.000.000/0001-00 · Teresópolis-RJ.
</div>

<div class="rodape">
  Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}
