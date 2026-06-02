import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

export default function Painel() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  const [dados, setDados] = useState({ entradas: 0, saidas: 0, saldo: 0 })
  const [historico, setHistorico] = useState([])
  const [porCategoria, setPorCategoria] = useState({ entradas: [], saidas: [] })
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => { carregar() }, [mes])

  async function carregar() {
    setLoading(true)
    const inicio = mes + '-01'
    const fim = mes + '-31'

    // Busca movimentações do extrato do mês
    const { data: movs } = await supabase
      .from('extrato_movs')
      .select('*, categoria:categorias(nome, tipo), extrato:extratos(competencia)')
      .gte('data', inicio)
      .lte('data', fim)

    const lista = movs || []
    const entradas = lista.filter(m => m.valor > 0).reduce((a, m) => a + Number(m.valor), 0)
    const saidas = Math.abs(lista.filter(m => m.valor < 0).reduce((a, m) => a + Number(m.valor), 0))
    setDados({ entradas, saidas, saldo: entradas - saidas })

    // Agrupa por categoria
    const grupoEnt = {}, grupoSai = {}
    lista.forEach(m => {
      const cat = m.categoria?.nome || 'Sem categoria'
      if (m.valor > 0) { grupoEnt[cat] = (grupoEnt[cat] || 0) + Number(m.valor) }
      else { grupoSai[cat] = (grupoSai[cat] || 0) + Math.abs(Number(m.valor)) }
    })
    setPorCategoria({
      entradas: Object.entries(grupoEnt).sort((a,b) => b[1]-a[1]).slice(0,5),
      saidas: Object.entries(grupoSai).sort((a,b) => b[1]-a[1]).slice(0,5),
    })

    // Histórico últimos 6 meses
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(mes + '-01')
      d.setMonth(d.getMonth() - i)
      meses.push(d.toISOString().slice(0, 7))
    }
    const hist = await Promise.all(meses.map(async m => {
      const { data } = await supabase.from('extrato_movs').select('valor').gte('data', m+'-01').lte('data', m+'-31')
      const ent = (data||[]).filter(x=>x.valor>0).reduce((a,x)=>a+Number(x.valor),0)
      const sai = Math.abs((data||[]).filter(x=>x.valor<0).reduce((a,x)=>a+Number(x.valor),0))
      return { mes: m, ent, sai }
    }))
    setHistorico(hist)
    setLoading(false)
  }

  const fmt = v => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtK = v => 'R$' + (v/1000).toFixed(0) + 'k'

  const labels = historico.map(h => {
    const [ano, m] = h.mes.split('-')
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(m)-1]
  })

  const barData = {
    labels,
    datasets: [
      { label: 'Entradas', data: historico.map(h => h.ent), backgroundColor: '#6BBF2B' },
      { label: 'Gastos',   data: historico.map(h => h.sai), backgroundColor: '#E8212A' },
    ]
  }
  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 }, callback: fmtK } } } }

  const doughData = {
    labels: porCategoria.entradas.map(([cat]) => cat),
    datasets: [{ data: porCategoria.entradas.map(([,v]) => v), backgroundColor: ['#6BBF2B','#4A8FD4','#8B2FC9','#F4821F','#F5C800'], borderWidth: 0 }]
  }
  const doughOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } } }, cutout: '55%' }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>
          Painel {p === 'diretoria' ? '— Diretoria' : p === 'operacional' ? '— Operacional' : '— Administrador'}
        </div>
        {p !== 'operacional' && (
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            style={{ fontSize: 12, padding: '5px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888780', fontSize: 13 }}>Carregando dados...</div>
      ) : (
        <>
          {/* Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
            {[
              { label: 'Total entradas', val: fmt(dados.entradas), cor: '#6BBF2B', sub: new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) },
              { label: 'Total gastos',   val: fmt(dados.saidas),   cor: '#E8212A', sub: new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) },
              { label: 'Resultado',      val: fmt(dados.saldo),    cor: dados.saldo >= 0 ? '#4A8FD4' : '#E8212A', sub: dados.saldo >= 0 ? 'Superávit' : 'Déficit' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
                <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
                <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 19, fontWeight: 500, color: m.cor }}>{m.val}</div>
                <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {p !== 'operacional' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
                <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Evolução mensal — últimos 6 meses</div>
                  <div style={{ height: 200 }}><Bar data={barData} options={barOpts} /></div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, justifyContent: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: '#6BBF2B', display: 'inline-block' }}/>Entradas</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: '#E8212A', display: 'inline-block' }}/>Gastos</span>
                  </div>
                </div>
                <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Entradas por categoria</div>
                  {porCategoria.entradas.length === 0
                    ? <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>Sem dados para o período.</div>
                    : <div style={{ height: 200 }}><Doughnut data={doughData} options={doughOpts} /></div>
                  }
                </div>
              </div>

              {/* Top categorias */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { titulo: 'Principais entradas', lista: porCategoria.entradas, cor: '#6BBF2B', sinal: '+' },
                  { titulo: 'Principais gastos',   lista: porCategoria.saidas,   cor: '#E8212A', sinal: '-' },
                ].map(bloco => (
                  <div key={bloco.titulo} style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>{bloco.titulo}</div>
                    {bloco.lista.length === 0
                      ? <div style={{ fontSize: 12, color: '#888780' }}>Sem dados.</div>
                      : bloco.lista.map(([cat, val], i) => {
                        const total = bloco.lista.reduce((a,[,v]) => a+v, 0)
                        const pct = total > 0 ? Math.round(val/total*100) : 0
                        return (
                          <div key={cat} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                              <span>{cat}</span>
                              <span style={{ fontWeight: 500, color: bloco.cor }}>{bloco.sinal}R$ {val.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                            </div>
                            <div style={{ height: 5, background: '#F1EFE8', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: pct+'%', background: bloco.cor, borderRadius: 99 }} />
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                ))}
              </div>
            </>
          )}

          {p === 'operacional' && (
            <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.5rem' }}>Acesso rápido</div>
              <p style={{ fontSize: 12, color: '#888780' }}>Use o menu lateral para lançar despesas.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
