import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'

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
  'Acolhimento',
  'Avaliação',
  'Encaminhamento',
  'Devolutiva',
  'Acompanhamento',
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
  'Remarcado',
  'Cancelado',
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
      setTodosAtendimentos(todosRes.data || [])
      setAtendimentos(listaRes.data || [])
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
      situacao: modoResultado ? form.situacao : (form.situacao || 'agendado'),
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
                <tr>{['Data', 'Hora', 'Usuário/família', 'Etapa', 'Área', 'Profissional', 'Situação', 'Desfecho', 'Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
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
                      <td style={{ ...s.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.area_atendimento || '—'}</td>
                      <td style={{ ...s.td, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profissionalNome(a.profissional_id)}</td>
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

              {!modoResultado && (
                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Situação do agendamento</label>
                  <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input}>
                    {['agendado','reagendado','cancelado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              )}

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
            </div>

            {modoResultado && (
              <div style={{ ...s.card, background:'rgba(150,193,31,0.08)', borderColor:'rgba(150,193,31,0.35)', boxShadow:'none' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#3B6D11', marginBottom:8 }}>Resultado técnico / prestação de contas</div>
                <div style={s.grupo('1fr 1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Situação final *</label>
                    <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input} required>
                      {SITUACOES.filter(s => s !== 'agendado').map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Comparecimento *</label>
                    <select value={form.comparecimento} onChange={e=>setForm(f=>({...f,comparecimento:e.target.value}))} style={s.input} required>
                      <option value="">Selecione...</option>
                      {COMPARECIMENTOS_TEACOLHER.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Duração realizada (min)</label>
                    <input type="number" min="1" value={form.duracao_minutos} onChange={e=>setForm(f=>({...f,duracao_minutos:e.target.value}))} style={s.input} placeholder="Ex: 60" />
                  </div>
                  <div>
                    <label style={s.label}>Participantes</label>
                    <input type="number" min="1" value={form.qtd_participantes} onChange={e=>setForm(f=>({...f,qtd_participantes:e.target.value}))} style={s.input} />
                  </div>
                </div>

                <div style={s.grupo('1fr 1fr')}>
                  <div>
                    <label style={s.label}>Quem participou</label>
                    <input value={form.participantes_atendimento} onChange={e=>setForm(f=>({...f,participantes_atendimento:e.target.value}))} style={s.input} placeholder="Ex: usuário, mãe/responsável, família, grupo..." />
                  </div>
                  <div>
                    <label style={s.label}>Responsável presente</label>
                    <input value={form.responsavel_presente} onChange={e=>setForm(f=>({...f,responsavel_presente:e.target.value}))} style={s.input} placeholder="Nome do responsável, se houver" />
                  </div>
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Demanda identificada</label>
                  <textarea value={form.demanda_identificada} onChange={e=>setForm(f=>({...f,demanda_identificada:e.target.value}))} rows={2} style={{ ...s.input, resize:'vertical' }} placeholder="Ex: necessidade de orientação familiar, avaliação interdisciplinar, dificuldade de rotina, encaminhamento de rede..." />
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Registro técnico / evolução *</label>
                  <textarea value={form.registro_tecnico} onChange={e=>setForm(f=>({...f,registro_tecnico:e.target.value, descricao:e.target.value}))} rows={4} style={{ ...s.input, resize:'vertical' }} required placeholder="Registre acolhimento, escuta qualificada, intervenção realizada, orientação à família, evolução observada e encaminhamentos." />
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Orientação prestada à família</label>
                  <textarea value={form.orientacao_familia} onChange={e=>setForm(f=>({...f,orientacao_familia:e.target.value}))} rows={2} style={{ ...s.input, resize:'vertical' }} placeholder="Ex: orientações sobre rotina, acesso à rede, encaminhamentos, continuidade do acompanhamento..." />
                </div>

                <div style={s.grupo('1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Devolutiva à família</label>
                    <select value={form.devolutiva_familia} onChange={e=>setForm(f=>({...f,devolutiva_familia:e.target.value}))} style={s.input}>
                      {['Sim', 'Não', 'Não se aplica', 'Não registrada'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Necessita acompanhamento?</label>
                    <select value={form.necessita_acompanhamento} onChange={e=>setForm(f=>({...f,necessita_acompanhamento:e.target.value}))} style={s.input}>
                      {['Sim', 'Não', 'Reavaliar', 'Encaminhado para rede'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Desfecho TEAcolher</label>
                    <select value={form.desfecho_teacolher} onChange={e=>setForm(f=>({...f,desfecho_teacolher:e.target.value}))} style={s.input}>
                      {DESFECHOS_TEACOLHER.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div style={s.grupo('1fr 1fr')}>
                  <div>
                    <label style={s.label}>Tipo de encaminhamento</label>
                    <select value={form.tipo_encaminhamento} onChange={e=>setForm(f=>({...f,tipo_encaminhamento:e.target.value}))} style={s.input}>
                      {TIPOS_ENCAMINHAMENTO.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Rede encaminhada</label>
                    <select value={form.rede_encaminhada} onChange={e=>setForm(f=>({...f,rede_encaminhada:e.target.value, orgao_encaminhamento:e.target.value}))} style={s.input}>
                      {REDES_DESTINO.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Detalhamento do encaminhamento</label>
                  <input value={form.encaminhamentos} onChange={e=>setForm(f=>({...f,encaminhamentos:e.target.value}))} style={s.input} placeholder="Ex: UBS, CRAS, escola, avaliação complementar, documentação..." />
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Próxima ação</label>
                  <input value={form.proxima_acao} onChange={e=>setForm(f=>({...f,proxima_acao:e.target.value}))} style={s.input} placeholder="Ex: novo atendimento, devolutiva, grupo familiar, encaminhamento para rede..." />
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Público participante</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {PUBLICOS_TEACOLHER.map(pub => (
                      <button key={pub} type="button" onClick={() => togglePublico(pub)} style={{ fontSize:10, padding:'3px 8px', borderRadius:6, cursor:'pointer', border:`0.5px solid ${form.publico_participante.includes(pub)?AZUL:'#D3D1C7'}`, background:form.publico_participante.includes(pub)?'#E6F1FB':'#fff', color:form.publico_participante.includes(pub)?'#185FA5':'#5F5E5A' }}>
                        {form.publico_participante.includes(pub) ? '✓ ' : ''}{pub}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Equipe participante</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, maxHeight:80, overflowY:'auto', overflowX:'auto' }}>
                    {equipeTEAcolher.map(e => (
                      <button key={e.id} type="button" onClick={() => toggleEquipe(String(e.id))} style={{ fontSize:10, padding:'3px 8px', borderRadius:6, cursor:'pointer', border:`0.5px solid ${form.equipe_ids.includes(String(e.id))?VERDE:'#D3D1C7'}`, background:form.equipe_ids.includes(String(e.id))?'#EAF3DE':'#fff', color:form.equipe_ids.includes(String(e.id))?'#3B6D11':'#5F5E5A' }}>
                        {form.equipe_ids.includes(String(e.id)) ? '✓ ' : ''}{e.nome.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={s.label}>Observações internas</label>
                  <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
                </div>
              </div>
            )}

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
