import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import * as XLSX from 'xlsx'
import { gerarPDFCobrancas } from '../lib/pdf'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

const STATUS_OPCOES = [
  'pendente', 'em cobrança', 'em contato', 'promessa de pagamento',
  'promessa vencida', 'pago informado', 'pago confirmado no extrato',
  'não pago', 'sem resposta', 'contestação', 'renegociado', 'cancelado', 'incobrável'
]

const STATUS_COR = {
  'pendente': ['#F1EFE8','#5F5E5A'],
  'em cobrança': ['#E6F1FB','#185FA5'],
  'em contato': ['#FAEEDA','#854F0B'],
  'promessa de pagamento': ['#EAF3DE','#3B6D11'],
  'promessa vencida': ['#FCEBEB','#A32D2D'],
  'pago informado': ['#E6F1FB','#185FA5'],
  'pago confirmado no extrato': ['#EAF3DE','#3B6D11'],
  'não pago': ['#FCEBEB','#A32D2D'],
  'sem resposta': ['#F1EFE8','#888780'],
  'contestação': ['#FAEEDA','#854F0B'],
  'renegociado': ['#EEEDFE','#534AB7'],
  'cancelado': ['#F1EFE8','#5F5E5A'],
  'incobrável': ['#FCEBEB','#A32D2D'],
}

function parsearBoletosSimredi(rows) {
  let headerIdx = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row && row.some && row.some(c => String(c||'').includes('Pagador'))) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) return []
  const headers = rows[headerIdx].map(h => String(h||'').trim().toLowerCase())
  const boletos = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0]) continue
    const get = (nome) => {
      const idx = headers.findIndex(h => h.includes(nome.toLowerCase()))
      return idx >= 0 ? String(row[idx]||'').trim() : ''
    }
    const pagador = get('pagador')
    const vencimento = get('vencimento')
    const valor = get('valor (r$)') || get('valor')
    if (!pagador || !vencimento) continue
    let dataVenc = null
    if (vencimento.includes('/')) {
      const [d, m, a] = vencimento.split('/')
      dataVenc = `${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    } else { dataVenc = vencimento }
    let dataLiq = null
    const liquidacao = get('liquidação')
    if (liquidacao && liquidacao.includes('/')) {
      const [d, m, a] = liquidacao.split('/')
      dataLiq = `${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }
    boletos.push({
      carteira: get('cart'), num_doc: get('nº doc'), nosso_num: get('nosso nº'),
      txid: get('txid'), pagador, data_vencimento: dataVenc,
      data_liquidacao: dataLiq || null,
      valor: parseFloat(String(valor).replace(',','.')) || 0,
      valor_liquidacao: parseFloat(String(get('liquidação (r$)')||'0').replace(',','.')) || 0,
      situacao_boleto: get('situação do boleto') || 'VENCIDO',
      motivo: get('motivo'), status: 'pendente',
    })
  }
  return boletos
}

export default function Cobrancas() {
  const { perfil, user } = useAuth()
  const p = perfil?.perfil
  const isAdmin = p === 'admin'

  const [cobrancas, setCobrancas] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('lista')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [editando, setEditando] = useState(null)
  const [formEdit, setFormEdit] = useState({})
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState([])
  const [arquivoNome, setArquivoNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [ultimoLote, setUltimoLote] = useState(null)
  const [resumoImportacao, setResumoImportacao] = useState(null)

  useEffect(() => { carregar(); carregarUltimoLote() }, [])

  async function carregarUltimoLote() {
    const { data } = await supabase.from('lotes_cobranca')
      .select('*, importado_por:usuarios(nome)')
      .order('criado_em', { ascending: false })
      .limit(1)
      .single()
    setUltimoLote(data || null)
  }

  async function carregar() {
    setLoading(true)
    let q = supabase.from('cobrancas').select('*').order('data_vencimento')
    if (!isAdmin) q = q.not('status', 'in', '("pago confirmado no extrato","cancelado","incobrável")')
    const { data } = await q
    setCobrancas(data || [])
    setLoading(false)
  }

  async function importarXLS(e) {
    const file = e.target.files[0]
    if (!file) return
    setArquivoNome(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result)
        const wb = XLSX.read(data, { type: 'array', raw: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })
        const boletos = parsearBoletosSimredi(rows)
        if (boletos.length === 0) {
          setMsg('Nenhum boleto encontrado. Verifique se é o arquivo correto do Sicredi.')
          return
        }
        setPreview(boletos)
        setTab('importar')
      } catch(err) { setMsg('Erro ao ler arquivo: ' + err.message) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function confirmarImportacao() {
    setSalvando(true)
    const { data: lote, error: errLote } = await supabase.from('lotes_cobranca').insert({
      nome: `Importação ${new Date().toLocaleDateString('pt-BR')}`,
      arquivo_nome: arquivoNome,
      total_boletos: preview.length,
      importado_por: user.id,
    }).select().single()

    if (errLote) { setMsg('Erro ao criar lote: ' + errLote.message); setSalvando(false); return }

    let novos = 0, atualizados = 0, duplicatas = 0
    for (const b of preview) {
      const { data: existe } = await supabase.from('cobrancas')
        .select('id').eq('pagador', b.pagador).eq('data_vencimento', b.data_vencimento).eq('valor', b.valor).limit(1)
      if (existe && existe.length > 0) { duplicatas++; continue }
      await supabase.from('cobrancas').insert({ ...b, lote_id: lote.id, lote_importacao: lote.nome })
      novos++
    }

    await supabase.from('lotes_cobranca').update({ total_boletos: novos }).eq('id', lote.id)

    const resumo = {
      total: preview.length,
      novos,
      atualizados,
      duplicatas,
      arquivo: arquivoNome,
      data: new Date().toLocaleString('pt-BR'),
    }
    setResumoImportacao(resumo)
    setSalvando(false)
    setPreview([])
    setTab('lista')
    setMsg(`✅ ${novos} boletos importados. ${duplicatas > 0 ? duplicatas + ' duplicatas ignoradas.' : ''}`)
    carregar()
    carregarUltimoLote()
    setTimeout(() => setMsg(''), 5000)
  }

  async function salvarEdicao() {
    const { error } = await supabase.from('cobrancas').update({
      status: formEdit.status,
      pago_informado: formEdit.status === 'pago informado' || formEdit.pago_informado,
      data_promessa: formEdit.data_promessa || null,
      valor_prometido: formEdit.valor_prometido ? parseFloat(formEdit.valor_prometido) : null,
      ultima_obs: formEdit.ultima_obs,
      atualizado_por: user.id,
      atualizado_em: new Date().toISOString(),
    }).eq('id', editando)
    if (!error) {
      const c = cobrancas.find(x => x.id === editando)
      if (c && c.status !== formEdit.status) {
        await supabase.from('historico_cobrancas').insert({
          cobranca_id: editando, status_anterior: c.status,
          status_novo: formEdit.status, observacao: formEdit.ultima_obs, usuario_id: user.id,
        })
      }
      setEditando(null); setFormEdit({}); carregar()
    }
  }

  async function confirmarPagamento(id) {
    await supabase.from('cobrancas').update({
      pago_confirmado: true,
      data_pago_confirmado: new Date().toISOString().slice(0,10),
      status: 'pago confirmado no extrato',
      atualizado_por: user.id,
      atualizado_em: new Date().toISOString(),
    }).eq('id', id)
    carregar()
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const hoje = new Date().toISOString().slice(0,10)
  let lista = cobrancas
  if (filtroStatus !== 'todos') lista = lista.filter(c => c.status === filtroStatus)
  if (filtroPeriodo) lista = lista.filter(c => c.data_vencimento?.slice(0,7) === filtroPeriodo)

  const totalAberto = cobrancas.filter(c => !c.pago_confirmado).reduce((a,c) => a + Number(c.valor||0), 0)
  const totalInformado = cobrancas.filter(c => c.pago_informado && !c.pago_confirmado).reduce((a,c) => a + Number(c.valor||0), 0)
  const totalConfirmado = cobrancas.filter(c => c.pago_confirmado).reduce((a,c) => a + Number(c.valor||0), 0)
  const promessasHoje = cobrancas.filter(c => c.data_promessa === hoje && !c.pago_confirmado).length
  const promessasVencidas = cobrancas.filter(c => c.data_promessa && c.data_promessa < hoje && !c.pago_confirmado).length

  const s = {
    card: { background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: 10 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5', whiteSpace: 'nowrap' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12, verticalAlign: 'middle' },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    tab: ativo => ({ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: ativo ? VERDE : 'transparent', color: ativo ? '#fff' : '#5F5E5A', cursor: 'pointer' }),
    btn: (bg, cor='#fff') => ({ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: 'none', background: bg, color: cor, cursor: 'pointer', whiteSpace: 'nowrap' }),
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Cobranças / Boletos Vencidos</div>
          {ultimoLote && (
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>
              Última atualização: {new Date(ultimoLote.criado_em).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
              {ultimoLote.arquivo_nome && ` · ${ultimoLote.arquivo_nome}`}
              {ultimoLote.total_boletos !== undefined && ` · ${ultimoLote.total_boletos} boletos`}
            </div>
          )}
        </div>
        {isAdmin && (
          <label style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: '#4A8FD4', color: '#fff', cursor: 'pointer' }}>
            Importar XLS Sicredi
            <input type="file" accept=".xls,.xlsx" onChange={importarXLS} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      {msg && (
        <div style={{ background: msg.includes('✅') ? '#F2FAE8' : '#FEF2F2', border: `0.5px solid ${msg.includes('✅')?'#C0DD97':'#F7C1C1'}`, borderRadius: 10, padding: '.6rem 1rem', marginBottom: '1.25rem', fontSize: 12, color: msg.includes('✅') ? '#3B6D11' : '#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Resumo da última importação */}
      {resumoImportacao && (
        <div style={{ background:'#EAF3DE', border:'0.5px solid #C0DD97', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#3B6D11' }}>✅ Importação concluída</div>
            <button onClick={() => setResumoImportacao(null)} style={{ fontSize:11, padding:'2px 8px', borderRadius:6, border:'0.5px solid #3B6D11', background:'transparent', color:'#3B6D11', cursor:'pointer' }}>Fechar</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
            {[
              { label:'Total no arquivo', val:resumoImportacao.total },
              { label:'Novos importados', val:resumoImportacao.novos, cor:'#3B6D11' },
              { label:'Duplicatas ignoradas', val:resumoImportacao.duplicatas, cor:resumoImportacao.duplicatas>0?'#854F0B':'#3B6D11' },
            ].map(m => (
              <div key={m.label} style={{ background:'#fff', borderRadius:8, padding:'.6rem .75rem' }}>
                <div style={{ fontSize:10, color:'#888780' }}>{m.label}</div>
                <div style={{ fontSize:16, fontWeight:600, color:m.cor||'#3B6D11' }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:'#5F5E5A', marginTop:8 }}>
            Arquivo: {resumoImportacao.arquivo} · {resumoImportacao.data}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total boletos', val: cobrancas.length, cor: '#4A8FD4' },
          { label: 'Valor em aberto', val: fmt(totalAberto), cor: VERMELHO },
          { label: 'Pago informado', val: fmt(totalInformado), cor: '#BA7517' },
          { label: 'Pago confirmado', val: fmt(totalConfirmado), cor: VERDE },
          { label: promessasVencidas > 0 ? `Promessas vencidas (${promessasVencidas})` : `Promessas hoje (${promessasHoje})`, val: promessasVencidas > 0 ? promessasVencidas : promessasHoje, cor: promessasVencidas > 0 ? VERMELHO : '#BA7517' },
        ].map(m => (
          <div key={m.label} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '.75rem 1rem', border: '0.5px solid #E8E6DE', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.6rem' }} />
            <div style={{ fontSize: 10, color: '#888780', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('lista')} style={s.tab(tab==='lista')}>Lista</button>
        <button onClick={() => setTab('promessas')} style={s.tab(tab==='promessas')}>
          Promessas {promessasVencidas > 0 ? `(${promessasVencidas} vencidas)` : ''}
        </button>
        {isAdmin && <button onClick={() => setTab('pago_informado')} style={s.tab(tab==='pago_informado')}>Pago informado</button>}
        {tab === 'importar' && <button style={s.tab(true)}>Prévia ({preview.length})</button>}
      </div>

      {tab === 'importar' && preview.length > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Prévia — {preview.length} boletos encontrados</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPreview([]); setTab('lista') }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
              <button onClick={confirmarImportacao} disabled={salvando} style={s.btn(VERDE)}>
                {salvando ? 'Importando...' : `Confirmar importação (${preview.length})`}
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Pagador','Vencimento','Valor','Situação','TXID'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.map((b,i) => (
                  <tr key={i}>
                    <td style={s.td}>{b.pagador}</td>
                    <td style={s.td}>{b.data_vencimento ? new Date(b.data_vencimento+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ ...s.td, color: VERMELHO, fontWeight: 500 }}>{fmt(b.valor)}</td>
                    <td style={s.td}><span style={s.badge('#FAEEDA','#854F0B')}>{b.situacao_boleto}</span></td>
                    <td style={{ ...s.td, fontSize: 10, color: '#888780' }}>{b.txid?.slice(0,16)+'...'||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'lista' && (
        <div style={s.card}>
          <div style={{ display: 'flex', gap: 8, marginBottom: '.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
              <option value="todos">Todos os status</option>
              {STATUS_OPCOES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
            <input type="month" value={filtroPeriodo} onChange={e=>setFiltroPeriodo(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
            <span style={{ fontSize: 12, color: '#888780' }}>{lista.length} registros</span>
            <button onClick={() => gerarPDFCobrancas(lista, { periodo: filtroPeriodo, status: filtroStatus })} style={{ ...s.btn('#F4821F'), marginLeft: 'auto' }}>Exportar PDF</button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>Carregando...</div>
          ) : lista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>
              {cobrancas.length === 0 ? 'Nenhum boleto importado ainda.' : 'Nenhum boleto com esse filtro.'}
            </div>
          ) : (
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr>{['Pagador','Vencimento','Valor','Status','Promessa','Última obs',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {lista.map(c => {
                    const [bg, cor] = STATUS_COR[c.status] || ['#F1EFE8','#5F5E5A']
                    const promessaVencida = c.data_promessa && c.data_promessa < hoje && !c.pago_confirmado
                    return editando === c.id ? (
                      <tr key={c.id} style={{ background: '#F2FAE8' }}>
                        <td style={s.td} colSpan={2}><strong>{c.pagador}</strong></td>
                        <td style={s.td}>{fmt(c.valor)}</td>
                        <td style={{ ...s.td, minWidth: 180 }}>
                          <select value={formEdit.status||c.status} onChange={e=>setFormEdit(f=>({...f,status:e.target.value}))}
                            style={{ fontSize: 11, padding: '3px 6px', border: '0.5px solid #D3D1C7', borderRadius: 6, width: '100%' }}>
                            {STATUS_OPCOES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                          </select>
                        </td>
                        <td style={s.td}>
                          <input type="date" value={formEdit.data_promessa||''} onChange={e=>setFormEdit(f=>({...f,data_promessa:e.target.value}))}
                            style={{ fontSize: 11, padding: '3px 6px', border: '0.5px solid #D3D1C7', borderRadius: 6 }} />
                        </td>
                        <td style={s.td}>
                          <input value={formEdit.ultima_obs||''} onChange={e=>setFormEdit(f=>({...f,ultima_obs:e.target.value}))}
                            placeholder="Observação..." style={{ fontSize: 11, padding: '3px 6px', border: '0.5px solid #D3D1C7', borderRadius: 6, width: '100%' }} />
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={salvarEdicao} style={s.btn(VERDE)}>Salvar</button>
                            <button onClick={() => { setEditando(null); setFormEdit({}) }} style={s.btn('#F1EFE8','#5F5E5A')}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={c.id} style={{ background: c.pago_confirmado ? '#F2FAE8' : '#fff' }}>
                        <td style={{ ...s.td, fontWeight: 500 }}>{c.pagador}</td>
                        <td style={{ ...s.td, whiteSpace: 'nowrap', color: promessaVencida ? VERMELHO : '#1a1a1a' }}>
                          {c.data_vencimento ? new Date(c.data_vencimento+'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ ...s.td, fontWeight: 500, color: c.pago_confirmado ? VERDE : VERMELHO }}>{fmt(c.valor)}</td>
                        <td style={s.td}><span style={s.badge(bg, cor)}>{c.status}</span></td>
                        <td style={{ ...s.td, color: promessaVencida ? VERMELHO : '#5F5E5A', whiteSpace: 'nowrap' }}>
                          {c.data_promessa ? new Date(c.data_promessa+'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                          {c.valor_prometido ? ` · ${fmt(c.valor_prometido)}` : ''}
                        </td>
                        <td style={{ ...s.td, color: '#888780', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ultima_obs||'—'}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {!c.pago_confirmado && (
                              <button onClick={() => { setEditando(c.id); setFormEdit({ status: c.status, data_promessa: c.data_promessa||'', valor_prometido: c.valor_prometido||'', ultima_obs: '' }) }}
                                style={s.btn('#4A8FD4')}>Atualizar</button>
                            )}
                            {isAdmin && c.pago_informado && !c.pago_confirmado && (
                              <button onClick={() => confirmarPagamento(c.id)} style={s.btn(VERDE)}>✓ Confirmar extrato</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'promessas' && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Promessas de pagamento</div>
          {cobrancas.filter(c => c.data_promessa && !c.pago_confirmado).length === 0 ? (
            <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhuma promessa registrada.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Pagador','Vencimento','Valor','Data prometida','Status','Obs'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {cobrancas.filter(c => c.data_promessa && !c.pago_confirmado)
                  .sort((a,b) => a.data_promessa > b.data_promessa ? 1 : -1)
                  .map(c => {
                    const vencida = c.data_promessa < hoje
                    const [bg, cor] = vencida ? ['#FCEBEB','#A32D2D'] : ['#EAF3DE','#3B6D11']
                    return (
                      <tr key={c.id}>
                        <td style={{ ...s.td, fontWeight: 500 }}>{c.pagador}</td>
                        <td style={s.td}>{c.data_vencimento ? new Date(c.data_vencimento+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={{ ...s.td, color: VERMELHO, fontWeight: 500 }}>{fmt(c.valor)}</td>
                        <td style={{ ...s.td, color: vencida ? VERMELHO : VERDE, fontWeight: 500 }}>
                          {new Date(c.data_promessa+'T12:00:00').toLocaleDateString('pt-BR')}
                          {vencida ? ' ⚠ vencida' : ''}
                        </td>
                        <td style={s.td}><span style={s.badge(bg, cor)}>{c.status}</span></td>
                        <td style={{ ...s.td, color: '#888780' }}>{c.ultima_obs||'—'}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'pago_informado' && isAdmin && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.5rem' }}>Pago informado — aguardando confirmação no extrato</div>
          <div style={{ fontSize: 12, color: '#888780', marginBottom: '.85rem' }}>Confirme apenas quando aparecer no extrato bancário.</div>
          {cobrancas.filter(c => c.pago_informado && !c.pago_confirmado).length === 0 ? (
            <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhum boleto aguardando confirmação.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Pagador','Vencimento','Valor','Obs Operacional',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {cobrancas.filter(c => c.pago_informado && !c.pago_confirmado).map(c => (
                  <tr key={c.id}>
                    <td style={{ ...s.td, fontWeight: 500 }}>{c.pagador}</td>
                    <td style={s.td}>{c.data_vencimento ? new Date(c.data_vencimento+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ ...s.td, color: VERDE, fontWeight: 500 }}>{fmt(c.valor)}</td>
                    <td style={{ ...s.td, color: '#888780' }}>{c.ultima_obs||'—'}</td>
                    <td style={s.td}><button onClick={() => confirmarPagamento(c.id)} style={s.btn(VERDE)}>✓ Confirmar no extrato</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
