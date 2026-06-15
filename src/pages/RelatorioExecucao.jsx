import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

const STATUS_META_COR = {
  'não iniciada': ['#F1EFE8','#888780'],
  'em andamento': ['#E6F1FB','#185FA5'],
  'alcançada': ['#EAF3DE','#3B6D11'],
  'parcialmente alcançada': ['#FAEEDA','#854F0B'],
  'não alcançada': ['#FCEBEB','#A32D2D'],
  'outro': ['#E6F1FB','#185FA5'],
}

export default function RelatorioExecucao() {
  const [planos, setPlanos] = useState([])
  const [incluirAss, setIncluirAss] = useState(false)
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
      const montar = () => {
        let q = supabase.from('atendimentos')
          .select('*, profissional:equipe(nome,funcao)')
          .eq('projeto_id', projetoId)
          .order('data_atend')
        if (dataInicio) q = q.gte('data_atend', dataInicio)
        if (dataFim) q = q.lte('data_atend', dataFim)
        return q
      }
      const { data } = await fetchAll(montar)
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
          const montar = () => {
            let qMovs = supabase.from('extrato_movs').select('valor').in('extrato_id', ids)
            if (dataInicio) qMovs = qMovs.gte('data', dataInicio)
            if (dataFim) qMovs = qMovs.lte('data', dataFim)
            return qMovs
          }
          const { data: movs } = await fetchAll(montar)
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
<title>Relatório de Execução</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, Arial, sans-serif; font-size: 11px; color: #171A1F; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 0; }
  @media print { body { background: #fff; } .no-print { display: none !important; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
  .pg { width: 210mm; min-height: 297mm; padding: 14mm 16mm 16mm; margin: 0 auto; border-left: 5px solid #0E7EA8; }
  .logo-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0E7EA8; padding-bottom: 11px; margin-bottom: 18px; }
  .kicker { font-size: 9px; font-weight: 700; color: #0E7EA8; letter-spacing: .18em; text-transform: uppercase; margin-bottom: 7px; }
  .title { font-family: Georgia, serif; font-size: 38px; line-height: .95; font-weight: 400; letter-spacing: -.04em; color: #06344F; margin-bottom: 9px; }
  .rule { width: 65px; height: 2px; background: #A98E54; margin-bottom: 11px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #D7D0C2; border-bottom: 1px solid #D7D0C2; margin: 12px 0; }
  .meta { padding: 10px 0; border-bottom: 1px solid #ECE6DA; }
  .meta:nth-last-child(-n+2) { border-bottom: 0; }
  .meta:nth-child(odd) { padding-right: 16px; border-right: 1px solid #ECE6DA; }
  .meta:nth-child(even) { padding-left: 16px; }
  .meta b { display: block; font-size: 7.5px; text-transform: uppercase; color: #6B7280; letter-spacing: .12em; margin-bottom: 3px; }
  .meta span { font-size: 11px; color: #20252C; font-weight: 600; }
  .meta small { display: block; font-size: 9px; color: #626B76; margin-top: 2px; }
  .figures { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid #D7D0C2; border-bottom: 1px solid #D7D0C2; margin: 12px 0; }
  .fig { padding: 11px 8px; border-right: 1px solid #ECE6DA; }
  .fig:last-child { border-right: 0; }
  .fig b { display: block; font-size: 7.5px; text-transform: uppercase; color: #6B7280; letter-spacing: .1em; margin-bottom: 5px; }
  .fig span { font-family: Georgia, serif; font-size: 16px; }
  .blue { color: #0E7EA8; } .green { color: #2E6F3E; } .red { color: #A7352C; }
  .sec-title { font-family: Georgia, serif; font-size: 17px; color: #06344F; margin: 14px 0 9px; letter-spacing: -.02em; }
  .texto-box { background: #F8F7F2; border-left: 3px solid #0E7EA8; padding: 10px 14px; font-size: 10px; line-height: 1.65; color: #303842; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th { background: #F2F6F7; color: #525B66; border-top: 1px solid #D7D0C2; border-bottom: 1px solid #D7D0C2; font-size: 7px; text-transform: uppercase; letter-spacing: .08em; padding: 6px 5px; text-align: left; }
  td { padding: 5px; border-bottom: 1px solid #EEE9DF; color: #20252C; vertical-align: middle; }
  .num { text-align: right; white-space: nowrap; } .center { text-align: center; }
  .total-r td { background: #F5F2EA; font-weight: 700; border-top: 1.5px solid #D7D0C2; border-bottom: none; }
  .footer { border-top: 1px solid #D7D0C2; padding-top: 8px; display: flex; justify-content: space-between; color: #66717E; font-size: 8.5px; margin-top: 14px; }
  .footer strong { color: #06344F; }
  .assinaturas { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 20px; }
  .assinatura { text-align: center; }
  .assinatura-linha { height: 36px; border-bottom: 1px solid #9199A2; margin-bottom: 5px; }
  .assinatura-label { font-size: 8.5px; font-weight: 700; color: #06344F; }
</style>
</head>
<body>
<div class="pg">

<div class="logo-row">
  <div><img src="https://capette-financeiro.vercel.app/logo.png" alt="CAPETTE" style="height:44px;width:auto;object-fit:contain;display:block" onerror="this.outerHTML='<div style=\'display:flex;gap:1px\'><span style=\'font-size:14px;font-weight:900;color:#F5C800\'>C</span><span style=\'font-size:14px;font-weight:900;color:#F4821F\'>A</span><span style=\'font-size:14px;font-weight:900;color:#8B2FC9\'>P</span><span style=\'font-size:14px;font-weight:900;color:#E8212A\'>E</span><span style=\'font-size:14px;font-weight:900;color:#6BBF2B\'>T</span><span style=\'font-size:14px;font-weight:900;color:#0E7EA8\'>T</span><span style=\'font-size:14px;font-weight:900;color:#E8207A\'>E</span></div>'" /></div>
  <div style="text-align:right;font-size:9px;color:#5F6874;max-width:240px;line-height:1.5">
    <div style="font-size:11px;font-weight:700;color:#20252C">${instituicao?.nome_completo || 'Casa do Pequeno Trabalhador de Teresópolis'}</div>
    <div style="font-size:9px;font-weight:700;color:#20252C;margin:2px 0">CNPJ: ${instituicao?.cnpj || '29.213.717/0001-01'}</div>
  </div>
</div>

<div class="kicker">Relatório de execução</div>
<div class="title">Execução<br>do Objeto</div>
<div class="rule"></div>
<div style="font-size:12px;color:#303944;margin-bottom:14px">${plano ? plano.nome_plano : projeto?.nome || '—'}${dataInicio ? ' · ' + fmtData(dataInicio) + ' a ' + (dataFim ? fmtData(dataFim) : 'atual') : ''}</div>

<div class="meta-grid">
  ${plano ? `
  <div class="meta"><b>Instrumento</b><span>${plano.tipo_plano||'—'}</span><small>${plano.parceria?.nome_projeto||'—'}</small></div>
  <div class="meta"><b>Período</b><span>${plano.periodo_inicio ? fmtData(plano.periodo_inicio) + ' a ' + fmtData(plano.periodo_fim) : '—'}</span><small>Execução</small></div>
  <div class="meta"><b>Situação</b><span>${plano.situacao||'—'}</span></div>
  <div class="meta"><b>Valor previsto</b><span>${plano.valor_total_previsto ? fmt(plano.valor_total_previsto) : '—'}</span></div>
  ` : `
  <div class="meta"><b>Projeto / Serviço</b><span>${projeto?.nome||'—'}</span></div>
  <div class="meta"><b>Público-alvo</b><span>${projeto?.publico_alvo||'—'}</span></div>
  `}
</div>

${plano?.objeto ? `<div class="texto-box"><strong style="font-size:8.5px;color:#06344F;display:block;margin-bottom:4px">Objeto</strong>${plano.objeto}</div>` : ''}

<div class="figures">
  <div class="fig"><b>Atendimentos</b><span class="blue">${atendimentos.length}</span></div>
  <div class="fig"><b>Participantes</b><span class="blue">${totalParticipantes.toLocaleString('pt-BR')}</span></div>
  <div class="fig"><b>Usuários ativos</b><span class="green">${usuarios.filter(u=>u.situacao==='ativo').length}</span></div>
  <div class="fig"><b>Equipe</b><span class="blue">${equipe.length}</span></div>
</div>



${incluirAss ? `<div class="assinaturas">
  <div class="assinatura"><div style="height:40px"></div><div class="assinatura-linha">Responsável Técnico</div></div>
  <div class="assinatura"><div style="height:40px"></div><div class="assinatura-linha">Representante Legal / Presidente</div></div>
  <div class="assinatura"><div style="height:40px"></div><div class="assinatura-linha">Responsável pela Conferência</div></div>
</div>` : ''}

<div class="footer">
  <div>Rua Juruena, 73 · Teresópolis — RJ · capette@capette.org</div>
  <div><strong>AGENDO Integra</strong> · Relatório de Execução</div>
</div>

</div>
<script>window.onload = () => window.print()</script>
</body></html>`


    const w = window.open('', '_blank')
    if (!w) { alert('O navegador bloqueou a janela do relatório. Permita pop-ups para este site e tente novamente.'); return }
    w.document.write(html)
    w.document.close()
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const pct = (r,p) => p > 0 ? Math.round(r/p*100) : 0

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'7px 16px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap', fontWeight:500 }),
  }

  return (
    <div style={{ }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Relatório de Execução do Objeto</div>
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
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
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#5F5E5A', cursor:'pointer' }}>

            <input type="checkbox" checked={incluirAss} onChange={e=>setIncluirAss(e.target.checked)} style={{ accentColor:'#0E7EA8' }} /> Para assinatura

          </label>
          <button onClick={gerar} disabled={loading || (!planoSel && !projetoSel)} style={s.btn(loading||(!planoSel&&!projetoSel)?'#D3D1C7':AZUL)}>
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
          {dados && <button onClick={gerarPDF} style={s.btn('#0E7EA8')}><i className="ti ti-file" style={{marginRight:4}} /> Exportar PDF</button>}
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
              { label:'Equipe', val:dados.equipe.length, cor:'#0E7EA8' },
              { label:'Metas', val:dados.metas.length, cor:LARANJA },
            ].map(m => (
              <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
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
      </div>
  )
}