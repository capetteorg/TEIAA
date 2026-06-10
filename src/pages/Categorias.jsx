import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { categorias as dbCats } from '../lib/db'

export default function Categorias() {
  const [ent, setEnt] = useState([])
  const [desp, setDesp] = useState([])
  const [subcats, setSubcats] = useState([])
  const [form, setForm] = useState({ nome: '', tipo: 'despesa' })
  const [formSub, setFormSub] = useState({ nome: '', categoria_id: '' })
  const [msg, setMsg] = useState('')
  const [msgSub, setMsgSub] = useState('')
  const [catAberta, setCatAberta] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: e } = await dbCats.listar('entrada')
    const { data: d } = await dbCats.listar('despesa')
    const { data: s } = await supabase.from('subcategorias').select('*').order('nome')
    setEnt(e || []); setDesp(d || []); setSubcats(s || [])
  }

  async function salvarCat(e) {
    e.preventDefault()
    const { error } = await dbCats.criar(form)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Categoria criada!'); setForm(f => ({ ...f, nome: '' }))
    carregar(); setTimeout(() => setMsg(''), 3000)
  }

  async function excluirCat(id) {
    if (!confirm('Excluir esta categoria? As subcategorias também serão excluídas.')) return
    await dbCats.excluir(id); carregar()
  }

  async function salvarSub(e) {
    e.preventDefault()
    const { error } = await supabase.from('subcategorias').insert({ nome: formSub.nome, categoria_id: parseInt(formSub.categoria_id) })
    if (error) { setMsgSub('Erro: ' + error.message); return }
    setMsgSub('Subcategoria criada!'); setFormSub(f => ({ ...f, nome: '' }))
    carregar(); setTimeout(() => setMsgSub(''), 3000)
  }

  async function excluirSub(id) {
    if (!confirm('Excluir subcategoria?')) return
    await supabase.from('subcategorias').delete().eq('id', id); carregar()
  }

  const subcatsDa = (catId) => subcats.filter(s => s.categoria_id === catId)
  const todasCats = [...ent, ...desp]

  function Lista({ cats, tipo }) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: tipo === 'entrada' ? '#6BBF2B' : '#E8212A', display: 'inline-block' }} />
          Categorias de {tipo === 'entrada' ? 'entrada' : 'despesa'} ({cats.length})
        </div>
        {cats.length === 0
          ? <div style={{ fontSize: 12, color: '#888780' }}>Nenhuma categoria.</div>
          : cats.map(c => {
            const subs = subcatsDa(c.id)
            const aberta = catAberta === c.id
            return (
              <div key={c.id} style={{ borderBottom: '0.5px solid #E0DDD5', paddingBottom: aberta ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontSize: 12 }}>
                  <button onClick={() => setCatAberta(aberta ? null : c.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#888780', padding: 0 }}>
                    {aberta ? '▼' : '▶'}
                  </button>
                  <span style={{ flex: 1, fontWeight: 500 }}>{c.nome}</span>
                  <span style={{ fontSize: 10, color: '#888780' }}>{subs.length} subcats</span>
                  <button onClick={() => excluirCat(c.id)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '0.5px solid #E8212A', background: 'transparent', color: '#E8212A', cursor: 'pointer' }}>Excluir</button>
                </div>
                {aberta && (
                  <div style={{ paddingLeft: 20, paddingBottom: 6 }}>
                    {subs.length === 0
                      ? <div style={{ fontSize: 11, color: '#B4B2A9', marginBottom: 4 }}>Nenhuma subcategoria ainda.</div>
                      : subs.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#B4B2A9', display: 'inline-block' }} />
                          <span style={{ flex: 1 }}>{s.nome}</span>
                          <button onClick={() => excluirSub(s.id)} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, border: '0.5px solid #E8212A', background: 'transparent', color: '#E8212A', cursor: 'pointer' }}><i className="ti ti-x" style={{fontSize:14}} /></button>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )
          })
        }
      </div>
    )
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Categorias e subcategorias</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <Lista cats={ent} tipo="entrada" />
        <Lista cats={desp} tipo="despesa" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Nova categoria */}
        <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Nova categoria</div>
          <form onSubmit={salvarCat}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Nome</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Manutenção" required style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
                  <option value="despesa">Despesa</option>
                  <option value="entrada">Entrada</option>
                </select>
              </div>
            </div>
            {msg && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msg.includes('Erro') ? '#FEF2F2' : '#F2FAE8', color: msg.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>{msg}</div>}
            <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#6BBF2B', color: '#fff', cursor: 'pointer' }}>Adicionar categoria</button>
          </form>
        </div>

        {/* Nova subcategoria */}
        <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Nova subcategoria</div>
          <form onSubmit={salvarSub}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Categoria pai</label>
                <select value={formSub.categoria_id} onChange={e => setFormSub(f => ({ ...f, categoria_id: e.target.value }))} required style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
                  <option value="">Selecione...</option>
                  {todasCats.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.tipo === 'entrada' ? 'entrada' : 'despesa'})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Nome da subcategoria</label>
                <input value={formSub.nome} onChange={e => setFormSub(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Manutenção portão" required style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
              </div>
            </div>
            {msgSub && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msgSub.includes('Erro') ? '#FEF2F2' : '#F2FAE8', color: msgSub.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>{msgSub}</div>}
            <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#4A8FD4', color: '#fff', cursor: 'pointer' }}>Adicionar subcategoria</button>
          </form>
        </div>
      </div>
    </div>
  )
}
