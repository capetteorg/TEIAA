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

  const pctOrc = orcamentoPlano.prevSaidas > 0 ? Math.round((orcamentoPlano.realSaidas / orcamentoPlano.prevSaidas) * 100) : 0
  const anoPlano = planoAcao?.periodo_inicio?.slice(0,4)

  return (
    <div style={{ padding:'1.5rem', maxWidth:1200, margin:'0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:'#2C2C2A' }}>Painel Administrativo</div>
          <div style={{ fontSize:12, color:'#888780', marginTop:2 }}>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => navigate('/despesas')} style={{ fontSize:12, padding:'7px 14px', borderRadius:8, border:'none', background:'#FEF2F2', color:VERMELHO, cursor:'pointer', fontWeight:500 }}>+ Despesa</button>
          <button onClick={() => navigate('/entradas')} style={{ fontSize:12, padding:'7px 14px', borderRadius:8, border:'none', background:'#EAF3DE', color:VERDE, cursor:'pointer', fontWeight:500 }}>+ Entrada</button>
          <button onClick={() => navigate('/relatorios')} style={{ fontSize:12, padding:'7px 14px', borderRadius:8, border:'none', background:AZUL, color:'#fff', cursor:'pointer', fontWeight:500 }}>Relatórios</button>
        </div>
      </div>

      {/* Alertas */}
      {(cobrancasPendentes > 0 || dividasAbertas > 0) && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:'1.25rem' }}>
          {cobrancasPendentes > 0 && (
            <div style={{ background:'#FEF2F2', border:'0.5px solid #F7C1C1', borderRadius:10, padding:'.75rem 1rem', fontSize:12, color:'#A32D2D', display:'flex', alignItems:'center', gap:10 }}>
              <span>⚠️ <strong>{cobrancasPendentes} cobranças</strong> pendentes de confirmação.</span>
              <button onClick={() => navigate('/cobrancas')} style={{ marginLeft:'auto', fontSize:11, padding:'4px 12px', borderRadius:6, border:'none', background:VERMELHO, color:'#fff', cursor:'pointer' }}>Ver →</button>
            </div>
          )}
          {dividasAbertas > 0 && (
            <div style={{ background:'#FAEEDA', border:'0.5px solid #F5C99A', borderRadius:10, padding:'.75rem 1rem', fontSize:12, color:'#854F0B', display:'flex', alignItems:'center', gap:10 }}>
              <span>💳 <strong>{dividasAbertas} dívida{dividasAbertas>1?'s':''}</strong> em aberto — {fmt(totalDividaAberta)}</span>
              <button onClick={() => navigate('/controle-dividas')} style={{ marginLeft:'auto', fontSize:11, padding:'4px 12px', borderRadius:6, border:'none', background:LARANJA, color:'#fff', cursor:'pointer' }}>Ver →</button>
            </div>
          )}
        </div>
      )}

      {/* Linha 1: Financeiro (largo) + Plano de Ação */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>

        {/* Card Financeiro */}
        <div style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${AZUL}20`, padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${AZUL}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏦</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>Financeiro</div>
                <div style={{ fontSize:11, color:'#888780' }}>{mesLabel}</div>
              </div>
            </div>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              style={{ fontSize:11, padding:'4px 8px', border:'0.5px solid #D3D1C7', borderRadius:8, color:'#5F5E5A' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
            {[['Entradas',fmt(resumo.entradas),VERDE,'#EAF3DE'],['Saídas',fmt(resumo.saidas),VERMELHO,'#FEF2F2'],['Saldo',fmt(resumo.saldo),resumo.saldo>=0?AZUL:VERMELHO,resumo.saldo>=0?'#E6F1FB':'#FEF2F2']].map(([l,v,c,bg])=>(
              <div key={l} style={{ background:bg, borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => navigate('/lancamentos')} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:`0.5px solid ${AZUL}`, background:'transparent', color:AZUL, cursor:'pointer' }}>Lançamentos</button>
            <button onClick={() => navigate('/conciliacao')} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>Conciliação</button>
            <button onClick={() => navigate('/importar')} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>Importar extrato</button>
          </div>
        </div>

        {/* Card Plano de Ação */}
        {planoAcao ? (
          <div onClick={() => navigate('/planos-execucao')} style={{ background:`linear-gradient(135deg, ${ROXO}08, #fff)`, borderRadius:14, border:`1.5px solid ${ROXO}30`, padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${ROXO}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📋</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>Plano de Ação {anoPlano}</div>
                <div style={{ fontSize:11, color:'#888780' }}>{planoAcao.situacao}</div>
              </div>
              <span style={{ fontSize:10, padding:'3px 10px', borderRadius:99, background:`${ROXO}15`, color:ROXO, fontWeight:600 }}>em execução</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
              {[
                ['Orçamento', fmt(orcamentoPlano.prevSaidas), '#5F5E5A', '#F8F7F2'],
                ['Executado', fmt(orcamentoPlano.realSaidas), ROXO, `${ROXO}10`],
                ['Metas', `${metasPlano.emAndamento} / ${metasPlano.total}`, AZUL, '#E6F1FB'],
              ].map(([l,v,c,bg])=>(
                <div key={l} style={{ background:bg, borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#888780', marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888780', marginBottom:4 }}>
                <span>Execução orçamentária</span>
                <span style={{ fontWeight:700, color:ROXO }}>{pctOrc}%</span>
              </div>
              <div style={{ height:7, background:`${ROXO}20`, borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:Math.min(pctOrc,100)+'%', background:ROXO, borderRadius:99 }} />
              </div>
            </div>
            <button onClick={e=>{e.stopPropagation();navigate('/planos-execucao')}} style={{ fontSize:11, padding:'5px 14px', borderRadius:7, border:'none', background:ROXO, color:'#fff', cursor:'pointer', fontWeight:500 }}>Abrir plano completo →</button>
          </div>
        ) : (
          <div style={{ background:'#F8F7F2', borderRadius:14, border:'1.5px dashed #D3D1C7', padding:'1.25rem', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <div style={{ fontSize:28 }}>📋</div>
            <div style={{ fontSize:13, color:'#888780' }}>Nenhum plano de ação cadastrado</div>
            <button onClick={() => navigate('/planos-execucao')} style={{ fontSize:11, padding:'5px 14px', borderRadius:7, border:'none', background:ROXO, color:'#fff', cursor:'pointer' }}>Criar plano →</button>
          </div>
        )}
      </div>

      {/* Linha 2: Programas + Institucional */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>

        {/* Card Programas */}
        <div onClick={() => navigate('/projetos')} style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${VERDE}20`, padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${VERDE}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📁</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Programas e Projetos</div>
              <div style={{ fontSize:11, color:'#888780' }}>Execução e acompanhamento</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              ['Projetos ativos', projetosAtivos, VERDE, '#EAF3DE'],
              ['Usuários ativos', usuariosAtivos, AZUL, '#E6F1FB'],
              ['Atend. este mês', atendimentosMes, LARANJA, '#FAEEDA'],
              ['Equipe ativa', equipeAtiva, '#5F5E5A', '#F8F7F2'],
            ].map(([l,v,c,bg])=>(
              <div key={l} style={{ background:bg, borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:16, fontWeight:700, color:c }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={e=>{e.stopPropagation();navigate('/projetos')}} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:'none', background:VERDE, color:'#fff', cursor:'pointer', fontWeight:500 }}>Projetos →</button>
            <button onClick={e=>{e.stopPropagation();navigate('/atendimentos')}} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>Atendimentos</button>
            <button onClick={e=>{e.stopPropagation();navigate('/equipe')}} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>Equipe</button>
          </div>
        </div>

        {/* Card Institucional */}
        <div onClick={() => navigate('/instituicao')} style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${LARANJA}20`, padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${LARANJA}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏛️</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Institucional</div>
              <div style={{ fontSize:11, color:'#888780' }}>Dados, diretoria e instrumentos</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom: parcerias.filter(p=>p.situacao==='em execução').length > 0 ? 10 : 12 }}>
            {[
              ['Presidente', presidente?.nome?.split(' ').slice(0,2).join(' ')||'—', LARANJA, '#FEF4E8'],
              ['Mandato até', presidente ? fmtData(presidente.mandato_fim) : '—', '#5F5E5A', '#F8F7F2'],
              ['Instrumentos ativos', parcerias.filter(p=>p.situacao==='em execução').length, LARANJA, '#FEF4E8'],
              ['CNPJ', instituicao?.cnpj||'—', '#5F5E5A', '#F8F7F2'],
            ].map(([l,v,c,bg])=>(
              <div key={l} style={{ background:bg, borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:600, color:c, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
              </div>
            ))}
          </div>
          {parcerias.filter(p=>p.situacao==='em execução').slice(0,2).map(p => (
            <div key={p.id} onClick={e=>{e.stopPropagation();navigate(`/parcerias/${p.id}`)}}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F8F7F2', borderRadius:8, padding:'6px 10px', marginBottom:4, cursor:'pointer' }}>
              <div style={{ fontSize:11, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{p.nome_projeto}</div>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'#EAF3DE', color:'#3B6D11', fontWeight:500, flexShrink:0, marginLeft:6 }}>ativo</span>
            </div>
          ))}
          <div style={{ display:'flex', gap:6, marginTop: parcerias.filter(p=>p.situacao==='em execução').length > 0 ? 8 : 0 }}>
            <button onClick={e=>{e.stopPropagation();navigate('/parcerias')}} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:'none', background:LARANJA, color:'#fff', cursor:'pointer', fontWeight:500 }}>Instrumentos →</button>
            <button onClick={e=>{e.stopPropagation();navigate('/instituicao')}} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>Instituição</button>
            <button onClick={e=>{e.stopPropagation();navigate('/documentos')}} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>Documentos</button>
          </div>
        </div>
      </div>

      {/* Acesso rápido */}
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:'#888780', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Acesso rápido</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:8 }}>
          {[
            { icon:'📥', label:'Lançar despesa',    rota:'/despesas',         cor:'#FEF2F2', icorCor:VERMELHO },
            { icon:'📤', label:'Lançar entrada',    rota:'/entradas',         cor:'#EAF3DE', icorCor:VERDE },
            { icon:'🔍', label:'Conciliação',       rota:'/conciliacao',      cor:'#E6F1FB', icorCor:AZUL },
            { icon:'📊', label:'Relatórios',        rota:'/relatorios',       cor:'#E6F1FB', icorCor:AZUL },
            { icon:'👥', label:'Usuários atend.',   rota:'/usuarios-atendidos',cor:'#EAF3DE', icorCor:VERDE },
            { icon:'💳', label:'Dívidas',           rota:'/controle-dividas', cor:'#FAEEDA', icorCor:LARANJA, badge: dividasAbertas > 0 ? dividasAbertas : null },
            { icon:'🧾', label:'Cobranças',         rota:'/cobrancas',        cor:'#FEF2F2', icorCor:VERMELHO, badge: cobrancasPendentes > 0 ? cobrancasPendentes : null },
            { icon:'⚠️', label:'Pendências',        rota:'/pendencias',       cor:'#FAEEDA', icorCor:LARANJA },
            { icon:'📄', label:'Prestação',         rota:'/prestacao-contas', cor:'#F0EAFA', icorCor:ROXO },
            { icon:'🔒', label:'Fechamento',        rota:'/fechamento',       cor:'#F8F7F2', icorCor:'#5F5E5A' },
            { icon:'💾', label:'Backup',            rota:'/backup',           cor:'#F8F7F2', icorCor:'#5F5E5A' },
            { icon:'🌐', label:'Transparência',     rota:'/transparencia',    cor:'#E6F1FB', icorCor:AZUL },
          ].map(item => (
            <button key={item.rota} onClick={() => navigate(item.rota)}
              style={{ background:item.cor, border:'0.5px solid #E8E6DE', borderRadius:12, padding:'14px 8px', cursor:'pointer', textAlign:'center', position:'relative', transition:'transform .1s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ fontSize:22 }}>{item.icon}</div>
              <div style={{ fontSize:10, color:'#2C2C2A', fontWeight:500, lineHeight:1.3 }}>{item.label}</div>
              {item.badge && (
                <div style={{ position:'absolute', top:6, right:6, background:VERMELHO, color:'#fff', fontSize:9, fontWeight:700, borderRadius:99, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
