import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { gerarPDFAgendaTeacolher } from '../lib/pdf'

const BLUE = '#0E7EA8', DARK = '#06344F', GREEN = '#6BBF2B', ORANGE = '#F4821F', RED = '#E8212A'

const card = { background:'rgba(255,255,255,0.94)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)' }

export default function PainelOperacional() {
  const navigate = useNavigate()
  const location = useLocation()
  const { perfil } = useAuth()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState({ usuarios:0, hoje:0, vencidos:0, proximos:0, realizadosMes:0 })
  const [agendaHoje, setAgendaHoje] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [proximos, setProximos] = useState([])
  const [equipe, setEquipe] = useState([])
  const [usuariosPorProf, setUsuariosPorProf] = useState({})
  const [projetoId, setProjetoId] = useState(null)
  const [fichaUsuario, setFichaUsuario] = useState(null)
  const [fichaAtendimentos, setFichaAtendimentos] = useState([])
  const [fichaItemAberto, setFichaItemAberto] = useState(null)
  const [fichaLoading, setFichaLoading] = useState(false)
  const [aba, setAba] = useState('agenda')
  const [profFiltro, setProfFiltro] = useState('')
  const [periodoImpressao, setPeriodoImpressao] = useState('dia')
  const [profImpressao, setProfImpressao] = useState('')
  const [imprimindo, setImprimindo] = useState(false)

  // Lê ?aba= da URL pra o menu lateral poder abrir a aba certa diretamente
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const abaParam = params.get('aba')
    if (abaParam) setAba(abaParam)
  }, [location.search])

  useEffect(() => {
    let mounted = true
    async function carregar() {
      setLoading(true)
      const hoje = new Date().toISOString().slice(0, 10)
      const inicioMes = hoje.slice(0, 8) + '01'
      const [projetosRes, equipeRes] = await Promise.all([
        supabase.from('projetos').select('id,nome').eq('aceita_atendimentos', true).order('nome'),
        supabase.from('equipe').select('id,nome,funcao').eq('situacao', 'ativo').order('nome'),
      ])
      const projetoTea = (projetosRes.data || []).find(p => p.nome?.toLowerCase().includes('teacolher'))
      const pid = projetoTea?.id
      const equipeData = equipeRes.data || []
      let td = { usuarios:0, hoje:0, vencidos:0, proximos:0, realizadosMes:0 }
      let hojeLista = [], vencidosLista = [], proximosLista = [], vinculosRaw = []

      if (pid) {
        const [uRes, hRes, vRes, pRes, rRes, lH, lV, lP, lVin] = await Promise.all([
          supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).eq('situacao', 'ativo'),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).lt('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).gte('data_atend', hoje).in('situacao', ['agendado','reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', pid).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,situacao').eq('projeto_id', pid).eq('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('hora_inicio', { ascending:true }).limit(8),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,situacao').eq('projeto_id', pid).lt('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('data_atend', { ascending:true }).limit(6),
          supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,situacao').eq('projeto_id', pid).gt('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('data_atend', { ascending:true }).limit(8),
          supabase.from('atendimentos').select('profissional_id,usuario_atendido_id,pessoa_atendida,data_atend').eq('projeto_id', pid).gte('data_atend', hoje).in('situacao', ['agendado','reagendado']).order('data_atend', { ascending:true }).limit(500),
        ])
        td = { usuarios:uRes.count||0, hoje:hRes.count||0, vencidos:vRes.count||0, proximos:pRes.count||0, realizadosMes:rRes.count||0 }
        hojeLista = lH.data||[]; vencidosLista = lV.data||[]; proximosLista = lP.data||[]; vinculosRaw = lVin.data||[]
      }

      const porProf = {}
      vinculosRaw.forEach(a => {
        if (!a.profissional_id || !a.usuario_atendido_id) return
        const k = String(a.profissional_id), u = String(a.usuario_atendido_id)
        if (!porProf[k]) porProf[k] = {}
        if (!porProf[k][u] || a.data_atend < porProf[k][u].proxData)
          porProf[k][u] = { id:a.usuario_atendido_id, nome:a.pessoa_atendida||'—', proxData:a.data_atend }
      })
      const porProfFinal = {}
      Object.entries(porProf).forEach(([k, v]) => { porProfFinal[k] = Object.values(v).sort((a,b) => a.proxData > b.proxData ? 1 : -1) })

      if (!mounted) return
      setEquipe(equipeData); setProjetoId(pid); setDados(td)
      setAgendaHoje(hojeLista); setPendentes(vencidosLista); setProximos(proximosLista)
      setUsuariosPorProf(porProfFinal); setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0,5) : '—'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = perfil?.nome?.split(' ')[0] || 'Operacional'
  const profNome = id => { const p = equipe.find(e => String(e.id)===String(id)); return p ? `${p.nome.split(' ').slice(0,2).join(' ')} — ${p.funcao||''}` : '—' }
  const proximosSemHoje = useMemo(() => proximos.slice(0,6), [proximos])

  async function abrirFicha(uid) {
    if (!uid) return
    setFichaLoading(true); setFichaUsuario(null); setFichaAtendimentos([]); setFichaItemAberto(null)
    const hoje = new Date().toISOString().slice(0, 10)
    const sel = 'id,data_atend,hora_inicio,etapa_fluxo,area_atendimento,situacao,comparecimento,profissional_id,registro_tecnico,orientacao_familia,proxima_acao,desfecho_teacolher'
    // Futuros e passados em consultas separadas — um único limit() ordenado por data podia
    // cortar antes de chegar nos agendamentos futuros mais próximos quando há muitas sessões
    // recorrentes distantes, escondendo o atendimento que de fato vem primeiro.
    const [uRes, futurosRes, passadosRes] = await Promise.all([
      supabase.from('usuarios_atendidos').select('*').eq('id', uid).single(),
      supabase.from('atendimentos').select(sel).eq('usuario_atendido_id', uid)
        .gte('data_atend', hoje).in('situacao', ['agendado', 'reagendado'])
        .order('data_atend', { ascending:true }).limit(50),
      supabase.from('atendimentos').select(sel).eq('usuario_atendido_id', uid)
        .or(`data_atend.lt.${hoje},situacao.not.in.(agendado,reagendado)`)
        .order('data_atend', { ascending:false }).limit(30),
    ])
    setFichaUsuario(uRes.data||null)
    setFichaAtendimentos([...(futurosRes.data||[]), ...(passadosRes.data||[])])
    setFichaLoading(false)
  }

  function periodoLabel(tipo) {
    const b = new Date(), ini = new Date(b), fim = new Date(b)
    if (tipo==='semana') { const d=b.getDay()===0?-6:1-b.getDay(); ini.setDate(b.getDate()+d); fim.setDate(ini.getDate()+6) }
    if (tipo==='mes') { ini.setDate(1); fim.setMonth(b.getMonth()+1); fim.setDate(0) }
    const iso = d => { const x=new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10) }
    return { ini: iso(ini), fim: iso(fim) }
  }

  async function imprimir() {
    if (!projetoId) return
    setImprimindo(true)
    const { ini, fim } = periodoLabel(periodoImpressao)
    let q = supabase.from('atendimentos').select('id,data_atend,hora_inicio,pessoa_atendida,profissional_id,etapa_fluxo,situacao,comparecimento').eq('projeto_id', projetoId).gte('data_atend', ini).lte('data_atend', fim).order('data_atend', { ascending:true }).order('hora_inicio', { ascending:true })
    if (profImpressao) q = q.eq('profissional_id', parseInt(profImpressao))
    const { data } = await q
    setImprimindo(false)
    const prof = profImpressao ? equipe.find(e => String(e.id)===String(profImpressao)) : null
    const titulo = periodoImpressao==='dia' ? 'Agenda diária' : periodoImpressao==='semana' ? 'Agenda semanal' : 'Agenda mensal'
    const pl = periodoImpressao==='dia' ? fmtData(ini) : `${fmtData(ini)} a ${fmtData(fim)}`
    gerarPDFAgendaTeacolher((data||[]).map(a=>({...a,profissional_nome:profNome(a.profissional_id)})), titulo+' TEAcolher', { subtitulo: prof ? `${prof.nome} — ${prof.funcao}` : 'Todos os profissionais · Projeto TEAcolher', periodoLabel:pl })
  }

  const linhaItem = (a, i, total) => (
    <div key={a.id||i} style={{ display:'grid', gridTemplateColumns:'60px 1fr auto', gap:10, padding:'10px 0', borderBottom:i<total-1?'0.5px solid #F1EFE8':'none', alignItems:'center' }}>
      <div style={{ textAlign:'center', background:'#F7FAFC', border:'0.5px solid #E8E6DE', borderRadius:10, padding:'5px 3px' }}>
        <div style={{ fontSize:14, fontWeight:900, color:DARK }}>{fmtHora(a.hora_inicio)}</div>
        <div style={{ fontSize:9, color:'#8B949E' }}>{a.data_atend !== new Date().toISOString().slice(0,10) ? fmtData(a.data_atend).slice(0,5) : 'hoje'}</div>
      </div>
      <div style={{ minWidth:0 }}>
        <button onClick={() => abrirFicha(a.usuario_atendido_id)} style={{ border:'none', background:'none', padding:0, cursor:'pointer', textAlign:'left', width:'100%' }}>
          <div style={{ fontSize:13, fontWeight:800, color:BLUE, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.pessoa_atendida||'Usuário/família'}</div>
        </button>
        <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>{profNome(a.profissional_id).split(' — ')[0]} · {a.etapa_fluxo||'Atendimento'}</div>
      </div>
      <button onClick={() => navigate(`/atendimentos?abrir=${a.id}`)} style={{ border:'none', borderRadius:8, background:'#F1EFE8', color:'#5F5E5A', fontSize:11, fontWeight:700, padding:'6px 9px', cursor:'pointer', whiteSpace:'nowrap' }}>editar</button>
    </div>
  )

  const blocoLista = (titulo, itens, vazio, cor) => (
    <div style={{ ...card, padding:14, marginBottom:10 }}>
      <div style={{ fontSize:13, fontWeight:800, color:DARK, marginBottom:8, borderLeft:`3px solid ${cor}`, paddingLeft:8 }}>{titulo} <span style={{ fontSize:11, fontWeight:600, color:'#888780' }}>({itens.length})</span></div>
      {loading ? <div style={{ fontSize:12, color:'#B4B2A9', padding:'12px 0', textAlign:'center' }}>Carregando...</div>
        : itens.length===0 ? <div style={{ fontSize:12, color:'#B4B2A9', textAlign:'center', padding:'12px 0' }}>{vazio}</div>
        : itens.map((a,i) => linhaItem(a,i,itens.length))}
    </div>
  )

  return (
    <div>
      {/* Topbar */}
      <div style={{ height:60, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile?'0 12px':'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div>
          <div style={{ fontSize:isMobile?16:19, fontWeight:900, color:DARK }}>{saudacao}, {nome}!</div>
          <div style={{ fontSize:11, color:'#6B6A66' }}>Painel operacional · Projeto TEAcolher</div>
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => navigate('/usuarios-atendidos')} style={{ border:'0.5px solid #D9D6CC', background:'#fff', borderRadius:9, padding:'7px 13px', color:DARK, fontWeight:700, fontSize:12, cursor:'pointer' }}>+ Cadastrar usuário</button>
            <button onClick={() => navigate('/atendimentos?novo=1')} style={{ border:'none', background:BLUE, borderRadius:9, padding:'7px 13px', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>+ Agendar</button>
          </div>
        )}
      </div>

      <div style={{ padding:isMobile?'12px':'16px 24px', display:'grid', gap:12 }}>
        {/* Cards de número */}
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'repeat(5,1fr)', gap:8 }}>
          {[
            ['Famílias', dados.usuarios, DARK, 'ativas'],
            ['Hoje', dados.hoje, BLUE, 'agendados'],
            ['Atrasados', dados.vencidos, RED, 'sem finalizar'],
            ['Próximos', dados.proximos, ORANGE, 'agendados'],
            ['Mês', dados.realizadosMes, GREEN, 'realizados'],
          ].map(([label,val,cor,sub]) => (
            <div key={label} style={{ ...card, padding:'11px 12px', borderTop:`3px solid ${cor}` }}>
              <div style={{ fontSize:10, color:'#7A8893', fontWeight:700 }}>{label}</div>
              <div style={{ fontSize:24, fontWeight:900, color:cor }}>{loading?'…':val}</div>
              <div style={{ fontSize:10, color:'#9AA3AF' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div style={{ display:'flex', gap:2, borderBottom:'1px solid #E8E6DE' }}>
          {[['agenda','📋 Agenda'], ['profissionais','👥 Por profissional']].map(([k,l]) => (
            <button key={k} onClick={() => setAba(k)} style={{ border:'none', background:'none', padding:'7px 14px', fontSize:12.5, fontWeight:aba===k?900:500, color:aba===k?BLUE:'#888780', borderBottom:aba===k?`2px solid ${BLUE}`:'2px solid transparent', cursor:'pointer', marginBottom:-1 }}>{l}</button>
          ))}
        </div>

        {/* ABA AGENDA */}
        {aba==='agenda' && (
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'300px 1fr', gap:14, alignItems:'start' }}>
            {/* Imprimir agenda */}
            <div style={{ ...card, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:DARK, marginBottom:10 }}>Imprimir agenda</div>
              <div style={{ display:'grid', gap:7 }}>
                <select value={periodoImpressao} onChange={e=>setPeriodoImpressao(e.target.value)} style={{ border:'0.5px solid #D3D1C7', borderRadius:8, padding:'8px 9px', fontSize:12 }}>
                  <option value="dia">Hoje</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mês</option>
                </select>
                <select value={profImpressao} onChange={e=>setProfImpressao(e.target.value)} style={{ border:'0.5px solid #D3D1C7', borderRadius:8, padding:'8px 9px', fontSize:12 }}>
                  <option value="">Todos os profissionais</option>
                  {equipe.map(e=><option key={e.id} value={e.id}>{e.nome.split(' ').slice(0,2).join(' ')} — {e.funcao}</option>)}
                </select>
                <button onClick={imprimir} disabled={imprimindo} style={{ border:'none', borderRadius:8, background:DARK, color:'#fff', padding:'9px', fontSize:12, fontWeight:800, cursor:'pointer', opacity:imprimindo?.65:1 }}>
                  {imprimindo?'Gerando…':'🖨 Imprimir'}
                </button>
              </div>
            </div>

            {/* Listas */}
            <div>
              {blocoLista(`Hoje`, agendaHoje, 'Nenhum atendimento hoje.', BLUE)}
              {dados.vencidos > 0 && blocoLista(`Atrasados — data passou, ainda agendado`, pendentes, '', RED)}
              {blocoLista('Próximos agendamentos', proximosSemHoje, 'Nenhum próximo agendamento.', ORANGE)}
            </div>
          </div>
        )}

        {/* ABA POR PROFISSIONAL */}
        {aba==='profissionais' && (() => {
          // Monta lista plana de usuários com seus profissionais
          const usuariosFlat = {}
          Object.entries(usuariosPorProf).forEach(([profId, lista]) => {
            const profInfo = equipe.find(e => String(e.id)===String(profId))
            lista.forEach(u => {
              const k = String(u.id)
              if (!usuariosFlat[k]) usuariosFlat[k] = { ...u, profissionais: [] }
              if (profInfo && !usuariosFlat[k].profissionais.find(p=>String(p.id)===String(profId)))
                usuariosFlat[k].profissionais.push(profInfo)
            })
          })
          const todos = Object.values(usuariosFlat).sort((a,b) => a.nome > b.nome ? 1 : -1)
          return (
            <div style={{ display:'grid', gap:10 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <select value={profFiltro} onChange={e=>setProfFiltro(e.target.value)} style={{ border:'0.5px solid #D3D1C7', borderRadius:9, padding:'8px 12px', fontSize:12, minWidth:220 }}>
                  <option value="">Todos os profissionais ({todos.length} usuários)</option>
                  {equipe.filter(e=>usuariosPorProf[String(e.id)]?.length>0).map(e=>(
                    <option key={e.id} value={String(e.id)}>{e.nome.split(' ').slice(0,2).join(' ')} — {e.funcao} ({usuariosPorProf[String(e.id)]?.length||0})</option>
                  ))}
                </select>
                <div style={{ fontSize:12, color:'#888780' }}>Clique no usuário para ver a ficha completa.</div>
              </div>
              {(() => {
                const filtrados = profFiltro ? (usuariosPorProf[profFiltro]||[]) : todos
                if (filtrados.length===0) return <div style={{ ...card, padding:'2rem', textAlign:'center', color:'#888780', fontSize:13 }}>Nenhum usuário com agendamento futuro.</div>
                return (
                  <div style={{ ...card, padding:14 }}>
                    {filtrados.map((u, i) => (
                      <button key={u.id} onClick={() => abrirFicha(u.id)} style={{ width:'100%', border:'none', background:'#fff', textAlign:'left', padding:'10px 12px', borderBottom:i<filtrados.length-1?'0.5px solid #F1EFE8':'none', cursor:'pointer', display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:10 }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:DARK }}>{u.nome}</div>
                          <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>
                            {(u.profissionais||[profFiltro && equipe.find(e=>String(e.id)===profFiltro)].filter(Boolean)).map(p=>`${p.nome?.split(' ').slice(0,2).join(' ')} — ${p.funcao}`).join(' · ')}
                          </div>
                          <div style={{ fontSize:11, color:'#B4B2A9', marginTop:1 }}>Próx: {fmtData(u.proxData)}</div>
                        </div>
                        <span style={{ fontSize:14, color:'#B4B2A9' }}>›</span>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
          )
        })()}
      </div>

      {/* Modal ficha */}
      {(fichaLoading || fichaUsuario) && (
        <div onClick={e => { if(e.target===e.currentTarget){setFichaUsuario(null);setFichaAtendimentos([]);setFichaItemAberto(null)}}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:999, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>
          <div style={{ background:'#fff', width:isMobile?'100%':440, height:'100vh', overflowY:'auto', boxShadow:'-4px 0 24px rgba(0,0,0,0.12)', padding:'20px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:900, color:DARK }}>Ficha do usuário</div>
              <button onClick={() => {setFichaUsuario(null);setFichaAtendimentos([]);setFichaItemAberto(null)}} style={{ border:'none', background:'#F1EFE8', borderRadius:7, padding:'4px 9px', cursor:'pointer', fontSize:12 }}>Fechar</button>
            </div>
            {fichaLoading ? <div style={{ textAlign:'center', padding:'2rem', color:'#B4B2A9', fontSize:12 }}>Carregando...</div> : fichaUsuario ? (<>
              <div style={{ background:'#F7FAFC', borderRadius:10, padding:12, marginBottom:12 }}>
                <div style={{ fontSize:16, fontWeight:900, color:DARK, marginBottom:6 }}>{fichaUsuario.nome}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, fontSize:11.5 }}>
                  {fichaUsuario.data_nascimento && <div><span style={{ color:'#888780' }}>Nascimento: </span>{fmtData(fichaUsuario.data_nascimento)}</div>}
                  {fichaUsuario.tipo_deficiencia && <div><span style={{ color:'#888780' }}>Deficiência: </span>{fichaUsuario.tipo_deficiencia}</div>}
                  {fichaUsuario.telefone && <div><span style={{ color:'#888780' }}>Tel: </span>{fichaUsuario.telefone}</div>}
                  {fichaUsuario.contato_familiar_nome && <div><span style={{ color:'#888780' }}>Responsável: </span>{fichaUsuario.contato_familiar_nome}</div>}
                  {fichaUsuario.contato_familiar_telefone && <div><span style={{ color:'#888780' }}>Tel resp: </span>{fichaUsuario.contato_familiar_telefone}</div>}
                  <div><span style={{ color:'#888780' }}>Situação: </span><span style={{ fontWeight:700, color:fichaUsuario.situacao==='ativo'?GREEN:RED }}>{fichaUsuario.situacao}</span></div>
                </div>
              </div>
              {/* Profissionais que atendem */}
              {(() => {
                const profs = [...new Set(fichaAtendimentos.map(a=>a.profissional_id).filter(Boolean))].map(id=>equipe.find(e=>String(e.id)===String(id))).filter(Boolean)
                return profs.length ? (
                  <div style={{ background:'#EEF8F1', borderRadius:8, padding:'8px 10px', marginBottom:10 }}>
                    <div style={{ fontSize:10.5, fontWeight:700, color:'#3B6D11', marginBottom:4 }}>Em acompanhamento com:</div>
                    {profs.map(p=><div key={p.id} style={{ fontSize:12, color:DARK }}>{p.nome.split(' ').slice(0,2).join(' ')} — {p.funcao}</div>)}
                  </div>
                ) : null
              })()}
              <div style={{ display:'flex', gap:7, marginBottom:12 }}>
                <button onClick={() => navigate('/usuarios-atendidos')} style={{ border:'none', borderRadius:7, background:BLUE, color:'#fff', fontSize:11, fontWeight:700, padding:'6px 11px', cursor:'pointer' }}>Editar cadastro</button>
                <button onClick={() => navigate('/atendimentos?novo=1')} style={{ border:'none', borderRadius:7, background:DARK, color:'#fff', fontSize:11, fontWeight:700, padding:'6px 11px', cursor:'pointer' }}>+ Agendar</button>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:DARK, marginBottom:7 }}>Histórico ({fichaAtendimentos.length})</div>
              {fichaAtendimentos.map((a,i) => {
                const cores = { realizado:['#EAF3DE','#3B6D11'], agendado:['#E6F1FB','#185FA5'], cancelado:['#FCEBEB','#A32D2D'], reagendado:['#FFF3E0','#854F0B'] }
                const [bg,cor] = cores[a.situacao]||['#F1EFE8','#5F5E5A']
                const prof = equipe.find(e=>String(e.id)===String(a.profissional_id))
                const aberto = fichaItemAberto === a.id
                const faltou = a.comparecimento && a.comparecimento !== 'Compareceu'
                const temEvolucao = a.registro_tecnico || a.orientacao_familia || a.proxima_acao || a.desfecho_teacolher
                return (
                  <div key={a.id} style={{ borderRadius:9, border:'0.5px solid #E8E6DE', marginBottom:5, overflow:'hidden', background:i%2===0?'#fff':'#FAFAF8' }}>
                    <button onClick={() => setFichaItemAberto(aberto ? null : a.id)} style={{ width:'100%', border:'none', background:'none', padding:'9px 11px', cursor:'pointer', textAlign:'left' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:5 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:DARK }}>{fmtData(a.data_atend)}{a.hora_inicio?` · ${String(a.hora_inicio).slice(0,5)}`:''}</div>
                        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                          <span style={{ fontSize:10, fontWeight:600, background:bg, color:cor, borderRadius:99, padding:'1px 6px' }}>{a.situacao}</span>
                          <span style={{ fontSize:11, color:'#B4B2A9' }}>{aberto?'▲':'▼'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:'#5F5E5A', marginTop:2 }}>{a.etapa_fluxo||'Atendimento'}{a.area_atendimento?` · ${a.area_atendimento}`:''}</div>
                      {prof && <div style={{ fontSize:10.5, color:'#94A3B8', marginTop:1 }}>{prof.nome.split(' ').slice(0,2).join(' ')} — {prof.funcao}</div>}
                    </button>
                    {aberto && (
                      <div style={{ borderTop:'0.5px solid #E8E6DE', background:'#FAFAF8', padding:'9px 11px' }}>
                        {faltou ? (
                          <div style={{ fontSize:11.5, color:'#A32D2D' }}>{a.comparecimento} — sem evolução técnica.</div>
                        ) : !temEvolucao ? (
                          <div style={{ fontSize:11.5, color:'#B4B2A9' }}>{a.situacao==='realizado' ? 'Sem registro técnico nesta sessão.' : 'Atendimento ainda não finalizado pelo técnico.'}</div>
                        ) : (<>
                          {a.registro_tecnico && <div style={{ fontSize:12, color:'#2C2C2A', lineHeight:1.5, background:'#fff', borderRadius:7, padding:'7px 9px', border:'0.5px solid #E8E6DE', marginBottom:5 }}>{a.registro_tecnico}</div>}
                          {a.orientacao_familia && <div style={{ fontSize:11, color:'#5F5E5A', marginTop:3 }}><span style={{ fontWeight:600 }}>Orientação: </span>{a.orientacao_familia}</div>}
                          {a.proxima_acao && <div style={{ fontSize:11, color:'#5F5E5A', marginTop:2 }}><span style={{ fontWeight:600 }}>Próxima ação: </span>{a.proxima_acao}</div>}
                          {a.desfecho_teacolher && <div style={{ fontSize:11, color:'#888780', marginTop:2 }}><span style={{ fontWeight:600 }}>Desfecho: </span>{a.desfecho_teacolher}</div>}
                        </>)}
                        <button onClick={() => navigate(`/atendimentos?abrir=${a.id}`)} style={{ marginTop:8, border:'none', borderRadius:7, background:'#F1EFE8', color:DARK, fontSize:10.5, fontWeight:700, padding:'5px 9px', cursor:'pointer' }}>Abrir atendimento completo →</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </>) : <div style={{ textAlign:'center', padding:'2rem', color:'#A32D2D', fontSize:12 }}>Usuário não encontrado.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
