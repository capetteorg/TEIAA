import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'

const VERDE = '#6BBF2B'
const VERMELHO = '#E8212A'
const AZUL = '#0E7EA8'
const LARANJA = '#F4821F'
const ESCURO = '#06344F'

const ETAPAS_TEACOLHER = [
  'Captação / demanda espontânea',
  'Acolhimento inicial',
  'Avaliação interdisciplinar',
  'Plano individual/familiar',
  'Atendimento individual',
  'Atendimento familiar / orientação familiar',
  'Atendimento em grupo',
  'Grupo de apoio e orientação para famílias',
  'Oficina / atividade comunitária',
  'Atividade socioeducativa',
  'Encaminhamento SUS/SUAS/Educação',
  'Acompanhamento / devolutiva familiar',
  'Desligamento',
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

const SITUACOES = ['agendado', 'realizado', 'reagendado', 'cancelado', 'em acompanhamento', 'encerrado']

const SITUACAO_COR = {
  realizado: ['#EAF3DE', '#3B6D11'],
  agendado: ['#E6F1FB', '#185FA5'],
  cancelado: ['#FCEBEB', '#A32D2D'],
  reagendado: ['#FAEEDA', '#854F0B'],
  'em acompanhamento': ['#FAEEDA', '#854F0B'],
  encerrado: ['#F1EFE8', '#888780'],
}

const FORM_VAZIO = {
  data_atend: new Date().toISOString().slice(0, 10),
  projeto_id: '',
  usuario_atendido_id: '',
  pessoa_atendida: '',
  profissional_id: '',
  equipe_ids: [],
  tipo_atend: 'Acolhimento inicial',
  tema: 'Agendamento TEAcolher',
  area_atendimento: 'Interdisciplinar',
  modalidade_atendimento: 'Acolhimento',
  situacao: 'agendado',
  descricao: '',
  qtd_participantes: 1,
  publico_participante: ['Pessoa com TEA / PCD', 'Famílias / responsáveis'],
  comparecimento: '',
  duracao_minutos: '',
  responsavel_presente: '',
  encaminhamentos: '',
  orgao_encaminhamento: '',
  proxima_acao: '',
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

  const perfilAtual = perfil?.perfil || ''
  const podeGerenciar = ['admin', 'operacional'].includes(perfilAtual)
  const podeExcluir = perfilAtual === 'admin'

  useEffect(() => {
    inicializar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    if (f.dataInicio) qLista = qLista.gte('data_atend', f.dataInicio)
    if (f.dataFim) qLista = qLista.lte('data_atend', f.dataFim)
    if (f.profissional_id) qLista = qLista.eq('profissional_id', parseInt(f.profissional_id))
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

  const equipeTEAcolher = (() => {
    const idsVinculados = projetoEquipe
      .filter(pe => String(pe.projeto_id) === String(projetoTeacolherId))
      .map(pe => String(pe.equipe_id))
    if (idsVinculados.length > 0) return equipe.filter(e => idsVinculados.includes(String(e.id)))
    return equipe.filter(e => Array.isArray(e.projetos) && e.projetos.some(pr => String(pr).toLowerCase().includes('teacolher')))
  })()

  const usuariosTEAcolher = usuariosAtendidos.filter(u => String(u.projeto_id) === String(projetoTeacolherId))

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const nomeUsuario = id => usuariosAtendidos.find(u => String(u.id) === String(id))?.nome || ''
  const profissional = id => equipe.find(e => String(e.id) === String(id))
  const profissionalNome = id => {
    const p = profissional(id)
    return p?.nome ? p.nome.split(' ').slice(0, 2).join(' ') : '—'
  }
  const nomeAtendido = a => nomeUsuario(a.usuario_atendido_id) || a.pessoa_atendida || '—'
  const ehAgendado = a => ['agendado', 'reagendado'].includes(String(a.situacao || '').toLowerCase())

  function abrirNovoAgendamento(teaId = projetoTeacolherId) {
    setForm({ ...FORM_VAZIO, projeto_id: teaId || '' })
    setEditando(null)
    setModoResultado(false)
    setMostrarForm(true)
    window.scrollTo(0, 0)
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
    setForm({
      data_atend: a.data_atend || new Date().toISOString().slice(0, 10),
      projeto_id: a.projeto_id || projetoTeacolherId || '',
      usuario_atendido_id: a.usuario_atendido_id || '',
      pessoa_atendida: a.pessoa_atendida || nomeUsuario(a.usuario_atendido_id) || '',
      profissional_id: a.profissional_id || '',
      equipe_ids: (a.equipe_ids || []).map(String),
      tipo_atend: a.tipo_atend || 'Acolhimento inicial',
      tema: a.tema || 'Agendamento TEAcolher',
      area_atendimento: a.area_atendimento || 'Interdisciplinar',
      modalidade_atendimento: a.modalidade_atendimento || 'Acolhimento',
      situacao: finalizar && ehAgendado(a) ? 'realizado' : (a.situacao || 'agendado'),
      descricao: a.descricao || '',
      qtd_participantes: a.qtd_participantes || 1,
      publico_participante: a.publico_participante || ['Pessoa com TEA / PCD', 'Famílias / responsáveis'],
      comparecimento: finalizar && !a.comparecimento ? 'Compareceu' : (a.comparecimento || ''),
      duracao_minutos: a.duracao_minutos || '',
      responsavel_presente: a.responsavel_presente || '',
      encaminhamentos: a.encaminhamentos || '',
      orgao_encaminhamento: a.orgao_encaminhamento || '',
      proxima_acao: a.proxima_acao || '',
      observacoes: a.observacoes || '',
    })
    setEditando(a.id)
    setModoResultado(finalizar || !ehAgendado(a))
    setMostrarForm(true)
    window.scrollTo(0, 0)
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
    if (!podeGerenciar) {
      setMsg('Erro: seu perfil não tem permissão para registrar atendimento.')
      return
    }

    setSalvando(true)

    const descricaoPadrao = modoResultado ? 'Atendimento finalizado.' : 'Atendimento agendado.'
    const dados = {
      data_atend: form.data_atend,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : (projetoTeacolherId ? parseInt(projetoTeacolherId) : null),
      usuario_atendido_id: form.usuario_atendido_id ? parseInt(form.usuario_atendido_id) : null,
      pessoa_atendida: form.pessoa_atendida || null,
      profissional_id: form.profissional_id ? parseInt(form.profissional_id) : null,
      equipe_ids: modoResultado ? form.equipe_ids.map(id => parseInt(id)) : [],
      tipo_atend: form.tipo_atend,
      tema: form.tema || 'Atendimento TEAcolher',
      area_atendimento: form.area_atendimento || null,
      modalidade_atendimento: form.modalidade_atendimento || null,
      situacao: modoResultado ? form.situacao : 'agendado',
      descricao: (form.descricao || '').trim() || descricaoPadrao,
      qtd_participantes: form.qtd_participantes ? parseInt(form.qtd_participantes) : 1,
      publico_participante: form.publico_participante || [],
      comparecimento: modoResultado ? (form.comparecimento || null) : null,
      duracao_minutos: modoResultado && form.duracao_minutos ? parseInt(form.duracao_minutos) : null,
      responsavel_presente: modoResultado ? (form.responsavel_presente || null) : null,
      encaminhamentos: modoResultado ? (form.encaminhamentos || '') : '',
      orgao_encaminhamento: modoResultado ? (form.orgao_encaminhamento || '') : '',
      proxima_acao: modoResultado ? (form.proxima_acao || null) : null,
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
      setMsg(modoResultado ? 'Atendimento finalizado com sucesso. Ele saiu dos agendados e entrou nos realizados.' : 'Agendamento salvo com sucesso.')
      fecharForm()
      const filtrosDepois = modoResultado ? { dataInicio:'', dataFim:'', profissional_id:'', situacao:'' } : filtros
      if (modoResultado) setFiltros(filtrosDepois)
      carregar(filtrosDepois, projetoTeacolherId)
    }
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
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
  const totalRealizados = baseMetricas.filter(a => a.situacao === 'realizado').length
  const totalFinalizar = baseMetricas.filter(a => a.data_atend <= hoje && ['agendado', 'reagendado'].includes(a.situacao)).length
  const faltasRemarcacoes = baseMetricas.filter(a => ['Faltou', 'Falta justificada', 'Remarcado', 'Cancelado'].includes(a.comparecimento) || ['reagendado', 'cancelado'].includes(a.situacao)).length
  const totalEncaminhados = baseMetricas.filter(a => (a.encaminhamentos || '').trim() || (a.orgao_encaminhamento || '').trim()).length

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
          <div style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.035em', color:ESCURO }}>Agenda TEAcolher</div>
          <div style={{ fontSize:12.5, color:'#6B7280', maxWidth:760 }}>
            Núcleo interdisciplinar para PCD/TEA e famílias: agende, acompanhe e finalize os atendimentos com registro técnico.
          </div>
        </div>
        {podeGerenciar && (
          <button onClick={() => mostrarForm ? fecharForm() : abrirNovoAgendamento()} style={s.btn(mostrarForm ? '#F1EFE8' : AZUL, mostrarForm ? '#5F5E5A' : '#fff')}>
            {mostrarForm ? 'Cancelar' : '+ Agendar atendimento'}
          </button>
        )}
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {mostrarForm && podeGerenciar && (
        <div style={{ ...s.card, borderColor: modoResultado ? '#C0DD97' : 'rgba(14,126,168,0.35)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ ...s.badge(modoResultado ? '#EAF3DE' : '#E6F1FB', modoResultado ? '#3B6D11' : '#185FA5') }}>
              {modoResultado ? '2. Finalização' : '1. Agendamento'}
            </span>
            <div style={{ fontSize:14, fontWeight:700, color:ESCURO }}>
              {modoResultado ? 'Registrar resultado do atendimento' : 'Agendar atendimento TEAcolher'}
            </div>
          </div>

          <div style={{ fontSize:11.5, color:'#5F5E5A', marginBottom:12 }}>
            {modoResultado
              ? 'Aqui entram os dados que provam a execução: comparecimento, duração, evolução, orientação familiar, encaminhamento e próxima ação.'
              : 'Aqui entram somente os dados de agenda: quem será atendido, quando, por qual profissional, etapa do fluxo e objetivo.'}
          </div>

          <form onSubmit={salvar}>
            <div style={{ ...s.card, background:'rgba(14,126,168,0.05)', boxShadow:'none', borderColor:'rgba(14,126,168,0.18)' }}>
              <div style={{ fontSize:12, fontWeight:700, color:ESCURO, marginBottom:8 }}>Dados do agendamento</div>
              <div style={s.grupo('1fr 1fr 1fr')}>
                <div>
                  <label style={s.label}>Projeto</label>
                  <input value="Projeto TEAcolher" readOnly style={{ ...s.input, background:'#F8FAFC', color:ESCURO, fontWeight:600 }} />
                </div>
                <div>
                  <label style={s.label}>Data do atendimento *</label>
                  <input type="date" value={form.data_atend} onChange={e=>setForm(f=>({...f,data_atend:e.target.value}))} style={s.input} required />
                </div>
                <div>
                  <label style={s.label}>Profissional responsável *</label>
                  <select value={form.profissional_id} onChange={e=>setForm(f=>({...f,profissional_id:e.target.value}))} style={s.input} required>
                    <option value="">Selecione...</option>
                    {equipeTEAcolher.map(e => <option key={e.id} value={e.id}>{e.nome} — {e.funcao}</option>)}
                  </select>
                </div>
              </div>

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
                  <label style={s.label}>Etapa do fluxo TEAcolher *</label>
                  <select value={form.tipo_atend} onChange={e=>setForm(f=>({...f,tipo_atend:e.target.value}))} style={s.input} required>
                    {ETAPAS_TEACOLHER.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Área / especialidade *</label>
                  <select value={form.area_atendimento} onChange={e=>setForm(f=>({...f,area_atendimento:e.target.value}))} style={s.input} required>
                    {AREAS_TEACOLHER.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Modalidade *</label>
                  <select value={form.modalidade_atendimento} onChange={e=>setForm(f=>({...f,modalidade_atendimento:e.target.value}))} style={s.input} required>
                    {MODALIDADES_TEACOLHER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {!modoResultado && (
                <div>
                  <label style={s.label}>Objetivo/observação do agendamento</label>
                  <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={3} style={{ ...s.input, resize:'vertical' }} placeholder="Ex: acolhimento inicial, avaliação interdisciplinar, devolutiva familiar, grupo de orientação, oficina comunitária..." />
                </div>
              )}
            </div>

            {modoResultado && (
              <div style={{ ...s.card, background:'rgba(150,193,31,0.08)', borderColor:'rgba(150,193,31,0.35)', boxShadow:'none' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#3B6D11', marginBottom:8 }}>Resultado / acompanhamento</div>
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
                    <label style={s.label}>Responsável presente</label>
                    <input value={form.responsavel_presente} onChange={e=>setForm(f=>({...f,responsavel_presente:e.target.value}))} style={s.input} placeholder="Nome do responsável, se houver" />
                  </div>
                  <div>
                    <label style={s.label}>Próxima ação</label>
                    <input value={form.proxima_acao} onChange={e=>setForm(f=>({...f,proxima_acao:e.target.value}))} style={s.input} placeholder="Ex: manter acompanhamento, agendar devolutiva, encaminhar ao CRAS..." />
                  </div>
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Evolução / registro técnico *</label>
                  <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={4} style={{ ...s.input, resize:'vertical' }} required placeholder="Registre acolhimento, escuta qualificada, intervenção realizada, orientação à família, evolução observada e encaminhamentos." />
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

                <div style={s.grupo('2fr 1fr')}>
                  <div>
                    <label style={s.label}>Encaminhamentos realizados</label>
                    <input value={form.encaminhamentos} onChange={e=>setForm(f=>({...f,encaminhamentos:e.target.value}))} style={s.input} placeholder="Ex: UBS, CAPS, CRAS, CREAS, escola, avaliação complementar..." />
                  </div>
                  <div>
                    <label style={s.label}>Órgão / rede de destino</label>
                    <input value={form.orgao_encaminhamento} onChange={e=>setForm(f=>({...f,orgao_encaminhamento:e.target.value}))} style={s.input} placeholder="Ex: SUS, SUAS, Educação..." />
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
                {salvando ? 'Salvando...' : modoResultado ? 'Finalizar atendimento' : editando ? 'Salvar agendamento' : '+ Agendar'}
              </button>
              <button type="button" onClick={fecharForm} style={s.btn('#F1EFE8', '#5F5E5A')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(145px, 1fr))', gap:8, marginBottom:'1rem' }}>
        {[
          { label:'Agendados', val:totalAgendados, cor:AZUL },
          { label:'Hoje', val:hojeAgendados, cor:ESCURO },
          { label:'A finalizar', val:totalFinalizar, cor:LARANJA },
          { label:'Realizados', val:totalRealizados, cor:VERDE },
          { label:'Faltas/remarcações', val:faltasRemarcacoes, cor:VERMELHO },
          { label:'Encaminhados', val:totalEncaminhados, cor:'#854F0B' },
        ].map(m => (
          <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      <div style={{ ...s.card, marginBottom:'1rem' }}>
        <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Filtros da agenda TEAcolher</div>
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
            <select value={filtros.profissional_id} onChange={e=>setFiltros(f=>({...f,profissional_id:e.target.value}))} style={s.input}>
              <option value="">Todos</option>
              {equipeTEAcolher.map(e => <option key={e.id} value={e.id}>{e.nome.split(' ')[0]} {e.nome.split(' ')[1] || ''}</option>)}
            </select>
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
            <div style={{ fontSize:14, fontWeight:700, color:ESCURO }}>{atendimentos.length} registros TEAcolher</div>
            {(filtros.situacao || filtros.profissional_id || filtros.dataInicio || filtros.dataFim) && (
              <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>
                Lista filtrada. Os cards acima contam todos os atendimentos do TEAcolher.
              </div>
            )}
          </div>
          {podeGerenciar && <button onClick={() => abrirNovoAgendamento()} style={s.btn(AZUL)}>+ Agendar atendimento</button>}
        </div>

        {loading ? (
          <div style={{ padding:'1.25rem', color:'#888780', fontSize:12 }}>Carregando agenda...</div>
        ) : atendimentos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#2C2C2A', marginBottom:4 }}>Nenhum atendimento TEAcolher encontrado nesta lista</div>
            <div style={{ fontSize:12, color:'#888780', maxWidth:520, margin:'0 auto' }}>
              {filtros.situacao ? `Você está filtrando por "${filtros.situacao}". Se acabou de finalizar, o atendimento saiu dos agendados e entrou em realizados.` : 'Comece agendando. Depois, na lista, use “Finalizar atendimento” para registrar o resultado técnico.'}
            </div>
            {podeGerenciar && <button onClick={() => abrirNovoAgendamento()} style={{ marginTop:12, padding:'8px 20px', fontSize:12, fontWeight:700, borderRadius:8, border:'none', background:AZUL, color:'#fff', cursor:'pointer' }}>+ Agendar atendimento</button>}
          </div>
        ) : (
          <div style={{ maxHeight:560, overflowY:'auto', overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>{['Data', 'Usuário/família', 'Etapa', 'Área', 'Profissional', 'Situação', 'Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {atendimentos.map((a, i) => {
                  const [bg, cor] = SITUACAO_COR[a.situacao] || ['#F1EFE8', '#888780']
                  return (
                    <tr key={a.id} style={{ background:i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                      <td style={{ ...s.td, fontWeight:600, maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nomeAtendido(a)}</td>
                      <td style={{ ...s.td, maxWidth:190, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.tipo_atend || '—'}</td>
                      <td style={{ ...s.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.area_atendimento || '—'}</td>
                      <td style={{ ...s.td, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profissionalNome(a.profissional_id)}</td>
                      <td style={s.td}><span style={s.badge(bg, cor)}>{a.situacao}</span></td>
                      <td style={s.td}>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {podeGerenciar && ehAgendado(a) && <button onClick={() => montarForm(a, true)} style={s.btn(VERDE)}>Finalizar atendimento</button>}
                          {podeGerenciar && ehAgendado(a) && <button onClick={() => montarForm(a, false)} style={s.btn('#F1EFE8', '#5F5E5A')}>Editar agenda</button>}
                          {podeGerenciar && !ehAgendado(a) && <button onClick={() => montarForm(a, true)} style={s.btn('#F1EFE8', '#5F5E5A')}>Editar registro</button>}
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
