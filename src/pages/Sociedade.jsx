import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { gerarPDFTransparencia } from '../lib/pdf'
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const LOGO = [['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']]

export default function Sociedade() {
  const [periodo, setPeriodo] = useState('mes')
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [dados, setDados] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [mes, periodo])

  async function carregar() {
    setLoading(true)
    let q = supabase.from('extrato_movs').select('valor, tipo, categoria:categorias(nome, tipo)')

    if (periodo === 'mes') {
      q = q.gte('data', mes+'-01').lte('data', mes+'-31')
    } else {
      const ano = mes.slice(0,4)
      q = q.gte('data', ano+'-01-01').lte('data', ano+'-12-31')
    }

    const { data: movs } = await q
    const lista = movs || []

    const totalEnt = lista.filter(m=>m.valor>0).reduce((a,m)=>a+Number(m.valor),0)
    const totalSai = Math.abs(lista.filter(m=>m.valor<0).reduce((a,m)=>a+Number(m.valor),0))

    const grupoEnt = {}, grupoSai = {}
    lista.forEach(m => {
      const cat = m.categoria?.nome || 'Outros'
      if (m.valor > 0) { grupoEnt[cat] = (grupoEnt[cat]||0) + Number(m.valor) }
      else { grupoSai[cat] = (grupoSai[cat]||0) + Math.abs(Number(m.valor)) }
    })

    setDados({ totalEnt, totalSai, grupoEnt, grupoSai })

    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(mes + '-01')
      d.setMonth(d.getMonth() - i)
      meses.push(d.toISOString().slice(0, 7))
    }
    const hist = await Promise.all(meses.map(async m => {
      const { data } = await supabase.from('extrato_movs').select('valor').gte('data', m+'-01').lte('data', m+'-31')
      return {
        mes: m,
        ent: (data||[]).filter(x=>x.valor>0).reduce((a,x)=>a+Number(x.valor),0),
        sai: Math.abs((data||[]).filter(x=>x.valor<0).reduce((a,x)=>a+Number(x.valor),0))
      }
    }))
    setHistorico(hist)
    setLoading(false)
  }

  const fmt = v => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
  const mesLabel = new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

  const barData = {
    labels: historico.map(h => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(h.mes.split('-')[1])-1]),
    datasets: [
      { label: 'Entradas', data: historico.map(h=>h.ent), backgroundColor: '#6BBF2B' },
      { label: 'Gastos',   data: historico.map(h=>h.sai), backgroundColor: '#E8212A' },
    ]
  }
  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 }, callback: v => 'R$'+(v/1000).toFixed(0)+'k' } } } }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F2', padding: '1.5rem' }}>
      <div style={{ background: '#2C2C2A', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem', color: '#fff' }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginBottom: 4 }}>
          {LOGO.map(([l,c]) => <span key={l+c} style={{ fontSize: 22, fontWeight: 500, color: c, lineHeight: 1 }}>{l}</span>)}
        </div>
        <div style={{ fontSize: 11, opacity: .6, marginBottom: '.75rem' }}>Casa do Pequeno Trabalhador de Teresópolis · Desde 1974</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: '.25rem' }}>Transparência financeira</div>
        <div style={{ fontSize: 12, opacity: .7 }}>Prestação de contas à sociedade</div>
        {dados && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '.75rem 1rem' }}>
              <div style={{ fontSize: 11, opacity: .7, marginBottom: 3 }}>Entrou em {mesLabel}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#9FE1CB' }}>{fmt(dados.totalEnt)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '.75rem 1rem' }}>
              <div style={{ fontSize: 11, opacity: .7, marginBottom: 3 }}>Foi gasto</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#F09595' }}>{fmt(dados.totalSai)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '.75rem 1rem' }}>
              <div style={{ fontSize: 11, opacity: .7, marginBottom: 3 }}>Resultado</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: dados.totalEnt >= dados.totalSai ? '#9FE1CB' : '#F09595' }}>
                {fmt(dados.totalEnt - dados.totalSai)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['mes','ano'].map(t => (
            <button key={t} onClick={() => setPeriodo(t)} style={{ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: periodo===t?'#6BBF2B':'transparent', color: periodo===t?'#fff':'#5F5E5A', cursor: 'pointer' }}>
              {t==='mes'?'Mês':'Ano'}
            </button>
          ))}
        </div>
        <input type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} />
        <button onClick={() => dados && gerarPDFTransparencia(dados, mes)} disabled={!dados}
          style={{padding:'6px 14px',fontSize:12,borderRadius:8,border:'none',background:dados?'#F4821F':'#D3D1C7',color:'#fff',cursor:dados?'pointer':'default'}}>
          Baixar PDF
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'#888780', fontSize:13 }}>Carregando...</div>
      ) : !dados ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {[
              { titulo: 'De onde veio o dinheiro', grupo: dados.grupoEnt, cor: '#6BBF2B', isEnt: true },
              { titulo: 'Como foi gasto',           grupo: dados.grupoSai, cor: '#E8212A', isEnt: false },
            ].map(bloco => {
              const total = Object.values(bloco.grupo).reduce((a,v)=>a+v,0)
              const sorted = Object.entries(bloco.grupo).sort((a,b)=>b[1]-a[1]).slice(0,5)
              return (
                <div key={bloco.titulo} style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: bloco.cor, display: 'inline-block' }} />
                    {bloco.titulo}
                  </div>
                  {sorted.length === 0
                    ? <div style={{ fontSize: 12, color: '#888780' }}>Sem dados.</div>
                    : sorted.map(([cat, val]) => {
                      const pct = total > 0 ? Math.round(val/total*100) : 0
                      return (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid #F1EFE8' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{cat}</div>
                            <div style={{ height: 5, background: '#F1EFE8', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                              <div style={{ height: '100%', width: pct+'%', background: bloco.cor, borderRadius: 99 }} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: bloco.cor }}>{fmt(val)}</div>
                            <div style={{ fontSize: 10, color: '#888780' }}>{pct}%</div>
                          </div>
                        </div>
                      )
                    })
                  }
                </div>
              )
            })}
          </div>

          {historico.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Histórico — entradas × gastos</div>
              <div style={{ height: 180 }}><Bar data={barData} options={barOpts} /></div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: '#6BBF2B', display: 'inline-block' }}/>Entradas</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: '#E8212A', display: 'inline-block' }}/>Gastos</span>
              </div>
            </div>
          )}

          <div style={{ background: '#F8F7F2', borderRadius: 10, padding: '.75rem 1rem', fontSize: 11, color: '#888780', lineHeight: 1.6 }}>
            <strong>Nota de transparência:</strong> Esta página apresenta um resumo das movimentações financeiras da Casa do Pequeno Trabalhador de Teresópolis — Capette, atualizado mensalmente após a conciliação bancária. CNPJ: 00.000.000/0001-00 · Teresópolis-RJ.
          </div>
        </>
      )}
    </div>
  )
}
