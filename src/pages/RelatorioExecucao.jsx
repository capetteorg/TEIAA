import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

const STATUS_META_COR = {
  'não iniciada': ['#F1EFE8','#888780'],
  'em andamento': ['#E6F1FB','#185FA5'],
  'alcançada': ['#EAF3DE','#3B6D11'],
  'parcialmente alcançada': ['#FAEEDA','#854F0B'],
  'não alcançada': ['#FCEBEB','#A32D2D'],
  'outro': ['#EEEDFE','#534AB7'],
}

export default function RelatorioExecucao() {
  const [planos, setPlanos] = useState([])
  const [projetos, setProjetos] = useState([])
  const [planoSel, setPlanoSel] = useState('')
  const [projetoSel, setProjetoSel] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [instituicao, setInstituicao] = useState(null)

  useEffect(() => {
    supabase.from('planos').select('*, parceria:parcerias(nome_projeto), projeto:projetos(nome)').order('nome_plano').then(({ data }) => setPlanos(data || []))
    supabase.from('projetos').select('id,nome').order('nome').then(({ data }) => setProjetos(data || []))
    supabase.from('instituicao').select('*').limit(1).single().then(({ data }) => setInstituicao(data))
  }, [])

  async function gerar() {
    if (!planoSel && !projetoSel) return
    setLoading(true)
    setDados(null)

    const plano = planos.find(p => String(p.id) === planoSel)
    const projeto = projetos.find(p => String(p.id) === (planoSel ? String(plano?.projeto_id) : projetoSel))

    // Metas do plano
    let metas = []
    if (planoSel) {
      const { data } = await supabase.from('metas_plano').select('*').eq('plano_id', parseInt(planoSel)).order('id')
      metas = data || []
    }

    // Atividades previstas
    let ativsPrevistas = []
    if (planoSel) {
      const { data } = await supabase.from('atividades_previstas').select('*').eq('plano_id', parseInt(planoSel)).order('id')
      ativsPrevistas = data || []
    }

    // Projeto ID para buscar execução
    const projetoId = planoSel ? plano?.projeto_id : parseInt(projetoSel)

    // Atendimentos realizados
    let atendimentos = []
    if (projetoId) {
      let q = supabase.from('atendimentos')
        .select('*, profissional:equipe(nome,funcao)')
        .eq('projeto_id', projetoId)
        .order('data_atend')
      if (dataInicio) q = q.gte('data_atend', dataInicio)
      if (dataFim) q = q.lte('data_atend', dataFim)
      const { data } = await q
      atendimentos = data || []
    }

    // Equipe vinculada ao projeto
    let equipe = []
    if (projetoId) {
      const { data } = await supabase.from('equipe')
        .select('nome,funcao,tipo_vinculo,situacao')
        .contains('projetos', [projeto?.nome || ''])
        .eq('situacao', 'ativo')
        .order('nome')
      equipe = data || []
    }

    // Usuários ativos
    let usuarios = []
    if (projetoId) {
      let q = supabase.from('usuarios_atendidos').select('*').eq('projeto_id', projetoId)
      if (dataInicio) q = q.gte('data_ingresso', dataInicio)
      const { data } = await q
      usuarios = data || []
    }

    // Financeiro da conta vinculada
    let financeiroResumo = null
    if (plano?.parceria?.conta_id || planoSel) {
      const { data: parceria } = plano?.parceria_id ?
        await supabase.from('parcerias').select('*, conta:contas(id,nome)').eq('id', plano.parceria_id).single() :
        { data: null }

      if (parceria?.conta_id) {
        const { data: extratos } = await supabase.from('extratos').select('id').eq('conta_id', parceria.conta_id)
        if (extratos?.length) {
          const ids = extratos.map(e => e.id)
          let qMovs = supabase.from('extrato_movs').select('valor').in('extrato_id', ids)
          if (dataInicio) qMovs = qMovs.gte('data', dataInicio)
          if (dataFim) qMovs = qMovs.lte('data', dataFim)
          const { data: movs } = await qMovs
          const lista = movs || []
          const ent = lista.filter(m => Number(m.valor) > 0).reduce((a,m) => a+Number(m.valor), 0)
          const sai = Math.abs(lista.filter(m => Number(m.valor) < 0).reduce((a,m) => a+Number(m.valor), 0))
          financeiroResumo = { entradas: ent, saidas: sai, saldo: ent - sai, conta: parceria.conta?.nome }
        }
      }
    }

    // Estatísticas de atendimentos
    const totalParticipantes = atendimentos.reduce((a,m) => a + (Number(m.qtd_participantes)||0), 0)
    const porTipo = {}
    atendimentos.forEach(a => { porTipo[a.tipo_atend] = (porTipo[a.tipo_atend]||0) + 1 })

    // Faixa etária dos usuários
    const hoje = new Date()
    const faixas = { '0-5': 0, '6-11': 0, '12-17': 0, '18-29': 0, '30-59': 0, '60+': 0 }
    const users_com_nasc = usuarios.filter(u => u.data_nascimento)
    users_com_nasc.forEach(u => {
      const nasc = new Date(u.data_nascimento+'T12:00:00')
      let idade = hoje.getFullYear() - nasc.getFullYear()
      if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade--
      if (idade <= 5) faixas['0-5']++
      else if (idade <= 11) faixas['6-11']++
      else if (idade <= 17) faixas['12-17']++
      else if (idade <= 29) faixas['18-29']++
      else if (idade <= 59) faixas['30-59']++
      else faixas['60+']++
    })

    setDados({ plano, projeto, metas, ativsPrevistas, atendimentos, equipe, usuarios, financeiroResumo, totalParticipantes, porTipo, faixas, users_com_nasc: users_com_nasc.length })
    setLoading(false)
  }

  function gerarPDF() {
    if (!dados) return
    const { plano, projeto, metas, ativsPrevistas, atendimentos, equipe, usuarios, financeiroResumo, totalParticipantes, porTipo, faixas } = dados

    const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
    const pct = (r,p) => p > 0 ? Math.round(r/p*100) : 0

    const linhasMetas = metas.map(m => {
      const p = pct(Number(m.quantidade_realizada||0), Number(m.quantidade_prevista||0))
      return `<tr>
        <td>${m.descricao_meta}</td>
        <td>${m.indicador||'—'}</td>
        <td class="num">${m.quantidade_prevista||'—'} ${m.unidade_medida}</td>
        <td class="num" style="color:#6BBF2B;font-weight:600">${m.quantidade_realizada||'—'}</td>
        <td class="center"><div style="display:flex;align-items:center;gap:6px;justify-content:center">
          <div style="width:50px;height:6px;background:#F1EFE8;border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${Math.min(p,100)}%;background:${p>=100?'#6BBF2B':p>=50?'#F4821F':'#E8212A'};border-radius:99px"></div>
          </div>
          <span style="font-weight:600">${p}%</span>
        </div></td>
        <td class="center"><span style="padding:2px 7px;border-radius:99px;font-size:9px;background:${m.status_meta==='alcançada'?'#EAF3DE':m.status_meta==='não iniciada'?'#F1EFE8':'#FAEEDA'};color:${m.status_meta==='alcançada'?'#3B6D11':m.status_meta==='não iniciada'?'#888780':'#854F0B'}">${m.status_meta}</span></td>
        <td>${m.justificativa||'—'}</td>
      </tr>`
    }).join('')

    const linhasAtivsPrev = ativsPrevistas.map(a => `<tr>
      <td>${a.nome_atividade}</td>
      <td>${a.descricao||'—'}</td>
      <td class="center">${a.periodo_inicio ? `${fmtData(a.periodo_inicio)} a ${fmtData(a.periodo_fim)}` : '—'}</td>
      <td>${a.responsavel_equipe||'—'}</td>
      <td class="center"><span style="padding:2px 7px;border-radius:99px;font-size:9px;background:${a.status==='realizada'?'#EAF3DE':a.status==='cancelada'?'#FCEBEB':'#E6F1FB'};color:${a.status==='realizada'?'#3B6D11':a.status==='cancelada'?'#A32D2D':'#185FA5'}">${a.status}</span></td>
    </tr>`).join('')

    const linhasAtends = atendimentos.slice(0,100).map(a => `<tr>
      <td>${fmtData(a.data_atend)}</td>
      <td>${a.tipo_atend}</td>
      <td>${a.tema||'—'}</td>
      <td class="num center">${a.qtd_participantes||'—'}</td>
      <td>${(a.publico_participante||[]).join(', ')||'—'}</td>
      <td>${a.profissional?.nome?.split(' ').slice(0,2).join(' ')||'—'}</td>
    </tr>`).join('')

    const linhasEquipe = equipe.map(e => `<tr>
      <td style="font-weight:500">${e.nome}</td>
      <td>${e.funcao}</td>
      <td>${e.tipo_vinculo}</td>
    </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #2C2C2A; padding: 20px; }
  .cabecalho { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6BBF2B; padding-bottom: 10px; margin-bottom: 14px; }
  .cab-logo { font-size: 18px; font-weight: bold; color: #2C2C2A; }
  .cab-info { text-align: right; font-size: 9px; color: #888780; }
  .titulo-bloco { text-align: center; margin-bottom: 14px; padding: 10px; background: #F8F7F2; border-radius: 6px; }
  .titulo-principal { font-size: 15px; font-weight: bold; color: #2C2C2A; }
  .titulo-sub { font-size: 11px; color: #5F5E5A; margin-top: 3px; }
  .info-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-bottom: 12px; }
  .info-item { background: #F8F7F2; border-radius: 4px; padding: 6px 8px; }
  .info-label { font-size: 9px; color: #888780; margin-bottom: 2px; }
  .info-valor { font-weight: 500; }
  .secao { margin-bottom: 14px; }
  .secao-titulo { font-size: 12px; font-weight: bold; color: #2C2C2A; border-left: 3px solid #6BBF2B; padding-left: 8px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
  th { background: #F8F7F2; padding: 5px 7px; text-align: left; font-weight: 600; border-bottom: 1px solid #E0DDD5; color: #5F5E5A; }
  td { padding: 5px 7px; border-bottom: 0.5px solid #E0DDD5; vertical-align: middle; }
  tr:nth-child(even) { background: #FAFAF8; }
  .num { text-align: right; }
  .center { text-align: center; }
  .resumo-box { background: #EAF3DE; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; }
  .resumo-titulo { font-size: 11px; font-weight: bold; color: #3B6D11; margin-bottom: 8px; }
  .resumo-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
  .resumo-item { background: #fff; border-radius: 4px; padding: 6px 8px; }
  .resumo-label { font-size: 9px; color: #888780; margin-bottom: 2px; }
  .resumo-valor { font-size: 14px; font-weight: bold; }
  .verde { color: #6BBF2B; }
  .vermelho { color: #E8212A; }
  .azul { color: #4A8FD4; }
  .assinaturas { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 30px; }
  .assinatura { text-align: center; }
  .assinatura-linha { border-top: 1px solid #2C2C2A; padding-top: 5px; font-size: 9px; color: #5F5E5A; }
  .rodape { margin-top: 20px; padding-top: 8px; border-top: 1px solid #E0DDD5; font-size: 9px; color: #B4B2A9; text-align: center; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
<div class="cabecalho">
  <div>
    <div class="cab-logo">${instituicao?.nome_fantasia || 'CAPETTE'}</div>
    <div style="font-size:9px;color:#888780">${instituicao?.nome_completo || 'Casa do Pequeno Trabalhador de Teresópolis'}</div>
    <div style="font-size:9px;color:#888780">CNPJ: ${instituicao?.cnpj || '29.213.717/0001-01'}</div>
  </div>
  <div class="cab-info">
    <div>Relatório de Execução do Objeto</div>
    <div>Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div>
    ${dataInicio || dataFim ? `<div>Período: ${dataInicio ? fmtData(dataInicio) : 'início'} a ${dataFim ? fmtData(dataFim) : 'atual'}</div>` : ''}
  </div>
</div>

<div class="titulo-bloco">
  <div class="titulo-principal">Relatório de Execução do Objeto</div>
  <div class="titulo-sub">${plano ? plano.nome_plano : projeto?.nome || '—'}</div>
</div>

<div class="info-grid">
  ${plano ? `
  <div class="info-item"><div class="info-label">Tipo de plano</div><div class="info-valor">${plano.tipo_plano}</div></div>
  <div class="info-item"><div class="info-label">Instrumento vinculado</div><div class="info-valor">${plano.parceria?.nome_projeto||'—'}</div></div>
  <div class="info-item"><div class="info-label">Situação do plano</div><div class="info-valor">${plano.situacao}</div></div>
  <div class="info-item"><div class="info-label">Órgão / parceiro</div><div class="info-valor">${plano.orgao_ou_parceiro||'—'}</div></div>
  <div class="info-item"><div class="info-label">Período de execução</div><div class="info-valor">${plano.periodo_inicio ? `${fmtData(plano.periodo_inicio)} a ${fmtData(plano.periodo_fim)}` : '—'}</div></div>
  <div class="info-item"><div class="info-label">Valor total previsto</div><div class="info-valor">${plano.valor_total_previsto ? fmt(plano.valor_total_previsto) : '—'}</div></div>
  ` : ''}
  <div class="info-item"><div class="info-label">Projeto / Serviço / Ação</div><div class="info-valor">${projeto?.nome||'—'}</div></div>
  <div class="info-item"><div class="info-label">Público-alvo</div><div class="info-valor">${plano?.publico_alvo||'—'}</div></div>
  <div class="info-item"><div class="info-label">Capacidade prevista</div><div class="info-valor">${plano?.capacidade_prevista||'—'}</div></div>
</div>

${plano?.objeto ? `
<div class="secao">
  <div class="secao-titulo">Objeto</div>
  <div style="background:#F8F7F2;padding:8px 10px;border-radius:4px;line-height:1.6">${plano.objeto}</div>
</div>` : ''}

${plano?.objetivo_geral ? `
<div class="secao">
  <div class="secao-titulo">Objetivo Geral</div>
  <div style="background:#F8F7F2;padding:8px 10px;border-radius:4px;line-height:1.6">${plano.objetivo_geral}</div>
</div>` : ''}

<!-- RESUMO DE EXECUÇÃO -->
<div class="resumo-box">
  <div class="resumo-titulo">Resumo da Execução</div>
  <div class="resumo-grid">
    <div class="resumo-item"><div class="resumo-label">Atendimentos realizados</div><div class="resumo-valor azul">${atendimentos.length}</div></div>
    <div class="resumo-item"><div class="resumo-label">Total de participantes</div><div class="resumo-valor verde">${totalParticipantes.toLocaleString('pt-BR')}</div></div>
    <div class="resumo-item"><div class="resumo-label">Usuários cadastrados</div><div class="resumo-valor azul">${usuarios.filter(u=>u.situacao==='ativo').length} ativos</div></div>
    <div class="resumo-item"><div class="resumo-label">Equipe envolvida</div><div class="resumo-valor azul">${equipe.length} pessoa${equipe.length!==1?'s':''}</div></div>
  </div>
</div>

${metas.length > 0 ? `
<div class="secao">
  <div class="secao-titulo">1. Metas — Previsto x Realizado</div>
  <table>
    <thead><tr><th>Meta</th><th>Indicador</th><th class="num">Previsto</th><th class="num">Realizado</th><th class="center">% Exec.</th><th class="center">Status</th><th>Justificativa</th></tr></thead>
    <tbody>${linhasMetas}</tbody>
  </table>
</div>` : ''}

${ativsPrevistas.length > 0 ? `
<div class="secao">
  <div class="secao-titulo">2. Atividades Previstas x Status de Execução</div>
  <table>
    <thead><tr><th>Atividade</th><th>Descrição</th><th class="center">Período</th><th>Responsável</th><th class="center">Status</th></tr></thead>
    <tbody>${linhasAtivsPrev}</tbody>
  </table>
</div>` : ''}

${atendimentos.length > 0 ? `
<div class="secao">
  <div class="secao-titulo">3. Atividades e Atendimentos Realizados (${atendimentos.length})</div>
  <table>
    <thead><tr><th>Data</th><th>Tipo</th><th>Tema</th><th class="num center">Participantes</th><th>Público</th><th>Profissional</th></tr></thead>
    <tbody>${linhasAtends}</tbody>
    <tfoot><tr style="background:#EAF3DE"><td colspan="3"><strong>TOTAL</strong></td><td class="num center"><strong>${totalParticipantes}</strong></td><td colspan="2"></td></tr></tfoot>
  </table>
  ${atendimentos.length > 100 ? `<div style="font-size:9px;color:#888780;text-align:center">* Exibindo 100 de ${atendimentos.length} registros</div>` : ''}

  ${Object.keys(porTipo).length > 0 ? `
  <div style="margin-top:8px">
    <div style="font-size:10px;font-weight:600;margin-bottom:4px;color:#5F5E5A">Por tipo de atividade:</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px">
      ${Object.entries(porTipo).sort((a,b)=>b[1]-a[1]).map(([tipo,qtd])=>`<span style="padding:2px 8px;border-radius:99px;font-size:9px;background:#E6F1FB;color:#185FA5">${tipo}: ${qtd}</span>`).join('')}
    </div>
  </div>` : ''}
</div>` : ''}

${usuarios.length > 0 ? `
<div class="secao">
  <div class="secao-titulo">4. Público Atendido — Quantitativo</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">
    <div style="background:#F8F7F2;border-radius:4px;padding:8px 10px">
      <div style="font-size:9px;color:#888780;margin-bottom:2px">Total cadastrado</div>
      <div style="font-size:18px;font-weight:bold;color:#4A8FD4">${usuarios.length}</div>
    </div>
    <div style="background:#F8F7F2;border-radius:4px;padding:8px 10px">
      <div style="font-size:9px;color:#888780;margin-bottom:2px">Ativos</div>
      <div style="font-size:18px;font-weight:bold;color:#6BBF2B">${usuarios.filter(u=>u.situacao==='ativo').length}</div>
    </div>
    <div style="background:#F8F7F2;border-radius:4px;padding:8px 10px">
      <div style="font-size:9px;color:#888780;margin-bottom:2px">Desligados/Encerrados</div>
      <div style="font-size:18px;font-weight:bold;color:#E8212A">${usuarios.filter(u=>u.situacao==='desligado'||u.situacao==='encerrado').length}</div>
    </div>
  </div>
  ${dados.users_com_nasc > 0 ? `
  <div style="font-size:10px;font-weight:600;margin-bottom:4px;color:#5F5E5A">Distribuição por faixa etária (${dados.users_com_nasc} com data de nascimento):</div>
  <div style="display:flex;gap:4px;flex-wrap:wrap">
    ${Object.entries(dados.faixas).filter(([,v])=>v>0).map(([f,v])=>`<span style="padding:3px 10px;border-radius:99px;font-size:9px;background:#EAF3DE;color:#3B6D11">${f} anos: ${v}</span>`).join('')}
  </div>` : ''}
</div>` : ''}

${equipe.length > 0 ? `
<div class="secao">
  <div class="secao-titulo">5. Equipe Envolvida (${equipe.length})</div>
  <table>
    <thead><tr><th>Nome</th><th>Função</th><th>Tipo de vínculo</th></tr></thead>
    <tbody>${linhasEquipe}</tbody>
  </table>
</div>` : ''}

${financeiroResumo ? `
<div class="secao">
  <div class="secao-titulo">6. Resumo Financeiro — ${financeiroResumo.conta||'Conta vinculada'}</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
    <div style="background:#F8F7F2;border-radius:4px;padding:8px 10px">
      <div style="font-size:9px;color:#888780;margin-bottom:2px">Entradas</div>
      <div style="font-size:14px;font-weight:bold;color:#6BBF2B">${fmt(financeiroResumo.entradas)}</div>
    </div>
    <div style="background:#F8F7F2;border-radius:4px;padding:8px 10px">
      <div style="font-size:9px;color:#888780;margin-bottom:2px">Saídas</div>
      <div style="font-size:14px;font-weight:bold;color:#E8212A">${fmt(financeiroResumo.saidas)}</div>
    </div>
    <div style="background:#F8F7F2;border-radius:4px;padding:8px 10px">
      <div style="font-size:9px;color:#888780;margin-bottom:2px">Saldo</div>
      <div style="font-size:14px;font-weight:bold;color:${financeiroResumo.saldo>=0?'#6BBF2B':'#E8212A'}">${fmt(financeiroResumo.saldo)}</div>
    </div>
  </div>
</div>` : ''}

<div class="secao">
  <div class="secao-titulo">Declaração</div>
  <div style="background:#F8F7F2;padding:10px;border-radius:4px;font-size:10px;line-height:1.7">
    Declaramos que as informações apresentadas neste relatório refletem fielmente as atividades desenvolvidas pela 
    <strong>${instituicao?.nome_completo || 'Casa do Pequeno Trabalhador de Teresópolis — CAPETTE'}</strong>,
    ${dataInicio||dataFim ? `no período de ${dataInicio?fmtData(dataInicio):'início'} a ${dataFim?fmtData(dataFim):'atual'},` : ''}
    em conformidade com o planejado${plano ? ` no ${plano.nome_plano}` : ''}, observadas as disposições legais aplicáveis às Organizações da Sociedade Civil.
  </div>
</div>

<div class="assinaturas">
  <div class="assinatura"><div style="height:40px"></div><div class="assinatura-linha">Responsável Técnico</div></div>
  <div class="assinatura"><div style="height:40px"></div><div class="assinatura-linha">Representante Legal / Presidente</div></div>
  <div class="assinatura"><div style="height:40px"></div><div class="assinatura-linha">Responsável pela Conferência</div></div>
</div>

<div class="rodape">
  FinOSC Capette · Sistema de Gestão para OSCs · ${new Date().toLocaleDateString('pt-BR')}
</div>

<script>window.onload = () => window.print()</script>
</body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const pct = (r,p) => p > 0 ? Math.round(r/p*100) : 0

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'7px 16px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap', fontWeight:500 }),
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:'1.25rem' }}>Relatório de Execução do Objeto</div>

      {/* Configuração */}
      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Selecione o plano ou projeto e o período</div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <label style={s.label}>Plano de Trabalho / Ação</label>
            <select value={planoSel} onChange={e=>{ setPlanoSel(e.target.value); setProjetoSel('') }} style={s.input}>
              <option value="">Selecione um plano...</option>
              {planos.map(p => <option key={p.id} value={p.id}>{p.nome_plano}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Ou selecione apenas o Projeto</label>
            <select value={projetoSel} onChange={e=>{ setProjetoSel(e.target.value); setPlanoSel('') }} style={s.input}>
              <option value="">Selecione um projeto...</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Data início</label>
            <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Data fim</label>
            <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={s.input} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={gerar} disabled={loading || (!planoSel && !projetoSel)} style={s.btn(loading||(!planoSel&&!projetoSel)?'#D3D1C7':AZUL)}>
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
          {dados && <button onClick={gerarPDF} style={s.btn(VERDE)}>📄 Exportar PDF</button>}
        </div>
      </div>

      {dados && (
        <>
          {/* Resumo */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Atendimentos', val:dados.atendimentos.length, cor:AZUL },
              { label:'Participantes', val:dados.totalParticipantes.toLocaleString('pt-BR'), cor:VERDE },
              { label:'Usuários ativos', val:dados.usuarios.filter(u=>u.situacao==='ativo').length, cor:VERDE },
              { label:'Equipe', val:dados.equipe.length, cor:'#8B2FC9' },
              { label:'Metas', val:dados.metas.length, cor:LARANJA },
            ].map(m => (
              <div key={m.label} style={{ background:'#fff', borderRadius:10, padding:'.75rem 1rem', border:'0.5px solid #E0DDD5' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Identificação */}
          {dados.plano && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Identificação do plano</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  ['Tipo', dados.plano.tipo_plano],
                  ['Instrumento', dados.plano.parceria?.nome_projeto||'—'],
                  ['Situação', dados.plano.situacao],
                  ['Órgão/parceiro', dados.plano.orgao_ou_parceiro||'—'],
                  ['Período', dados.plano.periodo_inicio ? `${fmtData(dados.plano.periodo_inicio)} a ${fmtData(dados.plano.periodo_fim)}` : '—'],
                  ['Valor previsto', dados.plano.valor_total_previsto ? fmt(dados.plano.valor_total_previsto) : '—'],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:'#F8F7F2', borderRadius:8, padding:'7px 10px' }}>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{l}</div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>
              {dados.plano.objeto && (
                <div style={{ marginTop:8, background:'#F8F7F2', borderRadius:8, padding:'7px 10px' }}>
                  <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Objeto</div>
                  <div style={{ fontSize:12 }}>{dados.plano.objeto}</div>
                </div>
              )}
            </div>
          )}

          {/* Metas */}
          {dados.metas.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Metas — Previsto x Realizado</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['Meta','Indicador','Previsto','Realizado','% Exec.','Status'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dados.metas.map(m => {
                    const p = pct(Number(m.quantidade_realizada||0), Number(m.quantidade_prevista||0))
                    const [bg,cor] = STATUS_META_COR[m.status_meta]||['#F1EFE8','#888780']
                    return (
                      <tr key={m.id}>
                        <td style={{ ...s.td, fontWeight:500 }}>{m.descricao_meta}</td>
                        <td style={{ ...s.td, color:'#888780' }}>{m.indicador||'—'}</td>
                        <td style={s.td}>{m.quantidade_prevista||'—'} {m.unidade_medida}</td>
                        <td style={{ ...s.td, color:VERDE, fontWeight:600 }}>{m.quantidade_realizada||'—'}</td>
                        <td style={s.td}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:50, height:5, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:Math.min(p,100)+'%', background:p>=100?VERDE:p>=50?LARANJA:VERMELHO, borderRadius:99 }} />
                            </div>
                            <span style={{ fontWeight:600 }}>{p}%</span>
                          </div>
                        </td>
                        <td style={s.td}><span style={s.badge(bg,cor)}>{m.status_meta}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Atendimentos */}
          {dados.atendimentos.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>
                Atividades e Atendimentos Realizados ({dados.atendimentos.length}) · {dados.totalParticipantes.toLocaleString('pt-BR')} participantes
              </div>
              <div style={{ maxHeight:360, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead style={{ position:'sticky', top:0 }}>
                    <tr>{['Data','Tipo','Tema','Participantes','Público','Profissional'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {dados.atendimentos.map((a,i) => (
                      <tr key={a.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                        <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                        <td style={s.td}>{a.tipo_atend}</td>
                        <td style={{ ...s.td, color:'#888780' }}>{a.tema||'—'}</td>
                        <td style={{ ...s.td, textAlign:'center', fontWeight:500 }}>{a.qtd_participantes||'—'}</td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{(a.publico_participante||[]).join(', ')||'—'}</td>
                        <td style={s.td}>{a.profissional?.nome?.split(' ').slice(0,2).join(' ')||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Usuários */}
          {dados.usuarios.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Público atendido — {dados.usuarios.filter(u=>u.situacao==='ativo').length} ativos de {dados.usuarios.length} cadastrados</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {Object.entries(dados.faixas).filter(([,v])=>v>0).map(([f,v]) => (
                  <div key={f} style={{ background:'#EAF3DE', borderRadius:8, padding:'6px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'#888780' }}>{f} anos</div>
                    <div style={{ fontSize:16, fontWeight:700, color:VERDE }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipe */}
          {dados.equipe.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Equipe envolvida ({dados.equipe.length})</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['Nome','Função','Vínculo'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dados.equipe.map(e => (
                    <tr key={e.nome}>
                      <td style={{ ...s.td, fontWeight:500 }}>{e.nome}</td>
                      <td style={s.td}>{e.funcao}</td>
                      <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{e.tipo_vinculo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Financeiro */}
          {dados.financeiroResumo && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Resumo financeiro — {dados.financeiroResumo.conta}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  { label:'Entradas', val:fmt(dados.financeiroResumo.entradas), cor:VERDE },
                  { label:'Saídas', val:fmt(dados.financeiroResumo.saidas), cor:VERMELHO },
                  { label:'Saldo', val:fmt(dados.financeiroResumo.saldo), cor:dados.financeiroResumo.saldo>=0?AZUL:VERMELHO },
                ].map(m => (
                  <div key={m.label} style={{ background:'#F8F7F2', borderRadius:8, padding:'.75rem 1rem' }}>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                    <div style={{ fontSize:16, fontWeight:600, color:m.cor }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
