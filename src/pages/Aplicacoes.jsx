import React, { useState, useEffect } from 'react'
import { aplicacoes as dbAplic } from '../lib/db'

export default function Aplicacoes() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState({ aplicacao_id: '', competencia: '', valor: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => { dbAplic.listar().then(({ data }) => setLista(data || [])) }, [])

  async function salvarRendimento(e) {
    e.preventDefault()
    const { error } = await dbAplic.criarRendimento({ ...form, valor: parseFloat(form.valor) })
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Rendimento registrado!'); setForm({ aplicacao_id: '', competencia: '', valor: '' })
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Aplicações financeiras</div>
      {lista.map(a => (
        <div key={a.id} style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{a.nome} — {a.conta?.nome}</div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>Saldo: R$ {Number(a.saldo_atual||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
      ))}
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Registrar rendimento</div>
        <form onSubmit={salvarRendimento}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Aplicação</label>
              <select value={form.aplicacao_id} onChange={e=>setForm(f=>({...f,aplicacao_id:e.target.value}))} required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}}>
                <option value="">Selecione...</option>
                {lista.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
              </select></div>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Competência</label>
              <input type="month" value={form.competencia} onChange={e=>setForm(f=>({...f,competencia:e.target.value}))} required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Valor do rendimento (R$)</label>
              <input type="number" step="0.01" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="0,00" required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
          </div>
          {msg && <div style={{fontSize:12,padding:'7px 10px',borderRadius:8,marginBottom:10,background:msg.includes('Erro')?'#FEF2F2':'#F2FAE8',color:msg.includes('Erro')?'#A32D2D':'#3B6D11'}}>{msg}</div>}
          <button type="submit" style={{padding:'7px 16px',fontSize:12,borderRadius:8,border:'none',background:'#6BBF2B',color:'#fff',cursor:'pointer'}}>Salvar rendimento</button>
        </form>
      </div>
    </div>
  )
}
