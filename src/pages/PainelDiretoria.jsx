import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'
import { Line } from 'react-chartjs-2'
import 'chart.js/auto'

const fimMes = m => { const [y,mo] = m.split('-'); return `${m}-${new Date(+y,+mo,0).getDate()}` }

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'


export default function PainelDiretoria() {
  const [contas, setContas] = useState([])
  const [contaSel, setContaSel] = useState('todas')
  const [mes, setMes] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [aba, setAba] = useState('entradas')
  const [movs, setMovs] = useState([])
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0 })
  const [loading, setLoading] = useState(true)

  // Evolução dos últimos 6 meses
  const [evolucao, setEvolucao] = useState(null)
  useEffect(() => {
    async function carregarEvolucao() {
      const hoje = new Date()
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString().slice(0,10)
      const { data } = await fetchAll(() => supabase.from('extrato_movs').select('data,valor').gte('data', inicio))
      const porMes = {}
      ;(data||[]).forEach(m => {
        const ym = m.data.slice(0,7)
        if (!porMes[ym]) porMes[ym] = { ent:0, sai:0 }
        const v = Number(m.valor)
        v > 0 ? porMes[ym].ent += v : porMes[ym].sai += Math.abs(v)
      })
      const meses = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        meses.push(d.toISOString().slice(0,7))
      }
      setEvolucao({
        labels: meses.map(m => new Date(m+'-15').toLocaleDateString('pt-BR',{month:'short'})),
        ent: meses.map(m => porMes[m]?.ent || 0),
        sai: meses.map(m => porMes[m]?.sai || 0),
      })
    }
    carregarEvolucao()
  }, [])

  const [ultimoExtrato, setUltimoExtrato] = useState(null)
  const inicializado = useRef(false)

  useEffect(() => {
    if (inicializado.current) return
    inicializado.current = true
    supabase.from('contas').select('*').order('nome').then(({ data }) => setContas(data || []))
    // Detecta último extrato
    supabase.from('extratos').select('competencia').order('competencia', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.length) {
          setUltimoExtrato(data[0].competencia)
          setMes(data[0].competencia)
        } else {
          setMes(new Date().toISOString().slice(0, 7))
        }
      })
  }, [])

  useEffect(() => { if (mes) carregar() }, [mes, ano, contaSel])

  async function carregar() {
    setLoading(true)

    // Busca extratos filtrados por conta
    let qExtratos = supabase.from('extratos').select('id, conta_id, conta:contas(id, nome, tipo_conta)')
    if (contaSel !== 'todas') qExtratos = qExtratos.eq('conta_id', parseInt(contaSel))
    const { data: extratos } = await qExtratos
    const extratoIds = (extratos || []).map(e => e.id)
    const extratoMap = {}
    ;(extratos || []).forEach(e => { extratoMap[e.id] = e })

    if (extratoIds.length === 0) {
      setMovs([]); setResumo({ entradas: 0, saidas: 0 }); setLoading(false); return
    }

    // Busca movimentações do mês selecionado
    const { data: movsData } = await fetchAll(() => supabase
      .from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), subcategoria:subcategorias(nome)')
      .in('extrato_id', extratoIds)
      .gte('data', mes + '-01')
      .lte('data', fimMes(mes))
      .order('data', { ascending: false }))

    const lista = (movsData || []).map(m => ({ ...m, extrato: extratoMap[m.extrato_id] || null }))
    setMovs(lista)

    const ent = lista.filter(m => Number(m.valor) > 0).reduce((a, m) => a + Number(m.valor), 0)
    const sai = Math.abs(lista.filter(m => Number(m.valor) < 0).reduce((a, m) => a + Number(m.valor), 0))
    setResumo({ entradas: ent, saidas: sai })
    setLoading(false)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const mesLabel = mes ? new Date(mes + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''

  const entradas = movs.filter(m => Number(m.valor) > 0)
  const saidas = movs.filter(m => Number(m.valor) < 0)

  // Agrupa por categoria
  const porCatEnt = {}, porCatSai = {}
  entradas.forEach(m => { const c = m.categoria?.nome || 'Sem categoria'; porCatEnt[c] = (porCatEnt[c] || 0) + Number(m.valor) })
  saidas.forEach(m => { const c = m.categoria?.nome || 'Sem categoria'; porCatSai[c] = (porCatSai[c] || 0) + Math.abs(Number(m.valor)) })

  const anos = []
  for (let y = new Date().getFullYear(); y >= 2023; y--) anos.push(String(y))

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign: 'left', padding: '7px 10px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E8E6DE', background: '#FAFAF8', whiteSpace: 'nowrap' },
    td: { padding: '8px 10px', borderBottom: '0.5px solid #E8E6DE', fontSize: 12, verticalAlign: 'middle' },
    tab: ativo => ({
      padding: '7px 16px', fontSize: 12, borderRadius: 8,
      border: '0.5px solid ' + (ativo ? VERDE : '#D3D1C7'),
      background: ativo ? VERDE : '#fff',
      color: ativo ? '#fff' : '#5F5E5A',
      cursor: 'pointer', whiteSpace: 'nowrap',
    }),
    contaTab: ativo => ({
      padding: '5px 12px', fontSize: 11, borderRadius: 8,
      border: '0.5px solid ' + (ativo ? AZUL : '#D3D1C7'),
      background: ativo ? AZUL : '#fff',
      color: ativo ? '#fff' : '#5F5E5A',
      cursor: 'pointer', whiteSpace: 'nowrap',
    }),
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem', position: 'relative' }}>

      {/* Marca d'água Agendo */}
      <div style={{ position:'fixed', right:'-6vw', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0, opacity:0.04, filter:'grayscale(100%)' }}>
        <img src="/agendo-logo.png" alt="" style={{ width:'30vw', maxWidth:360 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.022em', marginBottom: '1.25rem' }}>
        Acompanhamento Financeiro — Diretoria
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#888780', marginBottom: 3 }}>Mês</div>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            style={{ fontSize: 12, padding: '5px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
        </div>
        {ultimoExtrato && ultimoExtrato !== mes && (
          <button onClick={() => setMes(ultimoExtrato)}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: '0.5px solid #6BBF2B', background: 'transparent', color: '#0E7EA8', cursor: 'pointer', alignSelf: 'flex-end' }}>
            Último extrato ({ultimoExtrato})
          </button>
        )}
      </div>

      {/* Abas por conta */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => setContaSel('todas')} style={s.contaTab(contaSel === 'todas')}>
          <i className="ti ti-building-bank" style={{marginRight:4}} /> Todas as contas
        </button>
        {contas.map(c => (
          <button key={c.id} onClick={() => setContaSel(String(c.id))} style={s.contaTab(contaSel === String(c.id))}>
            {c.nome}
          </button>
        ))}
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total entrou', val: fmt(resumo.entradas), cor: VERDE, icon: '↓', sub: mesLabel },
          { label: 'Total saiu', val: fmt(resumo.saidas), cor: VERMELHO, icon: '↑', sub: mesLabel },
          { label: 'Resultado', val: fmt(resumo.entradas - resumo.saidas), cor: (resumo.entradas - resumo.saidas) >= 0 ? AZUL : VERMELHO, icon: '=', sub: (resumo.entradas - resumo.saidas) >= 0 ? 'Superávit' : 'Déficit' },
        ].map(m => (
          <div key={m.label} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '.85rem 1rem', border: '0.5px solid #E8E6DE', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: m.cor }}>{m.val}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Abas de conteúdo */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => setAba('entradas')} style={s.tab(aba === 'entradas')}>
          ↓ Entradas ({entradas.length})
        </button>
        <button onClick={() => setAba('saidas')} style={s.tab(aba === 'saidas')}>
          ↑ Saídas ({saidas.length})
        </button>
        <button onClick={() => setAba('resumo')} style={s.tab(aba === 'resumo')}>
          Resumo por categoria
        </button>
      </div>

      {loading ? (
        <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div>
      ) : movs.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 13 }}>
          Nenhuma movimentação encontrada em <strong>{mesLabel}</strong>
          {contaSel !== 'todas' && ` para esta conta`}.
          {ultimoExtrato && ultimoExtrato !== mes && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              Último extrato disponível: <strong>{ultimoExtrato}</strong>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Aba Entradas */}
          {aba === 'entradas' && (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', color: VERDE }}>
                ↓ O que entrou em {mesLabel}
              </div>
              {entradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#888780', fontSize: 12 }}>Nenhuma entrada neste período.</div>
              ) : (
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0 }}>
                      <tr>{['Categoria','Subcategoria','Valor'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {entradas.map((m, i) => (
                        <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                          <td style={s.td}>{m.categoria?.nome || <span style={{ color: '#B4B2A9' }}>Não categorizado</span>}</td>
                          <td style={{ ...s.td, color: '#888780' }}>{m.subcategoria?.nome || '—'}</td>
                          <td style={{ ...s.td, fontWeight: 600, color: VERDE, whiteSpace: 'nowrap' }}>{fmt(m.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F2FAE8' }}>
                        <td colSpan={2} style={{ ...s.td, fontWeight: 700, fontSize: 13 }}>TOTAL ENTRADAS</td>
                        <td style={{ ...s.td, fontWeight: 700, fontSize: 13, color: VERDE }}>{fmt(resumo.entradas)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Aba Saídas */}
          {aba === 'saidas' && (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', color: VERMELHO }}>
                ↑ O que saiu em {mesLabel}
              </div>
              {saidas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#888780', fontSize: 12 }}>Nenhuma saída neste período.</div>
              ) : (
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0 }}>
                      <tr>{['Categoria','Subcategoria','Valor'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {saidas.map((m, i) => (
                        <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                          <td style={s.td}>{m.categoria?.nome || <span style={{ color: '#B4B2A9' }}>Não categorizado</span>}</td>
                          <td style={{ ...s.td, color: '#888780' }}>{m.subcategoria?.nome || '—'}</td>
                          <td style={{ ...s.td, fontWeight: 600, color: VERMELHO, whiteSpace: 'nowrap' }}>{fmt(Math.abs(m.valor))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#FEF2F2' }}>
                        <td colSpan={2} style={{ ...s.td, fontWeight: 700, fontSize: 13 }}>TOTAL SAÍDAS</td>
                        <td style={{ ...s.td, fontWeight: 700, fontSize: 13, color: VERMELHO }}>{fmt(resumo.saidas)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Aba Resumo por categoria */}
          {aba === 'resumo' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Entradas por categoria */}
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', color: VERDE }}>Entradas por categoria</div>
                {Object.entries(porCatEnt).sort((a,b) => b[1]-a[1]).map(([cat, val]) => {
                  const pct = resumo.entradas > 0 ? Math.round(val / resumo.entradas * 100) : 0
                  return (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{cat}</span>
                        <span style={{ fontWeight: 500, color: VERDE, flexShrink: 0 }}>{fmt(val)} <span style={{ color: '#888780', fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 5, background: '#F1EFE8', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: AZUL, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ borderTop: '0.5px solid #E8E6DE', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                  <span>Total</span><span style={{ color: VERDE }}>{fmt(resumo.entradas)}</span>
                </div>
              </div>

              {/* Saídas por categoria */}
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', color: VERMELHO }}>Saídas por categoria</div>
                {Object.entries(porCatSai).sort((a,b) => b[1]-a[1]).map(([cat, val]) => {
                  const pct = resumo.saidas > 0 ? Math.round(val / resumo.saidas * 100) : 0
                  return (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{cat}</span>
                        <span style={{ fontWeight: 500, color: VERMELHO, flexShrink: 0 }}>{fmt(val)} <span style={{ color: '#888780', fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 5, background: '#F1EFE8', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: VERMELHO, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ borderTop: '0.5px solid #E8E6DE', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                  <span>Total</span><span style={{ color: VERMELHO }}>{fmt(resumo.saidas)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Evolução 6 meses */}
      {evolucao && (evolucao.ent.some(v=>v>0) || evolucao.sai.some(v=>v>0)) && (
        <div style={{ ...s.card, marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Evolução — últimos 6 meses</div>
          <div style={{ height:180 }}>
            <Line
              data={{
                labels: evolucao.labels,
                datasets: [
                  { label:'Entradas', data:evolucao.ent, borderColor:'#6BBF2B', backgroundColor:'rgba(107,191,43,0.08)', fill:true, tension:0.35, pointRadius:3, borderWidth:2 },
                  { label:'Saídas', data:evolucao.sai, borderColor:'#E8212A', backgroundColor:'rgba(232,33,42,0.05)', fill:true, tension:0.35, pointRadius:3, borderWidth:2 },
                ],
              }}
              options={{
                responsive:true, maintainAspectRatio:false,
                plugins:{ legend:{ labels:{ boxWidth:10, font:{ size:11, family:'Inter' }, color:'#888780' } }, tooltip:{ callbacks:{ label: ctx => ctx.dataset.label+': R$ '+Number(ctx.raw).toLocaleString('pt-BR',{minimumFractionDigits:2}) } } },
                scales:{
                  y:{ ticks:{ font:{ size:10, family:'Inter' }, color:'#B4B2A9', callback: v => 'R$ '+(v>=1000?(v/1000).toFixed(0)+'k':v) }, grid:{ color:'#F1EFE8' }, border:{ display:false } },
                  x:{ ticks:{ font:{ size:10, family:'Inter' }, color:'#B4B2A9' }, grid:{ display:false }, border:{ display:false } },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
      </div>
  )
}
