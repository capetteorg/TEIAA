import React, { useState, useEffect } from 'react'
import { contas as dbContas } from '../lib/db'

const CORES = ['#6BBF2B','#4A8FD4','#8B2FC9','#F4821F','#E8212A','#E8207A','#888780']

export default function Contas() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState({ nome: '', banco: '', agencia: '', conta_num: '', preponderancia: 'rateio', cor: CORES[0] })
  const [msg, setMsg] = useState('')

  useEffect(() => { dbContas.listar().then(({ data }) => setLista(data || [])) }, [])

  async function salvar(e) {
    e.preventDefault()
    const { error } = await dbContas.criar(form)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Conta criada!')
    dbContas.listar().then(({ data }) => setLista(data || []))
    setForm({ nome:'',banco:'',agencia:'',conta_num:'',preponderancia:'rateio',cor:CORES[0] })
    setTimeout(() => setMsg(''), 3000)
  }

  const prepLabel = { rateio:'Rateia por lançamento', 'Educação':'Educação (fixa)', 'Assistência Social':'Assist. Social (fixa)', 'Saúde':'Saúde (fixa)' }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Contas bancárias</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        {lista.map(c => (
          <div key={c.id} style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ height: 4, background: c.cor || '#6BBF2B' }} />
            <div style={{ padding: '.9rem 1rem' }}>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>{c.nome}</div>
              <div style={{ fontSize: 11, color: '#888780', marginBottom: 8 }}>{c.banco} · AG {c.agencia} · {c.conta_num}</div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#F1EFE8', color: '#5F5E5A' }}>{prepLabel[c.preponderancia] || c.preponderancia}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Adicionar nova conta</div>
        <form onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Nome</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Emenda Parlamentar IV" required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Banco</label><input value={form.banco} onChange={e=>setForm(f=>({...f,banco:e.target.value}))} placeholder="Ex: Sicredi" required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Preponderância</label>
              <select value={form.preponderancia} onChange={e=>setForm(f=>({...f,preponderancia:e.target.value}))} style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}}>
                <option value="rateio">Rateia por lançamento</option>
                <option value="Educação">Educação (fixa)</option>
                <option value="Assistência Social">Assist. Social (fixa)</option>
                <option value="Saúde">Saúde (fixa)</option>
              </select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Agência</label><input value={form.agencia} onChange={e=>setForm(f=>({...f,agencia:e.target.value}))} placeholder="0000" style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Conta / dígito</label><input value={form.conta_num} onChange={e=>setForm(f=>({...f,conta_num:e.target.value}))} placeholder="00000-0" style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
          </div>
          {msg && <div style={{fontSize:12,padding:'7px 10px',borderRadius:8,marginBottom:10,background:msg.includes('Erro')?'#FEF2F2':'#F2FAE8',color:msg.includes('Erro')?'#A32D2D':'#3B6D11'}}>{msg}</div>}
          <button type="submit" style={{padding:'7px 16px',fontSize:12,borderRadius:8,border:'none',background:'#6BBF2B',color:'#fff',cursor:'pointer'}}>Adicionar conta</button>
        </form>
      </div>
    </div>
  )
}
