import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

const CATEGORIAS = ['Equipamento', 'Móvel', 'Imóvel', 'Veículo', 'Informática', 'Outro']
const ESTADOS = ['Ótimo', 'Bom', 'Regular', 'Ruim', 'Inativo']
const ORIGENS = ['Compra', 'Doação', 'Convênio', 'Emenda parlamentar', 'Outro']

const VIDA_UTIL = {
  'Equipamento': 10, 'Móvel': 10, 'Imóvel': 25, 'Veículo': 5, 'Informática': 3, 'Outro': 5
}

function calcularDepreciacao(bem) {
  if (!bem.data_aquisicao || !bem.valor_aquisicao || !bem.vida_util_anos) return null
  const aquisicao = new Date(bem.data_aquisicao)
  const hoje = new Date()
  const anosPassados = (hoje - aquisicao) / (1000*60*60*24*365.25)
  const depAnual = Number(bem.valor_aquisicao) / bem.vida_util_anos
  const depTotal = Math.min(depAnual * anosPassados, Number(bem.valor_aquisicao))
  const valorAtual = Math.max(0, Number(bem.valor_aquisicao) - depTotal)
  const pct = Math.min(100, Math.round(anosPassados / bem.vida_util_anos * 100))
  return { valorAtual, depTotal, pct, anosPassados: Math.round(anosPassados * 10)/10 }
}

export default function Patrimonio() {
  const { perfil } = useAuth()
  const isAdmin = perfil?.perfil === 'admin'
  const [bens, setBens] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    descricao:'', categoria:'Equipamento', marca_modelo:'', numero_serie:'',
    numero_tombamento:'', data_aquisicao:'', valor_aquisicao:'', vida_util_anos:'',
    localizacao:'', estado:'Bom', origem:'Compra', numero_nota:'', observacoes:'', ativo:true,
  })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('patrimonio').select('*').order('descricao')
    setBens(data || [])
    setLoading(false)
  }

  function abrirForm(bem=null) {
    if (bem) {
      setForm({
        descricao: bem.descricao||'', categoria: bem.categoria||'Equipamento',
        marca_modelo: bem.marca_modelo||'', numero_serie: bem.numero_serie||'',
        numero_tombamento: bem.numero_tombamento||'', data_aquisicao: bem.data_aquisicao||'',
        valor_aquisicao: bem.valor_aquisicao||'', vida_util_anos: bem.vida_util_anos||'',
        localizacao: bem.localizacao||'', estado: bem.estado||'Bom',
        origem: bem.origem||'Compra', numero_nota: bem.numero_nota||'',
        observacoes: bem.observacoes||'', ativo: bem.ativo!==false,
      })
      setEditandoId(bem.id)
    } else {
      setForm({ descricao:'', categoria:'Equipamento', marca_modelo:'', numero_serie:'',
        numero_tombamento:'', data_aquisicao:'', valor_aquisicao:'', vida_util_anos: VIDA_UTIL['Equipamento'],
        localizacao:'', estado:'Bom', origem:'Compra', numero_nota:'', observacoes:'', ativo:true })
      setEditandoId(null)
    }
    setMostrarForm(true)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      valor_aquisicao: parseFloat(form.valor_aquisicao)||null,
      vida_util_anos: parseInt(form.vida_util_anos)||null,
    }
    if (editandoId) {
      await supabase.from('patrimonio').update(dados).eq('id', editandoId)
    } else {
      await supabase.from('patrimonio').insert(dados)
    }
    setMsg('<i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Bem salvo!')
    setMostrarForm(false)
    setEditandoId(null)
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este bem?')) return
    await supabase.from('patrimonio').delete().eq('id', id)
    setBens(prev => prev.filter(b => b.id !== id))
  }

  const fmt = v => 'R$ '+Math.abs(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const bensFiltrados = bens.filter(b => !filtroCategoria || b.categoria===filtroCategoria)
  const totalValorOriginal = bens.filter(b=>b.ativo).reduce((a,b)=>a+(Number(b.valor_aquisicao)||0),0)
  const totalValorAtual = bens.filter(b=>b.ativo).reduce((a,b)=>{
    const dep = calcularDepreciacao(b)
    return a + (dep ? dep.valorAtual : Number(b.valor_aquisicao)||0)
  },0)

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
  }

  const corEstado = { 'Ótimo':VERDE, 'Bom':'#6BBF2B', 'Regular':LARANJA, 'Ruim':VERMELHO, 'Inativo':'#888780' }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Controle de Patrimônio</div>
          <div style={{ fontSize:12, color:'#888780' }}>Inventário de bens com depreciação automática</div>
        </div>
        {isAdmin && (
          <button onClick={() => abrirForm()} style={s.btn(AZUL)}>+ Cadastrar bem</button>
        )}
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:'1.25rem' }}>
        {[
          { label:'Total de bens', val:bens.filter(b=>b.ativo).length, cor:AZUL },
          { label:'Valor original', val:fmt(totalValorOriginal), cor:'#5F5E5A' },
          { label:'Valor atual (depr.)', val:fmt(totalValorAtual), cor:VERDE },
          { label:'Depreciação total', val:fmt(totalValorOriginal-totalValorAtual), cor:VERMELHO },
        ].map(m => (
          <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ height:3, borderRadius:99, background:m.cor, marginBottom:'.7rem' }} />
            <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:14, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:msg.includes('<i className="ti ti-circle-check" style={{fontSize:14, color:'#3B6D11'}} />')?'#F2FAE8':'#FEF2F2', color:msg.includes('<i className="ti ti-circle-check" style={{fontSize:14, color:'#3B6D11'}} />')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {/* Form */}
      {isAdmin && mostrarForm && (
        <div style={{ ...s.card, borderColor:AZUL+'60', marginBottom:'1.25rem' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>{editandoId?'Editar bem':'Cadastrar novo bem'}</div>
          <form onSubmit={salvar}>
            <div style={s.grupo('2fr 1fr 1fr')}>
              <div><label style={s.label}>Descrição *</label><input value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} required style={s.input} placeholder="Ex: Notebook Dell Inspiron" /></div>
              <div>
                <label style={s.label}>Categoria</label>
                <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value,vida_util_anos:VIDA_UTIL[e.target.value]||5}))} style={s.input}>
                  {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Estado</label>
                <select value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} style={s.input}>
                  {ESTADOS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div><label style={s.label}>Marca / Modelo</label><input value={form.marca_modelo} onChange={e=>setForm(f=>({...f,marca_modelo:e.target.value}))} style={s.input} /></div>
              <div><label style={s.label}>Nº de série</label><input value={form.numero_serie} onChange={e=>setForm(f=>({...f,numero_serie:e.target.value}))} style={s.input} /></div>
              <div><label style={s.label}>Nº tombamento</label><input value={form.numero_tombamento} onChange={e=>setForm(f=>({...f,numero_tombamento:e.target.value}))} style={s.input} /></div>
            </div>
            <div style={s.grupo('1fr 1fr 1fr 1fr')}>
              <div><label style={s.label}>Data de aquisição</label><input type="date" value={form.data_aquisicao} onChange={e=>setForm(f=>({...f,data_aquisicao:e.target.value}))} style={s.input} /></div>
              <div><label style={s.label}>Valor de aquisição (R$)</label><input type="number" step="0.01" value={form.valor_aquisicao} onChange={e=>setForm(f=>({...f,valor_aquisicao:e.target.value}))} style={s.input} /></div>
              <div><label style={s.label}>Vida útil (anos)</label><input type="number" value={form.vida_util_anos} onChange={e=>setForm(f=>({...f,vida_util_anos:e.target.value}))} style={s.input} /></div>
              <div>
                <label style={s.label}>Origem</label>
                <select value={form.origem} onChange={e=>setForm(f=>({...f,origem:e.target.value}))} style={s.input}>
                  {ORIGENS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={s.grupo('2fr 1fr')}>
              <div><label style={s.label}>Localização</label><input value={form.localizacao} onChange={e=>setForm(f=>({...f,localizacao:e.target.value}))} style={s.input} placeholder="Ex: Sala da administração" /></div>
              <div><label style={s.label}>Nº Nota Fiscal</label><input value={form.numero_nota} onChange={e=>setForm(f=>({...f,numero_nota:e.target.value}))} style={s.input} /></div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':AZUL)}>{salvando?'Salvando...':editandoId?'<i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar':'+ Cadastrar'}</button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditandoId(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtro */}
      <div style={{ display:'flex', gap:6, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#888780' }}>Filtrar:</span>
        {['', ...CATEGORIAS].map(cat => (
          <button key={cat} onClick={() => setFiltroCategoria(cat)}
            style={{ padding:'4px 12px', fontSize:11, borderRadius:8, border:`0.5px solid ${filtroCategoria===cat?AZUL:'#D3D1C7'}`, background:filtroCategoria===cat?AZUL:'transparent', color:filtroCategoria===cat?'#fff':'#5F5E5A', cursor:'pointer' }}>
            {cat||'Todos'}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={s.card}>
        {loading ? <div style={{ textAlign:'center', padding:'2rem', color:'#888780' }}>Carregando...</div> :
        bensFiltrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#888780' }}>
            <div style={{ fontSize:32, marginBottom:8 }}><i className="ti ti-building" style={{fontSize:14}} /></div>
            <div>Nenhum bem cadastrado.</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr>{['Descrição','Categoria','Estado','Localização','Aquisição','Valor original','Valor atual','Depr.%','NF',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {bensFiltrados.map((b,i) => {
                  const dep = calcularDepreciacao(b)
                  return (
                    <tr key={b.id} style={{ background: b.ativo ? i%2===0?'#fff':'#FAFAF8' : '#F8F7F2', opacity: b.ativo ? 1 : 0.6 }}>
                      <td style={{ ...s.td, fontWeight:500 }}>
                        {b.descricao}
                        {b.marca_modelo && <div style={{ fontSize:10, color:'#888780' }}>{b.marca_modelo}</div>}
                        {b.numero_tombamento && <div style={{ fontSize:10, color:'#888780', fontFamily:'monospace' }}>#{b.numero_tombamento}</div>}
                      </td>
                      <td style={s.td}><span style={s.badge('#E6F1FB',AZUL)}>{b.categoria}</span></td>
                      <td style={s.td}><span style={s.badge('#F8F7F2', corEstado[b.estado]||'#888780')}>{b.estado}</span></td>
                      <td style={{ ...s.td, color:'#888780', fontSize:11 }}>{b.localizacao||'—'}</td>
                      <td style={{ ...s.td, fontSize:11 }}>{fmtData(b.data_aquisicao)}</td>
                      <td style={{ ...s.td, color:'#5F5E5A' }}>{b.valor_aquisicao ? fmt(b.valor_aquisicao) : '—'}</td>
                      <td style={{ ...s.td, fontWeight:600, color:dep?dep.pct>=80?VERMELHO:dep.pct>=50?LARANJA:VERDE:'#888780' }}>
                        {dep ? fmt(dep.valorAtual) : '—'}
                      </td>
                      <td style={s.td}>
                        {dep ? (
                          <div>
                            <div style={{ fontSize:10, color: dep.pct>=80?VERMELHO:dep.pct>=50?LARANJA:VERDE, fontWeight:600 }}>{dep.pct}%</div>
                            <div style={{ height:4, borderRadius:99, background:'#F1EFE8', marginTop:2, width:60, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:dep.pct+'%', background: dep.pct>=80?VERMELHO:dep.pct>=50?LARANJA:VERDE, borderRadius:99 }} />
                            </div>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ ...s.td, fontSize:11, fontFamily:'monospace', color:'#888780' }}>{b.numero_nota||'—'}</td>
                      <td style={s.td}>
                        {isAdmin && (
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => abrirForm(b)} style={{ ...s.btn('#F1EFE8','#5F5E5A'), padding:'4px 8px', fontSize:11 }}>Editar</button>
                            <button onClick={() => excluir(b.id)} style={{ ...s.btn('#FEF2F2',VERMELHO), padding:'4px 8px', fontSize:11 }}><i className="ti ti-x" style={{fontSize:14}} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
