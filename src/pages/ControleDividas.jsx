import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F', ROXO = '#8B2FC9'

const TIPO_VINCULO_LABEL = {
  CLT: 'CLT',
  prestacao_servicos: 'Prestação de serviços',
  contabil: 'Serviço contábil',
  outro: 'Outro',
}

const TIPO_MOV_LABEL = {
  divida_inicial: 'Dívida inicial',
  acrescimo: 'Acréscimo de dívida',
  abatimento: 'Abatimento',
  ajuste: 'Ajuste manual',
}

const TIPO_MOV_COR = {
  divida_inicial: ['#FAEEDA', '#854F0B'],
  acrescimo: ['#FCEBEB', '#A32D2D'],
  abatimento: ['#EAF3DE', '#3B6D11'],
  ajuste: ['#EEEDFE', '#534AB7'],
}

export default function ControleDividas() {
  const { perfil, user } = useAuth()
  const p = perfil?.perfil
  const isAdmin = p === 'admin'

  const [pessoas, setPessoas] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [competencias, setCompetencias] = useState([])
  const [tab, setTab] = useState('resumo')
  const [pessoaSel, setPessoaSel] = useState(null)
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Form pessoa
  const [mostrarFormPessoa, setMostrarFormPessoa] = useState(false)
  const [editandoPessoa, setEditandoPessoa] = useState(null)
  const [formPessoa, setFormPessoa] = useState({
    nome: '', tipo_vinculo: 'CLT', valor_mensal_normal: '',
    divida_inicial: '', data_base_divida: '2024-12-31',
    observacoes: '', ativo: true,
  })

  // Form movimentação manual
  const [formMov, setFormMov] = useState({
    pessoa_id: '', tipo: 'abatimento', valor: '',
    data_movimentacao: new Date().toISOString().slice(0,10),
    competencia: new Date().toISOString().slice(0,7),
    descricao: '', observacoes: '',
  })

  // Form competência mensal
  const [formComp, setFormComp] = useState({
    pessoa_id: '', competencia: new Date().toISOString().slice(0,7),
    valor_pago_mensal: '', valor_abatido_divida: '', observacoes: '',
  })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [pesRes, movRes, compRes] = await Promise.all([
      supabase.from('pessoas_recorrentes').select('*').order('nome'),
      supabase.from('divida_movimentacoes').select('*, pessoa:pessoas_recorrentes(nome)').order('data_movimentacao', { ascending: false }),
      supabase.from('competencias_mensais').select('*, pessoa:pessoas_recorrentes(nome)').order('competencia', { ascending: false }),
    ])
    const pList = pesRes.data || []
    // Calcular saldo_atual para cada pessoa
    const movList = movRes.data || []
    const pessoasComSaldo = pList.map(pe => {
      const movPessoa = movList.filter(m => m.pessoa_id === pe.id)
      const saldo = movPessoa.reduce((acc, m) => {
        if (m.tipo === 'divida_inicial' || m.tipo === 'acrescimo') return acc + Number(m.valor)
        if (m.tipo === 'abatimento') return acc - Number(m.valor)
        if (m.tipo === 'ajuste') return acc + Number(m.valor) // ajuste pode ser + ou -
        return acc
      }, 0)
      return { ...pe, saldo_calculado: saldo }
    })
    setPessoas(pessoasComSaldo)
    setMovimentacoes(movList)
    setCompetencias(compRes.data || [])
  }

  async function salvarPessoa(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      nome: formPessoa.nome,
      tipo_vinculo: formPessoa.tipo_vinculo,
      valor_mensal_normal: parseFloat(formPessoa.valor_mensal_normal) || 0,
      divida_inicial: parseFloat(formPessoa.divida_inicial) || 0,
      data_base_divida: formPessoa.data_base_divida || '2024-12-31',
      observacoes: formPessoa.observacoes || null,
      ativo: formPessoa.ativo,
    }
    let error, novoId
    if (editandoPessoa) {
      ;({ error } = await supabase.from('pessoas_recorrentes').update(dados).eq('id', editandoPessoa))
    } else {
      const { data: novo, error: err } = await supabase.from('pessoas_recorrentes').insert(dados).select().single()
      error = err
      novoId = novo?.id
      // Se tem dívida inicial, lança movimentação automática
      if (!err && dados.divida_inicial > 0 && novoId) {
        await supabase.from('divida_movimentacoes').insert({
          pessoa_id: novoId,
          tipo: 'divida_inicial',
          valor: dados.divida_inicial,
          data_movimentacao: dados.data_base_divida,
          competencia: dados.data_base_divida.slice(0,7),
          descricao: `Dívida inicial acumulada até ${new Date(dados.data_base_divida+'T12:00:00').toLocaleDateString('pt-BR')}`,
          usuario_id: user?.id || null,
        })
      }
    }
    if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
    setMsg(editandoPessoa ? '✅ Pessoa atualizada!' : '✅ Pessoa cadastrada!')
    setFormPessoa({ nome:'', tipo_vinculo:'CLT', valor_mensal_normal:'', divida_inicial:'', data_base_divida:'2024-12-31', observacoes:'', ativo:true })
    setEditandoPessoa(null)
    setMostrarFormPessoa(false)
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function salvarMovimentacao(e) {
    e.preventDefault()
    if (formMov.tipo === 'ajuste' && !formMov.observacoes) {
      setMsg('Ajuste manual requer observação obrigatória.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('divida_movimentacoes').insert({
      pessoa_id: parseInt(formMov.pessoa_id),
      tipo: formMov.tipo,
      valor: parseFloat(formMov.valor),
      data_movimentacao: formMov.data_movimentacao,
      competencia: formMov.competencia || null,
      descricao: formMov.descricao || null,
      observacoes: formMov.observacoes || null,
      usuario_id: user?.id || null,
    })
    if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
    // Atualizar saldo_atual na tabela
    await recalcularSaldo(parseInt(formMov.pessoa_id))
    setMsg('✅ Movimentação registrada!')
    setFormMov({ pessoa_id:'', tipo:'abatimento', valor:'', data_movimentacao:new Date().toISOString().slice(0,10), competencia:new Date().toISOString().slice(0,7), descricao:'', observacoes:'' })
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function salvarCompetencia(e) {
    e.preventDefault()
    setSalvando(true)
    const pessoa = pessoas.find(p => String(p.id) === String(formComp.pessoa_id))
    if (!pessoa) { setSalvando(false); return }

    const valorMensalDevido = Number(pessoa.valor_mensal_normal || 0)
    const valorPagoMensal = parseFloat(formComp.valor_pago_mensal) || 0
    const valorAbatido = parseFloat(formComp.valor_abatido_divida) || 0
    const valorNaoPago = Math.max(0, valorMensalDevido - valorPagoMensal)
    const saldoInicio = Number(pessoa.saldo_calculado || 0)
    const saldoFim = saldoInicio + valorNaoPago - valorAbatido

    // Verificar se já existe competência
    const { data: existe } = await supabase.from('competencias_mensais')
      .select('id').eq('pessoa_id', parseInt(formComp.pessoa_id)).eq('competencia', formComp.competencia).single()
    if (existe) { setMsg('Já existe registro para esta competência. Use o histórico para ajustar.'); setSalvando(false); return }

    const { error } = await supabase.from('competencias_mensais').insert({
      pessoa_id: parseInt(formComp.pessoa_id),
      competencia: formComp.competencia,
      valor_mensal_devido: valorMensalDevido,
      valor_pago_mensal: valorPagoMensal,
      valor_nao_pago: valorNaoPago,
      valor_abatido_divida: valorAbatido,
      saldo_divida_inicio: saldoInicio,
      saldo_divida_fim: saldoFim,
      observacoes: formComp.observacoes || null,
      status: 'registrado',
    })
    if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }

    // Lançar movimentações automáticas
    const data = formComp.competencia + '-01'
    if (valorNaoPago > 0) {
      await supabase.from('divida_movimentacoes').insert({
        pessoa_id: parseInt(formComp.pessoa_id),
        tipo: 'acrescimo',
        valor: valorNaoPago,
        data_movimentacao: data,
        competencia: formComp.competencia,
        descricao: `Valor não pago em ${formComp.competencia} — acréscimo de dívida`,
        usuario_id: user?.id || null,
      })
    }
    if (valorAbatido > 0) {
      await supabase.from('divida_movimentacoes').insert({
        pessoa_id: parseInt(formComp.pessoa_id),
        tipo: 'abatimento',
        valor: valorAbatido,
        data_movimentacao: data,
        competencia: formComp.competencia,
        descricao: `Abatimento de dívida em ${formComp.competencia}`,
        usuario_id: user?.id || null,
      })
    }

    await recalcularSaldo(parseInt(formComp.pessoa_id))
    setMsg('✅ Competência registrada!')
    setFormComp({ pessoa_id:'', competencia:new Date().toISOString().slice(0,7), valor_pago_mensal:'', valor_abatido_divida:'', observacoes:'' })
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function recalcularSaldo(pessoaId) {
    const { data: movs } = await supabase.from('divida_movimentacoes').select('tipo,valor').eq('pessoa_id', pessoaId)
    const saldo = (movs||[]).reduce((acc, m) => {
      if (m.tipo === 'divida_inicial' || m.tipo === 'acrescimo') return acc + Number(m.valor)
      if (m.tipo === 'abatimento') return acc - Number(m.valor)
      return acc + Number(m.valor)
    }, 0)
    await supabase.from('pessoas_recorrentes').update({ saldo_atual: saldo, atualizado_em: new Date().toISOString() }).eq('id', pessoaId)
  }

  function editarPessoa(pe) {
    setFormPessoa({
      nome: pe.nome, tipo_vinculo: pe.tipo_vinculo,
      valor_mensal_normal: pe.valor_mensal_normal || '',
      divida_inicial: pe.divida_inicial || '',
      data_base_divida: pe.data_base_divida || '2024-12-31',
      observacoes: pe.observacoes || '', ativo: pe.ativo,
    })
    setEditandoPessoa(pe.id)
    setMostrarFormPessoa(true)
    setTab('pessoas')
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtComp = c => c ? new Date(c+'-15').toLocaleDateString('pt-BR', { month:'long', year:'numeric' }) : '—'

  const totalSaldo = pessoas.reduce((a,p) => a + Number(p.saldo_calculado||0), 0)
  const pessoasComDivida = pessoas.filter(p => Number(p.saldo_calculado||0) > 0)

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    tab: ativo => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?VERMELHO:'#D3D1C7'}`, background:ativo?VERMELHO:'transparent', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    secao: { fontSize:11, fontWeight:600, color:'#5F5E5A', borderLeft:`3px solid ${VERMELHO}`, paddingLeft:8, margin:'14px 0 8px' },
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Controle de Dívidas</div>
          <div style={{ fontSize:12, color:'#888780' }}>Conta corrente de dívidas com funcionários e prestadores</div>
        </div>
        {isAdmin && (
          <button onClick={() => { setMostrarFormPessoa(!mostrarFormPessoa); setEditandoPessoa(null); setFormPessoa({ nome:'', tipo_vinculo:'CLT', valor_mensal_normal:'', divida_inicial:'', data_base_divida:'2024-12-31', observacoes:'', ativo:true }) }}
            style={s.btn(mostrarFormPessoa?'#F1EFE8':AZUL, mostrarFormPessoa?'#5F5E5A':'#fff')}>
            {mostrarFormPessoa ? 'Cancelar' : '+ Cadastrar pessoa'}
          </button>
        )}
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:'1.25rem' }}>
        {[
          { label:'Pessoas cadastradas', val:pessoas.length, cor:AZUL },
          { label:'Com dívida ativa', val:pessoasComDivida.length, cor:pessoasComDivida.length>0?VERMELHO:VERDE },
          { label:'Saldo total devedor', val:fmt(totalSaldo), cor:totalSaldo>0?VERMELHO:VERDE },
          { label:'Movimentações', val:movimentacoes.length, cor:'#888780' },
        ].map(m => (
          <div key={m.label} style={{ background:'#fff', borderRadius:10, padding:'.85rem 1rem', border:'0.5px solid #E0DDD5' }}>
            <div style={{ height:3, borderRadius:99, background:m.cor, marginBottom:'.7rem' }} />
            <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:16, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Form cadastrar pessoa */}
      {isAdmin && mostrarFormPessoa && (
        <div style={{ ...s.card, borderColor:AZUL+'60', marginBottom:'1.25rem' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>{editandoPessoa ? 'Editar pessoa' : 'Cadastrar pessoa'}</div>
          <form onSubmit={salvarPessoa}>
            <div style={s.grupo('2fr 1fr 1fr')}>
              <div><label style={s.label}>Nome *</label><input value={formPessoa.nome} onChange={e=>setFormPessoa(f=>({...f,nome:e.target.value}))} required style={s.input} /></div>
              <div><label style={s.label}>Tipo de vínculo</label>
                <select value={formPessoa.tipo_vinculo} onChange={e=>setFormPessoa(f=>({...f,tipo_vinculo:e.target.value}))} style={s.input}>
                  {Object.entries(TIPO_VINCULO_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><label style={s.label}>Valor mensal normal (R$)</label><input type="number" step="0.01" value={formPessoa.valor_mensal_normal} onChange={e=>setFormPessoa(f=>({...f,valor_mensal_normal:e.target.value}))} style={s.input} /></div>
            </div>
            <div style={s.grupo('1fr 1fr 2fr')}>
              <div><label style={s.label}>Dívida inicial (R$)</label><input type="number" step="0.01" value={formPessoa.divida_inicial} onChange={e=>setFormPessoa(f=>({...f,divida_inicial:e.target.value}))} placeholder="Saldo até 31/12/2024" style={s.input} /></div>
              <div><label style={s.label}>Data base da dívida</label><input type="date" value={formPessoa.data_base_divida} onChange={e=>setFormPessoa(f=>({...f,data_base_divida:e.target.value}))} style={s.input} /></div>
              <div><label style={s.label}>Observações</label><input value={formPessoa.observacoes} onChange={e=>setFormPessoa(f=>({...f,observacoes:e.target.value}))} style={s.input} /></div>
            </div>
            {!editandoPessoa && formPessoa.divida_inicial > 0 && (
              <div style={{ fontSize:11, color:'#854F0B', background:'#FAEEDA', padding:'6px 10px', borderRadius:6, marginBottom:10 }}>
                ⚠ Uma movimentação de "Dívida inicial" de {fmt(formPessoa.divida_inicial)} será lançada automaticamente.
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':AZUL)}>{salvando?'Salvando...':editandoPessoa?'💾 Salvar':'+ Cadastrar'}</button>
              <button type="button" onClick={() => { setMostrarFormPessoa(false); setEditandoPessoa(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:msg.includes('✅')?'#F2FAE8':'#FEF2F2', color:msg.includes('✅')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {[['resumo','Resumo'],['competencias','Competências mensais'],['historico','Histórico de movimentações'],['pessoas','Pessoas']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={s.tab(tab===v)}>{l}</button>
        ))}
      </div>

      {/* ===== RESUMO ===== */}
      {tab === 'resumo' && (
        <div>
          {pessoas.length === 0 ? (
            <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
              <div style={{ fontSize:13 }}>Nenhuma pessoa cadastrada ainda.</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'1rem' }}>
              {pessoas.map(pe => {
                const saldo = Number(pe.saldo_calculado||0)
                const movPessoa = movimentacoes.filter(m => m.pessoa_id === pe.id)
                const totalAcrescimos = movPessoa.filter(m=>m.tipo==='acrescimo'||m.tipo==='divida_inicial').reduce((a,m)=>a+Number(m.valor),0)
                const totalAbatimentos = movPessoa.filter(m=>m.tipo==='abatimento').reduce((a,m)=>a+Number(m.valor),0)
                const ultimaMov = movPessoa[0]
                return (
                  <div key={pe.id} style={{ background:'#fff', border:`0.5px solid ${saldo>0?VERMELHO+'40':'#E0DDD5'}`, borderRadius:12, overflow:'hidden' }}>
                    <div style={{ background:saldo>0?`${VERMELHO}08`:`${VERDE}08`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{pe.nome}</div>
                        <div style={{ fontSize:11, color:'#888780' }}>{TIPO_VINCULO_LABEL[pe.tipo_vinculo]||pe.tipo_vinculo}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:10, color:'#888780' }}>Saldo devedor</div>
                        <div style={{ fontSize:16, fontWeight:700, color:saldo>0?VERMELHO:VERDE }}>{saldo>0?fmt(saldo):'✅ Quitado'}</div>
                      </div>
                    </div>
                    <div style={{ padding:'12px 14px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                        {[
                          ['Mensal normal', fmt(pe.valor_mensal_normal||0), '#5F5E5A'],
                          ['Total acréscimos', fmt(totalAcrescimos), VERMELHO],
                          ['Total abatimentos', fmt(totalAbatimentos), VERDE],
                        ].map(([l,v,c]) => (
                          <div key={l} style={{ background:'#F8F7F2', borderRadius:8, padding:'6px 8px' }}>
                            <div style={{ fontSize:9, color:'#888780', marginBottom:2 }}>{l}</div>
                            <div style={{ fontSize:12, fontWeight:600, color:c }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {ultimaMov && <div style={{ fontSize:11, color:'#888780', marginBottom:10 }}>Última mov.: {fmtData(ultimaMov.data_movimentacao)} — {TIPO_MOV_LABEL[ultimaMov.tipo]}</div>}
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { setPessoaSel(pe); setTab('historico') }} style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Ver histórico</button>
                        {isAdmin && <button onClick={() => editarPessoa(pe)} style={{ ...s.btn('#E6F1FB',AZUL), fontSize:11 }}>Editar</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== COMPETÊNCIAS MENSAIS ===== */}
      {tab === 'competencias' && (
        <>
          {isAdmin && (
            <div style={s.card}>
              <div style={s.secao}>Registrar competência mensal</div>
              <div style={{ fontSize:11, color:'#888780', marginBottom:10 }}>
                Registre o pagamento de um mês: quanto foi pago como mensal normal e quanto foi para abater dívida.
              </div>
              <form onSubmit={salvarCompetencia}>
                <div style={s.grupo('1fr 1fr')}>
                  <div>
                    <label style={s.label}>Pessoa *</label>
                    <select value={formComp.pessoa_id} onChange={e=>setFormComp(f=>({...f,pessoa_id:e.target.value}))} required style={s.input}>
                      <option value="">Selecione...</option>
                      {pessoas.map(pe => <option key={pe.id} value={pe.id}>{pe.nome} — Mensal: {fmt(pe.valor_mensal_normal||0)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Competência (mês/ano) *</label>
                    <input type="month" value={formComp.competencia} onChange={e=>setFormComp(f=>({...f,competencia:e.target.value}))} required style={s.input} />
                  </div>
                </div>
                {formComp.pessoa_id && (() => {
                  const pe = pessoas.find(p => String(p.id) === String(formComp.pessoa_id))
                  const mensal = Number(pe?.valor_mensal_normal||0)
                  const pago = parseFloat(formComp.valor_pago_mensal)||0
                  const abatido = parseFloat(formComp.valor_abatido_divida)||0
                  const naoPago = Math.max(0, mensal - pago)
                  const saldoAtual = Number(pe?.saldo_calculado||0)
                  const saldoFim = saldoAtual + naoPago - abatido
                  return (
                    <>
                      <div style={{ background:'#E6F1FB', border:'0.5px solid #B3D1F0', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:11, color:'#185FA5' }}>
                        <strong>{pe?.nome}</strong> — Valor mensal normal: <strong>{fmt(mensal)}</strong> · Saldo devedor atual: <strong style={{ color:saldoAtual>0?VERMELHO:VERDE }}>{fmt(saldoAtual)}</strong>
                      </div>
                      <div style={s.grupo('1fr 1fr')}>
                        <div>
                          <label style={s.label}>Valor pago como mensal normal (R$)</label>
                          <input type="number" step="0.01" value={formComp.valor_pago_mensal} onChange={e=>setFormComp(f=>({...f,valor_pago_mensal:e.target.value}))} style={s.input} placeholder="0,00" />
                          {naoPago > 0 && <div style={{ fontSize:11, color:VERMELHO, marginTop:3 }}>⚠ Diferença não paga: {fmt(naoPago)} → virará acréscimo de dívida</div>}
                        </div>
                        <div>
                          <label style={s.label}>Valor usado para abater dívida antiga (R$)</label>
                          <input type="number" step="0.01" value={formComp.valor_abatido_divida} onChange={e=>setFormComp(f=>({...f,valor_abatido_divida:e.target.value}))} style={s.input} placeholder="0,00" />
                          {abatido > saldoAtual && <div style={{ fontSize:11, color:VERMELHO, marginTop:3 }}>⚠ Abatimento maior que o saldo devedor atual</div>}
                        </div>
                      </div>
                      <div style={{ background:'#F8F7F2', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:11 }}>
                        Saldo da dívida ao final de {fmtComp(formComp.competencia)}: <strong style={{ color:saldoFim>0?VERMELHO:VERDE }}>{fmt(saldoFim)}</strong>
                      </div>
                    </>
                  )
                })()}
                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Observações</label>
                  <input value={formComp.observacoes} onChange={e=>setFormComp(f=>({...f,observacoes:e.target.value}))} style={s.input} placeholder="Ex: Referente ao extrato de janeiro..." />
                </div>
                <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERDE)}>{salvando?'Salvando...':'✅ Registrar competência'}</button>
              </form>
            </div>
          )}

          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Histórico de competências ({competencias.length})</div>
            {competencias.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhuma competência registrada.</div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Pessoa','Competência','Mensal devido','Pago mensal','Não pago','Abatido','Saldo início','Saldo fim',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {competencias.map((c,i) => (
                      <tr key={c.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                        <td style={{ ...s.td, fontWeight:500 }}>{c.pessoa?.nome||'—'}</td>
                        <td style={s.td}>{fmtComp(c.competencia)}</td>
                        <td style={s.td}>{fmt(c.valor_mensal_devido)}</td>
                        <td style={{ ...s.td, color:VERDE }}>{fmt(c.valor_pago_mensal)}</td>
                        <td style={{ ...s.td, color:Number(c.valor_nao_pago)>0?VERMELHO:'#888780' }}>{fmt(c.valor_nao_pago)}</td>
                        <td style={{ ...s.td, color:VERDE }}>{fmt(c.valor_abatido_divida)}</td>
                        <td style={{ ...s.td, color:'#888780' }}>{fmt(c.saldo_divida_inicio)}</td>
                        <td style={{ ...s.td, fontWeight:600, color:Number(c.saldo_divida_fim)>0?VERMELHO:VERDE }}>{fmt(c.saldo_divida_fim)}</td>
                        <td style={s.td}>{c.observacoes||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== HISTÓRICO ===== */}
      {tab === 'historico' && (
        <>
          {isAdmin && (
            <div style={s.card}>
              <div style={s.secao}>Lançamento manual de movimentação</div>
              <form onSubmit={salvarMovimentacao}>
                <div style={s.grupo('1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Pessoa *</label>
                    <select value={formMov.pessoa_id} onChange={e=>setFormMov(f=>({...f,pessoa_id:e.target.value}))} required style={s.input}>
                      <option value="">Selecione...</option>
                      {pessoas.map(pe => <option key={pe.id} value={pe.id}>{pe.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Tipo *</label>
                    <select value={formMov.tipo} onChange={e=>setFormMov(f=>({...f,tipo:e.target.value}))} style={s.input}>
                      {Object.entries(TIPO_MOV_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Valor (R$) *</label>
                    <input type="number" step="0.01" value={formMov.valor} onChange={e=>setFormMov(f=>({...f,valor:e.target.value}))} required style={s.input} />
                  </div>
                </div>
                <div style={s.grupo('1fr 1fr 2fr')}>
                  <div>
                    <label style={s.label}>Data</label>
                    <input type="date" value={formMov.data_movimentacao} onChange={e=>setFormMov(f=>({...f,data_movimentacao:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Competência</label>
                    <input type="month" value={formMov.competencia} onChange={e=>setFormMov(f=>({...f,competencia:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Descrição</label>
                    <input value={formMov.descricao} onChange={e=>setFormMov(f=>({...f,descricao:e.target.value}))} style={s.input} />
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Observações {formMov.tipo==='ajuste'?'*':''}</label>
                  <input value={formMov.observacoes} onChange={e=>setFormMov(f=>({...f,observacoes:e.target.value}))} required={formMov.tipo==='ajuste'} placeholder={formMov.tipo==='ajuste'?'Obrigatório para ajuste manual':'Opcional'} style={s.input} />
                </div>
                <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERMELHO)}>{salvando?'Salvando...':'+ Lançar movimentação'}</button>
              </form>
            </div>
          )}

          <div style={s.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem', flexWrap:'wrap', gap:8 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>Todas as movimentações ({movimentacoes.length})</div>
              <select value={pessoaSel?.id||''} onChange={e => setPessoaSel(e.target.value ? pessoas.find(p=>String(p.id)===e.target.value) : null)} style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
                <option value="">Todas as pessoas</option>
                {pessoas.map(pe => <option key={pe.id} value={pe.id}>{pe.nome}</option>)}
              </select>
            </div>
            {(() => {
              const lista = pessoaSel ? movimentacoes.filter(m => m.pessoa_id === pessoaSel.id) : movimentacoes
              if (lista.length === 0) return <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhuma movimentação encontrada.</div>
              return (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Data','Pessoa','Competência','Tipo','Valor','Descrição','Obs'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {lista.map((m,i) => {
                      const [bg,cor] = TIPO_MOV_COR[m.tipo]||['#F1EFE8','#888780']
                      const isPositivo = m.tipo==='divida_inicial'||m.tipo==='acrescimo'
                      return (
                        <tr key={m.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                          <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(m.data_movimentacao)}</td>
                          <td style={{ ...s.td, fontWeight:500 }}>{m.pessoa?.nome||'—'}</td>
                          <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{m.competencia ? fmtComp(m.competencia) : '—'}</td>
                          <td style={s.td}><span style={s.badge(bg,cor)}>{TIPO_MOV_LABEL[m.tipo]}</span></td>
                          <td style={{ ...s.td, fontWeight:600, color:isPositivo?VERMELHO:VERDE, textAlign:'right' }}>
                            {isPositivo?'+':'-'} {fmt(m.valor)}
                          </td>
                          <td style={{ ...s.td, color:'#888780', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao||'—'}</td>
                          <td style={{ ...s.td, color:'#888780', fontSize:11 }}>{m.observacoes||'—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}
          </div>
        </>
      )}

      {/* ===== PESSOAS ===== */}
      {tab === 'pessoas' && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Pessoas cadastradas ({pessoas.length})</div>
          {pessoas.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhuma pessoa cadastrada.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr>{['Nome','Vínculo','Mensal normal','Dívida inicial','Saldo atual','Situação',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {pessoas.map((pe,i) => {
                  const saldo = Number(pe.saldo_calculado||0)
                  return (
                    <tr key={pe.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, fontWeight:500 }}>{pe.nome}</td>
                      <td style={s.td}><span style={s.badge('#F8F7F2','#5F5E5A')}>{TIPO_VINCULO_LABEL[pe.tipo_vinculo]}</span></td>
                      <td style={{ ...s.td, color:AZUL }}>{fmt(pe.valor_mensal_normal||0)}</td>
                      <td style={{ ...s.td, color:'#888780' }}>{fmt(pe.divida_inicial||0)}</td>
                      <td style={{ ...s.td, fontWeight:600, color:saldo>0?VERMELHO:VERDE }}>{saldo>0?fmt(saldo):'✅ Quitado'}</td>
                      <td style={s.td}><span style={s.badge(pe.ativo?'#EAF3DE':'#F1EFE8', pe.ativo?'#3B6D11':'#888780')}>{pe.ativo?'Ativo':'Inativo'}</span></td>
                      <td style={s.td}>
                        {isAdmin && <button onClick={() => editarPessoa(pe)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
