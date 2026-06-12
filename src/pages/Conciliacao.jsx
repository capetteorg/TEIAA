import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'
import { auditar } from '../lib/auditoria'
import { useNavigate } from 'react-router-dom'
import { confirmar } from '../lib/ui'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F', ROXO = '#8B2FC9'
const TIPOS_RECEITA = ['Repasse da emenda', 'Rendimento de aplicação', 'Estorno', 'Devolução recebida', 'Outra entrada']

function diffDias(d1, d2) {
  return Math.abs((new Date(d1+'T12:00:00') - new Date(d2+'T12:00:00')) / (1000*60*60*24))
}
function similaridade(s1, s2) {
  if (!s1||!s2) return 0
  const a=s1.toLowerCase(), b=s2.toLowerCase()
  if (a.includes(b)||b.includes(a)) return 0.8
  const p1=a.split(/\s+/), p2=b.split(/\s+/)
  const comuns = p1.filter(p=>p.length>3&&p2.some(q=>q.includes(p)||p.includes(q)))
  return comuns.length/Math.max(p1.length,p2.length)
}

export default function Conciliacao() {
  const navigate = useNavigate()
  const [extratos, setExtratos] = useState([])
  const [extratoSel, setExtratoSel] = useState(null)
  const [movs, setMovs] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [planos, setPlanos] = useState([])
  const [eventos, setEventos] = useState([])
  const [campanhas, setCampanhas] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [pessoasRecorrentes, setPessoasRecorrentes] = useState([])
  const [movsDivida, setMovsDivida] = useState({})
  const [matchMap, setMatchMap] = useState({}) // movId -> lancamento matched
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [cruzando, setCruzando] = useState(false)
  const [msg, setMsg] = useState('')
  const [descExpandida, setDescExpandida] = useState(null)
  const [complementarAberto, setComplementarAberto] = useState(null)
  const [formCompl, setFormCompl] = useState({})
  const [menuAberto, setMenuAberto] = useState(null)
  const [pagFuncAberto, setPagFuncAberto] = useState(null)
  const [formPagFunc, setFormPagFunc] = useState({})
  const [lancVinculadoAberto, setLancVinculadoAberto] = useState(null)

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
    const [extRes, progRes] = await Promise.all([
      supabase.from('extratos').select('*, conta:contas(id,nome,banco,preponderancia,tipo_conta)').order('importado_em', { ascending: false }),
      supabase.from('extrato_progresso').select('*'),
    ])
    const ext = extRes.data || []
    const progMapa = {}
    ;(progRes.data || []).forEach(p => { progMapa[p.extrato_id] = { total: p.total, conciliados: p.conciliados } })
    setExtratos(ext.map(e => ({ ...e, _stats: progMapa[e.id] || { total: e.total_movs, conciliados: 0 } })))
  }

  async function abrirExtrato(ext) {
    setLoading(true)
    setExtratoSel(ext)
    setMatchMap({})
    const { data } = await fetchAll(() => supabase.from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), subcategoria:subcategorias(nome)')
      .eq('extrato_id', ext.id).order('data'))
    setMovs(data || [])

    // Buscar lançamentos da conta para cruzamento
    const { data: lancs } = await fetchAll(() => supabase.from('lancamentos')
      .select('*, categoria:categorias(nome,tipo)')
      .eq('conta_id', ext.conta?.id).order('data'))
    setLancamentos(lancs || [])

    // Buscar movimentações de dívida
    const ids = (data||[]).map(m => m.id)
    if (ids.length > 0) {
      const { data: divMovs } = await fetchAll(() => supabase.from('divida_movimentacoes')
        .select('*, pessoa:pessoas_recorrentes(id,nome,valor_mensal_normal)')
        .in('extrato_mov_id', ids))
      const mapa = {}
      ;(divMovs||[]).forEach(dm => {
        if (!mapa[dm.extrato_mov_id]) mapa[dm.extrato_mov_id] = { pessoa: dm.pessoa, competencia: dm.competencia, abatimento:0, mensal_nao_pago:0 }
        if (dm.tipo==='abatimento') mapa[dm.extrato_mov_id].abatimento += Number(dm.valor)
        if (dm.tipo==='acrescimo') mapa[dm.extrato_mov_id].mensal_nao_pago += Number(dm.valor)
      })
      for (const movId of Object.keys(mapa)) {
        const info = mapa[movId]
        if (info.pessoa && info.competencia) {
          const { data: comp } = await supabase.from('competencias_mensais')
            .select('valor_pago_mensal').eq('pessoa_id', info.pessoa.id).eq('competencia', info.competencia).single()
          info.valor_pago_mensal = Number(comp?.valor_pago_mensal||0)
        }
      }
      setMovsDivida(mapa)
    } else setMovsDivida({})
    setLoading(false)
  }

  // Cruzamento automático
  function cruzarAutomatico() {
    setCruzando(true)
    const usados = new Set()
    const novoMap = {}
    for (const mov of movs) {
      if (mov.conciliado || mov.lancamento_id) continue // já conciliado, pula
      const tipoMov = mov.valor >= 0 ? 'entrada' : 'despesa'
      const candidatos = lancamentos.filter(l => {
        if (usados.has(l.id)) return false
        if (l.extrato_mov_id) return false // já vinculado
        if (l.tipo !== tipoMov) return false
        const diff = Math.abs(Number(l.valor) - Math.abs(Number(mov.valor)))
        return diff / Math.abs(Number(mov.valor)) <= 0.01
      })
      if (!candidatos.length) continue
      const pontuados = candidatos.map(l => {
        let score = 0
        const dias = diffDias(mov.data, l.data)
        if (dias===0) score+=50; else if (dias<=1) score+=40; else if (dias<=3) score+=25; else if (dias<=7) score+=10; else score-=10
        const sim = similaridade(mov.descricao, l.descricao)
        score += sim * 40
        if (l.fornecedor && mov.descricao?.toLowerCase().includes(l.fornecedor.toLowerCase())) score += 20
        return { l, score, dias }
      }).sort((a,b) => b.score-a.score)
      const melhor = pontuados[0]
      if (melhor.score >= 70) {
        novoMap[mov.id] = { lancamento: melhor.l, score: melhor.score, auto: true }
        usados.add(melhor.l.id)
      } else if (melhor.score >= 40) {
        novoMap[mov.id] = { lancamento: melhor.l, score: melhor.score, auto: false }
        usados.add(melhor.l.id)
      }
    }
    setMatchMap(novoMap)
    setCruzando(false)
    const auto = Object.values(novoMap).filter(v=>v.auto).length
    const possivel = Object.values(novoMap).filter(v=>!v.auto).length
    setMsg(`Cruzamento concluído! ${auto} automáticos, ${possivel} possíveis. Confirme abaixo.`)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function confirmarMatch(movId) {
    const match = matchMap[movId]
    if (!match) return
    const mov = movs.find(m => m.id === movId)
    const upd = { conciliado: true, status_mov: 'conciliado', lancamento_id: match.lancamento.id }
    if (!mov.categoria_id && match.lancamento.categoria_id) upd.categoria_id = match.lancamento.categoria_id
    if (!mov.subcategoria_id && match.lancamento.subcategoria_id) upd.subcategoria_id = match.lancamento.subcategoria_id
    if (!mov.fornecedor_id && match.lancamento.fornecedor_id) upd.fornecedor_id = match.lancamento.fornecedor_id
    if (!mov.fornecedor && match.lancamento.fornecedor) upd.fornecedor = match.lancamento.fornecedor
    await supabase.from('extrato_movs').update(upd).eq('id', movId)
    await supabase.from('lancamentos').update({ status_lanc:'conciliado', extrato_mov_id: movId }).eq('id', match.lancamento.id)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, ...upd, categoria: categorias.find(c=>String(c.id)===String(upd.categoria_id||m.categoria_id)) } : m))
    setMatchMap(prev => { const n={...prev}; delete n[movId]; return n })
    setMsg('Conciliado!')
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function rejeitarMatch(movId) {
    setMatchMap(prev => { const n={...prev}; delete n[movId]; return n })
  }

  async function confirmarTodosAuto() {
    const autoIds = Object.entries(matchMap).filter(([,v])=>v.auto).map(([k])=>parseInt(k))
    for (const movId of autoIds) await confirmarMatch(movId)
    setMsg(`${autoIds.length} conciliações automáticas confirmadas!`)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function salvarCategoria(movId, catId) {
    await supabase.from('extrato_movs').update({ categoria_id: catId?parseInt(catId):null, subcategoria_id:null }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, categoria_id:catId, subcategoria_id:null, subcategoria:null, categoria:categorias.find(c=>String(c.id)===String(catId)) } : m))
  }

  async function salvarSubcategoria(movId, subId) {
    await supabase.from('extrato_movs').update({ subcategoria_id: subId?parseInt(subId):null }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, subcategoria_id:subId } : m))
  }

  async function salvarPreponderancia(movId, campo, valor) {
    await supabase.from('extrato_movs').update({ [campo]: parseFloat(valor)||0 }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, [campo]:valor } : m))
  }

  async function salvarPlanoTrabalho(movId, planoId) {
    await supabase.from('extrato_movs').update({ plano_trabalho_id: planoId?parseInt(planoId):null }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, plano_trabalho_id:planoId } : m))
  }

  async function conciliarMov(movId, valor) {
    await supabase.from('extrato_movs').update({ conciliado: valor }).eq('id', movId)
    const mov = movs.find(m => m.id===movId)
    if (mov?.lancamento_id) await supabase.from('lancamentos').update({ status_lanc: valor?'conciliado':'lancado' }).eq('id', mov.lancamento_id)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, conciliado:valor } : m))
  }

  async function conciliarTodos() {
    const ids = movsFiltradas.filter(m=>!m.conciliado).map(m=>m.id)
    await supabase.from('extrato_movs').update({ conciliado:true }).in('id', ids)
    const lancIds = movsFiltradas.filter(m=>!m.conciliado&&m.lancamento_id).map(m=>m.lancamento_id)
    if (lancIds.length>0) await supabase.from('lancamentos').update({ status_lanc:'conciliado' }).in('id', lancIds)
    setMovs(prev => prev.map(m => ids.includes(m.id) ? { ...m, conciliado:true } : m))
    setMsg('Tudo conciliado! ')
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function salvarComplementar(movId) {
    const dados = { ...formCompl }
    if (dados.evento_id) dados.evento_id = parseInt(dados.evento_id)
    if (dados.campanha_id) dados.campanha_id = parseInt(dados.campanha_id)
    if (dados.fornecedor_id) dados.fornecedor_id = parseInt(dados.fornecedor_id)
    if (dados.percentual_rateio) dados.percentual_rateio = parseFloat(dados.percentual_rateio)
    if (!dados.data_documento) delete dados.data_documento
    await supabase.from('extrato_movs').update(dados).eq('id', movId)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, ...dados } : m))
    setComplementarAberto(null)
    setFormCompl({})
    setMsg('Dados complementares salvos! ')
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  function abrirComplementar(m) {
    setComplementarAberto(m.id)
    setFormCompl({
      fornecedor_id: m.fornecedor_id||'', fornecedor: m.fornecedor||'', cpf_cnpj: m.cpf_cnpj||'',
      num_nota: m.num_nota||'', data_documento: m.data_documento||'', descricao_produto: m.descricao_produto||'',
      local_comprovante: m.local_comprovante||'', link_externo: m.link_externo||'',
      bem_permanente: m.bem_permanente||false, local_guarda_bem: m.local_guarda_bem||'',
      despesa_rateada: m.despesa_rateada||false, percentual_rateio: m.percentual_rateio||'',
      fonte_restante: m.fonte_restante||'', justificativa_rateio: m.justificativa_rateio||'',
      obs_prestacao: m.obs_prestacao||'', tipo_receita: m.tipo_receita||'',
      evento_id: m.evento_id||'', campanha_id: m.campanha_id||'',
    })
  }

  async function salvarPagamentoFuncionario(movId, mov) {
    const { pessoa_id, competencia, valor_mensal, valor_abatimento } = formPagFunc
    if (!pessoa_id||!competencia) { alert('Selecione a pessoa e a competência.'); return }
    const pessoa = pessoasRecorrentes.find(p => String(p.id)===String(pessoa_id))
    const valMensal = parseFloat(valor_mensal)||0
    const valAbat = parseFloat(valor_abatimento)||0
    const totalMov = Math.abs(Number(mov.valor))
    if (valMensal+valAbat > totalMov+0.01) { alert(`Mensal + Abatimento não pode exceder R$ ${totalMov.toFixed(2)}`); return }
    const valorMensalDevido = Number(pessoa?.valor_mensal_normal||0)
    const { data: compExiste } = await supabase.from('competencias_mensais').select('*').eq('pessoa_id', parseInt(pessoa_id)).eq('competencia', competencia).single()
    const jaPageMensal = Number(compExiste?.valor_pago_mensal||0)
    const jaAbateu = Number(compExiste?.valor_abatido_divida||0)
    const totalPagoMensal = jaPageMensal+valMensal
    const totalAbatido = jaAbateu+valAbat
    const valorNaoPago = Math.max(0, valorMensalDevido-totalPagoMensal)
    const { data: todasMovs } = await fetchAll(() => supabase.from('divida_movimentacoes').select('tipo,valor,competencia').eq('pessoa_id', parseInt(pessoa_id)))
    const saldoBase = (todasMovs||[]).reduce((acc,m) => {
      if (m.competencia===competencia&&m.tipo==='acrescimo') return acc
      if (m.tipo==='divida_inicial'||m.tipo==='acrescimo') return acc+Number(m.valor)
      if (m.tipo==='abatimento') return acc-Number(m.valor)
      return acc
    }, 0)
    if (compExiste) {
      await supabase.from('competencias_mensais').update({
        valor_pago_mensal: totalPagoMensal, valor_nao_pago: valorNaoPago, valor_abatido_divida: totalAbatido,
        saldo_divida_inicio: Math.max(0,saldoBase), saldo_divida_fim: Math.max(0,saldoBase+valorNaoPago-totalAbatido),
        extrato_mov_id: movId, status: valorNaoPago===0?'pago':'parcial',
      }).eq('id', compExiste.id)
    }
    await supabase.from('divida_movimentacoes').delete().eq('pessoa_id', parseInt(pessoa_id)).eq('competencia', competencia).eq('tipo', 'acrescimo')
    if (valAbat>0) await supabase.from('divida_movimentacoes').insert({ pessoa_id:parseInt(pessoa_id), tipo:'abatimento', valor:valAbat, data_movimentacao:mov.data, competencia, descricao:`Abatimento de dívida — ${competencia}`, extrato_mov_id:movId })
    if (valorNaoPago>0) await supabase.from('divida_movimentacoes').insert({ pessoa_id:parseInt(pessoa_id), tipo:'acrescimo', valor:valorNaoPago, data_movimentacao:mov.data, competencia, descricao:`${competencia} — pago R$ ${totalPagoMensal.toFixed(2)} de R$ ${valorMensalDevido.toFixed(2)}`, extrato_mov_id:movId })
    await supabase.from('extrato_movs').update({ fornecedor:pessoa?.nome, obs_prestacao:`Pgto ${competencia} — mensal: R$${valMensal.toFixed(2)}${valAbat>0?`, abat: R$${valAbat.toFixed(2)}`:''}${valorNaoPago>0?` (faltam R$${valorNaoPago.toFixed(2)})`:''}` }).eq('id', movId)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, fornecedor:pessoa?.nome } : m))
    setPagFuncAberto(null); setFormPagFunc({})
    setMsg(valorNaoPago===0 ? `${pessoa?.nome} — ${competencia} quitado!` : `${pessoa?.nome} — R$ ${totalPagoMensal.toFixed(2)} pagos. Faltam R$ ${valorNaoPago.toFixed(2)}.`)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  const [dividirAberto, setDividirAberto] = useState(null)
  const [partesDivisao, setPartesDivisao] = useState([])

  function abrirDivisao(m) {
    setDividirAberto(m.id)
    const metade = Math.round(Math.abs(Number(m.valor)) / 2 * 100) / 100
    setPartesDivisao([
      { valor: metade, categoria_id: m.categoria_id || '', descricao: '', lancamento_id: '' },
      { valor: Math.abs(Number(m.valor)) - metade, categoria_id: '', descricao: '', lancamento_id: '' },
    ])
  }

  async function confirmarDivisao(m) {
    const total = partesDivisao.reduce((a, p) => a + (parseFloat(p.valor) || 0), 0)
    const original = Math.abs(Number(m.valor))
    const diff = total - original
    if (Math.abs(diff) > 0.01) {
      // REGRA: a soma das partes DEVE fechar exatamente com o extrato — divergência distorce os relatórios
      const ok = await confirmar(
        `A soma das partes (R$ ${total.toFixed(2)}) difere do valor original do extrato (R$ ${original.toFixed(2)}) em R$ ${Math.abs(diff).toFixed(2)}.\n\nA divisão só pode ser salva quando a soma fecha EXATAMENTE — caso contrário os relatórios deixam de bater com o banco.\n\nDeseja ajustar a última parte automaticamente para fechar a diferença?`,
        { titulo:'Soma não fecha com o extrato', confirmarLabel:'Ajustar última parte', perigo:false }
      )
      if (!ok) return
      const partes = [...partesDivisao]
      const ult = partes.length - 1
      const novoValor = Math.round((parseFloat(partes[ult].valor || 0) - diff) * 100) / 100
      if (novoValor <= 0) {
        setMsg('Erro: o ajuste deixaria a última parte com valor zero ou negativo. Revise os valores manualmente.')
        setTimeout(() => setMsg(x => x && x.includes('Erro') ? x : ''), 4000)
        return
      }
      partes[ult] = { ...partes[ult], valor: novoValor }
      setPartesDivisao(partes)
      setMsg(`Última parte ajustada para R$ ${novoValor.toFixed(2)}. Confira os valores e confirme novamente.`)
      setTimeout(() => setMsg(x => x && x.includes('Erro') ? x : ''), 6000)
      return
    }
    if (partesDivisao.some(p => !p.categoria_id)) {
      setMsg('Todas as partes precisam ter categoria.')
      setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
      return
    }
    await supabase.from('extrato_movs').update({ dividida: true, conciliado: true }).eq('id', m.id)
    const sinal = Number(m.valor) >= 0 ? 1 : -1
    for (const parte of partesDivisao) {
      const { data: novaMov } = await supabase.from('extrato_movs').insert({
        extrato_id: m.extrato_id,
        data: m.data,
        descricao: parte.descricao || m.descricao,
        doc: m.doc,
        valor: sinal * Math.abs(parseFloat(parte.valor)),
        tipo: m.tipo,
        categoria_id: parseInt(parte.categoria_id),
        subcategoria_id: parte.subcategoria_id ? parseInt(parte.subcategoria_id) : null,
        parent_id: m.id,
        conciliado: true,
      }).select().single()
      // Vincular lançamento se selecionado
      if (parte.lancamento_id && novaMov) {
        await supabase.from('lancamentos').update({
          status_lanc: 'conciliado',
          extrato_mov_id: novaMov.id,
        }).eq('id', parte.lancamento_id)
      }
    }
    setDividirAberto(null)
    const { data } = await fetchAll(() => supabase.from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), subcategoria:subcategorias(nome)')
      .eq('extrato_id', extratoSel.id).order('data'))
    setMovs(data || [])
    setMsg('Movimentação dividida com sucesso!')
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function desfazerDivisao(pai) {
    // Trava: exercícios anteriores a 2026 estão fechados e conciliados — não podem ser alterados
    if (pai.data < '2026-01-01') {
      setMsg('Erro: movimentações de exercícios anteriores a 2026 estão fechadas e não podem ser alteradas.')
      setTimeout(() => setMsg(x => x && x.includes('Erro') ? x : ''), 5000)
      return
    }
    const filhas = movs.filter(f => f.parent_id === pai.id)
    const ok = await confirmar(
      `Desfazer a divisão de "${pai.descricao}" (${fmt(Math.abs(Number(pai.valor)))})?\n\nAs ${filhas.length} partes serão excluídas e a movimentação original voltará como não conciliada, para você refazer a divisão corretamente.`,
      { titulo:'Desfazer divisão', confirmarLabel:'Desfazer' }
    )
    if (!ok) return
    const idsFilhas = filhas.map(f => f.id)
    // Desvincular lançamentos apontando para as partes
    if (idsFilhas.length > 0) {
      await supabase.from('lancamentos').update({ extrato_mov_id: null, status_lanc: 'aberto' }).in('extrato_mov_id', idsFilhas)
      const { error: errDel } = await supabase.from('extrato_movs').delete().in('id', idsFilhas)
      if (errDel) { setMsg('Erro ao excluir partes: ' + errDel.message); return }
    }
    await supabase.from('extrato_movs').update({ dividida: false, conciliado: false }).eq('id', pai.id)
    auditar('Divisão desfeita (divergência)', `${pai.descricao} — ${fmt(Math.abs(Number(pai.valor)))}`)
    const { data } = await fetchAll(() => supabase.from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), subcategoria:subcategorias(nome)')
      .eq('extrato_id', extratoSel.id).order('data'))
    setMovs(data || [])
    setMsg('Divisão desfeita. Refaça a divisão com os valores corretos.')
    setTimeout(() => setMsg(x => x && x.includes('Erro') ? x : ''), 5000)
  }

  const [vincularAberto, setVincularAberto] = useState(null)

  async function vincularLancamento(movId, lancId) {
    const mov = movs.find(m => m.id === movId)
    const lanc = lancamentos.find(l => l.id === lancId)
    if (!mov || !lanc) return
    const upd = { lancamento_id: lancId }
    if (!mov.categoria_id && lanc.categoria_id) upd.categoria_id = lanc.categoria_id
    if (!mov.subcategoria_id && lanc.subcategoria_id) upd.subcategoria_id = lanc.subcategoria_id
    if (!mov.fornecedor_id && lanc.fornecedor_id) upd.fornecedor_id = lanc.fornecedor_id
    if (!mov.fornecedor && lanc.fornecedor) upd.fornecedor = lanc.fornecedor
    await supabase.from('extrato_movs').update(upd).eq('id', movId)
    await supabase.from('lancamentos').update({ extrato_mov_id: movId }).eq('id', lancId)
    setMovs(prev => prev.map(m => m.id===movId ? { ...m, ...upd, categoria: categorias.find(c=>String(c.id)===String(upd.categoria_id||m.categoria_id)) } : m))
    setLancamentos(prev => prev.map(l => l.id===lancId ? { ...l, extrato_mov_id: movId } : l))
    setVincularAberto(null)
    setMsg('Lançamento vinculado!')
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  function temDadosCompl(m) {
    return !!(m.fornecedor_id||m.num_nota||m.data_documento||m.descricao_produto||m.local_comprovante||m.link_externo||m.bem_permanente||m.despesa_rateada||m.obs_prestacao||m.tipo_receita||m.evento_id||m.campanha_id)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2})
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtDataHora = d => d ? new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'
  const subcatsDa = catId => subcategorias.filter(s => String(s.categoria_id)===String(catId))
  const planosDaConta = contaId => planos.filter(p => String(p.conta_id)===String(contaId))

  const isRateio = extratoSel?.conta?.preponderancia === 'mista'
  const isEmenda = extratoSel?.conta?.tipo_conta === 'emenda' || extratoSel?.conta?.tipo_conta === 'convenio'
  const planosDisponiveis = extratoSel ? planosDaConta(extratoSel.conta?.id) : []

  const movsFiltradas = movs.filter(m => {
    if (m.dividida) return false // esconde originais divididas
    if (m.parent_id) return true // sempre mostra partes
    if (filtro==='pendentes') return !m.conciliado
    if (filtro==='conciliados') return m.conciliado
    if (filtro==='sem_dados') return !m.categoria_id
    return true
  })

  const totalConciliados = movs.filter(m=>m.conciliado && !m.dividida).length
  const totalPendentes = movs.filter(m=>!m.conciliado && !m.dividida).length
  const autoCount = Object.values(matchMap).filter(v=>v.auto).length
  const possivelCount = Object.values(matchMap).filter(v=>!v.auto).length

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 8px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', whiteSpace:'nowrap' },
    td: { padding:'7px 8px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 7px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'5px 10px', fontSize:11, borderRadius:7, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    select: { fontSize:11, padding:'4px 6px', border:'0.5px solid #D3D1C7', borderRadius:6, width:'100%' },
    input: { fontSize:11, padding:'4px 6px', border:'0.5px solid #D3D1C7', borderRadius:6, width:60 },
    inputCompl: { fontSize:12, padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, width:'100%', boxSizing:'border-box' },
    label: { fontSize:11, color:'#5F5E5A', display:'block', marginBottom:3 },
  }

  // ===== TELA DE LISTA DE EXTRATOS =====
  if (!extratoSel) return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <div style={{ fontSize:19, fontWeight:600, letterSpacing:'-0.02em' }}>Conciliação bancária</div>
          <div style={{ fontSize:12, color:'#888780' }}>Selecione um extrato para conciliar</div>
        </div>
        <button onClick={() => navigate('/importar')} style={s.btn(AZUL)}>↑ Importar extrato</button>
      </div>
      {extratos.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
          <div style={{ marginBottom:8 }}><i className="ti ti-file" style={{fontSize:32, color:'#C8C6BC'}} /></div>
          <div style={{ fontSize:13 }}>Nenhum extrato importado ainda.</div>
          <button onClick={() => navigate('/importar')} style={{ ...s.btn(AZUL), marginTop:12 }}>Importar primeiro extrato →</button>
        </div>
      ) : (
        <div style={s.card}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr>{['Competência','Período','Conta','Progresso','Saldo final','Importado em','Arquivo',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {extratos.map(e => {
                const stats = e._stats || { total:e.total_movs, conciliados:0 }
                const fechado = stats.total>0 && stats.conciliados===stats.total
                const pct = stats.total>0 ? Math.round(stats.conciliados/stats.total*100) : 0
                return (
                  <tr key={e.id} style={{ cursor:'pointer', background:fechado?'#F8F7F2':'#fff' }} onClick={() => abrirExtrato(e)}>
                    <td style={s.td}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {fechado && <span><i className="ti ti-lock" style={{fontSize:14}} /></span>}
                        <strong style={{ color:fechado?'#888780':'#2C2C2A' }}>{e.competencia}</strong>
                      </div>
                    </td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{e.data_inicio&&e.data_fim ? `${fmtData(e.data_inicio)} a ${fmtData(e.data_fim)}` : '—'}</td>
                    <td style={s.td}>{e.conta?.nome||'—'}</td>
                    <td style={s.td}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:60, height:6, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:pct+'%', background:fechado?VERDE:AZUL, borderRadius:99 }} />
                        </div>
                        <span style={s.badge(fechado?'#EAF3DE':'#E6F1FB', fechado?'#3B6D11':'#185FA5')}>
                          {fechado?'✓ ':''}{stats.conciliados}/{stats.total}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...s.td, color:VERDE, fontWeight:500 }}>{fmt(e.saldo_final||0)}</td>
                    <td style={{ ...s.td, color:'#888780', fontSize:11 }}>{fmtDataHora(e.importado_em)}</td>
                    <td style={{ ...s.td, fontSize:10, color:'#888780', fontFamily:'monospace' }}>{e.arquivo_nome||'—'}</td>
                    <td style={s.td}>
                      <button onClick={ev=>{ev.stopPropagation();abrirExtrato(e)}} style={s.btn(fechado?'#F1EFE8':VERDE, fechado?'#5F5E5A':'#fff')}>
                        {fechado?'Ver':'Abrir →'}
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
  )

  // ===== TELA DO EXTRATO =====
  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => { setExtratoSel(null); setMovs([]); setMatchMap({}) }} style={s.btn('#F1EFE8','#5F5E5A')}>← Voltar</button>
          <div>
            <span style={{ fontWeight:500, fontSize:13 }}>{extratoSel.competencia} · {extratoSel.conta?.nome}</span>
            <span style={{ fontSize:11, color:'#888780', marginLeft:8 }}>Período: {fmtData(extratoSel.data_inicio)} a {fmtData(extratoSel.data_fim)}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={cruzarAutomatico} disabled={cruzando} style={s.btn('#0E7EA8')}>
            {cruzando ? 'Cruzando...' : 'Cruzar com lançamentos'}
          </button>
          {autoCount>0 && (
            <button onClick={confirmarTodosAuto} style={s.btn('#0E7EA8')}>
              <i className="ti ti-check" style={{marginRight:4}} /> Confirmar {autoCount} automáticos
            </button>
          )}
          {totalPendentes>0 && <button onClick={conciliarTodos} style={s.btn('#EAF3DE','#3B6D11')}><i className="ti ti-check" style={{marginRight:4}} /> Conciliar todos ({totalPendentes})</button>}
        </div>
      </div>

      {/* Verificador de integridade das divisões */}
      {(() => {
        // Exercícios anteriores a 2026 estão fechados e conferidos — não tocar
        const LIMITE_CONGELADO = '2026-01-01'
        const divergentes = movs.filter(p => p.dividida && p.data >= LIMITE_CONGELADO).map(p => {
          const filhas = movs.filter(f => f.parent_id === p.id)
          const soma = filhas.reduce((a, f) => a + Number(f.valor), 0)
          return { pai: p, soma, diff: Number(p.valor) - soma, nFilhas: filhas.length }
        }).filter(d => Math.abs(d.diff) > 0.01)
        if (divergentes.length === 0) return null
        return (
          <div style={{ background:'#FEF2F2', border:'0.5px solid #F7C1C1', borderRadius:12, padding:'1rem 1.25rem', marginBottom:'1rem' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#A32D2D', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-alert-triangle" style={{fontSize:16}} />
              {divergentes.length} divisão(ões) com soma divergente do extrato
            </div>
            <div style={{ fontSize:11.5, color:'#5F5E5A', marginBottom:10 }}>
              A soma das partes precisa fechar exatamente com o valor original — divergências distorcem os relatórios financeiros. Desfaça e refaça a divisão.
            </div>
            {divergentes.map(d => (
              <div key={d.pai.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', background:'rgba(255,255,255,0.7)', borderRadius:8, marginBottom:5, fontSize:12 }}>
                <span style={{ color:'#888780', fontSize:11 }}>{new Date(d.pai.data+'T12:00:00').toLocaleDateString('pt-BR')}</span>
                <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.pai.descricao}</span>
                <span>original <strong>{fmt(Math.abs(Number(d.pai.valor)))}</strong></span>
                <span>partes <strong>{fmt(Math.abs(d.soma))}</strong></span>
                <span style={{ color:'#A32D2D', fontWeight:600 }}>dif {fmt(Math.abs(d.diff))}</span>
                <button onClick={() => desfazerDivisao(d.pai)}
                  style={{ padding:'3px 10px', fontSize:11, borderRadius:7, border:'0.5px solid #E8212A', background:'transparent', color:'#C0392B', cursor:'pointer', whiteSpace:'nowrap' }}>
                  Desfazer divisão
                </button>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:8, marginBottom:'1rem' }}>
        {[
          ['Total', movs.filter(m=>!m.dividida).length, '#5F5E5A'],
          ['Conciliados', totalConciliados, VERDE],
          ['Pendentes', totalPendentes, totalPendentes>0?LARANJA:'#888780'],
          ['Sem categoria', movs.filter(m=>!m.categoria_id&&!m.dividida).length, movs.filter(m=>!m.categoria_id&&!m.dividida).length>0?VERMELHO:'#888780'],
          ...(autoCount>0||possivelCount>0 ? [['Automáticos', autoCount, ROXO], ['? Possíveis', possivelCount, LARANJA]] : []),
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:600, color:c }}>{v}</div>
          </div>
        ))}
        <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>Saldo final</div>
          <div style={{ fontSize:14, fontWeight:600, color:VERDE }}>{fmt(extratoSel.saldo_final||0)}</div>
        </div>
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')||!msg.includes('Erro')?'#F2FAE8':'#E6F1FB', color:!msg.includes('Erro')||!msg.includes('Erro')?'#3B6D11':'#185FA5' }}>{msg}</div>}

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:'.85rem', flexWrap:'wrap', alignItems:'center' }}>
        {[['todos','Todos'],['pendentes','Pendentes'],['conciliados','Conciliados'],['sem_dados','Sem categoria']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            style={{ padding:'5px 12px', fontSize:11, borderRadius:8, border:`0.5px solid ${filtro===v?VERDE:'#D3D1C7'}`, background:filtro===v?VERDE:'transparent', color:filtro===v?'#fff':'#5F5E5A', cursor:'pointer' }}>
            {l}
          </button>
        ))}
        {isRateio && <span style={s.badge('#E6F1FB','#185FA5')}>Preponderância ativa</span>}
        {isEmenda && <span style={s.badge('#F0EAFA','#8B2FC9')}>Conta emenda</span>}
      </div>

      {/* Tabela */}
      <div style={{ ...s.card, padding:0, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'#FAFAF8' }}>
              <th style={s.th}>Data</th>
              <th style={s.th}>Descrição</th>
              <th style={s.th}>Categoria</th>
              <th style={s.th}>Subcategoria</th>
              {isRateio && <><th style={s.th}>Educ%</th><th style={s.th}>Social%</th></>}
              {isEmenda && <th style={s.th}>Plano trabalho</th>}
              <th style={s.th}>Lançamento</th>
              <th style={s.th}>Ações</th>
              <th style={{ ...s.th, textAlign:'right' }}>Valor</th>
              <th style={s.th}>Situação</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {movsFiltradas.map(m => {
              const subcats = subcatsDa(m.categoria_id)
              const totalPrep = (parseFloat(m.prep_educacao)||0)+(parseFloat(m.prep_social)||0)
              const prepOk = !isRateio || totalPrep===100 || totalPrep===0
              const temCompl = temDadosCompl(m)
              const isAberto = complementarAberto===m.id
              const match = matchMap[m.id]
              const lancVinc = m.lancamento_id ? lancamentos.find(l=>l.id===m.lancamento_id) : null

              return (
                <React.Fragment key={m.id}>
                  <tr style={{ background: m.conciliado?'#F2FAE8': match?.auto?'#F2FAE8': match?'#FFFBF0':'#fff' }}>
                    <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(m.data)}</td>

                    <td style={{ ...s.td, maxWidth:160 }}>
                      {m.parent_id && <span style={{ fontSize:9, background:'#E6F1FB', color:'#185FA5', padding:'1px 5px', borderRadius:4, marginRight:4 }}><i className="ti ti-cut" style={{marginRight:4}} /> parte</span>}
                      <div onClick={() => setDescExpandida(descExpandida===m.id?null:m.id)} style={{ cursor:'pointer', display:'inline' }}>
                        {descExpandida===m.id ? (
                          <div style={{ whiteSpace:'normal', wordBreak:'break-all', background:'#F8F7F2', borderRadius:6, padding:'4px 6px', fontSize:11 }}>
                            {m.descricao}<div style={{ marginTop:4, fontSize:10, color:VERDE }}>▲ recolher</div>
                          </div>
                        ) : (
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{m.descricao}</span>
                            {m.descricao?.length>20 && <span style={{ fontSize:10, color:AZUL, flexShrink:0 }}>▼</span>}
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ ...s.td, minWidth:140 }}>
                      <select value={m.categoria_id||''} onChange={e=>salvarCategoria(m.id, e.target.value)}
                        style={{ ...s.select, borderColor:!m.categoria_id?VERMELHO:'#D3D1C7' }}>
                        <option value="">Selecione...</option>
                        {categorias.filter(c => !c.tipo || c.tipo===(m.valor>=0?'entrada':'despesa')).map(c=>(
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </td>

                    <td style={{ ...s.td, minWidth:120 }}>
                      {subcats.length>0 ? (
                        <select value={m.subcategoria_id||''} onChange={e=>salvarSubcategoria(m.id, e.target.value)} style={s.select}>
                          <option value="">Selecione...</option>
                          {subcats.map(sc=><option key={sc.id} value={sc.id}>{sc.nome}</option>)}
                        </select>
                      ) : <span style={{ fontSize:11, color:'#B4B2A9' }}>—</span>}
                    </td>

                    {isRateio && (
                      <>
                        <td style={s.td}><input type="number" min="0" max="100" value={m.prep_educacao||''} placeholder="0" onChange={e=>salvarPreponderancia(m.id,'prep_educacao',e.target.value)} style={{ ...s.input, borderColor:!prepOk?VERMELHO:'#D3D1C7' }} /></td>
                        <td style={s.td}><input type="number" min="0" max="100" value={m.prep_social||''} placeholder="0" onChange={e=>salvarPreponderancia(m.id,'prep_social',e.target.value)} style={{ ...s.input, borderColor:!prepOk?VERMELHO:'#D3D1C7' }} /></td>
                      </>
                    )}

                    {isEmenda && (
                      <td style={{ ...s.td, minWidth:150 }}>
                        <select value={m.plano_trabalho_id||''} onChange={e=>salvarPlanoTrabalho(m.id, e.target.value)} style={{ ...s.select, borderColor:isEmenda&&m.valor<0&&!m.plano_trabalho_id?VERMELHO:'#D3D1C7' }}>
                          <option value="">Selecione...</option>
                          {planosDisponiveis.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </td>
                    )}

                    {/* Coluna Lançamento vinculado */}
                    <td style={{ ...s.td, minWidth:140 }}>
                      {match && !m.conciliado ? (
                        <div style={{ background:match.auto?'#EAF3DE':'#FAEEDA', borderRadius:6, padding:'4px 8px', fontSize:10 }}>
                          <div style={{ color:match.auto?'#3B6D11':'#854F0B', fontWeight:600, marginBottom:2 }}>
                            {match.auto?'Auto':'? Possível'} ({match.score}pts)
                          </div>
                          <div style={{ color:'#5F5E5A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>
                            {match.lancamento.descricao}
                          </div>
                          <div style={{ color:'#888780', marginTop:2 }}>{match.lancamento.categoria?.nome||'sem cat.'}</div>
                          <div style={{ display:'flex', gap:4, marginTop:4 }}>
                            <button onClick={() => confirmarMatch(m.id)} style={{ ...s.btn(match.auto?VERDE:LARANJA), fontSize:9, padding:'2px 6px' }}><i className="ti ti-check" style={{marginRight:4}} /> Confirmar</button>
                            <button onClick={() => rejeitarMatch(m.id)} style={{ ...{ ...s.btn('#FEF2F2',VERMELHO), background:'transparent', border:'none', color:'#C0392B' }, fontSize:9, padding:'2px 6px' }}><i className="ti ti-x" style={{fontSize:14}} /></button>
                          </div>
                        </div>
                      ) : lancVinc ? (
                        <div style={{ fontSize:10 }}>
                          <button onClick={() => setLancVinculadoAberto(lancVinculadoAberto===m.id?null:m.id)}
                            style={{ ...s.btn('#EAF3DE','#3B6D11'), fontSize:10, padding:'3px 8px' }}>
                            <i className="ti ti-link" style={{marginRight:4}} /> Ver lançamento
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize:10, color:'#D3D1C7' }}>—</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td style={s.td}>
                      <div style={{ position:'relative' }}>
                        <button onClick={() => setMenuAberto(menuAberto===m.id?null:m.id)}
                          style={{ ...s.btn(temCompl||movsDivida[m.id]?'#EAF3DE':'#F1EFE8', temCompl||movsDivida[m.id]?'#3B6D11':'#5F5E5A'), fontSize:10 }}>
                          {temCompl||movsDivida[m.id]?'':'⋯'} Ações {movsDivida[m.id]?'':''}
                        </button>
                        {menuAberto===m.id && (
                          <div style={{ position:'absolute', right:0, top:'100%', zIndex:50, background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, boxShadow:'0 4px 16px rgba(0,0,0,0.12)', minWidth:190, overflow:'hidden' }}>
                            <button onClick={() => { setMenuAberto(null); isAberto?setComplementarAberto(null):abrirComplementar(m) }}
                              style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:11, border:'none', borderBottom:'0.5px solid #F1EFE8', background:'transparent', cursor:'pointer', color:temCompl?'#3B6D11':'#2C2C2A' }}>
                              <i className="ti ti-clipboard-list" style={{marginRight:4}} /> {temCompl?'Dados complementares ✓':'Dados complementares'}
                            </button>
                            {!m.dividida && (
                              <button onClick={() => { setMenuAberto(null); abrirDivisao(m) }}
                                style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:11, border:'none', borderBottom:'0.5px solid #F1EFE8', background:'transparent', cursor:'pointer', color:'#185FA5' }}>
                                <i className="ti ti-cut" style={{marginRight:4}} /> Dividir movimentação
                              </button>
                            )}
                            {!m.conciliado && !m.lancamento_id && (
                              <button onClick={() => { setMenuAberto(null); setVincularAberto(vincularAberto===m.id?null:m.id) }}
                                style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:11, border:'none', borderBottom:'0.5px solid #F1EFE8', background:'transparent', cursor:'pointer', color:VERDE }}>
                                <i className="ti ti-link" style={{marginRight:4}} /> Vincular lançamento
                              </button>
                            )}
                            {m.valor<0 && pessoasRecorrentes.length>0 && (
                              <button onClick={() => {
                                setMenuAberto(null)
                                if (pagFuncAberto===m.id) { setPagFuncAberto(null); return }
                                setPagFuncAberto(m.id)
                                setFormPagFunc({ pessoa_id:'', competencia: m.data?.slice(0,7)||'', valor_mensal:'', valor_abatimento:'' })
                              }} style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:11, border:'none', background:'transparent', cursor:'pointer', color:ROXO }}>
                                <i className="ti ti-user" style={{marginRight:4}} /> Pagamento de funcionário
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ ...s.td, fontWeight:500, color:m.valor>=0?VERDE:VERMELHO, textAlign:'right', whiteSpace:'nowrap' }}>{fmt(m.valor)}</td>

                    <td style={s.td}>
                      <span style={s.badge(m.conciliado?'#EAF3DE':'#FAEEDA', m.conciliado?'#3B6D11':'#854F0B')}>
                        {m.conciliado?'OK':'Pendente'}
                      </span>
                    </td>

                    <td style={s.td}>
                      <button onClick={() => {
                        if (!m.conciliado && !m.categoria_id) {
                          setMsg('Selecione uma categoria antes de conciliar.')
                          setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
                          return
                        }
                        conciliarMov(m.id, !m.conciliado)
                      }} style={s.btn(m.conciliado?'#F1EFE8':!m.categoria_id?'#D3D1C7':'#0E7EA8', m.conciliado?'#5F5E5A':'#fff')}>
                        {m.conciliado?'Desfazer':'OK ✓'}
                      </button>
                    </td>
                  </tr>

                  {/* Lançamento vinculado expandido */}
                  {lancVinculadoAberto===m.id && lancVinc && (
                    <tr>
                      <td colSpan={11} style={{ padding:0, borderBottom:'0.5px solid #E8E6DE' }}>
                        <div style={{ background:'#F2FAE8', padding:'10px 16px', borderLeft:`3px solid ${VERDE}` }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'#3B6D11', marginBottom:6 }}><i className="ti ti-link" style={{marginRight:4}} /> Lançamento vinculado</div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, fontSize:11 }}>
                            <div><span style={{ color:'#888780' }}>Data:</span> <strong>{fmtData(lancVinc.data)}</strong></div>
                            <div><span style={{ color:'#888780' }}>Descrição:</span> <strong>{lancVinc.descricao}</strong></div>
                            <div><span style={{ color:'#888780' }}>Categoria:</span> <strong>{lancVinc.categoria?.nome||'—'}</strong></div>
                            <div><span style={{ color:'#888780' }}>Valor:</span> <strong style={{ color:lancVinc.tipo==='entrada'?VERDE:VERMELHO }}>{fmt(lancVinc.valor)}</strong></div>
                            {lancVinc.fornecedor && <div><span style={{ color:'#888780' }}>Fornecedor:</span> <strong>{lancVinc.fornecedor}</strong></div>}
                            {lancVinc.num_nota && <div><span style={{ color:'#888780' }}>NF:</span> <strong>{lancVinc.num_nota}</strong></div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Dados complementares */}
                  {isAberto && (
                    <tr>
                      <td colSpan={11} style={{ padding:0, borderBottom:'0.5px solid #E8E6DE' }}>
                        <div style={{ background:'#F8F7F2', padding:'12px 16px', borderLeft:`3px solid ${AZUL}` }}>
                          <div style={{ fontSize:12, fontWeight:500, marginBottom:10, color:AZUL }}><i className="ti ti-clipboard-list" style={{marginRight:4}} /> Dados complementares</div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginBottom:10 }}>
                            <div>
                              <label style={s.label}>Fornecedor</label>
                              <select value={formCompl.fornecedor_id||''} onChange={e => { const f=fornecedores.find(x=>String(x.id)===e.target.value); setFormCompl(prev=>({...prev, fornecedor_id:e.target.value, fornecedor:f?.nome||prev.fornecedor, cpf_cnpj:f?.cpf_cnpj||prev.cpf_cnpj})) }} style={s.inputCompl}>
                                <option value="">Selecione ou digite abaixo...</option>
                                {fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
                              </select>
                            </div>
                            <div><label style={s.label}>Nome fornecedor (manual)</label><input value={formCompl.fornecedor||''} onChange={e=>setFormCompl(p=>({...p,fornecedor:e.target.value}))} style={s.inputCompl} /></div>
                            <div><label style={s.label}>CPF/CNPJ</label><input value={formCompl.cpf_cnpj||''} onChange={e=>setFormCompl(p=>({...p,cpf_cnpj:e.target.value}))} style={s.inputCompl} /></div>
                            <div><label style={s.label}>Nº Nota</label><input value={formCompl.num_nota||''} onChange={e=>setFormCompl(p=>({...p,num_nota:e.target.value}))} style={s.inputCompl} /></div>
                            <div><label style={s.label}>Data documento</label><input type="date" value={formCompl.data_documento||''} onChange={e=>setFormCompl(p=>({...p,data_documento:e.target.value}))} style={s.inputCompl} /></div>
                            <div><label style={s.label}>Descrição do produto/serviço</label><input value={formCompl.descricao_produto||''} onChange={e=>setFormCompl(p=>({...p,descricao_produto:e.target.value}))} style={s.inputCompl} /></div>
                            <div><label style={s.label}>Local do comprovante</label><input value={formCompl.local_comprovante||''} onChange={e=>setFormCompl(p=>({...p,local_comprovante:e.target.value}))} style={s.inputCompl} /></div>
                            <div><label style={s.label}>Link externo</label><input value={formCompl.link_externo||''} onChange={e=>setFormCompl(p=>({...p,link_externo:e.target.value}))} style={s.inputCompl} /></div>
                            {m.valor<0 && (
                              <div>
                                <label style={s.label}>Tipo de receita (se for entrada)</label>
                                <select value={formCompl.tipo_receita||''} onChange={e=>setFormCompl(p=>({...p,tipo_receita:e.target.value}))} style={s.inputCompl}>
                                  <option value="">—</option>
                                  {TIPOS_RECEITA.map(t=><option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            )}
                            <div>
                              <label style={s.label}>Evento</label>
                              <select value={formCompl.evento_id||''} onChange={e=>setFormCompl(p=>({...p,evento_id:e.target.value}))} style={s.inputCompl}>
                                <option value="">—</option>
                                {eventos.map(ev=><option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={s.label}>Campanha</label>
                              <select value={formCompl.campanha_id||''} onChange={e=>setFormCompl(p=>({...p,campanha_id:e.target.value}))} style={s.inputCompl}>
                                <option value="">—</option>
                                {campanhas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginBottom:10 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <input type="checkbox" checked={formCompl.bem_permanente||false} onChange={e=>setFormCompl(p=>({...p,bem_permanente:e.target.checked}))} id={`bp${m.id}`} />
                              <label htmlFor={`bp${m.id}`} style={{ fontSize:12 }}>Bem permanente</label>
                            </div>
                            {formCompl.bem_permanente && <div><label style={s.label}>Local de guarda do bem</label><input value={formCompl.local_guarda_bem||''} onChange={e=>setFormCompl(p=>({...p,local_guarda_bem:e.target.value}))} style={s.inputCompl} /></div>}
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <input type="checkbox" checked={formCompl.despesa_rateada||false} onChange={e=>setFormCompl(p=>({...p,despesa_rateada:e.target.checked}))} id={`dr${m.id}`} />
                              <label htmlFor={`dr${m.id}`} style={{ fontSize:12 }}>Despesa rateada</label>
                            </div>
                            {formCompl.despesa_rateada && (
                              <>
                                <div><label style={s.label}>% Rateio</label><input type="number" value={formCompl.percentual_rateio||''} onChange={e=>setFormCompl(p=>({...p,percentual_rateio:e.target.value}))} style={s.inputCompl} /></div>
                                <div><label style={s.label}>Fonte restante</label><input value={formCompl.fonte_restante||''} onChange={e=>setFormCompl(p=>({...p,fonte_restante:e.target.value}))} style={s.inputCompl} /></div>
                                <div><label style={s.label}>Justificativa rateio</label><input value={formCompl.justificativa_rateio||''} onChange={e=>setFormCompl(p=>({...p,justificativa_rateio:e.target.value}))} style={s.inputCompl} /></div>
                              </>
                            )}
                          </div>
                          <div style={{ marginBottom:10 }}><label style={s.label}>Observações para prestação de contas</label><input value={formCompl.obs_prestacao||''} onChange={e=>setFormCompl(p=>({...p,obs_prestacao:e.target.value}))} style={s.inputCompl} /></div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => salvarComplementar(m.id)} style={s.btn(AZUL)}><i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar</button>
                            <button onClick={() => { setComplementarAberto(null); setFormCompl({}) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Vincular lançamento */}
                  {vincularAberto===m.id && (
                    <tr>
                      <td colSpan={11} style={{ padding:0, borderBottom:'0.5px solid #E8E6DE' }}>
                        <div style={{ background:'#F2FAE8', padding:'12px 16px', borderLeft:`3px solid ${VERDE}` }}>
                          <div style={{ fontSize:12, fontWeight:500, marginBottom:10, color:VERDE }}>
                            <i className="ti ti-link" style={{marginRight:4}} /> Vincular lançamento — {m.descricao?.slice(0,40)} ({fmt(m.valor)})
                          </div>
                          {(() => {
                            const tipoMov = m.valor >= 0 ? 'entrada' : 'despesa'
                            const mes = m.data?.slice(0,7)
                            const candidatos = lancamentos.filter(l =>
                              !l.extrato_mov_id &&
                              l.tipo === tipoMov &&
                              l.data?.slice(0,7) === mes
                            ).sort((a,b) => {
                              const da = Math.abs(new Date(a.data) - new Date(m.data))
                              const db = Math.abs(new Date(b.data) - new Date(m.data))
                              return da - db
                            })
                            if (!candidatos.length) return (
                              <div style={{ fontSize:12, color:'#888780', padding:'8px 0' }}>
                                Nenhum lançamento não conciliado encontrado neste mês.
                              </div>
                            )
                            return (
                              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                <thead><tr>
                                  {['Data','Descrição','Categoria','Valor',''].map(h=><th key={h} style={{ textAlign:'left', padding:'5px 8px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                  {candidatos.map(l => (
                                    <tr key={l.id} style={{ background:'#fff' }}>
                                      <td style={{ padding:'6px 8px', fontSize:12, whiteSpace:'nowrap' }}>{fmtData(l.data)}</td>
                                      <td style={{ padding:'6px 8px', fontSize:12, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descricao}</td>
                                      <td style={{ padding:'6px 8px', fontSize:11, color:'#888780' }}>{l.categoria?.nome||'—'}</td>
                                      <td style={{ padding:'6px 8px', fontSize:12, fontWeight:500, color:VERMELHO }}>{fmt(l.valor)}</td>
                                      <td style={{ padding:'6px 8px' }}>
                                        <button onClick={() => vincularLancamento(m.id, l.id)} style={{ padding:'4px 10px', fontSize:11, borderRadius:6, border:'none', background:'#0E7EA8', color:'#fff', cursor:'pointer' }}>
                                          <i className="ti ti-link" style={{marginRight:4}} /> Vincular
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )
                          })()}
                          <button onClick={() => setVincularAberto(null)} style={{ marginTop:10, padding:'5px 12px', fontSize:11, borderRadius:7, border:'none', background:'#F1EFE8', color:'#5F5E5A', cursor:'pointer' }}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Divisão de movimentação */}
                  {dividirAberto===m.id && (
                    <tr>
                      <td colSpan={11} style={{ padding:0, borderBottom:'0.5px solid #E8E6DE' }}>
                        <div style={{ background:'#E6F1FB', padding:'12px 16px', borderLeft:`3px solid ${AZUL}` }}>
                          <div style={{ fontSize:12, fontWeight:500, marginBottom:10, color:AZUL }}>
                            <i className="ti ti-cut" style={{marginRight:4}} /> Dividir movimentação — {m.descricao?.slice(0,40)} ({fmt(m.valor)})
                          </div>

                          {/* Lançamentos não conciliados do mês */}
                          {(() => {
                            const mes = m.data?.slice(0,7)
                            const tipoMov = m.valor >= 0 ? 'entrada' : 'despesa'
                            const lancNaoConcil = lancamentos.filter(l => !l.extrato_mov_id && l.data?.slice(0,7)===mes && l.tipo===tipoMov)
                            if (!lancNaoConcil.length) return null
                            return (
                              <div style={{ background:'#fff', borderRadius:8, padding:'10px 12px', marginBottom:12, border:'0.5px solid #B3D1F0' }}>
                                <div style={{ fontSize:11, fontWeight:600, color:AZUL, marginBottom:8 }}>
                                  <i className="ti ti-bulb" style={{marginRight:4}} /> Lançamentos não conciliados em {new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
                                </div>
                                {lancNaoConcil.map(l => (
                                  <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:11 }}>
                                    <input type="checkbox" checked={partesDivisao.some(p=>p.lancamento_id===l.id)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setPartesDivisao(prev => {
                                            const vazio = prev.findIndex(p => !p.lancamento_id && !p.valor)
                                            const nova = { valor: Number(l.valor), categoria_id: String(l.categoria_id||''), subcategoria_id: String(l.subcategoria_id||''), descricao: l.descricao, lancamento_id: l.id }
                                            if (vazio >= 0) return prev.map((p,i) => i===vazio ? nova : p)
                                            return [...prev, nova]
                                          })
                                        } else {
                                          setPartesDivisao(prev => prev.map(p => p.lancamento_id===l.id ? { ...p, lancamento_id:'' } : p))
                                        }
                                      }} />
                                    <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descricao}</span>
                                    <span style={{ color:'#888780', fontSize:10 }}>{l.categoria?.nome||'—'}</span>
                                    <span style={{ fontWeight:600, color:VERMELHO }}>{fmt(l.valor)}</span>
                                  </div>
                                ))}
                                <button onClick={() => setPartesDivisao(lancNaoConcil.slice(0,5).map(l => ({ valor: Number(l.valor), categoria_id: String(l.categoria_id||''), subcategoria_id: String(l.subcategoria_id||''), descricao: l.descricao, lancamento_id: l.id })))}
                                  style={{ ...s.btn('#E6F1FB',AZUL), fontSize:10, marginTop:8 }}>
                                  Usar todos como partes
                                </button>
                              </div>
                            )
                          })()}

                          {partesDivisao.map((parte, i) => {
                            const subcats = subcatsDa(parte.categoria_id)
                            return (
                              <div key={i} style={{ background:'#fff', borderRadius:8, padding:'10px 12px', marginBottom:8, border: parte.lancamento_id ? `1px solid ${VERDE}` : '0.5px solid #D3D1C7' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                                  <span style={{ fontSize:11, fontWeight:600, color:parte.lancamento_id?VERDE:AZUL }}>
                                    Parte {i+1} {parte.lancamento_id ? 'vinculado ao lançamento' : ''}
                                  </span>
                                  {partesDivisao.length > 2 && (
                                    <button onClick={() => setPartesDivisao(prev => prev.filter((_,j)=>j!==i))} style={{ ...{ ...s.btn('#FEF2F2',VERMELHO), background:'transparent', border:'none', color:'#C0392B' }, padding:'2px 8px', fontSize:10 }}><i className="ti ti-x" style={{fontSize:14}} /></button>
                                  )}
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 2fr', gap:8 }}>
                                  <div>
                                    <label style={s.label}>Valor (R$) *</label>
                                    <input type="number" step="0.01" value={parte.valor} onChange={e => setPartesDivisao(prev => prev.map((p,j) => j===i?{...p,valor:e.target.value}:p))} style={s.inputCompl} />
                                  </div>
                                  <div>
                                    <label style={s.label}>Categoria *</label>
                                    <select value={parte.categoria_id||''} onChange={e => setPartesDivisao(prev => prev.map((p,j) => j===i?{...p,categoria_id:e.target.value,subcategoria_id:''}:p))} style={s.inputCompl}>
                                      <option value="">Selecione...</option>
                                      {categorias.filter(c => !c.tipo||c.tipo===(m.valor>=0?'entrada':'despesa')).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label style={s.label}>Subcategoria</label>
                                    <select value={parte.subcategoria_id||''} onChange={e => setPartesDivisao(prev => prev.map((p,j) => j===i?{...p,subcategoria_id:e.target.value}:p))} style={s.inputCompl}>
                                      <option value="">—</option>
                                      {subcats.map(sc=><option key={sc.id} value={sc.id}>{sc.nome}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label style={s.label}>Descrição</label>
                                    <input value={parte.descricao||''} onChange={e => setPartesDivisao(prev => prev.map((p,j) => j===i?{...p,descricao:e.target.value}:p))} placeholder={m.descricao} style={s.inputCompl} />
                                  </div>
                                </div>
                              </div>
                            )
                          })}

                          {(() => {
                            const soma = partesDivisao.reduce((a,p)=>a+(parseFloat(p.valor)||0),0)
                            const original = Math.abs(Number(m.valor))
                            const ok = Math.abs(soma-original)<0.01
                            return (
                              <div style={{ fontSize:11, padding:'6px 12px', borderRadius:6, marginBottom:10, background:ok?'#EAF3DE':'#FEF2F2', color:ok?'#3B6D11':'#A32D2D' }}>
                                Valor original: <strong>{fmt(m.valor)}</strong> · Soma das partes: <strong>R$ {soma.toFixed(2)}</strong>
                                {ok ? ' ✓ OK' : ` · Diferença: R$ ${Math.abs(soma-original).toFixed(2)}`}
                              </div>
                            )
                          })()}
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => setPartesDivisao(prev => [...prev, { valor:'', categoria_id:'', descricao:'', lancamento_id:'' }])} style={s.btn('#E6F1FB',AZUL)}>+ Parte</button>
                            <button onClick={() => confirmarDivisao(m)} style={s.btn(AZUL)}><i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Confirmar divisão</button>
                            <button onClick={() => setDividirAberto(null)} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Pagamento de funcionário */}
                  {pagFuncAberto===m.id && (
                    <tr>
                      <td colSpan={11} style={{ padding:0, borderBottom:'0.5px solid #E8E6DE' }}>
                        <div style={{ background:'#F5F0FF', padding:'12px 16px', borderLeft:`3px solid ${ROXO}` }}>
                          <div style={{ fontSize:12, fontWeight:500, marginBottom:10, color:ROXO }}>
                            <i className="ti ti-user" style={{marginRight:4}} /> Pagamento de funcionário / prestador — {m.descricao?.slice(0,40)}
                          </div>
                          {movsDivida[m.id] && (
                            <div style={{ background:'#EAF3DE', border:'0.5px solid #C0DD97', borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
                              <div style={{ fontSize:11, fontWeight:600, color:'#3B6D11', marginBottom:6 }}><i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Pagamento já registrado</div>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, fontSize:11 }}>
                                <div><span style={{ color:'#888780' }}>Pessoa:</span> <strong>{movsDivida[m.id].pessoa?.nome||'—'}</strong></div>
                                <div><span style={{ color:'#888780' }}>Competência:</span> <strong>{movsDivida[m.id].competencia ? new Date(movsDivida[m.id].competencia+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) : '—'}</strong></div>
                                <div><span style={{ color:'#888780' }}><i className="ti ti-briefcase" style={{marginRight:4}} /> Ano corrente:</span> <strong style={{ color:'#185FA5' }}>R$ {Number(movsDivida[m.id].valor_pago_mensal||0).toFixed(2)}</strong></div>
                                <div><span style={{ color:'#888780' }}><i className="ti ti-calendar" style={{marginRight:4}} /> Abatimento:</span> <strong style={{ color:'#854F0B' }}>R$ {Number(movsDivida[m.id].abatimento||0).toFixed(2)}</strong></div>
                              </div>
                              <div style={{ marginTop:8, fontSize:11, color:'#888780' }}>Quer corrigir? Preencha abaixo e registre novamente.</div>
                            </div>
                          )}
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                            <div>
                              <label style={s.label}>Pessoa *</label>
                              <select value={formPagFunc.pessoa_id||''} onChange={e => {
                                const pessoaId = e.target.value
                                const pe = pessoasRecorrentes.find(p => String(p.id)===pessoaId)
                                const comp = formPagFunc.competencia || m.data?.slice(0,7) || ''
                                const mensal = Number(pe?.valor_mensal_normal||0)
                                const totalMov = Math.abs(Number(m.valor))
                                const valorMensal = Math.min(totalMov, mensal)
                                const valorAbat = Math.round(Math.max(0, totalMov-valorMensal)*100)/100
                                setFormPagFunc(f => ({ ...f, pessoa_id:pessoaId, competencia:comp, valor_mensal:valorMensal>0?valorMensal:'', valor_abatimento:valorAbat>0?valorAbat:'', ja_pago_mensal:0 }))
                                if (pe && comp) {
                                  supabase.from('competencias_mensais').select('valor_pago_mensal').eq('pessoa_id', pe.id).eq('competencia', comp).single()
                                    .then(({ data: compData }) => {
                                      const jaPago = Number(compData?.valor_pago_mensal||0)
                                      if (jaPago>0) {
                                        const falta = Math.max(0, mensal-jaPago)
                                        const vM = Math.min(totalMov, falta)
                                        const vA = Math.round(Math.max(0, totalMov-vM)*100)/100
                                        setFormPagFunc(f => ({ ...f, valor_mensal:vM>0?vM:'', valor_abatimento:vA>0?vA:'', ja_pago_mensal:jaPago }))
                                      }
                                    })
                                }
                              }} style={s.inputCompl}>
                                <option value="">Selecione...</option>
                                {pessoasRecorrentes.map(pe=><option key={pe.id} value={pe.id}>{pe.nome} — Mensal: R$ {Number(pe.valor_mensal_normal||0).toFixed(2)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={s.label}>Competência *</label>
                              <input type="month" value={formPagFunc.competencia||''} onChange={e => {
                                const comp = e.target.value
                                const pe = pessoasRecorrentes.find(p=>String(p.id)===String(formPagFunc.pessoa_id))
                                const mensal = Number(pe?.valor_mensal_normal||0)
                                const totalMov = Math.abs(Number(m.valor))
                                setFormPagFunc(f=>({...f, competencia:comp}))
                                if (pe && comp) {
                                  supabase.from('competencias_mensais').select('valor_pago_mensal').eq('pessoa_id', pe.id).eq('competencia', comp).single()
                                    .then(({ data: compData }) => {
                                      const jaPago = Number(compData?.valor_pago_mensal||0)
                                      const falta = Math.max(0, mensal-jaPago)
                                      const vM = Math.min(totalMov, falta)
                                      const vA = Math.round(Math.max(0, totalMov-vM)*100)/100
                                      setFormPagFunc(f=>({...f, valor_mensal:vM>0?vM:'', valor_abatimento:vA>0?vA:'', ja_pago_mensal:jaPago}))
                                    })
                                }
                              }} style={s.inputCompl} />
                            </div>
                          </div>
                          {formPagFunc.pessoa_id && formPagFunc.competencia && (() => {
                            const pe = pessoasRecorrentes.find(p=>String(p.id)===String(formPagFunc.pessoa_id))
                            const mensal = Number(pe?.valor_mensal_normal||0)
                            const jaPago = Number(formPagFunc.ja_pago_mensal||0)
                            return jaPago>0 ? (
                              <div style={{ fontSize:11, padding:'6px 10px', borderRadius:6, marginBottom:8, background:'#E6F1FB', color:'#185FA5' }}>
                                <i className="ti ti-chart-bar" style={{marginRight:4}} /> Já pago neste mês: <strong>R$ {jaPago.toFixed(2)}</strong> de R$ {mensal.toFixed(2)} · Falta: <strong>R$ {Math.max(0,mensal-jaPago).toFixed(2)}</strong>
                              </div>
                            ) : null
                          })()}
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                            <div>
                              <label style={s.label}><i className="ti ti-briefcase" style={{marginRight:4}} /> Ano corrente — salário/serviço mensal (R$)</label>
                              <input type="number" step="0.01" value={formPagFunc.valor_mensal||''} onChange={e=>setFormPagFunc(f=>({...f,valor_mensal:e.target.value}))} style={s.inputCompl} placeholder="0,00" />
                            </div>
                            <div>
                              <label style={s.label}><i className="ti ti-calendar" style={{marginRight:4}} /> Dívidas anteriores — abatimento (R$)</label>
                              <input type="number" step="0.01" value={formPagFunc.valor_abatimento||''} onChange={e=>setFormPagFunc(f=>({...f,valor_abatimento:e.target.value}))} style={s.inputCompl} placeholder="0,00" />
                            </div>
                          </div>
                          {(() => {
                            const totalMov = Math.abs(Number(m.valor))
                            const valMens = parseFloat(formPagFunc.valor_mensal)||0
                            const valAbat = parseFloat(formPagFunc.valor_abatimento)||0
                            const pe = pessoasRecorrentes.find(p=>String(p.id)===String(formPagFunc.pessoa_id))
                            const mensal = Number(pe?.valor_mensal_normal||0)
                            const jaPago = Number(formPagFunc.ja_pago_mensal||0)
                            const naoPago = Math.max(0, mensal-jaPago-valMens)
                            const excede = valMens+valAbat > totalMov+0.01
                            return (
                              <div style={{ fontSize:11, padding:'8px 12px', borderRadius:6, marginBottom:10, background:excede?'#FEF2F2':'#E6F1FB', color:excede?'#A32D2D':'#185FA5' }}>
                                <div>Extrato: <strong>R$ {totalMov.toFixed(2)}</strong> · Mensal: <strong>R$ {valMens.toFixed(2)}</strong> · Abatimento: <strong>R$ {valAbat.toFixed(2)}</strong></div>
                                {pe && !excede && <div style={{ marginTop:4, color:naoPago>0?'#854F0B':'#3B6D11', fontWeight:500 }}>
                                  {naoPago>0 ? `Após este pagamento faltam R$ ${naoPago.toFixed(2)} no mês` : 'Mês integralmente pago'}
                                </div>}
                                {excede && <div style={{ marginTop:4, fontWeight:600 }}><i className="ti ti-ban" style={{marginRight:4}} /> Soma excede o valor do extrato</div>}
                              </div>
                            )
                          })()}
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => salvarPagamentoFuncionario(m.id, m)} style={s.btn('#0E7EA8')}><i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Registrar pagamento</button>
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
    </div>
  )
}
