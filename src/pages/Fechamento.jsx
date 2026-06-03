import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

export default function Fechamento() {
  const { user, perfil } = useAuth()
  const isAdmin = perfil?.perfil === 'admin'
  const [contas, setContas] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [contaSel, setContaSel] = useState('')
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0,7))
  const [justificativa, setJustificativa] = useState('')
  const [reabrindo, setReabrindo] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendencias, setPendencias] = useState(null)
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    supabase.from('contas').select('id, nome, banco').order('nome').then(({ data }) => setContas(data || []))
    carregar()
  }, [])

  async function carregar() {
    const { data } = await supabase
      .from('fechamentos')
      .select('*, conta:contas(nome, banco)')
      .order('criado_em', { ascending: false })
    setFechamentos(data || [])
  }

  async function verificarPendencias() {
    if (!contaSel || !competencia) return
    setVerificando(true)
    setPendencias(null)

    // Busca extratos da conta no período
    const { data: extratos } = await supabase
      .from('extratos')
      .select('id')
      .eq('conta_id', parseInt(contaSel))
      .eq('competencia', competencia)

    if (!extratos || extratos.length === 0) {
      setPendencias({ total: 0, semCategoria: 0, naoConciliadas: 0, semFornecedor: 0, extratoImportado: false })
      setVerificando(false)
      return
    }

    const extratoIds = extratos.map(e => e.id)
    const { data: movs } = await supabase
      .from('extrato_movs')
      .select('id, conciliado, categoria_id, fornecedor, valor')
      .in('extrato_id', extratoIds)

    const lista = movs || []
    setPendencias({
      total: lista.length,
      semCategoria: lista.filter(m => !m.categoria_id).length,
      naoConciliadas: lista.filter(m => !m.conciliado).length,
      semFornecedor: lista.filter(m => m.valor < 0 && !m.fornecedor).length,
      extratoImportado: true,
    })
    setVerificando(false)
  }

  async function fechar() {
    if (!contaSel || !competencia) return
    if (pendencias?.naoConciliadas > 0) {
      if (!confirm(`Ainda há ${pendencias.naoConciliadas} movimentações não conciliadas. Deseja fechar mesmo assim?`)) return
    }
    setLoading(true)
    const { error } = await supabase.from('fechamentos').insert({
      conta_id: parseInt(contaSel),
      competencia,
      tipo: 'mensal',
      status: 'fechado',
      fechado_por: user.id,
      fechado_em: new Date().toISOString(),
    })
    if (error) { setMsg('Erro: ' + error.message); setLoading(false); return }
    setMsg('✅ Período fechado com sucesso!')
    setPendencias(null)
    carregar()
    setLoading(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function reabrir(f) {
    if (!justificativa.trim()) { setMsg('Informe a justificativa para reabrir.'); return }
    setLoading(true)
    const { error } = await supabase.from('fechamentos').update({
      status: 'reaberto',
      reaberto_por: user.id,
      reaberto_em: new Date().toISOString(),
      justificativa_reabertura: justificativa,
    }).eq('id', f.id)
    if (error) { setMsg('Erro: ' + error.message); setLoading(false); return }
    setMsg('✅ Período reaberto.')
    setReabrindo(null)
    setJustificativa('')
    carregar()
    setLoading(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const periodoFechado = (contaId, comp) =>
    fechamentos.some(f => String(f.conta_id) === String(contaId) && f.competencia === comp && f.status === 'fechado')

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') + ' ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'

  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    input: { width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    btn: (bg, cor = '#fff') => ({ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer' }),
  }

  const jaFechado = contaSel && competencia && periodoFechado(contaSel, competencia)

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Fechamento de período</div>

      <div style={{ background: '#E6F1FB', border: '0.5px solid #B3D1F0', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1.25rem', fontSize: 12, color: '#185FA5' }}>
        <strong>ℹ Como funciona:</strong> Ao fechar um período, as movimentações daquele mês ficam bloqueadas para edição. Somente o Admin pode reabrir, informando uma justificativa. O histórico fica registrado.
      </div>

      {/* Fechar período */}
      {isAdmin && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Fechar período</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10, marginBottom: 10, alignItems: 'flex-end' }}>
            <div>
              <label style={s.label}>Conta bancária</label>
              <select value={contaSel} onChange={e => { setContaSel(e.target.value); setPendencias(null) }} style={s.input}>
                <option value="">Selecione uma conta...</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Competência</label>
              <input type="month" value={competencia} onChange={e => { setCompetencia(e.target.value); setPendencias(null) }} style={s.input} />
            </div>
            <button onClick={verificarPendencias} disabled={!contaSel || !competencia || verificando}
              style={s.btn('#4A8FD4')}>
              {verificando ? 'Verificando...' : 'Verificar pendências'}
            </button>
          </div>

          {/* Resultado da verificação */}
          {pendencias && (
            <div style={{ marginBottom: 10 }}>
              {!pendencias.extratoImportado ? (
                <div style={{ background: '#FAEEDA', borderLeft: '3px solid #F4821F', borderRadius: '0 8px 8px 0', padding: '.6rem .9rem', fontSize: 12, color: '#854F0B' }}>
                  ⚠ Nenhum extrato importado para esta conta neste período.
                </div>
              ) : (
                <div style={{ background: pendencias.naoConciliadas > 0 || pendencias.semCategoria > 0 ? '#FAEEDA' : '#F2FAE8', borderLeft: `3px solid ${pendencias.naoConciliadas > 0 ? '#F4821F' : VERDE}`, borderRadius: '0 8px 8px 0', padding: '.75rem 1rem', fontSize: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 6, color: pendencias.naoConciliadas > 0 ? '#854F0B' : '#3B6D11' }}>
                    {pendencias.naoConciliadas === 0 && pendencias.semCategoria === 0 ? '✓ Período pronto para fechar!' : '⚠ Pendências encontradas:'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[
                      { label: 'Total movimentações', val: pendencias.total, cor: '#5F5E5A' },
                      { label: 'Não conciliadas', val: pendencias.naoConciliadas, cor: pendencias.naoConciliadas > 0 ? VERMELHO : VERDE },
                      { label: 'Sem categoria', val: pendencias.semCategoria, cor: pendencias.semCategoria > 0 ? VERMELHO : VERDE },
                      { label: 'Saídas sem fornecedor', val: pendencias.semFornecedor, cor: pendencias.semFornecedor > 0 ? '#BA7517' : VERDE },
                    ].map(m => (
                      <div key={m.label} style={{ background: '#fff', borderRadius: 8, padding: '6px 10px', border: '0.5px solid #E0DDD5' }}>
                        <div style={{ fontSize: 10, color: '#888780', marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: m.cor }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {msg && (
            <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msg.includes('✅') ? '#F2FAE8' : '#FEF2F2', color: msg.includes('✅') ? '#3B6D11' : '#A32D2D' }}>
              {msg}
            </div>
          )}

          {jaFechado ? (
            <div style={s.badge('#EAF3DE', '#3B6D11')}>✓ Este período já está fechado</div>
          ) : (
            <button onClick={fechar} disabled={loading || !contaSel || !competencia || !pendencias}
              style={s.btn(contaSel && competencia && pendencias ? VERDE : '#D3D1C7')}>
              {loading ? 'Fechando...' : '🔒 Fechar período'}
            </button>
          )}
        </div>
      )}

      {/* Histórico */}
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Histórico de fechamentos</div>
        {fechamentos.length === 0 ? (
          <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhum período fechado ainda.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Conta','Competência','Status','Fechado em','Reaberto em','Justificativa',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {fechamentos.map(f => (
                <React.Fragment key={f.id}>
                  <tr>
                    <td style={{ ...s.td, fontWeight: 500 }}>{f.conta?.nome || '—'}</td>
                    <td style={s.td}>{f.competencia}</td>
                    <td style={s.td}>
                      <span style={s.badge(f.status === 'fechado' ? '#FCEBEB' : '#EAF3DE', f.status === 'fechado' ? '#A32D2D' : '#3B6D11')}>
                        {f.status === 'fechado' ? '🔒 Fechado' : '🔓 Reaberto'}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{fmtData(f.fechado_em)}</td>
                    <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{f.reaberto_em ? fmtData(f.reaberto_em) : '—'}</td>
                    <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{f.justificativa_reabertura || '—'}</td>
                    <td style={s.td}>
                      {isAdmin && f.status === 'fechado' && (
                        <button onClick={() => setReabrindo(f.id)}
                          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: `0.5px solid ${VERDE}`, background: 'transparent', color: VERDE, cursor: 'pointer' }}>
                          Reabrir
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Formulário de reabertura */}
                  {reabrindo === f.id && (
                    <tr>
                      <td colSpan={7} style={{ padding: '10px 8px', borderBottom: '0.5px solid #E0DDD5', background: '#F8F7F2' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <label style={s.label}>Justificativa para reabertura (obrigatório)</label>
                            <input value={justificativa} onChange={e => setJustificativa(e.target.value)}
                              placeholder="Descreva o motivo da reabertura..."
                              style={{ ...s.input, fontSize: 12 }} />
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', paddingBottom: 1 }}>
                            <button onClick={() => reabrir(f)} disabled={!justificativa.trim() || loading}
                              style={s.btn(justificativa.trim() ? VERDE : '#D3D1C7')}>
                              Confirmar reabertura
                            </button>
                            <button onClick={() => { setReabrindo(null); setJustificativa('') }}
                              style={s.btn('#F1EFE8', '#5F5E5A')}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                        {msg && <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 6 }}>{msg}</div>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
