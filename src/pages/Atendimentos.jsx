import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'
import { gerarPDFAtendimentos, gerarPDFCronogramaTeacolher } from '../lib/pdf'

const VERDE = '#6BBF2B'
const VERMELHO = '#E8212A'
const AZUL = '#0E7EA8'
const LARANJA = '#F4821F'
const ESCURO = '#06344F'

const ETAPAS_FLUXO = [
  'Captação / demanda espontânea',
  'Acolhimento inicial',
  'Avaliação interdisciplinar',
  'Plano individual/familiar',
  'Atendimento contínuo',
  'Atendimento familiar / orientação familiar',
  'Grupo de apoio e orientação para famílias',
  'Oficina / atividade comunitária',
  'Avaliação participativa trimestral',
  'Encaminhamento externo',
  'Acompanhamento / devolutiva familiar',
  'Desligamento',
  'Outro',
]

const ORIGENS_DEMANDA = [
  'Demanda espontânea',
  'Encaminhamento da Saúde / SUS',
  'Encaminhamento da Educação',
  'Encaminhamento da Assistência Social / SUAS',
  'Rede comunitária',
  'Busca ativa',
  'Retorno / acompanhamento',
  'Outro',
]

const AREAS_TEACOLHER = [
  'Interdisciplinar',
  'Psicologia',
  'Fisioterapia',
  'Nutrição',
  'Psicomotricidade',
  'Neuropsicopedagogia',
  'Fonoaudiologia',
  'Terapia ocupacional',
  'Serviço social',
  'Socioeducativo',
  'Orientação familiar',
  'Outro',
]

// Liga a função/cargo do profissional (cadastro da equipe) à área de atendimento do TEAcolher,
// pra área não ficar solta e desencontrada do profissional escolhido no agendamento.
function areaPelaFuncao(funcao = '') {
  const f = String(funcao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const mapa = [
    [['psicolog'], 'Psicologia'],
    [['fisioterap'], 'Fisioterapia'],
    [['nutri'], 'Nutrição'],
    [['psicomotric'], 'Psicomotricidade'],
    [['neuropsicopedagog', 'psicopedagog'], 'Neuropsicopedagogia'],
    [['fonoaudiolog', 'fono'], 'Fonoaudiologia'],
    [['ocupacional'], 'Terapia ocupacional'],
    [['assistente social', 'servico social'], 'Serviço social'],
    [['socioeducad', 'socioeducativ'], 'Socioeducativo'],
    [['orientador familiar', 'orientacao familiar'], 'Orientação familiar'],
  ]
  for (const [chaves, area] of mapa) {
    if (chaves.some(c => f.includes(c))) return area
  }
  return null
}

const MODALIDADES_TEACOLHER = [
  'Individual',
  'Familiar',
  'Grupo',
  'Oficina',
]

const PUBLICOS_TEACOLHER = [
  'Pessoa com TEA / PCD',
  'Famílias / responsáveis',
  'Núcleo familiar',
  'Rede SUS',
  'Rede SUAS',
  'Rede de Educação',
  'Comunidade',
  'Outro',
]

const COMPARECIMENTOS_TEACOLHER = [
  'Compareceu',
  'Faltou',
  'Falta justificada',
]

const TIPOS_ENCAMINHAMENTO = [
  'Sem encaminhamento externo',
  'SUS',
  'SUAS',
  'Educação',
  'Conselho Tutelar',
  'Rede de proteção',
  'Avaliação complementar',
  'Documentação / laudo',
  'Benefício social',
  'Outro',
]

const REDES_DESTINO = [
  'Não se aplica',
  'Unidade Básica de Saúde / SUS',
  'CAPS / saúde mental',
  'CRAS',
  'CREAS',
  'Escola / Secretaria de Educação',
  'Conselho Tutelar',
  'Serviço especializado',
  'Outro',
]

const DESFECHOS_TEACOLHER = [
  'Em acompanhamento',
  'Aguardar retorno da família',
  'Manter atendimento contínuo',
  'Encaminhado para rede',
  'Devolutiva realizada',
  'Objetivo atingido',
  'Encerrado',
  'Desligado',
]

const SITUACOES = ['agendado', 'realizado', 'reagendado', 'cancelado', 'em acompanhamento', 'encerrado', 'desligado']

const SITUACAO_COR = {
  realizado: ['#EAF3DE', '#3B6D11'],
  agendado: ['#E6F1FB', '#185FA5'],
  cancelado: ['#FCEBEB', '#A32D2D'],
  reagendado: ['#FAEEDA', '#854F0B'],
  'em acompanhamento': ['#FAEEDA', '#854F0B'],
  encerrado: ['#F1EFE8', '#888780'],
  desligado: ['#F1EFE8', '#888780'],
}

const FORM_VAZIO = {
  data_atend: new Date().toISOString().slice(0, 10),
  hora_inicio: '',
  hora_fim: '',
  projeto_id: '',
  usuario_atendido_id: '',
  pessoa_atendida: '',
  profissional_id: '',
  equipe_ids: [],
  etapa_fluxo: 'Acolhimento inicial',
  origem_demanda: 'Demanda espontânea',
  objetivo_atendimento: '',
  area_atendimento: 'Interdisciplinar',
  modalidade_atendimento: 'Acolhimento',
  situacao: 'agendado',
  descricao: '',
  qtd_participantes: 1,
  publico_participante: ['Pessoa com TEA / PCD', 'Famílias / responsáveis'],
  comparecimento: '',
  duracao_minutos: '',
  participantes_atendimento: 'Usuário e responsável/família',
  demanda_identificada: '',
  registro_tecnico: '',
  orientacao_familia: '',
  devolutiva_familia: 'Não registrada',
  necessita_acompanhamento: 'Sim',
  responsavel_presente: '',
  tipo_encaminhamento: 'Sem encaminhamento externo',
  rede_encaminhada: 'Não se aplica',
  encaminhamentos: '',
  orgao_encaminhamento: '',
  proxima_acao: '',
  desfecho_teacolher: 'Em acompanhamento',
  observacoes: '',
}

const FERIADOS_NACIONAIS_2026 = new Set([
  '2026-01-01','2026-02-16','2026-02-17',
  '2026-04-03','2026-04-21','2026-05-01',
  '2026-06-04','2026-09-07','2026-10-12',
  '2026-11-02','2026-11-15','2026-11-20','2026-12-25',
  '2027-01-01',
])

// Regra de ordenação padrão do sistema: o próximo agendamento futuro sempre primeiro
// (do mais próximo pro mais distante), depois o histórico já realizado, do mais recente
// pro mais antigo. Usada em toda lista de atendimentos — nunca mostra o mais distante no topo.
function ordenarProximoPrimeiro(lista) {
  const hoje = new Date().toISOString().slice(0, 10)
  const ehFuturo = a => a.data_atend >= hoje && ['agendado', 'reagendado'].includes(a.situacao)
  const futuros = lista.filter(ehFuturo).sort((a, b) => a.data_atend > b.data_atend ? 1 : a.data_atend < b.data_atend ? -1 : 0)
  const passados = lista.filter(a => !ehFuturo(a))
  return [...futuros, ...passados]
}

function gerarDatasRecorrentes(dataInicio, recorrencia, dataFim) {
  if (!dataInicio || !dataFim || recorrencia === 'unica') return []
  const datas = []
  let atual = new Date(dataInicio + 'T12:00:00')
  const fim = new Date(dataFim + 'T12:00:00')
  let limite = 0
  while (atual <= fim && limite < 200) {
    limite++
    const str = atual.toISOString().slice(0, 10)
    if (!FERIADOS_NACIONAIS_2026.has(str)) datas.push(str)
    if (recorrencia === 'semanal') atual.setDate(atual.getDate() + 7)
    else if (recorrencia === 'quinzenal') atual.setDate(atual.getDate() + 14)
    else if (recorrencia === 'mensal') atual = new Date(atual.getFullYear(), atual.getMonth() + 1, atual.getDate(), 12)
    else break
  }
  return datas
}

export default function Atendimentos() {
  const isMobile = useIsMobile()
  const { perfil } = useAuth()
  const location = useLocation()
  const [atendimentos, setAtendimentos] = useState([])
  const [todosAtendimentos, setTodosAtendimentos] = useState([])
  const [projetos, setProjetos] = useState([])
  const [projetoTeacolherId, setProjetoTeacolherId] = useState('')
  const [equipe, setEquipe] = useState([])
  const [projetoEquipe, setProjetoEquipe] = useState([])
  const [usuariosAtendidos, setUsuariosAtendidos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [modoResultado, setModoResultado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [filtros, setFiltros] = useState({ dataInicio: '', dataFim: '', profissional_id: '', situacao: '' })
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false)
  const [recorrencia, setRecorrencia] = useState('unica')
  const [dataFimRecorrencia, setDataFimRecorrencia] = useState('')
  const [filtroRelatorio, setFiltroRelatorio] = useState({ tipo:'completo', profissional_id:'', usuario_id:'', dataInicio:'', dataFim:'' })
  const abrirProcessadoRef = useRef(null)

  const perfilAtual = perfil?.perfil || ''
  const isAdmin = perfilAtual === 'admin'
  const isOperacional = perfilAtual === 'operacional'
  const isTecnico = perfilAtual === 'tecnico'
  const tecnicoEquipeId = perfil?.equipe_id ? String(perfil.equipe_id) : ''
  const tecnicoNome = perfil?.nome || 'Técnico'
  const podeAgendar = isAdmin || isOperacional
  const podeEditarAgendamento = isAdmin || isOperacional
  const podeFinalizar = isAdmin || isTecnico
  const podeEditarRegistro = isAdmin || isTecnico
  const podeExcluir = isAdmin
  const podeAcessarFormulario = modoResultado ? podeFinalizar : podeAgendar

  useEffect(() => {
    inicializar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!projetoTeacolherId) return
    carregar(filtros, projetoTeacolherId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilAtual, tecnicoEquipeId, projetoTeacolherId])

  useEffect(() => {
    if (!projetoTeacolherId) return
    const params = new URLSearchParams(location.search)
    if (params.get('novo') === '1') abrirNovoAgendamento(projetoTeacolherId)
    if (params.get('situacao')) {
      const novoFiltro = { ...filtros, situacao: params.get('situacao') }
      setFiltros(novoFiltro)
      carregar(novoFiltro, projetoTeacolherId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, projetoTeacolherId])

  // Abre direto o atendimento específico vindo de um link (ex.: "Agenda de hoje" do painel
  // técnico/operacional). Sem isso, qualquer linha clicada caía sempre na mesma lista genérica.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const idAbrir = params.get('abrir')
    if (!idAbrir) { abrirProcessadoRef.current = null; return }
    if (abrirProcessadoRef.current === idAbrir) return
    if (todosAtendimentos.length === 0) return
    const alvo = todosAtendimentos.find(a => String(a.id) === String(idAbrir))
    if (alvo) {
      montarForm(alvo, params.get('acao') === 'finalizar')
      abrirProcessadoRef.current = idAbrir
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, todosAtendimentos])

  async function inicializar() {
    setLoading(true)
    const [projs, equipeRes, peRes, usersRes] = await Promise.all([
      supabase.from('projetos').select('id,nome,tipo').eq('aceita_atendimentos', true).order('nome'),
      supabase.from('equipe').select('id,nome,funcao,projetos').eq('situacao', 'ativo').order('nome'),
      supabase.from('projeto_equipe').select('projeto_id,equipe_id'),
      supabase.from('usuarios_atendidos').select('id,nome,situacao,projeto_id').eq('situacao', 'ativo').order('nome'),
    ])

    const projetosData = projs.data || []
    const tea = projetosData.find(p => String(p.nome || '').toLowerCase().includes('teacolher'))

    setProjetos(projetosData)
    setProjetoTeacolherId(tea?.id || '')
    setEquipe(equipeRes.data || [])
    setProjetoEquipe(peRes.data || [])
    setUsuariosAtendidos(usersRes.data || [])

    await carregar(filtros, tea?.id || '')
  }

  async function carregar(f = filtros, teaId = projetoTeacolherId) {
    setLoading(true)
    setMsg('')

    let qTodos = supabase.from('atendimentos')
      .select('*')
      .order('data_atend', { ascending: false })
      .order('id', { ascending: false })
      .limit(1000)

    let qLista = supabase.from('atendimentos')
      .select('*')
      .order('data_atend', { ascending: false })
      .order('id', { ascending: false })
      .limit(500)

    if (teaId) {
      qTodos = qTodos.eq('projeto_id', parseInt(teaId))
      qLista = qLista.eq('projeto_id', parseInt(teaId))
    }

    if (isTecnico) {
      const idTecnico = tecnicoEquipeId ? parseInt(tecnicoEquipeId) : -999999
      qTodos = qTodos.eq('profissional_id', idTecnico)
      qLista = qLista.eq('profissional_id', idTecnico)
    }

    if (f.dataInicio) qLista = qLista.gte('data_atend', f.dataInicio)
    if (f.dataFim) qLista = qLista.lte('data_atend', f.dataFim)
    if (!isTecnico && f.profissional_id) qLista = qLista.eq('profissional_id', parseInt(f.profissional_id))
    if (f.situacao) qLista = qLista.eq('situacao', f.situacao)

    const [todosRes, listaRes] = await Promise.all([qTodos, qLista])

    if (todosRes.error || listaRes.error) {
      const err = todosRes.error || listaRes.error
      setMsg('Erro ao carregar atendimentos: ' + err.message + ' | Código: ' + err.code)
      setTodosAtendimentos([])
      setAtendimentos([])
    } else {
      // Regra padrão em todo o sistema: o próximo agendamento futuro sempre aparece
      // primeiro (do mais próximo pro mais distante), depois o histórico já realizado
      // do mais recente pro mais antigo — nunca o atendimento mais distante no topo.
      setTodosAtendimentos(ordenarProximoPrimeiro(todosRes.data || []))
      setAtendimentos(ordenarProximoPrimeiro(listaRes.data || []))
    }
    setLoading(false)
  }

  const equipeTEAcolher = useMemo(() => {
    const idsVinculados = projetoEquipe
      .filter(pe => String(pe.projeto_id) === String(projetoTeacolherId))
      .map(pe => String(pe.equipe_id))
    if (idsVinculados.length > 0) return equipe.filter(e => idsVinculados.includes(String(e.id)))
    return equipe.filter(e => Array.isArray(e.projetos) && e.projetos.some(pr => String(pr).toLowerCase().includes('teacolher')))
  }, [equipe, projetoEquipe, projetoTeacolherId])

  const usuariosTEAcolher = usuariosAtendidos.filter(u => String(u.projeto_id) === String(projetoTeacolherId))

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0, 5) : '—'
  const nomeUsuario = id => usuariosAtendidos.find(u => String(u.id) === String(id))?.nome || ''
  const profissional = id => equipe.find(e => String(e.id) === String(id))
  const profissionalNome = id => {
    const p = profissional(id)
    return p?.nome ? p.nome.split(' ').slice(0, 2).join(' ') : '—'
  }
  const nomeAtendido = a => nomeUsuario(a.usuario_atendido_id) || a.pessoa_atendida || '—'
  const etapaAtendimento = a => a.etapa_fluxo || a.tipo_atend || '—'
  const ehAgendado = a => ['agendado', 'reagendado'].includes(String(a.situacao || '').toLowerCase())
  const atendimentoDoTecnico = a => !isTecnico || (tecnicoEquipeId && String(a.profissional_id) === String(tecnicoEquipeId))
  const podeAtuarNoAtendimento = a => isAdmin || (isTecnico && atendimentoDoTecnico(a))

  function escapeHtml(v = '') {
    return String(v ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[ch]))
  }

  function abrirJanelaImpressao(titulo, conteudo) {
    const win = window.open('', '_blank', 'width=960,height=720')
    if (!win) {
      setMsg('Erro: o navegador bloqueou a janela de impressão. Libere pop-ups para imprimir.')
      return
    }

    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(titulo)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; padding: 24px; background: #fff; }
    .topo { border-bottom: 2px solid #0E7EA8; padding-bottom: 12px; margin-bottom: 18px; }
    .org { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; font-weight: 700; }
    h1 { margin: 4px 0 2px; font-size: 22px; color: #06344F; }
    .sub { font-size: 12px; color: #64748b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; }
    .campo { border: 1px solid #e5e7eb; border-radius: 10px; padding: 9px 10px; min-height: 44px; }
    .rotulo { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
    .valor { font-size: 13px; color: #111827; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; font-size: 11px; color: #475569; background: #f8fafc; border-bottom: 1px solid #cbd5e1; padding: 8px; }
    td { font-size: 12px; border-bottom: 1px solid #e5e7eb; padding: 8px; vertical-align: top; }
    .assinatura { margin-top: 42px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
    .linha { border-top: 1px solid #111827; text-align: center; padding-top: 6px; font-size: 11px; color: #334155; }
    .rodape { margin-top: 18px; font-size: 10px; color: #94a3b8; }
    @media print {
      body { padding: 16mm; }
      .no-print { display: none !important; }
      .campo { break-inside: avoid; }
      table { break-inside: auto; }
      tr { break-inside: avoid; break-after: auto; }
    }
  </style>
</head>
<body>${conteudo}</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  function imprimirAgenda() {
    const titulo = isTecnico ? 'Minha agenda TEAcolher' : 'Agenda TEAcolher'
    const profissionalFiltro = isTecnico ? (profissional(tecnicoEquipeId)?.nome || tecnicoNome) : (filtros.profissional_id ? profissional(filtros.profissional_id)?.nome : 'Todos os profissionais')
    const linhas = atendimentos.map(a => `
      <tr>
        <td>${escapeHtml(fmtData(a.data_atend))}</td>
        <td>${escapeHtml(fmtHora(a.hora_inicio))}</td>
        <td>${escapeHtml(nomeAtendido(a))}</td>
        <td>${escapeHtml(etapaAtendimento(a))}</td>
        <td>${escapeHtml(a.area_atendimento || '—')}</td>
        <td>${escapeHtml(profissionalNome(a.profissional_id))}</td>
        <td>${escapeHtml(a.situacao || '—')}</td>
      </tr>
    `).join('')

    abrirJanelaImpressao(titulo, `
      <div class="topo">
        <div class="org">Associação TEIAA · Projeto TEAcolher</div>
        <h1>${escapeHtml(titulo)}</h1>
        <div class="sub">Lista limpa para conferência, execução e assinatura. Emitido em ${escapeHtml(new Date().toLocaleString('pt-BR'))}.</div>
      </div>
      <div class="grid">
        <div class="campo"><div class="rotulo">Profissional</div><div class="valor">${escapeHtml(profissionalFiltro || '—')}</div></div>
        <div class="campo"><div class="rotulo">Registros na lista</div><div class="valor">${atendimentos.length}</div></div>
        <div class="campo"><div class="rotulo">Data início</div><div class="valor">${escapeHtml(filtros.dataInicio ? fmtData(filtros.dataInicio) : 'Não filtrado')}</div></div>
        <div class="campo"><div class="rotulo">Data fim</div><div class="valor">${escapeHtml(filtros.dataFim ? fmtData(filtros.dataFim) : 'Não filtrado')}</div></div>
      </div>
      <table>
        <thead>
          <tr><th>Data</th><th>Hora</th><th>Usuário/família</th><th>Etapa</th><th>Área</th><th>Profissional</th><th>Situação</th></tr>
        </thead>
        <tbody>${linhas || '<tr><td colspan="7">Nenhum atendimento encontrado.</td></tr>'}</tbody>
      </table>
      <div class="assinatura">
        <div class="linha">Assinatura do profissional</div>
        <div class="linha">Coordenação / conferência</div>
      </div>
      <div class="rodape">Documento gerado pelo AGENDO Integra · TEAcolher.</div>
    `)
  }

  // Busca TODOS os atendimentos do projeto, paginando de 1000 em 1000, sem depender do limite
  // usado no carregamento normal da tela. Sem isso, projetos com mais de 1000 atendimentos no
  // total (bem provável em 11 meses de TEAcolher) teriam relatório e cronograma incompletos,
  // cortando justamente os meses mais antigos sem nenhum aviso.
  async function buscarTodosParaRelatorio() {
    const TAMANHO_PAGINA = 1000
    let pagina = 0
    let tudo = []
    while (true) {
      let q = supabase.from('atendimentos').select('*')
        .order('data_atend', { ascending: true })
        .order('id', { ascending: true })
        .range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1)
      if (projetoTeacolherId) q = q.eq('projeto_id', parseInt(projetoTeacolherId))
      const { data, error } = await q
      if (error) throw error
      tudo = tudo.concat(data || [])
      if (!data || data.length < TAMANHO_PAGINA) break
      pagina++
      if (pagina > 50) break // segurança: nunca busca mais que 50 mil registros de uma vez
    }
    return tudo
  }

  async function gerarRelatorioCompleto() {
    setGerandoRelatorio(true)
    setMsg('')
    try {
      const tudo = await buscarTodosParaRelatorio()
      gerarPDFAtendimentos({ lista: tudo }, 'Todo o histórico do Projeto TEAcolher')
    } catch (e) {
      setMsg('Erro ao gerar relatório: ' + e.message)
    } finally {
      setGerandoRelatorio(false)
    }
  }

  async function gerarCronograma() {
    setGerandoRelatorio(true)
    setMsg('')
    try {
      const tudo = await buscarTodosParaRelatorio()
      // Sem a data oficial de início do convênio, o cronograma usa os meses que aparecem nos
      // próprios atendimentos. Se você souber a data exata (ex.: '2026-02-01'), me diga e eu
      // troco esse valor pra bater 100% com o Mês 1 oficial do contrato.
      gerarPDFCronogramaTeacolher(tudo)
    } catch (e) {
      setMsg('Erro ao gerar cronograma: ' + e.message)
    } finally {
      setGerandoRelatorio(false)
    }
  }

  function imprimirFicha(a) {
    const prof = profissional(a.profissional_id)
    const campo = (rotulo, valor) => `
      <div class="campo">
        <div class="rotulo">${escapeHtml(rotulo)}</div>
        <div class="valor">${escapeHtml(valor || '—')}</div>
      </div>
    `

    abrirJanelaImpressao('Ficha de atendimento TEAcolher', `
      <div class="topo">
        <div class="org">Associação TEIAA · Projeto TEAcolher</div>
        <h1>Ficha de atendimento TEAcolher</h1>
        <div class="sub">Registro individual para agenda, execução técnica e prestação de contas.</div>
      </div>
      <div class="grid">
        ${campo('Data', fmtData(a.data_atend))}
        ${campo('Horário', `${fmtHora(a.hora_inicio)} às ${fmtHora(a.hora_fim)}`)}
        ${campo('Usuário/família', nomeAtendido(a))}
        ${campo('Profissional responsável', prof ? `${prof.nome} — ${prof.funcao || ''}` : '—')}
        ${campo('Etapa do fluxo', etapaAtendimento(a))}
        ${campo('Área / modalidade', `${a.area_atendimento || '—'} · ${a.modalidade_atendimento || '—'}`)}
        ${campo('Situação', a.situacao)}
        ${campo('Comparecimento', a.comparecimento)}
        ${campo('Duração', a.duracao_minutos ? `${a.duracao_minutos} minutos` : '—')}
        ${campo('Participantes', a.participantes_atendimento)}
      </div>
      ${campo('Objetivo / observação do agendamento', a.objetivo_atendimento || a.tema || a.descricao)}
      ${campo('Demanda identificada', a.demanda_identificada)}
      ${campo('Registro técnico / evolução', a.registro_tecnico)}
      ${campo('Orientação prestada à família', a.orientacao_familia)}
      ${campo('Devolutiva à família', a.devolutiva_familia)}
      ${campo('Encaminhamento', [a.tipo_encaminhamento, a.rede_encaminhada, a.encaminhamentos].filter(Boolean).join(' · '))}
      ${campo('Próxima ação', a.proxima_acao)}
      ${campo('Desfecho TEAcolher', a.desfecho_teacolher)}
      <div class="assinatura">
        <div class="linha">Assinatura do profissional</div>
        <div class="linha">Assinatura do responsável / conferência</div>
      </div>
      <div class="rodape">Documento gerado pelo AGENDO Integra · TEAcolher.</div>
    `)
  }

  function rolarParaFormulario() {
    setTimeout(() => {
      const el = document.getElementById('form-atendimento-teacolher')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }

  function abrirNovoAgendamento(teaId = projetoTeacolherId) {
    setForm({ ...FORM_VAZIO, projeto_id: teaId || '' })
    setEditando(null)
    setModoResultado(false)
    setMostrarForm(true)
    rolarParaFormulario()
  }

  function fecharForm() {
    setForm({ ...FORM_VAZIO, projeto_id: projetoTeacolherId || '' })
    setEditando(null)
    setModoResultado(false)
    setMostrarForm(false)
    setRecorrencia('unica')
    setDataFimRecorrencia('')
  }

  function preencherUsuario(id) {
    const u = usuariosAtendidos.find(x => String(x.id) === String(id))
    setForm(f => ({ ...f, usuario_atendido_id: id, pessoa_atendida: u?.nome || f.pessoa_atendida }))
  }

  function montarForm(a, finalizar = false) {
    if (finalizar && isTecnico && !atendimentoDoTecnico(a)) {
      setMsg('Erro: técnico só pode finalizar atendimento direcionado a ele.')
      return
    }
    const etapa = a.etapa_fluxo || a.tipo_atend || 'Acolhimento inicial'
    setForm({
      data_atend: a.data_atend || new Date().toISOString().slice(0, 10),
      hora_inicio: a.hora_inicio ? String(a.hora_inicio).slice(0, 5) : '',
      hora_fim: a.hora_fim ? String(a.hora_fim).slice(0, 5) : '',
      projeto_id: a.projeto_id || projetoTeacolherId || '',
      usuario_atendido_id: a.usuario_atendido_id || '',
      pessoa_atendida: a.pessoa_atendida || nomeUsuario(a.usuario_atendido_id) || '',
      profissional_id: a.profissional_id || '',
      equipe_ids: (a.equipe_ids || []).map(String),
      etapa_fluxo: etapa,
      origem_demanda: a.origem_demanda || 'Demanda espontânea',
      objetivo_atendimento: a.objetivo_atendimento || a.tema || '',
      area_atendimento: a.area_atendimento || 'Interdisciplinar',
      modalidade_atendimento: a.modalidade_atendimento || 'Acolhimento',
      situacao: finalizar && ehAgendado(a) ? 'realizado' : (a.situacao || 'agendado'),
      descricao: a.descricao || '',
      qtd_participantes: a.qtd_participantes || 1,
      publico_participante: a.publico_participante || ['Pessoa com TEA / PCD', 'Famílias / responsáveis'],
      comparecimento: finalizar && !a.comparecimento ? 'Compareceu' : (a.comparecimento || ''),
      duracao_minutos: a.duracao_minutos || '',
      participantes_atendimento: a.participantes_atendimento || 'Usuário e responsável/família',
      demanda_identificada: a.demanda_identificada || '',
      registro_tecnico: a.registro_tecnico || a.descricao || '',
      orientacao_familia: a.orientacao_familia || '',
      devolutiva_familia: a.devolutiva_familia || 'Não registrada',
      necessita_acompanhamento: a.necessita_acompanhamento || 'Sim',
      responsavel_presente: a.responsavel_presente || '',
      tipo_encaminhamento: a.tipo_encaminhamento || 'Sem encaminhamento externo',
      rede_encaminhada: a.rede_encaminhada || a.orgao_encaminhamento || 'Não se aplica',
      encaminhamentos: a.encaminhamentos || '',
      orgao_encaminhamento: a.orgao_encaminhamento || '',
      proxima_acao: a.proxima_acao || '',
      desfecho_teacolher: a.desfecho_teacolher || 'Em acompanhamento',
      observacoes: a.observacoes || '',
    })
    setEditando(a.id)
    setModoResultado(finalizar || !ehAgendado(a))
    setMostrarForm(true)
    setMsg(finalizar ? 'Formulário de finalização aberto abaixo da lista.' : 'Formulário de edição aberto abaixo da lista.')
    rolarParaFormulario()
  }

  function togglePublico(pub) {
    setForm(f => ({
      ...f,
      publico_participante: f.publico_participante.includes(pub)
        ? f.publico_participante.filter(p => p !== pub)
        : [...f.publico_participante, pub],
    }))
  }

  function toggleEquipe(id) {
    const sid = String(id)
    setForm(f => ({
      ...f,
      equipe_ids: f.equipe_ids.includes(sid) ? f.equipe_ids.filter(e => e !== sid) : [...f.equipe_ids, sid],
    }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!modoResultado && !podeAgendar) {
      setMsg('Erro: seu perfil não tem permissão para criar ou editar agendamento.')
      return
    }
    if (modoResultado && !podeFinalizar) {
      setMsg('Erro: seu perfil não tem permissão para finalizar atendimento técnico.')
      return
    }
    if (modoResultado && isTecnico && !tecnicoEquipeId) {
      setMsg('Erro: seu perfil técnico não está vinculado a um profissional da equipe.')
      return
    }
    if (modoResultado && isTecnico && String(form.profissional_id) !== String(tecnicoEquipeId)) {
      setMsg('Erro: técnico só pode finalizar atendimento direcionado a ele.')
      return
    }

    setSalvando(true)

    const descricaoPadrao = modoResultado ? 'Atendimento finalizado.' : 'Atendimento agendado.'
    const registroFinal = (form.registro_tecnico || form.descricao || '').trim()
    const objetivo = (form.objetivo_atendimento || form.descricao || '').trim()
    const redeDestino = form.rede_encaminhada && form.rede_encaminhada !== 'Não se aplica'
      ? form.rede_encaminhada
      : (form.orgao_encaminhamento || '')

    // Situação final derivada do comparecimento — sem campo separado pra não duplicar
    const situacaoFinal = modoResultado
      ? (['Faltou','Falta justificada'].includes(form.comparecimento) ? 'reagendado'
        : form.comparecimento === 'Cancelado' ? 'cancelado'
        : 'realizado')
      : (form.situacao || 'agendado')

    const dados = {
      data_atend: form.data_atend,
      hora_inicio: form.hora_inicio || null,
      hora_fim: form.hora_fim || null,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : (projetoTeacolherId ? parseInt(projetoTeacolherId) : null),
      usuario_atendido_id: form.usuario_atendido_id ? parseInt(form.usuario_atendido_id) : null,
      pessoa_atendida: form.pessoa_atendida || null,
      profissional_id: form.profissional_id ? parseInt(form.profissional_id) : null,
      equipe_ids: modoResultado ? form.equipe_ids.map(id => parseInt(id)) : [],
      tipo_atend: form.etapa_fluxo || 'Atendimento TEAcolher',
      tema: objetivo || 'Atendimento TEAcolher',
      etapa_fluxo: form.etapa_fluxo || null,
      origem_demanda: form.origem_demanda || null,
      objetivo_atendimento: objetivo || null,
      area_atendimento: form.area_atendimento || null,
      modalidade_atendimento: form.modalidade_atendimento || null,
      situacao: situacaoFinal,
      descricao: (modoResultado ? registroFinal : objetivo) || descricaoPadrao,
      qtd_participantes: form.qtd_participantes ? parseInt(form.qtd_participantes) : 1,
      publico_participante: form.publico_participante || [],
      comparecimento: modoResultado ? (form.comparecimento || null) : null,
      duracao_minutos: modoResultado && form.duracao_minutos ? parseInt(form.duracao_minutos) : null,
      participantes_atendimento: modoResultado ? (form.participantes_atendimento || null) : null,
      demanda_identificada: modoResultado ? (form.demanda_identificada || null) : null,
      registro_tecnico: modoResultado ? (registroFinal || null) : null,
      orientacao_familia: modoResultado ? (form.orientacao_familia || null) : null,
      devolutiva_familia: modoResultado ? (form.devolutiva_familia || null) : null,
      necessita_acompanhamento: modoResultado ? (form.necessita_acompanhamento || null) : null,
      responsavel_presente: modoResultado ? (form.responsavel_presente || null) : null,
      tipo_encaminhamento: modoResultado ? (form.tipo_encaminhamento || 'Sem encaminhamento externo') : null,
      rede_encaminhada: modoResultado ? (form.rede_encaminhada || 'Não se aplica') : null,
      encaminhamentos: modoResultado ? (form.encaminhamentos || '') : '',
      orgao_encaminhamento: modoResultado ? redeDestino : '',
      proxima_acao: modoResultado ? (form.proxima_acao || null) : null,
      desfecho_teacolher: modoResultado ? (form.desfecho_teacolher || null) : null,
      observacoes: form.observacoes || null,
    }

    let error, data
    if (editando) {
      ;({ error, data } = await supabase.from('atendimentos').update(dados).eq('id', editando).select())
    } else if (!modoResultado && recorrencia !== 'unica' && dataFimRecorrencia) {
      // Agendamento recorrente: cria um registro pra cada data, pulando feriados
      const datas = gerarDatasRecorrentes(form.data_atend, recorrencia, dataFimRecorrencia)
      if (datas.length === 0) {
        setMsg('Nenhuma data disponível no período selecionado (verifique feriados e datas).')
        setSalvando(false)
        return
      }
      if (datas.length > 100) {
        setMsg(`Muitos atendimentos (${datas.length}). Reduza o período ou mude a recorrência.`)
        setSalvando(false)
        return
      }
      const registros = datas.map(d => ({ ...dados, data_atend: d }))
      ;({ error, data } = await supabase.from('atendimentos').insert(registros).select())
      if (!error) setMsg(`${datas.length} atendimentos criados com sucesso (${recorrencia}, pulando feriados).`)
    } else {
      ;({ error, data } = await supabase.from('atendimentos').insert(dados).select())
    }

    if (error) setMsg('Erro ao salvar: ' + error.message + ' | Código: ' + error.code)
    else if (!data || data.length === 0) setMsg('Erro: o registro não foi salvo. Verifique permissões.')
    else {
      setMsg(modoResultado ? 'Atendimento finalizado e registrado para prestação de contas técnica.' : 'Agendamento TEAcolher salvo com sucesso.')
      fecharForm()
      const filtrosDepois = modoResultado ? { dataInicio:'', dataFim:'', profissional_id:'', situacao:'' } : filtros
      if (modoResultado) setFiltros(filtrosDepois)
      carregar(filtrosDepois, projetoTeacolherId)
    }
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 5000)
  }

  async function excluir(id) {
    await supabase.from('atendimentos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar(filtros, projetoTeacolherId)
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const baseMetricas = todosAtendimentos.length ? todosAtendimentos : atendimentos
  const totalAgendados = baseMetricas.filter(a => ['agendado', 'reagendado'].includes(a.situacao)).length
  const hojeAgendados = baseMetricas.filter(a => a.data_atend === hoje && ['agendado', 'reagendado'].includes(a.situacao)).length
  const totalFinalizar = baseMetricas.filter(a => a.data_atend <= hoje && ['agendado', 'reagendado'].includes(a.situacao)).length
  const totalRealizados = baseMetricas.filter(a => a.situacao === 'realizado').length
  const faltasRemarcacoes = baseMetricas.filter(a => ['Faltou', 'Falta justificada', 'Remarcado', 'Cancelado'].includes(a.comparecimento) || ['reagendado', 'cancelado'].includes(a.situacao)).length
  const totalEncaminhados = baseMetricas.filter(a =>
    (a.tipo_encaminhamento && a.tipo_encaminhamento !== 'Sem encaminhamento externo') ||
    (a.encaminhamentos || '').trim() ||
    (a.rede_encaminhada && a.rede_encaminhada !== 'Não se aplica') ||
    (a.orgao_encaminhamento || '').trim()
  ).length
  const totalDevolutivas = baseMetricas.filter(a => String(a.devolutiva_familia || '').toLowerCase().includes('sim') || String(a.etapa_fluxo || '').toLowerCase().includes('devolutiva')).length
  const familiasAcompanhadas = new Set(baseMetricas.filter(a => a.usuario_atendido_id).map(a => String(a.usuario_atendido_id))).size

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:isMobile ? '1fr' : cols, gap:10, marginBottom:10 }),
    badge: (bg, cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:600, background:bg, color:cor }),
    btn: (bg, cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.035em', color:ESCURO }}>
            {isTecnico ? 'Minha agenda TEAcolher' : 'Agenda e Execução TEAcolher'}
          </div>
          <div style={{ fontSize:12.5, color:'#6B7280', maxWidth:820 }}>
            {isTecnico
              ? 'Aqui aparecem somente os atendimentos direcionados a você. Finalize apenas sua própria agenda técnica.'
              : 'Operacional agenda/remarca. Técnico finaliza o registro técnico para prestação de contas.'}
          </div>
        </div>
        {podeAgendar && (
          <button onClick={() => mostrarForm ? fecharForm() : abrirNovoAgendamento()} style={s.btn(mostrarForm ? '#F1EFE8' : AZUL, mostrarForm ? '#5F5E5A' : '#fff')}>
            {mostrarForm ? 'Cancelar' : '+ Agendar atendimento'}
          </button>
        )}
        {isTecnico && !mostrarForm && (
          <button onClick={() => { const f={...filtros, situacao:'agendado'}; setFiltros(f); carregar(f, projetoTeacolherId) }} style={s.btn(LARANJA)}>
            Ver meus atendimentos pendentes
          </button>
        )}
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {isTecnico && !tecnicoEquipeId && (
        <div style={{ fontSize:12, padding:'10px 12px', borderRadius:10, marginBottom:'1rem', background:'#FEF2F2', color:'#A32D2D', border:'0.5px solid #FECACA' }}>
          Seu usuário técnico ainda não está vinculado a um profissional da equipe. Peça ao administrador para preencher o campo equipe_id no cadastro do usuário.
        </div>
      )}


      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:'1rem' }}>
        {[
          { label:'Famílias acompanhadas', val:familiasAcompanhadas, cor:ESCURO },
          { label:'Agendados', val:totalAgendados, cor:AZUL },
          { label:'Hoje', val:hojeAgendados, cor:ESCURO },
          { label:'A finalizar', val:totalFinalizar, cor:LARANJA },
          { label:'Realizados', val:totalRealizados, cor:VERDE },
          { label:'Faltas/remarcações', val:faltasRemarcacoes, cor:VERMELHO },
          { label:'Encaminhados', val:totalEncaminhados, cor:'#854F0B' },
          { label:'Devolutivas', val:totalDevolutivas, cor:'#3B6D11' },
        ].map(m => (
          <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      <div style={{ ...s.card, marginBottom:'1rem' }}>
        <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Filtros da agenda e execução</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:8 }}>
          <div>
            <label style={s.label}>Data início</label>
            <input type="date" value={filtros.dataInicio} onChange={e=>setFiltros(f=>({...f,dataInicio:e.target.value}))} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Data fim</label>
            <input type="date" value={filtros.dataFim} onChange={e=>setFiltros(f=>({...f,dataFim:e.target.value}))} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Profissional</label>
            {isTecnico ? (
              <input value={profissional(tecnicoEquipeId)?.nome || 'Minha agenda'} readOnly style={{ ...s.input, background:'#F8FAFC', color:ESCURO, fontWeight:600 }} />
            ) : (
              <select value={filtros.profissional_id} onChange={e=>setFiltros(f=>({...f,profissional_id:e.target.value}))} style={s.input}>
                <option value="">Todos</option>
                {equipeTEAcolher.map(e => <option key={e.id} value={e.id}>{e.nome.split(' ')[0]} {e.nome.split(' ')[1] || ''}</option>)}
              </select>
            )}
          </div>
          <div>
            <label style={s.label}>Situação</label>
            <select value={filtros.situacao} onChange={e=>setFiltros(f=>({...f,situacao:e.target.value}))} style={s.input}>
              <option value="">Todas</option>
              {SITUACOES.map(sit => <option key={sit} value={sit}>{sit.charAt(0).toUpperCase()+sit.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={() => carregar(filtros, projetoTeacolherId)} style={s.btn(AZUL)}>Filtrar</button>
          <button onClick={() => { const limpa = { dataInicio:'', dataFim:'', profissional_id:'', situacao:'' }; setFiltros(limpa); carregar(limpa, projetoTeacolherId) }} style={s.btn('#F1EFE8', '#5F5E5A')}>Limpar filtros</button>
        </div>
      </div>

      {isAdmin && (
        <div style={{ ...s.card, marginBottom:'1rem', border:'1px solid #D9D6CC', background:'#FAFAF7' }}>
          <div style={{ fontSize:15, fontWeight:900, color:ESCURO, marginBottom:2 }}>Relatórios e prestação de contas — Projeto TEAcolher</div>
          <div style={{ fontSize:11.5, color:'#888780', marginBottom:10 }}>Filtre por período, profissional ou usuário antes de gerar. Sempre puxa o histórico completo, independente dos filtros da agenda acima.</div>
          <div style={s.grupo('1fr 1fr 1fr 1fr')}>
            <div>
              <label style={s.label}>Período</label>
              <select value={filtroRelatorio.tipo} onChange={e=>{
                const tipo = e.target.value
                const hoje = new Date()
                let ini='', fim=''
                if (tipo === 'mensal') { ini = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`; fim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10) }
                else if (tipo === 'bimestral') { const m = hoje.getMonth()-1; const d = new Date(hoje.getFullYear(), m < 0 ? 11 : m, 1); ini = d.toISOString().slice(0,10); fim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10) }
                else if (tipo === 'trimestral') { const m = hoje.getMonth()-2; const d = new Date(hoje.getFullYear(), m < 0 ? 12+m : m, 1); ini = d.toISOString().slice(0,10); fim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10) }
                else if (tipo === 'semestral') { const m = hoje.getMonth()-5; const d = new Date(hoje.getFullYear(), m < 0 ? 12+m : m, 1); ini = d.toISOString().slice(0,10); fim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10) }
                else if (tipo === 'anual') { ini = `${hoje.getFullYear()}-01-01`; fim = `${hoje.getFullYear()}-12-31` }
                setFiltroRelatorio(f=>({...f, tipo, dataInicio:ini, dataFim:fim}))
              }} style={s.input}>
                <option value="completo">Completo (todo o histórico)</option>
                <option value="mensal">Este mês</option>
                <option value="bimestral">Últimos 2 meses</option>
                <option value="trimestral">Últimos 3 meses</option>
                <option value="semestral">Últimos 6 meses</option>
                <option value="anual">Este ano</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            {filtroRelatorio.tipo === 'personalizado' && <>
              <div><label style={s.label}>De</label><input type="date" value={filtroRelatorio.dataInicio} onChange={e=>setFiltroRelatorio(f=>({...f,dataInicio:e.target.value}))} style={s.input} /></div>
              <div><label style={s.label}>Até</label><input type="date" value={filtroRelatorio.dataFim} onChange={e=>setFiltroRelatorio(f=>({...f,dataFim:e.target.value}))} style={s.input} /></div>
            </>}
            <div>
              <label style={s.label}>Profissional</label>
              <select value={filtroRelatorio.profissional_id} onChange={e=>setFiltroRelatorio(f=>({...f,profissional_id:e.target.value}))} style={s.input}>
                <option value="">Todos os profissionais</option>
                {equipeTEAcolher.map(e=><option key={e.id} value={e.id}>{e.nome.split(' ').slice(0,2).join(' ')} — {e.funcao}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Usuário/família</label>
              <select value={filtroRelatorio.usuario_id} onChange={e=>setFiltroRelatorio(f=>({...f,usuario_id:e.target.value}))} style={s.input}>
                <option value="">Todos os usuários</option>
                {usuariosTEAcolher.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
            <button onClick={async () => {
              setGerandoRelatorio(true); setMsg('')
              try {
                let lista = await buscarTodosParaRelatorio()
                if (filtroRelatorio.dataInicio) lista = lista.filter(a => a.data_atend >= filtroRelatorio.dataInicio)
                if (filtroRelatorio.dataFim) lista = lista.filter(a => a.data_atend <= filtroRelatorio.dataFim)
                if (filtroRelatorio.profissional_id) lista = lista.filter(a => String(a.profissional_id) === String(filtroRelatorio.profissional_id))
                if (filtroRelatorio.usuario_id) lista = lista.filter(a => String(a.usuario_atendido_id) === String(filtroRelatorio.usuario_id))
                const periodoLabel = filtroRelatorio.dataInicio && filtroRelatorio.dataFim
                  ? `${fmtData(filtroRelatorio.dataInicio)} a ${fmtData(filtroRelatorio.dataFim)}`
                  : filtroRelatorio.tipo === 'completo' ? 'Todo o histórico' : filtroRelatorio.tipo
                gerarPDFAtendimentos({ lista }, periodoLabel)
              } catch(e) { setMsg('Erro: ' + e.message) } finally { setGerandoRelatorio(false) }
            }} disabled={gerandoRelatorio} style={s.btn(gerandoRelatorio ? '#D3D1C7' : '#06344F')}>
              {gerandoRelatorio ? 'Gerando...' : 'Relatório TEAcolher'}
            </button>
            <button onClick={gerarCronograma} disabled={gerandoRelatorio} style={s.btn(gerandoRelatorio ? '#D3D1C7' : '#0E7EA8')}>
              {gerandoRelatorio ? 'Gerando...' : 'Cronograma de execução (ações x meses)'}
            </button>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, gap:8, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:ESCURO }}>
              {isTecnico ? `${atendimentos.length} registros na minha agenda` : `${atendimentos.length} registros TEAcolher`}
            </div>
            {(filtros.situacao || filtros.profissional_id || filtros.dataInicio || filtros.dataFim) && (
              <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>
                {isTecnico ? 'Lista filtrada dentro da sua agenda técnica.' : 'Lista filtrada. Os cards acima contam todos os atendimentos do TEAcolher.'}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={imprimirAgenda} style={s.btn('#F1EFE8', '#5F5E5A')}>
              {isTecnico ? 'Imprimir minha agenda' : 'Imprimir lista'}
            </button>
            {podeAgendar && <button onClick={() => abrirNovoAgendamento()} style={s.btn(AZUL)}>+ Agendar atendimento</button>}
          </div>
        </div>

        {loading ? (
          <div style={{ padding:'1.25rem', color:'#888780', fontSize:12 }}>Carregando agenda...</div>
        ) : atendimentos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#2C2C2A', marginBottom:4 }}>Nenhum atendimento TEAcolher encontrado nesta lista</div>
            <div style={{ fontSize:12, color:'#888780', maxWidth:560, margin:'0 auto' }}>
              {isTecnico
                ? (filtros.situacao ? `Você está filtrando por "${filtros.situacao}" dentro da sua agenda.` : 'Não há atendimentos direcionados a você nesta lista.')
                : (filtros.situacao ? `Você está filtrando por "${filtros.situacao}". Limpe os filtros para ver todos.` : 'Comece agendando. Depois, na lista, use “Finalizar atendimento” para registrar o resultado técnico.')}
            </div>
            {podeAgendar && <button onClick={() => abrirNovoAgendamento()} style={{ marginTop:12, padding:'8px 20px', fontSize:12, fontWeight:700, borderRadius:8, border:'none', background:AZUL, color:'#fff', cursor:'pointer' }}>+ Agendar atendimento</button>}
          </div>
        ) : (
          <div style={{ maxHeight:560, overflowY:'auto', overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>{['Data', 'Hora', 'Usuário/família', 'Etapa', ...(!isTecnico?['Área','Profissional']:[]), 'Situação', 'Desfecho', 'Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {atendimentos.map((a, i) => {
                  const [bg, cor] = SITUACAO_COR[a.situacao] || ['#F1EFE8', '#888780']
                  return (
                    <tr key={a.id} style={{ background:i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                      <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtHora(a.hora_inicio)}</td>
                      <td style={{ ...s.td, fontWeight:600, maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nomeAtendido(a)}</td>
                      <td style={{ ...s.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{etapaAtendimento(a)}</td>
                      {!isTecnico && <td style={{ ...s.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.area_atendimento || '—'}</td>}
                      {!isTecnico && <td style={{ ...s.td, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profissionalNome(a.profissional_id)}</td>}
                      <td style={s.td}><span style={s.badge(bg, cor)}>{a.situacao}</span></td>
                      <td style={{ ...s.td, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.desfecho_teacolher || '—'}</td>
                      <td style={s.td}>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {podeFinalizar && podeAtuarNoAtendimento(a) && ehAgendado(a) && <button onClick={() => montarForm(a, true)} style={s.btn(VERDE)}>Finalizar atendimento</button>}
                          {podeEditarAgendamento && ehAgendado(a) && <button onClick={() => montarForm(a, false)} style={s.btn('#F1EFE8', '#5F5E5A')}>Editar agenda</button>}
                          {podeEditarRegistro && podeAtuarNoAtendimento(a) && !ehAgendado(a) && <button onClick={() => montarForm(a, true)} style={s.btn('#F1EFE8', '#5F5E5A')}>Editar registro</button>}
                          <button onClick={() => imprimirFicha(a)} style={s.btn('#EEF2F7', '#334155')}>Imprimir ficha</button>
                          {podeExcluir && <button onClick={() => setConfirmandoExcluir(a.id)} style={s.btn('#FCEBEB', '#A32D2D')}>Excluir</button>}
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

      {mostrarForm && podeAcessarFormulario && (
        <div id="form-atendimento-teacolher" style={{ ...s.card, borderColor: modoResultado ? '#C0DD97' : 'rgba(14,126,168,0.35)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ ...s.badge(modoResultado ? '#EAF3DE' : '#E6F1FB', modoResultado ? '#3B6D11' : '#185FA5') }}>
              {modoResultado ? '2. Finalização técnica' : '1. Agendamento'}
            </span>
            <div style={{ fontSize:14, fontWeight:700, color:ESCURO }}>
              {modoResultado ? 'Registrar execução do atendimento' : 'Agendar atendimento TEAcolher'}
            </div>
          </div>

          <div style={{ fontSize:11.5, color:'#5F5E5A', marginBottom:12 }}>
            {modoResultado
              ? 'Nesta etapa entram os dados que provam a execução: comparecimento, evolução técnica, orientação familiar, encaminhamentos, devolutiva e desfecho.'
              : 'Nesta etapa entram somente os dados de agenda: quem será atendido, quando, por qual profissional, etapa do fluxo, origem da demanda e objetivo.'}
          </div>

          <form onSubmit={salvar}>
            <div style={{ ...s.card, background:'rgba(14,126,168,0.05)', boxShadow:'none', borderColor:'rgba(14,126,168,0.18)' }}>
              <div style={{ fontSize:12, fontWeight:700, color:ESCURO, marginBottom:8 }}>Dados do agendamento</div>
              <div style={s.grupo('1fr 1fr 1fr 1fr')}>
                <div>
                  <label style={s.label}>Projeto</label>
                  <input value="Projeto TEAcolher" readOnly style={{ ...s.input, background:'#F8FAFC', color:ESCURO, fontWeight:600 }} />
                </div>
                <div>
                  <label style={s.label}>Data *</label>
                  <input type="date" value={form.data_atend} onChange={e=>setForm(f=>({...f,data_atend:e.target.value}))} style={s.input} required />
                </div>
                <div>
                  <label style={s.label}>Hora início</label>
                  <input type="time" value={form.hora_inicio} onChange={e=>setForm(f=>({...f,hora_inicio:e.target.value}))} style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Hora fim prevista</label>
                  <input type="time" value={form.hora_fim} onChange={e=>setForm(f=>({...f,hora_fim:e.target.value}))} style={s.input} />
                </div>
              </div>

              {/* situação fica sempre 'agendado' ao criar — não precisa de campo */}

              <div style={s.grupo('1.2fr 1fr')}>
                <div>
                  <label style={s.label}>Usuário/família cadastrada *</label>
                  <select value={form.usuario_atendido_id} onChange={e=>preencherUsuario(e.target.value)} style={s.input} required>
                    <option value="">Selecione o usuário atendido...</option>
                    {usuariosTEAcolher.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Nome livre / família atendida</label>
                  <input value={form.pessoa_atendida} onChange={e=>setForm(f=>({...f,pessoa_atendida:e.target.value}))} style={s.input} placeholder="Preenche automático ao selecionar" />
                </div>
              </div>

              <div style={s.grupo('1fr 1fr 1fr')}>
                <div>
                  <label style={s.label}>Profissional responsável *</label>
                  <select
                    value={form.profissional_id}
                    onChange={e => {
                      const id = e.target.value
                      const prof = equipeTEAcolher.find(x => String(x.id) === String(id))
                      const areaSugerida = prof ? areaPelaFuncao(prof.funcao) : null
                      setForm(f => ({ ...f, profissional_id: id, ...(areaSugerida ? { area_atendimento: areaSugerida } : {}) }))
                    }}
                    style={{ ...s.input, background:modoResultado && isTecnico ? '#F8FAFC' : '#fff', color:modoResultado && isTecnico ? '#334155' : undefined }}
                    required
                    disabled={modoResultado && isTecnico}
                  >
                    <option value="">Selecione...</option>
                    {(isTecnico ? equipeTEAcolher.filter(e => String(e.id) === String(tecnicoEquipeId)) : equipeTEAcolher).map(e => <option key={e.id} value={e.id}>{e.nome} — {e.funcao}</option>)}
                  </select>
                  {modoResultado && isTecnico && <div style={{ fontSize:10.5, color:'#64748B', marginTop:3 }}>Travado no profissional logado.</div>}
                </div>
                <div>
                  <label style={s.label}>Área / especialidade *</label>
                  <select value={form.area_atendimento} onChange={e=>setForm(f=>({...f,area_atendimento:e.target.value}))} style={s.input} required>
                    {AREAS_TEACOLHER.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <div style={{ fontSize:10.5, color:'#94A3B8', marginTop:3 }}>Preenchida automaticamente pela função do profissional. Pode trocar se precisar.</div>
                </div>
                <div>
                  <label style={s.label}>Modalidade *</label>
                  <select value={form.modalidade_atendimento} onChange={e=>setForm(f=>({...f,modalidade_atendimento:e.target.value}))} style={s.input} required>
                    {MODALIDADES_TEACOLHER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div style={s.grupo('1fr 1fr')}>
                <div>
                  <label style={s.label}>Etapa do fluxo TEAcolher *</label>
                  <select value={form.etapa_fluxo} onChange={e=>setForm(f=>({...f,etapa_fluxo:e.target.value}))} style={s.input} required>
                    {ETAPAS_FLUXO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Origem da demanda</label>
                  <select value={form.origem_demanda} onChange={e=>setForm(f=>({...f,origem_demanda:e.target.value}))} style={s.input}>
                    {ORIGENS_DEMANDA.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {!modoResultado && (
                <div>
                  <label style={s.label}>Objetivo/observação do agendamento</label>
                  <textarea value={form.objetivo_atendimento} onChange={e=>setForm(f=>({...f,objetivo_atendimento:e.target.value, descricao:e.target.value}))} rows={3} style={{ ...s.input, resize:'vertical' }} placeholder="Ex: acolhimento inicial, avaliação interdisciplinar, devolutiva familiar, grupo de orientação, oficina comunitária..." />
                </div>
              )}

              {!modoResultado && !editando && (
                <div style={{ background:'rgba(14,126,168,0.06)', borderRadius:10, padding:'10px 12px', marginTop:4 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:ESCURO, marginBottom:8 }}>Repetição do agendamento</div>
                  <div style={s.grupo('1fr 1fr')}>
                    <div>
                      <label style={s.label}>Frequência</label>
                      <select value={recorrencia} onChange={e=>setRecorrencia(e.target.value)} style={s.input}>
                        <option value="unica">Única (padrão)</option>
                        <option value="semanal">Semanal — toda semana no mesmo dia</option>
                        <option value="quinzenal">Quinzenal — a cada 2 semanas</option>
                        <option value="mensal">Mensal — mesmo dia todo mês</option>
                      </select>
                    </div>
                    {recorrencia !== 'unica' && (
                      <div>
                        <label style={s.label}>Repetir até *</label>
                        <input type="date" value={dataFimRecorrencia} onChange={e=>setDataFimRecorrencia(e.target.value)} style={s.input} min={form.data_atend} required />
                        <div style={{ fontSize:10.5, color:'#64748B', marginTop:3 }}>
                          {dataFimRecorrencia && form.data_atend ? (
                            (() => {
                              const datas = gerarDatasRecorrentes(form.data_atend, recorrencia, dataFimRecorrencia)
                              return datas.length > 0
                                ? `${datas.length} atendimento(s) serão criados, pulando feriados nacionais.`
                                : 'Nenhuma data disponível nesse período.'
                            })()
                          ) : 'Escolha até quando repetir.'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {modoResultado && (() => {
              const faltou = ['Faltou', 'Falta justificada'].includes(form.comparecimento)
              // Quando faltou: situação vira cancelado/reagendado automaticamente
              if (faltou && form.situacao === 'realizado') {
                setTimeout(() => setForm(f => ({...f, situacao: 'reagendado'})), 0)
              }
              return (
              <div style={{ ...s.card, background:'rgba(150,193,31,0.08)', borderColor:'rgba(150,193,31,0.35)', boxShadow:'none' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#3B6D11', marginBottom:8 }}>Resultado técnico / prestação de contas</div>

                {/* Linha 1: comparecimento — sempre visível */}
                <div style={s.grupo('1fr 1fr')}>
                  <div>
                    <label style={s.label}>Comparecimento *</label>
                    <select value={form.comparecimento} onChange={e=>setForm(f=>({...f,comparecimento:e.target.value}))} style={s.input} required>
                      <option value="">Selecione...</option>
                      {COMPARECIMENTOS_TEACOLHER.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {!['Faltou','Falta justificada'].includes(form.comparecimento) && (
                    <div>
                      <label style={s.label}>Duração (min)</label>
                      <input type="number" min="1" value={form.duracao_minutos} onChange={e=>setForm(f=>({...f,duracao_minutos:e.target.value}))} style={s.input} placeholder="Ex: 50" />
                    </div>
                  )}
                </div>

                {/* FALTOU: mostra só o motivo */}
                {faltou ? (
                  <div>
                    <div style={{ background:'#FEF3CD', border:'1px solid #F4D03F', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:11.5, color:'#854F0B' }}>
                      Falta registrada. Preencha somente o motivo abaixo — os campos técnicos não são necessários.
                    </div>
                    <label style={s.label}>Motivo da falta / observação</label>
                    <textarea value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} rows={3} style={{ ...s.input, resize:'vertical' }} placeholder="Ex: família avisou que não poderia comparecer, problema de transporte, crise da criança..." />
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom:10 }}>
                      <label style={s.label}>Registro técnico / evolução *</label>
                      <textarea value={form.registro_tecnico} onChange={e=>setForm(f=>({...f,registro_tecnico:e.target.value, descricao:e.target.value}))} rows={4} style={{ ...s.input, resize:'vertical' }} required placeholder="Registre o que foi feito: intervenção, orientação, evolução observada, resposta do usuário..." />
                    </div>

                    <div style={s.grupo('1fr 1fr')}>
                      <div>
                        <label style={s.label}>Orientação prestada à família</label>
                        <textarea value={form.orientacao_familia} onChange={e=>setForm(f=>({...f,orientacao_familia:e.target.value}))} rows={2} style={{ ...s.input, resize:'vertical' }} placeholder="Orientações dadas no atendimento..." />
                      </div>
                      <div>
                        <label style={s.label}>Próxima ação</label>
                        <input value={form.proxima_acao} onChange={e=>setForm(f=>({...f,proxima_acao:e.target.value}))} style={s.input} placeholder="Ex: retorno em 7 dias, encaminhamento, grupo..." />
                      </div>
                    </div>

                    <div style={s.grupo('1fr 1fr')}>
                      <div>
                        <label style={s.label}>Necessita acompanhamento?</label>
                        <select value={form.necessita_acompanhamento} onChange={e=>setForm(f=>({...f,necessita_acompanhamento:e.target.value}))} style={s.input}>
                          {['Sim','Não','Reavaliar','Encaminhado para rede'].map(v=><option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={s.label}>Desfecho TEAcolher</label>
                        <select value={form.desfecho_teacolher} onChange={e=>setForm(f=>({...f,desfecho_teacolher:e.target.value}))} style={s.input}>
                          {DESFECHOS_TEACOLHER.map(v=><option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Encaminhamento — só aparece se marcado */}
                    <div style={{ marginBottom:10 }}>
                      <label style={s.label}>Encaminhamento externo?</label>
                      <select value={form.tipo_encaminhamento} onChange={e=>setForm(f=>({...f,tipo_encaminhamento:e.target.value}))} style={s.input}>
                        {TIPOS_ENCAMINHAMENTO.map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    {form.tipo_encaminhamento && form.tipo_encaminhamento !== 'Sem encaminhamento externo' && (
                      <div style={s.grupo('1fr 1fr')}>
                        <div>
                          <label style={s.label}>Para onde foi encaminhado</label>
                          <select value={form.rede_encaminhada} onChange={e=>setForm(f=>({...f,rede_encaminhada:e.target.value,orgao_encaminhamento:e.target.value}))} style={s.input}>
                            {REDES_DESTINO.map(v=><option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={s.label}>Detalhe do encaminhamento</label>
                          <input value={form.encaminhamentos} onChange={e=>setForm(f=>({...f,encaminhamentos:e.target.value}))} style={s.input} placeholder="UBS, CRAS, escola, avaliação complementar..." />
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom:10 }}>
                      <label style={s.label}>Público participante</label>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {PUBLICOS_TEACOLHER.map(pub => (
                          <button key={pub} type="button" onClick={()=>togglePublico(pub)} style={{ fontSize:10, padding:'3px 8px', borderRadius:6, cursor:'pointer', border:`0.5px solid ${form.publico_participante.includes(pub)?AZUL:'#D3D1C7'}`, background:form.publico_participante.includes(pub)?'#E6F1FB':'#fff', color:form.publico_participante.includes(pub)?'#185FA5':'#5F5E5A' }}>
                            {form.publico_participante.includes(pub)?'✓ ':''}{pub}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )})()}

            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':AZUL)}>
                {salvando ? 'Salvando...' : modoResultado ? 'Salvar execução / finalizar' : editando ? 'Salvar agendamento' : '+ Agendar'}
              </button>
              <button type="button" onClick={fecharForm} style={s.btn('#F1EFE8', '#5F5E5A')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}


      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>Confirmar exclusão</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.5rem' }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir)} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:VERMELHO, color:'#fff', fontWeight:700, cursor:'pointer' }}>Excluir</button>
              <button onClick={() => setConfirmandoExcluir(null)} style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
