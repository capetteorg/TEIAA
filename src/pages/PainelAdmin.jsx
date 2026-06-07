import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const fimMes = m => { const [y,mo] = m.split('-'); return `${m}-${new Date(+y,+mo,0).getDate()}` }
const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', ROXO = '#8B2FC9', LARANJA = '#F4821F'

export default function PainelAdmin() {
  const navigate = useNavigate()
  const [resumo, setResumo] = useState({ entradas:0, saidas:0, saldo:0 })
  const [parcerias, setParcerias] = useState([])
  const [contas, setContas] = useState([])
  const [mes, setMes] = useState('')
  const [ultimoExtrato, setUltimoExtrato] = useState(null)
  const [loading, setLoading] = useState(true)
  const carregado = useRef(false)

  // Dados instituição
  const [instituicao, setInstituicao] = useState(null)
  const [presidente, setPresidente] = useState(null)

  // Métricas execução
  const [projetosAtivos, setProjetosAtivos] = useState(0)
  const [planosExecucao, setPlanosExecucao] = useState(0)
  const [atendimentosMes, setAtendimentosMes] = useState(0)
  const [usuariosAtivos, setUsuariosAtivos] = useState(0)
  const [equipeAtiva, setEquipeAtiva] = useState(0)

  // Alertas
  const [cobrancasPendentes, setCobrancasPendentes] = useState(0)
  const [dividasAbertas, setDividasAbertas] = useState(0)
  const [totalDividaAberta, setTotalDividaAberta] = useState(0)

  // Plano de Ação
  const [planoAcao, setPlanoAcao] = useState(null)
  const [orcamentoPlano, setOrcamentoPlano] = useState({ prevEntradas:0, prevSaidas:0, realEntradas:0, realSaidas:0 })
  const [metasPlano, setMetasPlano] = useState({ total:0, alcancadas:0, emAndamento:0 })

  useEffect(() => {
    if (carregado.current) return
    carregado.current = true
    inicializar()
  }, [])

  useEffect(() => { if (mes) carregarResumo() }, [mes])

  async function inicializar() {
    const mesAtual = new Date().toISOString().slice(0,7)

    const [
      extRes, parcRes, instRes, presRes,
      projRes, planosRes, atendRes, usersRes, equipeRes,
      cobRes, dividasRes, planoRes,
    ] = await Promise.all([
      supabase.from('extratos').select('competencia').order('competencia', { ascending:false }).limit(1),
      supabase.from('parcerias').select('id,nome_projeto,tipo,situacao').order('nome_projeto'),
      supabase.from('instituicao').select('*').limit(1).single(),
      supabase.from('diretoria').select('nome,cargo,mandato_fim').eq('cargo','Presidente').eq('ativo',true).gte('mandato_fim', new Date().toISOString().slice(0,10)).limit(1).single(),
      supabase.from('projetos').select('id', { count:'exact' }).eq('situacao','ativo'),
      supabase.from('planos').select('id', { count:'exact' }).eq('situacao','em execução'),
      supabase.from('atendimentos').select('id', { count:'exact' }).gte('data_atend', mesAtual+'-01').lte('data_atend', fimMes(mesAtual)),
      supabase.from('usuarios_atendidos').select('id', { count:'exact' }).eq('situacao','ativo'),
      supabase.from('equipe').select('id', { count:'exact' }).eq('situacao','ativo'),
      supabase.from('cobrancas').select('id', { count:'exact' }).eq('pago_confirmado', false),
      supabase.from('dividas').select('valor_original,valor_pago').eq('status','aberta'),
      supabase.from('planos').select('id,nome_plano,periodo_inicio,periodo_fim,valor_total_previsto,situacao').eq('tipo_plano','Plano de Ação Institucional').order('periodo_inicio', { ascending:false }).limit(1).single(),
    ])

    const mesUso = extRes.data?.length ? extRes.data[0].competencia : mesAtual
    setUltimoExtrato(mesUso)
    setMes(mesUso)
    setParcerias(parcRes.data || [])
    setInstituicao(instRes.data)
    setPresidente(presRes.data)
    setProjetosAtivos(projRes.count || 0)
    setPlanosExecucao(planosRes.count || 0)
    setAtendimentosMes(atendRes.count || 0)
    setUsuariosAtivos(usersRes.count || 0)
    setEquipeAtiva(equipeRes.count || 0)
    setCobrancasPendentes(cobRes.count || 0)

    const divs = dividasRes.data || []
    setDividasAbertas(divs.length)
    setTotalDividaAberta(divs.reduce((a,d) => a + (Number(d.valor_original||0) - Number(d.valor_pago||0)), 0))

    // Plano de Ação
    if (planoRes.data) {
      setPlanoAcao(planoRes.data)
      const [orcRes, metasRes] = await Promise.all([
        supabase.from('plano_orcamento').select('tipo,valor_previsto,valor_realizado').eq('plano_id', planoRes.data.id),
        supabase.from('metas_plano').select('status_meta').eq('plano_id', planoRes.data.id),
      ])
      const orc = orcRes.data || []
      setOrcamentoPlano({
        prevEntradas: orc.filter(o=>o.tipo==='entrada').reduce((a,o)=>a+Number(o.valor_previsto||0),0),
        prevSaidas:   orc.filter(o=>o.tipo==='saida').reduce((a,o)=>a+Number(o.valor_previsto||0),0),
        realEntradas: orc.filter(o=>o.tipo==='entrada').reduce((a,o)=>a+Number(o.valor_realizado||0),0),
        realSaidas:   orc.filter(o=>o.tipo==='saida').reduce((a,o)=>a+Number(o.valor_realizado||0),0),
      })
      const mts = metasRes.data || []
      setMetasPlano({
        total: mts.length,
        alcancadas: mts.filter(m=>m.status_meta==='alcançada').length,
        emAndamento: mts.filter(m=>m.status_meta==='em andamento').length,
      })
    }

    setLoading(false)
  }

  async function carregarResumo() {
    const { data: movs } = await supabase.from('extrato_movs').select('valor').gte('data', mes+'-01').lte('data', fimMes(mes))
    const lista = movs || []
    const ent = lista.filter(m => Number(m.valor) > 0).reduce((a,m) => a+Number(m.valor), 0)
    const sai = Math.abs(lista.filter(m => Number(m.valor) < 0).reduce((a,m) => a+Number(m.valor), 0))
    setResumo({ entradas:ent, saidas:sai, saldo:ent-sai })
  }

  const fmt = v => 'R$ '+Math.abs(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const mesLabel = mes ? new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) : ''

  const SITUACAO_COR = {
    'em execução': ['#EAF3DE','#3B6D11'],
    'prestação pendente': ['#FAEEDA','#854F0B'],
    'encerrada': ['#F1EFE8','#888780'],
    'suspensa': ['#FCEBEB','#A32D2D'],
  }

  const s = {
    card: cor => ({ background:'#fff', borderRadius:14, border:`1.5px solid ${cor}20`, padding:'1.25rem', cursor:'pointer', boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    mini: { background:'#F8F7F2', borderRadius:8, padding:'8px 10px' },
    btn: (bg,cor='#fff',borda=null) => ({ fontSize:11, padding:'4px 10px', borderRadius:6, border: borda ? `0.5px solid ${borda}` : 'none', background:bg, color:cor, cursor:'pointer' }),
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:`3px solid ${VERDE}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <div style={{ fontSize:13, color:'#888780' }}>Carregando painel...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ padding:'1.5rem', maxWidth:1100, margin:'0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ fontSize:18, fontWeight:600, color:'#2C2C2A' }}>Painel Administrativo</div>
        <div style={{ fontSize:12, color:'#888780', marginTop:2 }}>
          {instituicao?.nome_completo || 'CAPETTE'} · {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </div>
      </div>

      {/* Alertas */}
      {(cobrancasPendentes > 0 || dividasAbertas > 0) && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:'1.25rem' }}>
          {cobrancasPendentes > 0 && (
            <div style={{ background:'#FEF2F2', border:'0.5px solid #F7C1C1', borderRadius:10, padding:'.75rem 1rem', fontSize:12, color:'#A32D2D', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16 }}>⚠️</span>
              <span><strong>{cobrancasPendentes} cobranças</strong> pendentes de confirmação.</span>
              <button onClick={() => navigate('/cobrancas')} style={{ ...s.btn(VERMELHO), marginLeft:'auto' }}>Ver cobranças →</button>
            </div>
          )}
          {dividasAbertas > 0 && (
            <div style={{ background:'#FAEEDA', border:'0.5px solid #F5C99A', borderRadius:10, padding:'.75rem 1rem', fontSize:12, color:'#854F0B', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16 }}>💳</span>
              <span><strong>{dividasAbertas} dívida{dividasAbertas>1?'s':''}</strong> em aberto — saldo devedor {fmt(totalDividaAberta)}.</span>
              <button onClick={() => navigate('/controle-dividas')} style={{ ...s.btn(LARANJA), marginLeft:'auto' }}>Ver dívidas →</button>
            </div>
          )}
        </div>
      )}

      {/* 4 Cards principais */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.25rem', marginBottom:'1.75rem' }}>

        {/* Card Financeiro */}
        <div style={s.card(AZUL)} onClick={() => navigate('/conciliacao')}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${AZUL}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏦</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>Financeiro</div>
              <div style={{ fontSize:11, color:'#888780' }}>Movimentação — {mesLabel}</div>
            </div>
            <input type="month" value={mes} onChange={e => { e.stopPropagation(); setMes(e.target.value) }}
              onClick={e => e.stopPropagation()}
              style={{ marginLeft:'auto', fontSize:11, padding:'3px 6px', border:'0.5px solid #D3D1C7', borderRadius:6 }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
            {[['Entradas',fmt(resumo.entradas),VERDE],['Saídas',fmt(resumo.saidas),VERMELHO],['Resultado',fmt(resumo.saldo),resumo.saldo>=0?AZUL:VERMELHO]].map(([l,v,c])=>(
              <div key={l} style={s.mini}><div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{l}</div><div style={{ fontSize:12, fontWeight:600, color:c }}>{v}</div></div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={e=>{e.stopPropagation();navigate('/despesas')}} style={s.btn('#FEF2F2',VERMELHO,VERMELHO)}>+ Despesa</button>
            <button onClick={e=>{e.stopPropagation();navigate('/entradas')}} style={s.btn('#EAF3DE',VERDE,VERDE)}>+ Entrada</button>
            <button onClick={e=>{e.stopPropagation();navigate('/importar')}} style={s.btn('transparent',AZUL,AZUL)}>Extrato</button>
            <button onClick={e=>{e.stopPropagation();navigate('/relatorios')}} style={s.btn(AZUL)}>Relatórios →</button>
          </div>
        </div>

        {/* Card Plano de Ação */}
        {planoAcao && (() => {
          const pctOrc = orcamentoPlano.prevSaidas > 0 ? Math.round((orcamentoPlano.realSaidas / orcamentoPlano.prevSaidas) * 100) : 0
          const pctMetas = metasPlano.total > 0 ? Math.round((metasPlano.alcancadas / metasPlano.total) * 100) : 0
          const ano = planoAcao.periodo_inicio?.slice(0,4)
          return (
            <div style={s.card(ROXO)} onClick={() => navigate('/planos-execucao')}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${ROXO}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📋</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>Plano de Ação {ano}</div>
                  <div style={{ fontSize:11, color:'#888780' }}>{planoAcao.situacao}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                {[
                  ['Orçamento previsto', fmt(orcamentoPlano.prevSaidas), ROXO],
                  ['Executado', fmt(orcamentoPlano.realSaidas), orcamentoPlano.realSaidas > 0 ? VERDE : '#888780'],
                  ['Metas', `${metasPlano.total} total`, '#5F5E5A'],
                  ['Em andamento', metasPlano.emAndamento, AZUL],
                ].map(([l,v,c])=>(
                  <div key={l} style={s.mini}><div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{l}</div><div style={{ fontSize:12, fontWeight:600, color:c }}>{v}</div></div>
                ))}
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888780', marginBottom:3 }}>
                  <span>Execução orçamentária</span><span style={{ fontWeight:600, color:ROXO }}>{pctOrc}%</span>
                </div>
                <div style={{ height:6, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:Math.min(pctOrc,100)+'%', background:ROXO, borderRadius:99, transition:'width .3s' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <button onClick={e=>{e.stopPropagation();navigate('/planos-execucao')}} style={s.btn(ROXO)}>Ver plano →</button>
                <button onClick={e=>{e.stopPropagation();navigate('/projetos')}} style={s.btn('transparent',ROXO,ROXO)}>Projetos</button>
              </div>
            </div>
          )
        })()}

        {/* Card Execução */}
        <div style={s.card(VERDE)} onClick={() => navigate('/projetos')}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${VERDE}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>👥</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>Programas e Projetos</div>
              <div style={{ fontSize:11, color:'#888780' }}>Execução e acompanhamento</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            {[
              ['Projetos ativos', projetosAtivos, VERDE],
              ['Atend. este mês', atendimentosMes, AZUL],
              ['Usuários ativos', usuariosAtivos, VERDE],
              ['Equipe ativa', equipeAtiva, '#5F5E5A'],
            ].map(([l,v,c])=>(
              <div key={l} style={s.mini}><div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{l}</div><div style={{ fontSize:14, fontWeight:600, color:c }}>{v}</div></div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={e=>{e.stopPropagation();navigate('/projetos')}} style={s.btn(VERDE)}>Projetos →</button>
            <button onClick={e=>{e.stopPropagation();navigate('/atendimentos')}} style={s.btn('transparent','#5F5E5A','#D3D1C7')}>Atendimentos</button>
            <button onClick={e=>{e.stopPropagation();navigate('/equipe')}} style={s.btn('transparent','#5F5E5A','#D3D1C7')}>Equipe</button>
          </div>
        </div>

        {/* Card Institucional */}
        <div style={s.card(LARANJA)} onClick={() => navigate('/instituicao')}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${LARANJA}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏛️</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>Institucional</div>
              <div style={{ fontSize:11, color:'#888780' }}>Dados, diretoria e parcerias</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            {[
              ['Presidente', presidente?.nome?.split(' ').slice(0,2).join(' ')||'—', LARANJA],
              ['Mandato até', presidente ? fmtData(presidente.mandato_fim) : '—', '#5F5E5A'],
              ['Instrumentos ativos', parcerias.filter(p=>p.situacao==='em execução').length, LARANJA],
              ['CNPJ', instituicao?.cnpj||'—', '#5F5E5A'],
            ].map(([l,v,c])=>(
              <div key={l} style={s.mini}><div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{l}</div><div style={{ fontSize:12, fontWeight:500, color:c, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div></div>
            ))}
          </div>
          {parcerias.filter(p=>p.situacao==='em execução').length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:10 }}>
              {parcerias.filter(p=>p.situacao==='em execução').slice(0,2).map(p => {
                const [bg,cor] = SITUACAO_COR[p.situacao]||['#F1EFE8','#888780']
                return (
                  <div key={p.id} onClick={e=>{e.stopPropagation();navigate(`/parcerias/${p.id}`)}}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F8F7F2', borderRadius:7, padding:'6px 8px', cursor:'pointer' }}>
                    <div style={{ fontSize:11, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{p.nome_projeto}</div>
                    <span style={s.badge(bg,cor)}>{p.situacao}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={e=>{e.stopPropagation();navigate('/parcerias')}} style={s.btn(LARANJA)}>Instrumentos →</button>
            <button onClick={e=>{e.stopPropagation();navigate('/instituicao')}} style={s.btn('transparent',LARANJA,LARANJA)}>Instituição</button>
            <button onClick={e=>{e.stopPropagation();navigate('/documentos')}} style={s.btn('transparent','#5F5E5A','#D3D1C7')}>Documentos</button>
          </div>
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#5F5E5A', marginBottom:'.75rem' }}>Acesso rápido</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8 }}>
          {[
            { icon:'📥', label:'Lançar despesa',    rota:'/despesas',         cor:'#FEF2F2' },
            { icon:'📤', label:'Lançar entrada',    rota:'/entradas',         cor:'#EAF3DE' },
            { icon:'📊', label:'Relatórios',        rota:'/relatorios',       cor:'#E6F1FB' },
            { icon:'📁', label:'Projetos',          rota:'/projetos',         cor:'#F0EAFA' },
            { icon:'📋', label:'Plano de Ação',     rota:'/planos-execucao',  cor:'#F0EAFA' },
            { icon:'🤝', label:'Instrumentos',      rota:'/parcerias',        cor:'#FEF4E8' },
            { icon:'👥', label:'Equipe',            rota:'/equipe',           cor:'#EEEDFE' },
            { icon:'💳', label:'Controle Dívidas',  rota:'/controle-dividas', cor:'#FAEEDA', badge: dividasAbertas > 0 ? dividasAbertas : null },
            { icon:'🧾', label:'Cobranças',         rota:'/cobrancas',        cor:'#FEF2F2', badge: cobrancasPendentes > 0 ? cobrancasPendentes : null },
            { icon:'📄', label:'Prestação Contas',  rota:'/prestacao-contas', cor:'#FAEEDA' },
            { icon:'🔒', label:'Fechamento',        rota:'/fechamento',       cor:'#F8F7F2' },
            { icon:'🌐', label:'Transparência',     rota:'/transparencia',    cor:'#E6F1FB' },
          ].map(item => (
            <button key={item.rota} onClick={() => navigate(item.rota)}
              style={{ background:item.cor, border:'0.5px solid #E0DDD5', borderRadius:10, padding:'12px 10px', cursor:'pointer', textAlign:'center', position:'relative' }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{item.icon}</div>
              <div style={{ fontSize:11, color:'#2C2C2A', fontWeight:500, lineHeight:1.3 }}>{item.label}</div>
              {item.badge && (
                <div style={{ position:'absolute', top:6, right:6, background:VERMELHO, color:'#fff', fontSize:9, fontWeight:700, borderRadius:99, width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Parcerias em execução */}
      {parcerias.filter(p=>p.situacao==='em execução').length > 0 && (
        <div style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Parcerias em execução</div>
            <button onClick={() => navigate('/parcerias')} style={{ fontSize:11, background:'none', border:'none', color:AZUL, cursor:'pointer' }}>Ver todas →</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:8 }}>
            {parcerias.filter(p=>p.situacao==='em execução').map(p => {
              const [bg,cor] = SITUACAO_COR[p.situacao]||['#F1EFE8','#888780']
              return (
                <div key={p.id} onClick={() => navigate(`/parcerias/${p.id}`)}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F8F7F2', borderRadius:8, padding:'8px 12px', cursor:'pointer' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{p.nome_projeto}</div>
                    <div style={{ fontSize:10, color:'#888780' }}>{p.tipo}</div>
                  </div>
                  <span style={s.badge(bg,cor)}>{p.situacao}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
