import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { gerarPDFAgendaTeacolher } from '../lib/pdf'

const AG_BLUE = '#0E7EA8'
const DARK = '#06344F'
const GREEN = '#6BBF2B'
const ORANGE = '#F4821F'
const RED = '#E8212A'
const TOPBAR_H = 62

const card = {
  background: 'rgba(255,255,255,0.94)',
  border: '0.5px solid #E8E6DE',
  borderRadius: 16,
  boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
}

export default function PainelOperacional() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState({ usuarios: 0, hoje: 0, vencidos: 0, proximos: 0, realizadosMes: 0 })
  const [agendaHoje, setAgendaHoje] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [proximos, setProximos] = useState([])
  const [equipe, setEquipe] = useState([])
  const [erro, setErro] = useState('')
  const [fichaUsuario, setFichaUsuario] = useState(null)
  const [fichaAtendimentos, setFichaAtendimentos] = useState([])
  const [fichaLoading, setFichaLoading] = useState(false)
  const [aba, setAba] = useState('agenda') // 'agenda' | 'profissionais'
  const [usuariosPorProf, setUsuariosPorProf] = useState({}) // { profissional_id: [{ usuario_atendido_id, pessoa_atendida, proxData }] }
  const [projetoId, setProjetoId] = useState(null)
  // impressão
  const [periodoImpressao, setPeriodoImpressao] = useState('dia')
  const [profImpressao, setProfImpressao] = useState('')
  const [imprimindo, setImprimindo] = useState(false)

  useEffect(() => {
    let mounted = true
    async function carregar() {
      setLoading(true)
      setErro('')
      const hoje = new Date().toISOString().slice(0, 10)
      const inicioMes = hoje.slice(0, 8) + '01'

      const [projetosRes, equipeRes] = await Promise.all([
        supabase.from('projetos').select('id,nome').eq('aceita_atendimentos', true).order('nome'),
        supabase.from('equipe').select('id,nome,funcao').eq('situacao', 'ativo').order('nome'),
      ])

      if (projetosRes.error) {
        if (!mounted) return
        setErro('Não consegui carregar o projeto TEAcolher.')
        setLoading(false)
        return
      }

      const projetoTea = (projetosRes.data || []).find(p => String(p.nome || '').toLowerCase().includes('teacolher'))
      const pid = projetoTea?.id
      const equipeData = equipeRes.data || []

      let totalUsuarios = 0, agendaHojeCount = 0, vencidosCount = 0
      let proximosCount = 0, realizadosCount = 0
      let hojeLista = [], vencidosLista = [], proximosLista = []
      let vinculosRaw = []

      if (pid) {
        const [
          usuariosRes, agendaHojeRes, vencidosRes, proximosRes, realizadosRes,
          listaHoje, listaVencidos, listaProximos, vinculosRes,
        ] = await Promise.all([
          supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).eq('situacao', 'ativo'),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).lt('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).gte('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,tipo_atend,situacao').eq('projeto_id', pid).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('hora_inicio', { ascending:true }).limit(8),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,tipo_atend,situacao').eq('projeto_id', pid).lt('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('data_atend', { ascending:true }).order('hora_inicio', { ascending:true }).limit(6),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,tipo_atend,situacao').eq('projeto_id', pid).gte('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('data_atend', { ascending:true }).order('hora_inicio', { ascending:true }).limit(10),
          // Busca vínculos: usuários com agendamentos futuros ou em acompanhamento por profissional
          supabase.from('atendimentos')
            .select('profissional_id,usuario_atendido_id,pessoa_atendida,data_atend,situacao')
            .eq('projeto_id', pid)
            .gte('data_atend', hoje)
            .in('situacao', ['agendado','reagendado'])
            .order('data_atend', { ascending:true })
            .limit(500),
        ])

        totalUsuarios = usuariosRes.count || 0
        agendaHojeCount = agendaHojeRes.count || 0
        vencidosCount = vencidosRes.count || 0
        proximosCount = proximosRes.count || 0
        realizadosCount = realizadosRes.count || 0
        hojeLista = listaHoje.data || []
        vencidosLista = listaVencidos.data || []
        proximosLista = listaProximos.data || []
        vinculosRaw = vinculosRes.data || []
      }

      // Agrupa usuários por profissional (deduplicado, mostrando próx. data)
      const porProf = {}
      vinculosRaw.forEach(a => {
        if (!a.profissional_id || !a.usuario_atendido_id) return
        const pid2 = String(a.profissional_id)
        if (!porProf[pid2]) porProf[pid2] = {}
        const uid = String(a.usuario_atendido_id)
        if (!porProf[pid2][uid] || a.data_atend < porProf[pid2][uid].proxData) {
          porProf[pid2][uid] = { usuario_atendido_id: a.usuario_atendido_id, nome: a.pessoa_atendida || '—', proxData: a.data_atend }
        }
      })
      // Converte pra arrays
      const porProfFinal = {}
      Object.entries(porProf).forEach(([pid2, usrs]) => {
        porProfFinal[pid2] = Object.values(usrs).sort((a, b) => a.proxData > b.proxData ? 1 : -1)
      })

      if (!mounted) return
      setEquipe(equipeData)
      setProjetoId(pid)
      setDados({ usuarios: totalUsuarios, hoje: agendaHojeCount, vencidos: vencidosCount, proximos: proximosCount, realizadosMes: realizadosCount })
      setAgendaHoje(hojeLista)
      setPendentes(vencidosLista)
      setProximos(proximosLista)
      setUsuariosPorProf(porProfFinal)
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0, 5) : 'sem hora'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = perfil?.nome?.split(' ')[0] || 'Operacional'

  const profissionalNome = id => {
    const p = equipe.find(e => String(e.id) === String(id))
    if (!p?.nome) return 'Profissional não informado'
    return `${p.nome.split(' ').slice(0, 2).join(' ')}${p.funcao ? ` — ${p.funcao}` : ''}`
  }

  const proximosSemHoje = useMemo(() => proximos.filter(a => a.data_atend !== new Date().toISOString().slice(0, 10)).slice(0, 6), [proximos])

  async function abrirFichaUsuario(usuarioId) {
    if (!usuarioId) return
    setFichaLoading(true)
    setFichaUsuario(null)
    setFichaAtendimentos([])
    const [usuRes, atRes] = await Promise.all([
      supabase.from('usuarios_atendidos').select('*').eq('id', usuarioId).single(),
      supabase.from('atendimentos').select('id,data_atend,hora_inicio,etapa_fluxo,area_atendimento,situacao,comparecimento,desfecho_teacolher,profissional_id').eq('usuario_atendido_id', usuarioId).order('data_atend', { ascending:false }).limit(30),
    ])
    setFichaUsuario(usuRes.data || null)
    setFichaAtendimentos(atRes.data || [])
    setFichaLoading(false)
  }

  function dataLocalISO(data = new Date()) {
    const d = new Date(data)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }

  function periodoAgenda(tipo) {
    const base = new Date()
    const ini = new Date(base), fim = new Date(base)
    if (tipo === 'semana') {
      const diff = base.getDay() === 0 ? -6 : 1 - base.getDay()
      ini.setDate(base.getDate() + diff)
      fim.setDate(ini.getDate() + 6)
    }
    if (tipo === 'mes') { ini.setDate(1); fim.setMonth(base.getMonth() + 1); fim.setDate(0) }
    return { inicio: dataLocalISO(ini), fim: dataLocalISO(fim) }
  }

  async function imprimirAgenda() {
    if (!projetoId) return
    setImprimindo(true)
    const { inicio, fim } = periodoAgenda(periodoImpressao)
    let q = supabase.from('atendimentos')
      .select('id,data_atend,hora_inicio,pessoa_atendida,profissional_id,etapa_fluxo,area_atendimento,situacao,comparecimento')
      .eq('projeto_id', projetoId)
      .gte('data_atend', inicio).lte('data_atend', fim)
      .order('data_atend', { ascending:true }).order('hora_inicio', { ascending:true })
    if (profImpressao) q = q.eq('profissional_id', parseInt(profImpressao))
    const { data, error } = await q
    setImprimindo(false)
    if (error) return
    const prof = profImpressao ? equipe.find(e => String(e.id) === String(profImpressao)) : null
    const titulo = periodoImpressao === 'dia' ? 'Agenda diária TEAcolher'
      : periodoImpressao === 'semana' ? 'Agenda semanal TEAcolher' : 'Agenda mensal TEAcolher'
    const periodoLabel = periodoImpressao === 'dia'
      ? fmtData(inicio)
      : `${fmtData(inicio)} a ${fmtData(fim)}`
    gerarPDFAgendaTeacolher(
      (data || []).map(a => ({ ...a, profissional_nome: profissionalNome(a.profissional_id) })),
      titulo,
      { subtitulo: prof ? `${prof.nome} — ${prof.funcao}` : 'Todos os profissionais · Projeto TEAcolher', periodoLabel }
    )
  }

  const abrirAgenda = (qs = '') => navigate('/atendimentos' + (qs ? '?' + qs : ''))

  const botao = (bg, cor = '#fff') => ({
    border: 'none', borderRadius: 14, background: bg, color: cor,
    padding: '15px 16px', fontWeight: 800, display: 'flex', alignItems: 'center',
    gap: 12, textAlign: 'left', width: '100%', minHeight: 66, cursor: 'pointer',
    fontSize: 13,
  })

  const linhaAgenda = (a, i, total) => (
    <div key={a.id || i} style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '72px 1fr auto', gap:10, padding:'11px 0', borderBottom:i < total - 1 ? '0.5px solid #F1EFE8' : 'none', alignItems:'center' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:54, textAlign:'center', background:'#F7FAFC', border:'0.5px solid #E8E6DE', borderRadius:12, padding:'6px 4px' }}>
          <div style={{ fontSize:15, fontWeight:900, color:DARK }}>{fmtHora(a.hora_inicio)}</div>
          <div style={{ fontSize:9.5, color:'#8B949E' }}>hora</div>
        </div>
        {isMobile && <div style={{ fontSize:11, color:'#667085' }}>{fmtData(a.data_atend)}</div>}
      </div>
      <div style={{ minWidth:0 }}>
        <button onClick={() => abrirFichaUsuario(a.usuario_atendido_id)} style={{ border:'none', background:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
          <div style={{ fontSize:13.5, fontWeight:900, color:AG_BLUE, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:'underline dotted' }}>{a.pessoa_atendida || 'Usuário/família'}</div>
        </button>
        <div style={{ fontSize:11.5, color:'#667085', marginTop:3 }}>{!isMobile && `${fmtData(a.data_atend)} · `}{profissionalNome(a.profissional_id)}</div>
        <div style={{ fontSize:11, color:'#8B949E', marginTop:2 }}>{a.etapa_fluxo || a.tipo_atend || 'Atendimento TEAcolher'}</div>
      </div>
      <button onClick={() => navigate(`/atendimentos?abrir=${a.id}`)} style={{ border:'none', borderRadius:10, background:'#F1EFE8', color:'#5F5E5A', fontSize:11, fontWeight:800, padding:'8px 10px', cursor:'pointer' }}>
        editar/remarcar
      </button>
    </div>
  )

  const blocoAgenda = (titulo, desc, itens, vazio, cor, acao, imprimirTitulo) => (
    <div style={{ ...card, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:15, fontWeight:900, color:DARK }}>{titulo}</div>
          <div style={{ fontSize:11.5, color:'#888780', marginTop:2 }}>{desc}</div>
        </div>
        <button onClick={acao} style={{ border:'none', borderRadius:999, background:cor, color:'#fff', fontSize:11, fontWeight:800, padding:'6px 11px', cursor:'pointer' }}>abrir</button>
      </div>
      {loading ? <div style={{ fontSize:12, color:'#B4B2A9', textAlign:'center', padding:'1rem 0' }}>Carregando...</div> : itens.length === 0 ? (
        <div style={{ fontSize:12, color:'#99978F', textAlign:'center', padding:'1.2rem 0' }}>{vazio}</div>
      ) : itens.map((a, i) => linhaAgenda(a, i, itens.length))}
    </div>
  )

  // aba por profissional
  const secaoPorProfissional = () => (
    <div style={{ display:'grid', gap:14 }}>
      <div style={{ ...card, padding:14, borderLeft:`3px solid ${AG_BLUE}` }}>
        <div style={{ fontSize:15, fontWeight:900, color:DARK, marginBottom:3 }}>Usuários por profissional — acompanhamento ativo</div>
        <div style={{ fontSize:12, color:'#5F5E5A' }}>Mostra quem tem agendamentos futuros marcados com cada profissional. Clique no nome do usuário para ver a ficha completa.</div>
      </div>
      {equipe.filter(e => usuariosPorProf[String(e.id)]?.length > 0).map(prof => {
        const lista = usuariosPorProf[String(prof.id)] || []
        return (
          <div key={prof.id} style={{ ...card, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, gap:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:900, color:DARK }}>{prof.nome.split(' ').slice(0,3).join(' ')}</div>
                <div style={{ fontSize:11.5, color:'#888780' }}>{prof.funcao} · {lista.length} usuário(s) com agendamento futuro</div>
              </div>
              <button onClick={() => navigate('/atendimentos?profissional=' + prof.id)} style={{ border:'none', borderRadius:8, background:AG_BLUE, color:'#fff', fontSize:11, fontWeight:800, padding:'6px 11px', cursor:'pointer' }}>ver agenda</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:6 }}>
              {lista.map(u => (
                <button key={u.usuario_atendido_id} onClick={() => abrirFichaUsuario(u.usuario_atendido_id)}
                  style={{ border:'0.5px solid #E8E6DE', borderRadius:10, background:'#FAFAF8', padding:'8px 12px', cursor:'pointer', textAlign:'left' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:DARK, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.nome}</div>
                  <div style={{ fontSize:10.5, color:'#888780', marginTop:2 }}>Próx: {fmtData(u.proxData)}</div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {equipe.every(e => !usuariosPorProf[String(e.id)]?.length) && (
        <div style={{ ...card, padding:'2rem', textAlign:'center', color:'#888780', fontSize:13 }}>
          Nenhum usuário com agendamento futuro encontrado. Agende atendimentos para ver os vínculos aqui.
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ height:TOPBAR_H, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile ? '0 12px' : '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div>
          <div style={{ fontSize:isMobile ? 17 : 20, fontWeight:900, color:DARK }}>{saudacao}, {nome}!</div>
          <div style={{ fontSize:12, color:'#6B6A66', marginTop:3 }}>Painel operacional · Projeto TEAcolher</div>
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => navigate('/usuarios-atendidos')} style={{ border:'0.5px solid #D9D6CC', background:'#fff', borderRadius:10, padding:'8px 14px', color:DARK, fontWeight:800, cursor:'pointer' }}>+ Cadastrar usuário</button>
            <button onClick={() => navigate('/atendimentos?novo=1')} style={{ border:'none', background:AG_BLUE, borderRadius:10, padding:'8px 14px', color:'#fff', fontWeight:800, cursor:'pointer' }}>+ Agendar</button>
          </div>
        )}
      </div>

      <div style={{ padding:isMobile ? '12px' : '20px 24px', display:'grid', gap:14 }}>
        {erro && <div style={{ ...card, padding:14, borderLeft:`3px solid ${RED}`, color:'#A32D2D', fontSize:12 }}>{erro}</div>}

        {/* Ações rápidas */}
        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3, 1fr)', gap:10 }}>
          <button onClick={() => navigate('/usuarios-atendidos')} style={botao(AG_BLUE)}>
            <span style={{ fontSize:22 }}>👤</span>
            <span><span style={{ fontSize:14 }}>Ver usuários cadastrados</span><br/><small style={{ fontWeight:500 }}>Lista completa · cadastrar ou editar</small></span>
          </button>
          <button onClick={() => navigate('/atendimentos?novo=1')} style={botao(DARK)}>
            <span style={{ fontSize:22 }}>📅</span>
            <span><span style={{ fontSize:14 }}>Agendar atendimento</span><br/><small style={{ fontWeight:500 }}>Escolha usuário, data e profissional</small></span>
          </button>
          <button onClick={() => abrirAgenda('situacao=agendado')} style={botao(ORANGE)}>
            <span style={{ fontSize:22 }}>🔄</span>
            <span><span style={{ fontSize:14 }}>Remarcar ou cancelar</span><br/><small style={{ fontWeight:500 }}>Altere data, horário ou cancele</small></span>
          </button>
        </div>

        {/* Cards de número */}
        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap:10 }}>
          {[
            ['Famílias ativas', dados.usuarios, DARK, 'No TEAcolher'],
            ['Hoje', dados.hoje, AG_BLUE, 'Marcados para hoje'],
            ['Atrasados', dados.vencidos, RED, 'Já passou da data'],
            ['Próximos', dados.proximos, ORANGE, 'Hoje em diante'],
            ['Feitos no mês', dados.realizadosMes, GREEN, 'Finalizados'],
          ].map(([label, value, color, desc]) => (
            <div key={label} style={{ ...card, padding:'14px 14px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
              <div style={{ fontSize:10.5, color:'#7A8893', marginBottom:4, fontWeight:700 }}>{label}</div>
              <div style={{ fontSize:26, fontWeight:900, color }}>{loading ? '...' : value}</div>
              <div style={{ fontSize:10.5, color:'#9AA3AF', marginTop:2 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Alerta atrasados */}
        {dados.vencidos > 0 && (
          <div style={{ ...card, padding:14, borderLeft:`4px solid ${RED}`, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:900, color:'#A32D2D' }}>Atenção: {dados.vencidos} atendimento(s) com data passada ainda como agendados.</div>
              <div style={{ fontSize:11.5, color:'#6B7280', marginTop:2 }}>Confira e remarcou ou cancele. Se o atendimento aconteceu, o técnico precisa finalizar.</div>
            </div>
            <button onClick={() => abrirAgenda('situacao=agendado')} style={{ border:'none', borderRadius:10, background:RED, color:'#fff', fontSize:12, fontWeight:900, padding:'9px 12px', cursor:'pointer' }}>Conferir agora</button>
          </div>
        )}

        {/* Abas: Agenda / Por profissional */}
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #E8E6DE', paddingBottom:0 }}>
          {[['agenda','📋 Agenda'], ['profissionais','👥 Usuários por profissional']].map(([key, label]) => (
            <button key={key} onClick={() => setAba(key)} style={{ border:'none', background:'none', padding:'8px 16px', fontSize:13, fontWeight:aba === key ? 900 : 600, color: aba === key ? AG_BLUE : '#888780', borderBottom: aba === key ? `2px solid ${AG_BLUE}` : '2px solid transparent', cursor:'pointer', marginBottom:-1 }}>
              {label}
            </button>
          ))}
        </div>

        {aba === 'agenda' && (
          <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '360px 1fr', gap:14, alignItems:'start' }}>
            {/* Coluna esquerda: atalhos + impressão */}
            <div style={{ display:'grid', gap:14 }}>
              <div style={{ ...card, padding:16 }}>
                <div style={{ fontSize:15, fontWeight:900, color:DARK, marginBottom:12 }}>Imprimir agenda</div>
                <div style={{ display:'grid', gap:8 }}>
                  <div>
                    <label style={{ fontSize:11, color:'#5F5E5A', display:'block', marginBottom:4 }}>Período</label>
                    <select value={periodoImpressao} onChange={e=>setPeriodoImpressao(e.target.value)} style={{ width:'100%', border:'0.5px solid #D3D1C7', borderRadius:10, padding:'8px 10px', fontSize:12 }}>
                      <option value="dia">Hoje</option>
                      <option value="semana">Semana</option>
                      <option value="mes">Mês</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#5F5E5A', display:'block', marginBottom:4 }}>Profissional</label>
                    <select value={profImpressao} onChange={e=>setProfImpressao(e.target.value)} style={{ width:'100%', border:'0.5px solid #D3D1C7', borderRadius:10, padding:'8px 10px', fontSize:12 }}>
                      <option value="">Todos os profissionais</option>
                      {equipe.map(e => <option key={e.id} value={e.id}>{e.nome.split(' ').slice(0,2).join(' ')} — {e.funcao}</option>)}
                    </select>
                  </div>
                  <button onClick={imprimirAgenda} disabled={imprimindo} style={{ border:'none', borderRadius:10, background:DARK, color:'#fff', padding:'10px', fontSize:12, fontWeight:900, cursor:'pointer', opacity:imprimindo?.65:1 }}>
                    {imprimindo ? 'Gerando...' : '🖨 Imprimir'}
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna direita: listas de agenda */}
            <div style={{ display:'grid', gap:14 }}>
              {blocoAgenda('Agenda de hoje', 'O que acontece hoje.', agendaHoje, 'Nenhum atendimento agendado para hoje.', AG_BLUE, () => abrirAgenda(), 'Agenda TEAcolher hoje')}
              {blocoAgenda('Atrasados / precisam de conferência', 'Data passou, ainda como agendado.', pendentes, 'Sem agendamentos atrasados.', RED, () => abrirAgenda('situacao=agendado'), 'Atrasados TEAcolher')}
              {blocoAgenda('Próximos agendamentos', 'Agenda futura.', proximosSemHoje, 'Nenhum próximo agendamento.', ORANGE, () => abrirAgenda('situacao=agendado'), 'Próximos TEAcolher')}
            </div>
          </div>
        )}

        {aba === 'profissionais' && secaoPorProfissional()}
      </div>

      {/* Modal ficha do usuário */}
      {(fichaLoading || fichaUsuario) && (
        <div onClick={e => { if(e.target === e.currentTarget) { setFichaUsuario(null); setFichaAtendimentos([]) }}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:999, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>
          <div style={{ background:'#fff', width: isMobile ? '100%' : 460, height:'100vh', overflowY:'auto', boxShadow:'-4px 0 24px rgba(0,0,0,0.12)', padding:'24px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:900, color:DARK }}>Ficha do usuário</div>
              <button onClick={() => { setFichaUsuario(null); setFichaAtendimentos([]) }} style={{ border:'none', background:'#F1EFE8', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12, color:'#5F5E5A' }}>Fechar</button>
            </div>
            {fichaLoading ? (
              <div style={{ color:'#B4B2A9', fontSize:12, textAlign:'center', paddingTop:40 }}>Carregando...</div>
            ) : fichaUsuario ? (<>
              <div style={{ background:'#F7FAFC', borderRadius:12, padding:14, marginBottom:14 }}>
                <div style={{ fontSize:17, fontWeight:900, color:DARK, marginBottom:6 }}>{fichaUsuario.nome}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12 }}>
                  {fichaUsuario.data_nascimento && <div><span style={{ color:'#888780' }}>Nascimento:</span> {fmtData(fichaUsuario.data_nascimento)}</div>}
                  {fichaUsuario.tipo_deficiencia && <div><span style={{ color:'#888780' }}>Deficiência:</span> {fichaUsuario.tipo_deficiencia}</div>}
                  {fichaUsuario.telefone && <div><span style={{ color:'#888780' }}>Tel:</span> {fichaUsuario.telefone}</div>}
                  {fichaUsuario.contato_familiar_nome && <div><span style={{ color:'#888780' }}>Responsável:</span> {fichaUsuario.contato_familiar_nome}</div>}
                  {fichaUsuario.contato_familiar_telefone && <div><span style={{ color:'#888780' }}>Tel responsável:</span> {fichaUsuario.contato_familiar_telefone}</div>}
                  {fichaUsuario.data_ingresso && <div><span style={{ color:'#888780' }}>Ingresso:</span> {fmtData(fichaUsuario.data_ingresso)}</div>}
                  <div><span style={{ color:'#888780' }}>Situação:</span> <span style={{ fontWeight:700, color: fichaUsuario.situacao === 'ativo' ? GREEN : RED }}>{fichaUsuario.situacao}</span></div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <button onClick={() => navigate('/usuarios-atendidos')} style={{ border:'none', borderRadius:8, background:AG_BLUE, color:'#fff', fontSize:11, fontWeight:800, padding:'7px 12px', cursor:'pointer' }}>Editar cadastro</button>
                <button onClick={() => navigate('/atendimentos?novo=1')} style={{ border:'none', borderRadius:8, background:DARK, color:'#fff', fontSize:11, fontWeight:800, padding:'7px 12px', cursor:'pointer' }}>+ Agendar</button>
              </div>
              {/* Profissionais que atendem este usuário */}
              {(() => {
                const profsDoUsuario = [...new Set(fichaAtendimentos.map(a => a.profissional_id).filter(Boolean))]
                  .map(id => equipe.find(e => String(e.id) === String(id))).filter(Boolean)
                return profsDoUsuario.length > 0 ? (
                  <div style={{ marginBottom:14, background:'#EEF8F1', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:11.5, fontWeight:700, color:'#3B6D11', marginBottom:6 }}>Em acompanhamento com:</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {profsDoUsuario.map(p => <div key={p.id} style={{ fontSize:12, color:DARK }}>{p.nome} — {p.funcao}</div>)}
                    </div>
                  </div>
                ) : null
              })()}
              <div style={{ fontSize:13, fontWeight:700, color:DARK, marginBottom:8 }}>Histórico ({fichaAtendimentos.length})</div>
              {fichaAtendimentos.length === 0 ? (
                <div style={{ fontSize:12, color:'#B4B2A9', textAlign:'center', padding:'1.5rem 0' }}>Nenhum atendimento registrado.</div>
              ) : fichaAtendimentos.map((a, i) => {
                const corSit = { realizado:'#EAF3DE', agendado:'#E6F1FB', cancelado:'#FCEBEB', reagendado:'#FFF3E0' }[a.situacao] || '#F1EFE8'
                const txtSit = { realizado:'#3B6D11', agendado:'#185FA5', cancelado:'#A32D2D', reagendado:'#854F0B' }[a.situacao] || '#5F5E5A'
                const prof = equipe.find(e => String(e.id) === String(a.profissional_id))
                return (
                  <div key={a.id} onClick={() => navigate(`/atendimentos?abrir=${a.id}`)} style={{ padding:'10px 12px', borderRadius:10, border:'0.5px solid #E8E6DE', marginBottom:6, cursor:'pointer', background:i%2===0?'#fff':'#FAFAF8' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:DARK }}>{fmtData(a.data_atend)} {a.hora_inicio ? `· ${String(a.hora_inicio).slice(0,5)}` : ''}</div>
                      <span style={{ fontSize:10, fontWeight:600, background:corSit, color:txtSit, borderRadius:99, padding:'2px 7px' }}>{a.situacao}</span>
                    </div>
                    <div style={{ fontSize:11.5, color:'#5F5E5A', marginTop:3 }}>{a.etapa_fluxo || 'Atendimento'}{a.area_atendimento ? ` · ${a.area_atendimento}` : ''}</div>
                    {prof && <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{prof.nome.split(' ').slice(0,2).join(' ')} — {prof.funcao}</div>}
                    {a.comparecimento && a.comparecimento !== 'Compareceu' && <div style={{ fontSize:11, color:RED, marginTop:2 }}>{a.comparecimento}</div>}
                  </div>
                )
              })}
            </>) : <div style={{ color:'#A32D2D', fontSize:12, textAlign:'center', paddingTop:40 }}>Usuário não encontrado.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
