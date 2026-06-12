import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'react-router-dom'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8'

export default function FornecedorHistorico() {
  const [searchParams] = useSearchParams()
  const idFromUrl = searchParams.get('id')
  const [fornecedores, setFornecedores] = useState([])
  const [fornecedorId, setFornecedorId] = useState(idFromUrl || '')
  const [fornecedor, setFornecedor] = useState(null)
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState('')

  useEffect(() => {
    supabase.from('fornecedores').select('id,nome,cpf_cnpj,telefone,email,area_atuacao').eq('ativo', true).order('nome')
      .then(({ data }) => setFornecedores(data || []))
    supabase.from('categorias').select('id,nome').order('nome')
      .then(({ data }) => setCategorias(data || []))
  }, [])

  useEffect(() => {
    if (fornecedorId) {
      const f = fornecedores.find(f => String(f.id) === String(fornecedorId))
      setFornecedor(f || null)
      carregarLancamentos(fornecedorId)
    } else {
      setFornecedor(null)
      setLancamentos([])
    }
  }, [fornecedorId, filtroPeriodo, filtroTipo, filtroCategoria])

  async function carregarLancamentos(fid) {
    setLoading(true)
    let q = supabase.from('lancamentos')
      .select('*, conta:contas(nome), categoria:categorias(nome)').limit(10000)
      .eq('fornecedor_id', fid || fornecedorId)
      .order('data', { ascending: false })
    if (filtroPeriodo) {
      const [fy, fm] = filtroPeriodo.split('-')
      q = q.gte('data', filtroPeriodo+'-01').lte('data', `${filtroPeriodo}-${new Date(+fy, +fm, 0).getDate()}`)
    }
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

  const fornecedoresFiltrados = fornecedores.filter(f =>
    !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || (f.cpf_cnpj||'').includes(busca)
  )

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    input: { fontSize:12, padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 },
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ fontSize:19, fontWeight:600, letterSpacing:'-0.02em', marginBottom:'1.25rem' }}>Histórico por fornecedor</div>

      {/* Seleção de fornecedor */}
      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'.75rem' }}>Selecione o fornecedor</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            style={{ ...s.input, minWidth:240, flex:1 }} />
          <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}
            style={{ ...s.input, minWidth:300, flex:2 }}>
            <option value="">Selecione um fornecedor...</option>
            {fornecedoresFiltrados.map(f => (
              <option key={f.id} value={f.id}>
                {f.nome}{f.cpf_cnpj ? ` — ${f.cpf_cnpj}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dados do fornecedor selecionado */}
      {fornecedor && (
        <>
          <div style={{ ...s.card, background:'#F8F7F2', borderColor:'#D3D1C7' }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{fornecedor.nome}</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginTop:4, display:'flex', gap:16, flexWrap:'wrap' }}>
              {fornecedor.cpf_cnpj && <span style={{ fontFamily:'monospace' }}>{fornecedor.cpf_cnpj}</span>}
              {fornecedor.telefone && <span><i className="ti ti-phone" style={{marginRight:4}} /> {fornecedor.telefone}</span>}
              {fornecedor.email && <span><i className="ti ti-mail" style={{fontSize:14}} /> {fornecedor.email}</span>}
              {fornecedor.area_atuacao && <span><i className="ti ti-tag" style={{fontSize:14}} /> {fornecedor.area_atuacao}</span>}
            </div>
          </div>

          {/* Métricas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:10 }}>
            {[
              { label:'Total despesas', val:fmt(totalDespesas), cor:VERMELHO },
              { label:'Total entradas', val:fmt(totalEntradas), cor:VERDE },
              { label:'Lançamentos', val:lancamentos.length, cor:AZUL },
              { label:'Última transação', val:lancamentos[0] ? fmtData(lancamentos[0].data) : '—', cor:'#5F5E5A' },
            ].map(m => (
              <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
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
                <i className="ti ti-x" style={{marginRight:4}} /> Limpar
              </button>
            )}
            <span style={{ fontSize:12, color:'#888780', marginLeft:'auto' }}>{lancamentos.length} lançamento{lancamentos.length!==1?'s':''}</span>
          </div>

          {/* Tabela */}
          <div style={s.card}>
            {loading ? (
              <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div>
            ) : lancamentos.length === 0 ? (
              <div style={{ textAlign:'center', padding:'3rem', color:'#888780' }}>
                <div style={{ marginBottom:8 }}><i className="ti ti-mail-opened" style={{fontSize:32, color:'#C8C6BC'}} /></div>
                <div style={{ fontSize:13 }}>Nenhum lançamento encontrado.</div>
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
                      <td colSpan={6} style={{ padding:'8px 10px', fontSize:12, fontWeight:500 }}>Total despesas no período</td>
                      <td style={{ padding:'8px 10px', fontSize:12, fontWeight:600, color:VERMELHO, textAlign:'right' }}>{fmt(totalDespesas)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
