import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { gerarPDFAgendaTecnicoTeacolher } from '../lib/pdf'

const BLUE = '#0E7EA8', DARK = '#06344F', GREEN = '#6BBF2B', ORANGE = '#F4821F', RED = '#E63214'
const card = { background:'rgba(255,255,255,0.94)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)' }

export default function PainelTecnico() {
  const navigate = useNavigate()
  const location = useLocation()
  const { perfil, user } = useAuth()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [prof, setProf] = useState({ id:null, nome:'', funcao:'' })
  const [projetoId, setProjetoId] = useState(null)
  const [periodo, setPeriodo] = useState('dia')
  const [imprimindo, setImprimindo] = useState(false)
  const [dados, setDados] = useState({ hoje:0, finalizar:0, realizadosMes:0 })
  const [agendaHoje, setAgendaHoje] = useState([])
  const [atrasados, setAtrasados] = useState([])
  const [meusUsuarios, setMeusUsuarios] = useState([])
  const [aba, setAba] = useState('agenda')
  const [usuarioExpandido, setUsuarioExpandido] = useState(null)
  const [evolucoes, setEvolucoes] = useState({})

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const abaParam = params.get('aba')
    if (abaParam) setAba(abaParam)
  }, [location.search])

  useEffect(() => {
    let mounted = true
    async function carregar() {
      setLoading(true); setMsg('')
      const hoje = new Date().toISOString().slice(0,10)
      const inicioMes = hoje.slice(0,8)+'01'
      let eid = perfil?.equipe_id || null
      if (!eid && user?.id) {
        const { data } = await supabase.from('usuarios').select('equipe_id').eq('id', user.id).maybeSingle()
        eid = data?.equipe_id || null
      }
      if (!eid) {
        if (!mounted) return
        setMsg('Técnico sem vínculo com profissional. Peça ao admin para preencher o equipe_id.')
        setLoading(false); return
      }
      const [{ data:projetos }, { data:profData }] = await Promise.all([
        supabase.from('projetos').select('id,nome').eq('aceita_atendimentos', true),
        supabase.from('equipe').select('id,nome,funcao').eq('id', eid).maybeSingle(),
      ])
      const pid = (projetos||[]).find(p => p.nome?.toLowerCase().includes('teacolher'))?.id
      if (mounted) setProjetoId(pid||null)

      if (!pid) { if (mounted) { setLoading(false); setMsg('Projeto TEAcolher não encontrado.') } return }

      const sel = 'id,data_atend,hora_inicio,pessoa_atendida,usuario_atendido_id,etapa_fluxo,situacao,profissional_id'
      const [hRes, fRes, rRes, lH, lA, lTodos] = await Promise.all([
        supabase.from('atendimentos').select('id',{count:'exact',head:true}).eq('projeto_id',pid).eq('profissional_id',eid).eq('data_atend',hoje).in('situacao',['agendado','reagendado']),
        supabase.from('atendimentos').select('id',{count:'exact',head:true}).eq('projeto_id',pid).eq('profissional_id',eid).lte('data_atend',hoje).in('situacao',['agendado','reagendado']),
        supabase.from('atendimentos').select('id',{count:'exact',head:true}).eq('projeto_id',pid).eq('profissional_id',eid).gte('data_atend',inicioMes).eq('situacao','realizado'),
        supabase.from('atendimentos').select(sel).eq('projeto_id',pid).eq('profissional_id',eid).eq('data_atend',hoje).in('situacao',['agendado','reagendado']).order('hora_inicio',{ascending:true}).limit(8),
        supabase.from('atendimentos').select(sel).eq('projeto_id',pid).eq('profissional_id',eid).lt('data_atend',hoje).in('situacao',['agendado','reagendado']).order('data_atend',{ascending:true}).limit(6),
        supabase.from('atendimentos').select('usuario_atendido_id,pessoa_atendida,data_atend').eq('projeto_id',pid).eq('profissional_id',eid).gte('data_atend',hoje).in('situacao',['agendado','reagendado']).order('data_atend',{ascending:true}).limit(200),
      ])

      // Meus usuários
      const uMap = {}
      ;(lTodos.data||[]).forEach(a => {
        if (!a.usuario_atendido_id) return
        const k = String(a.usuario_atendido_id)
        if (!uMap[k]) uMap[k] = { id:a.usuario_atendido_id, nome:a.pessoa_atendida||'—', proxData:a.data_atend, outrosProfissionais:[] }
      })

      // Busca outros profissionais para os mesmos usuários
      const uids = Object.keys(uMap).map(Number).filter(Boolean)
      if (uids.length > 0) {
        const { data:outrosA } = await supabase.from('atendimentos').select('usuario_atendido_id,profissional_id').eq('projeto_id',pid).in('usuario_atendido_id',uids).neq('profissional_id',eid).gte('data_atend',hoje).in('situacao',['agendado','reagendado']).limit(200)
        const outroIds = [...new Set((outrosA||[]).map(a=>a.profissional_id).filter(Boolean))]
        let outrosP = []
        if (outroIds.length) { const {data:pRes} = await supabase.from('equipe').select('id,nome,funcao').in('id',outroIds); outrosP = pRes||[] }
        ;(outrosA||[]).forEach(a => {
          const k = String(a.usuario_atendido_id)
          if (!uMap[k]) return
          const pi = outrosP.find(p => String(p.id)===String(a.profissional_id))
          if (pi && !uMap[k].outrosProfissionais.find(p=>String(p.id)===String(pi.id))) uMap[k].outrosProfissionais.push(pi)
        })
      }

      if (!mounted) return
      setProf({ id:eid, nome:profData?.nome||perfil?.nome||'Técnico', funcao:profData?.funcao||'' })
      setDados({ hoje:hRes.count||0, finalizar:fRes.count||0, realizadosMes:rRes.count||0 })
      setAgendaHoje(lH.data||[]); setAtrasados(lA.data||[])
      setMeusUsuarios(Object.values(uMap).sort((a,b) => a.proxData>b.proxData?1:-1))
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [perfil?.equipe_id, perfil?.nome, user?.id])

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0,5) : ''

  async function abrirEvolucao(uid) {
    if (usuarioExpandido === uid) { setUsuarioExpandido(null); return }
    setUsuarioExpandido(uid)
    if (evolucoes[uid]) return // já carregou
    const hoje = new Date().toISOString().slice(0, 10)
    const sel = 'id,data_atend,hora_inicio,comparecimento,registro_tecnico,orientacao_familia,proxima_acao,desfecho_teacolher,etapa_fluxo,situacao'
    // Busca futuros e passados em consultas separadas — buscar tudo junto com um único limit()
    // ordenado por data podia cortar antes de chegar nos agendamentos futuros mais próximos
    // (ex: muitas sessões recorrentes em dezembro "empurravam" o corte e escondiam um
    // atendimento de junho, que era o próximo de verdade).
    const [futurosRes, passadosRes] = await Promise.all([
      supabase.from('atendimentos').select(sel).eq('usuario_atendido_id', uid).eq('profissional_id', prof.id)
        .gte('data_atend', hoje).in('situacao', ['agendado', 'reagendado'])
        .order('data_atend', { ascending: true }).limit(50),
      supabase.from('atendimentos').select(sel).eq('usuario_atendido_id', uid).eq('profissional_id', prof.id)
        .or(`data_atend.lt.${hoje},situacao.not.in.(agendado,reagendado)`)
        .order('data_atend', { ascending: false }).limit(20),
    ])
    setEvolucoes(prev => ({ ...prev, [uid]: [...(futurosRes.data || []), ...(passadosRes.data || [])] }))
  }
  const hora = new Date().getHours()
  const saudacao = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite'
  const nome = (prof.nome||perfil?.nome||'Técnico').split(' ')[0]

  function periodoLabel(tipo) {
    const b=new Date(), ini=new Date(b), fim=new Date(b)
    if(tipo==='semana'){const d=b.getDay()===0?-6:1-b.getDay();ini.setDate(b.getDate()+d);fim.setDate(ini.getDate()+6)}
    if(tipo==='mes'){ini.setDate(1);fim.setMonth(b.getMonth()+1);fim.setDate(0)}
    const iso=d=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)}
    return { ini:iso(ini), fim:iso(fim) }
  }

  async function imprimir() {
    if (!prof.id||!projetoId) return
    setImprimindo(true)
    const {ini,fim} = periodoLabel(periodo)
    const {data,error} = await supabase.from('atendimentos').select('id,data_atend,hora_inicio,hora_fim,pessoa_atendida,usuario_atendido_id,etapa_fluxo,situacao,area_atendimento,comparecimento,profissional_id').eq('projeto_id',projetoId).eq('profissional_id',prof.id).gte('data_atend',ini).lte('data_atend',fim).order('data_atend',{ascending:true}).order('hora_inicio',{ascending:true})
    setImprimindo(false)
    if (error) { setMsg('Erro: '+error.message); return }
    const titulo = periodo==='dia'?'Agenda diária':periodo==='semana'?'Agenda semanal':'Agenda mensal'
    const pl = periodo==='dia' ? fmtData(ini) : `${fmtData(ini)} a ${fmtData(fim)}`
    gerarPDFAgendaTecnicoTeacolher((data||[]).map(a=>({...a,profissional_nome:prof.nome})), { titulo:titulo+' TEAcolher', periodoLabel:pl, profissionalNome:prof.nome||perfil?.nome||'Técnico', funcao:prof.funcao||'', tipo:periodo })
  }

  const itemAgenda = (a, i, total) => (
    <button key={a.id} onClick={() => navigate(`/atendimentos?abrir=${a.id}${a.situacao==='realizado'?'':'&acao=finalizar'}`)}
      style={{ width:'100%', border:'none', background:'#fff', textAlign:'left', padding:'10px 0', borderBottom:i<total-1?'0.5px solid #F1EFE8':'none', cursor:'pointer', display:'grid', gridTemplateColumns:'56px 1fr auto', gap:9, alignItems:'center' }}>
      <div style={{ fontSize:15, fontWeight:900, color:DARK, textAlign:'center' }}>{fmtHora(a.hora_inicio)||'—'}</div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#2C2C2A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.pessoa_atendida||'Usuário/família'}</div>
        <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>{a.etapa_fluxo||'Atendimento'}</div>
      </div>
      <span style={{ fontSize:14, color:'#B4B2A9' }}>›</span>
    </button>
  )

  const acao = dados.finalizar>0
    ? { texto:'Finalizar pendente', desc:`${dados.finalizar} precisando de registro`, cor:ORANGE, rota:'/atendimentos?situacao=agendado' }
    : dados.hoje>0
      ? { texto:'Ver agenda de hoje', desc:`${dados.hoje} atendimentos hoje`, cor:BLUE, rota:'/atendimentos' }
      : { texto:'Minha agenda', desc:'Sem atendimentos pendentes', cor:BLUE, rota:'/atendimentos' }

  return (
    <div>
      <div style={{ height:60, background:'rgba(255,255,255,0.82)', borderBottom:'0.5px solid #E0DDD5', padding:isMobile?'0 12px':'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 }}>
        <div>
          <div style={{ fontSize:isMobile?16:19, fontWeight:800, color:DARK }}>{saudacao}, {nome}</div>
          <div style={{ fontSize:11, color:'#6B6A66' }}>{prof.funcao||'Técnico'} · somente sua agenda</div>
        </div>
      </div>

      <div style={{ padding:isMobile?'12px':'16px 24px', display:'grid', gap:12 }}>
        {msg && <div style={{ ...card, padding:12, borderLeft:`3px solid ${RED}`, color:'#A32D2D', fontSize:12 }}>{msg}</div>}

        {/* Card ação */}
        <div style={{ ...card, padding:16, borderLeft:`4px solid ${acao.cor}`, display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr auto', gap:12, alignItems:'center' }}>
          <div>
            <div style={{ fontSize:10.5, color:'#888780', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>O que fazer agora</div>
            <div style={{ fontSize:isMobile?20:24, fontWeight:900, color:DARK }}>{acao.texto}</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginTop:3 }}>{loading?'Carregando…':acao.desc}</div>
          </div>
          <button onClick={() => navigate(acao.rota)} style={{ border:'none', borderRadius:12, background:acao.cor, color:'#fff', padding:'13px 16px', fontSize:13, fontWeight:900, cursor:'pointer' }}>Abrir</button>
        </div>

        {/* 3 cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[['Hoje',dados.hoje,'na agenda',BLUE],['Pendentes',dados.finalizar,'para finalizar',ORANGE],['Mês',dados.realizadosMes,'realizados',GREEN]].map(([l,v,s,c]) => (
            <div key={l} style={{ ...card, padding:'11px 12px', borderTop:`3px solid ${c}` }}>
              <div style={{ fontSize:10, color:'#7A8893', fontWeight:700 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:900, color:c }}>{loading?'…':v}</div>
              <div style={{ fontSize:10, color:'#9AA3AF' }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Conteúdo trocado pelo menu lateral (Minha agenda / Meus usuários), sem aba duplicada aqui dentro */}

        {/* AGENDA — dashboard do dia */}
        {aba==='agenda' && (
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 240px', gap:12, alignItems:'start' }}>
            <div>
              <div style={{ ...card, padding:14, marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:800, color:DARK, marginBottom:8 }}>Agenda de hoje</div>
                {loading ? <div style={{ fontSize:12, color:'#B4B2A9', textAlign:'center', padding:'1rem 0' }}>Carregando...</div>
                  : agendaHoje.length===0 ? <div style={{ fontSize:12, color:'#B4B2A9', textAlign:'center', padding:'1rem 0' }}>Nenhum atendimento hoje.</div>
                  : agendaHoje.map((a,i) => itemAgenda(a,i,agendaHoje.length))}
              </div>
              {atrasados.length>0 && (
                <div style={{ ...card, padding:14, borderLeft:`3px solid ${RED}` }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'#A32D2D', marginBottom:8 }}>Atrasados — data já passou ({atrasados.length})</div>
                  {atrasados.map((a,i) => itemAgenda(a,i,atrasados.length))}
                </div>
              )}
            </div>
            {/* Imprimir */}
            <div style={{ ...card, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:DARK, marginBottom:10 }}>Imprimir agenda</div>
              <div style={{ display:'grid', gap:7 }}>
                <select value={periodo} onChange={e=>setPeriodo(e.target.value)} style={{ border:'0.5px solid #D3D1C7', borderRadius:8, padding:'8px 9px', fontSize:12 }}>
                  <option value="dia">Hoje</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mês</option>
                </select>
                <button onClick={imprimir} disabled={imprimindo} style={{ border:'none', borderRadius:8, background:DARK, color:'#fff', padding:'9px', fontSize:12, fontWeight:800, cursor:'pointer', opacity:imprimindo?.65:1 }}>
                  {imprimindo?'Gerando…':'🖨 Imprimir'}
                </button>
              </div>
              <div style={{ fontSize:10.5, color:'#B4B2A9', marginTop:8 }}>Sempre sai somente com seus atendimentos.</div>
            </div>
          </div>
        )}

        {/* MEUS USUÁRIOS — evolução por usuário */}
        {aba==='meus_usuarios' && (
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:DARK, marginBottom:2 }}>👥 Meus usuários</div>
            <div style={{ fontSize:11.5, color:'#888780', marginBottom:12 }}>Clique num usuário para ver a evolução completa de cada atendimento.</div>
            {loading ? <div style={{ ...card, padding:'2rem', textAlign:'center', color:'#B4B2A9', fontSize:13 }}>Carregando...</div>
              : meusUsuarios.length===0 ? <div style={{ ...card, padding:'2rem', textAlign:'center', color:'#888780', fontSize:13 }}>Nenhum usuário com agendamento futuro para você.</div>
              : (
                <div style={{ display:'grid', gap:8 }}>
                  {meusUsuarios.map(u => {
                    const aberto = usuarioExpandido===u.id
                    const evs = evolucoes[u.id] || []
                    return (
                      <div key={u.id} style={{ ...card, overflow:'hidden' }}>
                        <button onClick={() => abrirEvolucao(u.id)} style={{ width:'100%', border:'none', background:'#fff', textAlign:'left', padding:'12px 14px', cursor:'pointer', display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:10 }}>
                          <div>
                            <div style={{ fontSize:14, fontWeight:800, color:DARK }}>{u.nome}</div>
                            <div style={{ fontSize:11.5, color:'#888780', marginTop:2 }}>Próx. atendimento: {fmtData(u.proxData)}</div>
                            {u.outrosProfissionais.length>0 && (
                              <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>
                                Também com: {u.outrosProfissionais.map(p=>`${p.nome.split(' ')[0]} (${p.funcao})`).join(', ')}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize:14, color:'#B4B2A9', transform:aberto?'rotate(90deg)':'none', transition:'.15s' }}>›</span>
                        </button>

                        {aberto && (
                          <div style={{ borderTop:'0.5px solid #F1EFE8', background:'#FAFAF8', padding:'12px 14px' }}>
                            <div style={{ fontSize:12, fontWeight:700, color:DARK, marginBottom:8 }}>Evoluções e registros técnicos</div>
                            {!evolucoes[u.id] ? (
                              <div style={{ fontSize:12, color:'#B4B2A9' }}>Carregando...</div>
                            ) : evs.length===0 ? (
                              <div style={{ fontSize:12, color:'#888780' }}>Nenhum registro técnico encontrado.</div>
                            ) : evs.map((ev, i) => {
                              const faltou = ev.comparecimento && ev.comparecimento !== 'Compareceu'
                              return (
                                <div key={ev.id} style={{ marginBottom:10, paddingBottom:10, borderBottom:i<evs.length-1?'0.5px solid #E8E6DE':'none' }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:faltou?4:6 }}>
                                    <div style={{ fontSize:12, fontWeight:700, color:DARK }}>{fmtData(ev.data_atend)} {ev.hora_inicio?`· ${String(ev.hora_inicio).slice(0,5)}`:''}</div>
                                    <div style={{ display:'flex', gap:5 }}>
                                      {faltou && <span style={{ fontSize:10, background:'#FCEBEB', color:'#A32D2D', borderRadius:99, padding:'2px 7px', fontWeight:600 }}>{ev.comparecimento}</span>}
                                      <span style={{ fontSize:10, background:ev.situacao==='realizado'?'#EAF3DE':'#E6F1FB', color:ev.situacao==='realizado'?'#3B6D11':'#185FA5', borderRadius:99, padding:'2px 7px', fontWeight:600 }}>{ev.situacao}</span>
                                    </div>
                                  </div>
                                  {faltou ? (
                                    <div style={{ fontSize:11.5, color:'#888780' }}>Falta registrada — sem evolução técnica.</div>
                                  ) : (<>
                                    {ev.etapa_fluxo && <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{ev.etapa_fluxo}</div>}
                                    {ev.registro_tecnico ? (
                                      <div style={{ fontSize:12, color:'#2C2C2A', lineHeight:1.5, background:'#fff', borderRadius:7, padding:'7px 9px', border:'0.5px solid #E8E6DE', marginBottom:4 }}>{ev.registro_tecnico}</div>
                                    ) : <div style={{ fontSize:11.5, color:'#B4B2A9', marginBottom:4 }}>Sem registro técnico nesta sessão.</div>}
                                    {ev.orientacao_familia && <div style={{ fontSize:11, color:'#5F5E5A', marginTop:3 }}><span style={{ fontWeight:600 }}>Orientação: </span>{ev.orientacao_familia}</div>}
                                    {ev.proxima_acao && <div style={{ fontSize:11, color:'#5F5E5A', marginTop:2 }}><span style={{ fontWeight:600 }}>Próxima ação: </span>{ev.proxima_acao}</div>}
                                    {ev.desfecho_teacolher && <div style={{ fontSize:11, color:'#888780', marginTop:2 }}><span style={{ fontWeight:600 }}>Desfecho: </span>{ev.desfecho_teacolher}</div>}
                                  </>)}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}
