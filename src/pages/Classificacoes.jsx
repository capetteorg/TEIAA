import React, { useState, useEffect } from 'react'
import { classificacoes as dbClass } from '../lib/db'
import { supabase } from '../lib/supabase'

export default function Classificacoes() {
  const [lista, setLista] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [form, setForm] = useState({ tipo_doc: '', direcao: 'entrada', categoria_id: '', categoria: '', subcategoria: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    dbClass.listar().then(({ data }) => setLista(data || []))
    supabase.from('categorias').select('id,nome,tipo').order('tipo,nome').then(({ data }) => setCategorias(data || []))
    supabase.from('subcategorias').select('id,nome,categoria_id').order('nome').then(({ data }) => setSubcategorias(data || []))
  }, [])

  async function salvar(e) {
    e.preventDefault()
    const cat = catsFiltradas.find(c => c.nome === form.categoria)
    const sub = subsFiltradas.find(s => s.nome === form.subcategoria)
    const dados = {
      tipo_doc: form.tipo_doc,
      direcao: form.direcao,
      classificacao: form.subcategoria || form.categoria || '',
      categoria: form.subcategoria || form.categoria || '',
      categoria_id: cat?.id || null,
      subcategoria_id: sub?.id || null,
    }
    const { error } = await dbClass.criar(dados)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('✅ Regra criada!')
    dbClass.listar().then(({ data }) => setLista(data || []))
    setForm({ tipo_doc: '', direcao: 'entrada', categoria_id: '', categoria: '', subcategoria: '' })
    setTimeout(() => setMsg(''), 3000)
  }

  const catsFiltradas = categorias.filter(c =>
    form.direcao === 'entrada' ? c.tipo === 'entrada' : c.tipo === 'despesa'
  )

  const subsFiltradas = subcategorias.filter(s => String(s.categoria_id) === String(form.categoria_id))

  const s = {
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:13, padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    th: { textAlign:'left', padding:'5px 8px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5' },
    td: { padding:'7px 8px', borderBottom:'0.5px solid #E0DDD5', fontSize:12 },
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:'1.25rem' }}>Classificações automáticas</div>
      <div style={{ background:'#F8F7F2', borderLeft:'3px solid #8B2FC9', borderRadius:'0 8px 8px 0', padding:'.55rem .9rem', fontSize:12, color:'#5F5E5A', marginBottom:'1.25rem' }}>
        Regras aplicadas automaticamente ao importar o extrato. Quando o tipo do documento bater com uma regra, o lançamento é classificado automaticamente.
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Regras ativas ({lista.length})</div>
        {lista.length === 0 ? (
          <div style={{ fontSize:12, color:'#888780', textAlign:'center', padding:'1rem' }}>Nenhuma regra cadastrada ainda.</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr>{['Tipo doc. (banco)','Direção','Categoria / Subcategoria',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {lista.map(r => (
                <tr key={r.id}>
                  <td style={s.td}><span style={{ fontSize:10, background:'#F1EFE8', color:'#5F5E5A', padding:'2px 6px', borderRadius:4, fontFamily:'monospace' }}>{r.tipo_doc}</span></td>
                  <td style={s.td}><span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, fontWeight:500, background:r.direcao==='entrada'?'#EAF3DE':'#FCEBEB', color:r.direcao==='entrada'?'#3B6D11':'#A32D2D' }}>{r.direcao==='entrada'?'Entrada':'Saída'}</span></td>
                  <td style={s.td}>
                    <div>{r.categoria || r.classificacao || '—'}</div>
                    {r.subcategoria?.nome && (
                      <div style={{ fontSize:11, color:'#888780' }}>↳ {r.subcategoria.nome}</div>
                    )}
                  </td>
                  <td style={s.td}>
                    <button onClick={() => { if(confirm('Excluir esta regra?')) dbClass.excluir(r.id).then(() => dbClass.listar().then(({data}) => setLista(data||[]))) }}
                      style={{ fontSize:11, padding:'2px 8px', borderRadius:6, border:'0.5px solid #E8212A', background:'transparent', color:'#E8212A', cursor:'pointer' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem' }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Nova regra</div>
        <form onSubmit={salvar}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={s.label}>Tipo doc. (banco)</label>
              <input value={form.tipo_doc} onChange={e=>setForm(f=>({...f,tipo_doc:e.target.value}))}
                placeholder="Ex: COB000001" required style={{ ...s.input, fontFamily:'monospace' }} />
            </div>
            <div>
              <label style={s.label}>Direção</label>
              <select value={form.direcao} onChange={e=>setForm(f=>({...f,direcao:e.target.value,categoria_id:'',categoria:'',subcategoria:''}))} style={s.input}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Categoria</label>
              <select value={form.categoria_id} onChange={e=>{
                const cat = catsFiltradas.find(c => String(c.id) === e.target.value)
                setForm(f=>({...f, categoria_id:e.target.value, categoria:cat?.nome||'', subcategoria:''}))
              }} style={s.input}>
                <option value="">Selecione...</option>
                {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Subcategoria</label>
              <select value={form.subcategoria} onChange={e=>setForm(f=>({...f,subcategoria:e.target.value}))}
                style={s.input} disabled={!form.categoria_id}>
                <option value="">Nenhuma (usar categoria)</option>
                {subsFiltradas.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>
          </div>
          {msg && <div style={{ fontSize:12, padding:'7px 10px', borderRadius:8, marginBottom:10, background:msg.includes('Erro')?'#FEF2F2':'#F2FAE8', color:msg.includes('Erro')?'#A32D2D':'#3B6D11' }}>{msg}</div>}
          <button type="submit" disabled={!form.categoria_id} style={{ padding:'7px 16px', fontSize:12, borderRadius:8, border:'none', background:form.categoria_id?'#6BBF2B':'#D3D1C7', color:'#fff', cursor:form.categoria_id?'pointer':'not-allowed' }}>
            Adicionar regra
          </button>
        </form>
      </div>
    </div>
  )
}
