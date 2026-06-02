import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

export default function Conciliacao() {
  const [extratos, setExtratos] = useState([])
  const [extratoSel, setExtratoSel] = useState(null)
  const [movs, setMovs] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [contas, setContas] = useState([])
  const [planosTrabalho, setPlanosTrabalho] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [descExpandida, setDescExpandida] = useState(null)

  useEffect(() => {
    carregarExtratos()
    supabase.from('categorias').select('*').order('nome').then(({ data }) => setCategorias(data || []))
    supabase.from('subcategorias').select('*').order('nome').then(({ data }) => setSubcategorias(data || []))
    supabase.from('contas').select('*').order('nome').then(({ data }) => setContas(data || []))
    supabase.from('plano_trabalho').select('*, conta:contas(nome)').order('nome').then(({ data }) => setPlanosTrabalho(data || []))
  }, [])

  async function carregarExtratos() {
    const { data } = await supabase
      .from('extratos')
      .select('*, conta:contas(nome, banco, preponderancia)')
      .order('importado_em', { ascending: false })
    setExtratos(data || [])
  }

  async function abrirExtrato(ext) {
    setLoading(true)
    setExtratoSel(ext)
    const { data } = await supabase
      .from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), subcategoria:subcategorias(nome), plano:plano_trabalho(nome)')
      .eq('extrato_id', ext.id)
      .order('data')
    setMovs(data || [])
    setLoading(false)
  }

  async function salvarCategoria(movId, catId) {
    await supabase.from('extrato_movs')
      .update({ categoria_id: catId ? parseInt(catId) : null, subcategoria_id: null })
      .eq('id', movId)
    setMovs(prev => prev.map(m => m.id === movId
      ? { ...m, categoria_id: catId, subcategoria_id: null, subcategoria: null, categoria: categorias.find(c => String(c.id) === String(catId)) }
      : m))
  }

  async function salvarSubcategoria(movId, subId) {
    await supabase.from('extrato_movs').update({ subcategoria_id: subId ? parseInt(subId) : null }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id === movId ? { ...m, subcategoria_id: subId } : m))
  }

  async function salvarPreponderancia(movId, campo, valor) {
    await supabase.from('extrato_movs').update({ [campo]: parseFloat(valor) || 0 }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id === movId ? { ...m, [campo]: valor } : m))
  }

  async function salvarPlanoTrabalho(movId, planoId) {
    await supabase.from('extrato_movs').update({ plano_trabalho_id: planoId ? parseInt(planoId) : null }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id === movId
      ? { ...m, plano_trabalho_id: planoId, plano: planosTrabalho.find(p => String(p.id) === String(planoId)) }
      : m))
  }

  async function conciliarMov(movId, valor) {
    await supabase.from('extrato_movs').update({ conciliado: valor }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id === movId ? { ...m, conciliado: valor } : m))
  }

  async function conciliarTodos() {
    const ids = movsFiltradas.map(m => m.id)
    await supabase.from('extrato_movs').update({ conciliado: true }).in('id', ids)
    setMovs(prev => prev.map(m => ids.includes(m.id) ? { ...m, conciliado: true } : m))
    setMsg('Tudo conciliado! ✓')
    setTimeout(() => setMsg(''), 3000)
  }

  const subcatsDa = (catId) => subcategorias.filter(s => String(s.categoria_id) === String(catId))
  const planosDaConta = (contaId) => planosTrabalho.filter(p => String(p.conta_id) === String(contaId))

  const movsFiltradas = movs.filter(m => {
    if (filtro === 'pendentes') return !m.conciliado
    if (filtro === 'conciliados') return m.conciliado
    return true
  })

  const totalConciliados = movs.filter(m => m.conciliado).length
  const totalPendentes = movs.filter(m => !m.conciliado).length

  const fmt = v => {
    const abs = Math.abs(v)
    return (v >= 0 ? '+' : '-') + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', fontWeight: 500, borderBottom: '0.5px solid #E0DDD5', whiteSpace: 'nowrap' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', verticalAlign: 'middle', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    btn: (bg, cor = '#fff') => ({ padding: '5px 12px', fontSize: 11, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer', whiteSpace: 'nowrap' }),
    select: { fontSize: 11, padding: '3px 6px', border: '0.5px solid #D3D1C7', borderRadius: 8, background: '#fff', width: '100%' },
    input: { fontSize: 11, padding: '3px 6px', border: '0.5px solid #D3D1C7', borderRadius: 8, background: '#fff', width: '52px' },
    tab: ativo => ({ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: ativo ? VERDE : 'transparent', color: ativo ? '#fff' : '#5F5E5A', cursor: 'pointer' }),
  }

  // ===== LISTA DE EXTRATOS =====
  if (!extratoSel) return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Conciliação bancária</div>
      {extratos.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '3rem', color: '#888780' }}>
          <i className="ti ti-upload" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>Nenhum extrato importado ainda.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Vá em <strong>Importar extrato</strong> para começar.</div>
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Extratos importados — clique para abrir e conciliar</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              {['Competência','Conta','Preponderância','Movimentações','Saldo final','Importado em',''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {extratos.map(e => (
                <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => abrirExtrato(e)}>
                  <td style={s.td}><strong>{e.competencia}</strong></td>
                  <td style={s.td}>{e.conta?.nome || '—'}</td>
                  <td style={s.td}>
                    <span style={s.badge(
                      e.conta?.preponderancia === 'rateio' ? '#F1EFE8' : '#EAF3DE',
                      e.conta?.preponderancia === 'rateio' ? '#5F5E5A' : '#3B6D11'
                    )}>
                      {e.conta?.preponderancia === 'rateio' ? 'Rateia' : e.conta?.preponderancia || '—'}
                    </span>
                  </td>
                  <td style={s.td}>{e.total_movs} movs</td>
                  <td style={{ ...s.td, color: VERDE, fontWeight: 500 }}>R$ {Number(e.saldo_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ ...s.td, color: '#888780' }}>{new Date(e.importado_em).toLocaleDateString('pt-BR')}</td>
                  <td style={s.td}><button onClick={ev => { ev.stopPropagation(); abrirExtrato(e) }} style={s.btn(VERDE)}>Abrir →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const contaPrep = extratoSel.conta?.preponderancia
  const isRateio = contaPrep === 'rateio'
  const isEmenda = contaPrep && contaPrep !== 'rateio'
  const planosDisponiveis = planosDaConta(extratoSel.conta_id)

  // ===== TELA DE CONCILIAÇÃO =====
  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
        <button onClick={() => { setExtratoSel(null); setMovs([]) }}
          style={{ padding: '5px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>
          ← Voltar
        </button>
        <div style={{ fontSize: 15, fontWeight: 500 }}>
          Conciliação — {extratoSel.competencia} · {extratoSel.conta?.nome}
        </div>
        {isRateio && <span style={s.badge('#FAEEDA', '#854F0B')}>Conta Principal — informar preponderância</span>}
        {isEmenda && <span style={s.badge('#EAF3DE', '#3B6D11')}>Emenda — {contaPrep} · informar plano de trabalho</span>}
        {totalPendentes === 0 && movs.length > 0 && <span style={s.badge('#EAF3DE', '#3B6D11')}>✓ Tudo conciliado</span>}
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total movimentações', val: movs.length, cor: '#4A8FD4' },
          { label: 'Conciliados', val: totalConciliados, cor: VERDE },
          { label: 'Pendentes', val: totalPendentes, cor: totalPendentes > 0 ? '#BA7517' : VERDE },
          { label: 'Saldo final', val: 'R$ ' + Number(extratoSel.saldo_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), cor: VERDE },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
            <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Barra de progresso */}
      {movs.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888780', marginBottom: 4 }}>
            <span>Progresso da conciliação</span>
            <span>{totalConciliados} de {movs.length} ({Math.round(totalConciliados / movs.length * 100)}%)</span>
          </div>
          <div style={{ height: 8, background: '#F1EFE8', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(totalConciliados / movs.length * 100)}%`, background: VERDE, borderRadius: 99, transition: 'width .3s' }} />
          </div>
        </div>
      )}

      {/* Info preponderância */}
      {isRateio && (
        <div style={{ background: '#FAEEDA', borderLeft: '3px solid #BA7517', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#854F0B', marginBottom: '1.25rem' }}>
          <strong>Conta Principal:</strong> informe a preponderância de cada movimentação (Educação + Assistência Social + Saúde = 100%)
        </div>
      )}
      {isEmenda && planosDisponiveis.length === 0 && (
        <div style={{ background: '#FEF2F2', borderLeft: '3px solid #E8212A', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#A32D2D', marginBottom: '1.25rem' }}>
          <strong>Nenhum plano de trabalho cadastrado para esta conta.</strong> Vá em Configurações → Plano de Trabalho para cadastrar.
        </div>
      )}

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['todos','Todos'], ['pendentes','Pendentes'], ['conciliados','Conciliados']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)} style={s.tab(filtro === v)}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 12, color: '#3B6D11', fontWeight: 500 }}>{msg}</span>}
            {totalPendentes > 0 && (
              <button onClick={conciliarTodos} style={s.btn(VERDE)}>✓ Conciliar todos ({totalPendentes})</button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>Carregando...</div>
        ) : (
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <tr>
                  <th style={s.th}>Data</th>
                  <th style={s.th}>Descrição</th>
                  <th style={s.th}>Doc</th>
                  <th style={s.th}>Categoria</th>
                  <th style={s.th}>Subcategoria</th>
                  {isRateio && <th style={s.th}>Educ %</th>}
                  {isRateio && <th style={s.th}>Social %</th>}
                  {isRateio && <th style={s.th}>Saúde %</th>}
                  {isEmenda && <th style={s.th}>Plano de trabalho</th>}
                  <th style={s.th}>Valor</th>
                  <th style={s.th}>Situação</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {movsFiltradas.length === 0 && (
                  <tr><td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: '#888780' }}>Nenhum item.</td></tr>
                )}
                {movsFiltradas.map(m => {
                  const subcats = m.categoria_id ? subcatsDa(m.categoria_id) : []
                  const totalPrep = (parseFloat(m.prep_educacao)||0) + (parseFloat(m.prep_social)||0) + (parseFloat(m.prep_saude)||0)
                  const prepOk = totalPrep === 100
                  return (
                    <tr key={m.id} style={{ background: m.conciliado ? '#F2FAE8' : '#fff' }}>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>

                      {/* Descrição expandível */}
                      <td style={{ ...s.td, maxWidth: 180 }}>
                        <div onClick={() => setDescExpandida(descExpandida === m.id ? null : m.id)} style={{ cursor: 'pointer' }}>
                          {descExpandida === m.id ? (
                            <div style={{ whiteSpace: 'normal', wordBreak: 'break-all', background: '#F8F7F2', borderRadius: 6, padding: '4px 6px', fontSize: 11 }}>
                              {m.descricao}
                              <div style={{ marginTop: 4, fontSize: 10, color: VERDE }}>▲ recolher</div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{m.descricao}</span>
                              {m.descricao?.length > 25 && <span style={{ fontSize: 10, color: '#4A8FD4', flexShrink: 0 }}>▼</span>}
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={s.td}>
                        <span style={{ fontSize: 10, background: '#F1EFE8', color: '#5F5E5A', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>{m.doc}</span>
                      </td>

                      <td style={{ ...s.td, minWidth: 150 }}>
                        <select value={m.categoria_id || ''} onChange={e => salvarCategoria(m.id, e.target.value)} style={s.select}>
                          <option value="">Selecione...</option>
                          {categorias.filter(c => c.tipo === (m.tipo === 'entrada' ? 'entrada' : 'despesa')).map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      </td>

                      <td style={{ ...s.td, minWidth: 130 }}>
                        {subcats.length > 0 ? (
                          <select value={m.subcategoria_id || ''} onChange={e => salvarSubcategoria(m.id, e.target.value)} style={s.select}>
                            <option value="">Selecione...</option>
                            {subcats.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, color: '#B4B2A9' }}>{m.categoria_id ? '—' : '—'}</span>
                        )}
                      </td>

                      {/* Preponderância — só Conta Principal */}
                      {isRateio && (
                        <>
                          <td style={s.td}>
                            <input type="number" min="0" max="100" value={m.prep_educacao || ''} placeholder="0"
                              onChange={e => salvarPreponderancia(m.id, 'prep_educacao', e.target.value)}
                              style={{ ...s.input, borderColor: !prepOk && totalPrep > 0 ? '#E8212A' : '#D3D1C7' }} />
                          </td>
                          <td style={s.td}>
                            <input type="number" min="0" max="100" value={m.prep_social || ''} placeholder="0"
                              onChange={e => salvarPreponderancia(m.id, 'prep_social', e.target.value)}
                              style={{ ...s.input, borderColor: !prepOk && totalPrep > 0 ? '#E8212A' : '#D3D1C7' }} />
                          </td>
                          <td style={s.td}>
                            <input type="number" min="0" max="100" value={m.prep_saude || ''} placeholder="0"
                              onChange={e => salvarPreponderancia(m.id, 'prep_saude', e.target.value)}
                              style={{ ...s.input, borderColor: !prepOk && totalPrep > 0 ? '#E8212A' : '#D3D1C7' }} />
                          </td>
                        </>
                      )}

                      {/* Plano de trabalho — só Emendas */}
                      {isEmenda && (
                        <td style={{ ...s.td, minWidth: 160 }}>
                          <select value={m.plano_trabalho_id || ''} onChange={e => salvarPlanoTrabalho(m.id, e.target.value)} style={s.select}>
                            <option value="">Selecione...</option>
                            {planosDisponiveis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                        </td>
                      )}

                      <td style={{ ...s.td, fontWeight: 500, color: m.valor >= 0 ? VERDE : VERMELHO, whiteSpace: 'nowrap' }}>
                        {fmt(m.valor)}
                      </td>

                      <td style={s.td}>
                        <span style={s.badge(m.conciliado ? '#EAF3DE' : '#FAEEDA', m.conciliado ? '#3B6D11' : '#854F0B')}>
                          {m.conciliado ? '✓ OK' : 'Pendente'}
                        </span>
                      </td>

                      <td style={s.td}>
                        <button onClick={() => conciliarMov(m.id, !m.conciliado)}
                          style={s.btn(m.conciliado ? '#F1EFE8' : VERDE, m.conciliado ? '#5F5E5A' : '#fff')}>
                          {m.conciliado ? 'Desfazer' : 'OK ✓'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
