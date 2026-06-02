import React, { useState, useEffect } from 'react'
import { categorias as dbCats } from '../lib/db'

export default function Categorias() {
  const [ent, setEnt] = useState([])
  const [desp, setDesp] = useState([])
  const [form, setForm] = useState({ nome: '', tipo: 'entrada' })
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: e } = await dbCats.listar('entrada')
    const { data: d } = await dbCats.listar('despesa')
    setEnt(e || []); setDesp(d || [])
  }

  async function salvar(e) {
    e.preventDefault()
    const { error } = await dbCats.criar(form)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Categoria criada!'); setForm(f => ({ ...f, nome: '' }))
    carregar(); setTimeout(() => setMsg(''), 3000)
  }

  async function excluir(id) {
    if (!confirm('Excluir esta categoria?')) return
    await dbCats.excluir(id); carregar()
  }

  function Lista({ cats, tipo }) {
    return (
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: tipo==='entrada'?'#6BBF2B':'#E8212A', display: 'inline-block' }} />
          Categorias de {tipo === 'entrada' ? 'entrada' : 'despesa'} ({cats.length})
        </div>
        {cats.length === 0 ? <div style={{ fontSize: 12, color: '#888780' }}>Nenhuma categoria cadastrada.</div> :
          cats.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #E0DDD5', fontSize: 12 }}>
              <span style={{ flex: 1 }}>{c.nome}</span>
              <button onClick={() => excluir(c.id)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '0.5px solid #E8212A', background: 'transparent', color: '#E8212A', cursor: 'pointer' }}>Excluir</button>
            </div>
          ))
        }
      </div>
    )
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Categorias</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <Lista cats={ent} tipo="entrada" />
        <Lista cats={desp} tipo="despesa" />
      </div>
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Nova categoria</div>
        <form onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Nome</label>
              <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Doação portão" required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Tipo</label>
              <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}}>
                <option value="entrada">Entrada</option><option value="despesa">Despesa</option>
              </select></div>
          </div>
          {msg && <div style={{fontSize:12,padding:'7px 10px',borderRadius:8,marginBottom:10,background:msg.includes('Erro')?'#FEF2F2':'#F2FAE8',color:msg.includes('Erro')?'#A32D2D':'#3B6D11'}}>{msg}</div>}
          <button type="submit" style={{padding:'7px 16px',fontSize:12,borderRadius:8,border:'none',background:'#6BBF2B',color:'#fff',cursor:'pointer'}}>Adicionar</button>
        </form>
      </div>
    </div>
  )
}
