import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'

const AG_BLUE = '#0E7EA8'
const DARK = '#06344F'
const GREEN = '#6BBF2B'
const ORANGE = '#F4821F'
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
  const [dados, setDados] = useState({ usuarios: 0, hoje: 0, aguardandoTecnico: 0, realizadosMes: 0 })
  const [agendaHoje, setAgendaHoje] = useState([])
  const [agendamentos, setAgendamentos] = useState([])

  useEffect(() => {
    let mounted = true
    async function carregar() {
      setLoading(true)
      const hoje = new Date().toISOString().slice(0, 10)
      const inicioMes = hoje.slice(0, 8) + '01'

      const { data: projetos } = await supabase
        .from('projetos')
        .select('id,nome')
        .eq('aceita_atendimentos', true)
        .order('nome')

      const projetoTea = (projetos || []).find(p => String(p.nome || '').toLowerCase().includes('teacolher'))
      const projetoId = projetoTea?.id

      let totalUsuarios = 0
      let agendaHojeCount = 0
      let aguardando = 0
      let realizados = 0
      let hojeLista = []
      let agendaLista = []

      if (projetoId) {
        const [usuariosRes, agendaHojeRes, aguardandoRes, realizadosRes, listaHoje, listaAgenda] = await Promise.all([
          supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).lte('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,pessoa_atendida,etapa_fluxo,tipo_atend,situacao')
            .eq('projeto_id', projetoId)
            .eq('data_atend', hoje)
            .in('situacao', ['agendado','reagendado'])
            .order('hora_inicio', { ascending:true })
            .limit(5),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,pessoa_atendida,etapa_fluxo,tipo_atend,situacao')
            .eq('projeto_id', projetoId)
            .in('situacao', ['agendado','reagendado'])
            .order('data_atend', { ascending:true })
            .order('hora_inicio', { ascending:true })
            .limit(6),
        ])
        totalUsuarios = usuariosRes.count || 0
        agendaHojeCount = agendaHojeRes.count || 0
        aguardando = aguardandoRes.count || 0
        realizados = realizadosRes.count || 0
        hojeLista = listaHoje.data || []
        agendaLista = listaAgenda.data || []
      }

      if (!mounted) return
      setDados({ usuarios: totalUsuarios, hoje: agendaHojeCount, aguardandoTecnico: aguardando, realizadosMes: realizados })
      setAgendaHoje(hojeLista)
      setAgendamentos(agendaLista)
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0, 5) : ''
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = perfil?.nome?.split(' ')[0] || 'Operacional'
  const detalhe = a => [a.etapa_fluxo || a.tipo_atend || 'Atendimento', fmtData(a.data_atend), fmtHora(a.hora_inicio)].filter(Boolean).join(' · ')

  const botao = (bg, color = '#fff') => ({ border:'none', borderRadius:12, padding:'14px 16px', background:bg, color, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:12, textAlign:'left' })

  const listaAgenda = (titulo, desc, itens, vazio, acao) => (
    <div style={{ ...card, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:DARK }}>{titulo}</div>
          <div style={{ fontSize:11.5, color:'#888780', marginTop:2 }}>{desc}</div>
        </div>
        <button onClick={acao} style={{ border:'none', borderRadius:999, background:AG_BLUE, color:'#fff', fontSize:11, fontWeight:700, padding:'5px 10px', cursor:'pointer' }}>abrir</button>
      </div>
      {loading ? <div style={{ fontSize:12, color:'#B4B2A9', textAlign:'center', padding:'1rem 0' }}>Carregando...</div> : itens.length === 0 ? (
        <div style={{ fontSize:12, color:'#99978F', textAlign:'center', padding:'1rem 0' }}>{vazio}</div>
      ) : itens.map((a, i) => (
        <div key={a.id || i} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'9px 0', borderBottom:i < itens.length - 1 ? '0.5px solid #F1EFE8' : 'none' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:'#2C2C2A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.pessoa_atendida || 'Usuário/família'}</div>
            <div style={{ fontSize:11, color:'#7A7974', marginTop:2 }}>{detalhe(a)}</div>
          </div>
          <span style={{ fontSize:10.5, color:ORANGE, fontWeight:700, flexShrink:0 }}>agendado</span>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <div style={{ height:TOPBAR_H, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile ? '0 12px' : '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div>
          <div style={{ fontSize:isMobile ? 17 : 20, fontWeight:800, color:DARK }}>{saudacao}, {nome}!</div>
          <div style={{ fontSize:12, color:'#6B6A66', marginTop:3 }}>Painel operacional do Projeto TEAcolher</div>
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => navigate('/usuarios-atendidos')} style={{ border:'0.5px solid #D9D6CC', background:'#fff', borderRadius:10, padding:'8px 14px', color:DARK, fontWeight:700, cursor:'pointer' }}><i className="ti ti-user-plus" /> Usuário</button>
            <button onClick={() => navigate('/atendimentos?novo=1')} style={{ border:'none', background:AG_BLUE, borderRadius:10, padding:'8px 14px', color:'#fff', fontWeight:700, cursor:'pointer' }}><i className="ti ti-calendar-plus" /> Agendar</button>
          </div>
        )}
      </div>

      <div style={{ padding:isMobile ? '12px' : '20px 24px', display:'grid', gap:14 }}>
        <div style={{ ...card, padding:16, borderLeft:'3px solid rgba(14,126,168,.55)' }}>
          <div style={{ fontSize:14, fontWeight:800, color:DARK, marginBottom:4 }}>Fluxo operacional</div>
          <div style={{ fontSize:12, color:'#5F5E5A', lineHeight:1.45 }}>Seu foco é organizar a agenda: cadastrar usuário/família, agendar, remarcar ou cancelar. A finalização técnica fica para o perfil Técnico.</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10 }}>
          {[
            ['Usuários TEAcolher', dados.usuarios, DARK],
            ['Agenda hoje', dados.hoje, AG_BLUE],
            ['Aguardando técnico', dados.aguardandoTecnico, ORANGE],
            ['Realizados no mês', dados.realizadosMes, GREEN],
          ].map(([label, value, color]) => (
            <div key={label} style={{ ...card, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
              <div style={{ fontSize:10.5, color:'#7A8893', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:26, fontWeight:800, color }}>{loading ? '...' : value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '360px 1fr', gap:14, alignItems:'start' }}>
          <div style={{ ...card, padding:16 }}>
            <div style={{ fontSize:14, fontWeight:800, color:DARK, marginBottom:12 }}>O que você quer fazer?</div>
            <div style={{ display:'grid', gap:10 }}>
              <button onClick={() => navigate('/usuarios-atendidos')} style={botao(AG_BLUE)}><i className="ti ti-users" /> <span>Cadastrar usuário/família<br/><small style={{ fontWeight:500 }}>Inscrição e dados básicos</small></span></button>
              <button onClick={() => navigate('/atendimentos?novo=1')} style={botao(DARK)}><i className="ti ti-calendar-plus" /> <span>Agendar atendimento<br/><small style={{ fontWeight:500 }}>Data, horário, profissional e objetivo</small></span></button>
              <button onClick={() => navigate('/atendimentos?situacao=agendado')} style={botao(ORANGE)}><i className="ti ti-calendar-time" /> <span>Editar / remarcar agenda<br/><small style={{ fontWeight:500 }}>Ajustar agendamentos pendentes</small></span></button>
              <button onClick={() => window.print()} style={botao('#F1EFE8', '#5F5E5A')}><i className="ti ti-printer" /> <span>Imprimir agenda<br/><small style={{ fontWeight:500 }}>Impressão da tela atual</small></span></button>
            </div>
          </div>

          <div style={{ display:'grid', gap:14 }}>
            {listaAgenda('Agenda de hoje', 'Atendimentos marcados para hoje.', agendaHoje, 'Nenhum atendimento agendado para hoje.', () => navigate('/atendimentos'))}
            {listaAgenda('Agendamentos pendentes', 'Registros que ainda podem ser editados, remarcados ou cancelados.', agendamentos, 'Nenhum agendamento pendente.', () => navigate('/atendimentos?situacao=agendado'))}
          </div>
        </div>
      </div>
    </div>
  )
}
