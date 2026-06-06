import React, { useState, useEffect, useRef } from 'react'
import { lancamentos as dbLanc, contas as dbContas, rateios as dbRateios } from '../lib/db'
import { supabase } from '../lib/supabase'
import CatSelect from '../components/CatSelect'
import { useIsMobile } from '../hooks/useIsMobile'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'
const SUBCATEGORIA_ABATIMENTO_ID = 53

export default function Lancamentos({ tipo = 'despesa' }) {
  const isMobile = useIsMobile()
  const [lista, setLista] = useState([])
  const [contas, setContas] = useState([])
  const [projetos, setProjetos] = useState([])
  const [form, setForm] = useState({ nf: '', data: new Date().toISOString().slice(0,10), valor: '', descricao: '', conta_id: '', categoria_id: '', projeto_id: '' })
  const [subcategoriaId, setSubcategoriaId] = useState('')
  const [subcategorias, setSubcategorias] = useState([])
  const [rateio, setRateio] = useState({ educ: '', social: '', saude: '' })
  const [contaSel, setContaSel] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  // Abatimento de dívida
  const [dividasAbertas, setDividasAbertas] = useState([])
  const [dividaId, setDividaId] = useState('')
  const [valorAbatimento, setValorAbatimento] = useState('')

  // IA — Foto de nota
  const [modoIA, setModoIA] = useState(false)
  const [fotoBase64, setFotoBase64] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [analisando, setAnalisando] = useState(false)
  const [msgIA, setMsgIA] = useState('')
  const inputFotoRef = useRef(null)

  useEffect(() => { carregarContas(); carregarLista() }, [tipo])

  useEffect(() => {
    supabase.from('projetos').select('id,nome,situacao').in('situacao',['ativo','em planejamento']).order('nome')
      .then(({ data }) => setProjetos(data || []))
  }, [])

  useEffect(() => {
    setSubcategoriaId('')
    if (form.categoria_id) {
      supabase.from('subcategorias').select('*').eq('categoria_id', parseInt(form.categoria_id)).order('nome')
        .then(({ data }) => setSubcategorias(data || []))
    } else {
      setSubcategorias([])
    }
  }, [form.categoria_id])

  useEffect(() => {
    if (parseInt(subcategoriaId) === SUBCATEGORIA_ABATIMENTO_ID) {
      supabase.from('dividas')
        .select('*, funcionario:funcionarios(nome)')
        .eq('status', 'aberta')
        .order('data_origem', { ascending: false })
        .then(({ data }) => setDividasAbertas(data || []))
    } else {
      setDividasAbertas([])
      setDividaId('')
      setValorAbatimento('')
    }
  }, [subcategoriaId])

  useEffect(() => {
    if (parseInt(subcategoriaId) === SUBCATEGORIA_ABATIMENTO_ID && form.valor) {
      setValorAbatimento(form.valor)
    }
  }, [form.valor, subcategoriaId])

  async function carregarContas() {
    const { data } = await dbContas.listar()
    setContas(data || [])
    if (data?.length) { setForm(f => ({ ...f, conta_id: data[0].id })); setContaSel(data[0]) }
  }

  async function carregarLista() {
    const { data } = await dbLanc.listar({ tipo })
    setLista(data || [])
  }

  function onContaChange(conta_id) {
    const c = contas.find(c => c.id == conta_id)
    setContaSel(c)
    setForm(f => ({ ...f, conta_id }))
  }

  function onFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const base64 = ev.target.result.split(',')[1]
      setFotoBase64(base64)
      setFotoPreview(ev.target.result)
      setMsgIA('')
    }
    reader.readAsDataURL(file)
  }

  async function analisarNota() {
    if (!fotoBase64) return
    setAnalisando(true)
    setMsgIA('Analisando nota fiscal...')
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fotoBase64 } },
              { type: 'text', text: `Analise esta nota fiscal ou cupom fiscal e extraia as informações. Responda APENAS com um JSON válido, sem texto adicional, sem markdown, sem explicações:
{
  "valor": "valor total em reais, apenas números e ponto decimal, ex: 45.90",
  "data": "data no formato YYYY-MM-DD, ex: 2026-06-05",
  "descricao": "descrição resumida do que foi comprado, máximo 80 caracteres",
  "fornecedor": "nome do estabelecimento ou fornecedor",
  "nf": "número da nota ou cupom fiscal, se houver, caso contrário string vazia"
}
Se não conseguir identificar algum campo com certeza, deixe como string vazia.` }
            ]
          }]
        })
      })
      const data = await response.json()
      const texto = data.content?.[0]?.text || ''
      const clean = texto.replace(/```json|```/g, '').trim()
      const resultado = JSON.parse(clean)
      setForm(f => ({
        ...f,
        valor: resultado.valor || f.valor,
        data: resultado.data || f.data,
        descricao: resultado.descricao || f.descricao,
        nf: resultado.nf || f.nf,
      }))
      setMsgIA(`✅ Dados extraídos! Confira e ajuste se necessário.${resultado.fornecedor ? ` Fornecedor: ${resultado.fornecedor}` : ''}`)
      setModoIA(false)
    } catch(e) {
      setMsgIA('❌ Não foi possível extrair os dados. Preencha manualmente.')
      console.error(e)
    }
    setAnalisando(false)
  }

  const rateioTotal = (parseFloat(rateio.educ)||0) + (parseFloat(rateio.social)||0) + (parseFloat(rateio.saude)||0)
  const precisaRateio = contaSel?.preponderancia === 'rateio'
  const isAbatimento = parseInt(subcategoriaId) === SUBCATEGORIA_ABATIMENTO_ID

  async function salvar(e) {
    e.preventDefault()
    if (precisaRateio && rateioTotal !== 100) { setMsg('O rateio precisa somar 100%.'); return }
    if (isAbatimento && !dividaId) { setMsg('Selecione a dívida a ser abatida.'); return }
    if (isAbatimento && !valorAbatimento) { setMsg('Informe o valor do abatimento.'); return }

    setSalvando(true)

    const dadosLanc = {
      ...form,
      tipo,
      valor: parseFloat(form.valor),
      conciliado: false,
      subcategoria_id: subcategoriaId ? parseInt(subcategoriaId) : null,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : null,
    }

    const { data: lanc, error } = await dbLanc.criar(dadosLanc)
    if (error) { setMsg('Erro ao salvar: ' + error.message); setSalvando(false); return }

    if (precisaRateio && lanc) {
      const itens = [
        { lancamento_id: lanc.id, area: 'Educação',          percentual: parseFloat(rateio.educ)||0 },
        { lancamento_id: lanc.id, area: 'Assistência Social', percentual: parseFloat(rateio.social)||0 },
        { lancamento_id: lanc.id, area: 'Saúde',             percentual: parseFloat(rateio.saude)||0 },
      ].filter(i => i.percentual > 0)
      await dbRateios.criar(itens)
    }

    if (isAbatimento && dividaId) {
      const divida = dividasAbertas.find(d => String(d.id) === String(dividaId))
      const valorAb = parseFloat(valorAbatimento)
      await supabase.from('pagamentos_divida').insert({
        divida_id: parseInt(dividaId),
        valor: valorAb,
        data_pagamento: form.data,
        observacoes: `Lançamento financeiro: ${form.descricao}`,
      })
      if (divida) {
        const novoValorPago = Number(divida.valor_pago || 0) + valorAb
        const novoStatus = novoValorPago >= Number(divida.valor_original) ? 'quitada' : 'aberta'
        await supabase.from('dividas').update({ valor_pago: novoValorPago, status: novoStatus }).eq('id', divida.id)
      }
    }

    setMsg('✅ Lançamento salvo!' + (isAbatimento ? ' Dívida atualizada automaticamente.' : ''))
    setForm(f => ({ ...f, nf: '', valor: '', descricao: '', categoria_id: '', projeto_id: '' }))
    setSubcategoriaId('')
    setSubcategorias([])
    setDividaId('')
    setValorAbatimento('')
    setRateio({ educ: '', social: '', saude: '' })
    setFotoBase64(null); setFotoPreview(null); setMsgIA('')
    carregarLista()
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const v = parseFloat(form.valor) || 0
  const fmt = n => n > 0 ? 'R$ ' + (v * n / 100).toFixed(2) : 'R$ —'
  const fmtVal = val => val ? 'R$ ' + Math.abs(Number(val)).toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '—'
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const s = {
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:13, padding:'8px 10px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
  }

  return (
    <div style={{ padding: isMobile ? '1rem' : '1.25rem 1.5rem' }}>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:'1.25rem' }}>
        {tipo === 'despesa' ? 'Lançar despesa' : 'Lançar entrada'}
      </div>

      {/* Botão de foto com IA */}
      {tipo === 'despesa' && (
        <div style={{ ...s.card, borderColor: modoIA ? '#C0DD97' : '#E0DDD5', marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: modoIA ? '1rem' : 0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500 }}>📷 Fotografar nota fiscal</div>
              <div style={{ fontSize:11, color:'#888780' }}>A IA extrai valor, data e descrição automaticamente</div>
            </div>
            <button type="button" onClick={() => { setModoIA(!modoIA); setFotoPreview(null); setFotoBase64(null); setMsgIA('') }}
              style={{ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${modoIA?VERMELHO:VERDE}`, background:modoIA?'#FEF2F2':'#EAF3DE', color:modoIA?VERMELHO:VERDE, cursor:'pointer' }}>
              {modoIA ? 'Cancelar' : 'Usar IA'}
            </button>
          </div>
          {modoIA && (
            <div>
              <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" onChange={onFotoChange} style={{ display:'none' }} />
              {!fotoPreview ? (
                <div onClick={() => inputFotoRef.current?.click()}
                  style={{ border:`2px dashed ${VERDE}`, borderRadius:12, padding:'2rem', textAlign:'center', cursor:'pointer', background:'#F8FFF4' }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>📷</div>
                  <div style={{ fontSize:13, fontWeight:500, color:VERDE }}>
                    {isMobile ? 'Toque para fotografar ou escolher imagem' : 'Clique para selecionar a foto da nota'}
                  </div>
                  <div style={{ fontSize:11, color:'#888780', marginTop:4 }}>JPG, PNG ou foto da câmera</div>
                </div>
              ) : (
                <div>
                  <img src={fotoPreview} alt="Nota fiscal"
                    style={{ width:'100%', maxHeight:300, objectFit:'contain', borderRadius:8, border:'0.5px solid #E0DDD5', marginBottom:10 }} />
                  <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                    <button type="button" onClick={analisarNota} disabled={analisando}
                      style={{ flex:1, padding:'10px', fontSize:13, fontWeight:500, borderRadius:8, border:'none', background:analisando?'#D3D1C7':VERDE, color:'#fff', cursor:'pointer' }}>
                      {analisando ? '⏳ Analisando...' : '✨ Extrair dados com IA'}
                    </button>
                    <button type="button" onClick={() => inputFotoRef.current?.click()}
                      style={{ padding:'10px 16px', fontSize:12, borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>
                      Trocar foto
                    </button>
                  </div>
                </div>
              )}
              {msgIA && (
                <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, background:msgIA.includes('✅')?'#F2FAE8':'#FEF2F2', color:msgIA.includes('✅')?'#3B6D11':'#A32D2D' }}>
                  {msgIA}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:10, background:msg.includes('✅')?'#F2FAE8':'#FEF2F2', color:msg.includes('✅')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      <form onSubmit={salvar}>
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>
            {fotoBase64 && msgIA.includes('✅') ? '✅ Dados extraídos — confira e ajuste' : `Nova ${tipo}`}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            {tipo === 'despesa' && (
              <div>
                <label style={s.label}>Nº nota fiscal</label>
                <input value={form.nf} onChange={e=>setForm(f=>({...f,nf:e.target.value}))} placeholder="001234" style={s.input} />
              </div>
            )}
            <div>
              <label style={s.label}>Data *</label>
              <input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} required style={s.input} />
            </div>
            <div>
              <label style={s.label}>Valor (R$) *</label>
              <input type="number" step="0.01" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} required
                style={{ ...s.input, fontWeight:500, fontSize:15, color:tipo==='despesa'?VERMELHO:VERDE }} />
            </div>
            <div>
              <label style={s.label}>Conta *</label>
              <select value={form.conta_id} onChange={e=>onContaChange(e.target.value)} required style={s.input}>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={s.label}>Descrição *</label>
            <input value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} required
              placeholder={tipo==='despesa'?"Ex: Compra de material pedagógico":"Ex: Repasse emenda parlamentar"}
              style={s.input} />
          </div>

          {/* Projeto */}
          {projetos.length > 0 && (
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Projeto / Serviço vinculado</label>
              <select value={form.projeto_id} onChange={e=>setForm(f=>({...f,projeto_id:e.target.value}))} style={s.input}>
                <option value="">Nenhum (lançamento geral)</option>
                {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              {form.projeto_id && (
                <div style={{ fontSize:11, color:'#3B6D11', marginTop:3 }}>
                  ✅ Este lançamento aparecerá no financeiro do projeto selecionado
                </div>
              )}
            </div>
          )}

          {/* Categoria */}
          <div style={{ marginBottom: subcategorias.length > 0 ? 10 : 14 }}>
            <label style={s.label}>Categoria</label>
            <CatSelect tipo={tipo} value={form.categoria_id} onChange={v => setForm(f => ({ ...f, categoria_id: v }))} />
          </div>

          {/* Subcategoria */}
          {subcategorias.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Subcategoria</label>
              <select value={subcategoriaId} onChange={e => setSubcategoriaId(e.target.value)} style={s.input}>
                <option value="">Selecione a subcategoria...</option>
                {subcategorias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}

          {/* Bloco abatimento de dívida */}
          {isAbatimento && (
            <div style={{ background:'#FEF2F2', border:'0.5px solid #F7C1C1', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#A32D2D', marginBottom:10 }}>
                💳 Vincular ao abatimento de dívida
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
                <div>
                  <label style={s.label}>Dívida a ser abatida *</label>
                  <select value={dividaId} onChange={e => setDividaId(e.target.value)} required style={s.input}>
                    <option value="">Selecione a dívida...</option>
                    {dividasAbertas.map(d => {
                      const saldo = Number(d.valor_original||0) - Number(d.valor_pago||0)
                      return (
                        <option key={d.id} value={d.id}>
                          {d.funcionario?.nome} — {d.descricao} (Saldo: R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits:2 })})
                        </option>
                      )
                    })}
                  </select>
                  {dividasAbertas.length === 0 && (
                    <div style={{ fontSize:11, color:'#888780', marginTop:4 }}>Nenhuma dívida aberta encontrada.</div>
                  )}
                </div>
                <div>
                  <label style={s.label}>Valor do abatimento (R$) *</label>
                  <input type="number" step="0.01" value={valorAbatimento}
                    onChange={e => setValorAbatimento(e.target.value)}
                    style={{ ...s.input, color: VERMELHO, fontWeight:500 }} />
                  <div style={{ fontSize:10, color:'#888780', marginTop:3 }}>
                    Pode ser diferente do valor do lançamento (parcial)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rateio */}
          {precisaRateio && (
            <div style={{ background:'#F8F7F2', borderRadius:10, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>
                Rateio por área — Total: <span style={{ color: rateioTotal===100?VERDE:VERMELHO }}>{rateioTotal}%</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:8 }}>
                {[['educ','Educação'],['social','Assistência Social'],['saude','Saúde']].map(([k,label]) => (
                  <div key={k}>
                    <label style={s.label}>{label} (%) — {fmt(parseFloat(rateio[k])||0)}</label>
                    <input type="number" min="0" max="100" value={rateio[k]}
                      onChange={e=>setRateio(r=>({...r,[k]:e.target.value}))} style={s.input} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={salvando}
            style={{ width:'100%', padding:'12px', fontSize:14, fontWeight:600, borderRadius:10, border:'none', background:salvando?'#D3D1C7':tipo==='despesa'?VERMELHO:VERDE, color:'#fff', cursor:'pointer' }}>
            {salvando ? 'Salvando...' : tipo==='despesa' ? '💾 Salvar despesa' : '💾 Salvar entrada'}
          </button>
        </div>
      </form>

      {/* Lista recente */}
      {lista.length > 0 && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Lançamentos recentes</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr>
                {['Data','Descrição','Projeto','Conta','Valor'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {lista.slice(0,10).map((l,i) => (
                  <tr key={l.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                    <td style={{ padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', whiteSpace:'nowrap' }}>{fmtData(l.data)}</td>
                    <td style={{ padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descricao}</td>
                    <td style={{ padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:11, color:'#888780' }}>
                      {l.projeto_id ? (projetos.find(p=>p.id===l.projeto_id)?.nome || '—') : <span style={{ color:'#D3D1C7' }}>—</span>}
                    </td>
                    <td style={{ padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:11, color:'#888780' }}>{l.conta?.nome||'—'}</td>
                    <td style={{ padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', color:tipo==='despesa'?VERMELHO:VERDE, fontWeight:500, textAlign:'right' }}>{fmtVal(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
