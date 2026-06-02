import { supabase } from './supabase'

// ---- CONTAS ----
export const contas = {
  listar: () => supabase.from('contas').select('*').order('nome'),
  criar: (dados) => supabase.from('contas').insert(dados).select().single(),
  atualizar: (id, dados) => supabase.from('contas').update(dados).eq('id', id),
}

// ---- CATEGORIAS ----
export const categorias = {
  listar: (tipo) => {
    let q = supabase.from('categorias').select('*').order('nome')
    if (tipo) q = q.eq('tipo', tipo)
    return q
  },
  criar: (dados) => supabase.from('categorias').insert(dados).select().single(),
  atualizar: (id, dados) => supabase.from('categorias').update(dados).eq('id', id),
  excluir: (id) => supabase.from('categorias').delete().eq('id', id),
}

// ---- LANÇAMENTOS ----
export const lancamentos = {
  listar: (filtros = {}) => {
    let q = supabase
      .from('lancamentos')
      .select(`*, conta:contas(nome, banco), categoria:categorias(nome, tipo)`)
      .order('data', { ascending: false })
    if (filtros.conta_id) q = q.eq('conta_id', filtros.conta_id)
    if (filtros.tipo) q = q.eq('tipo', filtros.tipo)
    if (filtros.mes) q = q.gte('data', filtros.mes + '-01').lte('data', filtros.mes + '-31')
    if (filtros.conciliado !== undefined) q = q.eq('conciliado', filtros.conciliado)
    return q
  },
  criar: (dados) => supabase.from('lancamentos').insert(dados).select().single(),
  atualizar: (id, dados) => supabase.from('lancamentos').update(dados).eq('id', id),
  conciliar: (id) => supabase.from('lancamentos').update({ conciliado: true }).eq('id', id),
}

// ---- RATEIO PREPONDERÂNCIA ----
export const rateios = {
  listar: (lancamento_id) =>
    supabase.from('rateios').select('*').eq('lancamento_id', lancamento_id),
  criar: (itens) => supabase.from('rateios').insert(itens),
  excluir: (lancamento_id) =>
    supabase.from('rateios').delete().eq('lancamento_id', lancamento_id),
}

// ---- CLASSIFICAÇÕES AUTOMÁTICAS ----
export const classificacoes = {
  listar: () => supabase.from('classificacoes').select('*').order('tipo_doc'),
  criar: (dados) => supabase.from('classificacoes').insert(dados).select().single(),
  atualizar: (id, dados) => supabase.from('classificacoes').update(dados).eq('id', id),
  excluir: (id) => supabase.from('classificacoes').delete().eq('id', id),
}

// ---- APLICAÇÕES ----
export const aplicacoes = {
  listar: () => supabase.from('aplicacoes').select('*, conta:contas(nome)').order('nome'),
  rendimentos: (aplicacao_id) =>
    supabase.from('rendimentos').select('*').eq('aplicacao_id', aplicacao_id).order('competencia', { ascending: false }),
  criarRendimento: (dados) => supabase.from('rendimentos').insert(dados).select().single(),
}

// ---- PARSER EXTRATO SICREDI ----
export function parsearExtratoSicredi(rows) {
  const REGRAS_CLASSIFICACAO = [
    { doc: 'COB000001', dir: 'entrada', classif: 'Contribuição de associados' },
    { doc: 'COB000001', dir: 'saida',   classif: 'Taxa de cobrança' },
    { doc: 'PIXCOBRAN', dir: 'entrada', classif: 'Contribuição de associados' },
    { doc: 'SOBRCC',    dir: 'entrada', classif: 'Distribuição de sobras' },
    { doc: 'TED',       dir: 'entrada', classif: 'Repasse / Convênio' },
    { doc: '175707',    dir: 'entrada', classif: 'Repasse / Convênio' },
    { doc: 'PIX_CRED',  dir: 'entrada', classif: 'Recebimento PIX' },
    { doc: 'PIX_DEB',   dir: 'saida',   classif: 'Pagamento PIX' },
  ]

  function classificar(doc, dir) {
    if (!doc) return 'Outros'
    const d = String(doc).toUpperCase().trim()
    const r = REGRAS_CLASSIFICACAO.find(r => d.startsWith(r.doc.toUpperCase()) && r.dir === dir)
    return r ? r.classif : 'Outros'
  }

  let movs = [], saldoFinal = 0, periodo = '', associado = '', conta = ''

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue
    const c0 = String(r[0] || '').trim()
    const c1 = String(r[1] || '').trim()

    if (c0 === 'Associado:') associado = c1
    if (c0 === 'Conta:') conta = c1
    if (c0.startsWith('Dados referentes')) periodo = c0.replace('Dados referentes ao período de ', '').replace('.', '')
    if (c0 === 'Saldo atual (disponível em conta)') saldoFinal = parseFloat(String(r[2] || r[1] || '0').replace(',', '.')) || 0

    if (c0 && c0.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const valor = parseFloat(String(r[3] || '0').replace(',', '.')) || 0
      const saldo = parseFloat(String(r[4] || '0').replace(',', '.')) || 0
      const p = c0.split('/')
      const dataISO = `${p[2]}-${p[1]}-${p[0]}`
      const dir = valor >= 0 ? 'entrada' : 'saida'
      const doc = String(r[2] || '').trim()
      movs.push({
        data: c0, dataISO, desc: c1, doc: doc || '—',
        valor, saldo, tipo: dir, valorAbs: Math.abs(valor),
        classif: classificar(doc, dir),
      })
    }
  }

  return { movs, saldoFinal, periodo, associado, conta }
}
