import React, { useState, useEffect } from 'react'
import { lancamentos as dbLanc } from '../lib/db'

export default function Conciliacao() {
  const [pendentes, setPendentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await dbLanc.listar({ conciliado: false })
    setPendentes(data || [])
    setLoading(false)
  }

  async function conciliar(id) {
    await dbLanc.conciliar(id)
    carregar()
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Conciliação bancária</div>
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Lançamentos pendentes de conciliação</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#FAEEDA', color: '#854F0B', fontWeight: 500 }}>{pendentes.length} itens</span>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>Carregando...</div> :
          pendentes.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#6BBF2B', fontSize: 13, fontWeight: 500 }}>✓ Tudo conciliado!</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Data','Descrição','Conta','Tipo','Valor',''].map(h=>(
              <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {pendentes.map(l => (
                <tr key={l.id}>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>{new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>{l.descricao}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>{l.conta?.nome || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500, background: l.tipo==='entrada'?'#EAF3DE':'#FCEBEB', color: l.tipo==='entrada'?'#3B6D11':'#A32D2D' }}>{l.tipo==='entrada'?'Entrada':'Saída'}</span></td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', fontWeight: 500, color: l.tipo==='entrada'?'#6BBF2B':'#E8212A' }}>
                    {l.tipo==='entrada'?'+':'-'}R$ {Number(l.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>
                    <button onClick={() => conciliar(l.id)} style={{ padding: '3px 10px', fontSize: 11, borderRadius: 8, border: 'none', background: '#6BBF2B', color: '#fff', cursor: 'pointer' }}>Conciliar ✓</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
