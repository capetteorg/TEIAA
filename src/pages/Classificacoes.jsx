import React, { useState, useEffect } from 'react'
import { classificacoes as dbClass } from '../lib/db'

export default function Classificacoes() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState({ tipo_doc: '', direcao: 'entrada', classificacao: '', categoria: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => { dbClass.listar().then(({ data }) => setLista(data || [])) }, [])

  async function salvar(e) {
    e.preventDefault()
    const { error } = await dbClass.criar(form)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Regra criada!')
    dbClass.listar().then(({ data }) => setLista(data || []))
    setForm({ tipo_doc: '', direcao: 'entrada', classificacao: '', categoria: '' })
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Classificações automáticas</div>
      <div style={{ background: '#F8F7F2', borderLeft: '3px solid #8B2FC9', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A', marginBottom: '1.25rem' }}>
        Visível apenas para o administrador. Regras aplicadas automaticamente ao importar o extrato do Sicredi.
      </div>
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Regras ativas ({lista.length})</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr>{['Tipo doc. (banco)','Direção','Classificação exibida','Categoria',''].map(h=>(
            <th key={h} style={{textAlign:'left',padding:'5px 8px',fontSize:11,color:'#888780',borderBottom:'0.5px solid #E0DDD5'}}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {lista.map(r => (
              <tr key={r.id}>
                <td style={{padding:'7px 8px',borderBottom:'0.5px solid #E0DDD5'}}><span style={{fontSize:10,background:'#F1EFE8',color:'#5F5E5A',padding:'2px 6px',borderRadius:4,fontFamily:'monospace'}}>{r.tipo_doc}</span></td>
                <td style={{padding:'7px 8px',borderBottom:'0.5px solid #E0DDD5'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:99,fontWeight:500,background:r.direcao==='entrada'?'#EAF3DE':'#FCEBEB',color:r.direcao==='entrada'?'#3B6D11':'#A32D2D'}}>{r.direcao==='entrada'?'Entrada':'Saída'}</span></td>
                <td style={{padding:'7px 8px',borderBottom:'0.5px solid #E0DDD5'}}>{r.classificacao}</td>
                <td style={{padding:'7px 8px',borderBottom:'0.5px solid #E0DDD5'}}>{r.categoria}</td>
                <td style={{padding:'7px 8px',borderBottom:'0.5px solid #E0DDD5'}}><button onClick={()=>{if(confirm('Excluir?'))dbClass.excluir(r.id).then(()=>dbClass.listar().then(({data})=>setLista(data||[])))}} style={{fontSize:11,padding:'2px 8px',borderRadius:6,border:'0.5px solid #E8212A',background:'transparent',color:'#E8212A',cursor:'pointer'}}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Nova regra</div>
        <form onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Tipo doc. (banco)</label><input value={form.tipo_doc} onChange={e=>setForm(f=>({...f,tipo_doc:e.target.value}))} placeholder="Ex: COB000001" required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8,fontFamily:'monospace'}} /></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Direção</label>
              <select value={form.direcao} onChange={e=>setForm(f=>({...f,direcao:e.target.value}))} style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}}>
                <option value="entrada">Entrada</option><option value="saida">Saída</option>
              </select></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Classificação exibida</label><input value={form.classificacao} onChange={e=>setForm(f=>({...f,classificacao:e.target.value}))} placeholder="Ex: Contribuição de associados" required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Categoria</label><input value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} placeholder="Ex: Receita associativa" style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
          </div>
          {msg && <div style={{fontSize:12,padding:'7px 10px',borderRadius:8,marginBottom:10,background:msg.includes('Erro')?'#FEF2F2':'#F2FAE8',color:msg.includes('Erro')?'#A32D2D':'#3B6D11'}}>{msg}</div>}
          <button type="submit" style={{padding:'7px 16px',fontSize:12,borderRadius:8,border:'none',background:'#6BBF2B',color:'#fff',cursor:'pointer'}}>Adicionar regra</button>
        </form>
      </div>
    </div>
  )
}
