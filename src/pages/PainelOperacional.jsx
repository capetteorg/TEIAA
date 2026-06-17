import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'

const AG_BLUE = '#0E7EA8'
const DARK = '#06344F'
const GREEN = '#6BBF2B'
const ORANGE = '#F4821F'
const TOPBAR_H = 62

const cardBase = {
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
  const [projetos, setProjetos] = useState([])
  const [dados, setDados] = useState({ usuarios: 0, hoje: 0, finalizar: 0, realizadosMes: 0 })
  const [agendaHoje, setAgendaHoje] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [realizadosRecentes, setRealizadosRecentes] = useState([])

  useEffect(() => {
    let mounted = true

    async function carregar() {
      setLoading(true)

      const hoje = new Date().toISOString().slice(0, 10)
      const inicioMes = hoje.slice(0, 8) + '01'

      const { data: projetosData = [] } = await supabase
        .from('projetos')
        .select('id,nome,aceita_atendimentos')
        .eq('aceita_atendimentos', true)
        .order('nome')

      if (!mounted) return

      const projetoTea = projetosData.find(p => String(p.nome || '').toLowerCase().includes('teacolher'))
      const projetoId = projetoTea?.id || null

      let totalUsuarios = 0
      let agendaCount = 0
      let pendentesCount = 0
      let realizadosCount = 0
      let hojeLista = []
      let pendentesLista = []
      let realizadosLista = []

      if (projetoId) {
        const [usuariosRes, agendaCountRes, pendentesCountRes, realizadosCountRes, hojeRes, pendentesRes, realizadosRes] = await Promise.all([
          supabase.from('usuarios_atendidos').select('id', { count: 'exact', head: true }).eq('projeto_id', projetoId),
          supabase.from('atendimentos').select('id', { count: 'exact', head: true }).eq('projeto_id', projetoId).eq('data_atend', hoje).in('situacao', ['agendado', 'reagendado']),
          supabase.from('atendimentos').select('id', { count: 'exact', head: true }).eq('projeto_id', projetoId).lte('data_atend', hoje).in('situacao', ['agendado', 'reagendado']),
          supabase.from('atendimentos').select('id', { count: 'exact', head: true }).eq('projeto_id', projetoId).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,pessoa_atendida,tipo_atend,etapa_fluxo,situacao')
            .eq('projeto_id', projetoId)
            .eq('data_atend', hoje)
            .in('situacao', ['agendado', 'reagendado'])
            .order('hora_inicio', { ascending: true })
            .limit(5),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,pessoa_atendida,tipo_atend,etapa_fluxo,situacao')
            .eq('projeto_id', projetoId)
            .lte('data_atend', hoje)
            .in('situacao', ['agendado', 'reagendado'])
            .order('data_atend', { ascending: true })
            .order('hora_inicio', { ascending: true })
            .limit(5),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,pessoa_atendida,tipo_atend,etapa_fluxo,situacao')
            .eq('projeto_id', projetoId)
            .eq('situacao', 'realizado')
            .order('data_atend', { ascending: false })
            .order('hora_inicio', { ascending: false })
            .limit(5),
        ])

        totalUsuarios = usuariosRes.count || 0
        agendaCount = agendaCountRes.count || 0
        pendentesCount = pendentesCountRes.count || 0
        realizadosCount = realizadosCountRes.count || 0
        hojeLista = hojeRes.data || []
        pendentesLista = pendentesRes.data || []
        realizadosLista = realizadosRes.data || []
      }

      if (!mounted) return
      setProjetos(projetosData)
      setDados({ usuarios: totalUsuarios, hoje: agendaCount, finalizar: pendentesCount, realizadosMes: realizadosCount })
      setAgendaHoje(hojeLista)
      setPendentes(pendentesLista)
      setRealizadosRecentes(realizadosLista)
      setLoading(false)
    }

    carregar()
    return () => { mounted = false }
  }, [])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = perfil?.nome?.split(' ')[0] || 'TEIAA'

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0, 5) : ''
  const subtituloAt = a => [a.etapa_fluxo || a.tipo_atend || 'Atendimento', fmtData(a.data_atend), fmtHora(a.hora_inicio)].filter(Boolean).join(' · ')

  const resumoCards = useMemo(() => ([
    { label: 'Usuários TEAcolher', value: dados.usuarios, color: DARK, icon: 'users' },
    { label: 'Agendados hoje', value: dados.hoje, color: AG_BLUE, icon: 'calendar-event' },
    { label: 'Para finalizar', value: dados.finalizar, color: ORANGE, icon: 'clipboard-check' },
    { label: 'Realizados no mês', value: dados.realizadosMes, color: GREEN, icon: 'checkup-list' },
  ]), [dados])

  const actionCard = (num, titulo, desc, icon, color, onClick) => (
    <button onClick={onClick} style={{ ...cardBase, width:'100%', padding: '16px', cursor:'pointer', textAlign:'left', display:'flex', gap:14, alignItems:'center', background:'#fff' }}>
      <div style={{ width:40, height:40, borderRadius:12, background: color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:800 }}>
        {num}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <i className={`ti ti-${icon}`} style={{ color }} />
          <div style={{ fontSize:15, fontWeight:800, color:DARK }}>{titulo}</div>
        </div>
        <div style={{ fontSize:12, color:'#6B6A66', lineHeight:1.4 }}>{desc}</div>
      </div>
      <i className="ti ti-chevron-right" style={{ color:'#B4B2A9', fontSize:18 }} />
    </button>
  )

  const listCard = (titulo, desc, badge, badgeColor, items, empty, ctaLabel, ctaAction) => (
    <div style={{ ...cardBase, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:8 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:DARK }}>{titulo}</div>
          {desc && <div style={{ fontSize:11.5, color:'#888780', marginTop:2 }}>{desc}</div>}
        </div>
        {badge !== undefined && <div style={{ padding:'4px 10px', borderRadius:999, background: badgeColor || '#F3F7FA', color:DARK, fontSize:12, fontWeight:700 }}>{badge}</div>}
      </div>
      {loading ? (
        <div style={{ fontSize:12, color:'#B4B2A9', textAlign:'center', padding:'16px 0' }}>Carregando...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'14px 0 4px' }}>
          <div style={{ fontSize:12, color:'#99978F', marginBottom:10 }}>{empty}</div>
          {ctaLabel && <button onClick={ctaAction} style={{ padding:'8px 12px', borderRadius:10, border:'none', background:AG_BLUE, color:'#fff', fontWeight:700, cursor:'pointer' }}>{ctaLabel}</button>}
        </div>
      ) : (
        <div style={{ display:'grid', gap:8 }}>
          {items.map((a, i) => (
            <div key={a.id || i} style={{ border:'0.5px solid #ECE8DF', borderRadius:12, padding:'10px 12px', display:'flex', justifyContent:'space-between', gap:10, alignItems:'center' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#2C2C2A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.pessoa_atendida || 'Usuário/família'}</div>
                <div style={{ fontSize:11.5, color:'#7A7974', marginTop:2 }}>{subtituloAt(a)}</div>
              </div>
              <button
                onClick={() => navigate(a.situacao === 'realizado' ? '/atendimentos?situacao=realizado' : '/atendimentos?situacao=agendado')}
                style={{ padding:'5px 9px', borderRadius:999, border:'none', background: a.situacao === 'realizado' ? '#EAF3DE' : '#E6F1FB', color: a.situacao === 'realizado' ? '#3B6D11' : '#185FA5', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0 }}
              >
                {a.situacao === 'realizado' ? 'ver' : 'finalizar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ height: TOPBAR_H, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile ? '0 12px' : '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', border:'2px solid #E8E6DE', flexShrink:0 }}>
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt={perfil.nome} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:`center ${perfil.foto_position || '50%'}` }} />
            ) : (
              <div style={{ width:'100%', height:'100%', background: perfil?.cor_avatar || AG_BLUE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff' }}>
                {(perfil?.nome || 'U').slice(0,2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: isMobile ? 17 : 20, fontWeight:800, color:DARK, letterSpacing:'-.03em', lineHeight:1.05 }}>
              {saudacao}, {nome}!
            </div>
            <div style={{ fontSize:12, color:'#6B6A66', marginTop:4 }}>
              Painel operacional do Projeto TEAcolher
            </div>
          </div>
        </div>

        {!isMobile && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => navigate('/usuarios-atendidos')} style={{ padding:'8px 14px', borderRadius:10, border:'0.5px solid #D9D6CC', background:'#fff', color:DARK, fontWeight:700, cursor:'pointer' }}>
              <i className="ti ti-user-plus" /> Usuário
            </button>
            <button onClick={() => navigate('/atendimentos?novo=1')} style={{ padding:'8px 14px', borderRadius:10, border:'none', background:AG_BLUE, color:'#fff', fontWeight:700, cursor:'pointer' }}>
              <i className="ti ti-calendar-plus" /> Agendar
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: isMobile ? '12px' : '20px 24px', display:'grid', gap:14 }}>
        <div style={{ ...cardBase, padding:'14px 16px' }}>
          <div style={{ fontSize:13, fontWeight:800, color:DARK, marginBottom:6 }}>Fluxo simples</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', fontSize:12 }}>
            <span style={{ padding:'6px 10px', borderRadius:999, background:'#EEF6FB', color:DARK, fontWeight:700 }}>1. Cadastrar usuário/família</span>
            <span style={{ color:'#B4B2A9' }}>→</span>
            <span style={{ padding:'6px 10px', borderRadius:999, background:'#EEF6FB', color:DARK, fontWeight:700 }}>2. Agendar atendimento</span>
            <span style={{ color:'#B4B2A9' }}>→</span>
            <span style={{ padding:'6px 10px', borderRadius:999, background:'#EEF6FB', color:DARK, fontWeight:700 }}>3. Finalizar registro técnico</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10 }}>
          {resumoCards.map(c => (
            <div key={c.label} style={{ ...cardBase, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:'0 auto auto 0', width:'100%', height:3, background:c.color }} />
              <div style={{ fontSize:11, color:'#7A8893', marginBottom:6 }}>{c.label}</div>
              <div style={{ fontSize: isMobile ? 24 : 28, fontWeight:800, color:c.color, lineHeight:1 }}>{loading ? '...' : c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 420px) 1fr', gap:14, alignItems:'start' }}>
          <div style={{ display:'grid', gap:10 }}>
            <div style={{ ...cardBase, padding:16 }}>
              <div style={{ fontSize:14, fontWeight:800, color:DARK, marginBottom:12 }}>O que você quer fazer?</div>
              <div style={{ display:'grid', gap:10 }}>
                {actionCard('1', 'Cadastrar usuário/família', 'Abrir cadastro do público atendido do TEAcolher.', 'users', AG_BLUE, () => navigate('/usuarios-atendidos'))}
                {actionCard('2', 'Agendar atendimento', 'Registrar data, horário, profissional, etapa e objetivo.', 'calendar-plus', DARK, () => navigate('/atendimentos?novo=1'))}
                {actionCard('3', 'Finalizar atendimento', 'Completar comparecimento, evolução, encaminhamentos e próxima ação.', 'clipboard-check', ORANGE, () => navigate('/atendimentos?situacao=agendado'))}
                {actionCard('4', 'Ver agenda e execução', 'Consultar todos os registros e acompanhar a prestação de contas técnica.', 'report-analytics', GREEN, () => navigate('/atendimentos'))}
              </div>
            </div>

            {isMobile && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <button onClick={() => navigate('/usuarios-atendidos')} style={{ padding:'10px 12px', borderRadius:12, border:'0.5px solid #D9D6CC', background:'#fff', fontWeight:700, color:DARK, cursor:'pointer' }}>
                  + Usuário
                </button>
                <button onClick={() => navigate('/atendimentos?novo=1')} style={{ padding:'10px 12px', borderRadius:12, border:'none', background:AG_BLUE, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                  + Agendar
                </button>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gap:14 }}>
            {listCard('Agenda de hoje', 'Atendimentos marcados para hoje.', dados.hoje, '#E6F1FB', agendaHoje, 'Nenhum atendimento agendado para hoje.', 'Agendar atendimento', () => navigate('/atendimentos?novo=1'))}
            {listCard('Pendentes de finalização', 'Atendimentos agendados que ainda precisam de registro técnico.', dados.finalizar, '#FFF1E4', pendentes, 'Não há atendimentos pendentes para finalizar.', 'Ir para atendimentos', () => navigate('/atendimentos?situacao=agendado'))}
            {listCard('Últimos realizados', 'Registros finalizados recentemente.', dados.realizadosMes, '#EAF3DE', realizadosRecentes, 'Nenhum atendimento realizado registrado ainda.', 'Ver agenda', () => navigate('/atendimentos?situacao=realizado'))}
          </div>
        </div>
      </div>
    </div>
  )
}
