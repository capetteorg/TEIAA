import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { gerarPDFRelatorio } from '../lib/pdf'

const fimMes = m => { const [y,mo] = m.split('-'); return `${m}-${new Date(+y,+mo,0).getDate()}` }

export default function Relatorios() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  const isAdmin = p === 'admin'
  const [periodo, setPeriodo] = useState('mes')
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [contaId, setContaId] = useState('todas')
  const [contas, setContas] = useState([])
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('contas').select('*').order('nome').then(({ data }) => setContas(data || []))
  }, [])

  useEffect(() => { carregar() }, [periodo, mes, ano, contaId])

  async function carregar() {
    setLoading(true)
    let q = supabase.from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), extrato:extratos(conta_id, competencia)')

    if (periodo === 'mes') {
      q = q.gte('data', mes+'-01').lte('data', fimMes(mes))
    } else {
      q = q.gte('data', ano+'-01-01').lte('data', ano+'-12-31')
    }

    const { data: movs } = await q
    let lista = movs || []

    if (contaId !== 'todas') {
      lista = lista.filter(m => String(m.extrato?.conta_id) === String(contaId))
    }

    const entradas = lista.filter(m => m.valor > 0)
    const saidas = lista.filter(m => m.valor < 0)
    const totalEnt = entradas.reduce((a,m) => a+Number(m.valor), 0)
    const totalSai = Math.abs(saidas.reduce((a,m) => a+Number(m.valor), 0))

    const grupoEnt = {}, grupoSai = {}
    entradas.forEach(m => {
      const cat = m.categoria?.nome || 'Sem categoria'
      if (!grupoEnt[cat]) grupoEnt[cat] = { total: 0, qtd: 0, doc: m.doc || '—' }
      grupoEnt[cat].total += Number(m.valor)
      grupoEnt[cat].qtd++
    })
    saidas.forEach(m => {
      const cat = m.categoria?.nome || 'Sem categoria'
      if (!grupoSai[cat]) grupoSai[cat] = { total: 0, qtd: 0, doc: m.doc || '—' }
      grupoSai[cat].total += Math.abs(Number(m.valor))
      grupoSai[cat].qtd++
    })

    setDados({ totalEnt, totalSai, resultado: totalEnt - totalSai, grupoEnt, grupoSai, totalMovs: lista.length })
    setLoading(false)
  }

  function exportarPDF() {
    if (!dados) return
    const contaNome = contaId === 'todas' ? 'Todas as contas' : contas.find(c=>String(c.id)===String(contaId))?.nome
    gerarPDFRelatorio(dados, { periodo, mes, ano, contaNome })
  }

  const fmt = v => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const titulo = periodo === 'mes'
    ? 'Relatório — ' + new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
    : 'Relatório anual — ' + ano

  const s = {
    th: { textAlign:'left', padding:'5px 7px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5' },
    td: { padding:'7px 7px', borderBottom:'0.5px solid #E0DDD5', fontSize:12 },
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Relatórios</div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['mes','ano'].map(t => (
            <button key={t} onClick={() => setPeriodo(t)} style={{ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: periodo===t?'#0E7EA8':'transparent', color: periodo===t?'#fff':'#5F5E5A', cursor: 'pointer' }}>
              {t==='mes'?'Mensal':'Anual'}
            </button>
          ))}
        </div>
        <select value={contaId} onChange={e=>setContaId(e.target.value)} style={{fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8,minWidth:200}}>
          <option value="todas">Todas as contas</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {periodo === 'mes'
          ? <input type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} />
          : <select value={ano} onChange={e=>setAno(e.target.value)} style={{fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}}>
              {[2026,2025,2024,2023].map(a=><option key={a}>{a}</option>)}
            </select>
        }
        <button onClick={exportarPDF} disabled={!dados} style={{padding:'6px 14px',fontSize:12,borderRadius:8,border:'none',background:dados?'#0E7EA8':'#D3D1C7',color:'#fff',cursor:dados?'pointer':'default'}}>
          Exportar PDF
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'#888780', fontSize:13 }}>Carregando...</div>
      ) : !dados ? null : (
        <>
          <div style={{ background: '#F8F7F2', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ fontWeight: 500 }}>{titulo}</span>
            <span style={{ color: '#888780' }}>{dados.totalMovs} movimentações</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
            {[
              { label: 'Total entradas', val: fmt(dados.totalEnt), sub: Object.values(dados.grupoEnt).reduce((a,v)=>a+v.qtd,0)+' recebimentos', cor: '#6BBF2B' },
              { label: 'Total gastos',   val: fmt(dados.totalSai), sub: Object.values(dados.grupoSai).reduce((a,v)=>a+v.qtd,0)+' pagamentos',   cor: '#E8212A' },
              { label: 'Resultado',      val: (dados.resultado>=0?'+':'')+fmt(dados.resultado), sub: dados.resultado>=0?'Superávit':'Déficit', cor: dados.resultado>=0?'#6BBF2B':'#E8212A' },
            ].map(m => (
              <div key={m.label} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '.85rem 1rem', border: '0.5px solid #E8E6DE', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
                <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: m.cor }}>{m.val}</div>
                <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { titulo: 'Entradas por categoria', grupo: dados.grupoEnt, cor: '#6BBF2B', isEnt: true },
              { titulo: 'Gastos por categoria',   grupo: dados.grupoSai, cor: '#E8212A', isEnt: false },
            ].map(bloco => (
              <div key={bloco.titulo} style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>{bloco.titulo}</div>
                {Object.keys(bloco.grupo).length === 0
                  ? <div style={{ fontSize: 12, color: '#888780' }}>Sem dados para o período.</div>
                  : (
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead><tr>
                        <th style={s.th}>Categoria</th>
                        {isAdmin && <th style={s.th}>Doc</th>}
                        <th style={s.th}>Qtd</th>
                        <th style={s.th}>Total</th>
                        <th style={s.th}>%</th>
                      </tr></thead>
                      <tbody>
                        {Object.entries(bloco.grupo)
                          .sort((a,b) => b[1].total - a[1].total)
                          .map(([cat, info]) => {
                            const total = Object.values(bloco.grupo).reduce((a,v)=>a+v.total,0)
                            const pct = total > 0 ? Math.round(info.total/total*100) : 0
                            return (
                              <tr key={cat}>
                                <td style={s.td}>{cat}</td>
                                {isAdmin && <td style={s.td}><span style={{fontSize:9,background:'#F1EFE8',color:'#5F5E5A',padding:'1px 5px',borderRadius:4,fontFamily:'monospace'}}>{info.doc}</span></td>}
                                <td style={s.td}>{info.qtd}</td>
                                <td style={{...s.td,fontWeight:500,color:bloco.cor}}>{fmt(info.total)}</td>
                                <td style={{...s.td,color:'#888780'}}>{pct}%</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  )
                }
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
