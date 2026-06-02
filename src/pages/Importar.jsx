import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { parsearExtratoSicredi } from '../lib/db'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

export default function Importar() {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [extrato, setExtrato] = useState(null)
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [contaSel, setContaSel] = useState('')
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7))
  const [movs, setMovs] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [extratoSel, setExtratoSel] = useState(null)
  const [movsExtrato, setMovsExtrato] = useState([])
  const [aba, setAba] = useState('importar') // 'importar' | 'historico'
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('contas').select('*').order('nome').then(({ data }) => {
      setContas(data || [])
      if (data?.length) setContaSel(String(data[0].id))
    })
    supabase.from('categorias').select('*').order('nome').then(({ data }) => setCategorias(data || []))
    carregarHistorico()
  }, [])

  async function carregarHistorico() {
    const { data } = await supabase
      .from('extratos')
      .select('*, conta:contas(nome)')
      .order('importado_em', { ascending: false })
    setHistorico(data || [])
  }

  async function abrirExtrato(ext) {
    setExtratoSel(ext)
    const { data } = await supabase
      .from('extrato_movs')
      .select('*, categoria:categorias(nome)')
      .eq('extrato_id', ext.id)
      .order('data')
    setMovsExtrato(data || [])
    setAba('ver')
  }

  function lerArquivo(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target.result)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })
        const resultado = parsearExtratoSicredi(rows)
        setExtrato({ ...resultado, arquivo: file.name })
        setMovs(resultado.movs.map(m => ({ ...m, categoria_id: '' })))
        setStep(2)
      } catch { alert('Erro ao ler o arquivo. Verifique se é o extrato XLS do Sicredi.') }
    }
    reader.readAsArrayBuffer(file)
  }

  function setCatMov(idx, cat_id) {
    setMovs(prev => prev.map((m, i) => i === idx ? { ...m, categoria_id: cat_id } : m))
  }

  async function salvarExtrato() {
    setSalvando(true)
    // 1. Salva o extrato
    const { data: ext, error } = await supabase.from('extratos').insert({
      conta_id: parseInt(contaSel),
      competencia,
      arquivo_nome: extrato.arquivo,
      saldo_final: extrato.saldoFinal,
      total_movs: movs.length,
      importado_por: user.id,
    }).select().single()

    if (error) { setMsg('Erro ao salvar: ' + error.message); setSalvando(false); return }

    // 2. Salva as movimentações
    const itens = movs.map(m => ({
      extrato_id: ext.id,
      data: m.dataISO,
      descricao: m.desc,
      doc: m.doc,
      valor: m.tipo === 'entrada' ? m.valorAbs : -m.valorAbs,
      tipo: m.tipo,
      classif_auto: m.classif,
      categoria_id: m.categoria_id ? parseInt(m.categoria_id) : null,
      conciliado: false,
    }))

    const { error: err2 } = await supabase.from('extrato_movs').insert(itens)
    if (err2) { setMsg('Erro ao salvar movimentações: ' + err2.message); setSalvando(false); return }

    setMsg('Extrato salvo!')
    carregarHistorico()
    setStep(1)
    setExtrato(null)
    setMovs([])
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function salvarCategoria(movId, catId) {
    await supabase.from('extrato_movs').update({ categoria_id: catId ? parseInt(catId) : null }).eq('id', movId)
    setMovsExtrato(prev => prev.map(m => m.id === movId ? { ...m, categoria_id: catId, categoria: categorias.find(c => c.id == catId) } : m))
  }

  async function conciliarMov(movId, conciliado) {
    await supabase.from('extrato_movs').update({ conciliado }).eq('id', movId)
    setMovsExtrato(prev => prev.map(m => m.id === movId ? { ...m, conciliado } : m))
  }

  async function conciliarTodos() {
    const ids = movsExtrato.map(m => m.id)
    await supabase.from('extrato_movs').update({ conciliado: true }).in('id', ids)
    setMovsExtrato(prev => prev.map(m => ({ ...m, conciliado: true })))
    setMsg('Todas as movimentações conciliadas!')
    setTimeout(() => setMsg(''), 3000)
  }

  const fmt = (v) => {
    const abs = Math.abs(v)
    const sinal = v >= 0 ? '+' : '-'
    return sinal + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const s = { // estilos reutilizáveis
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', fontWeight: 500, borderBottom: '0.5px solid #E0DDD5' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', verticalAlign: 'middle', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    btn: (bg, cor = '#fff') => ({ padding: '5px 12px', fontSize: 11, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer' }),
    btnOutline: { padding: '5px 12px', fontSize: 11, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' },
    select: { fontSize: 12, padding: '4px 7px', border: '0.5px solid #D3D1C7', borderRadius: 8, background: '#fff', width: '100%' },
    tab: (ativo) => ({ padding: '7px 16px', fontSize: 13, cursor: 'pointer', color: ativo ? VERDE : '#5F5E5A', borderBottom: ativo ? `2px solid ${VERDE}` : '2px solid transparent', marginBottom: -1, fontWeight: ativo ? 500 : 'normal', background: 'none', border: 'none', borderBottom: ativo ? `2px solid ${VERDE}` : '2px solid transparent' }),
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Extrato bancário</div>

      {/* Abas */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid #E0DDD5', marginBottom: '1.25rem' }}>
        {[['importar','Importar novo'], ['historico','Histórico de importações']].map(([id, label]) => (
          <button key={id} onClick={() => { setAba(id); setExtratoSel(null) }}
            style={{ padding: '7px 16px', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', borderBottom: aba===id ? `2px solid ${VERDE}` : '2px solid transparent', color: aba===id ? VERDE : '#5F5E5A', fontWeight: aba===id ? 500 : 'normal', marginBottom: -1 }}>
            {label}
          </button>
        ))}
        {extratoSel && (
          <button onClick={() => {}} style={{ padding: '7px 16px', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', borderBottom: aba==='ver' ? `2px solid ${VERDE}` : '2px solid transparent', color: aba==='ver' ? VERDE : '#5F5E5A', fontWeight: aba==='ver' ? 500 : 'normal', marginBottom: -1 }}>
            {extratoSel.competencia} — {extratoSel.conta?.nome}
          </button>
        )}
      </div>

      {/* ===== ABA IMPORTAR ===== */}
      {aba === 'importar' && (
        <>
          {step === 1 && (
            <div style={s.card}>
              <div style={{ background: '#F8F7F2', borderLeft: '3px solid #4A8FD4', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A', marginBottom: '1rem' }}>
                <strong>Formato suportado: Sicredi · XLS</strong> — exporte normalmente pelo internet banking e selecione abaixo.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Conta bancária</label>
                  <select value={contaSel} onChange={e => setContaSel(e.target.value)} style={s.select}>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Competência</label>
                  <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} style={{ ...s.select, width: '100%' }} />
                </div>
              </div>
              <label style={{ display: 'block', border: '1.5px dashed #D3D1C7', borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer', color: '#888780', fontSize: 13 }}>
                <i className="ti ti-file-spreadsheet" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: VERDE }} />
                <div style={{ fontWeight: 500, marginBottom: 4, color: '#2C2C2A' }}>Clique para selecionar o XLS do Sicredi</div>
                <div style={{ fontSize: 11 }}>.xls · .xlsx</div>
                <input type="file" accept=".xls,.xlsx" onChange={lerArquivo} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {step === 2 && extrato && (
            <>
              {/* Resumo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
                {[
                  { label: 'Associado', val: extrato.associado || '—', cor: '#4A8FD4' },
                  { label: 'Conta', val: 'Sicredi · ' + (extrato.conta || '—'), cor: '#8B2FC9' },
                  { label: 'Entradas', val: movs.filter(m => m.tipo === 'entrada').length + ' movs', cor: VERDE },
                  { label: 'Saídas', val: movs.filter(m => m.tipo === 'saida').length + ' movs', cor: VERMELHO },
                ].map(m => (
                  <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
                    <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
                    <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m.val}</div>
                  </div>
                ))}
              </div>

              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Revise e categorize as movimentações</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setStep(1); setExtrato(null); setMovs([]) }} style={s.btnOutline}>Voltar</button>
                    <button onClick={salvarExtrato} disabled={salvando}
                      style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: VERDE, color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                      {salvando ? 'Salvando...' : 'Salvar extrato'}
                    </button>
                  </div>
                </div>

                {msg && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msg.includes('Erro') ? '#FEF2F2' : '#F2FAE8', color: msg.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>{msg}</div>}

                <div style={{ maxHeight: 450, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                      <tr>
                        {['Data', 'Descrição', 'Doc', 'Tipo', 'Classificação auto', 'Categoria', 'Valor'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {movs.map((m, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                          <td style={s.td}>{m.data}</td>
                          <td style={{ ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.desc}>{m.desc}</td>
                          <td style={s.td}><span style={{ fontSize: 10, background: '#F1EFE8', color: '#5F5E5A', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>{m.doc}</span></td>
                          <td style={s.td}>
                            <span style={s.badge(m.tipo === 'entrada' ? '#EAF3DE' : '#FCEBEB', m.tipo === 'entrada' ? '#3B6D11' : '#A32D2D')}>
                              {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{m.classif}</td>
                          <td style={{ ...s.td, minWidth: 160 }}>
                            <select value={m.categoria_id} onChange={e => setCatMov(i, e.target.value)} style={s.select}>
                              <option value="">Selecione...</option>
                              {categorias.filter(c => c.tipo === (m.tipo === 'entrada' ? 'entrada' : 'despesa')).map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ ...s.td, fontWeight: 500, color: m.tipo === 'entrada' ? VERDE : VERMELHO, whiteSpace: 'nowrap' }}>
                            {fmt(m.tipo === 'entrada' ? m.valorAbs : -m.valorAbs)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ===== ABA HISTÓRICO ===== */}
      {aba === 'historico' && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Extratos importados</div>
          {historico.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>Nenhum extrato importado ainda.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                {['Competência', 'Conta', 'Arquivo', 'Movimentações', 'Saldo final', 'Importado em', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {historico.map(e => (
                  <tr key={e.id}>
                    <td style={s.td}><strong>{e.competencia}</strong></td>
                    <td style={s.td}>{e.conta?.nome || '—'}</td>
                    <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{e.arquivo_nome || '—'}</td>
                    <td style={s.td}>{e.total_movs} movs</td>
                    <td style={{ ...s.td, color: VERDE, fontWeight: 500 }}>R$ {Number(e.saldo_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{new Date(e.importado_em).toLocaleDateString('pt-BR')}</td>
                    <td style={s.td}>
                      <button onClick={() => abrirExtrato(e)} style={s.btn(VERDE)}>Ver / Conciliar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== ABA VER EXTRATO ===== */}
      {aba === 'ver' && extratoSel && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
            {[
              { label: 'Conta', val: extratoSel.conta?.nome, cor: '#4A8FD4' },
              { label: 'Competência', val: extratoSel.competencia, cor: '#8B2FC9' },
              { label: 'Total movs', val: extratoSel.total_movs, cor: VERDE },
              { label: 'Conciliados', val: movsExtrato.filter(m => m.conciliado).length + '/' + movsExtrato.length, cor: movsExtrato.every(m => m.conciliado) ? VERDE : '#BA7517' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
                <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
                <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{m.val}</div>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Movimentações — {extratoSel.competencia}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {msg && <span style={{ fontSize: 12, color: '#3B6D11' }}>{msg}</span>}
                <button onClick={conciliarTodos} style={s.btn(VERDE)}>✓ Conciliar tudo</button>
              </div>
            </div>

            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr>{['Data', 'Descrição', 'Doc', 'Classificação', 'Categoria', 'Valor', 'Situação', ''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {movsExtrato.map(m => (
                    <tr key={m.id} style={{ background: m.conciliado ? '#F2FAE8' : '#fff' }}>
                      <td style={s.td}>{new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.descricao}>{m.descricao}</td>
                      <td style={s.td}><span style={{ fontSize: 10, background: '#F1EFE8', color: '#5F5E5A', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>{m.doc}</span></td>
                      <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{m.classif_auto}</td>
                      <td style={{ ...s.td, minWidth: 160 }}>
                        <select value={m.categoria_id || ''} onChange={e => salvarCategoria(m.id, e.target.value)} style={s.select}>
                          <option value="">Selecione...</option>
                          {categorias.filter(c => c.tipo === (m.tipo === 'entrada' ? 'entrada' : 'despesa')).map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...s.td, fontWeight: 500, color: m.valor >= 0 ? VERDE : VERMELHO, whiteSpace: 'nowrap' }}>
                        {fmt(m.valor)}
                      </td>
                      <td style={s.td}>
                        <span style={s.badge(m.conciliado ? '#EAF3DE' : '#FAEEDA', m.conciliado ? '#3B6D11' : '#854F0B')}>
                          {m.conciliado ? 'Conciliado ✓' : 'Pendente'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button onClick={() => conciliarMov(m.id, !m.conciliado)}
                          style={s.btn(m.conciliado ? '#F1EFE8' : VERDE, m.conciliado ? '#5F5E5A' : '#fff')}>
                          {m.conciliado ? 'Desfazer' : 'OK ✓'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
