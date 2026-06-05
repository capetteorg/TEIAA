import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { gerarPDFRelatorio } from '../lib/pdf'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F', ROXO = '#8B2FC9'

const ABAS = [
  { id: 'financeiro',  label: 'Financeiro',         icon: 'chart-bar' },
  { id: 'execucao',    label: 'Execução do Objeto',  icon: 'report' },
  { id: 'equipe',      label: 'Equipe',              icon: 'users-group' },
  { id: 'usuarios',    label: 'Usuários Atendidos',  icon: 'users' },
  { id: 'atendimentos',label: 'Atendimentos',        icon: 'clipboard-list' },
  { id: 'doacoes',     label: 'Doações',             icon: 'gift' },
]

export default function RelatoriosCentral() {
  const [aba, setAba] = useState('financeiro')
  const [projetos, setProjetos] = useState([])
  const [planos, setPlanos] = useState([])
  const [contas, setContas] = useState([])
  const [projetoSel, setProjetoSel] = useState('')
  const [planoSel, setPlanoSel] = useState('')
  const [contaSel, setContaSel] = useState('todas')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0,7) + '-01')
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0,7) + '-31')
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [instituicao, setInstituicao] = useState(null)

  useEffect(() => {
    supabase.from('projetos').select('id,nome').order('nome').then(({ data }) => setProjetos(data || []))
    supabase.from('planos').select('id,nome_plano,projeto_id').order('nome_plano').then(({ data }) => setPlanos(data || []))
    supabase.from('contas').select('id,nome,banco').order('nome').then(({ data }) => setContas(data || []))
    supabase.from('instituicao').select('*').limit(1).single().then(({ data }) => setInstituicao(data))
  }, [])

  async function gerar() {
    setLoading(true)
    setDados(null)
    try {
      const pId = projetoSel ? parseInt(projetoSel) : null
      const plId = planoSel ? parseInt(planoSel) : null

      if (aba === 'financeiro') await gerarFinanceiro(pId)
      else if (aba === 'execucao') await gerarExecucao(pId, plId)
      else if (aba === 'equipe') await gerarEquipe(pId)
      else if (aba === 'usuarios') await gerarUsuarios(pId)
      else if (aba === 'atendimentos') await gerarAtendimentos(pId)
      else if (aba === 'doacoes') await gerarDoacoes(pId)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function gerarFinanceiro(pId) {
    let q = supabase.from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), extrato:extratos(conta_id, competencia, conta:contas(nome))')
      .gte('data', dataInicio).lte('data', dataFim).order('data')
    const { data: movs } = await q
    let lista = movs || []
    if (contaSel !== 'todas') lista = lista.filter(m => String(m.extrato?.conta_id) === String(contaSel))

    const entradas = lista.filter(m => Number(m.valor) > 0)
    const saidas = lista.filter(m => Number(m.valor) < 0)
    const totalEnt = entradas.reduce((a,m) => a+Number(m.valor), 0)
    const totalSai = Math.abs(saidas.reduce((a,m) => a+Number(m.valor), 0))

    const grupoSai = {}
    saidas.forEach(m => {
      const cat = m.categoria?.nome || 'Sem categoria'
      if (!grupoSai[cat]) grupoSai[cat] = { total: 0, qtd: 0 }
      grupoSai[cat].total += Math.abs(Number(m.valor))
      grupoSai[cat].qtd++
    })

    setDados({ tipo: 'financeiro', entradas, saidas, totalEnt, totalSai, saldo: totalEnt - totalSai, grupoSai, lista })
  }

  async function gerarExecucao(pId, plId) {
    const plano = planos.find(p => p.id === plId)
    const projeto = projetos.find(p => p.id === (pId || plano?.projeto_id))

    let metas = [], ativsPrev = []
    if (plId) {
      const [m, a] = await Promise.all([
        supabase.from('metas_plano').select('*').eq('plano_id', plId).order('id'),
        supabase.from('atividades_previstas').select('*').eq('plano_id', plId).order('id'),
      ])
      metas = m.data || []
      ativsPrev = a.data || []
    }

    const projetoId = pId || plano?.projeto_id
    let atendimentos = [], usuarios = [], equipe = []
    if (projetoId) {
      let qA = supabase.from('atendimentos').select('*, profissional:equipe(nome,funcao)').eq('projeto_id', projetoId).order('data_atend')
      if (dataInicio) qA = qA.gte('data_atend', dataInicio)
      if (dataFim) qA = qA.lte('data_atend', dataFim)
      const [a, u] = await Promise.all([qA, supabase.from('usuarios_atendidos').select('*').eq('projeto_id', projetoId)])
      atendimentos = a.data || []
      usuarios = u.data || []
    }

    const totalPart = atendimentos.reduce((a,m) => a+(Number(m.qtd_participantes)||0), 0)
    const porTipo = {}
    atendimentos.forEach(a => { porTipo[a.tipo_atend] = (porTipo[a.tipo_atend]||0)+1 })

    const hoje = new Date()
    const faixas = { '0-5':0,'6-11':0,'12-17':0,'18-29':0,'30-59':0,'60+':0 }
    usuarios.filter(u=>u.data_nascimento).forEach(u => {
      const nasc = new Date(u.data_nascimento+'T12:00:00')
      let idade = hoje.getFullYear()-nasc.getFullYear()
      if (hoje.getMonth()<nasc.getMonth()||(hoje.getMonth()===nasc.getMonth()&&hoje.getDate()<nasc.getDate())) idade--
      if (idade<=5) faixas['0-5']++
      else if (idade<=11) faixas['6-11']++
      else if (idade<=17) faixas['12-17']++
      else if (idade<=29) faixas['18-29']++
      else if (idade<=59) faixas['30-59']++
      else faixas['60+']++
    })

    setDados({ tipo:'execucao', plano, projeto, metas, ativsPrev, atendimentos, usuarios, totalPart, porTipo, faixas })
  }

  async function gerarEquipe(pId) {
    let q = supabase.from('equipe').select('*').order('nome')
    if (pId) {
      const proj = projetos.find(p => p.id === pId)
      if (proj) q = q.contains('projetos', [proj.nome])
    }
    const { data } = await q
    const lista = data || []
    const porTipo = {}
    lista.forEach(e => { porTipo[e.tipo_vinculo||'Não informado'] = (porTipo[e.tipo_vinculo||'Não informado']||0)+1 })
    const porSit = {}
    lista.forEach(e => { porSit[e.situacao||'Não informado'] = (porSit[e.situacao||'Não informado']||0)+1 })
    setDados({ tipo:'equipe', lista, porTipo, porSit })
  }

  async function gerarUsuarios(pId) {
    let q = supabase.from('usuarios_atendidos').select('*, projeto:projetos(nome)').order('nome')
    if (pId) q = q.eq('projeto_id', pId)
    const { data } = await q
    const lista = data || []
    const ativos = lista.filter(u=>u.situacao==='ativo').length
    const desligados = lista.filter(u=>u.situacao!=='ativo').length

    const hoje = new Date()
    const faixas = { '0-5':0,'6-11':0,'12-17':0,'18-29':0,'30-59':0,'60+':0 }
    lista.filter(u=>u.data_nascimento).forEach(u => {
      const nasc = new Date(u.data_nascimento+'T12:00:00')
      let idade = hoje.getFullYear()-nasc.getFullYear()
      if (hoje.getMonth()<nasc.getMonth()||(hoje.getMonth()===nasc.getMonth()&&hoje.getDate()<nasc.getDate())) idade--
      if (idade<=5) faixas['0-5']++
      else if (idade<=11) faixas['6-11']++
      else if (idade<=17) faixas['12-17']++
      else if (idade<=29) faixas['18-29']++
      else if (idade<=59) faixas['30-59']++
      else faixas['60+']++
    })

    const porProjeto = {}
    lista.forEach(u => {
      const pNome = u.projeto?.nome || 'Sem projeto'
      if (!porProjeto[pNome]) porProjeto[pNome] = 0
      porProjeto[pNome]++
    })

    setDados({ tipo:'usuarios', lista, ativos, desligados, faixas, porProjeto })
  }

  async function gerarAtendimentos(pId) {
    let q = supabase.from('atendimentos')
      .select('*, projeto:projetos(nome), profissional:equipe(nome,funcao)')
      .gte('data_atend', dataInicio).lte('data_atend', dataFim).order('data_atend')
    if (pId) q = q.eq('projeto_id', pId)
    const { data } = await q
    const lista = data || []
    const totalPart = lista.reduce((a,m) => a+(Number(m.qtd_participantes)||0), 0)
    const porTipo = {}
    lista.forEach(a => { porTipo[a.tipo_atend||'Outro'] = (porTipo[a.tipo_atend||'Outro']||0)+1 })
    const porProjeto = {}
    lista.forEach(a => {
      const pNome = a.projeto?.nome || 'Sem projeto'
      if (!porProjeto[pNome]) porProjeto[pNome] = { qtd:0, participantes:0 }
      porProjeto[pNome].qtd++
      porProjeto[pNome].participantes += Number(a.qtd_participantes)||0
    })
    setDados({ tipo:'atendimentos', lista, totalPart, porTipo, porProjeto })
  }

  async function gerarDoacoes(pId) {
    let q = supabase.from('doacoes')
      .select('*, projeto:projetos(nome), itens:doacoes_itens(*)')
      .gte('data_doacao', dataInicio).lte('data_doacao', dataFim).order('data_doacao', { ascending:false })
    if (pId) q = q.eq('projeto_id', pId)
    const { data } = await q
    const lista = data || []
    const totalEstimado = lista.reduce((a,d) => a+Number(d.valor_estimado||0), 0)
    const porCategoria = {}
    lista.forEach(d => { porCategoria[d.categoria||'Outro'] = (porCategoria[d.categoria||'Outro']||0)+1 })
    const porDoador = {}
    lista.forEach(d => { porDoador[d.doador||'Não informado'] = (porDoador[d.doador||'Não informado']||0)+1 })
    setDados({ tipo:'doacoes', lista, totalEstimado, porCategoria, porDoador })
  }

  function exportarPDF() {
    if (!dados) return
    // Chama PDF específico baseado no tipo
    if (dados.tipo === 'financeiro') gerarPDFRelatorio(dados, dataInicio, dataFim)
    else alert('PDF para este relatório em breve!')
  }

  const fmt = v => 'R$ '+Math.abs(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const pct = (r,p) => p>0 ? Math.round(r/p*100) : 0

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'7px 16px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', fontWeight:500 }),
    tab: ativo => ({ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?AZUL:'#D3D1C7'}`, background:ativo?AZUL:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer', whiteSpace:'nowrap' }),
    metric: (cor) => ({ background:'#fff', borderRadius:10, padding:'.75rem 1rem', border:'0.5px solid #E0DDD5', minWidth:120 }),
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:'1.25rem' }}>Relatórios</div>

      {/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => { setAba(a.id); setDados(null) }} style={s.tab(aba===a.id)}>
            <i className={`ti ti-${a.icon}`} style={{ fontSize:12, marginRight:4 }} />
            {a.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={s.card}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:10 }}>
          <div>
            <label style={s.label}>Data início</label>
            <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Data fim</label>
            <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Projeto</label>
            <select value={projetoSel} onChange={e=>setProjetoSel(e.target.value)} style={s.input}>
              <option value="">Todos os projetos</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          {(aba==='execucao') && (
            <div>
              <label style={s.label}>Plano de trabalho</label>
              <select value={planoSel} onChange={e=>setPlanoSel(e.target.value)} style={s.input}>
                <option value="">Selecione...</option>
                {planos.map(p => <option key={p.id} value={p.id}>{p.nome_plano}</option>)}
              </select>
            </div>
          )}
          {(aba==='financeiro') && (
            <div>
              <label style={s.label}>Conta bancária</label>
              <select value={contaSel} onChange={e=>setContaSel(e.target.value)} style={s.input}>
                <option value="todas">Todas as contas</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={gerar} disabled={loading} style={s.btn(loading?'#D3D1C7':AZUL)}>
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
          {dados && <button onClick={exportarPDF} style={s.btn(VERDE)}>📄 Exportar PDF</button>}
        </div>
      </div>

      {/* ===== FINANCEIRO ===== */}
      {dados?.tipo === 'financeiro' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Entradas', val:fmt(dados.totalEnt), cor:VERDE },
              { label:'Saídas', val:fmt(dados.totalSai), cor:VERMELHO },
              { label:'Saldo', val:fmt(dados.saldo), cor:dados.saldo>=0?AZUL:VERMELHO },
              { label:'Movimentações', val:dados.lista.length, cor:'#5F5E5A' },
            ].map(m => (
              <div key={m.label} style={s.metric()}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:16, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Despesas por categoria</div>
              {Object.entries(dados.grupoSai).sort((a,b)=>b[1].total-a[1].total).map(([cat,v]) => (
                <div key={cat} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{cat} <span style={{ color:'#888780', fontSize:11 }}>({v.qtd})</span></span>
                  <span style={{ color:VERMELHO, fontWeight:500 }}>{fmt(v.total)}</span>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Todas as movimentações ({dados.lista.length})</div>
              <div style={{ maxHeight:400, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead style={{ position:'sticky', top:0 }}><tr>{['Data','Descrição','Categoria','Valor'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {dados.lista.map((m,i) => (
                      <tr key={m.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                        <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(m.data)}</td>
                        <td style={{ ...s.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{m.categoria?.nome||'—'}</td>
                        <td style={{ ...s.td, color:Number(m.valor)>=0?VERDE:VERMELHO, fontWeight:500, textAlign:'right' }}>{fmt(m.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== EXECUÇÃO DO OBJETO ===== */}
      {dados?.tipo === 'execucao' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Atendimentos', val:dados.atendimentos.length, cor:AZUL },
              { label:'Participantes', val:dados.totalPart, cor:VERDE },
              { label:'Usuários ativos', val:dados.usuarios.filter(u=>u.situacao==='ativo').length, cor:VERDE },
              { label:'Metas', val:dados.metas.length, cor:LARANJA },
            ].map(m => (
              <div key={m.label} style={s.metric()}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:16, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>
          {dados.metas.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Metas — Previsto x Realizado</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['Meta','Previsto','Realizado','% Exec.','Status'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dados.metas.map(m => {
                    const p = pct(Number(m.quantidade_realizada||0), Number(m.quantidade_prevista||0))
                    return (
                      <tr key={m.id}>
                        <td style={{ ...s.td, fontWeight:500 }}>{m.descricao_meta}</td>
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
                        <td style={s.td}><span style={s.badge(m.status_meta==='alcançada'?'#EAF3DE':'#FAEEDA', m.status_meta==='alcançada'?'#3B6D11':'#854F0B')}>{m.status_meta}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {dados.atendimentos.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Atendimentos realizados ({dados.atendimentos.length}) · {dados.totalPart} participantes</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
                {Object.entries(dados.porTipo).sort((a,b)=>b[1]-a[1]).map(([t,q]) => (
                  <span key={t} style={s.badge('#E6F1FB','#185FA5')}>{t}: {q}</span>
                ))}
              </div>
              <div style={{ maxHeight:300, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead style={{ position:'sticky', top:0 }}><tr>{['Data','Tipo','Tema','Participantes','Profissional'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {dados.atendimentos.map((a,i) => (
                      <tr key={a.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                        <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                        <td style={s.td}>{a.tipo_atend}</td>
                        <td style={{ ...s.td, color:'#888780' }}>{a.tema||'—'}</td>
                        <td style={{ ...s.td, textAlign:'center', fontWeight:500 }}>{a.qtd_participantes||'—'}</td>
                        <td style={s.td}>{a.profissional?.nome?.split(' ').slice(0,2).join(' ')||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {dados.usuarios.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Público atendido — faixa etária</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {Object.entries(dados.faixas).filter(([,v])=>v>0).map(([f,v]) => (
                  <div key={f} style={{ background:'#EAF3DE', borderRadius:8, padding:'8px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'#888780' }}>{f} anos</div>
                    <div style={{ fontSize:18, fontWeight:700, color:VERDE }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== EQUIPE ===== */}
      {dados?.tipo === 'equipe' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            <div style={s.metric()}><div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>Total</div><div style={{ fontSize:18, fontWeight:600, color:AZUL }}>{dados.lista.length}</div></div>
            <div style={s.metric()}><div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>Ativos</div><div style={{ fontSize:18, fontWeight:600, color:VERDE }}>{dados.lista.filter(e=>e.situacao==='ativo').length}</div></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Por tipo de vínculo</div>
              {Object.entries(dados.porTipo).map(([t,q]) => (
                <div key={t} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{t}</span><span style={{ fontWeight:600, color:AZUL }}>{q}</span>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Por situação</div>
              {Object.entries(dados.porSit).map(([t,q]) => (
                <div key={t} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{t}</span><span style={{ fontWeight:600, color:t==='ativo'?VERDE:'#888780' }}>{q}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Lista da equipe ({dados.lista.length})</div>
            <div style={{ maxHeight:450, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead style={{ position:'sticky', top:0 }}><tr>{['Nome','Função','Tipo de vínculo','Origem','Situação'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dados.lista.map((e,i) => (
                    <tr key={e.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, fontWeight:500 }}>{e.nome}</td>
                      <td style={s.td}>{e.funcao||'—'}</td>
                      <td style={s.td}>{e.tipo_vinculo||'—'}</td>
                      <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{e.orgao_origem||'—'}</td>
                      <td style={s.td}><span style={s.badge(e.situacao==='ativo'?'#EAF3DE':'#F1EFE8', e.situacao==='ativo'?'#3B6D11':'#888780')}>{e.situacao||'—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== USUÁRIOS ===== */}
      {dados?.tipo === 'usuarios' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Total', val:dados.lista.length, cor:AZUL },
              { label:'Ativos', val:dados.ativos, cor:VERDE },
              { label:'Desligados', val:dados.desligados, cor:'#888780' },
            ].map(m => (
              <div key={m.label} style={s.metric()}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Faixa etária</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {Object.entries(dados.faixas).filter(([,v])=>v>0).map(([f,v]) => (
                  <div key={f} style={{ background:'#EAF3DE', borderRadius:8, padding:'8px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'#888780' }}>{f} anos</div>
                    <div style={{ fontSize:18, fontWeight:700, color:VERDE }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Por projeto</div>
              {Object.entries(dados.porProjeto).sort((a,b)=>b[1]-a[1]).map(([p,q]) => (
                <div key={p} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{p}</span><span style={{ fontWeight:600, color:AZUL }}>{q}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Lista de usuários ({dados.lista.length})</div>
            <div style={{ maxHeight:400, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead style={{ position:'sticky', top:0 }}><tr>{['Nome','Projeto','Nascimento','Ingresso','Situação'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dados.lista.map((u,i) => (
                    <tr key={u.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, fontWeight:500 }}>{u.nome}</td>
                      <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{u.projeto?.nome||'—'}</td>
                      <td style={s.td}>{fmtData(u.data_nascimento)}</td>
                      <td style={s.td}>{fmtData(u.data_ingresso)}</td>
                      <td style={s.td}><span style={s.badge(u.situacao==='ativo'?'#EAF3DE':'#F1EFE8', u.situacao==='ativo'?'#3B6D11':'#888780')}>{u.situacao}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== ATENDIMENTOS ===== */}
      {dados?.tipo === 'atendimentos' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Atendimentos', val:dados.lista.length, cor:AZUL },
              { label:'Participantes', val:dados.totalPart, cor:VERDE },
            ].map(m => (
              <div key={m.label} style={s.metric()}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Por tipo</div>
              {Object.entries(dados.porTipo).sort((a,b)=>b[1]-a[1]).map(([t,q]) => (
                <div key={t} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{t}</span><span style={{ fontWeight:600, color:AZUL }}>{q}</span>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Por projeto</div>
              {Object.entries(dados.porProjeto).sort((a,b)=>b[1].qtd-a[1].qtd).map(([p,v]) => (
                <div key={p} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{p}</span>
                  <span style={{ color:'#888780', fontSize:11 }}>{v.qtd} atend. · {v.participantes} part.</span>
                </div>
              ))}
            </div>
          </div>
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Lista de atendimentos ({dados.lista.length})</div>
            <div style={{ maxHeight:400, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead style={{ position:'sticky', top:0 }}><tr>{['Data','Projeto','Tipo','Tema','Participantes','Profissional'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dados.lista.map((a,i) => (
                    <tr key={a.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                      <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{a.projeto?.nome||'—'}</td>
                      <td style={s.td}>{a.tipo_atend}</td>
                      <td style={{ ...s.td, color:'#888780' }}>{a.tema||'—'}</td>
                      <td style={{ ...s.td, textAlign:'center', fontWeight:500 }}>{a.qtd_participantes||'—'}</td>
                      <td style={s.td}>{a.profissional?.nome?.split(' ').slice(0,2).join(' ')||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== DOAÇÕES ===== */}
      {dados?.tipo === 'doacoes' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Doações', val:dados.lista.length, cor:AZUL },
              { label:'Valor estimado', val:fmt(dados.totalEstimado), cor:VERDE },
            ].map(m => (
              <div key={m.label} style={s.metric()}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:dados.lista.length>0?16:16, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Por categoria</div>
              {Object.entries(dados.porCategoria).sort((a,b)=>b[1]-a[1]).map(([c,q]) => (
                <div key={c} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{c}</span><span style={{ fontWeight:600, color:AZUL }}>{q}</span>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Por doador</div>
              {Object.entries(dados.porDoador).sort((a,b)=>b[1]-a[1]).map(([d,q]) => (
                <div key={d} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{d}</span><span style={{ fontWeight:600, color:AZUL }}>{q}</span>
                </div>
              ))}
            </div>
          </div>
          {dados.lista.length === 0 ? (
            <div style={{ ...s.card, textAlign:'center', padding:'2rem', color:'#888780' }}>Nenhuma doação no período selecionado.</div>
          ) : (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Lista de doações ({dados.lista.length})</div>
              <div style={{ maxHeight:400, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead style={{ position:'sticky', top:0 }}><tr>{['Data','Doador','Categoria','Projeto','Valor est.'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {dados.lista.map((d,i) => (
                      <tr key={d.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                        <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(d.data_doacao)}</td>
                        <td style={{ ...s.td, fontWeight:500 }}>{d.doador}</td>
                        <td style={s.td}><span style={s.badge('#EAF3DE','#3B6D11')}>{d.categoria}</span></td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{d.projeto?.nome||'—'}</td>
                        <td style={{ ...s.td, color:VERDE, fontWeight:500 }}>{d.valor_estimado ? fmt(d.valor_estimado) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
