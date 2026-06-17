import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { gerarPDFAgendaTecnicoTeacolher } from '../lib/pdf'

const AG_BLUE = '#0E7EA8'
const DARK = '#06344F'
const GREEN = '#6BBF2B'
const ORANGE = '#F4821F'
const RED = '#E63214'
const TOPBAR_H = 62

const card = {
  background: 'rgba(255,255,255,0.94)',
  border: '0.5px solid #E8E6DE',
  borderRadius: 16,
  boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
}

export default function PainelTecnico() {
  const navigate = useNavigate()
  const { perfil, user } = useAuth()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [profissionalAtual, setProfissionalAtual] = useState({ id: null, nome: '', funcao: '' })
  const [projetoTeacolherId, setProjetoTeacolherId] = useState(null)
  const [dados, setDados] = useState({ hoje: 0, finalizar: 0, realizadosMes: 0, acompanhados: 0 })
  const [agendaHoje, setAgendaHoje] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [realizados, setRealizados] = useState([])

  useEffect(() => {
    let mounted = true

    async function carregar() {
      setLoading(true)
      setMsg('')

      const hoje = new Date().toISOString().slice(0, 10)
      const inicioMes = hoje.slice(0, 8) + '01'

      let equipeId = perfil?.equipe_id || null

      if (!equipeId && user?.id) {
        const { data: usuarioPerfil } = await supabase
          .from('usuarios')
          .select('equipe_id')
          .eq('id', user.id)
          .maybeSingle()
        equipeId = usuarioPerfil?.equipe_id || null
      }

      if (!equipeId) {
        if (!mounted) return
        setProfissionalAtual({ id: null, nome: perfil?.nome || 'Técnico', funcao: '' })
        setDados({ hoje: 0, finalizar: 0, realizadosMes: 0, acompanhados: 0 })
        setAgendaHoje([])
        setPendentes([])
        setRealizados([])
        setMsg('Este usuário técnico ainda não está vinculado a um profissional da equipe. Vincule o campo equipe_id na tabela usuarios.')
        setLoading(false)
        return
      }

      const [{ data: projetos }, { data: profissional }] = await Promise.all([
        supabase
          .from('projetos')
          .select('id,nome')
          .eq('aceita_atendimentos', true)
          .order('nome'),
        supabase
          .from('equipe')
          .select('id,nome,funcao')
          .eq('id', equipeId)
          .maybeSingle(),
      ])

      const projetoTea = (projetos || []).find(p => String(p.nome || '').toLowerCase().includes('teacolher'))
      const projetoId = projetoTea?.id
      if (mounted) setProjetoTeacolherId(projetoId || null)

      let hojeCount = 0
      let finalizarCount = 0
      let realizadosCount = 0
      let acompanhados = 0
      let hojeLista = []
      let pendentesLista = []
      let realizadosLista = []

      if (projetoId) {
        const selectLista = 'id,data_atend,hora_inicio,hora_fim,pessoa_atendida,usuario_atendido_id,etapa_fluxo,tipo_atend,situacao,area_atendimento,modalidade_atendimento,comparecimento,desfecho_teacolher,profissional_id'

        const [hojeRes, finalizarRes, realizadosRes, listaHoje, listaPendentes, listaRealizados, acompanhadosRes] = await Promise.all([
          supabase
            .from('atendimentos')
            .select('id', { count:'exact', head:true })
            .eq('projeto_id', projetoId)
            .eq('profissional_id', equipeId)
            .eq('data_atend', hoje)
            .in('situacao', ['agendado','reagendado']),
          supabase
            .from('atendimentos')
            .select('id', { count:'exact', head:true })
            .eq('projeto_id', projetoId)
            .eq('profissional_id', equipeId)
            .lte('data_atend', hoje)
            .in('situacao', ['agendado','reagendado']),
          supabase
            .from('atendimentos')
            .select('id', { count:'exact', head:true })
            .eq('projeto_id', projetoId)
            .eq('profissional_id', equipeId)
            .gte('data_atend', inicioMes)
            .eq('situacao', 'realizado'),
          supabase
            .from('atendimentos')
            .select(selectLista)
            .eq('projeto_id', projetoId)
            .eq('profissional_id', equipeId)
            .eq('data_atend', hoje)
            .in('situacao', ['agendado','reagendado'])
            .order('hora_inicio', { ascending:true })
            .limit(8),
          supabase
            .from('atendimentos')
            .select(selectLista)
            .eq('projeto_id', projetoId)
            .eq('profissional_id', equipeId)
            .lte('data_atend', hoje)
            .in('situacao', ['agendado','reagendado'])
            .order('data_atend', { ascending:true })
            .order('hora_inicio', { ascending:true })
            .limit(8),
          supabase
            .from('atendimentos')
            .select(selectLista)
            .eq('projeto_id', projetoId)
            .eq('profissional_id', equipeId)
            .eq('situacao', 'realizado')
            .order('data_atend', { ascending:false })
            .limit(8),
          supabase
            .from('atendimentos')
            .select('usuario_atendido_id')
            .eq('projeto_id', projetoId)
            .eq('profissional_id', equipeId)
            .not('usuario_atendido_id', 'is', null),
        ])

        const erro = hojeRes.error || finalizarRes.error || realizadosRes.error || listaHoje.error || listaPendentes.error || listaRealizados.error || acompanhadosRes.error
        if (erro) {
          setMsg('Erro ao carregar sua agenda técnica: ' + erro.message)
        }

        hojeCount = hojeRes.count || 0
        finalizarCount = finalizarRes.count || 0
        realizadosCount = realizadosRes.count || 0
        hojeLista = listaHoje.data || []
        pendentesLista = listaPendentes.data || []
        realizadosLista = listaRealizados.data || []
        acompanhados = new Set((acompanhadosRes.data || []).map(x => String(x.usuario_atendido_id))).size
      }

      if (!mounted) return
      setProfissionalAtual({
        id: equipeId,
        nome: profissional?.nome || perfil?.nome || 'Técnico',
        funcao: profissional?.funcao || '',
      })
      setDados({ hoje: hojeCount, finalizar: finalizarCount, realizadosMes: realizadosCount, acompanhados })
      setAgendaHoje(hojeLista)
      setPendentes(pendentesLista)
      setRealizados(realizadosLista)
      setLoading(false)
    }

    carregar()
    return () => { mounted = false }
  }, [perfil?.equipe_id, perfil?.nome, user?.id])

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0, 5) : ''
  const nome = (profissionalAtual.nome || perfil?.nome || 'Técnico').split(' ')[0]
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const detalhe = a => [a.etapa_fluxo || a.tipo_atend || 'Atendimento', fmtData(a.data_atend), fmtHora(a.hora_inicio)].filter(Boolean).join(' · ')
  const destino = situacao => situacao ? `/atendimentos?situacao=${situacao}` : '/atendimentos'

  const btn = (bg, color = '#fff') => ({
    border:'none',
    borderRadius:12,
    padding:'12px 14px',
    background:bg,
    color,
    fontWeight:800,
    cursor:'pointer',
    textAlign:'left',
    display:'flex',
    alignItems:'center',
    gap:10,
    justifyContent:'space-between',
  })

  function dataLocalISO(data = new Date()) {
    const d = new Date(data)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }

  function periodoAgenda(tipo) {
    const base = new Date()
    const inicio = new Date(base)
    const fim = new Date(base)

    if (tipo === 'semana') {
      const dia = base.getDay()
      const diffSegunda = dia === 0 ? -6 : 1 - dia
      inicio.setDate(base.getDate() + diffSegunda)
      fim.setTime(inicio.getTime())
      fim.setDate(inicio.getDate() + 6)
    }

    if (tipo === 'mes') {
      inicio.setDate(1)
      fim.setMonth(base.getMonth() + 1)
      fim.setDate(0)
    }

    return {
      inicio: dataLocalISO(inicio),
      fim: dataLocalISO(fim),
    }
  }

  function labelPeriodo(tipo, inicio, fim) {
    if (tipo === 'dia') return `Dia ${fmtData(inicio)}`
    if (tipo === 'semana') return `Semana de ${fmtData(inicio)} a ${fmtData(fim)}`
    return `Mês de ${new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR', { month:'long', year:'numeric' })}`
  }

  async function imprimirAgendaPeriodo(tipo = 'dia') {
    if (!profissionalAtual.id) {
      setMsg('Não foi possível imprimir: este usuário técnico ainda não está vinculado à equipe.')
      return
    }

    if (!projetoTeacolherId) {
      setMsg('Não foi possível imprimir: Projeto TEAcolher não encontrado.')
      return
    }

    const { inicio, fim } = periodoAgenda(tipo)

    const { data, error } = await supabase
      .from('atendimentos')
      .select('id,data_atend,hora_inicio,hora_fim,pessoa_atendida,usuario_atendido_id,etapa_fluxo,tipo_atend,situacao,area_atendimento,modalidade_atendimento,comparecimento,desfecho_teacolher,profissional_id')
      .eq('projeto_id', projetoTeacolherId)
      .eq('profissional_id', profissionalAtual.id)
      .gte('data_atend', inicio)
      .lte('data_atend', fim)
      .order('data_atend', { ascending:true })
      .order('hora_inicio', { ascending:true })

    if (error) {
      setMsg('Erro ao gerar impressão da agenda: ' + error.message)
      return
    }

    const periodoLabel = labelPeriodo(tipo, inicio, fim)
    const titulo = tipo === 'dia'
      ? 'Minha agenda diária TEAcolher'
      : tipo === 'semana'
        ? 'Minha agenda semanal TEAcolher'
        : 'Minha agenda mensal TEAcolher'

    gerarPDFAgendaTecnicoTeacolher(
      (data || []).map(a => ({
        ...a,
        profissional_nome: profissionalAtual.nome,
      })),
      {
        titulo,
        periodoLabel,
        profissionalNome: profissionalAtual.nome || perfil?.nome || 'Técnico',
        funcao: profissionalAtual.funcao || '',
        tipo,
      }
    )
  }

  const lista = (titulo, subtitulo, itens, vazio, acao, cor, labelBotao = 'abrir') => (
    <div style={{ ...card, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:DARK }}>{titulo}</div>
          <div style={{ fontSize:11.5, color:'#888780', marginTop:2 }}>{subtitulo}</div>
        </div>
        <button onClick={acao} style={{ fontSize:11, border:'none', borderRadius:99, background:cor, color:'#fff', padding:'5px 10px', fontWeight:700, cursor:'pointer' }}>{labelBotao}</button>
      </div>
      {loading ? <div style={{ fontSize:12, color:'#B4B2A9', padding:'1rem 0', textAlign:'center' }}>Carregando sua agenda...</div> : itens.length === 0 ? (
        <div style={{ fontSize:12, color:'#99978F', padding:'1rem 0', textAlign:'center' }}>{vazio}</div>
      ) : itens.map((a, i) => (
        <button key={a.id || i} onClick={() => acao()} style={{ width:'100%', border:'none', background:'transparent', textAlign:'left', display:'flex', justifyContent:'space-between', gap:10, padding:'10px 0', borderBottom:i < itens.length - 1 ? '0.5px solid #F1EFE8' : 'none', cursor:'pointer' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:800, color:'#2C2C2A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.pessoa_atendida || 'Usuário/família'}</div>
            <div style={{ fontSize:11, color:'#7A7974', marginTop:2 }}>{detalhe(a)}</div>
          </div>
          <span style={{ fontSize:10.5, color:cor, fontWeight:800, flexShrink:0 }}>{a.situacao}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <div style={{ height:TOPBAR_H, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile ? '0 12px' : '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div>
          <div style={{ fontSize:isMobile ? 17 : 20, fontWeight:800, color:DARK }}>{saudacao}, {nome}!</div>
          <div style={{ fontSize:12, color:'#6B6A66', marginTop:3 }}>
            Minha agenda técnica · Projeto TEAcolher
            {profissionalAtual.funcao ? ` · ${profissionalAtual.funcao}` : ''}
          </div>
        </div>
        {!isMobile && <button onClick={() => navigate(destino('agendado'))} style={btn(ORANGE)}><span><i className="ti ti-clipboard-check" /> Finalizar meus atendimentos</span></button>}
      </div>

      <div style={{ padding:isMobile ? '12px' : '20px 24px', display:'grid', gap:14 }}>
        {msg && (
          <div style={{ ...card, padding:14, borderLeft:`3px solid ${RED}`, color:'#A32D2D', fontSize:12, fontWeight:700 }}>
            {msg}
          </div>
        )}

        <div style={{ ...card, padding:16, borderLeft:'3px solid rgba(244,130,31,.6)' }}>
          <div style={{ fontSize:14, fontWeight:800, color:DARK, marginBottom:4 }}>Sua rotina técnica</div>
          <div style={{ fontSize:12, color:'#5F5E5A', lineHeight:1.45 }}>
            Aqui aparece somente a sua agenda. Você finaliza apenas atendimentos direcionados ao seu usuário técnico e registra evolução, orientação familiar, encaminhamentos e próxima ação.
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10 }}>
          {[
            ['Minha agenda hoje', dados.hoje, AG_BLUE],
            ['Meus pendentes', dados.finalizar, ORANGE],
            ['Meus realizados no mês', dados.realizadosMes, GREEN],
            ['Famílias acompanhadas por mim', dados.acompanhados, DARK],
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
              <button onClick={() => navigate(destino('agendado'))} style={btn(ORANGE)}><span><i className="ti ti-clipboard-check" /> Finalizar atendimento</span><i className="ti ti-chevron-right" /></button>
              <button onClick={() => navigate(destino(''))} style={btn(AG_BLUE)}><span><i className="ti ti-calendar" /> Ver minha agenda</span><i className="ti ti-chevron-right" /></button>
              <button onClick={() => navigate(destino('realizado'))} style={btn(GREEN)}><span><i className="ti ti-history" /> Ver meus realizados</span><i className="ti ti-chevron-right" /></button>
              <button onClick={() => imprimirAgendaPeriodo('dia')} style={btn('#F1EFE8', '#5F5E5A')}><span><i className="ti ti-printer" /> Imprimir agenda de hoje</span><i className="ti ti-calendar" /></button>
              <button onClick={() => imprimirAgendaPeriodo('semana')} style={btn('#F1EFE8', '#5F5E5A')}><span><i className="ti ti-printer" /> Imprimir agenda da semana</span><i className="ti ti-calendar-week" /></button>
              <button onClick={() => imprimirAgendaPeriodo('mes')} style={btn('#F1EFE8', '#5F5E5A')}><span><i className="ti ti-printer" /> Imprimir agenda do mês</span><i className="ti ti-calendar-month" /></button>
            </div>
            <div style={{ marginTop:12, padding:'10px 12px', borderRadius:12, background:'rgba(14,126,168,0.06)', color:'#5F5E5A', fontSize:11.5, lineHeight:1.45 }}>
              O sistema já filtra automaticamente pelo seu vínculo técnico. As impressões diária, semanal e mensal saem somente com a sua agenda.
            </div>
          </div>

          <div style={{ display:'grid', gap:14 }}>
            {lista('Minha agenda de hoje', 'Somente atendimentos marcados para você hoje.', agendaHoje, 'Você não tem atendimento técnico na agenda de hoje.', () => navigate(destino('')), AG_BLUE, 'ver agenda')}
            {lista('Meus atendimentos pendentes', 'Atendimentos seus que precisam de evolução/registro técnico.', pendentes, 'Você não tem pendências técnicas para finalizar.', () => navigate(destino('agendado')), ORANGE, 'finalizar')}
            {lista('Meus últimos realizados', 'Atendimentos que você já finalizou recentemente.', realizados, 'Você ainda não finalizou atendimentos.', () => navigate(destino('realizado')), GREEN, 'histórico')}
          </div>
        </div>
      </div>
    </div>
  )
}
