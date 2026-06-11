import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

const TIPOS = ['emenda','edital','fomento','colaboracao','convenio','parceria','outro']
const TIPO_LABEL = {
  emenda: 'Emenda Parlamentar',
  edital: 'Edital',
  fomento: 'Termo de Fomento',
  colaboracao: 'Termo de Colaboração',
  convenio: 'Convênio',
  parceria: 'Parceria Específica',
  outro: 'Outro',
}

const SITUACOES = [
  'em elaboração',
  'submetido',
  'aprovado',
  'em execução',
  'prestação pendente',
  'encerrado',
  'cancelado',
  'não aprovado',
]

const SITUACAO_COR = {
  'em elaboração':    ['#F1EFE8','#888780'],
  'submetido':        ['#E6F1FB','#185FA5'],
  'aprovado':         ['#EAF3DE','#3B6D11'],
  'em execução':      ['#FAEEDA','#854F0B'],
  'prestação pendente':['#FEF2F2','#A32D2D'],
  'encerrado':        ['#F1EFE8','#5F5E5A'],
  'cancelado':        ['#FCEBEB','#A32D2D'],
  'não aprovado':     ['#F1EFE8','#888780'],
}

// Situações que mostram campos de execução (conta, nº termo, vigência etc.)
const SITUACAO_EXECUCAO = ['aprovado', 'em execução', 'prestação pendente', 'encerrado']

const FORM_VAZIO = {
  tipo: 'edital',
  nome_projeto: '',
  situacao: 'em elaboração',
  orgao_concedente: '',
  objeto: '',
  observacoes: '',
  // Campos de execução — só aparecem quando aprovado/em execução
  conta_id: '',
  num_termo: '',
  num_processo: '',
  responsavel: '',
  valor_aprovado: '',
  valor_recebido: '',
  vigencia_inicio: '',
  vigencia_fim: '',
  parlamentar: '',
}

export default function Parcerias() {
  const navigate = useNavigate()
  const [parcerias, setParcerias] = useState([])
  const [contas, setContas] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('parcerias')
      .select('*, conta:contas(id,nome,banco,agencia,conta_num)')
      .order('nome_projeto')
    setParcerias(data || [])
    const { data: contsData } = await supabase.from('contas').select('id,nome,banco').order('nome')
    setContas(contsData || [])
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const isExecucao = SITUACAO_EXECUCAO.includes(form.situacao)
    const dados = {
      tipo: form.tipo,
      nome_projeto: form.nome_projeto,
      situacao: form.situacao,
      orgao_concedente: form.orgao_concedente || null,
      objeto: form.objeto || null,
      observacoes: form.observacoes || null,
      conta_id: isExecucao && form.conta_id ? parseInt(form.conta_id) : null,
      num_termo: isExecucao ? form.num_termo || null : null,
      num_processo: isExecucao ? form.num_processo || null : null,
      responsavel: isExecucao ? form.responsavel || null : null,
      valor_aprovado: isExecucao && form.valor_aprovado ? (parseFloat(form.valor_aprovado) || 0) : null,
      valor_recebido: isExecucao && form.valor_recebido ? (parseFloat(form.valor_recebido) || 0) : null,
      vigencia_inicio: isExecucao && form.vigencia_inicio ? form.vigencia_inicio : null,
      vigencia_fim: isExecucao && form.vigencia_fim ? form.vigencia_fim : null,
      parlamentar: form.tipo === 'emenda' ? form.parlamentar || null : null,
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('parcerias').update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from('parcerias').insert(dados))
    }
    if (error) setMsg('Erro: ' + error.message)
    else {
      setMsg('Salvo!')
      setForm(FORM_VAZIO)
      setEditando(null)
      setMostrarForm(false)
      carregar()
    }
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  function editar(p) {
    setForm({
      tipo: p.tipo || 'edital',
      nome_projeto: p.nome_projeto || '',
      situacao: p.situacao || 'em elaboração',
      orgao_concedente: p.orgao_concedente || '',
      objeto: p.objeto || '',
      observacoes: p.observacoes || '',
      conta_id: p.conta_id || '',
      num_termo: p.num_termo || '',
      num_processo: p.num_processo || '',
      responsavel: p.responsavel || '',
      valor_aprovado: p.valor_aprovado || '',
      valor_recebido: p.valor_recebido || '',
      vigencia_inicio: p.vigencia_inicio || '',
      vigencia_fim: p.vigencia_fim || '',
      parlamentar: p.parlamentar || '',
    })
    setEditando(p.id)
    setMostrarForm(true)
  }

  const fmt = v => v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const isExecucao = SITUACAO_EXECUCAO.includes(form.situacao)

  const grupos = {
    'Candidatura': ['em elaboração', 'submetido', 'não aprovado', 'cancelado'],
    'Ativa': ['aprovado', 'em execução', 'prestação pendente'],
    'Encerrada': ['encerrado'],
  }

  const lista = filtro === 'todas' ? parcerias : parcerias.filter(p => p.situacao === filtro)

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    textarea: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box', resize:'vertical' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    tab: ativo => ({ padding:'5px 12px', fontSize:11, borderRadius:8, border:`0.5px solid ${ativo?LARANJA:'#D3D1C7'}`, background:ativo?LARANJA:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    secao: { fontSize:11, fontWeight:600, color:'#5F5E5A', borderLeft:`3px solid ${LARANJA}`, paddingLeft:8, margin:'14px 0 8px' },
  }

  async function excluir(id) {
    
    await supabase.from('parcerias').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }


  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Parcerias, Emendas e Editais</div>
          <div style={{ fontSize:12, color:'#888780', marginTop:2 }}>Instrumentos jurídicos da CAPETTE</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO) }}
          style={s.btn(mostrarForm ? '#F1EFE8' : LARANJA, mostrarForm ? '#5F5E5A' : '#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Novo instrumento'}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Formulário */}
      {mostrarForm && (
        <div style={{ ...s.card, borderColor:'#F4C88A' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>
            {editando ? 'Editar instrumento' : 'Novo instrumento'}
          </div>
          <form onSubmit={salvar}>

            {/* Dados básicos — sempre visíveis */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Tipo *</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={s.input} required>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Nome / Identificação *</label>
                <input value={form.nome_projeto} onChange={e=>setForm(f=>({...f,nome_projeto:e.target.value}))} placeholder="Ex: Edital CMDCA 001/2026, Emenda Michel Jahara 2026..." style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Situação *</label>
                <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input} required>
                  {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {form.tipo === 'emenda' && (
              <div style={{ marginBottom:10 }}>
                <label style={s.label}>Parlamentar / Origem</label>
                <input value={form.parlamentar} onChange={e=>setForm(f=>({...f,parlamentar:e.target.value}))} placeholder="Nome do parlamentar ou origem da emenda" style={s.input} />
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Órgão concedente / Parceiro</label>
                <input value={form.orgao_concedente} onChange={e=>setForm(f=>({...f,orgao_concedente:e.target.value}))} placeholder="Ex: SMASDH, CMDCA, Ministério..." style={s.input} />
              </div>
              <div>
                <label style={s.label}>Objeto resumido</label>
                <input value={form.objeto} onChange={e=>setForm(f=>({...f,objeto:e.target.value}))} placeholder="O que será executado..." style={s.input} />
              </div>
            </div>

            {/* Campos de execução — só aparecem quando aprovado/em execução/etc */}
            {isExecucao && (
              <>
                <div style={s.secao}>Dados do instrumento aprovado</div>
                <div style={{ background:'#FAFAF8', borderRadius:10, padding:12, marginBottom:10 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                    <div>
                      <label style={s.label}>Nº do Termo / Instrumento</label>
                      <input value={form.num_termo} onChange={e=>setForm(f=>({...f,num_termo:e.target.value}))} placeholder="Ex: 123456/2026" style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Nº do Processo</label>
                      <input value={form.num_processo} onChange={e=>setForm(f=>({...f,num_processo:e.target.value}))} placeholder="Ex: 71000.123456/2026" style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Responsável pela parceria</label>
                      <input value={form.responsavel} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Nome do responsável" style={s.input} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                    <div>
                      <label style={s.label}>Valor aprovado (R$)</label>
                      <input type="number" step="0.01" value={form.valor_aprovado} onChange={e=>setForm(f=>({...f,valor_aprovado:e.target.value}))} placeholder="0,00" style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Valor recebido (R$)</label>
                      <input type="number" step="0.01" value={form.valor_recebido} onChange={e=>setForm(f=>({...f,valor_recebido:e.target.value}))} placeholder="0,00" style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Vigência início</label>
                      <input type="date" value={form.vigencia_inicio} onChange={e=>setForm(f=>({...f,vigencia_inicio:e.target.value}))} style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Vigência fim</label>
                      <input type="date" value={form.vigencia_fim} onChange={e=>setForm(f=>({...f,vigencia_fim:e.target.value}))} style={s.input} />
                    </div>
                  </div>
                  <div>
                    <label style={s.label}>Conta bancária vinculada</label>
                    <select value={form.conta_id} onChange={e=>setForm(f=>({...f,conta_id:e.target.value}))} style={s.input}>
                      <option value="">Selecione uma conta...</option>
                      {contas.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.banco}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {!isExecucao && (
              <div style={{ background:'#E6F1FB', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:11, color:'#185FA5' }}>
                ℹ Campos como conta bancária, nº do termo, valor aprovado e vigência aparecerão quando a situação for <strong>Aprovado</strong> ou <strong>Em execução</strong>.
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Informações adicionais..." style={s.input} />
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':LARANJA)}>
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : '+ Cadastrar'}
              </button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditando(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:'1.25rem' }}>
        {Object.entries(grupos).map(([grupo, sits]) => {
          const count = parcerias.filter(p => sits.includes(p.situacao)).length
          if (count === 0) return null
          return (
            <div key={grupo} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{grupo}</div>
              <div style={{ fontSize:18, fontWeight:600, color:grupo==='Ativa'?LARANJA:grupo==='Encerrada'?'#888780':AZUL }}>{count}</div>
            </div>
          )
        })}
        <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>Total</div>
          <div style={{ fontSize:18, fontWeight:600, color:'#2C2C2A' }}>{parcerias.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setFiltro('todas')} style={s.tab(filtro==='todas')}>Todas</button>
        {SITUACOES.map(sit => {
          const count = parcerias.filter(p => p.situacao === sit).length
          if (count === 0) return null
          return <button key={sit} onClick={() => setFiltro(sit)} style={s.tab(filtro===sit)}>{sit.charAt(0).toUpperCase()+sit.slice(1)} ({count})</button>
        })}
      </div>

      {/* Cards */}
      {lista.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
          <div style={{ marginBottom:8 }}><i className="ti ti-clipboard-list" style={{fontSize:32, color:'#C8C6BC'}} /></div>
          <div style={{ fontSize:13 }}>Nenhum instrumento cadastrado ainda.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:'1rem' }}>
          {lista.map(p => {
            const [bg, cor] = SITUACAO_COR[p.situacao] || ['#F1EFE8','#5F5E5A']
            const temExec = SITUACAO_EXECUCAO.includes(p.situacao)
            const pctExec = p.valor_aprovado && p.valor_recebido ? Math.round(Number(p.valor_recebido)/Number(p.valor_aprovado)*100) : 0
            return (
              <div key={p.id} style={{ background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', overflow:'hidden', cursor:'pointer' }}
                onClick={() => navigate(`/parcerias/${p.id}`)}>
                <div style={{ background:`${LARANJA}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{TIPO_LABEL[p.tipo]||p.tipo}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A' }}>{p.nome_projeto}</div>
                    {p.parlamentar && <div style={{ fontSize:10, color:'#888780' }}>{p.parlamentar}</div>}
                  </div>
                  <span style={s.badge(bg,cor)}>{p.situacao}</span>
                </div>
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Órgão</div>
                      <div style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.orgao_concedente||'—'}</div>
                    </div>
                    {temExec ? (
                      <>
                        <div>
                          <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Valor aprovado</div>
                          <div style={{ fontSize:11, fontWeight:500 }}>{fmt(p.valor_aprovado)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Vigência</div>
                          <div style={{ fontSize:10 }}>{fmtData(p.vigencia_inicio)} a {fmtData(p.vigencia_fim)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Conta</div>
                          <div style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.conta?.nome||'—'}</div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Objeto</div>
                        <div style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.objeto||'—'}</div>
                      </div>
                    )}
                  </div>
                  {temExec && p.valor_aprovado && (
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888780', marginBottom:3 }}>
                        <span>Recebido</span><span>{pctExec}%</span>
                      </div>
                      <div style={{ height:4, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:pctExec+'%', background:pctExec>=100?VERDE:LARANJA, borderRadius:99 }} />
                      </div>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={e=>{e.stopPropagation();navigate(`/parcerias/${p.id}`)}} style={{ ...s.btn(LARANJA), flex:1, fontSize:11 }}>Ver detalhes →</button>
                    <button onClick={e=>{e.stopPropagation();editar(p)}} style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Editar</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Modal confirmação exclusão */}
      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ marginBottom:8 }}><i className="ti ti-inbox" style={{fontSize:32, color:'#C8C6BC'}} /></div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Confirmar exclusão</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.5rem' }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir)}
                style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'#E8212A', color:'#fff', fontWeight:600, cursor:'pointer' }}>
                Excluir
              </button>
              <button onClick={() => setConfirmandoExcluir(null)}
                style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
