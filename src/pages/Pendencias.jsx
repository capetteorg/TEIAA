import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

const GRAVIDADE = {
  critica:    { label:'Crítica',    bg:'#FCEBEB', cor:'#A32D2D' },
  atencao:    { label:'Atenção',    bg:'#FAEEDA', cor:'#854F0B' },
  informativa:{ label:'Informativa',bg:'#E6F1FB', cor:'#185FA5' },
}

const TIPO = {
  financeira: { label:'Financeiro', icon:'ti-cash' },
  cobranca:   { label:'Cobrança',   icon:'ti-receipt-2' },
  projeto:    { label:'Projeto',    icon:'ti-folder' },
  documental: { label:'Documento',  icon:'ti-file' },
}

export default function Pendencias() {
  const navigate = useNavigate()
  const [pendencias, setPendencias] = useState([])
  const [loading, setLoading] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroGravidade, setFiltroGravidade] = useState('todos')
  const [filtroResolvida, setFiltroResolvida] = useState('pendentes')
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [filtroResolvida])

  async function carregar() {
    setLoading(true)
    let q = supabase.from('pendencias').select('*').order('criado_em', { ascending: false })
    if (filtroResolvida === 'pendentes') q = q.eq('resolvida', false)
    if (filtroResolvida === 'resolvidas') q = q.eq('resolvida', true)
    const { data } = await q
    setPendencias(data || [])
    setLoading(false)
  }

  async function atualizar() {
    setAtualizando(true)
    await supabase.rpc('gerar_pendencias')
    await carregar()
    setAtualizando(false)
    setMsg('Pendências atualizadas!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function resolver(id) {
    await supabase.from('pendencias').update({ resolvida: true, resolvida_em: new Date().toISOString() }).eq('id', id)
    carregar()
  }

  async function reabrirPendencia(id) {
    await supabase.from('pendencias').update({ resolvida: false, resolvida_em: null }).eq('id', id)
    carregar()
  }

  const lista = pendencias.filter(p => {
    if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false
    if (filtroGravidade !== 'todos' && p.gravidade !== filtroGravidade) return false
    return true
  })

  const criticas = pendencias.filter(p => !p.resolvida && p.gravidade === 'critica').length
  const atencao = pendencias.filter(p => !p.resolvida && p.gravidade === 'atencao').length
  const informativas = pendencias.filter(p => !p.resolvida && p.gravidade === 'informativa').length

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'5px 12px', fontSize:11, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    tab: ativo => ({ padding:'5px 14px', fontSize:12, borderRadius:8, border:'0.5px solid #D3D1C7', background:ativo?AZUL:'transparent', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Pendências</div>
          <div style={{ fontSize:12, color:'#888780' }}>Itens que precisam de atenção</div>
        </div>
        <button onClick={atualizar} disabled={atualizando} style={s.btn(AZUL)}>
          {atualizando ? 'Atualizando...' : '↻ Atualizar pendências'}
        </button>
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:10, background:'#F2FAE8', color:'#3B6D11' }}>{msg}</div>}

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:'1.25rem' }}>
        {[
          { label:'Críticas', val:criticas, cor:VERMELHO, bg:'#FCEBEB' },
          { label:'Atenção', val:atencao, cor:'#854F0B', bg:'#FAEEDA' },
          { label:'Informativas', val:informativas, cor:'#185FA5', bg:'#E6F1FB' },
          { label:'Total pendentes', val:criticas+atencao+informativas, cor:'#5F5E5A', bg:'#F1EFE8' },
        ].map(m => (
          <div key={m.label} style={{ background:m.bg, borderRadius:10, padding:'.75rem 1rem', border:'0.5px solid #E0DDD5' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:4 }}>
          {[['pendentes','Pendentes'],['resolvidas','Resolvidas'],['todos','Todas']].map(([v,l]) => (
            <button key={v} onClick={() => setFiltroResolvida(v)} style={s.tab(filtroResolvida===v)}>{l}</button>
          ))}
        </div>
        <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
          style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
          <option value="todos">Todos os tipos</option>
          {Object.entries(TIPO).map(([k,v]) => <option key={k} value={k}><i className={`ti ${v.icon}`} style={{fontSize:12, marginRight:4}} /> {v.label}</option>)}
        </select>
        <select value={filtroGravidade} onChange={e=>setFiltroGravidade(e.target.value)}
          style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
          <option value="todos">Todas as gravidades</option>
          {Object.entries(GRAVIDADE).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{ fontSize:12, color:'#888780', marginLeft:'auto' }}>{lista.length} item{lista.length!==1?'s':''}</span>
      </div>

      {/* Lista */}
      <div style={s.card}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Carregando...</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#888780' }}>
            <div style={{ marginBottom:8 }}><i className="ti ti-circle-check" style={{fontSize:32, color:'#3B6D11'}} /></div>
            <div style={{ fontSize:13 }}>
              {filtroResolvida === 'pendentes' ? 'Nenhuma pendência no momento!' : 'Nenhum item encontrado.'}
            </div>
            {filtroResolvida === 'pendentes' && (
              <div style={{ fontSize:12, marginTop:4, color:'#B4B2A9' }}>Clique em "Atualizar pendências" para verificar.</div>
            )}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>{['Gravidade','Tipo','Pendência','Descrição','Criado em',''].map(h=>(
                <th key={h} style={s.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {lista.map((p,i) => {
                const grav = GRAVIDADE[p.gravidade] || GRAVIDADE.informativa
                const tipo = TIPO[p.tipo] || { label:p.tipo, icon:'ti-pin' }
                return (
                  <tr key={p.id} style={{ background:p.resolvida?'#F8F7F2':i%2===0?'#fff':'#FAFAF8', opacity:p.resolvida?0.7:1 }}>
                    <td style={s.td}>
                      <span style={s.badge(grav.bg, grav.cor)}>{grav.label}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize:12 }}><i className={`ti ${tipo.icon}`} style={{fontSize:12, marginRight:4}} /> {tipo.label}</span>
                    </td>
                    <td style={{ ...s.td, fontWeight:500, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.titulo}
                    </td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.descricao}
                    </td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780', whiteSpace:'nowrap' }}>
                      {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={s.td}>
                      <div style={{ display:'flex', gap:4 }}>
                        {p.rota_resolucao && !p.resolvida && (
                          <button onClick={() => navigate(p.rota_resolucao)} style={s.btn(AZUL)}>Resolver →</button>
                        )}
                        {!p.resolvida && (
                          <button onClick={() => resolver(p.id)} style={s.btn('#EAF3DE','#3B6D11')}><i className="ti ti-check" style={{marginRight:4}} /> OK</button>
                        )}
                        {p.resolvida && (
                          <button onClick={() => reabrirPendencia(p.id)} style={s.btn('#F1EFE8','#5F5E5A')}>Reabrir</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
