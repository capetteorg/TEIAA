import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

const TIPOS_ATEND = [
  'Atendimento individual', 'Atendimento familiar', 'Atendimento em grupo',
  'Acompanhamento de caso', 'Encaminhamento', 'Oficina', 'Palestra',
  'Roda de conversa', 'Reunião com famílias', 'Reunião de equipe',
  'Reunião com parceiros/rede', 'Evento institucional', 'Ação comunitária',
  'Atividade recreativa', 'Atividade pedagógica', 'Atividade socioeducativa',
  'Contato com família', 'Outro',
]

const TIPOS_ATEND_TEACOLHER = [
  'Acolhimento inicial',
  'Avaliação interdisciplinar',
  'Atendimento individual',
  'Atendimento familiar / orientação familiar',
  'Atendimento em grupo',
  'Grupo de apoio e orientação para famílias',
  'Oficina / atividade comunitária',
  'Atividade socioeducativa',
  'Encaminhamento externo',
  'Acompanhamento / devolutiva familiar',
  'Desligamento',
  'Outro',
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

const COMPARECIMENTOS_TEACOLHER = [
  'Compareceu',
  'Faltou',
  'Falta justificada',
  'Remarcado',
]

const SITUACOES = ['agendado', 'realizado', 'reagendado', 'cancelado', 'em acompanhamento', 'encerrado', 'outro']

const SITUACAO_COR = {
  'realizado': ['#EAF3DE','#3B6D11'],
  'agendado': ['#E6F1FB','#185FA5'],
  'cancelado': ['#FCEBEB','#A32D2D'],
  'reagendado': ['#FAEEDA','#854F0B'],
  'em acompanhamento': ['#FAEEDA','#854F0B'],
  'encerrado': ['#F1EFE8','#888780'],
  'outro': ['#E6F1FB','#185FA5'],
}

const FORM_VAZIO = {
  data_atend: new Date().toISOString().slice(0,10),
  projeto_id: '',
  usuario_atendido_id: '',
  tipo_atend: 'Atendimento individual',
  tema: '',
  area_atendimento: '',
  modalidade_atendimento: '',
  comparecimento: '',
  duracao_minutos: '',
  responsavel_presente: '',
  proxima_acao: '',
  descricao: '',
  qtd_participantes: 1,
  publico_participante: [],
  pessoa_atendida: '',
  profissional_id: '',
  equipe_ids: [],
  encaminhamentos: '',
  orgao_encaminhamento: '',
  situacao: 'agendado',
  observacoes: '',
}

export default function Atendimentos() {
  const isMobile = useIsMobile()
  const { perfil } = useAuth()
  const location = useLocation()
  const [atendimentos, setAtendimentos] = useState([])
  const [limite, setLimite] = useState(300)
  const [temMais, setTemMais] = useState(false)
  const [projetos, setProjetos] = useState([])
  const [equipe, setEquipe] = useState([])
  const [projetoEquipe, setProjetoEquipe] = useState([])
  const [usuariosAtendidos, setUsuariosAtendidos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [modoResultado, setModoResultado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [filtros, setFiltros] = useState({ dataInicio:'', dataFim:'', projeto_id:'', tipo_atend:'', profissional_id:'', situacao:'' })
  const [loading, setLoading] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)

  const perfilAtual = perfil?.perfil || ''
  const podeGerenciarAtendimentos = ['admin', 'operacional'].includes(perfilAtual)
  const podeExcluirAtendimentos = perfilAtual === 'admin'

  useEffect(() => {
    supabase.from('projetos').select('id,nome,tipo').eq('aceita_atendimentos', true).order('nome').then(({ data }) => setProjetos(data || []))
    supabase.from('equipe').select('id,nome,funcao,projetos').eq('situacao','ativo').order('nome').then(({ data }) => setEquipe(data || []))
    supabase.from('projeto_equipe').select('projeto_id,equipe_id').then(({ data }) => setProjetoEquipe(data || []))
    supabase.from('usuarios_atendidos').select('id,nome,situacao,projeto_id').eq('situacao','ativo').order('nome').then(({ data }) => setUsuariosAtendidos(data || []))
    carregar()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('novo') === '1') abrirNovoAgendamento()
  }, [location.search])

  async function carregar() {
    setLoading(true)
    setMsg('')

    let q = supabase.from('atendimentos')
      .select('*')
      .order('data_atend', { ascending: false })
      .order('id', { ascending: false })
      .range(0, limite)

    if (filtros.dataInicio) q = q.gte('data_atend', filtros.dataInicio)
    if (filtros.dataFim) q = q.lte('data_atend', filtros.dataFim)
    if (filtros.projeto_id) q = q.eq('projeto_id', parseInt(filtros.projeto_id))
    if (filtros.tipo_atend) q = q.eq('tipo_atend', filtros.tipo_atend)
    if (filtros.profissional_id) q = q.eq('profissional_id', parseInt(filtros.profissional_id))
    if (filtros.situacao) q = q.eq('situacao', filtros.situacao)

    const { data, error } = await q
    if (error) {
      setMsg('Erro ao carregar atendimentos: ' + error.message + ' | Código: ' + error.code)
      setAtendimentos([])
      setTemMais(false)
      setLoading(false)
      return
    }

    const recebidos = data || []
    setTemMais(recebidos.length > limite)
    setAtendimentos(recebidos.slice(0, limite))
    setLoading(false)
  }

  const projetoSelecionado = projetos.find(p => String(p.id) === String(form.projeto_id))
  const isTEAcolher = String(projetoSelecionado?.nome || '').toLowerCase().includes('teacolher')
  const tiposAtendimentoDisponiveis = isTEAcolher ? TIPOS_ATEND_TEACOLHER : TIPOS_ATEND
  const equipeDisponivel = form.projeto_id ? (() => {
    const idsVinculados = projetoEquipe
      .filter(pe => String(pe.projeto_id) === String(form.projeto_id))
      .map(pe => String(pe.equipe_id))
    if (idsVinculados.length > 0) return equipe.filter(e => idsVinculados.includes(String(e.id)))
    if (isTEAcolher) return equipe.filter(e => Array.isArray(e.projetos) && e.projetos.some(pr => String(pr).toLowerCase().includes('teacolher')))
    return equipe
  })() : []
  const usuariosDisponiveis = form.projeto_id
    ? usuariosAtendidos.filter(u => String(u.projeto_id) === String(form.projeto_id))
    : []

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const usuarioSelecionado = id => usuariosAtendidos.find(u => String(u.id) === String(id))
  const nomeUsuarioAtendido = a => usuarioSelecionado(a.usuario_atendido_id)?.nome || a.pessoa_atendida || '—'
  const projetoNome = id => projetos.find(p => String(p.id) === String(id))?.nome || '—'
  const profissionalNome = id => {
    const prof = equipe.find(e => String(e.id) === String(id))
    return prof?.nome ? prof.nome.split(' ').slice(0,2).join(' ') : '—'
  }
  const ehAgendado = a => ['agendado', 'reagendado'].includes(String(a.situacao || '').toLowerCase())

  function aplicarProjetoNoForm(id) {
    const projeto = projetos.find(p => String(p.id) === String(id))
    const tea = String(projeto?.nome || '').toLowerCase().includes('teacolher')
    setForm(f => ({
      ...f,
      projeto_id: id,
      profissional_id: '',
      equipe_ids: [],
      usuario_atendido_id: '',
      pessoa_atendida: '',
      tipo_atend: tea ? 'Acolhimento inicial' : 'Atendimento individual',
      tema: tea ? 'Agendamento de atendimento TEAcolher' : '',
      area_atendimento: tea ? 'Interdisciplinar' : '',
      modalidade_atendimento: tea ? 'Individual' : '',
      comparecimento: '',
      duracao_minutos: '',
      situacao: 'agendado',
      publico_participante: tea ? ['Pessoa com TEA / PCD', 'Famílias / responsáveis'] : [],
    }))
  }

  function montarForm(a, finalizar = false) {
    setForm({
      data_atend: a.data_atend || new Date().toISOString().slice(0,10),
      projeto_id: a.projeto_id || '',
      usuario_atendido_id: a.usuario_atendido_id || '',
      tipo_atend: a.tipo_atend || 'Atendimento individual',
      tema: a.tema || '',
      descricao: a.descricao || '',
      qtd_participantes: a.qtd_participantes || 1,
      area_atendimento: a.area_atendimento || '',
      modalidade_atendimento: a.modalidade_atendimento || '',
      comparecimento: finalizar && !a.comparecimento ? 'Compareceu' : (a.comparecimento || ''),
      duracao_minutos: a.duracao_minutos || '',
      responsavel_presente: a.responsavel_presente || '',
      proxima_acao: a.proxima_acao || '',
      publico_participante: a.publico_participante || [],
      pessoa_atendida: a.pessoa_atendida || '',
      profissional_id: a.profissional_id || '',
      equipe_ids: (a.equipe_ids || []).map(String),
      encaminhamentos: a.encaminhamentos || '',
      orgao_encaminhamento: a.orgao_encaminhamento || '',
      situacao: finalizar && ehAgendado(a) ? 'realizado' : (a.situacao || 'agendado'),
      observacoes: a.observacoes || '',
    })
    setEditando(a.id)
    setModoResultado(finalizar || !ehAgendado(a))
    setMostrarForm(true)
    window.scrollTo(0,0)
  }

  function abrirNovoAgendamento() {
    setForm(FORM_VAZIO)
    setEditando(null)
    setModoResultado(false)
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setEditando(null)
    setModoResultado(false)
    setForm(FORM_VAZIO)
  }

  function togglePublico(pub) {
    setForm(f => ({ ...f, publico_participante: f.publico_participante.includes(pub) ? f.publico_participante.filter(p => p !== pub) : [...f.publico_participante, pub] }))
  }

  function toggleEquipe(id) {
    const sid = String(id)
    setForm(f => ({ ...f, equipe_ids: f.equipe_ids.includes(sid) ? f.equipe_ids.filter(e => e !== sid) : [...f.equipe_ids, sid] }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!podeGerenciarAtendimentos) {
      setMsg('Erro: seu perfil não tem permissão para cadastrar ou editar atendimentos.')
      return
    }

    setSalvando(true)
    const situacaoFinal = modoResultado ? form.situacao : 'agendado'
    const descricaoPadrao = modoResultado ? 'Atendimento finalizado.' : 'Atendimento agendado.'
    const dados = {
      ...form,
      situacao: situacaoFinal,
      descricao: (form.descricao || '').trim() || descricaoPadrao,
      comparecimento: modoResultado ? (form.comparecimento || null) : null,
      duracao_minutos: modoResultado && form.duracao_minutos ? parseInt(form.duracao_minutos) : null,
      responsavel_presente: modoResultado ? (form.responsavel_presente || null) : null,
      proxima_acao: modoResultado ? (form.proxima_acao || null) : null,
      encaminhamentos: modoResultado ? (form.encaminhamentos || '') : '',
      orgao_encaminhamento: modoResultado ? (form.orgao_encaminhamento || '') : '',
      area_atendimento: form.area_atendimento || null,
      modalidade_atendimento: form.modalidade_atendimento || null,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : null,
      usuario_atendido_id: form.usuario_atendido_id ? parseInt(form.usuario_atendido_id) : null,
      profissional_id: form.profissional_id ? parseInt(form.profissional_id) : null,
      qtd_participantes: form.qtd_participantes ? parseInt(form.qtd_participantes) : 1,
      equipe_ids: modoResultado ? form.equipe_ids.map(id => parseInt(id)) : [],
    }

    let error, data
    if (editando) {
      ;({ error, data } = await supabase.from('atendimentos').update(dados).eq('id', editando).select())
    } else {
      ;({ error, data } = await supabase.from('atendimentos').insert(dados).select())
    }
    if (error) setMsg('Erro ao salvar: ' + error.message + ' | Código: ' + error.code)
    else if (!data || data.length === 0) setMsg('Erro: registro não foi salvo. Verifique permissões.')
    else { setMsg(modoResultado ? 'Atendimento finalizado!' : 'Agendamento salvo!'); fecharForm(); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function excluir(id) {
    await supabase.from('atendimentos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }

  const totalParticipantes = atendimentos.reduce((a,m) => a + (Number(m.qtd_participantes)||0), 0)
  const totalRealizados = atendimentos.filter(a => a.situacao === 'realizado').length
  const totalAgendados = atendimentos.filter(a => a.situacao === 'agendado' || a.situacao === 'reagendado').length

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:isMobile ? '1fr' : cols, gap:10, marginBottom:10 }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.022em' }}>Atendimentos TEAcolher</div>
          <div style={{ fontSize:12, color:'#888780' }}>Agenda primeiro. Depois finalize o atendimento realizado, falta, remarcação ou cancelamento.</div>
        </div>
        {podeGerenciarAtendimentos && (
          <button onClick={() => mostrarForm ? fecharForm() : abrirNovoAgendamento()}
            style={s.btn(mostrarForm ? '#F1EFE8' : '#0E7EA8', mostrarForm ? '#5F5E5A' : '#fff')}>
            {mostrarForm ? 'Cancelar' : '+ Agendar atendimento'}
          </button>
        )}
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {mostrarForm && podeGerenciarAtendimentos && (
        <div style={{ ...s.card, borderColor: modoResultado ? '#C0DD97' : 'rgba(14,126,168,0.35)' }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:4, color:'#06344F' }}>
            {modoResultado ? 'Finalizar atendimento' : editando ? 'Editar agendamento' : 'Novo agendamento'}
          </div>
          <div style={{ fontSize:11.5, color:'#5F5E5A', marginBottom:12 }}>
            {modoResultado
              ? 'Agora registre o que aconteceu: comparecimento, duração, evolução, encaminhamento e próxima ação.'
              : 'Aqui entram somente os dados necessários para deixar o atendimento marcado na agenda.'}
          </div>

          <form onSubmit={salvar}>
            <div style={s.grupo('1fr 2fr')}>
              <div>
                <label style={s.label}>Data do atendimento *</label>
                <input type="date" value={form.data_atend} onChange={e=>setForm(f=>({...f,data_atend:e.target.value}))} style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Projeto *</label>
                <select value={form.projeto_id} onChange={e=>aplicarProjetoNoForm(e.target.value)} style={s.input} required>
                  <option value="">Selecione o projeto...</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>

            {isTEAcolher && (
              <div style={{ ...s.card, marginBottom:10, background:'rgba(14,126,168,0.055)', borderColor:'rgba(14,126,168,0.22)', boxShadow:'none' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#06344F', marginBottom:4 }}>Fluxo TEAcolher</div>
                <div style={{ fontSize:11.5, color:'#5F5E5A', lineHeight:1.45 }}>
                  O TEAcolher trabalha com acolhimento, atendimentos individuais/coletivos, orientação familiar, encaminhamentos e acompanhamento contínuo. Primeiro agende. Depois finalize o atendimento com o resultado.
                </div>
              </div>
            )}

            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Usuário atendido *</label>
                <select value={form.usuario_atendido_id} onChange={e=>{
                  const id = e.target.value
                  const usuario = usuariosAtendidos.find(u => String(u.id) === String(id))
                  setForm(f=>({...f, usuario_atendido_id:id, pessoa_atendida: usuario?.nome || f.pessoa_atendida}))
                }} style={s.input} required>
                  <option value="">{form.projeto_id ? 'Selecione o usuário...' : 'Selecione o projeto primeiro'}</option>
                  {usuariosDisponiveis.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Profissional responsável *</label>
                <select value={form.profissional_id} onChange={e=>setForm(f=>({...f,profissional_id:e.target.value}))} style={s.input} required>
                  <option value="">{form.projeto_id ? 'Selecione o profissional...' : 'Selecione o projeto primeiro'}</option>
                  {equipeDisponivel.map(e => <option key={e.id} value={e.id}>{e.nome} — {e.funcao}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Tipo de atendimento *</label>
                <select value={form.tipo_atend} onChange={e=>setForm(f=>({...f,tipo_atend:e.target.value}))} style={s.input} required>
                  {tiposAtendimentoDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Área / especialidade *</label>
                <select value={form.area_atendimento} onChange={e=>setForm(f=>({...f,area_atendimento:e.target.value}))} style={s.input} required={isTEAcolher}>
                  <option value="">Selecione...</option>
                  {AREAS_TEACOLHER.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Modalidade *</label>
                <select value={form.modalidade_atendimento} onChange={e=>setForm(f=>({...f,modalidade_atendimento:e.target.value}))} style={s.input} required={isTEAcolher}>
                  <option value="">Selecione...</option>
                  {MODALIDADES_TEACOLHER.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Pessoa / família atendida</label>
                <input value={form.pessoa_atendida} onChange={e=>setForm(f=>({...f,pessoa_atendida:e.target.value}))} style={s.input} placeholder="Preenche automático ao selecionar usuário" />
              </div>
            </div>

            {!modoResultado && (
              <div style={{ marginBottom:14 }}>
                <label style={s.label}>Observação do agendamento</label>
                <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
                  rows={3} style={{ ...s.input, resize:'vertical' }}
                  placeholder="Ex: acolhimento inicial, orientação familiar, avaliação, retorno, oficina, demanda apresentada pela família..." />
              </div>
            )}

            {modoResultado && (
              <>
                <div style={{ ...s.card, background:'rgba(150,193,31,0.08)', borderColor:'rgba(150,193,31,0.35)', boxShadow:'none' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#3B6D11', marginBottom:8 }}>Resultado do atendimento</div>
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
                    <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
                      rows={4} style={{ ...s.input, resize:'vertical' }} required
                      placeholder="Registre acolhimento, escuta, intervenção realizada, evolução observada, orientação à família e encaminhamentos." />
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={s.label}>Público participante</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {PUBLICOS_TEACOLHER.map(pub => (
                        <button key={pub} type="button" onClick={() => togglePublico(pub)}
                          style={{ fontSize:10, padding:'3px 8px', borderRadius:6, cursor:'pointer', border:`0.5px solid ${form.publico_participante.includes(pub)?AZUL:'#D3D1C7'}`, background:form.publico_participante.includes(pub)?'#E6F1FB':'#fff', color:form.publico_participante.includes(pub)?'#185FA5':'#5F5E5A' }}>
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
                      {equipeDisponivel.map(e => (
                        <button key={e.id} type="button" onClick={() => toggleEquipe(String(e.id))}
                          style={{ fontSize:10, padding:'3px 8px', borderRadius:6, cursor:'pointer', border:`0.5px solid ${form.equipe_ids.includes(String(e.id))?VERDE:'#D3D1C7'}`, background:form.equipe_ids.includes(String(e.id))?'#EAF3DE':'#fff', color:form.equipe_ids.includes(String(e.id))?'#3B6D11':'#5F5E5A' }}>
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
              </>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':'#0E7EA8')}>
                {salvando ? 'Salvando...' : modoResultado ? 'Finalizar atendimento' : editando ? 'Salvar agendamento' : '+ Agendar'}
              </button>
              <button type="button" onClick={fecharForm} style={s.btn('#F1EFE8','#5F5E5A')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:'1.25rem' }}>
        {[
          { label:'Total de registros', val:atendimentos.length, cor:AZUL },
          { label:'Agendados', val:totalAgendados, cor:AZUL },
          { label:'Realizados', val:totalRealizados, cor:VERDE },
          { label:'Participantes registrados', val:totalParticipantes.toLocaleString('pt-BR'), cor:LARANJA },
          { label:'Em acompanhamento', val:atendimentos.filter(a=>a.situacao==='em acompanhamento').length, cor:'#854F0B' },
        ].map(m => (
          <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      <div style={{ ...s.card, marginBottom:'1rem' }}>
        <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>Filtros</div>
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
            <label style={s.label}>Projeto</label>
            <select value={filtros.projeto_id} onChange={e=>setFiltros(f=>({...f,projeto_id:e.target.value}))} style={s.input}>
              <option value="">Todos</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Profissional</label>
            <select value={filtros.profissional_id} onChange={e=>setFiltros(f=>({...f,profissional_id:e.target.value}))} style={s.input}>
              <option value="">Todos</option>
              {equipe.map(e => <option key={e.id} value={e.id}>{e.nome.split(' ')[0]} {e.nome.split(' ')[1]||''}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Situação</label>
            <select value={filtros.situacao} onChange={e=>setFiltros(f=>({...f,situacao:e.target.value}))} style={s.input}>
              <option value="">Todas</option>
              {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={carregar} style={s.btn(AZUL)}>Filtrar</button>
          <button onClick={() => { setFiltros({ dataInicio:'', dataFim:'', projeto_id:'', tipo_atend:'', profissional_id:'', situacao:'' }); setTimeout(carregar, 100) }} style={s.btn('#F1EFE8','#5F5E5A')}>Limpar filtros</button>
        </div>
      </div>

      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>{atendimentos.length} registros encontrados</div>
        {loading ? (
          <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div>
        ) : atendimentos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A', marginBottom:4 }}>Nenhum atendimento agendado</div>
            <div style={{ fontSize:12, color:'#888780', maxWidth:420, margin:'0 auto' }}>Comece agendando. Depois, na lista, use “Finalizar atendimento” para registrar o resultado.</div>
            {podeGerenciarAtendimentos && (
              <button onClick={abrirNovoAgendamento} style={{ marginTop:12, padding:'8px 20px', fontSize:12, fontWeight:600, borderRadius:8, border:'none', background:'#0E7EA8', color:'#fff', cursor:'pointer' }}>+ Agendar atendimento</button>
            )}
          </div>
        ) : (
          <div style={{ maxHeight:560, overflowY:'auto',overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>{['Data','Projeto','Usuário','Tipo','Profissional','Situação','Ações'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {atendimentos.map((a,i) => {
                  const [bg,cor] = SITUACAO_COR[a.situacao]||['#F1EFE8','#888780']
                  return (
                    <tr key={a.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                      <td style={{ ...s.td, fontWeight:500, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{projetoNome(a.projeto_id)}</td>
                      <td style={{ ...s.td, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nomeUsuarioAtendido(a)}</td>
                      <td style={{ ...s.td, maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.tipo_atend}</td>
                      <td style={{ ...s.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profissionalNome(a.profissional_id)}</td>
                      <td style={s.td}><span style={s.badge(bg,cor)}>{a.situacao}</span></td>
                      <td style={s.td}>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {podeGerenciarAtendimentos && ehAgendado(a) && (
                            <button onClick={() => montarForm(a, true)} style={s.btn(VERDE)}>Finalizar atendimento</button>
                          )}
                          {podeGerenciarAtendimentos && ehAgendado(a) && (
                            <button onClick={() => montarForm(a, false)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar agendamento</button>
                          )}
                          {podeGerenciarAtendimentos && !ehAgendado(a) && (
                            <button onClick={() => montarForm(a, true)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar registro</button>
                          )}
                          {podeExcluirAtendimentos && (
                            <button onClick={() => setConfirmandoExcluir(a.id)} style={s.btn('#FCEBEB','#A32D2D')}>Excluir</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {temMais && (
              <div style={{ textAlign:'center', marginTop:12 }}>
                <button onClick={() => setLimite(l => l + 300)}
                  style={{ padding:'8px 24px', fontSize:12, borderRadius:8, border:'0.5px solid #D3D1C7', background:'rgba(255,255,255,0.92)', color:'#5F5E5A', cursor:'pointer' }}>
                  Carregar mais 300
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ marginBottom:8 }}><i className="ti ti-inbox" style={{fontSize:32, color:'#C8C6BC'}} /></div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Confirmar exclusão</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.5rem' }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir)}
                style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'#E8212A', color:'#fff', fontWeight:600, cursor:'pointer' }}>
                Excluir
              </button>
              <button onClick={() => setConfirmandoExcluir(null)}
                style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
