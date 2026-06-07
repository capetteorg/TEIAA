import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import ConciliacaoInteligente from './ConciliacaoInteligente'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4'

const TIPOS_RECEITA = ['Repasse da emenda', 'Rendimento de aplicação', 'Estorno', 'Devolução recebida', 'Outra entrada']

export default function Conciliacao() {
  const navigate = useNavigate()
  const [extratos, setExtratos] = useState([])
  const [extratoSel, setExtratoSel] = useState(null)
  const [movs, setMovs] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [planos, setPlanos] = useState([])
  const [eventos, setEventos] = useState([])
  const [campanhas, setCampanhas] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [pessoasRecorrentes, setPessoasRecorrentes] = useState([])
  const [menuAberto, setMenuAberto] = useState(null)
  const [pagFuncAberto, setPagFuncAberto] = useState(null)
  const [formPagFunc, setFormPagFunc] = useState({})
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [abaConcil, setAbaConcil] = useState('manual')
  const [msg, setMsg] = useState('')
  const [descExpandida, setDescExpandida] = useState(null)
  const [complementarAberto, setComplementarAberto] = useState(null)
  const [formCompl, setFormCompl] = useState({})

  useEffect(() => {
    carregarExtratos()
    supabase.from('categorias').select('*').order('nome').then(({ data }) => setCategorias(data || []))
    supabase.from('subcategorias').select('*').order('nome').then(({ data }) => setSubcategorias(data || []))
    supabase.from('plano_trabalho').select('id,nome,conta_id').order('nome').then(({ data }) => setPlanos(data || []))
    supabase.from('eventos').select('id,nome').order('nome').then(({ data }) => setEventos(data || []))
    supabase.from('campanhas').select('id,nome').order('nome').then(({ data }) => setCampanhas(data || []))
    supabase.from('fornecedores').select('id,nome,cpf_cnpj').eq('ativo',true).order('nome').then(({ data }) => setFornecedores(data || []))
    supabase.from('pessoas_recorrentes').select('*').eq('ativo',true).order('nome').then(({ data }) => setPessoasRecorrentes(data || []))
  }, [])

  async function carregarExtratos() {
    const { data } = await supabase
      .from('extratos')
      .select('*, conta:contas(id,nome,banco,preponderancia,tipo_conta)')
      .order('importado_em', { ascending: false })
    setExtratos(data || [])
  }

  async function abrirExtrato(ext) {
    setLoading(true)
    setExtratoSel(ext)
    const { data, error } = await supabase
      .from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), subcategoria:subcategorias(nome)')
      .eq('extrato_id', ext.id)
      .order('data')
    if (error) console.error('Erro ao buscar movimentações:', error)
    setMovs(data || [])
    setLoading(false)
  }

  async function salvarCategoria(movId, catId) {
    await supabase.from('extrato_movs').update({ categoria_id: catId ? parseInt(catId) : null, subcategoria_id: null }).eq('id', movId)
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
      ? { ...m, plano_trabalho_id: planoId, plano: planos.find(p => String(p.id) === String(planoId)) }
      : m))
  }

  async function salvarPagamentoFuncionario(movId, mov) {
    const { pessoa_id, competencia, valor_mensal, valor_abatimento } = formPagFunc
    if (!pessoa_id || !competencia) return
    const pessoa = pessoasRecorrentes.find(p => String(p.id) === String(pessoa_id))
    const valMensal = parseFloat(valor_mensal) || 0
    const valAbat = parseFloat(valor_abatimento) || 0
    const totalMov = Math.abs(Number(mov.valor))
    if (Math.abs(valMensal + valAbat - totalMov) > 0.01) {
      alert(`A soma (R$ ${(valMensal+valAbat).toFixed(2)}) deve ser igual ao valor do extrato (R$ ${totalMov.toFixed(2)})`)
      return
    }
    const valorMensalDevido = Number(pessoa?.valor_mensal_normal || 0)
    const valorNaoPago = Math.max(0, valorMensalDevido - valMensal)

    // Buscar saldo atual
    const { data: movsPessoa } = await supabase.from('divida_movimentacoes').select('tipo,valor').eq('pessoa_id', parseInt(pessoa_id))
    const saldoAtual = (movsPessoa||[]).reduce((acc, m) => {
      if (m.tipo === 'divida_inicial' || m.tipo === 'acrescimo') return acc + Number(m.valor)
      if (m.tipo === 'abatimento') return acc - Number(m.valor)
      return acc + Number(m.valor)
    }, 0)
    const saldoFim = Math.max(0, saldoAtual + valorNaoPago - valAbat)

    // Atualizar competência
    const { data: compExiste } = await supabase.from('competencias_mensais')
      .select('id').eq('pessoa_id', parseInt(pessoa_id)).eq('competencia', competencia).single()
    if (compExiste) {
      await supabase.from('competencias_mensais').update({
        valor_pago_mensal: valMensal,
        valor_nao_pago: valorNaoPago,
        valor_abatido_divida: valAbat,
        saldo_divida_inicio: saldoAtual,
        saldo_divida_fim: saldoFim,
        extrato_mov_id: movId,
        status: valorNaoPago === 0 ? 'pago' : 'parcial',
      }).eq('id', compExiste.id)
    }

    // Lançar movimentações
    if (valAbat > 0) {
      await supabase.from('divida_movimentacoes').insert({
        pessoa_id: parseInt(pessoa_id), tipo: 'abatimento',
        valor: valAbat, data_movimentacao: mov.data, competencia,
        descricao: `Abatimento de dívida — ${competencia} — extrato`,
        extrato_mov_id: movId,
      })
    }
    if (valorNaoPago > 0) {
      await supabase.from('divida_movimentacoes').insert({
        pessoa_id: parseInt(pessoa_id), tipo: 'acrescimo',
        valor: valorNaoPago, data_movimentacao: mov.data, competencia,
        descricao: `Valor não pago em ${competencia} — acréscimo de dívida`,
        extrato_mov_id: movId,
      })
    }

    await supabase.from('extrato_movs').update({ fornecedor: pessoa?.nome, obs_prestacao: `Pagamento ${competencia} — mensal: R$${valMensal.toFixed(2)}, abatimento: R$${valAbat.toFixed(2)}` }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id === movId ? { ...m, fornecedor: pessoa?.nome } : m))
    setPagFuncAberto(null)
    setFormPagFunc({})
    setMsg(`✅ Pagamento de ${pessoa?.nome} registrado! Competência ${competencia} atualizada.`)
    setTimeout(() => setMsg(''), 4000)
  }

  async function salvarComplementar(movId) {
    const dados = { ...formCompl }
    if (dados.evento_id) dados.evento_id = parseInt(dados.evento_id)
    if (dados.campanha_id) dados.campanha_id = parseInt(dados.campanha_id)
    if (dados.fornecedor_id) dados.fornecedor_id = parseInt(dados.fornecedor_id)
    if (dados.percentual_rateio) dados.percentual_rateio = parseFloat(dados.percentual_rateio)
    if (!dados.data_documento) delete dados.data_documento
    await supabase.from('extrato_movs').update(dados).eq('id', movId)
    setMovs(prev => prev.map(m => m.id === movId ? { ...m, ...dados } : m))
    setComplementarAberto(null)
    setFormCompl({})
    setMsg('Dados complementares salvos! ✓')
    setTimeout(() => setMsg(''), 3000)
  }

  function abrirComplementar(m) {
    setComplementarAberto(m.id)
    setFormCompl({
      fornecedor_id: m.fornecedor_id || '',
      fornecedor: m.fornecedor || '',
      cpf_cnpj: m.cpf_cnpj || '',
      num_nota: m.num_nota || '',
      data_documento: m.data_documento || '',
      descricao_produto: m.descricao_produto || '',
      local_comprovante: m.local_comprovante || '',
      link_externo: m.link_externo || '',
      bem_permanente: m.bem_permanente || false,
      local_guarda_bem: m.local_guarda_bem || '',
      despesa_rateada: m.despesa_rateada || false,
      percentual_rateio: m.percentual_rateio || '',
      fonte_restante: m.fonte_restante || '',
      justificativa_rateio: m.justificativa_rateio || '',
      obs_prestacao: m.obs_prestacao || '',
      tipo_receita: m.tipo_receita || '',
      evento_id: m.evento_id || '',
      campanha_id: m.campanha_id || '',
    })
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
  const planosDaConta = (contaId) => planos.filter(p => String(p.conta_id) === String(contaId))

  const movsFiltradas = movs.filter(m => {
    if (filtro === 'pendentes') return !m.conciliado
    if (filtro === 'conciliados') return m.conciliado
    if (filtro === 'sem_dados') return !m.categoria_id
    return true
  })

  const totalConciliados = movs.filter(m => m.conciliado).length
  const totalPendentes = movs.filter(m => !m.conciliado).length
  const totalSemCategoria = movs.filter(m => !m.categoria_id).length

  const fmt = v => {
    const abs = Math.abs(v)
    return (v >= 0 ? '+' : '-') + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const fmtDataHora = d => d ? new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const temDadosCompl = (m) => m.fornecedor || m.fornecedor_id || m.num_nota || m.local_comprovante || m.evento_id || m.campanha_id

  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', fontWeight: 500, borderBottom: '0.5px solid #E0DDD5', whiteSpace: 'nowrap' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', verticalAlign: 'middle', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    btn: (bg, cor = '#fff') => ({ padding: '5px 12px', fontSize: 11, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer', whiteSpace: 'nowrap' }),
    select: { fontSize: 11, padding: '3px 6px', border: '0.5px solid #D3D1C7', borderRadius: 8, background: '#fff', width: '100%' },
    input: { fontSize: 11, padding: '3px 6px', border: '0.5px solid #D3D1C7', borderRadius: 8, background: '#fff', width: '52px' },
    tab: ativo => ({ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: ativo ? VERDE : 'transparent', color: ativo ? '#fff' : '#5F5E5A', cursor: 'pointer' }),
    label: { fontSize: 11, color: '#5F5E5A', display: 'block', marginBottom: 2 },
    inputCompl: { width: '100%', fontSize: 12, padding: '5px 8px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
  }

  // ===== LISTA DE EXTRATOS =====
  if (!extratoSel) return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem' }}>
        <button onClick={() => setAbaConcil('manual')}
          style={{ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${abaConcil==='manual'?VERDE:'#D3D1C7'}`, background:abaConcil==='manual'?VERDE:'#fff', color:abaConcil==='manual'?'#fff':'#5F5E5A', cursor:'pointer' }}>
          Conciliação manual
        </button>
        <button onClick={() => setAbaConcil('inteligente')}
          style={{ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${abaConcil==='inteligente'?'#8B2FC9':'#D3D1C7'}`, background:abaConcil==='inteligente'?'#8B2FC9':'#fff', color:abaConcil==='inteligente'?'#fff':'#5F5E5A', cursor:'pointer' }}>
          ✨ Conciliação inteligente
        </button>
      </div>

      {abaConcil === 'inteligente' && <ConciliacaoInteligente />}

      {abaConcil === 'manual' && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:15, fontWeight:500 }}>Conciliação bancária</div>
            <button onClick={() => navigate('/importar')} style={{ fontSize:12, padding:'7px 14px', borderRadius:8, border:'none', background:AZUL, color:'#fff', cursor:'pointer', fontWeight:500 }}>
              ↑ Importar extrato
            </button>
          </div>
          {extratos.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '3rem', color: '#888780' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13 }}>Nenhum extrato importado ainda.</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>
                <button onClick={() => navigate('/importar')} style={{ fontSize:12, padding:'7px 16px', borderRadius:8, border:'none', background:AZUL, color:'#fff', cursor:'pointer' }}>
                  Importar primeiro extrato →
                </button>
              </div>
            </div>
          ) : (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>
                Extratos importados ({extratos.length}) — clique para abrir e conciliar
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>
                  {['Competência','Período','Conta','Movimentações','Saldo final','Importado em','Arquivo',''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {extratos.map(e => (
                    <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => abrirExtrato(e)}>
                      <td style={s.td}><strong>{e.competencia}</strong></td>
                      <td style={{ ...s.td, fontSize:11, color:'#888780' }}>
                        {e.data_inicio && e.data_fim
                          ? `${fmtData(e.data_inicio)} a ${fmtData(e.data_fim)}`
                          : '—'}
                      </td>
                      <td style={s.td}>{e.conta?.nome || '—'}</td>
                      <td style={s.td}>
                        <span style={s.badge('#E6F1FB','#185FA5')}>{e.total_movs} movs</span>
                      </td>
                      <td style={{ ...s.td, color: VERDE, fontWeight: 500 }}>
                        R$ {Number(e.saldo_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...s.td, color: '#888780', fontSize:11 }}>{fmtDataHora(e.importado_em)}</td>
                      <td style={{ ...s.td, fontSize:10, color:'#888780', fontFamily:'monospace' }}>{e.arquivo_nome||'—'}</td>
                      <td style={s.td}>
                        <button onClick={ev => { ev.stopPropagation(); abrirExtrato(e) }} style={s.btn(VERDE)}>Abrir →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )

  const contaPrep = extratoSel.conta?.preponderancia
  const contaTipo = extratoSel.conta?.tipo_conta
  const isRateio = contaPrep === 'rateio'
  const isEmenda = contaTipo && contaTipo !== 'principal'
  const planosDisponiveis = planosDaConta(extratoSel.conta?.id)

  // ===== TELA DE CONCILIAÇÃO =====
  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem' }}>
        <button onClick={() => setAbaConcil('manual')}
          style={{ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${abaConcil==='manual'?VERDE:'#D3D1C7'}`, background:abaConcil==='manual'?VERDE:'#fff', color:abaConcil==='manual'?'#fff':'#5F5E5A', cursor:'pointer' }}>
          Conciliação manual
        </button>
        <button onClick={() => setAbaConcil('inteligente')}
          style={{ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${abaConcil==='inteligente'?'#8B2FC9':'#D3D1C7'}`, background:abaConcil==='inteligente'?'#8B2FC9':'#fff', color:abaConcil==='inteligente'?'#fff':'#5F5E5A', cursor:'pointer' }}>
          ✨ Conciliação inteligente
        </button>
      </div>
      {abaConcil === 'inteligente' && <ConciliacaoInteligente />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => { setExtratoSel(null); setMovs([]) }}
          style={{ padding: '5px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>
          ← Voltar
        </button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            {extratoSel.competencia} · {extratoSel.conta?.nome}
          </div>
          <div style={{ fontSize:11, color:'#888780' }}>
            {extratoSel.data_inicio && extratoSel.data_fim
              ? `Período: ${fmtData(extratoSel.data_inicio)} a ${fmtData(extratoSel.data_fim)}`
              : ''}
            {extratoSel.importado_em ? ` · Importado em ${fmtDataHora(extratoSel.importado_em)}` : ''}
            {extratoSel.arquivo_nome ? ` · ${extratoSel.arquivo_nome}` : ''}
          </div>
        </div>
        {isRateio && <span style={s.badge('#FAEEDA', '#854F0B')}>Conta Principal — informar preponderância</span>}
        {isEmenda && <span style={s.badge('#E6F1FB', '#185FA5')}>Emenda/Edital — informar plano e dados complementares</span>}
        {totalPendentes === 0 && movs.length > 0 && <span style={s.badge('#EAF3DE', '#3B6D11')}>✓ Tudo conciliado</span>}
      </div>

      {msg && (
        <div style={{ background: '#F2FAE8', border: '0.5px solid #C0DD97', borderRadius: 10, padding: '.5rem 1rem', marginBottom: '1rem', fontSize: 12, color: '#3B6D11' }}>
          {msg}
        </div>
      )}

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total', val: movs.length, cor: AZUL },
          { label: 'Conciliados', val: totalConciliados, cor: VERDE },
          { label: 'Pendentes', val: totalPendentes, cor: totalPendentes > 0 ? '#BA7517' : VERDE },
          { label: 'Sem categoria', val: totalSemCategoria, cor: totalSemCategoria > 0 ? VERMELHO : VERDE },
          { label: 'Saldo final', val: 'R$ ' + Number(extratoSel.saldo_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), cor: VERDE },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.75rem 1rem', border: '0.5px solid #E0DDD5' }}>
            <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.6rem' }} />
            <div style={{ fontSize: 10, color: '#888780', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Progresso */}
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

      {isEmenda && planosDisponiveis.length === 0 && (
        <div style={{ background: '#FEF2F2', borderLeft: '3px solid #E8212A', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#A32D2D', marginBottom: '1rem' }}>
          <strong>Nenhum plano de trabalho cadastrado para esta conta.</strong>
        </div>
      )}

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[['todos','Todos'], ['pendentes','Pendentes'], ['conciliados','Conciliados'], ['sem_dados','Sem categoria']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)} style={s.tab(filtro === v)}>{l}</button>
            ))}
          </div>
          {totalPendentes > 0 && (
            <button onClick={conciliarTodos} style={s.btn(VERDE)}>✓ Conciliar todos ({totalPendentes})</button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>Carregando...</div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <tr>
                  <th style={s.th}>Data</th>
                  <th style={s.th}>Descrição</th>
                  <th style={s.th}>Doc</th>
                  <th style={s.th}>Categoria</th>
                  <th style={s.th}>Subcategoria</th>
                  {isRateio && <th style={s.th}>Educ%</th>}
                  {isRateio && <th style={s.th}>Social%</th>}
                  {isRateio && <th style={s.th}>Saúde%</th>}
                  {isEmenda && <th style={s.th}>Plano de trabalho</th>}
                  <th style={s.th}>Dados compl.</th>
                  <th style={s.th}>Valor</th>
                  <th style={s.th}>Situação</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {movsFiltradas.length === 0 && (
                  <tr><td colSpan={13} style={{ padding: '2rem', textAlign: 'center', color: '#888780' }}>Nenhum item.</td></tr>
                )}
                {movsFiltradas.map(m => {
                  const subcats = m.categoria_id ? subcatsDa(m.categoria_id) : []
                  const totalPrep = (parseFloat(m.prep_educacao)||0) + (parseFloat(m.prep_social)||0) + (parseFloat(m.prep_saude)||0)
                  const prepOk = !isRateio || totalPrep === 100 || totalPrep === 0
                  const temCompl = temDadosCompl(m)
                  const isAberto = complementarAberto === m.id

                  return (
                    <React.Fragment key={m.id}>
                      <tr style={{ background: m.conciliado ? '#F2FAE8' : '#fff' }}>
                        <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>

                        <td style={{ ...s.td, maxWidth: 160 }}>
                          <div onClick={() => setDescExpandida(descExpandida === m.id ? null : m.id)} style={{ cursor: 'pointer' }}>
                            {descExpandida === m.id ? (
                              <div style={{ whiteSpace: 'normal', wordBreak: 'break-all', background: '#F8F7F2', borderRadius: 6, padding: '4px 6px', fontSize: 11 }}>
                                {m.descricao}
                                <div style={{ marginTop: 4, fontSize: 10, color: VERDE }}>▲ recolher</div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{m.descricao}</span>
                                {m.descricao?.length > 20 && <span style={{ fontSize: 10, color: AZUL, flexShrink: 0 }}>▼</span>}
                              </div>
                            )}
                          </div>
                        </td>

                        <td style={s.td}>
                          <span style={{ fontSize: 10, background: '#F1EFE8', color: '#5F5E5A', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>{m.doc}</span>
                        </td>

                        <td style={{ ...s.td, minWidth: 140 }}>
                          <select value={m.categoria_id || ''} onChange={e => salvarCategoria(m.id, e.target.value)} style={s.select}>
                            <option value="">Selecione...</option>
                            {categorias.filter(c => c.tipo === (m.valor >= 0 ? 'entrada' : 'despesa')).map(c => (
                              <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                          </select>
                        </td>

                        <td style={{ ...s.td, minWidth: 120 }}>
                          {subcats.length > 0 ? (
                            <select value={m.subcategoria_id || ''} onChange={e => salvarSubcategoria(m.id, e.target.value)} style={s.select}>
                              <option value="">Selecione...</option>
                              {subcats.map(sc => <option key={sc.id} value={sc.id}>{sc.nome}</option>)}
                            </select>
                          ) : <span style={{ fontSize: 11, color: '#B4B2A9' }}>—</span>}
                        </td>

                        {isRateio && (
                          <>
                            <td style={s.td}><input type="number" min="0" max="100" value={m.prep_educacao || ''} placeholder="0" onChange={e => salvarPreponderancia(m.id, 'prep_educacao', e.target.value)} style={{ ...s.input, borderColor: !prepOk ? VERMELHO : '#D3D1C7' }} /></td>
                            <td style={s.td}><input type="number" min="0" max="100" value={m.prep_social || ''} placeholder="0" onChange={e => salvarPreponderancia(m.id, 'prep_social', e.target.value)} style={{ ...s.input, borderColor: !prepOk ? VERMELHO : '#D3D1C7' }} /></td>
                            <td style={s.td}><input type="number" min="0" max="100" value={m.prep_saude || ''} placeholder="0" onChange={e => salvarPreponderancia(m.id, 'prep_saude', e.target.value)} style={{ ...s.input, borderColor: !prepOk ? VERMELHO : '#D3D1C7' }} /></td>
                          </>
                        )}

                        {isEmenda && (
                          <td style={{ ...s.td, minWidth: 150 }}>
                            <select value={m.plano_trabalho_id || ''} onChange={e => salvarPlanoTrabalho(m.id, e.target.value)} style={{ ...s.select, borderColor: isEmenda && m.valor < 0 && !m.plano_trabalho_id ? VERMELHO : '#D3D1C7' }}>
                              <option value="">Selecione...</option>
                              {planosDisponiveis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                          </td>
                        )}

                        <td style={s.td}>
                          <div style={{ position:'relative' }}>
                            <button onClick={() => setMenuAberto(menuAberto === m.id ? null : m.id)}
                              style={{ ...s.btn(temCompl||m.fornecedor?'#EAF3DE':'#F1EFE8', temCompl||m.fornecedor?'#3B6D11':'#5F5E5A'), fontSize:10 }}>
                              {temCompl||m.fornecedor ? '✓ Ações' : '⋯ Ações'}
                            </button>
                            {menuAberto === m.id && (
                              <div style={{ position:'absolute', right:0, top:'100%', zIndex:50, background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.12)', minWidth:190, overflow:'hidden' }}>
                                <button onClick={() => { setMenuAberto(null); isAberto ? setComplementarAberto(null) : abrirComplementar(m) }}
                                  style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:11, border:'none', borderBottom:'0.5px solid #F1EFE8', background:'transparent', cursor:'pointer', color: temCompl?'#3B6D11':'#2C2C2A' }}>
                                  📋 {temCompl ? 'Dados complementares ✓' : 'Dados complementares'}
                                </button>
                                {m.valor < 0 && pessoasRecorrentes.length > 0 && (
                                  <button onClick={() => {
                                    setMenuAberto(null)
                                    if (pagFuncAberto === m.id) { setPagFuncAberto(null); return }
                                    setPagFuncAberto(m.id)
                                    setFormPagFunc({ pessoa_id:'', competencia: m.data?.slice(0,7)||'', valor_mensal:'', valor_abatimento:'' })
                                  }} style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:11, border:'none', background:'transparent', cursor:'pointer', color:'#8B2FC9' }}>
                                  👤 Pagamento de funcionário
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

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

                      {isAberto && (
                        <tr>
                          <td colSpan={13} style={{ padding: 0, borderBottom: '0.5px solid #E0DDD5' }}>
                            <div style={{ background: '#F8F7F2', padding: '12px 16px', borderLeft: `3px solid ${AZUL}` }}>
                              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: AZUL }}>
                                Dados complementares — {m.descricao?.slice(0,50)}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
                                <div>
                                  <label style={s.label}>Fornecedor cadastrado</label>
                                  <select value={formCompl.fornecedor_id||''} onChange={e => {
                                    const f = fornecedores.find(f => String(f.id) === e.target.value)
                                    setFormCompl(fc => ({ ...fc, fornecedor_id: e.target.value, fornecedor: f?.nome||fc.fornecedor, cpf_cnpj: f?.cpf_cnpj||fc.cpf_cnpj }))
                                  }} style={s.inputCompl}>
                                    <option value="">Selecione ou preencha abaixo</option>
                                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}{f.cpf_cnpj?` — ${f.cpf_cnpj}`:''}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={s.label}>Fornecedor / Pagador (texto)</label>
                                  <input value={formCompl.fornecedor||''} onChange={e=>setFormCompl(f=>({...f,fornecedor:e.target.value}))} placeholder="Nome" style={s.inputCompl} />
                                </div>
                                <div>
                                  <label style={s.label}>CPF / CNPJ</label>
                                  <input value={formCompl.cpf_cnpj||''} onChange={e=>setFormCompl(f=>({...f,cpf_cnpj:e.target.value}))} placeholder="000.000.000-00" style={s.inputCompl} />
                                </div>
                                <div>
                                  <label style={s.label}>Nº Nota / Recibo</label>
                                  <input value={formCompl.num_nota||''} onChange={e=>setFormCompl(f=>({...f,num_nota:e.target.value}))} placeholder="NF 123" style={s.inputCompl} />
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                                <div>
                                  <label style={s.label}>Data do documento</label>
                                  <input type="date" value={formCompl.data_documento||''} onChange={e=>setFormCompl(f=>({...f,data_documento:e.target.value}))} style={s.inputCompl} />
                                </div>
                                <div>
                                  <label style={s.label}>Local do comprovante</label>
                                  <input value={formCompl.local_comprovante||''} onChange={e=>setFormCompl(f=>({...f,local_comprovante:e.target.value}))} placeholder="Ex: Drive > Emendas 2026" style={s.inputCompl} />
                                </div>
                                <div>
                                  <label style={s.label}>Link externo</label>
                                  <input value={formCompl.link_externo||''} onChange={e=>setFormCompl(f=>({...f,link_externo:e.target.value}))} placeholder="https://..." style={s.inputCompl} />
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
                                {m.valor >= 0 && (
                                  <div>
                                    <label style={s.label}>Tipo de receita</label>
                                    <select value={formCompl.tipo_receita||''} onChange={e=>setFormCompl(f=>({...f,tipo_receita:e.target.value}))} style={s.inputCompl}>
                                      <option value="">Selecione...</option>
                                      {TIPOS_RECEITA.map(t=><option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </div>
                                )}
                                <div>
                                  <label style={s.label}>Evento vinculado</label>
                                  <select value={formCompl.evento_id||''} onChange={e=>setFormCompl(f=>({...f,evento_id:e.target.value}))} style={s.inputCompl}>
                                    <option value="">Nenhum</option>
                                    {eventos.map(ev=><option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={s.label}>Campanha vinculada</label>
                                  <select value={formCompl.campanha_id||''} onChange={e=>setFormCompl(f=>({...f,campanha_id:e.target.value}))} style={s.inputCompl}>
                                    <option value="">Nenhuma</option>
                                    {campanhas.map(cp=><option key={cp.id} value={cp.id}>{cp.nome}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 16 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={formCompl.bem_permanente||false} onChange={e=>setFormCompl(f=>({...f,bem_permanente:e.target.checked}))} />
                                    Bem permanente
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={formCompl.despesa_rateada||false} onChange={e=>setFormCompl(f=>({...f,despesa_rateada:e.target.checked}))} />
                                    Rateada
                                  </label>
                                </div>
                              </div>

                              {formCompl.bem_permanente && (
                                <div style={{ marginBottom: 8 }}>
                                  <label style={s.label}>Local de guarda / uso do bem</label>
                                  <input value={formCompl.local_guarda_bem||''} onChange={e=>setFormCompl(f=>({...f,local_guarda_bem:e.target.value}))} placeholder="Ex: Sala da diretoria" style={s.inputCompl} />
                                </div>
                              )}

                              {formCompl.despesa_rateada && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 8, marginBottom: 8 }}>
                                  <div>
                                    <label style={s.label}>% pago com este recurso</label>
                                    <input type="number" min="0" max="100" value={formCompl.percentual_rateio||''} onChange={e=>setFormCompl(f=>({...f,percentual_rateio:e.target.value}))} placeholder="50" style={s.inputCompl} />
                                  </div>
                                  <div>
                                    <label style={s.label}>Fonte do restante</label>
                                    <input value={formCompl.fonte_restante||''} onChange={e=>setFormCompl(f=>({...f,fonte_restante:e.target.value}))} placeholder="Recursos próprios" style={s.inputCompl} />
                                  </div>
                                  <div>
                                    <label style={s.label}>Justificativa do rateio</label>
                                    <input value={formCompl.justificativa_rateio||''} onChange={e=>setFormCompl(f=>({...f,justificativa_rateio:e.target.value}))} placeholder="Motivo" style={s.inputCompl} />
                                  </div>
                                </div>
                              )}

                              <div style={{ marginBottom: 10 }}>
                                <label style={s.label}>Observações de prestação de contas</label>
                                <input value={formCompl.obs_prestacao||''} onChange={e=>setFormCompl(f=>({...f,obs_prestacao:e.target.value}))} placeholder="Observações para o relatório de prestação de contas" style={s.inputCompl} />
                              </div>

                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => salvarComplementar(m.id)} style={s.btn(AZUL)}>Salvar dados complementares</button>
                                <button onClick={() => { setComplementarAberto(null); setFormCompl({}) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {pagFuncAberto === m.id && (
                        <tr>
                          <td colSpan={13} style={{ padding:0, borderBottom:'0.5px solid #E0DDD5' }}>
                            <div style={{ background:'#F5F0FF', padding:'12px 16px', borderLeft:`3px solid #8B2FC9` }}>
                              <div style={{ fontSize:12, fontWeight:500, marginBottom:10, color:'#8B2FC9' }}>
                                👤 Pagamento de funcionário / prestador — {m.descricao?.slice(0,40)}
                              </div>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                                <div>
                                  <label style={s.label}>Pessoa *</label>
                                  <select value={formPagFunc.pessoa_id||''} onChange={e => {
                                    const pe = pessoasRecorrentes.find(p => String(p.id) === e.target.value)
                                    setFormPagFunc(f => ({ ...f, pessoa_id: e.target.value, valor_mensal: pe?.valor_mensal_normal||f.valor_mensal }))
                                  }} style={s.inputCompl}>
                                    <option value="">Selecione...</option>
                                    {pessoasRecorrentes.map(pe => <option key={pe.id} value={pe.id}>{pe.nome} — Mensal: R$ {Number(pe.valor_mensal_normal||0).toFixed(2)}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={s.label}>Competência (mês de referência) *</label>
                                  <input type="month" value={formPagFunc.competencia||''} onChange={e=>setFormPagFunc(f=>({...f,competencia:e.target.value}))} style={s.inputCompl} />
                                </div>
                              </div>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                                <div>
                                  <label style={s.label}>Valor referente ao mensal normal (R$)</label>
                                  <input type="number" step="0.01" value={formPagFunc.valor_mensal||''} onChange={e=>setFormPagFunc(f=>({...f,valor_mensal:e.target.value}))} style={s.inputCompl} />
                                </div>
                                <div>
                                  <label style={s.label}>Valor para abater dívida antiga (R$)</label>
                                  <input type="number" step="0.01" value={formPagFunc.valor_abatimento||''} onChange={e=>setFormPagFunc(f=>({...f,valor_abatimento:e.target.value}))} style={s.inputCompl} />
                                </div>
                              </div>
                              {(() => {
                                const totalMov = Math.abs(Number(m.valor))
                                const soma = (parseFloat(formPagFunc.valor_mensal)||0) + (parseFloat(formPagFunc.valor_abatimento)||0)
                                const diff = Math.abs(soma - totalMov)
                                const ok = diff < 0.01
                                return (
                                  <div style={{ fontSize:11, padding:'6px 10px', borderRadius:6, marginBottom:10, background:ok?'#EAF3DE':'#FEF2F2', color:ok?'#3B6D11':'#A32D2D' }}>
                                    Valor do extrato: <strong>R$ {totalMov.toFixed(2)}</strong> · Classificado: <strong>R$ {soma.toFixed(2)}</strong>
                                    {ok ? ' ✓ OK' : ` · Faltam R$ ${diff.toFixed(2)}`}
                                  </div>
                                )
                              })()}
                              <div style={{ display:'flex', gap:8 }}>
                                <button onClick={() => salvarPagamentoFuncionario(m.id, m)} style={s.btn('#8B2FC9')}>✅ Registrar pagamento</button>
                                <button onClick={() => { setPagFuncAberto(null); setFormPagFunc({}) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
