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
  const [fichaUsuario, setFichaUsuario] = useState(null) // modal de ficha
  const [fichaAtendimentos, setFichaAtendimentos] = useState([])
  const [fichaLoading, setFichaLoading] = useState(false)

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
      const projetoId = projetoTea?.id
      const equipeData = equipeRes.data || []

      let totalUsuarios = 0
      let agendaHojeCount = 0
      let vencidosCount = 0
      let proximosCount = 0
      let realizadosCount = 0
      let hojeLista = []
      let vencidosLista = []
      let proximosLista = []

      if (projetoId) {
        const [usuariosRes, agendaHojeRes, vencidosRes, proximosRes, realizadosRes, listaHoje, listaVencidos, listaProximos] = await Promise.all([
          supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).eq('situacao', 'ativo'),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).lt('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).gte('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,hora_fim,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,tipo_atend,situacao')
            .eq('projeto_id', projetoId)
            .eq('data_atend', hoje)
            .in('situacao', ['agendado','reagendado'])
            .order('hora_inicio', { ascending:true })
            .limit(8),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,hora_fim,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,tipo_atend,situacao')
            .eq('projeto_id', projetoId)
            .lt('data_atend', hoje)
            .in('situacao', ['agendado','reagendado'])
            .order('data_atend', { ascending:true })
            .order('hora_inicio', { ascending:true })
            .limit(6),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,hora_fim,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,tipo_atend,situacao')
            .eq('projeto_id', projetoId)
            .gte('data_atend', hoje)
            .in('situacao', ['agendado','reagendado'])
            .order('data_atend', { ascending:true })
            .order('hora_inicio', { ascending:true })
            .limit(10),
        ])

        totalUsuarios = usuariosRes.count || 0
        agendaHojeCount = agendaHojeRes.count || 0
        vencidosCount = vencidosRes.count || 0
        proximosCount = proximosRes.count || 0
        realizadosCount = realizadosRes.count || 0
        hojeLista = listaHoje.data || []
        vencidosLista = listaVencidos.data || []
        proximosLista = listaProximos.data || []
      }

      if (!mounted) return
      setEquipe(equipeData)
      setDados({ usuarios: totalUsuarios, hoje: agendaHojeCount, vencidos: vencidosCount, proximos: proximosCount, realizadosMes: realizadosCount })
      setAgendaHoje(hojeLista)
      setPendentes(vencidosLista)
      setProximos(proximosLista)
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

  const botao = (bg, color = '#fff') => ({
    border:'none', borderRadius:14, padding:'15px 16px', background:bg, color, fontWeight:800,
    cursor:'pointer', display:'flex', alignItems:'center', gap:12, textAlign:'left', width:'100%', minHeight:66,
  })

  function abrirAgenda(filtro = '') {
    navigate(filtro ? `/atendimentos?${filtro}` : '/atendimentos')
  }

  function imprimirAgenda(titulo, itens) {
    const hojeFmt = new Date().toLocaleDateString('pt-BR')
    const periodoLabel = /hoje/i.test(titulo) ? `Hoje, ${hojeFmt}`
      : /atrasad/i.test(titulo) ? 'Anteriores a hoje'
      : /próximo/i.test(titulo) ? `A partir de ${hojeFmt}`
      : hojeFmt
    const itensComProfissional = (itens || []).map(a => ({ ...a, profissional_nome: profissionalNome(a.profissional_id) }))
    gerarPDFAgendaTeacolher(itensComProfissional, titulo, {
      subtitulo: 'Projeto TEAcolher · Associação TEIAA',
      periodoLabel,
    })
  }

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
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => imprimirAgenda(imprimirTitulo || titulo, itens)} style={{ border:'0.5px solid #D9D6CC', borderRadius:999, background:'#fff', color:'#5F5E5A', fontSize:11, fontWeight:800, padding:'6px 10px', cursor:'pointer' }}>
            <i className="ti ti-printer" /> imprimir
          </button>
          <button onClick={acao} style={{ border:'none', borderRadius:999, background:cor, color:'#fff', fontSize:11, fontWeight:800, padding:'6px 11px', cursor:'pointer' }}>abrir</button>
        </div>
      </div>
      {loading ? <div style={{ fontSize:12, color:'#B4B2A9', textAlign:'center', padding:'1rem 0' }}>Carregando...</div> : itens.length === 0 ? (
        <div style={{ fontSize:12, color:'#99978F', textAlign:'center', padding:'1.2rem 0' }}>{vazio}</div>
      ) : itens.map((a, i) => linhaAgenda(a, i, itens.length))}
    </div>
  )

  return (
    <div>
      <div style={{ height:TOPBAR_H, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile ? '0 12px' : '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div>
          <div style={{ fontSize:isMobile ? 17 : 20, fontWeight:900, color:DARK }}>{saudacao}, {nome}!</div>
          <div style={{ fontSize:12, color:'#6B6A66', marginTop:3 }}>Painel operacional · organizar usuários e agenda</div>
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => navigate('/usuarios-atendidos')} style={{ border:'0.5px solid #D9D6CC', background:'#fff', borderRadius:10, padding:'8px 14px', color:DARK, fontWeight:800, cursor:'pointer' }}><i className="ti ti-user-plus" /> Novo usuário</button>
            <button onClick={() => navigate('/atendimentos?novo=1')} style={{ border:'none', background:AG_BLUE, borderRadius:10, padding:'8px 14px', color:'#fff', fontWeight:800, cursor:'pointer' }}><i className="ti ti-calendar-plus" /> Agendar</button>
          </div>
        )}
      </div>

      <div style={{ padding:isMobile ? '12px' : '20px 24px', display:'grid', gap:14 }}>
        {erro && (
          <div style={{ ...card, padding:14, borderLeft:`3px solid ${RED}`, color:'#A32D2D', fontSize:12 }}>{erro}</div>
        )}

        <div style={{ ...card, padding:18, borderLeft:'4px solid rgba(14,126,168,.65)' }}>
          <div style={{ fontSize:16, fontWeight:900, color:DARK, marginBottom:5 }}>O que essa tela faz?</div>
          <div style={{ fontSize:13, color:'#4B5563', lineHeight:1.45 }}>
            Aqui você faz a parte simples da agenda: cadastra a família, marca atendimento, remarca ou cancela. O registro técnico/evolução fica somente para o profissional técnico.
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3, 1fr)', gap:10 }}>
          <button onClick={() => navigate('/usuarios-atendidos')} style={botao(AG_BLUE)}>
            <i className="ti ti-user-plus" style={{ fontSize:22 }} />
            <span><span style={{ fontSize:14 }}>1. Cadastrar usuário/família</span><br/><small style={{ fontWeight:500 }}>Comece por aqui quando a pessoa ainda não existe no sistema.</small></span>
          </button>
          <button onClick={() => navigate('/atendimentos?novo=1')} style={botao(DARK)}>
            <i className="ti ti-calendar-plus" style={{ fontSize:22 }} />
            <span><span style={{ fontSize:14 }}>2. Agendar atendimento</span><br/><small style={{ fontWeight:500 }}>Escolha usuário, data, horário e profissional.</small></span>
          </button>
          <button onClick={() => abrirAgenda('situacao=agendado')} style={botao(ORANGE)}>
            <i className="ti ti-calendar-time" style={{ fontSize:22 }} />
            <span><span style={{ fontSize:14 }}>3. Remarcar ou cancelar</span><br/><small style={{ fontWeight:500 }}>Use quando mudou data, horário ou profissional.</small></span>
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap:10 }}>
          {[
            ['Famílias ativas', dados.usuarios, DARK, 'Cadastradas no TEAcolher'],
            ['Hoje', dados.hoje, AG_BLUE, 'Marcados para hoje'],
            ['Atrasados', dados.vencidos, RED, 'Já passou da data'],
            ['Próximos', dados.proximos, ORANGE, 'Hoje em diante'],
            ['Feitos no mês', dados.realizadosMes, GREEN, 'Registrados pelo técnico'],
          ].map(([label, value, color, desc]) => (
            <div key={label} style={{ ...card, padding:'14px 14px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
              <div style={{ fontSize:10.5, color:'#7A8893', marginBottom:4, fontWeight:700 }}>{label}</div>
              <div style={{ fontSize:26, fontWeight:900, color }}>{loading ? '...' : value}</div>
              <div style={{ fontSize:10.5, color:'#9AA3AF', marginTop:2 }}>{desc}</div>
            </div>
          ))}
        </div>

        {dados.vencidos > 0 && (
          <div style={{ ...card, padding:14, borderLeft:`4px solid ${RED}`, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:900, color:'#A32D2D' }}>Atenção: existem atendimentos com data passada ainda como agendados.</div>
              <div style={{ fontSize:11.5, color:'#6B7280', marginTop:2 }}>O operacional pode conferir/remarcar/cancelar. Se o atendimento aconteceu, o técnico precisa finalizar.</div>
            </div>
            <button onClick={() => abrirAgenda('situacao=agendado')} style={{ border:'none', borderRadius:10, background:RED, color:'#fff', fontSize:12, fontWeight:900, padding:'9px 12px', cursor:'pointer' }}>Conferir agora</button>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '380px 1fr', gap:14, alignItems:'start' }}>
          <div style={{ ...card, padding:16 }}>
            <div style={{ fontSize:15, fontWeight:900, color:DARK, marginBottom:12 }}>Atalhos simples</div>
            <div style={{ display:'grid', gap:10 }}>
              <button onClick={() => navigate('/usuarios-atendidos')} style={botao('#E6F1FB', '#185FA5')}><i className="ti ti-users" /> <span>Ver usuários/famílias<br/><small style={{ fontWeight:500 }}>Cadastrar ou editar dados básicos</small></span></button>
              <button onClick={() => navigate('/atendimentos')} style={botao('#EAF3DE', '#3B6D11')}><i className="ti ti-list-check" /> <span>Ver agenda completa<br/><small style={{ fontWeight:500 }}>Lista geral de agendamentos</small></span></button>
              <button onClick={() => imprimirAgenda('Agenda TEAcolher de hoje', agendaHoje)} style={botao('#F1EFE8', '#5F5E5A')}><i className="ti ti-printer" /> <span>Imprimir agenda de hoje<br/><small style={{ fontWeight:500 }}>Impressão limpa, sem botões</small></span></button>
            </div>
          </div>

          <div style={{ display:'grid', gap:14 }}>
            {blocoAgenda('Agenda de hoje', 'O que precisa acontecer hoje.', agendaHoje, 'Nenhum atendimento agendado para hoje.', AG_BLUE, () => abrirAgenda(), 'Agenda TEAcolher de hoje')}
            {blocoAgenda('Atrasados / precisam de conferência', 'Data passou e ainda está como agendado.', pendentes, 'Não há agendamentos atrasados.', RED, () => abrirAgenda('situacao=agendado'), 'Agendamentos TEAcolher atrasados')}
            {blocoAgenda('Próximos agendamentos', 'Agenda futura para você conferir.', proximosSemHoje, 'Nenhum próximo atendimento agendado.', ORANGE, () => abrirAgenda('situacao=agendado'), 'Próximos agendamentos TEAcolher')}
          </div>
        </div>
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
                <button onClick={() => navigate(`/usuarios-atendidos`)} style={{ border:'none', borderRadius:8, background:AG_BLUE, color:'#fff', fontSize:11, fontWeight:800, padding:'7px 12px', cursor:'pointer' }}>Editar cadastro</button>
                <button onClick={() => navigate(`/atendimentos?novo=1`)} style={{ border:'none', borderRadius:8, background:DARK, color:'#fff', fontSize:11, fontWeight:800, padding:'7px 12px', cursor:'pointer' }}>+ Agendar atendimento</button>
              </div>

              <div style={{ fontSize:13, fontWeight:700, color:DARK, marginBottom:8 }}>Histórico de atendimentos ({fichaAtendimentos.length})</div>
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
                    <div style={{ fontSize:11.5, color:'#5F5E5A', marginTop:3 }}>{a.etapa_fluxo || 'Atendimento'} {a.area_atendimento ? `· ${a.area_atendimento}` : ''}</div>
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
