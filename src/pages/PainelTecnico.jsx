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
  const [periodoImpressao, setPeriodoImpressao] = useState('dia')
  const [imprimindo, setImprimindo] = useState(false)
  const [dados, setDados] = useState({ hoje: 0, finalizar: 0, realizadosMes: 0 })
  const [agendaHoje, setAgendaHoje] = useState([])
  const [pendentes, setPendentes] = useState([])

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
        setDados({ hoje: 0, finalizar: 0, realizadosMes: 0 })
        setAgendaHoje([])
        setPendentes([])
        setMsg('Usuário técnico sem vínculo com profissional. Peça ao administrador para preencher o equipe_id.')
        setLoading(false)
        return
      }

      const [{ data: projetos }, { data: profissional }] = await Promise.all([
        supabase.from('projetos').select('id,nome').eq('aceita_atendimentos', true).order('nome'),
        supabase.from('equipe').select('id,nome,funcao').eq('id', equipeId).maybeSingle(),
      ])

      const projetoTea = (projetos || []).find(p => String(p.nome || '').toLowerCase().includes('teacolher'))
      const projetoId = projetoTea?.id
      if (mounted) setProjetoTeacolherId(projetoId || null)

      let hojeCount = 0
      let finalizarCount = 0
      let realizadosCount = 0
      let hojeLista = []
      let pendentesLista = []

      if (projetoId) {
        const selectLista = 'id,data_atend,hora_inicio,hora_fim,pessoa_atendida,usuario_atendido_id,etapa_fluxo,tipo_atend,situacao,area_atendimento,modalidade_atendimento,comparecimento,desfecho_teacolher,profissional_id'

        const [hojeRes, finalizarRes, realizadosRes, listaHoje, listaPendentes] = await Promise.all([
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).eq('profissional_id', equipeId).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).eq('profissional_id', equipeId).lte('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoId).eq('profissional_id', equipeId).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos').select(selectLista).eq('projeto_id', projetoId).eq('profissional_id', equipeId).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('hora_inicio', { ascending:true }).limit(6),
          supabase.from('atendimentos').select(selectLista).eq('projeto_id', projetoId).eq('profissional_id', equipeId).lt('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('data_atend', { ascending:true }).order('hora_inicio', { ascending:true }).limit(6),
        ])

        const erro = hojeRes.error || finalizarRes.error || realizadosRes.error || listaHoje.error || listaPendentes.error
        if (erro) setMsg('Erro ao carregar sua agenda: ' + erro.message)

        hojeCount = hojeRes.count || 0
        finalizarCount = finalizarRes.count || 0
        realizadosCount = realizadosRes.count || 0
        hojeLista = listaHoje.data || []
        pendentesLista = listaPendentes.data || []
      }

      if (!mounted) return
      setProfissionalAtual({
        id: equipeId,
        nome: profissional?.nome || perfil?.nome || 'Técnico',
        funcao: profissional?.funcao || '',
      })
      setDados({ hoje: hojeCount, finalizar: finalizarCount, realizadosMes: realizadosCount })
      setAgendaHoje(hojeLista)
      setPendentes(pendentesLista)
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

    return { inicio: dataLocalISO(inicio), fim: dataLocalISO(fim) }
  }

  function labelPeriodo(tipo, inicio, fim) {
    if (tipo === 'dia') return `Dia ${fmtData(inicio)}`
    if (tipo === 'semana') return `Semana de ${fmtData(inicio)} a ${fmtData(fim)}`
    return `Mês de ${new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR', { month:'long', year:'numeric' })}`
  }

  async function imprimirAgendaPeriodo(tipo = periodoImpressao) {
    if (!profissionalAtual.id) {
      setMsg('Não foi possível imprimir: usuário técnico sem equipe_id.')
      return
    }
    if (!projetoTeacolherId) {
      setMsg('Não foi possível imprimir: Projeto TEAcolher não encontrado.')
      return
    }

    setImprimindo(true)
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

    setImprimindo(false)

    if (error) {
      setMsg('Erro ao gerar impressão: ' + error.message)
      return
    }

    const titulo = tipo === 'dia' ? 'Agenda diária TEAcolher' : tipo === 'semana' ? 'Agenda semanal TEAcolher' : 'Agenda mensal TEAcolher'

    gerarPDFAgendaTecnicoTeacolher((data || []).map(a => ({ ...a, profissional_nome: profissionalAtual.nome })), {
      titulo,
      periodoLabel: labelPeriodo(tipo, inicio, fim),
      profissionalNome: profissionalAtual.nome || perfil?.nome || 'Técnico',
      funcao: profissionalAtual.funcao || '',
      tipo,
    })
  }

  const acaoPrincipal = dados.finalizar > 0
    ? { texto: 'Finalizar atendimento pendente', desc: `${dados.finalizar} atendimento(s) precisam de registro técnico`, icon:'clipboard-check', cor: ORANGE, rota: destino('agendado') }
    : dados.hoje > 0
      ? { texto: 'Ver agenda de hoje', desc: `${dados.hoje} atendimento(s) marcados para hoje`, icon:'calendar-event', cor: AG_BLUE, rota: destino('') }
      : { texto: 'Ver minha agenda', desc: 'Consultar próximos atendimentos', icon:'calendar', cor: AG_BLUE, rota: destino('') }

  const abrirAtendimento = a => navigate(`/atendimentos?abrir=${a.id}${a.situacao === 'realizado' ? '' : '&acao=finalizar'}`)

  const itemAgenda = a => (
    <button key={a.id} onClick={() => abrirAtendimento(a)}
      style={{ width:'100%', border:'none', background:'#fff', textAlign:'left', padding:'11px 0', borderBottom:'0.5px solid #F1EFE8', cursor:'pointer', display:'grid', gridTemplateColumns:'58px 1fr auto', gap:10, alignItems:'center' }}>
      <div style={{ fontSize:16, fontWeight:900, color:DARK }}>{fmtHora(a.hora_inicio) || '—'}</div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:'#2C2C2A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.pessoa_atendida || 'Usuário/família'}</div>
        <div style={{ fontSize:11, color:'#7A7974', marginTop:2 }}>{detalhe(a)}</div>
      </div>
      <i className="ti ti-chevron-right" style={{ color:'#B4B2A9' }} />
    </button>
  )

  return (
    <div>
      <div style={{ height:TOPBAR_H, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile ? '0 12px' : '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div>
          <div style={{ fontSize:isMobile ? 17 : 20, fontWeight:800, color:DARK }}>{saudacao}, {nome}</div>
          <div style={{ fontSize:12, color:'#6B6A66', marginTop:3 }}>TEAcolher · só a sua agenda</div>
        </div>
      </div>

      <div style={{ padding:isMobile ? '12px' : '20px 24px', display:'grid', gap:14 }}>
        {msg && <div style={{ ...card, padding:14, borderLeft:`3px solid ${RED}`, color:'#A32D2D', fontSize:12, fontWeight:700 }}>{msg}</div>}

        <div style={{ ...card, padding:isMobile ? 16 : 20, borderLeft:`4px solid ${acaoPrincipal.cor}` }}>
          <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr auto', gap:14, alignItems:'center' }}>
            <div>
              <div style={{ fontSize:12, color:'#888780', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>O que fazer agora</div>
              <div style={{ fontSize:isMobile ? 22 : 26, fontWeight:900, color:DARK, letterSpacing:'-.04em' }}>{acaoPrincipal.texto}</div>
              <div style={{ fontSize:13, color:'#5F5E5A', marginTop:4 }}>{loading ? 'Carregando...' : acaoPrincipal.desc}</div>
            </div>
            <button onClick={() => navigate(acaoPrincipal.rota)} style={{ border:'none', borderRadius:14, background:acaoPrincipal.cor, color:'#fff', padding:'15px 18px', fontSize:14, fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
              <i className={`ti ti-${acaoPrincipal.icon}`} style={{ fontSize:18 }} /> Abrir
            </button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3,1fr)', gap:10 }}>
          {[
            ['Hoje', dados.hoje, 'na sua agenda', AG_BLUE],
            ['Pendentes', dados.finalizar, 'para finalizar', ORANGE],
            ['Mês', dados.realizadosMes, 'realizados', GREEN],
          ].map(([label, value, sub, color]) => (
            <div key={label} style={{ ...card, padding:'14px 16px', borderTop:`3px solid ${color}` }}>
              <div style={{ fontSize:11, color:'#7A8893', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:26, fontWeight:900, color }}>{loading ? '...' : value}</div>
              <div style={{ fontSize:11, color:'#888780' }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1.1fr .9fr', gap:14, alignItems:'start' }}>
          <div style={{ ...card, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:10 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:DARK }}>Agenda de hoje</div>
                <div style={{ fontSize:11.5, color:'#888780', marginTop:2 }}>Clique no atendimento para abrir.</div>
              </div>
              <button onClick={() => navigate(destino(''))} style={{ border:'none', borderRadius:99, background:AG_BLUE, color:'#fff', fontSize:11, fontWeight:800, padding:'6px 11px', cursor:'pointer' }}>ver tudo</button>
            </div>
            {loading ? (
              <div style={{ fontSize:12, color:'#888780', textAlign:'center', padding:'1.5rem 0' }}>Carregando...</div>
            ) : agendaHoje.length === 0 ? (
              <div style={{ fontSize:13, color:'#888780', textAlign:'center', padding:'1.5rem 0' }}>Nenhum atendimento hoje.</div>
            ) : agendaHoje.map(itemAgenda)}
          </div>

          <div style={{ display:'grid', gap:14 }}>
            <div style={{ ...card, padding:16 }}>
              <div style={{ fontSize:15, fontWeight:900, color:DARK, marginBottom:10 }}>Atalhos</div>
              <div style={{ display:'grid', gap:8 }}>
                <button onClick={() => navigate(destino('agendado'))} style={{ border:'0.5px solid #E8E6DE', background:'#fff', borderRadius:12, padding:'12px 14px', fontSize:13, fontWeight:800, color:ORANGE, cursor:'pointer', textAlign:'left' }}>Finalizar pendentes</button>
                <button onClick={() => navigate(destino('realizado'))} style={{ border:'0.5px solid #E8E6DE', background:'#fff', borderRadius:12, padding:'12px 14px', fontSize:13, fontWeight:800, color:GREEN, cursor:'pointer', textAlign:'left' }}>Ver realizados</button>
              </div>
            </div>

            <div style={{ ...card, padding:16 }}>
              <div style={{ fontSize:15, fontWeight:900, color:DARK, marginBottom:4 }}>Imprimir agenda</div>
              <div style={{ fontSize:11.5, color:'#888780', marginBottom:10 }}>Sai somente com os seus atendimentos.</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8 }}>
                <select value={periodoImpressao} onChange={e=>setPeriodoImpressao(e.target.value)} style={{ border:'0.5px solid #D3D1C7', borderRadius:10, padding:'9px 10px', fontSize:12 }}>
                  <option value="dia">Hoje</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mês</option>
                </select>
                <button onClick={() => imprimirAgendaPeriodo(periodoImpressao)} disabled={imprimindo} style={{ border:'none', borderRadius:10, background:DARK, color:'#fff', padding:'9px 14px', fontSize:12, fontWeight:900, cursor:'pointer', opacity:imprimindo ? .65 : 1 }}>
                  {imprimindo ? '...' : 'Imprimir'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {pendentes.length > 0 && (
          <div style={{ ...card, padding:16 }}>
            <div style={{ fontSize:15, fontWeight:900, color:DARK, marginBottom:2 }}>Atrasados (data já passou)</div>
            <div style={{ fontSize:11.5, color:'#888780', marginBottom:10 }}>Não confundir com "Agenda de hoje" — são atendimentos de dias anteriores ainda sem finalização.</div>
            {pendentes.map(itemAgenda)}
          </div>
        )}
      </div>
    </div>
  )
}
