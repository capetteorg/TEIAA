import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4'

export default function FornecedorHistorico() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [fornecedor, setFornecedor] = useState(null)
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    carregarFornecedor()
    supabase.from('categorias').select('id,nome').order('nome').then(({ data }) => setCategorias(data || []))
  }, [id])

  useEffect(() => { if (fornecedor) carregarLancamentos() }, [filtroPeriodo, filtroTipo, filtroCategoria, fornecedor])

  async function carregarFornecedor() {
    const { data } = await supabase.from('fornecedores').select('*').eq('id', id).single()
    setFornecedor(data)
  }

  async function carregarLancamentos() {
    setLoading(true)
    let q = supabase.from('lancamentos')
      .select('*, conta:contas(nome), categoria:categorias(nome)')
      .eq('fornecedor_id', id)
      .order('data', { ascending: false })
    if (filtroPeriodo) q = q.gte('data', filtroPeriodo+'-01').lte('data', filtroPeriodo+'-31')
    if (filtroTipo !== 'todos') q = q.eq('tipo', filtroTipo)
    if (filtroCategoria) q = q.eq('categoria_id', parseInt(filtroCategoria))
    const { data } = await q
    setLancamentos(data || [])
    setLoading(false)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa').reduce((a,l) => a + Number(l.valor||0), 0)
  const totalEntradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((a,l) => a + Number(l.valor||0), 0)

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    input: { fontSize:12, padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 },
  }

  if (!fornecedor) return <div style={{ padding:'2rem', textAlign:'center', color:'#888780' }}>Carregando...</div>

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => navigate('/fornecedores')}
          style={{ padding:'5px 10px', fontSize:12, borderRadius:8, border:'0.5px solid #D3D1C7', background:'transparent', cursor:'pointer' }}>
          ← Voltar
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:600 }}>{fornecedor.nome}</div>
          <div style={{ fontSize:12, color:'#888780', marginTop:2 }}>
            {fornecedor.cpf_cnpj && <span style={{ fontFamily:'monospace', marginRight:12 }}>{fornecedor.cpf_cnpj}</span>}
            {fornecedor.telefone && <span style={{ marginRight:12 }}>📞 {fornecedor.telefone}</span>}
            {fornecedor.email && <span>✉️ {fornecedor.email}</span>}
          </div>
          {fornecedor.area_atuacao && <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>{fornecedor.area_atuacao}</div>}
        </div>
        <button onClick={() => navigate('/fornecedores')}
          style={{ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:AZUL, color:'#fff', cursor:'pointer' }}>
          Editar cadastro
        </button>
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:'1.25rem' }}>
        {[
          { label:'Total despesas', val:fmt(totalDespesas), cor:VERMELHO },
          { label:'Total entradas', val:fmt(totalEntradas), cor:VERDE },
          { label:'Lançamentos', val:lancamentos.length, cor:AZUL },
          { label:'Última transação', val: lancamentos[0] ? fmtData(lancamentos[0].data) : '—', cor:'#5F5E5A' },
        ].map(m => (
          <div key={m.label} style={{ background:'#fff', borderRadius:10, padding:'.75rem 1rem', border:'0.5px solid #E0DDD5' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:15, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ ...s.card, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <input type="month" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} style={s.input} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={s.input}>
          <option value="todos">Todos os tipos</option>
          <option value="despesa">Despesas</option>
          <option value="entrada">Entradas</option>
        </select>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={s.input}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {(filtroPeriodo || filtroTipo !== 'todos' || filtroCategoria) && (
          <button onClick={() => { setFiltroPeriodo(''); setFiltroTipo('todos'); setFiltroCategoria('') }}
            style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', cursor:'pointer' }}>
            ✕ Limpar filtros
          </button>
        )}
        <span style={{ fontSize:12, color:'#888780', marginLeft:'auto' }}>{lancamentos.length} lançamento{lancamentos.length!==1?'s':''}</span>
      </div>

      {/* Tabela */}
      <div style={s.card}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Carregando...</div>
        ) : lancamentos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#888780' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
            <div style={{ fontSize:13 }}>Nenhum lançamento encontrado para este fornecedor.</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>{['Data','Tipo','Descrição','Nº Nota','Categoria','Conta','Valor'].map(h=>(
                  <th key={h} style={s.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {lancamentos.map((l,i) => (
                  <tr key={l.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                    <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(l.data)}</td>
                    <td style={s.td}>
                      <span style={s.badge(l.tipo==='entrada'?'#EAF3DE':'#FEF2F2', l.tipo==='entrada'?'#3B6D11':VERMELHO)}>
                        {l.tipo==='entrada'?'Entrada':'Despesa'}
                      </span>
                    </td>
                    <td style={{ ...s.td, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descricao||'—'}</td>
                    <td style={{ ...s.td, fontSize:11, fontFamily:'monospace', color:'#888780' }}>{l.num_nota||l.nf||'—'}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{l.categoria?.nome||'—'}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{l.conta?.nome||'—'}</td>
                    <td style={{ ...s.td, fontWeight:500, color:l.tipo==='entrada'?VERDE:VERMELHO, textAlign:'right', whiteSpace:'nowrap' }}>
                      {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:'#F8F7F2' }}>
                  <td colSpan={5} style={{ padding:'8px 10px', fontSize:12, fontWeight:500 }}>Total no período</td>
                  <td style={{ padding:'8px 10px', fontSize:12, fontWeight:600, color:VERMELHO, textAlign:'right' }}>{fmt(totalDespesas)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
