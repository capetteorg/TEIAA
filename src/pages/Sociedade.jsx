import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'
const LOGO = [['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#0E7EA8'],['E','#E8207A']]

export default function Sociedade() {
  const [aba, setAba] = useState('inicio')
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7))
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [resumo, setResumo] = useState({ entMes:0, saiMes:0, entAno:0, saiAno:0, saldoGeral:0 })
  const [movs, setMovs] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [instituicao, setInstituicao] = useState(null)
  const [diretoria, setDiretoria] = useState([])
  const [parcerias, setParcerias] = useState([])
  const [projetos, setProjetos] = useState([])
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarEstaticos()
  }, [])

  useEffect(() => {
    carregarFinanceiro()
  }, [mes, ano])

  async function carregarEstaticos() {
    const [inst, dir, parc, proj, users, docs] = await Promise.all([
      supabase.from('instituicao').select('*').limit(1),
      supabase.from('diretoria').select('*').eq('ativo', true),
      supabase.from('parcerias').select('*').in('situacao', ['aprovado','em execução']).order('nome_projeto'),
      supabase.from('projetos').select('*').eq('situacao', 'ativo').eq('exibir_transparencia', true).order('nome'),
      supabase.from('usuarios_atendidos').select('id', { count:'exact' }).eq('situacao','ativo'),
      supabase.from('documentos').select('*').eq('publico', true).order('criado_em', { ascending:false }),
    ])
    setInstituicao(inst.data?.[0] || null)
    const dirData = dir.data || []
    dirData.sort((a,b) => {
      const ia = ORDEM_CARGOS.indexOf(a.cargo)
      const ib = ORDEM_CARGOS.indexOf(b.cargo)
      if (ia === -1 && ib === -1) return a.cargo.localeCompare(b.cargo)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    setDiretoria(dirData)
    setParcerias(parc.data || [])
    setProjetos(proj.data || [])
    setTotalUsuarios(users.count || 0)
    setDocumentos(docs.data || [])
  }

  async function carregarFinanceiro() {
    setLoading(true)
    const [anoMes, mmMes] = mes.split('-')
    const ultimoDia = new Date(parseInt(anoMes), parseInt(mmMes), 0).getDate()
    const fimMes = `${mes}-${String(ultimoDia).padStart(2,'0')}`
    const [movMes, movAno, todas] = await Promise.all([
      supabase.from('extrato_movs').select('valor').gte('data', mes+'-01').lte('data', fimMes),
      supabase.from('extrato_movs').select('*, categoria:categorias(nome,tipo)').gte('data', ano+'-01-01').lte('data', ano+'-12-31').order('data', { ascending:false }),
      supabase.from('extrato_movs').select('valor'),
    ])
    const entMes = (movMes.data||[]).filter(m=>Number(m.valor)>0).reduce((a,m)=>a+Number(m.valor),0)
    const saiMes = Math.abs((movMes.data||[]).filter(m=>Number(m.valor)<0).reduce((a,m)=>a+Number(m.valor),0))
    const entAno = (movAno.data||[]).filter(m=>Number(m.valor)>0).reduce((a,m)=>a+Number(m.valor),0)
    const saiAno = Math.abs((movAno.data||[]).filter(m=>Number(m.valor)<0).reduce((a,m)=>a+Number(m.valor),0))
    const saldoGeral = (todas.data||[]).reduce((a,m)=>a+Number(m.valor),0)
    setResumo({ entMes, saiMes, entAno, saiAno, saldoGeral })
    setMovs(movAno.data || [])
    setLoading(false)
  }

  const fmt = v => 'R$ '+Math.abs(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const anos = []
  for (let y = new Date().getFullYear(); y >= 2023; y--) anos.push(String(y))


  const ORDEM_CARGOS = [
    'Presidente',
    'Vice-presidente',
    '1º Tesoureiro',
    '2º Tesoureiro',
    '1º Secretário',
    '2º Secretário',
    'Diretora Pedagógica',
    'Gerente Administrativo',
    'Assistente Social',
    'Presidente Conselho Deliberativo',
    'Vice-Presidente Conselho Deliberativo',
    '1º Membro Conselho Deliberativo',
    '2º Membro Conselho Deliberativo',
    '3º Membro Conselho Deliberativo',
    'Suplente Conselho Deliberativo',
    '2º Suplente Conselho Deliberativo',
    '1º Membro Conselho Fiscal',
    '2º Membro Conselho Fiscal',
    'Suplente Conselho Fiscal',
    '1º Membro Conselho Diretivo',
    '2º Membro Conselho Diretivo',
    '3º Membro Conselho Diretivo',
  ]

  const TIPO_LABEL = { emenda:'Emenda Parlamentar', edital:'Edital', fomento:'Termo de Fomento', colaboracao:'Termo de Colaboração', convenio:'Convênio', parceria:'Parceria', outro:'Outro' }
  const SIT_COR = { 'aprovado':['#EAF3DE','#3B6D11'], 'em execução':['#FAEEDA','#854F0B'] }

  const ABAS = [
    { id:'inicio', label:'Início' },
    { id:'projetos', label:'Projetos e Serviços' },
    { id:'parcerias', label:'Parcerias e Emendas' },
    { id:'financeiro', label:'Financeiro' },
    { id:'documentos', label:'Documentos' },
    { id:'quem-somos', label:'Quem somos' },
  ]

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    tab: ativo => ({ padding:'8px 16px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?VERDE:'#D3D1C7'}`, background:ativo?VERDE:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer', whiteSpace:'nowrap', fontWeight: ativo?500:400 }),
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #F8F7F2 0%, #EEF4E8 100%)', position:'relative' }}>

      {/* Marca d'água Agendo */}
      <div style={{ position:'fixed', right:'-6vw', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0, opacity:0.04, filter:'grayscale(100%)' }}>
        <img src="/agendo-logo.png" alt="" style={{ width:'30vw', maxWidth:360 }} />
      </div>

      {/* Cabeçalho */}
      <div style={{ background: 'rgba(255,255,255,0.92)', borderBottom: '0.5px solid #E8E6DE', padding: '1rem 1.5rem', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <img src="/logo.png" alt="Logo" style={{ height:36, width:'auto', objectFit:'contain', maxWidth:160 }}
              onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
            <div style={{ display:'none', gap:2, alignItems:'center' }}>
              {LOGO.map(([l,c]) => <span key={l+c} style={{ fontSize:18, fontWeight:700, color:c }}>{l}</span>)}
            </div>
            <div style={{ height:28, width:'0.5px', background:'#E8E6DE' }} />
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:'#2C2C2A' }}>Portal de Transparência</div>
              <div style={{ fontSize:11, color:'#888780' }}>
                {instituicao?.nome_completo || 'Casa do Pequeno Trabalhador de Teresópolis'} · CNPJ {instituicao?.cnpj || '29.213.717/0001-01'}
              </div>
            </div>
          </div>
          <a href="/login" style={{ fontSize:11, color:'#888780', textDecoration:'none', padding:'5px 12px', border:'0.5px solid #E8E6DE', borderRadius:7, background:'#F8F7F2' }}>← Área interna</a>
        </div>
      </div>

      {/* Navegação */}
      <div style={{ background:'rgba(255,255,255,0.92)', borderBottom:'0.5px solid #E8E6DE', padding:'.5rem 1.5rem' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'flex', gap:6, flexWrap:'wrap' }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={s.tab(aba===a.id)}>{a.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.5rem 1rem 3rem' }}>

        {/* ===== ABA INÍCIO ===== */}
        {aba === 'inicio' && (
          <>
            {/* Hero institucional */}
            <div style={{ background:`linear-gradient(135deg, ${VERDE}15, ${AZUL}10)`, border:`0.5px solid ${VERDE}40`, borderRadius:16, padding:'2rem', marginBottom:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:11, color:VERDE, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Organização da Sociedade Civil</div>
                  <div style={{ fontSize:20, fontWeight:700, color:'#2C2C2A', marginBottom:8 }}>
                    {instituicao?.nome_fantasia || 'CAPETTE'}
                  </div>
                  <div style={{ fontSize:13, color:'#5F5E5A', lineHeight:1.7, marginBottom:12 }}>
                    {instituicao?.missao || 'A CAPETTE — Casa do Pequeno Trabalhador de Teresópolis atua há mais de 50 anos na promoção e defesa dos direitos de crianças, adolescentes e famílias em situação de vulnerabilidade social no município de Teresópolis, RJ.'}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {[
                      instituicao?.endereco && { icon:'ti-map-pin', val:instituicao.endereco },
                      instituicao?.telefone && { icon:'ti-phone', val:instituicao.telefone },
                      instituicao?.email && { icon:'ti-mail', val:instituicao.email },
                    ].filter(Boolean).map((info,i) => (
                      <span key={i} style={{ fontSize:11, color:'#5F5E5A', padding:'3px 10px', background:'rgba(255,255,255,0.8)', borderRadius:99, border:'0.5px solid #E0DDD5', display:'inline-flex', alignItems:'center', gap:4 }}>
                        <i className={`ti ${info.icon}`} style={{fontSize:11}} /> {info.val}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Números */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, minWidth:220 }}>
                  {[
                    { label:'Anos de atuação', val:'50+', cor:VERDE },
                    { label:'Usuários ativos', val:totalUsuarios, cor:AZUL },
                    { label:'Projetos ativos', val:projetos.length, cor:LARANJA },
                    { label:'Parcerias ativas', val:parcerias.length, cor:'#8B2FC9' },
                  ].map(m => (
                    <div key={m.label} style={{ background:'rgba(255,255,255,0.9)', borderRadius:10, padding:'.85rem 1rem', textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:700, color:m.cor }}>{m.val}</div>
                      <div style={{ fontSize:10, color:'#888780', marginTop:2 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumo financeiro do mês */}
            <div style={{ display:'flex', gap:10, marginBottom:'1rem', alignItems:'flex-end', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:11, color:'#888780', marginBottom:3 }}>Mês</div>
                <input type="month" value={mes} onChange={e=>setMes(e.target.value)}
                  style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }} />
              </div>
              <div>
                <div style={{ fontSize:11, color:'#888780', marginBottom:3 }}>Ano</div>
                <select value={ano} onChange={e=>setAno(e.target.value)}
                  style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
                  {anos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:'1.5rem' }}>
              {[
                { label:`Entradas — ${mes}`, val:fmt(resumo.entMes), cor:VERDE },
                { label:`Saídas — ${mes}`, val:fmt(resumo.saiMes), cor:VERMELHO },
                { label:`Resultado — ${mes}`, val:fmt(resumo.entMes-resumo.saiMes), cor:(resumo.entMes-resumo.saiMes)>=0?AZUL:VERMELHO },
                { label:`Entradas — ${ano}`, val:fmt(resumo.entAno), cor:VERDE },
                { label:`Saídas — ${ano}`, val:fmt(resumo.saiAno), cor:VERMELHO },
                { label:'Saldo geral', val:fmt(resumo.saldoGeral), cor:Number(resumo.saldoGeral)>=0?AZUL:VERMELHO },
              ].map(m => (
                <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ height:3, borderRadius:99, background:m.cor, marginBottom:'.6rem' }} />
                  <div style={{ fontSize:10, color:'#888780', marginBottom:3 }}>{m.label}</div>
                  <div style={{ fontSize:15, fontWeight:600, color:m.cor }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Preview projetos */}
            {projetos.length > 0 && (
              <div style={s.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>Projetos e Serviços em execução</div>
                  <button onClick={() => setAba('projetos')} style={{ fontSize:11, padding:'4px 12px', borderRadius:8, border:`0.5px solid ${VERDE}`, background:'#fff', color:VERDE, cursor:'pointer' }}>Ver todos →</button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {projetos.map(p => (
                    <span key={p.id} style={s.badge('#EAF3DE','#3B6D11')}>{p.nome}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Base legal */}
            <div style={{ background:'#EAF3DE', border:'0.5px solid #C0DD97', borderRadius:10, padding:'.85rem 1rem', marginTop:'1rem', fontSize:11, color:'#3B6D11', lineHeight:1.8 }}>
              <strong style={{ fontSize:12, display:'block', marginBottom:4 }}>Base legal da transparência</strong>
              Informações publicadas para transparência institucional e controle social, em observância à <strong>Lei nº 13.019/2014 — MROSC</strong>, <strong>Lei Complementar nº 187/2021 — CEBAS</strong>, <strong>Decreto nº 11.791/2023</strong>, <strong>Portaria MDS nº 952/2023</strong> e proteção de dados pessoais.
            </div>
          </>
        )}

        {/* ===== ABA PROJETOS ===== */}
        {aba === 'projetos' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Projetos e Serviços</div>
            <div style={{ fontSize:12, color:'#888780', marginBottom:'1.25rem' }}>
              Projetos, serviços e ações executados pela CAPETTE em prol da comunidade de Teresópolis.
            </div>

            {/* Total de usuários */}
            <div style={{ background:`linear-gradient(135deg, ${VERDE}15, ${VERDE}05)`, border:`0.5px solid ${VERDE}40`, borderRadius:12, padding:'1.25rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ fontSize:40, fontWeight:700, color:VERDE }}>{totalUsuarios}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#2C2C2A' }}>Usuários ativos atendidos</div>
                <div style={{ fontSize:12, color:'#5F5E5A' }}>Pessoas beneficiadas diretamente pelos projetos da CAPETTE</div>
              </div>
            </div>

            {projetos.length === 0 ? (
              <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>Nenhum projeto ativo cadastrado.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
                {projetos.map(p => (
                  <div key={p.id} style={{ background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', overflow:'hidden' }}>
                    <div style={{ background:`linear-gradient(135deg, ${VERDE}15, ${AZUL}08)`, padding:'14px 16px', borderBottom:'0.5px solid #E0DDD5' }}>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{p.tipo||'Projeto institucional'}</div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#2C2C2A' }}>{p.nome}</div>
                    </div>
                    <div style={{ padding:'12px 16px' }}>
                      {p.descricao_curta && <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:10, lineHeight:1.6 }}>{p.descricao_curta}</div>}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                        {[
                          ['Público-alvo', p.publico_alvo],
                          ['Faixa etária', p.faixa_etaria],
                          ['Capacidade', p.capacidade_prevista],
                          ['Funcionamento', p.funcionamento],
                        ].filter(([,v])=>v).map(([l,v]) => (
                          <div key={l} style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                            <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>{l}</div>
                            <div style={{ fontSize:11 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop:8 }}>
                        <span style={s.badge('#EAF3DE','#3B6D11')}>{p.situacao}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== ABA PARCERIAS ===== */}
        {aba === 'parcerias' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Parcerias, Emendas e Editais</div>
            <div style={{ fontSize:12, color:'#888780', marginBottom:'1.25rem' }}>
              Instrumentos formais em execução — emendas parlamentares, editais, termos de fomento, convênios e parcerias institucionais.
            </div>
            {parcerias.length === 0 ? (
              <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>Nenhuma parceria ativa no momento.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
                {parcerias.map(p => {
                  const [bg,cor] = SIT_COR[p.situacao]||['#F1EFE8','#888780']
                  return (
                    <div key={p.id} style={{ background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', overflow:'hidden' }}>
                      <div style={{ background:`${LARANJA}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{TIPO_LABEL[p.tipo]||p.tipo}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A' }}>{p.nome_projeto}</div>
                          {p.parlamentar && <div style={{ fontSize:11, color:'#888780' }}>{p.parlamentar}</div>}
                        </div>
                        <span style={s.badge(bg,cor)}>{p.situacao}</span>
                      </div>
                      <div style={{ padding:'12px 16px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:8 }}>
                          {[
                            ['Órgão concedente', p.orgao_concedente],
                            ['Valor aprovado', p.valor_aprovado ? fmt(p.valor_aprovado) : null],
                            ['Vigência', p.vigencia_inicio ? `${fmtData(p.vigencia_inicio)} a ${fmtData(p.vigencia_fim)}` : null],
                            ['Nº do termo', p.num_termo],
                          ].filter(([,v])=>v).map(([l,v]) => (
                            <div key={l} style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                              <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>{l}</div>
                              <div style={{ fontSize:11, fontWeight:500 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {p.objeto && <div style={{ fontSize:11, color:'#5F5E5A', lineHeight:1.6 }}>{p.objeto}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== ABA FINANCEIRO ===== */}
        {aba === 'financeiro' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:'.85rem' }}>Informações Financeiras</div>
            <div style={{ display:'flex', gap:10, marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'flex-end' }}>
              <div>
                <div style={{ fontSize:11, color:'#888780', marginBottom:3 }}>Mês</div>
                <input type="month" value={mes} onChange={e=>setMes(e.target.value)}
                  style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }} />
              </div>
              <div>
                <div style={{ fontSize:11, color:'#888780', marginBottom:3 }}>Ano</div>
                <select value={ano} onChange={e=>setAno(e.target.value)}
                  style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
                  {anos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Resumo anual por mês */}
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Resumo mensal — {ano}</div>
              {loading ? <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div> : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Mês','Entradas','Saídas','Resultado'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {Array.from({length:12},(_,i) => {
                      const m = String(i+1).padStart(2,'0')
                      const mesStr = `${ano}-${m}`
                      const movsM = movs.filter(x => x.data?.startsWith(mesStr))
                      const ent = movsM.filter(x=>Number(x.valor)>0).reduce((a,x)=>a+Number(x.valor),0)
                      const sai = Math.abs(movsM.filter(x=>Number(x.valor)<0).reduce((a,x)=>a+Number(x.valor),0))
                      const res = ent - sai
                      if (ent===0&&sai===0) return null
                      const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
                      return (
                        <tr key={m}>
                          <td style={{ ...s.td, fontWeight:500 }}>{nomes[i]}/{ano}</td>
                          <td style={{ ...s.td, color:VERDE }}>{fmt(ent)}</td>
                          <td style={{ ...s.td, color:VERMELHO }}>{fmt(sai)}</td>
                          <td style={{ ...s.td, color:res>=0?AZUL:VERMELHO, fontWeight:500 }}>{fmt(res)}</td>
                        </tr>
                      )
                    })}
                    <tr style={{ background:'#F8F7F2', fontWeight:700 }}>
                      <td style={s.td}>TOTAL {ano}</td>
                      <td style={{ ...s.td, color:VERDE, fontWeight:700 }}>{fmt(resumo.entAno)}</td>
                      <td style={{ ...s.td, color:VERMELHO, fontWeight:700 }}>{fmt(resumo.saiAno)}</td>
                      <td style={{ ...s.td, color:(resumo.entAno-resumo.saiAno)>=0?AZUL:VERMELHO, fontWeight:700 }}>{fmt(resumo.entAno-resumo.saiAno)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Resumo por categoria */}
            {(() => {
              const entradas = movs.filter(m => Number(m.valor) > 0)
              const saidas = movs.filter(m => Number(m.valor) < 0)

              const agrupar = (lista) => {
                const mapa = {}
                lista.forEach(m => {
                  const cat = m.categoria?.nome || 'Sem categoria'
                  mapa[cat] = (mapa[cat] || 0) + Math.abs(Number(m.valor))
                })
                return Object.entries(mapa).sort((a,b) => b[1]-a[1])
              }

              const grpEnt = agrupar(entradas)
              const grpSai = agrupar(saidas)
              const totalEnt = entradas.reduce((a,m)=>a+Number(m.valor),0)
              const totalSai = Math.abs(saidas.reduce((a,m)=>a+Number(m.valor),0))

              return (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {/* Entradas por categoria */}
                  <div style={s.card}>
                    <div style={{ fontSize:13, fontWeight:500, color:VERDE, marginBottom:'.85rem' }}>
                      Entradas por categoria — {ano}
                    </div>
                    {grpEnt.length === 0 ? (
                      <div style={{ fontSize:12, color:'#888780', textAlign:'center', padding:'1rem' }}>Nenhuma entrada registrada.</div>
                    ) : (
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead><tr>
                          <th style={s.th}>Categoria</th>
                          <th style={{ ...s.th, textAlign:'right' }}>Total</th>
                          <th style={{ ...s.th, textAlign:'right' }}>%</th>
                        </tr></thead>
                        <tbody>
                          {grpEnt.map(([cat, val]) => (
                            <tr key={cat}>
                              <td style={s.td}>{cat}</td>
                              <td style={{ ...s.td, color:VERDE, fontWeight:500, textAlign:'right' }}>{fmt(val)}</td>
                              <td style={{ ...s.td, color:'#888780', textAlign:'right' }}>
                                {totalEnt > 0 ? Math.round((val/totalEnt)*100) : 0}%
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background:'#F2FAE8', fontWeight:700 }}>
                            <td style={s.td}>Total entradas</td>
                            <td style={{ ...s.td, color:VERDE, fontWeight:700, textAlign:'right' }}>{fmt(totalEnt)}</td>
                            <td style={{ ...s.td, textAlign:'right' }}>100%</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Saídas por categoria */}
                  <div style={s.card}>
                    <div style={{ fontSize:13, fontWeight:500, color:VERMELHO, marginBottom:'.85rem' }}>
                      Despesas por categoria — {ano}
                    </div>
                    {grpSai.length === 0 ? (
                      <div style={{ fontSize:12, color:'#888780', textAlign:'center', padding:'1rem' }}>Nenhuma despesa registrada.</div>
                    ) : (
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead><tr>
                          <th style={s.th}>Categoria</th>
                          <th style={{ ...s.th, textAlign:'right' }}>Total</th>
                          <th style={{ ...s.th, textAlign:'right' }}>%</th>
                        </tr></thead>
                        <tbody>
                          {grpSai.map(([cat, val]) => (
                            <tr key={cat}>
                              <td style={s.td}>{cat}</td>
                              <td style={{ ...s.td, color:VERMELHO, fontWeight:500, textAlign:'right' }}>{fmt(val)}</td>
                              <td style={{ ...s.td, color:'#888780', textAlign:'right' }}>
                                {totalSai > 0 ? Math.round((val/totalSai)*100) : 0}%
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background:'#FEF2F2', fontWeight:700 }}>
                            <td style={s.td}>Total despesas</td>
                            <td style={{ ...s.td, color:VERMELHO, fontWeight:700, textAlign:'right' }}>{fmt(totalSai)}</td>
                            <td style={{ ...s.td, textAlign:'right' }}>100%</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )
            })()}

            <div style={{ background:'#EAF3DE', border:'0.5px solid #C0DD97', borderRadius:10, padding:'.85rem 1rem', fontSize:11, color:'#3B6D11', lineHeight:1.8 }}>
              <strong style={{ fontSize:12, display:'block', marginBottom:4 }}>Base legal da transparência</strong>
              Informações publicadas para fins de transparência, controle social e prestação de contas, observadas a <strong>Lei nº 13.019/2014 — MROSC</strong>, <strong>Lei Complementar nº 187/2021 — CEBAS</strong>, <strong>Decreto nº 11.791/2023</strong> e <strong>Portaria MDS nº 952/2023</strong>.
            </div>
          </>
        )}

        {/* ===== ABA DOCUMENTOS ===== */}
        {aba === 'documentos' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Documentos e Relatórios</div>
            <div style={{ fontSize:12, color:'#888780', marginBottom:'1.25rem' }}>
              Documentos institucionais, prestações de contas, relatórios anuais e certidões disponíveis para consulta pública.
            </div>
            {documentos.length === 0 ? (
              <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
                <div style={{ marginBottom:8 }}><i className="ti ti-file" style={{fontSize:32, color:'#C8C6BC'}} /></div>
                <div>Nenhum documento publicado ainda.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
                {documentos.map(doc => (
                  <a key={doc.id} href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                    style={{ display:'block', background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:12, boxShadow:'0 1px 8px rgba(0,0,0,0.04)', padding:'1rem', textDecoration:'none' }}>
                    <div style={{ fontSize:28, marginBottom:8 }}><i className="ti ti-file" style={{fontSize:14}} /></div>
                    <div style={{ fontSize:12, fontWeight:500, color:'#2C2C2A', marginBottom:3 }}>{doc.titulo}</div>
                    {doc.descricao && <div style={{ fontSize:11, color:'#888780', marginBottom:8 }}>{doc.descricao}</div>}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={s.badge('#E6F1FB','#185FA5')}>{doc.categoria}</span>
                      <span style={{ fontSize:11, color:AZUL, fontWeight:500 }}>Abrir →</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== ABA QUEM SOMOS ===== */}
        {aba === 'quem-somos' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:'1.25rem' }}>Quem somos</div>

            {/* Dados institucionais */}
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Dados institucionais</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
                {[
                  ['Nome completo', instituicao?.nome_completo],
                  ['Nome fantasia', instituicao?.nome_fantasia],
                  ['CNPJ', instituicao?.cnpj],
                  ['Endereço', instituicao?.endereco],
                  ['Telefone', instituicao?.telefone],
                  ['E-mail', instituicao?.email],
                  ['Site', instituicao?.site],
                ].filter(([,v])=>v).map(([l,v]) => (
                  <div key={l} style={{ background:'#F8F7F2', borderRadius:8, padding:'7px 10px' }}>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{l}</div>
                    <div style={{ fontSize:12, fontWeight:500, wordBreak:'break-word' }}>{v}</div>
                  </div>
                ))}
              </div>
              {instituicao?.missao && (
                <div style={{ marginTop:10, background:'#F8F7F2', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#888780', marginBottom:3 }}>Missão</div>
                  <div style={{ fontSize:12, lineHeight:1.7 }}>{instituicao.missao}</div>
                </div>
              )}
            </div>

            {/* Diretoria */}
            {diretoria.length > 0 && (
              <div style={s.card}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Diretoria atual</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8 }}>
                  {diretoria.map(d => (
                    <div key={d.id} style={{ background:'#F8F7F2', borderRadius:8, padding:'8px 10px', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:99, background:`${VERDE}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:VERDE, flexShrink:0 }}>
                        {d.nome?.charAt(0)||'?'}
                      </div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:500 }}>{d.nome}</div>
                        <div style={{ fontSize:10, color:'#888780' }}>{d.cargo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Rodapé */}
      <div style={{ background:'rgba(255,255,255,0.85)', borderTop:'0.5px solid #E8E6DE', padding:'1rem 1.5rem', marginTop:'2rem' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo.png" alt="Logo" style={{ height:22, width:'auto', objectFit:'contain', maxWidth:100 }}
              onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
            <div style={{ display:'none', gap:2 }}>
              {LOGO.map(([l,c]) => <span key={l+c} style={{ fontSize:13, fontWeight:700, color:c }}>{l}</span>)}
            </div>
          </div>
          <div style={{ fontSize:11, color:'#B4B2A9', textAlign:'center' }}>
            {instituicao?.nome_completo || 'Casa do Pequeno Trabalhador de Teresópolis'}<br />
            CNPJ {instituicao?.cnpj || '29.213.717/0001-01'} · Teresópolis — RJ
          </div>
          <div style={{ fontSize:10, color:'#C8C6BC' }}>
            Desenvolvido por Agendo · CNPJ 56.059.476/0001-52
          </div>
        </div>
      </div>
    </div>
  )
}
