import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

export default function LancamentosLista() {
  const { perfil, user } = useAuth()
  const p = perfil?.perfil
  const navigate = useNavigate()

  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroProjeto, setFiltroProjeto] = useState('')
  const [categorias, setCategorias] = useState([])
  const [projetos, setProjetos] = useState([])
  const [editando, setEditando] = useState(null)
  const [formEdit, setFormEdit] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [projetos, setProjetos] = useState([])
  const [fornecedores, setFornecedores] = useState([])

  useEffect(() => {
    supabase.from('contas').select('id,nome,preponderancia').order('nome').then(({ data }) => setContas(data || []))
    supabase.from('categorias').select('id,nome,tipo').order('nome').then(({ data }) => setCategorias(data || []))
    supabase.from('projetos').select('id,nome').order('nome').then(({ data }) => setProjetos(data || []))
    supabase.from('fornecedores').select('id,nome').eq('ativo',true).order('nome').then(({ data }) => setFornecedores(data || []))
  }, [])

  useEffect(() => {
    supabase.from('categorias').select('id,nome,tipo').order('nome').then(({ data }) => setCategorias(data || []))
    supabase.from('projetos').select('id,nome').order('nome').then(({ data }) => setProjetos(data || []))
  }, [])

  useEffect(() => { carregar() }, [filtroTipo, filtroPeriodo, filtroCategoria, filtroProjeto])

  async function carregar() {
    setLoading(true)
    let q = supabase.from('lancamentos')
      .select('*, conta:contas(nome), categoria:categorias(nome,tipo), projeto:projetos(nome), fornecedor:fornecedores(nome)')
      .order('data', { ascending: false })

    if (p === 'operacional') q = q.eq('criado_por', user.id)
    if (filtroTipo !== 'todos') {
      if (filtroTipo === 'despesa') q = q.in('tipo', ['despesa','saida'])
      else q = q.eq('tipo', filtroTipo)
    }
    if (filtroPeriodo) {
      q = q.gte('data', filtroPeriodo + '-01').lte('data', filtroPeriodo + '-31')
    }
    if (filtroCategoria) q = q.eq('categoria_id', parseInt(filtroCategoria))
    if (filtroProjeto) q = q.eq('projeto_id', parseInt(filtroProjeto))

    const { data } = await q
    setLista(data || [])
    setLoading(false)
  }

  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [msg, setMsg] = useState('')

  async function salvarEdicao() {
    setSalvando(true)
    const { error } = await supabase.from('lancamentos').update({
      data: formEdit.data,
      descricao: formEdit.descricao,
      valor: parseFloat(formEdit.valor),
      conta_id: formEdit.conta_id ? parseInt(formEdit.conta_id) : null,
      categoria_id: formEdit.categoria_id ? parseInt(formEdit.categoria_id) : null,
      fornecedor_id: formEdit.fornecedor_id ? parseInt(formEdit.fornecedor_id) : null,
      projeto_id: formEdit.projeto_id ? parseInt(formEdit.projeto_id) : null,
      nf: formEdit.nf || null,
      dispensa_nf: formEdit.dispensa_nf || false,
      prep_educacao: formEdit.prep_educacao ? parseFloat(formEdit.prep_educacao) : null,
      prep_social: formEdit.prep_social ? parseFloat(formEdit.prep_social) : null,
      prep_saude: formEdit.prep_saude ? parseFloat(formEdit.prep_saude) : null,
    }).eq('id', editando)
    if (!error) {
      setEditando(null)
      setFormEdit({})
      setMsg('✅ Lançamento atualizado.')
      carregar()
      setTimeout(() => setMsg(''), 3000)
    }
    setSalvando(false)
  }

  async function excluir(id) {
    await supabase.from('lancamentos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    setMsg('✅ Lançamento excluído.')
    carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const totalEntradas = lista.filter(l => l.tipo === 'entrada').reduce((a,l) => a + Number(l.valor||0), 0)
  const totalDespesas = lista.filter(l => l.tipo === 'despesa' || l.tipo === 'saida').reduce((a,l) => a + Number(l.valor||0), 0)

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'5px 12px', fontSize:11, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    input: { fontSize:12, padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 },
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Lançamentos</div>
          <div style={{ fontSize:12, color:'#888780' }}>{lista.length} lançamento{lista.length!==1?'s':''} no período</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => navigate('/despesas')} style={s.btn(VERMELHO)}>+ Despesa</button>
          <button onClick={() => navigate('/entradas')} style={s.btn(VERDE)}>+ Entrada</button>
        </div>
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:10, background:msg.includes('✅')?'#F2FAE8':'#FEF2F2', color:msg.includes('✅')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:'1.25rem' }}>
        {[
          { label:'Entradas', val:fmt(totalEntradas), cor:VERDE },
          { label:'Despesas', val:fmt(totalDespesas), cor:VERMELHO },
          { label:'Resultado', val:fmt(totalEntradas - totalDespesas), cor: totalEntradas >= totalDespesas ? AZUL : VERMELHO },
          { label:'Total lançamentos', val:lista.length, cor:'#5F5E5A' },
        ].map(m => (
          <div key={m.label} style={{ background:'#fff', borderRadius:10, padding:'.75rem 1rem', border:'0.5px solid #E0DDD5' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:15, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ ...s.card, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:10 }}>
        <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={s.input}>
          <option value="todos">Todos os tipos</option>
          <option value="despesa">Despesas</option>
          <option value="entrada">Entradas</option>
        </select>
        <input type="month" value={filtroPeriodo} onChange={e=>setFiltroPeriodo(e.target.value)} style={s.input} />
        <select value={filtroCategoria} onChange={e=>setFiltroCategoria(e.target.value)} style={s.input}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
        </select>
        <select value={filtroProjeto} onChange={e=>setFiltroProjeto(e.target.value)} style={s.input}>
          <option value="">Todos os projetos</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <button onClick={carregar} style={s.btn(AZUL)}>↻ Atualizar</button>
      </div>

      {/* Tabela */}
      <div style={s.card}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Carregando...</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
            Nenhum lançamento encontrado no período.
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>{['Data','Tipo','Descrição','Fornecedor','Categoria','Subcategoria','Projeto','Conta','Valor',''].map(h=>(
                  <th key={h} style={s.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {lista.map((l,i) => (
                  <tr key={l.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                    <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(l.data)}</td>
                    <td style={s.td}>
                      <span style={s.badge(l.tipo==='entrada'?'#EAF3DE':'#FEF2F2', l.tipo==='entrada'?'#3B6D11':VERMELHO)}>
                        {l.tipo==='entrada'?'Entrada':'Despesa'}
                      </span>
                    </td>
                    <td style={{ ...s.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descricao}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{l.fornecedor?.nome || l.fornecedor || '—'}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{l.categoria?.nome || '—'}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{l.subcategoria?.nome || '—'}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{l.projeto?.nome || '—'}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{l.conta?.nome || '—'}</td>
                    <td style={{ ...s.td, fontWeight:500, color:l.tipo==='entrada'?VERDE:VERMELHO, textAlign:'right', whiteSpace:'nowrap' }}>
                      {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                    </td>
                    <td style={s.td}>
                      <div style={{ display:'flex', gap:4 }}>
    const contaAtual = contas.find(c => String(c.id) === String(l.conta_id))
                        <button onClick={() => { setEditando(l.id); setFormEdit({ data:l.data, descricao:l.descricao, valor:l.valor, conta_id:l.conta_id, categoria_id:l.categoria_id, fornecedor_id:l.fornecedor_id, projeto_id:l.projeto_id, nf:l.nf||'', dispensa_nf:l.dispensa_nf||false, _contaPrep: contaAtual?.preponderancia }) }}
                          style={s.btn('#E6F1FB',AZUL)}>Editar</button>
                        {p === 'admin' && (
                          <button onClick={() => setConfirmandoExcluir(l)} style={s.btn('#FEF2F2',VERMELHO)}>Excluir</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal editar */}
      {editando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:580, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:'1rem' }}>Editar lançamento</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Data</label>
                <input type="date" value={formEdit.data||''} onChange={e=>setFormEdit(f=>({...f,data:e.target.value}))}
                  style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Valor (R$)</label>
                <input type="number" step="0.01" value={formEdit.valor||''} onChange={e=>setFormEdit(f=>({...f,valor:e.target.value}))}
                  style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Descrição</label>
              <input value={formEdit.descricao||''} onChange={e=>setFormEdit(f=>({...f,descricao:e.target.value}))}
                style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' }} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Conta</label>
                <select value={formEdit.conta_id||''} onChange={e => {
                  const c = contas.find(c => String(c.id) === e.target.value)
                  setFormEdit(f=>({...f, conta_id:e.target.value, _contaPrep: c?.preponderancia }))
                }} style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' }}>
                  <option value="">Sem conta</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Categoria</label>
                <select value={formEdit.categoria_id||''} onChange={e=>setFormEdit(f=>({...f,categoria_id:e.target.value}))}
                  style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' }}>
                  <option value="">Sem categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Fornecedor</label>
                <select value={formEdit.fornecedor_id||''} onChange={e=>setFormEdit(f=>({...f,fornecedor_id:e.target.value}))}
                  style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' }}>
                  <option value="">Sem fornecedor</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Projeto</label>
                <select value={formEdit.projeto_id||''} onChange={e=>setFormEdit(f=>({...f,projeto_id:e.target.value}))}
                  style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' }}>
                  <option value="">Sem projeto</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Nº Nota fiscal</label>
              <input value={formEdit.nf||''} onChange={e=>setFormEdit(f=>({...f,nf:e.target.value}))}
                disabled={formEdit.dispensa_nf} placeholder="001234"
                style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box', opacity:formEdit.dispensa_nf?0.5:1 }} />
              <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#888780', marginTop:4, cursor:'pointer' }}>
                <input type="checkbox" checked={formEdit.dispensa_nf||false} onChange={e=>setFormEdit(f=>({...f,dispensa_nf:e.target.checked,nf:e.target.checked?'':f.nf}))} />
                Dispensa nota fiscal
              </label>
            </div>

            {/* Rateio preponderância */}
            {formEdit._contaPrep === 'rateio' && (
              <div style={{ background:'#FAEEDA', borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#854F0B', marginBottom:8 }}>Preponderância (deve somar 100%)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[['prep_educacao','Educação'],['prep_social','Social'],['prep_saude','Saúde']].map(([campo,label]) => (
                    <div key={campo}>
                      <label style={{ fontSize:11, color:'#5F5E5A', display:'block', marginBottom:2 }}>{label} %</label>
                      <input type="number" min="0" max="100" value={formEdit[campo]||''} placeholder="0"
                        onChange={e=>setFormEdit(f=>({...f,[campo]:e.target.value}))}
                        style={{ width:'100%', fontSize:12, padding:'5px 7px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={salvarEdicao} disabled={salvando}
                style={{ padding:'8px 20px', borderRadius:8, border:'none', background:AZUL, color:'#fff', fontWeight:600, cursor:'pointer' }}>
                {salvando ? 'Salvando...' : '💾 Salvar'}
              </button>
              <button onClick={() => { setEditando(null); setFormEdit({}) }}
                style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir */}
      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Excluir lançamento?</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:4 }}>{confirmandoExcluir.descricao}</div>
            <div style={{ fontSize:13, fontWeight:600, color:VERMELHO, marginBottom:'1.5rem' }}>{fmt(confirmandoExcluir.valor)}</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir.id)} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:VERMELHO, color:'#fff', fontWeight:600, cursor:'pointer' }}>Excluir</button>
              <button onClick={() => setConfirmandoExcluir(null)} style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
