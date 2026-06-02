import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Relatorios() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  const [periodo, setPeriodo] = useState('mes')
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7))
  const [ano, setAno] = useState('2026')
  const [conta, setConta] = useState('todas')

  const isAdmin = p === 'admin'
  const titulo = periodo === 'mes' ? 'Relatório — ' + new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) : 'Relatório anual — ' + ano

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Relatórios</div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['mes','ano'].map(t => (
            <button key={t} onClick={() => setPeriodo(t)} style={{ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: periodo===t?'#6BBF2B':'transparent', color: periodo===t?'#fff':'#5F5E5A', cursor: 'pointer' }}>{t==='mes'?'Mensal':'Anual'}</button>
          ))}
        </div>
        <select value={conta} onChange={e=>setConta(e.target.value)} style={{fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8,minWidth:200}}>
          <option value="todas">Todas as contas</option>
          <option value="principal">Conta Principal — Sicredi 13502-9</option>
          <option value="e1">Emenda Parlamentar I</option>
          <option value="e2">Emenda Parlamentar II</option>
          <option value="e3">Emenda Parlamentar III</option>
        </select>
        {periodo === 'mes' ? (
          <input type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} />
        ) : (
          <select value={ano} onChange={e=>setAno(e.target.value)} style={{fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}}>
            <option>2026</option><option>2025</option>
          </select>
        )}
        <button style={{padding:'6px 14px',fontSize:12,borderRadius:8,border:'none',background:'#6BBF2B',color:'#fff',cursor:'pointer'}}>Exportar PDF</button>
        <button style={{padding:'6px 14px',fontSize:12,borderRadius:8,border:'0.5px solid #D3D1C7',background:'transparent',cursor:'pointer'}}>Excel</button>
      </div>

      <div style={{ background: '#F8F7F2', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
        <span style={{ fontWeight: 500 }}>{titulo}</span>
        <span style={{ color: '#888780' }}>{conta === 'todas' ? 'Todas as contas' : conta}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total entradas', val: 'R$ 10.441,30', sub: '84 recebimentos', cor: '#6BBF2B' },
          { label: 'Total gastos',   val: 'R$ 12.605,72', sub: '32 pagamentos',   cor: '#E8212A' },
          { label: 'Resultado',      val: '-R$ 2.164,42', sub: 'entradas − gastos', cor: '#E8212A' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
            <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: m.cor }}>{m.val}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { titulo: 'Entradas por categoria', rows: [
            ['Contribuição de associados', 'COB000001·PIXCOBRAN', 43, 'R$ 7.925,00', '76%', true],
            ['Recebimento PIX',            'PIX_CRED',           38, 'R$ 2.183,00', '21%', true],
            ['Repasse / Convênio',         'TED',                 1, 'R$ 837,50',   '8%',  true],
            ['Distribuição de sobras',     'SOBRCC',              1, 'R$ 8,30',     '0,1%',true],
          ]},
          { titulo: 'Gastos por categoria', rows: [
            ['Serviços terceiros',  'PIX_DEB', 28, 'R$ 9.574,32', '76%', false],
            ['Contas de consumo',   'PIX_DEB',  2, 'R$ 2.854,62', '23%', false],
            ['Impostos e taxas',    'COB000001',23, 'R$ 70,56',   '0,6%',false],
            ['Outros',              'Diversos',  3, 'R$ 106,22',  '0,9%',false],
          ]},
        ].map(bloco => (
          <div key={bloco.titulo} style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>{bloco.titulo}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                <th style={{ textAlign:'left',padding:'5px 7px',fontSize:11,color:'#888780',borderBottom:'0.5px solid #E0DDD5' }}>Categoria</th>
                {isAdmin && <th style={{ textAlign:'left',padding:'5px 7px',fontSize:11,color:'#888780',borderBottom:'0.5px solid #E0DDD5' }}>Tipo doc.</th>}
                <th style={{ textAlign:'left',padding:'5px 7px',fontSize:11,color:'#888780',borderBottom:'0.5px solid #E0DDD5' }}>Qtd</th>
                <th style={{ textAlign:'left',padding:'5px 7px',fontSize:11,color:'#888780',borderBottom:'0.5px solid #E0DDD5' }}>Total</th>
                <th style={{ textAlign:'left',padding:'5px 7px',fontSize:11,color:'#888780',borderBottom:'0.5px solid #E0DDD5' }}>%</th>
              </tr></thead>
              <tbody>
                {bloco.rows.map(([cat,doc,qtd,total,pct,isEnt]) => (
                  <tr key={cat}>
                    <td style={{padding:'7px 7px',borderBottom:'0.5px solid #E0DDD5'}}>{cat}</td>
                    {isAdmin && <td style={{padding:'7px 7px',borderBottom:'0.5px solid #E0DDD5'}}><span style={{fontSize:9,background:'#F1EFE8',color:'#5F5E5A',padding:'1px 5px',borderRadius:4,fontFamily:'monospace'}}>{doc}</span></td>}
                    <td style={{padding:'7px 7px',borderBottom:'0.5px solid #E0DDD5'}}>{qtd}</td>
                    <td style={{padding:'7px 7px',borderBottom:'0.5px solid #E0DDD5',fontWeight:500,color:isEnt?'#6BBF2B':'#E8212A'}}>{total}</td>
                    <td style={{padding:'7px 7px',borderBottom:'0.5px solid #E0DDD5',color:'#888780'}}>{pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
