import React, { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const LOGO = [['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']]

export default function Sociedade() {
  const [periodo, setPeriodo] = useState('mes')

  const barData = {
    labels: ['Jan','Fev','Mar','Abr','Mai'],
    datasets: [
      { label: 'Entradas', data: [9200,8800,11200,9600,10441], backgroundColor: '#6BBF2B' },
      { label: 'Gastos',   data: [10100,9400,10800,11200,12606], backgroundColor: '#E8212A' },
    ]
  }
  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 }, callback: v => 'R$'+(v/1000).toFixed(0)+'k' } } } }

  const entradas = [
    { icon: 'users', cor: '#6BBF2B', bg: '#EAF3DE', nome: 'Contribuição dos associados', sub: '43 recebimentos no mês', val: 'R$ 7.925', pct: 76 },
    { icon: 'device-mobile', cor: '#4A8FD4', bg: '#E6F1FB', nome: 'Outras entradas', sub: 'Transferências e recebimentos', val: 'R$ 2.516', pct: 24 },
  ]
  const gastos = [
    { icon: 'tool', cor: '#E8212A', bg: '#FCEBEB', nome: 'Serviços terceiros', sub: 'Fornecedores e prestadores', val: 'R$ 9.574', pct: 76 },
    { icon: 'bolt', cor: '#F4821F', bg: '#FAEEDA', nome: 'Contas de consumo', sub: 'Energia elétrica e água', val: 'R$ 2.855', pct: 23 },
    { icon: 'receipt', cor: '#5F5E5A', bg: '#F1EFE8', nome: 'Taxas e outros', sub: 'Encargos e demais gastos', val: 'R$ 177', pct: 1 },
  ]

  function Item({ icon, cor, bg, nome, sub, val, pct, isEnt }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid #F1EFE8', fontSize: 13 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ti-${icon}`} style={{ color: cor, fontSize: 15 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500 }}>{nome}</div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 1 }}>{sub}</div>
          <div style={{ height: 5, background: '#F1EFE8', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ height: '100%', width: pct + '%', background: cor, borderRadius: 99 }} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 500, color: isEnt ? '#6BBF2B' : '#E8212A' }}>{val}</div>
          <div style={{ fontSize: 10, color: '#888780' }}>{pct}%</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F2', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ background: '#2C2C2A', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem', color: '#fff' }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginBottom: 4 }}>
          {LOGO.map(([l,c]) => <span key={l+c} style={{ fontSize: 22, fontWeight: 500, color: c, lineHeight: 1 }}>{l}</span>)}
        </div>
        <div style={{ fontSize: 11, opacity: .6, marginBottom: '.75rem' }}>Casa do Pequeno Trabalhador de Teresópolis · Desde 1974</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: '.25rem' }}>Transparência financeira</div>
        <div style={{ fontSize: 12, opacity: .7 }}>Prestação de contas à sociedade</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: '1rem' }}>
          {[
            { label: 'Entrou em maio/2026', val: 'R$ 10.441', cor: '#9FE1CB' },
            { label: 'Foi gasto',            val: 'R$ 12.606', cor: '#F09595' },
            { label: 'Saldo atual',          val: 'R$ 893,13', cor: '#fff' },
          ].map(t => (
            <div key={t.label} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '.75rem 1rem' }}>
              <div style={{ fontSize: 11, opacity: .7, marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: t.cor }}>{t.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['mes','ano'].map(t => (
            <button key={t} onClick={() => setPeriodo(t)} style={{ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: periodo===t?'#6BBF2B':'transparent', color: periodo===t?'#fff':'#5F5E5A', cursor: 'pointer' }}>
              {t==='mes'?'Mês':'Ano'}
            </button>
          ))}
        </div>
        <select style={{ fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}><option>Maio/2026</option><option>Abril/2026</option></select>
        <select style={{ fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8, minWidth: 200 }}>
          <option>Conta Principal — Sicredi 13502-9</option>
          <option>Emenda Parlamentar I</option>
        </select>
        <button style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: '#F4821F', color: '#fff', cursor: 'pointer' }}>Baixar PDF</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6BBF2B', display: 'inline-block' }} />De onde veio o dinheiro
          </div>
          {entradas.map(e => <Item key={e.nome} {...e} isEnt={true} />)}
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8212A', display: 'inline-block' }} />Como foi gasto
          </div>
          {gastos.map(g => <Item key={g.nome} {...g} isEnt={false} />)}
        </div>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Histórico — entradas × gastos por mês</div>
        <div style={{ height: 180 }}><Bar data={barData} options={barOpts} /></div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: '#6BBF2B', display: 'inline-block' }} />Entradas</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: '#E8212A', display: 'inline-block' }} />Gastos</span>
        </div>
      </div>

      <div style={{ background: '#F8F7F2', borderRadius: 10, padding: '.75rem 1rem', fontSize: 11, color: '#888780', lineHeight: 1.6 }}>
        <strong>Nota de transparência:</strong> Esta página apresenta um resumo das movimentações financeiras da Casa do Pequeno Trabalhador de Teresópolis — Capette, atualizado mensalmente após a conciliação bancária. CNPJ: 00.000.000/0001-00 · Teresópolis-RJ.
      </div>
    </div>
  )
}
