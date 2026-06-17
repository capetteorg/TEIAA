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

export default function PainelTecnico() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState({ hoje: 0, finalizar: 0, realizadosMes: 0, acompanhados: 0 })
  const [agendaHoje, setAgendaHoje] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [realizados, setRealizados] = useState([])

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

      let hojeCount = 0
      let finalizarCount = 0
      let realizadosCount = 0
      let acompanhados = 0
      let hojeLista = []
      let pendentesLista = []
      let realizadosLista = []

      if (projetoId) {
        const [hojeRes, finalizarRes, realizadosRes, listaHoje, listaPendentes, listaRealizados, acompanhadosRes] = await Promise.all([
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).lte('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,etapa_fluxo,tipo_atend,situacao').eq('projeto_id', projetoId).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('hora_inicio', { ascending:true }).limit(6),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,etapa_fluxo,tipo_atend,situacao').eq('projeto_id', projetoId).lte('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('data_atend', { ascending:true }).order('hora_inicio', { ascending:true }).limit(6),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,etapa_fluxo,tipo_atend,situacao').eq('projeto_id', projetoId).eq('situacao', 'realizado').order('data_atend', { ascending:false }).limit(6),
          supabase.from('atendimentos').select('usuario_atendido_id').eq('projeto_id', projetoId).not('usuario_atendido_id', 'is', null),
        ])
        hojeCount = hojeRes.count || 0
        finalizarCount = finalizarRes.count || 0
        realizadosCount = realizadosRes.count || 0
        hojeLista = listaHoje.data || []
        pendentesLista = listaPendentes.data || []
        realizadosLista = listaRealizados.data || []
        acompanhados = new Set((acompanhadosRes.data || []).map(x => String(x.usuario_atendido_id))).size
      }

      if (!mounted) return
      setDados({ hoje: hojeCount, finalizar: finalizarCount, realizadosMes: realizadosCount, acompanhados })
      setAgendaHoje(hojeLista)
      setPendentes(pendentesLista)
      setRealizados(realizadosLista)
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0, 5) : ''
  const nome = perfil?.nome?.split(' ')[0] || 'Técnico'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const detalhe = a => [a.etapa_fluxo || a.tipo_atend || 'Atendimento', fmtData(a.data_atend), fmtHora(a.hora_inicio)].filter(Boolean).join(' · ')

  const btn = (bg, color = '#fff') => ({ border:'none', borderRadius:12, padding:'12px 14px', background:bg, color, fontWeight:800, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10 })

  const lista = (titulo, subtitulo, itens, vazio, acao, cor) => (
    <div style={{ ...card, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:DARK }}>{titulo}</div>
          <div style={{ fontSize:11.5, color:'#888780', marginTop:2 }}>{subtitulo}</div>
        </div>
        <button onClick={acao} style={{ fontSize:11, border:'none', borderRadius:99, background:cor, color:'#fff', padding:'5px 10px', fontWeight:700, cursor:'pointer' }}>abrir</button>
      </div>
      {loading ? <div style={{ fontSize:12, color:'#B4B2A9', padding:'1rem 0', textAlign:'center' }}>Carregando...</div> : itens.length === 0 ? (
        <div style={{ fontSize:12, color:'#99978F', padding:'1rem 0', textAlign:'center' }}>{vazio}</div>
      ) : itens.map((a, i) => (
        <div key={a.id || i} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'9px 0', borderBottom:i < itens.length - 1 ? '0.5px solid #F1EFE8' : 'none' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:'#2C2C2A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.pessoa_atendida || 'Usuário/família'}</div>
            <div style={{ fontSize:11, color:'#7A7974', marginTop:2 }}>{detalhe(a)}</div>
          </div>
          <span style={{ fontSize:10.5, color:cor, fontWeight:700, flexShrink:0 }}>{a.situacao}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <div style={{ height:TOPBAR_H, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile ? '0 12px' : '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div>
          <div style={{ fontSize:isMobile ? 17 : 20, fontWeight:800, color:DARK }}>{saudacao}, {nome}!</div>
          <div style={{ fontSize:12, color:'#6B6A66', marginTop:3 }}>Painel técnico do Projeto TEAcolher</div>
        </div>
        {!isMobile && <button onClick={() => navigate('/atendimentos?situacao=agendado')} style={btn(ORANGE)}><i className="ti ti-clipboard-check" /> Finalizar atendimentos</button>}
      </div>

      <div style={{ padding:isMobile ? '12px' : '20px 24px', display:'grid', gap:14 }}>
        <div style={{ ...card, padding:16, borderLeft:'3px solid rgba(244,130,31,.6)' }}>
          <div style={{ fontSize:14, fontWeight:800, color:DARK, marginBottom:4 }}>Sua função técnica</div>
          <div style={{ fontSize:12, color:'#5F5E5A', lineHeight:1.45 }}>Você consulta a agenda, finaliza os atendimentos realizados e registra a evolução técnica, orientação à família, encaminhamentos e próxima ação.</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10 }}>
          {[
            ['Agenda hoje', dados.hoje, AG_BLUE],
            ['Para finalizar', dados.finalizar, ORANGE],
            ['Realizados no mês', dados.realizadosMes, GREEN],
            ['Famílias acompanhadas', dados.acompanhados, DARK],
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
            <div style={{ fontSize:14, fontWeight:800, color:DARK, marginBottom:12 }}>Ações técnicas</div>
            <div style={{ display:'grid', gap:10 }}>
              <button onClick={() => navigate('/atendimentos?situacao=agendado')} style={btn(ORANGE)}><i className="ti ti-clipboard-check" /> Finalizar atendimento</button>
              <button onClick={() => navigate('/atendimentos')} style={btn(AG_BLUE)}><i className="ti ti-calendar" /> Ver agenda técnica</button>
              <button onClick={() => navigate('/atendimentos?situacao=realizado')} style={btn(GREEN)}><i className="ti ti-history" /> Histórico realizado</button>
              <button onClick={() => window.print()} style={btn('#F1EFE8', '#5F5E5A')}><i className="ti ti-printer" /> Imprimir tela atual</button>
            </div>
          </div>

          <div style={{ display:'grid', gap:14 }}>
            {lista('Agenda de hoje', 'Atendimentos técnicos marcados para hoje.', agendaHoje, 'Nenhum atendimento técnico na agenda de hoje.', () => navigate('/atendimentos'), AG_BLUE)}
            {lista('Pendentes de finalização', 'Agendamentos que precisam de evolução/registro técnico.', pendentes, 'Não há pendências técnicas para finalizar.', () => navigate('/atendimentos?situacao=agendado'), ORANGE)}
            {lista('Últimos realizados', 'Atendimentos finalizados recentemente.', realizados, 'Nenhum atendimento realizado ainda.', () => navigate('/atendimentos?situacao=realizado'), GREEN)}
          </div>
        </div>
      </div>
    </div>
  )
}
