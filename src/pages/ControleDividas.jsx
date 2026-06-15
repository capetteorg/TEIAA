import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { confirmar } from '../lib/ui'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

const TIPO_VINCULO_LABEL = {
  CLT: 'CLT',
  prestacao_servicos: 'Prestação de serviços',
  contabil: 'Serviço contábil',
  outro: 'Outro',
}

const TIPO_MOV_LABEL = {
  divida_inicial: 'Dívida inicial',
  acrescimo: 'Acréscimo',
  abatimento: 'Abatimento',
  ajuste: 'Ajuste manual',
}

const TIPO_MOV_COR = {
  divida_inicial: ['#FAEEDA', '#854F0B'],
  acrescimo: ['#FCEBEB', '#A32D2D'],
  abatimento: ['#EAF3DE', '#3B6D11'],
  ajuste: ['#E6F1FB', '#185FA5'],
}

function gerarCompetencias(inicio = '2025-01') {
  const competencias = []
  const [anoI, mesI] = inicio.split('-').map(Number)
  const hoje = new Date()
  let ano = anoI, mes = mesI
  while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth() + 1)) {
    competencias.push(`${ano}-${String(mes).padStart(2, '0')}`)
    mes++
    if (mes > 12) { mes = 1; ano++ }
  }
  return competencias
}

export default function ControleDividas() {
  const { perfil, user } = useAuth()
  const isAdmin = perfil?.perfil === 'admin'

  const [pessoas, setPessoas] = useState([])
  const [equipe, setEquipe] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [competencias, setCompetencias] = useState([])
  const [tab, setTab] = useState('resumo')
  const [pessoaFiltro, setPessoaFiltro] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Form cadastro
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({
    equipe_id: '', tipo_vinculo: 'CLT',
    valor_mensal_normal: '', divida_inicial: '',
    data_base_divida: '2024-12-31', observacoes: '', ativo: true,
  })

  // Form ajuste manual
  const [formAdj, setFormAdj] = useState({
    pessoa_id: '', tipo: 'ajuste', valor: '',
    data_movimentacao: new Date().toISOString().slice(0,10),
    competencia: new Date().toISOString().slice(0,7),
    descricao: '', observacoes: '',
  })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [pesRes, movRes, compRes, eqRes] = await Promise.all([
      supabase.from('pessoas_recorrentes').select('*').order('nome'),
      fetchAll(() => supabase.from('divida_movimentacoes').select('*, pessoa:pessoas_recorrentes(nome)').order('data_movimentacao', { ascending: false })),
      supabase.from('competencias_mensais').select('*, pessoa:pessoas_recorrentes(nome)').order('competencia', { ascending: false }),
      supabase.from('equipe').select('id,nome,funcao,cpf').eq('situacao','ativo').order('nome'),
    ])
    const movList = movRes.data || []
    const pList = (pesRes.data || []).map(pe => {
      const movs = movList.filter(m => m.pessoa_id === pe.id)
      const saldo = movs.reduce((acc, m) => {
        if (m.tipo === 'divida_inicial' || m.tipo === 'acrescimo') return acc + Number(m.valor)
        if (m.tipo === 'abatimento') return acc - Number(m.valor)
        return acc + Number(m.valor)
      }, 0)
      return { ...pe, saldo_calculado: Math.max(0, saldo) }
    })
    setPessoas(pList)
    setMovimentacoes(movList)
    setCompetencias(compRes.data || [])
    setEquipe(eqRes.data || [])
  }

  async function salvarPessoa(e) {
    e.preventDefault()
    setSalvando(true)

    const membroEq = equipe.find(eq => String(eq.id) === String(form.equipe_id))
    if (!membroEq && !editandoId) { setMsg('Selecione um membro da equipe.'); setSalvando(false); return }

    const dados = {
      nome: membroEq?.nome || pessoas.find(p => p.id === editandoId)?.nome,
      tipo_vinculo: form.tipo_vinculo,
      valor_mensal_normal: parseFloat(form.valor_mensal_normal) || 0,
      divida_inicial: parseFloat(form.divida_inicial) || 0,
      data_base_divida: form.data_base_divida || '2024-12-31',
      observacoes: form.observacoes || null,
      ativo: form.ativo,
    }

    let novoId = editandoId
    if (editandoId) {
      await supabase.from('pessoas_recorrentes').update(dados).eq('id', editandoId)
      // Se mudou valor mensal, atualiza todas as competências pendentes
      if (dados.valor_mensal_normal > 0) {
        await supabase.from('competencias_mensais')
          .update({ valor_mensal_devido: dados.valor_mensal_normal, valor_nao_pago: dados.valor_mensal_normal })
          .eq('pessoa_id', editandoId).eq('status', 'pendente')
      }
      // Se tem dívida inicial e não havia movimentação anterior, lança
      if (dados.divida_inicial > 0) {
        const { data: movExiste } = await supabase.from('divida_movimentacoes')
          .select('id').eq('pessoa_id', editandoId).eq('tipo', 'divida_inicial').limit(1)
        if (!movExiste || movExiste.length === 0) {
          await supabase.from('divida_movimentacoes').insert({
            pessoa_id: editandoId, tipo: 'divida_inicial',
            valor: dados.divida_inicial,
            data_movimentacao: dados.data_base_divida,
            competencia: dados.data_base_divida.slice(0,7),
            descricao: `Dívida acumulada até ${new Date(dados.data_base_divida+'T12:00:00').toLocaleDateString('pt-BR')}`,
            usuario_id: user?.id || null,
          })
        } else {
          // Atualiza a movimentação existente
          await supabase.from('divida_movimentacoes')
            .update({ valor: dados.divida_inicial })
            .eq('pessoa_id', editandoId).eq('tipo', 'divida_inicial')
        }
      }
      // Gerar competências que ainda não existam
      const compExistentes = await supabase.from('competencias_mensais').select('competencia').eq('pessoa_id', editandoId)
      const existentes = (compExistentes.data || []).map(c => c.competencia)
      const todasComps = gerarCompetencias('2025-01')
      const novas = todasComps.filter(c => !existentes.includes(c))
      if (novas.length > 0) {
        await supabase.from('competencias_mensais').insert(novas.map(comp => ({
          pessoa_id: editandoId, competencia: comp,
          valor_mensal_devido: dados.valor_mensal_normal,
          valor_pago_mensal: 0, valor_nao_pago: dados.valor_mensal_normal,
          valor_abatido_divida: 0, saldo_divida_inicio: 0, saldo_divida_fim: 0,
          status: 'pendente',
        })))
        await supabase.from('divida_movimentacoes').insert(novas.map(comp => ({
          pessoa_id: editandoId, tipo: 'acrescimo',
          valor: dados.valor_mensal_normal,
          data_movimentacao: comp + '-01',
          competencia: comp,
          descricao: `Valor mensal não pago — ${comp}`,
          usuario_id: user?.id || null,
        })))
      }
    } else {
      // Verifica se já existe
      const { data: existe } = await supabase.from('pessoas_recorrentes').select('id').ilike('nome', dados.nome).limit(1)
      if (existe?.length > 0) { setMsg('Essa pessoa já está cadastrada.'); setSalvando(false); return }
      const { data: novo } = await supabase.from('pessoas_recorrentes').insert(dados).select().single()
      novoId = novo?.id

      // Dívida inicial → movimentação automática
      if (novoId && dados.divida_inicial > 0) {
        await supabase.from('divida_movimentacoes').insert({
          pessoa_id: novoId, tipo: 'divida_inicial',
          valor: dados.divida_inicial,
          data_movimentacao: dados.data_base_divida,
          competencia: dados.data_base_divida.slice(0,7),
          descricao: `Dívida acumulada até ${new Date(dados.data_base_divida+'T12:00:00').toLocaleDateString('pt-BR')}`,
          usuario_id: user?.id || null,
        })
      }

      // Gerar competências jan/2025 até hoje automaticamente
      if (novoId) {
        const competenciasParaGerar = gerarCompetencias('2025-01')
        const inserts = competenciasParaGerar.map(comp => ({
          pessoa_id: novoId,
          competencia: comp,
          valor_mensal_devido: dados.valor_mensal_normal,
          valor_pago_mensal: 0,
          valor_nao_pago: dados.valor_mensal_normal,
          valor_abatido_divida: 0,
          saldo_divida_inicio: 0,
          saldo_divida_fim: 0,
          status: 'pendente',
        }))
        await supabase.from('competencias_mensais').insert(inserts)

        // Lançar acréscimo de dívida para cada competência pendente
        const movInserts = competenciasParaGerar.map(comp => ({
          pessoa_id: novoId,
          tipo: 'acrescimo',
          valor: dados.valor_mensal_normal,
          data_movimentacao: comp + '-01',
          competencia: comp,
          descricao: `Valor mensal não pago — ${comp}`,
          usuario_id: user?.id || null,
        }))
        await supabase.from('divida_movimentacoes').insert(movInserts)
      }
    }

    setMsg(editandoId ? 'Atualizado!' : 'Cadastrado! Competências geradas automaticamente.')
    setForm({ equipe_id:'', tipo_vinculo:'CLT', valor_mensal_normal:'', divida_inicial:'', data_base_divida:'2024-12-31', observacoes:'', ativo:true })
    setEditandoId(null)
    setMostrarForm(false)
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function salvarAjuste(e) {
    e.preventDefault()
    if (!formAdj.observacoes) { setMsg('Observação obrigatória para ajuste manual.'); return }
    setSalvando(true)
    await supabase.from('divida_movimentacoes').insert({
      pessoa_id: parseInt(formAdj.pessoa_id),
      tipo: formAdj.tipo,
      valor: (parseFloat(formAdj.valor) || 0),
      data_movimentacao: formAdj.data_movimentacao,
      competencia: formAdj.competencia || null,
      descricao: formAdj.descricao || null,
      observacoes: formAdj.observacoes,
      usuario_id: user?.id || null,
    })
    await recalcularSaldo(parseInt(formAdj.pessoa_id))
    setMsg('Lançamento registrado!')
    setFormAdj({ pessoa_id:'', tipo:'ajuste', valor:'', data_movimentacao:new Date().toISOString().slice(0,10), competencia:new Date().toISOString().slice(0,7), descricao:'', observacoes:'' })
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function excluirPessoa(pe) {
    if (!(await confirmar(`Excluir ${pe.nome}? Isso apagará todas as movimentações e competências vinculadas.`, { titulo:'Excluir pessoa', confirmarLabel:'Excluir tudo' }))) return
    await supabase.from('competencias_mensais').delete().eq('pessoa_id', pe.id)
    await supabase.from('divida_movimentacoes').delete().eq('pessoa_id', pe.id)
    await supabase.from('pessoas_recorrentes').delete().eq('id', pe.id)
    carregar()
    setMsg('Pessoa excluída.')
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function recalcularSaldo(pessoaId) {
    const { data: movs } = await fetchAll(() => supabase.from('divida_movimentacoes').select('tipo,valor').eq('pessoa_id', pessoaId))
    const saldo = (movs||[]).reduce((acc, m) => {
      if (m.tipo === 'divida_inicial' || m.tipo === 'acrescimo') return acc + Number(m.valor)
      if (m.tipo === 'abatimento') return acc - Number(m.valor)
      return acc + Number(m.valor)
    }, 0)
    await supabase.from('pessoas_recorrentes').update({ saldo_atual: Math.max(0, saldo), atualizado_em: new Date().toISOString() }).eq('id', pessoaId)
  }

  function editarPessoa(pe) {
    setForm({ equipe_id:'', tipo_vinculo: pe.tipo_vinculo, valor_mensal_normal: pe.valor_mensal_normal||'', divida_inicial: pe.divida_inicial||'', data_base_divida: pe.data_base_divida||'2024-12-31', observacoes: pe.observacoes||'', ativo: pe.ativo })
    setEditandoId(pe.id)
    setMostrarForm(true)
    setTab('pessoas')
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtComp = c => c ? new Date(c+'-15').toLocaleDateString('pt-BR', { month:'long', year:'numeric' }) : '—'

  const totalSaldo = pessoas.reduce((a,p) => a + Number(p.saldo_calculado||0), 0)
  const pessoasComDivida = pessoas.filter(p => Number(p.saldo_calculado||0) > 0)
  const compPendentes = competencias.filter(c => c.status === 'pendente').length

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    tab: ativo => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?'#0E7EA8':'#D3D1C7'}`, background:ativo?'#0E7EA8':'transparent', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
  }

  return (
    <div style={{ }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Controle de Dívidas</div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
<div style={{ fontSize:12, color:'#888780' }}>Conta corrente de pagamentos com funcionários e prestadores</div>
        </div>
        {isAdmin && (
          <button onClick={() => { setMostrarForm(!mostrarForm); setEditandoId(null); setForm({ equipe_id:'', tipo_vinculo:'CLT', valor_mensal_normal:'', divida_inicial:'', data_base_divida:'2024-12-31', observacoes:'', ativo:true }) }}
            style={s.btn(mostrarForm?'#F1EFE8':AZUL, mostrarForm?'#5F5E5A':'#fff')}>
            {mostrarForm ? 'Cancelar' : '+ Cadastrar pessoa'}
          </button>
        )}
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:'1.25rem' }}>
        {[
          { label:'Pessoas cadastradas', val:pessoas.length, cor:AZUL },
          { label:'Com dívida ativa', val:pessoasComDivida.length, cor:pessoasComDivida.length>0?VERMELHO:VERDE },
          { label:'Saldo total devedor', val:fmt(totalSaldo), cor:totalSaldo>0?VERMELHO:VERDE },
          { label:'Competências pendentes', val:compPendentes, cor:compPendentes>0?LARANJA:VERDE },
        ].map(m => (
          <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ height:3, borderRadius:99, background:m.cor, marginBottom:'.7rem' }} />
            <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:16, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Form cadastro */}
      {isAdmin && mostrarForm && (
        <div style={{ ...s.card, borderColor:AZUL+'60', marginBottom:'1.25rem' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>{editandoId ? 'Editar pessoa' : 'Cadastrar pessoa para controle de pagamentos'}</div>
          <form onSubmit={salvarPessoa}>
            {!editandoId && (
              <div style={{ ...s.grupo('1fr 1fr'), marginBottom:10 }}>
                <div>
                  <label style={s.label}>Funcionário / Prestador (da equipe) *</label>
                  <select value={form.equipe_id} onChange={e=>setForm(f=>({...f,equipe_id:e.target.value}))} required={!editandoId} style={s.input}>
                    <option value="">Selecione da equipe...</option>
                    {equipe.filter(eq => !pessoas.find(p => p.nome === eq.nome)).map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.nome}{eq.funcao?` — ${eq.funcao}`:''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Tipo de vínculo</label>
                  <select value={form.tipo_vinculo} onChange={e=>setForm(f=>({...f,tipo_vinculo:e.target.value}))} style={s.input}>
                    {Object.entries(TIPO_VINCULO_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            )}
            {editandoId && (
              <div style={{ ...s.grupo('1fr'), marginBottom:10 }}>
                <div>
                  <label style={s.label}>Tipo de vínculo</label>
                  <select value={form.tipo_vinculo} onChange={e=>setForm(f=>({...f,tipo_vinculo:e.target.value}))} style={s.input}>
                    {Object.entries(TIPO_VINCULO_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Valor mensal normal (R$) *</label>
                <input type="number" step="0.01" value={form.valor_mensal_normal} onChange={e=>setForm(f=>({...f,valor_mensal_normal:e.target.value}))} required style={s.input} placeholder="Ex: 1200,00" />
              </div>
              <div>
                <label style={s.label}>Dívida acumulada até 31/12/2024 (R$)</label>
                <input type="number" step="0.01" value={form.divida_inicial} onChange={e=>setForm(f=>({...f,divida_inicial:e.target.value}))} style={s.input} placeholder="0,00" />
              </div>
              <div>
                <label style={s.label}>Data base da dívida</label>
                <input type="date" value={form.data_base_divida} onChange={e=>setForm(f=>({...f,data_base_divida:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
            </div>
            {!editandoId && (
              <div style={{ background:'#E6F1FB', border:'0.5px solid #B3D1F0', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:11, color:'#185FA5' }}>
                <i className="ti ti-calendar" style={{marginRight:4}} /> O sistema vai gerar automaticamente as competências de <strong>jan/2025</strong> até <strong>hoje</strong> como pendentes.
                {(parseFloat(form.divida_inicial) || 0) > 0 && <span> Uma movimentação de dívida inicial de <strong>{fmt(form.divida_inicial)}</strong> será lançada automaticamente.</span>}
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':AZUL)}>{salvando?'Salvando...':editandoId?'Salvar':'+ Cadastrar'}</button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditandoId(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {[
          ['resumo','Resumo'],
          ['competencias',`Competências mensais${compPendentes>0?` (${compPendentes} pend.)`:''}`],
          ['historico','Histórico'],
          ['pessoas','Pessoas'],
          ...(isAdmin ? [['ajuste','Ajuste manual']] : []),
        ].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={s.tab(tab===v)}>{l}</button>
        ))}
      </div>

      {/* ===== RESUMO ===== */}
      {tab === 'resumo' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
          {pessoas.length === 0 ? (
            <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780', gridColumn:'1/-1' }}>
              <div style={{ marginBottom:8 }}><i className="ti ti-users" style={{fontSize:32, color:'#C8C6BC'}} /></div>
              <div style={{ fontSize:13 }}>Nenhuma pessoa cadastrada ainda.</div>
            </div>
          ) : pessoas.map(pe => {
            const saldo = Number(pe.saldo_calculado||0)
            const movPessoa = movimentacoes.filter(m => m.pessoa_id === pe.id)
            const totalAbatimentos = movPessoa.filter(m=>m.tipo==='abatimento').reduce((a,m)=>a+Number(m.valor),0)
            const compPessoa = competencias.filter(c => c.pessoa_id === pe.id)
            const compPend = compPessoa.filter(c => c.status === 'pendente').length
            const ultimaMov = movPessoa[0]
            return (
              <div key={pe.id} style={{ background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', overflow:'hidden' }}>
                <div style={{ background:saldo>0?`${VERMELHO}08`:`${VERDE}08`, borderBottom:'0.5px solid #E8E6DE', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{pe.nome}</div>
                    <div style={{ fontSize:11, color:'#888780' }}>{TIPO_VINCULO_LABEL[pe.tipo_vinculo]} · Mensal: {fmt(pe.valor_mensal_normal||0)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, color:'#888780' }}>Saldo devedor</div>
                    <div style={{ fontSize:16, fontWeight:700, color:saldo>0?VERMELHO:VERDE }}>{saldo>0?fmt(saldo):'Quitado'}</div>
                  </div>
                </div>
                <div style={{ padding:'10px 14px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                    {[
                      ['Mensal devido/mês', fmt(pe.valor_mensal_normal||0), AZUL],
                      ['Dívida anterior (até 31/12/2024)', fmt(pe.divida_inicial||0), LARANJA],
                      ['Total pago (abatimentos)', fmt(totalAbatimentos), VERDE],
                      ['Competências pendentes', compPend, compPend>0?LARANJA:VERDE],
                    ].map(([l,v,c]) => (
                      <div key={l} style={{ background:'#F8F7F2', borderRadius:8, padding:'6px 8px' }}>
                        <div style={{ fontSize:9, color:'#888780', marginBottom:2 }}>{l}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {ultimaMov && <div style={{ fontSize:11, color:'#888780', marginBottom:8 }}>Última mov.: {fmtData(ultimaMov.data_movimentacao)} — {TIPO_MOV_LABEL[ultimaMov.tipo]}</div>}
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => { setPessoaFiltro(String(pe.id)); setTab('historico') }} style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Histórico</button>
                    <button onClick={() => { setPessoaFiltro(String(pe.id)); setTab('competencias') }} style={{ ...s.btn('#E6F1FB',AZUL), fontSize:11 }}>Competências</button>
                    {isAdmin && <button onClick={() => editarPessoa(pe)} style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Editar</button>}
                    {isAdmin && <button onClick={() => excluirPessoa(pe)} style={{ ...{ ...s.btn('#FEF2F2',VERMELHO), background:'transparent', border:'none', color:'#C0392B' }, fontSize:11 }}>Excluir</button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== COMPETÊNCIAS ===== */}
      {tab === 'competencias' && (
        <div style={s.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Competências mensais — geradas automaticamente a partir do extrato</div>
            <select value={pessoaFiltro} onChange={e=>setPessoaFiltro(e.target.value)} style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
              <option value="">Todas as pessoas</option>
              {pessoas.map(pe => <option key={pe.id} value={pe.id}>{pe.nome}</option>)}
            </select>
          </div>
          <div style={{ fontSize:11, color:'#888780', marginBottom:10, background:'#E6F1FB', padding:'8px 12px', borderRadius:8 }}>
            <i className="ti ti-bulb" style={{marginRight:4}} /> As competências são atualizadas automaticamente quando você vincula um pagamento na <strong>Conciliação bancária</strong>.
          </div>
          {(() => {
            const lista = pessoaFiltro ? competencias.filter(c => String(c.pessoa_id) === pessoaFiltro) : competencias
            if (lista.length === 0) return <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhuma competência encontrada.</div>
            return (
              <div style={{ overflowX:'auto' }}>
                <div style={{ display:'flex', gap:16, marginBottom:10, fontSize:11 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:12, height:12, borderRadius:3, background:AZUL, display:'inline-block' }} />
                    Ano corrente (salário/serviço mensal)
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:12, height:12, borderRadius:3, background:LARANJA, display:'inline-block' }} />
                    Dívida anterior (exercícios anteriores a 2025)
                  </span>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>
                    {['Pessoa','Competência','Mensal devido\n(ano corrente)','Pago\n(ano corrente)','Não pago\n(ano corrente)','Abatido\n(dívida anterior)','Saldo início','Saldo fim','Status'].map(h=>(
                      <th key={h} style={{ ...s.th, whiteSpace:'pre-line', lineHeight:1.3 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {lista.map((c,i) => (
                      <tr key={c.id} style={{ background:c.status==='pendente'?'#FFFBF0':i%2===0?'#fff':'#FAFAF8' }}>
                        <td style={{ ...s.td, fontWeight:500 }}>{c.pessoa?.nome||'—'}</td>
                        <td style={s.td}>{fmtComp(c.competencia)}</td>
                        <td style={{ ...s.td, color:AZUL, fontWeight:500 }}>{fmt(c.valor_mensal_devido)}</td>
                        <td style={{ ...s.td, color:VERDE }}>{fmt(c.valor_pago_mensal)}</td>
                        <td style={{ ...s.td, color:Number(c.valor_nao_pago)>0?VERMELHO:'#888780' }}>{fmt(c.valor_nao_pago)}</td>
                        <td style={{ ...s.td, color:LARANJA, fontWeight:Number(c.valor_abatido_divida)>0?600:400 }}>{fmt(c.valor_abatido_divida)}</td>
                        <td style={{ ...s.td, color:'#888780' }}>{fmt(c.saldo_divida_inicio)}</td>
                        <td style={{ ...s.td, fontWeight:600, color:Number(c.saldo_divida_fim)>0?VERMELHO:VERDE }}>{fmt(c.saldo_divida_fim)}</td>
                        <td style={s.td}>
                          <span style={s.badge(c.status==='pago'?'#EAF3DE':c.status==='parcial'?'#FAEEDA':'#F8F7F2', c.status==='pago'?'#3B6D11':c.status==='parcial'?'#854F0B':'#888780')}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}

      {/* ===== HISTÓRICO ===== */}
      {tab === 'historico' && (
        <div style={s.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Histórico de movimentações ({movimentacoes.length})</div>
            <select value={pessoaFiltro} onChange={e=>setPessoaFiltro(e.target.value)} style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
              <option value="">Todas as pessoas</option>
              {pessoas.map(pe => <option key={pe.id} value={pe.id}>{pe.nome}</option>)}
            </select>
          </div>
          {(() => {
            const lista = pessoaFiltro ? movimentacoes.filter(m => String(m.pessoa_id) === pessoaFiltro) : movimentacoes
            if (lista.length === 0) return <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhuma movimentação.</div>
            return (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['Data','Pessoa','Competência','Tipo','Valor','Descrição','Obs'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {lista.map((m,i) => {
                    const [bg,cor] = TIPO_MOV_COR[m.tipo]||['#F1EFE8','#888780']
                    const isPos = m.tipo==='divida_inicial'||m.tipo==='acrescimo'
                    return (
                      <tr key={m.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                        <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(m.data_movimentacao)}</td>
                        <td style={{ ...s.td, fontWeight:500 }}>{m.pessoa?.nome||'—'}</td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{m.competencia?fmtComp(m.competencia):'—'}</td>
                        <td style={s.td}><span style={s.badge(bg,cor)}>{TIPO_MOV_LABEL[m.tipo]}</span></td>
                        <td style={{ ...s.td, fontWeight:600, color:isPos?VERMELHO:VERDE, textAlign:'right' }}>{isPos?'+':'-'} {fmt(m.valor)}</td>
                        <td style={{ ...s.td, color:'#888780', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao||'—'}</td>
                        <td style={{ ...s.td, color:'#888780', fontSize:11 }}>{m.observacoes||'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          })()}
        </div>
      )}

      {/* ===== PESSOAS ===== */}
      {tab === 'pessoas' && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Pessoas cadastradas ({pessoas.length})</div>
          {pessoas.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhuma pessoa cadastrada.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr>{['Nome','Vínculo','Mensal normal','Dívida inicial','Saldo atual','Ativo',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {pessoas.map((pe,i) => {
                  const saldo = Number(pe.saldo_calculado||0)
                  return (
                    <tr key={pe.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, fontWeight:500 }}>{pe.nome}</td>
                      <td style={s.td}><span style={s.badge('#F8F7F2','#5F5E5A')}>{TIPO_VINCULO_LABEL[pe.tipo_vinculo]}</span></td>
                      <td style={{ ...s.td, color:AZUL, fontWeight:500 }}>{fmt(pe.valor_mensal_normal||0)}</td>
                      <td style={{ ...s.td, color:'#888780' }}>{fmt(pe.divida_inicial||0)}</td>
                      <td style={{ ...s.td, fontWeight:600, color:saldo>0?VERMELHO:VERDE }}>{saldo>0?fmt(saldo):'Quitado'}</td>
                      <td style={s.td}><span style={s.badge(pe.ativo?'#EAF3DE':'#F1EFE8', pe.ativo?'#3B6D11':'#888780')}>{pe.ativo?'Sim':'Não'}</span></td>
                      <td style={s.td}>
                        {isAdmin && <button onClick={() => editarPessoa(pe)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>}
                        {isAdmin && <button onClick={() => excluirPessoa(pe)} style={{ ...{ ...s.btn('#FEF2F2',VERMELHO), background:'transparent', border:'none', color:'#C0392B' }, marginLeft:4 }}>Excluir</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== AJUSTE MANUAL ===== */}
      {tab === 'ajuste' && isAdmin && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>Ajuste manual de movimentação</div>
          <div style={{ fontSize:11, color:'#888780', marginBottom:'1rem' }}>Use apenas para correções pontuais. Observação obrigatória.</div>
          <form onSubmit={salvarAjuste}>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Pessoa *</label>
                <select value={formAdj.pessoa_id} onChange={e=>setFormAdj(f=>({...f,pessoa_id:e.target.value}))} required style={s.input}>
                  <option value="">Selecione...</option>
                  {pessoas.map(pe => <option key={pe.id} value={pe.id}>{pe.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Tipo</label>
                <select value={formAdj.tipo} onChange={e=>setFormAdj(f=>({...f,tipo:e.target.value}))} style={s.input}>
                  {Object.entries(TIPO_MOV_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Valor (R$) *</label>
                <input type="number" step="0.01" value={formAdj.valor} onChange={e=>setFormAdj(f=>({...f,valor:e.target.value}))} required style={s.input} />
              </div>
            </div>
            <div style={s.grupo('1fr 1fr 2fr')}>
              <div><label style={s.label}>Data</label><input type="date" value={formAdj.data_movimentacao} onChange={e=>setFormAdj(f=>({...f,data_movimentacao:e.target.value}))} style={s.input} /></div>
              <div><label style={s.label}>Competência</label><input type="month" value={formAdj.competencia} onChange={e=>setFormAdj(f=>({...f,competencia:e.target.value}))} style={s.input} /></div>
              <div><label style={s.label}>Descrição</label><input value={formAdj.descricao} onChange={e=>setFormAdj(f=>({...f,descricao:e.target.value}))} style={s.input} /></div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Observação * (obrigatória)</label>
              <input value={formAdj.observacoes} onChange={e=>setFormAdj(f=>({...f,observacoes:e.target.value}))} required placeholder="Motivo do ajuste..." style={s.input} />
            </div>
            <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERMELHO)}>{salvando?'Salvando...':'+ Lançar ajuste'}</button>
          </form>
        </div>
      )}
    </div>
      </div>
  )
}