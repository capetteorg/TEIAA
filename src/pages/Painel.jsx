import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { lancamentos } from '../lib/db'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

export default function Painel() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  const [dados, setDados] = useState({ entradas: 0, saidas: 0, saldo: 0 })

  useEffect(() => {
    async function carregar() {
      const mes = new Date().toISOString().slice(0, 7)
      const { data: ent } = await lancamentos.listar({ tipo: 'entrada', mes })
      const { data: sai } = await lancamentos.listar({ tipo: 'saida', mes })
      const totalEnt = (ent || []).reduce((a, l) => a + Number(l.valor), 0)
      const totalSai = (sai || []).reduce((a, l) => a + Number(l.valor), 0)
      setDados({ entradas: totalEnt, saidas: totalSai, saldo: totalEnt - totalSai })
    }
    carregar()
  }, [])

  const fmt = (v) => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const barData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      { label: 'Entradas', data: [9200, 8800, 11200, 9600, 10441, dados.entradas], backgroundColor: '#6BBF2B' },
      { label: 'Gastos',   data: [10100, 9400, 10800, 11200, 12606, dados.saidas],  backgroundColor: '#E8212A' },
    ]
  }
  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 }, callback: v => 'R$' + (v/1000).toFixed(0) + 'k' } } } }

  const doughData = {
    labels: ['Contribuição', 'Receb. PIX', 'Repasse'],
    datasets: [{ data: [7925, 2183, 838], backgroundColor: ['#6BBF2B','#4A8FD4','#8B2FC9'], borderWidth: 0 }]
  }
  const doughOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '60%' }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>
        Painel {p === 'diretoria' ? '— Diretoria' : p === 'operacional' ? '— Operacional' : '— Administrador'}
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total entradas (mês)', val: fmt(dados.entradas), cor: '#6BBF2B' },
          { label: 'Total gastos (mês)',   val: fmt(dados.saidas),   cor: '#E8212A' },
          { label: 'Saldo do período',     val: fmt(dados.saldo),    cor: dados.saldo >= 0 ? '#4A8FD4' : '#E8212A' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
            <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 19, fontWeight: 500, color: m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      {p !== 'operacional' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
          <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Evolução mensal</div>
            <div style={{ height: 200 }}><Bar data={barData} options={barOpts} /></div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Distribuição por preponderância</div>
            <div style={{ height: 170 }}><Doughnut data={doughData} options={doughOpts} /></div>
          </div>
        </div>
      )}

      {p === 'operacional' && (
        <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.5rem' }}>Acesso rápido</div>
          <p style={{ fontSize: 12, color: '#888780' }}>Use o menu lateral para lançar despesas. Suas despesas ficam aguardando confirmação via extrato bancário.</p>
        </div>
      )}
    </div>
  )
}
