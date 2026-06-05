import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F', ROXO = '#8B2FC9'

const TIPOS = ['evento', 'campanha']
const TIPO_LABEL = { evento: 'Evento', campanha: 'Campanha' }

const STATUS_EVENTO = ['planejado', 'em andamento', 'concluído', 'cancelado']
const STATUS_CAMPANHA = ['ativa', 'pausada', 'concluída', 'cancelada']

const STATUS_COR = {
  'planejado':    ['#E6F1FB','#185FA5'],
  'em andamento': ['#FAEEDA','#854F0B'],
  'ativa':        ['#FAEEDA','#854F0B'],
  'concluído':    ['#EAF3DE','#3B6D11'],
  'concluída':    ['#EAF3DE','#3B6D11'],
  'pausada':      ['#F1EFE8','#888780'],
  'cancelado':    ['#FCEBEB','#A32D2D'],
  'cancelada':    ['#FCEBEB','#A32D2D'],
}

const FORM_VAZIO = {
  tipo: 'evento',
  nome: '',
  descricao: '',
  objetivo: '',
  data_inicio: '',
  data_fim: '',
  meta_financeira: '',
  status: 'planejado',
  observacoes: '',
}

export default function EventosCampanhas() {
  const { user } = useAuth()
  const [lista, setLista] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [sel, setSel] = useState(null)
  const [movs, setMovs] = useState([])
  const [loadingMovs, setLoadingMovs] = useState(false)
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [ev, ca] = await Promise.all([
      supabase.from('eventos').select('*').order('data_inicio', { ascending: false }),
      supabase.from('campanhas').select('*').order('data_inicio', { ascending: false }),
    ])
    const eventos = (ev.data || []).map(e => ({ ...e, tipo: 'evento' }))
    const campanhas = (ca.data || []).map(c => ({ ...c, tipo: 'campanha' }))
    setLista([...eventos, ...campanhas].sort((a,b) => {
      const da = a.data_inicio || '0'
      const db = b.data_inicio || '0'
      return db.localeCompare(da)
    }))
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const tabela = form.tipo === 'evento' ? 'eventos' : 'campanhas'
    const dados = {
      nome: form.nome,
      descricao: form.descricao || null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      meta_financeira: form.meta_financeira ? parseFloat(form.meta_financeira) : null,
      status: form.status,
      observacoes: form.observacoes || null,
      criado_por: user.id,
    }
    if (form.tipo === 'campanha') dados.objetivo = form.objetivo || null

    let error
    if (editando) {
      ;({ error } = await supabase.from(tabela).update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from(tabela).insert(dados))
    }

    if (error) setMsg('Erro: ' + error.message)
    else { setMsg('✅ Salvo!'); setForm(FORM_VAZIO); setEditando(null); setMostrarForm(false); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function abrirDetalhe(item) {
    setSel(item)
    setLoadingMovs(true)
    const campo = item.tipo === 'evento' ? 'evento_id' : 'campanha_id'
    const { data } = await supabase.from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo)')
      .eq(campo, item.id)
      .order('data')
    setMovs(data || [])
    setLoadingMovs(false)
  }

  function editar(item) {
    setForm({
      tipo: item.tipo,
      nome: item.nome || '',
      descricao: item.descricao || '',
      objetivo: item.objetivo || '',
      data_inicio: item.data_inicio || '',
      data_fim: item.data_fim || '',
      meta_financeira: item.meta_financeira || '',
      status: item.status || 'planejado',
      observacoes: item.observacoes || '',
    })
    setEditando(item.id)
    setMostrarForm(true)
    setSel(null)
  }

  const fmt = v => v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const statusOpcoes = form.tipo === 'evento' ? STATUS_EVENTO : STATUS_CAMPANHA

  const listaFiltrada = lista.filter(item => {
    if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false
    if (filtroStatus !== 'todos' && item.status !== filtroStatus) return false
    return true
  })

  const totalMovs = movs.reduce((a,m) => a + Number(m.valor), 0)
  const totalEntradas = movs.filter(m => Number(m.valor) > 0).reduce((a,m) => a + Number(m.valor), 0)
  const totalSaidas = Math.abs(movs.filter(m => Number(m.valor) < 0).reduce((a,m) => a + Number(m.valor), 0))

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    tab: (ativo,cor=AZUL) => ({ padding:'5px 12px', fontSize:11, borderRadius:8, border:`0.5px solid ${ativo?cor:'#D3D1C7'}`, background:ativo?cor:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer', whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
  }

  async function excluir(id) {
    
    await supabase.from('eventos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }


  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Eventos e Campanhas</div>
          <div style={{ fontSize:12, color:'#888780' }}>{lista.filter(i=>i.tipo==='evento').length} eventos · {lista.filter(i=>i.tipo==='campanha').length} campanhas</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO); setSel(null) }}
          style={s.btn(mostrarForm?'#F1EFE8':ROXO, mostrarForm?'#5F5E5A':'#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Novo'}
        </button>
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:msg.includes('✅')?'#F2FAE8':'#FEF2F2', color:msg.includes('✅')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {/* Formulário */}
      {mostrarForm && (
        <div style={{ ...s.card, borderColor:'#C9B3E8' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>{editando ? 'Editar' : 'Novo evento ou campanha'}</div>
          <form onSubmit={salvar}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Tipo *</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value,status:e.target.value==='evento'?'planejado':'ativa'}))} style={s.input}>
                  <option value="evento">Evento</option>
                  <option value="campanha">Campanha</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Nome *</label>
                <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} style={s.input} required placeholder={form.tipo==='evento'?'Ex: Festa Junina 2026':'Ex: Campanha de alimentos'} />
              </div>
              <div>
                <label style={s.label}>Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={s.input}>
                  {statusOpcoes.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            {form.tipo === 'campanha' && (
              <div style={{ marginBottom:10 }}>
                <label style={s.label}>Objetivo</label>
                <input value={form.objetivo} onChange={e=>setForm(f=>({...f,objetivo:e.target.value}))} style={s.input} placeholder="Objetivo da campanha..." />
              </div>
            )}
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Descrição</label>
              <input value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} style={s.input} placeholder="Descrição..." />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={s.label}>Data início</label>
                <input type="date" value={form.data_inicio} onChange={e=>setForm(f=>({...f,data_inicio:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Data fim</label>
                <input type="date" value={form.data_fim} onChange={e=>setForm(f=>({...f,data_fim:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Meta financeira (R$)</label>
                <input type="number" step="0.01" value={form.meta_financeira} onChange={e=>setForm(f=>({...f,meta_financeira:e.target.value}))} style={s.input} placeholder="Opcional" />
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':ROXO)}>{salvando?'Salvando...':editando?'💾 Salvar':'+ Cadastrar'}</button>
              <button type="button" onClick={()=>{setMostrarForm(false);setEditando(null)}} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={()=>setFiltroTipo('todos')} style={s.tab(filtroTipo==='todos')}>Todos ({lista.length})</button>
        <button onClick={()=>setFiltroTipo('evento')} style={s.tab(filtroTipo==='evento', LARANJA)}>Eventos ({lista.filter(i=>i.tipo==='evento').length})</button>
        <button onClick={()=>setFiltroTipo('campanha')} style={s.tab(filtroTipo==='campanha', ROXO)}>Campanhas ({lista.filter(i=>i.tipo==='campanha').length})</button>
        <div style={{ width:1, background:'#E0DDD5', margin:'0 4px' }} />
        {['planejado','em andamento','ativa','concluído','concluída'].map(st => {
          const count = lista.filter(i=>i.status===st).length
          if (!count) return null
          return <button key={st} onClick={()=>setFiltroStatus(filtroStatus===st?'todos':st)} style={s.tab(filtroStatus===st,'#888780')}>{st} ({count})</button>
        })}
        {filtroStatus !== 'todos' && <button onClick={()=>setFiltroStatus('todos')} style={s.btn('#F1EFE8','#5F5E5A')}>✕ Limpar</button>}
      </div>

      {/* Detalhe */}
      {sel && (
        <div style={{ ...s.card, borderColor: sel.tipo==='evento'?'#F4C88A':'#C9B3E8', marginBottom:'1.25rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <span style={s.badge(sel.tipo==='evento'?'#FAEEDA':'#EEEDFE', sel.tipo==='evento'?'#854F0B':'#534AB7')}>{TIPO_LABEL[sel.tipo]}</span>
              <div style={{ fontSize:15, fontWeight:600, marginTop:4 }}>{sel.nome}</div>
              {sel.descricao && <div style={{ fontSize:12, color:'#5F5E5A', marginTop:2 }}>{sel.descricao}</div>}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>editar(sel)} style={s.btn(AZUL)}>Editar</button>
              <button onClick={()=>setSel(null)} style={s.btn('#F1EFE8','#5F5E5A')}>✕ Fechar</button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:12 }}>
            {[
              ['Status', sel.status],
              ['Período', sel.data_inicio ? `${fmtData(sel.data_inicio)} a ${fmtData(sel.data_fim)}` : '—'],
              ['Meta financeira', fmt(sel.meta_financeira)],
              ...(sel.objetivo ? [['Objetivo', sel.objetivo]] : []),
            ].map(([l,v]) => (
              <div key={l} style={{ background:'#F8F7F2', borderRadius:8, padding:'6px 10px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Movimentações vinculadas */}
          <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>Movimentações financeiras vinculadas</div>
          {loadingMovs ? (
            <div style={{ fontSize:12, color:'#888780' }}>Carregando...</div>
          ) : movs.length === 0 ? (
            <div style={{ fontSize:12, color:'#888780' }}>Nenhuma movimentação vinculada a este {TIPO_LABEL[sel.tipo].toLowerCase()}.</div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
                {[
                  { label:'Entradas', val:fmt(totalEntradas), cor:VERDE },
                  { label:'Saídas', val:fmt(totalSaidas), cor:VERMELHO },
                  { label:'Saldo', val:fmt(totalMovs), cor:totalMovs>=0?AZUL:VERMELHO },
                ].map(m => (
                  <div key={m.label} style={{ background:'#F8F7F2', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{m.label}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:m.cor }}>{m.val}</div>
                  </div>
                ))}
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['Data','Descrição','Categoria','Valor'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {movs.map((m,i) => (
                    <tr key={m.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(m.data)}</td>
                      <td style={{ ...s.td, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</td>
                      <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{m.categoria?.nome||'—'}</td>
                      <td style={{ ...s.td, color:Number(m.valor)>=0?VERDE:VERMELHO, fontWeight:500, textAlign:'right' }}>{fmt(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Lista */}
      {listaFiltrada.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📅</div>
          <div style={{ fontSize:13 }}>Nenhum item encontrado.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
          {listaFiltrada.map(item => {
            const [bg,cor] = STATUS_COR[item.status]||['#F1EFE8','#888780']
            return (
              <div key={`${item.tipo}-${item.id}`} style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, overflow:'hidden', cursor:'pointer' }}
                onClick={() => abrirDetalhe(item)}>
                <div style={{ background:item.tipo==='evento'?`${LARANJA}15`:`${ROXO}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <span style={s.badge(item.tipo==='evento'?'#FAEEDA':'#EEEDFE', item.tipo==='evento'?'#854F0B':'#534AB7')}>{TIPO_LABEL[item.tipo]}</span>
                    <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A', marginTop:4 }}>{item.nome}</div>
                  </div>
                  <span style={s.badge(bg,cor)}>{item.status}</span>
                </div>
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Período</div>
                      <div style={{ fontSize:11 }}>{item.data_inicio ? `${fmtData(item.data_inicio)}${item.data_fim?' a '+fmtData(item.data_fim):''}` : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Meta financeira</div>
                      <div style={{ fontSize:11, fontWeight:500 }}>{fmt(item.meta_financeira)}</div>
                    </div>
                  </div>
                  {item.descricao && <div style={{ fontSize:11, color:'#888780', marginBottom:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.descricao}</div>}
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={e=>{e.stopPropagation();abrirDetalhe(item)}} style={{ ...s.btn(item.tipo==='evento'?LARANJA:ROXO), flex:1, fontSize:11 }}>Ver detalhes →</button>
                    <button onClick={e=>{e.stopPropagation();editar(item)}} style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Editar</button>
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
            <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
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
