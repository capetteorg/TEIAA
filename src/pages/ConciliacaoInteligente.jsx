import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

function diffDias(d1, d2) {
  const a = new Date(d1 + 'T12:00:00')
  const b = new Date(d2 + 'T12:00:00')
  return Math.abs((a - b) / (1000 * 60 * 60 * 24))
}

function similaridade(str1, str2) {
  if (!str1 || !str2) return 0
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  if (s1.includes(s2) || s2.includes(s1)) return 0.8
  const palavras1 = s1.split(/\s+/)
  const palavras2 = s2.split(/\s+/)
  const comuns = palavras1.filter(p => p.length > 3 && palavras2.some(p2 => p2.includes(p) || p.includes(p2)))
  return comuns.length / Math.max(palavras1.length, palavras2.length)
}

export default function ConciliacaoInteligente() {
  const [extratos, setExtratos] = useState([])
  const [extratoSel, setExtratoSel] = useState(null)
  const [movs, setMovs] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [resultado, setResultado] = useState([])
  const [loading, setLoading] = useState(false)
  const [cruzando, setCruzando] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [msg, setMsg] = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => { carregarExtratos() }, [])

  async function carregarExtratos() {
    const { data } = await supabase
      .from('extratos')
      .select('*, conta:contas(id, nome, banco)')
      .order('importado_em', { ascending: false })
    setExtratos(data || [])
  }

  async function abrirExtrato(ext) {
    setLoading(true)
    setExtratoSel(ext)
    setResultado([])
    setStats(null)

    const { data: movData } = await fetchAll(() => supabase
      .from('extrato_movs')
      .select('*, categoria:categorias(nome)')
      .eq('extrato_id', ext.id)
      .order('data'))

    const { data: lancData } = await fetchAll(() => supabase
      .from('lancamentos')
      .select('*, categoria:categorias(nome)')
      .eq('conta_id', ext.conta?.id)
      .order('data'))

    setMovs(movData || [])
    setLancamentos(lancData || [])
    setLoading(false)
  }

  function cruzarAutomatico() {
    setCruzando(true)
    const usados = new Set()
    const res = []

    for (const mov of movs) {
      const tipoMov = mov.valor >= 0 ? 'entrada' : 'despesa'

      // Filtra lançamentos compatíveis
      const candidatos = lancamentos.filter(l => {
        if (usados.has(l.id)) return false
        if (l.tipo !== tipoMov) return false
        const diffValor = Math.abs(Number(l.valor) - Math.abs(Number(mov.valor)))
        const pctDiff = diffValor / Math.abs(Number(mov.valor))
        if (pctDiff > 0.01) return false // tolerância de 1%
        return true
      })

      if (candidatos.length === 0) {
        res.push({ mov, status: 'sem_lancamento', match: null, score: 0 })
        continue
      }

      // Pontua candidatos
      const pontuados = candidatos.map(l => {
        let score = 0
        const dias = diffDias(mov.data, l.data)
        if (dias === 0) score += 50
        else if (dias <= 1) score += 40
        else if (dias <= 3) score += 25
        else if (dias <= 7) score += 10
        else score -= 10

        const sim = similaridade(mov.descricao, l.descricao)
        score += sim * 30

        if (mov.categoria_id && l.categoria_id && mov.categoria_id === l.categoria_id) score += 15
        if (l.fornecedor && mov.descricao?.toLowerCase().includes(l.fornecedor.toLowerCase().split(' ')[0])) score += 10

        return { l, score, dias }
      }).sort((a, b) => b.score - a.score)

      const melhor = pontuados[0]

      if (melhor.score >= 70) {
        // Verifica duplicidade
        const outros = pontuados.filter(p => p.score >= 60 && p.l.id !== melhor.l.id)
        if (outros.length > 0) {
          res.push({ mov, status: 'duplicidade', match: melhor.l, alternativas: outros.map(o => o.l), score: melhor.score })
        } else {
          usados.add(melhor.l.id)
          res.push({ mov, status: 'conciliado_auto', match: melhor.l, score: melhor.score, dias: melhor.dias })
        }
      } else if (melhor.score >= 40) {
        res.push({ mov, status: 'possivel', match: melhor.l, score: melhor.score, dias: melhor.dias })
      } else {
        res.push({ mov, status: 'sem_lancamento', match: null, score: 0 })
      }
    }

    // Lançamentos sem extrato
    const movsUsados = new Set(res.filter(r => r.match).map(r => r.match.id))
    for (const l of lancamentos) {
      if (!movsUsados.has(l.id)) {
        res.push({ mov: null, lancamento: l, status: 'sem_extrato', match: null, score: 0 })
      }
    }

    setResultado(res)
    setCruzando(false)

    const s = {
      total: movs.length,
      autoMatched: res.filter(r => r.status === 'conciliado_auto').length,
      possivel: res.filter(r => r.status === 'possivel').length,
      duplicidade: res.filter(r => r.status === 'duplicidade').length,
      semLancamento: res.filter(r => r.status === 'sem_lancamento').length,
      semExtrato: res.filter(r => r.status === 'sem_extrato').length,
    }
    setStats(s)
  }

  async function confirmarConciliacao(item) {
    // Atualiza extrato_mov — só preenche categoria se ainda não tiver
    const updateMov = {
      conciliado: true,
      status_mov: 'conciliado',
    }
    if (item.match) {
      if (!item.mov.categoria_id && item.match.categoria_id) updateMov.categoria_id = item.match.categoria_id
      if (!item.mov.subcategoria_id && item.match.subcategoria_id) updateMov.subcategoria_id = item.match.subcategoria_id
      if (!item.mov.fornecedor_id && item.match.fornecedor_id) updateMov.fornecedor_id = item.match.fornecedor_id
      if (!item.mov.fornecedor && item.match.fornecedor) updateMov.fornecedor = item.match.fornecedor
    }
    await supabase.from('extrato_movs').update(updateMov).eq('id', item.mov.id)

    if (item.match) {
      await supabase.from('lancamentos').update({
        status_lanc: 'conciliado',
        extrato_mov_id: item.mov.id,
      }).eq('id', item.match.id)
    }

    setResultado(prev => prev.map(r =>
      r.mov?.id === item.mov?.id ? { ...r, status: 'confirmado' } : r
    ))
    setMsg('Conciliação confirmada!')
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function rejeitarMatch(item) {
    setResultado(prev => prev.map(r =>
      r.mov?.id === item.mov?.id ? { ...r, status: 'sem_lancamento', match: null } : r
    ))
  }

  async function confirmarTodosAuto() {
    const autoItems = listaFiltrada.filter(r => r.status === 'conciliado_auto')
    for (const item of autoItems) {
      await confirmarConciliacao(item)
    }
    setMsg(`${autoItems.length} conciliações confirmadas!`)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  const fmt = v => (v >= 0 ? '+' : '') + 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const STATUS_INFO = {
    conciliado_auto: { label: 'Conciliado automaticamente', bg: '#EAF3DE', cor: '#3B6D11', icon: 'ti-check' },
    possivel:        { label: 'Possível correspondência',   bg: '#FAEEDA', cor: '#854F0B', icon: 'ti-question-mark' },
    duplicidade:     { label: 'Duplicidade',                bg: '#FCEBEB', cor: '#A32D2D', icon: 'ti-exclamation-mark' },
    sem_lancamento:  { label: 'Sem lançamento operacional', bg: '#F1EFE8', cor: '#5F5E5A', icon: 'ti-minus' },
    sem_extrato:     { label: 'Sem extrato bancário',       bg: '#E6F1FB', cor: '#185FA5', icon: 'ti-arrow-up' },
    confirmado:      { label: 'Confirmado',                  bg: '#EAF3DE', cor: '#3B6D11', icon: 'ti-check' },
  }

  const listaFiltrada = resultado.filter(r => {
    if (filtro === 'todos') return true
    return r.status === filtro
  })

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E8E6DE', whiteSpace: 'nowrap' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E8E6DE', fontSize: 12, verticalAlign: 'top' },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    btn: (bg, cor = '#fff') => ({ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: 'none', background: bg, color: cor, cursor: 'pointer', whiteSpace: 'nowrap' }),
    tab: ativo => ({ padding: '5px 12px', fontSize: 11, borderRadius: 8, border: '0.5px solid #D3D1C7', background: ativo ? VERDE : 'transparent', color: ativo ? '#fff' : '#5F5E5A', cursor: 'pointer' }),
  }

  if (!extratoSel) return (
    <div style={{ }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Conciliação inteligente</div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
      </div>
<div style={{ background: '#E6F1FB', border: '0.5px solid #B3D1F0', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1.25rem', fontSize: 12, color: '#185FA5' }}>
        <strong>Como funciona:</strong> O sistema cruza automaticamente as movimentações do extrato bancário com os lançamentos feitos pelo Operacional, usando valor, data e descrição como critérios. Você confirma, rejeita ou resolve os casos manualmente.
      </div>
      {extratos.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '3rem', color: '#888780' }}>
          <div style={{ fontSize: 13 }}>Nenhum extrato importado ainda.</div>
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Selecione um extrato para cruzar</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Competência','Conta','Movimentações','Saldo final',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {extratos.map(e => (
                <tr key={e.id}>
                  <td style={s.td}><strong>{e.competencia}</strong></td>
                  <td style={s.td}>{e.conta?.nome || '—'}</td>
                  <td style={s.td}>{e.total_movs} movs</td>
                  <td style={{ ...s.td, color: VERDE }}>{fmt(e.saldo_final || 0)}</td>
                  <td style={s.td}>
                    <button onClick={() => abrirExtrato(e)} style={s.btn('#0E7EA8')}>Cruzar →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => { setExtratoSel(null); setResultado([]); setStats(null) }}
          style={{ padding: '5px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>
          ← Voltar
        </button>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.022em' }}>
          Conciliação inteligente — {extratoSel.competencia} · {extratoSel.conta?.nome}
        </div>
        {resultado.length === 0 && !loading && (
          <button onClick={cruzarAutomatico} disabled={cruzando}
            style={{ ...s.btn(AZUL), fontSize: 12, padding: '6px 16px', marginLeft: 'auto' }}>
            {cruzando ? 'Cruzando...' : 'Cruzar automaticamente'}
          </button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 13 }}>Carregando movimentações...</div>
      )}

      {!loading && resultado.length === 0 && (
        <div style={s.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Extrato bancário</div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>{movs.length} movimentações importadas</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Lançamentos operacionais</div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>{lancamentos.length} lançamentos encontrados para esta conta</div>
              {lancamentos.length === 0 && (
                <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>
                  Nenhum lançamento manual encontrado. O cruzamento mostrará todas as movimentações sem correspondência.
                </div>
              )}
            </div>
          </div>
          <button onClick={cruzarAutomatico} disabled={cruzando}
            style={{ padding: '8px 20px', fontSize: 13, borderRadius: 8, border: 'none', background: AZUL, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            {cruzando ? 'Cruzando dados...' : 'Iniciar cruzamento automático'}
          </button>
        </div>
      )}

      {stats && (
        <>
          {/* Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: '1.25rem' }}>
            {[
              { label: 'Conciliados auto', val: stats.autoMatched, cor: VERDE },
              { label: 'Possível match', val: stats.possivel, cor: LARANJA },
              { label: 'Duplicidade', val: stats.duplicidade, cor: VERMELHO },
              { label: 'Sem lançamento', val: stats.semLancamento, cor: '#888780' },
              { label: 'Sem extrato', val: stats.semExtrato, cor: AZUL },
            ].map(m => (
              <div key={m.label} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '.75rem 1rem', border: '0.5px solid #E8E6DE', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.6rem' }} />
                <div style={{ fontSize: 10, color: '#888780', marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>

          {msg && (
            <div style={{ background: '#F2FAE8', border: '0.5px solid #C0DD97', borderRadius: 10, padding: '.5rem 1rem', marginBottom: '1rem', fontSize: 12, color: '#0E7EA8' }}>
              {msg}
            </div>
          )}

          <div style={s.card}>
            <div style={{ display: 'flex', gap: 6, marginBottom: '.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setFiltro('todos')} style={s.tab(filtro==='todos')}>Todos ({resultado.length})</button>
              <button onClick={() => setFiltro('conciliado_auto')} style={s.tab(filtro==='conciliado_auto')}>Auto ({stats.autoMatched})</button>
              <button onClick={() => setFiltro('possivel')} style={s.tab(filtro==='possivel')}>Possível ({stats.possivel})</button>
              <button onClick={() => setFiltro('duplicidade')} style={s.tab(filtro==='duplicidade')}>Duplicidade ({stats.duplicidade})</button>
              <button onClick={() => setFiltro('sem_lancamento')} style={s.tab(filtro==='sem_lancamento')}>Sem lançamento ({stats.semLancamento})</button>
              <button onClick={() => setFiltro('sem_extrato')} style={s.tab(filtro==='sem_extrato')}>Sem extrato ({stats.semExtrato})</button>
              {stats.autoMatched > 0 && (
                <button onClick={confirmarTodosAuto} style={{ ...s.btn('#0E7EA8'), marginLeft: 'auto', fontSize: 12, padding: '5px 14px' }}>
                  <i className="ti ti-check" style={{marginRight:4}} /> Confirmar todos automáticos ({stats.autoMatched})
                </button>
              )}
            </div>

            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Extrato bancário</th>
                    <th style={s.th}>Lançamento operacional</th>
                    <th style={s.th}>Score</th>
                    <th style={s.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888780' }}>Nenhum item.</td></tr>
                  )}
                  {listaFiltrada.map((item, i) => {
                    const info = STATUS_INFO[item.status] || STATUS_INFO.sem_lancamento
                    return (
                      <tr key={i} style={{ background: item.status === 'confirmado' ? '#F2FAE8' : '#fff' }}>
                        <td style={s.td}>
                          <span style={s.badge(info.bg, info.cor)}><i className={`ti ${info.icon}`} style={{fontSize:11}} /> {info.label}</span>
                          {item.dias !== undefined && item.dias > 0 && (
                            <div style={{ fontSize: 10, color: '#888780', marginTop: 2 }}>{item.dias} dia(s) de diferença</div>
                          )}
                        </td>

                        {/* Extrato */}
                        <td style={s.td}>
                          {item.mov ? (
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 11 }}>{fmtData(item.mov.data)}</div>
                              <div style={{ color: '#5F5E5A', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.mov.descricao}</div>
                              <div style={{ fontWeight: 500, color: item.mov.valor >= 0 ? VERDE : VERMELHO }}>{fmt(item.mov.valor)}</div>
                              <div style={{ fontSize: 10, color: '#888780', fontFamily: 'monospace' }}>{item.mov.doc}</div>
                            </div>
                          ) : <span style={{ color: '#B4B2A9' }}>—</span>}
                        </td>

                        {/* Lançamento */}
                        <td style={s.td}>
                          {item.match ? (
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 11 }}>{fmtData(item.match.data)}</div>
                              <div style={{ color: '#5F5E5A', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.match.descricao}</div>
                              <div style={{ fontWeight: 500, color: item.match.tipo === 'entrada' ? VERDE : VERMELHO }}>R$ {Number(item.match.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              {item.match.fornecedor && <div style={{ fontSize: 10, color: '#888780' }}>{item.match.fornecedor}</div>}
                            </div>
                          ) : item.lancamento ? (
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 11 }}>{fmtData(item.lancamento.data)}</div>
                              <div style={{ color: '#5F5E5A', fontSize: 11 }}>{item.lancamento.descricao}</div>
                              <div style={{ fontWeight: 500, color: item.lancamento.tipo === 'entrada' ? VERDE : VERMELHO }}>R$ {Number(item.lancamento.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                          ) : <span style={{ color: '#B4B2A9', fontSize: 11 }}>Nenhum lançamento encontrado</span>}
                        </td>

                        {/* Score */}
                        <td style={s.td}>
                          {item.score > 0 ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: item.score >= 70 ? VERDE : item.score >= 40 ? LARANJA : '#888780' }}>{item.score}pts</div>
                              <div style={{ height: 4, background: '#F1EFE8', borderRadius: 99, overflow: 'hidden', width: 60, marginTop: 2 }}>
                                <div style={{ height: '100%', width: Math.min(item.score, 100) + '%', background: item.score >= 70 ? VERDE : LARANJA, borderRadius: 99 }} />
                              </div>
                            </div>
                          ) : <span style={{ color: '#B4B2A9' }}>—</span>}
                        </td>

                        {/* Ação */}
                        <td style={s.td}>
                          {item.status === 'conciliado_auto' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => confirmarConciliacao(item)} style={s.btn('#0E7EA8')}><i className="ti ti-check" style={{marginRight:4}} /> Confirmar</button>
                              <button onClick={() => rejeitarMatch(item)} style={s.btn('#F1EFE8', '#5F5E5A')}><i className="ti ti-x" style={{fontSize:14}} /></button>
                            </div>
                          )}
                          {item.status === 'possivel' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => confirmarConciliacao(item)} style={s.btn('#0E7EA8')}><i className="ti ti-check" style={{marginRight:4}} /> Confirmar</button>
                              <button onClick={() => rejeitarMatch(item)} style={s.btn('#F1EFE8', '#5F5E5A')}><i className="ti ti-x" style={{marginRight:4}} /> Rejeitar</button>
                            </div>
                          )}
                          {item.status === 'duplicidade' && (
                            <div style={{ fontSize: 11, color: VERMELHO }}>Resolva manualmente na Conciliação</div>
                          )}
                          {item.status === 'confirmado' && (
                            <span style={s.badge('#EAF3DE', '#3B6D11')}><i className="ti ti-check" style={{fontSize:14}} /><i className="ti ti-check" style={{marginRight:4}} /> Conciliado</span>
                          )}
                          {(item.status === 'sem_lancamento' || item.status === 'sem_extrato') && (
                            <span style={{ fontSize: 11, color: '#888780' }}>Classificar na Conciliação</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
      </div>
  )
}