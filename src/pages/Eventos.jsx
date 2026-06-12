import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { gerarPDFEvento } from '../lib/pdf'

const STATUS = ['planejado','em andamento','concluído','cancelado']
const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

export default function Eventos() {
  const { user } = useAuth()
  const [lista, setLista] = useState([])
  const [form, setForm] = useState({ nome: '', descricao: '', data_inicio: '', data_fim: '', meta_financeira: '', status: 'planejado', observacoes: '' })
  const [msg, setMsg] = useState('')
  const [eventoSel, setEventoSel] = useState(null)
  const [movs, setMovs] = useState([])
  const [incluirAss, setIncluirAss] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('eventos').select('*').order('data_inicio', { ascending: false })
    setLista(data || [])
  }

  async function salvar(e) {
    e.preventDefault()
    const dados = { ...form, criado_por: user.id }
    if (!dados.meta_financeira) delete dados.meta_financeira
    if (!dados.data_inicio) delete dados.data_inicio
    if (!dados.data_fim) delete dados.data_fim
    const { error } = await supabase.from('eventos').insert(dados)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Evento criado!')
    setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', meta_financeira: '', status: 'planejado', observacoes: '' })
    carregar()
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function abrirEvento(ev) {
    setLoading(true)
    setEventoSel(ev)
    const { data } = await fetchAll(() => supabase
      .from('extrato_movs')
      .select('*, categoria:categorias(nome), subcategoria:subcategorias(nome)')
      .eq('evento_id', ev.id)
      .order('data'))
    setMovs(data || [])
    setLoading(false)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const statusCor = { 'planejado': ['#E6F1FB','#185FA5'], 'em andamento': ['#EAF3DE','#3B6D11'], 'concluído': ['#F1EFE8','#5F5E5A'], 'cancelado': ['#FCEBEB','#A32D2D'] }

  const s = {
    card: { background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: 10 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    input: { width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E8E6DE' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E8E6DE', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
  }

  if (eventoSel) {
    const entradas = movs.filter(m => m.valor > 0)
    const saidas = movs.filter(m => m.valor < 0)
    const totalEnt = entradas.reduce((a,m)=>a+Number(m.valor),0)
    const totalSai = Math.abs(saidas.reduce((a,m)=>a+Number(m.valor),0))

    return (
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <button onClick={() => { setEventoSel(null); setMovs([]) }}
            style={{ padding: '5px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>← Voltar</button>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em' }}>{eventoSel.nome}</div>
          <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#5F5E5A', cursor:'pointer', marginLeft:'auto' }}>
            <input type="checkbox" checked={incluirAss} onChange={e=>setIncluirAss(e.target.checked)} style={{ accentColor:'#0E7EA8' }} /> Para assinatura
          </label>
          <button onClick={() => gerarPDFEvento(eventoSel, entradas, saidas, { assinaturas: incluirAss })}
            style={{ padding: '5px 13px', fontSize: 12, borderRadius: 8, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer' }}>
            Exportar PDF
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            { label: 'Total entradas', val: fmt(totalEnt), cor: VERDE },
            { label: 'Total despesas', val: fmt(totalSai), cor: VERMELHO },
            { label: 'Saldo do evento', val: fmt(totalEnt-totalSai), cor: totalEnt-totalSai>=0?VERDE:VERMELHO },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '.85rem 1rem', border: '0.5px solid #E8E6DE', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
              <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: m.cor }}>{m.val}</div>
            </div>
          ))}
        </div>

        {loading ? <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div> : (
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Movimentações do evento ({movs.length})</div>
            {movs.length === 0 ? (
              <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhuma movimentação vinculada a este evento ainda.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Data','Descrição','Categoria','Tipo','Valor'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {movs.map(m => (
                    <tr key={m.id}>
                      <td style={s.td}>{new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={s.td}>{m.descricao}</td>
                      <td style={s.td}>{m.categoria?.nome||'—'}</td>
                      <td style={s.td}><span style={s.badge(m.valor>=0?'#EAF3DE':'#FCEBEB',m.valor>=0?'#3B6D11':'#A32D2D')}>{m.valor>=0?'Entrada':'Saída'}</span></td>
                      <td style={{ ...s.td, fontWeight: 500, color: m.valor>=0?VERDE:VERMELHO }}>{m.valor>=0?'+':''}{fmt(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>Eventos</div>

      {lista.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          {lista.map(ev => {
            const [bg, cor] = statusCor[ev.status] || ['#F1EFE8','#5F5E5A']
            return (
              <div key={ev.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{ev.nome}</div>
                  <span style={s.badge(bg, cor)}>{ev.status}</span>
                </div>
                {ev.descricao && <div style={{ fontSize: 11, color: '#888780', marginBottom: 6 }}>{ev.descricao}</div>}
                {ev.data_inicio && <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 4 }}><i className="ti ti-calendar" style={{marginRight:4}} /> {new Date(ev.data_inicio+'T12:00:00').toLocaleDateString('pt-BR')}{ev.data_fim?' → '+new Date(ev.data_fim+'T12:00:00').toLocaleDateString('pt-BR'):''}</div>}
                {ev.meta_financeira > 0 && <div style={{ fontSize: 11, color: '#5F5E5A' }}><i className="ti ti-target" style={{marginRight:4}} /> Meta: {fmt(ev.meta_financeira)}</div>}
                <button onClick={() => abrirEvento(ev)}
                  style={{ marginTop: 8, width: '100%', padding: '5px', fontSize: 11, borderRadius: 8, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer' }}>
                  Ver movimentações →
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Novo evento</div>
        <form onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: 'span 2' }}><label style={s.label}>Nome do evento</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Festa Junina 2026" required style={s.input} /></div>
            <div><label style={s.label}>Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={s.input}>
                {STATUS.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={s.label}>Meta financeira (R$)</label><input type="number" step="0.01" value={form.meta_financeira} onChange={e=>setForm(f=>({...f,meta_financeira:e.target.value}))} placeholder="0,00" style={s.input} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={s.label}>Data início</label><input type="date" value={form.data_inicio} onChange={e=>setForm(f=>({...f,data_inicio:e.target.value}))} style={s.input} /></div>
            <div><label style={s.label}>Data fim</label><input type="date" value={form.data_fim} onChange={e=>setForm(f=>({...f,data_fim:e.target.value}))} style={s.input} /></div>
            <div><label style={s.label}>Observações</label><input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Observações" style={s.input} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>Descrição</label>
            <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descrição do evento" rows={2} style={{ ...s.input, resize: 'vertical' }} />
          </div>
          {msg && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msg.includes('Erro')?'#FEF2F2':'#F2FAE8', color: msg.includes('Erro')?'#A32D2D':'#3B6D11' }}>{msg}</div>}
          <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer' }}>Criar evento</button>
        </form>
      </div>
    </div>
  )
}
