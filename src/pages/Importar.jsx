import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { parsearExtratoSicredi } from '../lib/db'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { confirmar } from '../lib/ui'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8'

export default function Importar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contas, setContas] = useState([])
  const [contaSel, setContaSel] = useState('')
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7))
  const [extrato, setExtrato] = useState(null)
  const [movs, setMovs] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [avisoSaldo, setAvisoSaldo] = useState('')
  const [step, setStep] = useState(1)
  const [aba, setAba] = useState('importar')
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [abaHist, setAbaHist] = useState('extrato')
  const [novasMovs, setNovasMovs] = useState(null)
  const [cancelando, setCancelando] = useState(null)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(null)

  useEffect(() => {
    supabase.from('contas').select('*').order('nome').then(({ data }) => {
      setContas(data || [])
      if (data?.length) setContaSel(String(data[0].id))
    })
  }, [])

  useEffect(() => {
    if (aba === 'historico') carregarHistorico()
  }, [aba])

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const extRes = await supabase.from('extratos')
      .select('*, conta:contas(nome,banco)')
      .order('criado_em', { ascending: false })
    setHistorico(extRes.data || [])
    setLoadingHistorico(false)
  }

  async function cancelarImportacao(item) {
    setCancelando(item.id)
    await supabase.from('extrato_movs').delete().eq('extrato_id', item.id)
    await supabase.from('extratos').delete().eq('id', item.id)
    setConfirmandoCancelar(null)
    setCancelando(null)
    carregarHistorico()
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

        // Detectar competência automaticamente pelo mês mais frequente
        const contaMes = {}
        resultado.movs.forEach(m => {
          if (m.dataISO) {
            const mes = m.dataISO.slice(0, 7)
            contaMes[mes] = (contaMes[mes] || 0) + 1
          }
        })
        const mesPredominante = Object.entries(contaMes).sort((a,b) => b[1]-a[1])[0]?.[0]
        if (mesPredominante) setCompetencia(mesPredominante)

        // Filtrar movimentações fora do mês predominante
        const movsDoMes = resultado.movs.filter(m => m.dataISO && m.dataISO.slice(0,7) === mesPredominante)

        setExtrato({ ...resultado, arquivo: file.name })
        setMovs(movsDoMes)
        setStep(2)
      } catch { alert('Erro ao ler o arquivo. Verifique se é o extrato XLS do Sicredi.') }
    }
    reader.readAsArrayBuffer(file)
  }

  async function salvar() {
    setSalvando(true)

    // Buscar regras de classificação com categoria_id
    const { data: regras } = await supabase.from('classificacoes').select('tipo_doc,direcao,categoria_id,subcategoria_id,categoria,classificacao')
    const mapaRegras = {}
    ;(regras || []).forEach(r => { mapaRegras[`${r.tipo_doc}_${r.direcao}`] = r })

    // Calcular data_inicio e data_fim
    const datas = movs.map(m => m.dataISO).filter(Boolean).sort()
    const data_inicio = datas[0] || null
    const data_fim = datas[datas.length - 1] || null

    // =============================================
    // IMPORTAÇÃO INCREMENTAL
    // Se extrato do mês já existe: adiciona só as movimentações novas
    // preservando categorizações, fornecedores e conciliações já feitas.
    // =============================================
    if (data_inicio && data_fim) {
      const { data: existente } = await supabase.from('extratos')
        .select('id, arquivo_nome, total_movs')
        .eq('conta_id', parseInt(contaSel))
        .eq('competencia', competencia)
        .limit(1)

      if (existente?.length > 0) {
        const extId = existente[0].id

        // Buscar movimentações já importadas
        const { data: movsExistentes } = await supabase.from('extrato_movs')
          .select('data, valor, descricao')
          .eq('extrato_id', extId)

        // Chave: data + valor + primeiros 40 chars da descrição
        const chaveExistente = new Set(
          (movsExistentes || []).map(m =>
            `${m.data}|${Number(m.valor).toFixed(2)}|${(m.descricao||'').slice(0,40)}`
          )
        )

        // Filtrar só as novas
        const movsNovas = movs.filter(m => {
          const v = m.tipo === 'entrada' ? m.valorAbs : -m.valorAbs
          const chave = `${m.dataISO}|${Number(v).toFixed(2)}|${(m.desc||'').slice(0,40)}`
          return !chaveExistente.has(chave)
        })

        if (movsNovas.length === 0) {
          setMsg(`✓ Nenhuma movimentação nova — extrato já está atualizado.`)
          setSalvando(false)
          setStep(3)
          setNovasMovs(0)
          return
        }

        // Inserir só as novas (com classificação automática se houver regra)
        const itensNovos = movsNovas.map(m => {
          const direcao = m.tipo === 'entrada' ? 'entrada' : 'saida'
          const regra = mapaRegras[`${m.doc}_${direcao}`]
          return {
            extrato_id: extId,
            data: m.dataISO,
            descricao: m.desc,
            doc: m.doc,
            valor: m.tipo === 'entrada' ? m.valorAbs : -m.valorAbs,
            saldo: m.saldo ?? null,
            tipo: m.tipo,
            classif_auto: regra?.classificacao || m.classif || null,
            categoria_id: regra?.categoria_id || null,
            subcategoria_id: regra?.subcategoria_id || null,
            conciliado: false,
          }
        })

        const { error: errNovos } = await supabase.from('extrato_movs').insert(itensNovos)
        if (errNovos) { setMsg('Erro: ' + errNovos.message); setSalvando(false); return }

        // Atualizar saldo_final e contagem do extrato existente
        const novoTotal = (movsExistentes?.length || 0) + itensNovos.length
        const ordenadas = [...movs].sort((a,b) => a.dataISO.localeCompare(b.dataISO))
        const ultimoSaldo = ordenadas.length ? Number(ordenadas[ordenadas.length-1].saldo||0) : 0
        await supabase.from('extratos').update({
          saldo_final: Math.round(ultimoSaldo*100)/100,
          total_movs: novoTotal,
          arquivo_nome: extrato.arquivo,
          importado_em: new Date().toISOString(),
        }).eq('id', extId)

        setNovasMovs(movsNovas.length)
        setSalvando(false)
        setStep(3)
        return
      }
    }

    // Saldo final do PERÍODO = saldo da última movimentação (a linha "Saldo atual" do
    // arquivo reflete o dia da exportação, não o fechamento do mês)
    const ordenadas = [...movs].sort((a, b) => a.dataISO.localeCompare(b.dataISO))
    const ultimoSaldo = ordenadas.length ? Number(ordenadas[ordenadas.length - 1].saldo || 0) : Number(extrato.saldoFinal || 0)
    const saldoFinalPeriodo = Math.round(ultimoSaldo * 100) / 100

    // Saldo inicial derivado: saldo_final do período − resultado das movimentações
    const somaMovs = movs.reduce((a, m) => a + Number(m.tipo === 'entrada' ? m.valorAbs : -m.valorAbs), 0)
    const saldoInicial = Math.round((saldoFinalPeriodo - somaMovs) * 100) / 100

    // Verificação de continuidade: saldo inicial deve bater com o final do mês anterior
    let avisoContinuidade = ''
    const { data: anterior } = await supabase.from('extratos')
      .select('competencia, saldo_final')
      .eq('conta_id', parseInt(contaSel))
      .lt('competencia', competencia)
      .order('competencia', { ascending: false })
      .limit(1)
    if (anterior?.[0]?.saldo_final !== null && anterior?.[0]?.saldo_final !== undefined) {
      const diff = Math.abs(Number(anterior[0].saldo_final) - saldoInicial)
      if (diff > 0.01) {
        avisoContinuidade = `O saldo inicial deste extrato (R$ ${saldoInicial.toLocaleString('pt-BR',{minimumFractionDigits:2})}) difere do saldo final de ${anterior[0].competencia} (R$ ${Number(anterior[0].saldo_final).toLocaleString('pt-BR',{minimumFractionDigits:2})}) em R$ ${diff.toLocaleString('pt-BR',{minimumFractionDigits:2})}.`
      }
    }

    const { data: ext, error } = await supabase.from('extratos').insert({
      conta_id: parseInt(contaSel),
      competencia,
      arquivo_nome: extrato.arquivo,
      saldo_inicial: saldoInicial,
      saldo_final: saldoFinalPeriodo,
      total_movs: movs.length,
      importado_por: user.id,
      importado_em: new Date().toISOString(),
      data_inicio,
      data_fim,
    }).select().single()

    if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
    setAvisoSaldo(avisoContinuidade)

    const itens = movs.map(m => {
      const direcao = m.tipo === 'entrada' ? 'entrada' : 'saida'
      const regra = mapaRegras[`${m.doc}_${direcao}`]
      return {
        extrato_id: ext.id,
        data: m.dataISO,
        descricao: m.desc,
        doc: m.doc,
        valor: m.tipo === 'entrada' ? m.valorAbs : -m.valorAbs,
        saldo: m.saldo ?? null,
        tipo: m.tipo,
        classif_auto: regra?.classificacao || m.classif || null,
        categoria_id: regra?.categoria_id || null,
        subcategoria_id: regra?.subcategoria_id || null,
        conciliado: false,
      }
    })

    const { error: err2 } = await supabase.from('extrato_movs').insert(itens)
    if (err2) { setMsg('Erro: ' + err2.message); setSalvando(false); return }
    setNovasMovs(movs.length)

    setSalvando(false)
    setStep(3)
  }

  const fmtData = d => d ? new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
  const fmtMes = m => m ? new Date(m+'-15').toLocaleDateString('pt-BR', { month:'long', year:'numeric' }) : '—'

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', fontWeight: 500, borderBottom: '0.5px solid #E8E6DE' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E8E6DE', verticalAlign: 'middle', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    tab: ativo => ({ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?AZUL:'#D3D1C7'}`, background:ativo?AZUL:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
  }

  return (
    <div style={{ maxWidth:1020, margin:'0 auto' }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Importar extrato</div>
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
{/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem' }}>
        <button onClick={() => setAba('importar')} style={s.tab(aba==='importar')}>
          <i className="ti ti-upload" style={{ fontSize:12, marginRight:4 }} />
          Importar extrato
        </button>
        <button onClick={() => setAba('historico')} style={s.tab(aba==='historico')}>
          <i className="ti ti-history" style={{ fontSize:12, marginRight:4 }} />
          Histórico de importações
        </button>
      </div>

      {/* ===== ABA IMPORTAR ===== */}
      {aba === 'importar' && (
        <>
          {step === 1 && (
            <div style={s.card}>
              <div style={{ background: '#FAFAF8', borderLeft: '3px solid #0E7EA8', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A', marginBottom: '1rem' }}>
                <strong>Sicredi · XLS</strong> — selecione o arquivo exportado pelo internet banking. Após importar, vá em <strong>Conciliação</strong> para categorizar e validar.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Conta bancária</label>
                  <select value={contaSel} onChange={e => setContaSel(e.target.value)}
                    style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Competência <span style={{ color:'#888780', fontWeight:400 }}>(detectada automaticamente)</span></label>
                  <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)}
                    style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8, background:'#F8F7F2' }}
                    readOnly />
                </div>
              </div>
              <label style={{ display: 'block', border: '1.5px dashed #D3D1C7', borderRadius: 12, padding: '2.5rem', textAlign: 'center', cursor: 'pointer', color: '#888780', fontSize: 13 }}>
                <i className="ti ti-file-spreadsheet" style={{ fontSize: 36, display: 'block', marginBottom: 8, color: VERDE }} />
                <div style={{ fontWeight: 500, marginBottom: 4, color: '#2C2C2A' }}>Clique para selecionar o XLS do Sicredi</div>
                <div style={{ fontSize: 11 }}>.xls · .xlsx</div>
                <input type="file" accept=".xls,.xlsx" onChange={lerArquivo} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {step === 2 && extrato && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
                {[
                  { label: 'Associado', val: extrato.associado || '—', cor: AZUL },
                  { label: 'Conta Sicredi', val: extrato.conta || '—', cor: '#0E7EA8' },
                  { label: 'Entradas', val: movs.filter(m => m.tipo === 'entrada').length + ' movs', cor: VERDE },
                  { label: 'Saídas', val: movs.filter(m => m.tipo === 'saida').length + ' movs', cor: VERMELHO },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '.85rem 1rem', border: '0.5px solid #E8E6DE', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
                    <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m.val}</div>
                  </div>
                ))}
              </div>
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Prévia — {movs.length} movimentações</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {msg && <span style={{ fontSize: 12, color: '#A32D2D' }}>{msg}</span>}
                    <button onClick={() => { setStep(1); setExtrato(null); setMovs([]) }}
                      style={{ padding: '6px 13px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>
                      Voltar
                    </button>
                    <button onClick={salvar} disabled={salvando}
                      style={{ padding: '6px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                      {salvando ? 'Salvando...' : 'Confirmar importação →'}
                    </button>
                  </div>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                      <tr>{['Data','Descrição','Doc','Tipo','Classificação automática','Valor'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {movs.map((m, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                          <td style={s.td}>{m.data}</td>
                          <td style={{ ...s.td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.desc}>{m.desc}</td>
                          <td style={s.td}><span style={{ fontSize: 10, background: '#F1EFE8', color: '#5F5E5A', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>{m.doc}</span></td>
                          <td style={s.td}><span style={s.badge(m.tipo==='entrada'?'#EAF3DE':'#FCEBEB', m.tipo==='entrada'?'#3B6D11':'#A32D2D')}>{m.tipo==='entrada'?'Entrada':'Saída'}</span></td>
                          <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{m.classif}</td>
                          <td style={{ ...s.td, fontWeight: 500, color: m.tipo==='entrada'?VERDE:VERMELHO, whiteSpace: 'nowrap' }}>
                            {m.tipo==='entrada'?'+':'-'}R$ {m.valorAbs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <i className="ti ti-circle-check" style={{fontSize:48, color:'#3B6D11'}} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.022em', marginBottom: '.5rem' }}>
                {novasMovs === 0 ? 'Extrato já atualizado!' : novasMovs !== null && novasMovs < 9999 ? `${novasMovs} movimentações adicionadas!` : 'Extrato importado com sucesso!'}
              </div>
              {avisoSaldo && (
                <div style={{ fontSize:12, color:'#854F0B', background:'#FAEEDA', border:'0.5px solid #EDD9A3', borderRadius:10, padding:'10px 14px', margin:'0 auto 1rem', maxWidth:520, textAlign:'left', display:'flex', gap:8, alignItems:'flex-start' }}>
                  <i className="ti ti-alert-triangle" style={{fontSize:15, flexShrink:0, marginTop:1}} />
                  <span>{avisoSaldo} Pode haver extrato faltando entre os períodos.</span>
                </div>
              )}
              <div style={{ fontSize: 13, color: '#888780', marginBottom: '1.5rem' }}>
                Agora vá em <strong>Conciliação</strong> para categorizar e validar as movimentações.
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                <button onClick={() => navigate('/conciliacao')}
                  style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <i className="ti ti-checks" /> Ir para Conciliação →
                </button>
                <button onClick={() => setStep(1)}
                  style={{ padding: '9px 16px', fontSize: 12, borderRadius: 10, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>
                  + Importar outro extrato
                </button>
                <button onClick={() => { setAba('historico'); setStep(1) }}
                  style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: `0.5px solid ${AZUL}`, background: 'transparent', color: AZUL, cursor: 'pointer' }}>
                  Ver histórico
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== ABA HISTÓRICO ===== */}
      {aba === 'historico' && (
        <div>
          {/* Sub-abas */}
          <div style={{ display:'flex', gap:6, marginBottom:'1rem' }}>
            <button onClick={() => setAbaHist('extrato')} style={{ ...s.tab(abaHist==='extrato'), fontSize:11 }}>
              <i className="ti ti-building-bank" style={{marginRight:4}} /> Extratos bancários ({historico.length})
            </button>
          </div>

          {loadingHistorico ? (
            <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div>
          ) : (
            <>
              {/* Extratos bancários */}
              {abaHist === 'extrato' && (
                <div style={s.card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>Extratos importados ({historico.length})</div>
                    <button onClick={carregarHistorico} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>↻ Atualizar</button>
                  </div>
                  {historico.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhuma importação realizada ainda.</div>
                  ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead><tr>{['Conta','Competência','Arquivo','Movimentações','Importado em',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {historico.map((ext, i) => (
                          <tr key={ext.id} style={{ background: i%2===0?'#fff':'#FAFAF8' }}>
                            <td style={{ ...s.td, fontWeight:500 }}>{ext.conta?.nome || '—'}</td>
                            <td style={s.td}>{fmtMes(ext.competencia)}</td>
                            <td style={{ ...s.td, fontSize:11, color:'#888780', fontFamily:'monospace' }}>{ext.arquivo_nome || '—'}</td>
                            <td style={{ ...s.td, textAlign:'center' }}><span style={s.badge('#E6F1FB','#185FA5')}>{ext.total_movs} movs</span></td>
                            <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{fmtData(ext.criado_em)}</td>
                            <td style={s.td}>
                              <button onClick={() => setConfirmandoCancelar(ext)}
                                style={{ fontSize:11, padding:'3px 10px', borderRadius:6, border:`0.5px solid ${VERMELHO}`, background:'transparent', color:VERMELHO, cursor:'pointer' }}>
                                Cancelar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmandoCancelar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius:12, padding:'1.5rem', maxWidth:380, width:'90%', textAlign:'center' }}>
            <div style={{ marginBottom:8 }}><i className="ti ti-inbox" style={{fontSize:32, color:'#C8C6BC'}} /></div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Cancelar importação?</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:4 }}>
              <><strong>{fmtMes(confirmandoCancelar.competencia)}</strong> — {confirmandoCancelar.conta?.nome}</>
            </div>
            <div style={{ fontSize:12, color:'#A32D2D', marginBottom:'1.5rem' }}>
              Isso vai apagar <strong>{confirmandoCancelar.total_movs} movimentações</strong> permanentemente. Esta ação não pode ser desfeita.
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => cancelarImportacao(confirmandoCancelar)} disabled={cancelando === confirmandoCancelar.id}
                style={{ padding:'8px 20px', borderRadius:8, border:'none', background:VERMELHO, color:'#fff', fontWeight:600, cursor:'pointer' }}>
                {cancelando === confirmandoCancelar.id ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
              <button onClick={() => setConfirmandoCancelar(null)}
                style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      </div>
  )
}