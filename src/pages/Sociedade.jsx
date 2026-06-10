import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'
const LOGO = [['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']]

const ORDEM_CARGOS = [
  'Presidente','Vice-presidente','1º Tesoureiro','2º Tesoureiro',
  '1º Secretário','2º Secretário','Diretora Pedagógica','Gerente Administrativo',
  'Assistente Social','Presidente Conselho Deliberativo','Vice-Presidente Conselho Deliberativo',
  '1º Membro Conselho Deliberativo','2º Membro Conselho Deliberativo','3º Membro Conselho Deliberativo',
  'Suplente Conselho Deliberativo','2º Suplente Conselho Deliberativo',
  '1º Membro Conselho Fiscal','2º Membro Conselho Fiscal','Suplente Conselho Fiscal',
]
const TIPO_LABEL = { emenda:'Emenda Parlamentar', edital:'Edital', fomento:'Termo de Fomento', colaboracao:'Termo de Colaboração', convenio:'Convênio', parceria:'Parceria', outro:'Outro' }

const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function Sociedade() {
  const [aba, setAba] = useState('inicio')
  const [periodo, setPeriodo] = useState('ano') // 'mes' ou 'ano'
  const [mesSel, setMesSel] = useState(new Date().toISOString().slice(0,7))
  const [anoSel, setAnoSel] = useState(new Date().getFullYear().toString())
  const [resumo, setResumo] = useState({ ent:0, sai:0, saldo:0 })
  const [movs, setMovs] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [instituicao, setInstituicao] = useState(null)
  const [diretoria, setDiretoria] = useState([])
  const [parcerias, setParcerias] = useState([])
  const [projetos, setProjetos] = useState([])
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [loading, setLoading] = useState(true)

  const anos = []
  for (let y = new Date().getFullYear(); y >= 2023; y--) anos.push(String(y))

  useEffect(() => { carregarEstaticos() }, [])
  useEffect(() => { carregarFinanceiro() }, [periodo, mesSel, anoSel])

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
    const dirData = (dir.data || []).sort((a,b) => {
      const ia = ORDEM_CARGOS.indexOf(a.cargo), ib = ORDEM_CARGOS.indexOf(b.cargo)
      if (ia===-1&&ib===-1) return a.cargo.localeCompare(b.cargo)
      if (ia===-1) return 1; if (ib===-1) return -1; return ia-ib
    })
    setDiretoria(dirData)
    setParcerias(parc.data || [])
    setProjetos(proj.data || [])
    setTotalUsuarios(users.count || 0)
    setDocumentos(docs.data || [])
  }

  async function carregarFinanceiro() {
    setLoading(true)
    let inicio, fim
    if (periodo === 'mes') {
      const [y,m] = mesSel.split('-')
      const ult = new Date(parseInt(y), parseInt(m), 0).getDate()
      inicio = `${mesSel}-01`; fim = `${mesSel}-${String(ult).padStart(2,'0')}`
    } else {
      inicio = `${anoSel}-01-01`; fim = `${anoSel}-12-31`
    }
    const { data: movData } = await supabase.from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo)')
      .gte('data', inicio).lte('data', fim).order('data', { ascending:false })
    const lista = movData || []
    const ent = lista.filter(m=>Number(m.valor)>0).reduce((a,m)=>a+Number(m.valor),0)
    const sai = Math.abs(lista.filter(m=>Number(m.valor)<0).reduce((a,m)=>a+Number(m.valor),0))
    setResumo({ ent, sai, saldo: ent-sai })
    setMovs(lista)
    setLoading(false)
  }

  const fmt = v => 'R$ '+Math.abs(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const periodoLabel = periodo==='mes'
    ? new Date(mesSel+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
    : `ano de ${anoSel}`

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12 },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    tab: ativo => ({ padding:'8px 18px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?VERDE:'#D3D1C7'}`, background:ativo?VERDE:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer', whiteSpace:'nowrap', fontWeight:ativo?500:400 }),
  }

  const ABAS = [
    { id:'inicio', icon:'🏠', label:'Início' },
    { id:'financeiro', icon:'📊', label:'Financeiro' },
    { id:'projetos', icon:'🎯', label:'Projetos' },
    { id:'parcerias', icon:'🤝', label:'Parcerias' },
    { id:'documentos', icon:'📄', label:'Documentos' },
    { id:'quem-somos', icon:'👥', label:'Quem somos' },
  ]

  // Filtro de período — reutilizável
  const FiltroPeriodo = () => (
    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:'1.25rem' }}>
      <div style={{ display:'flex', borderRadius:8, border:'0.5px solid #D3D1C7', overflow:'hidden' }}>
        <button onClick={() => setPeriodo('mes')} style={{ padding:'6px 14px', fontSize:12, border:'none', background:periodo==='mes'?AZUL:'#fff', color:periodo==='mes'?'#fff':'#5F5E5A', cursor:'pointer' }}>Por mês</button>
        <button onClick={() => setPeriodo('ano')} style={{ padding:'6px 14px', fontSize:12, border:'none', background:periodo==='ano'?AZUL:'#fff', color:periodo==='ano'?'#fff':'#5F5E5A', cursor:'pointer', borderLeft:'0.5px solid #D3D1C7' }}>Por ano</button>
      </div>
      {periodo==='mes' ? (
        <input type="month" value={mesSel} onChange={e=>setMesSel(e.target.value)}
          style={{ fontSize:12, padding:'6px 10px', border:'0.5px solid #D3D1C7', borderRadius:8 }} />
      ) : (
        <select value={anoSel} onChange={e=>setAnoSel(e.target.value)}
          style={{ fontSize:12, padding:'6px 10px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      )}
      <span style={{ fontSize:12, color:'#888780' }}>
        {loading ? '⏳ Carregando...' : `Exibindo dados de ${periodoLabel}`}
      </span>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#F8F7F2' }}>

      {/* Cabeçalho */}
      <div style={{ background:'#fff', borderBottom:'3px solid '+VERDE, padding:'1rem 1.5rem' }}>
        <div style={{ maxWidth:1060, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <img src="/logo.png" alt="CAPETTE" style={{ height:44, width:'auto', objectFit:'contain' }}
              onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
            <div style={{ display:'none', gap:2, alignItems:'center' }}>
              {LOGO.map(([l,c]) => <span key={l+c} style={{ fontSize:18, fontWeight:700, color:c }}>{l}</span>)}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#2C2C2A' }}>Portal de Transparência Pública</div>
              <div style={{ fontSize:11, color:'#888780' }}>
                {instituicao?.nome_completo || 'Casa do Pequeno Trabalhador de Teresópolis'} · CNPJ {instituicao?.cnpj || '29.213.717/0001-01'}
              </div>
            </div>
          </div>
          <a href="/login" style={{ fontSize:11, color:AZUL, textDecoration:'none', padding:'5px 12px', border:`0.5px solid ${AZUL}`, borderRadius:8 }}>← Área interna</a>
        </div>
      </div>

      {/* Navegação */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid #E0DDD5', padding:'.5rem 1.5rem' }}>
        <div style={{ maxWidth:1060, margin:'0 auto', display:'flex', gap:4, flexWrap:'wrap' }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={s.tab(aba===a.id)}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1060, margin:'0 auto', padding:'1.5rem 1rem 3rem' }}>

        {/* ===== INÍCIO ===== */}
        {aba === 'inicio' && (
          <>
            {/* Hero */}
            <div style={{ background:`linear-gradient(135deg, ${VERDE}15, ${AZUL}10)`, border:`0.5px solid ${VERDE}40`, borderRadius:16, padding:'2rem', marginBottom:'1.5rem' }}>
              <div style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start' }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:11, color:VERDE, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Organização da Sociedade Civil · Desde 1974</div>
                  <div style={{ fontSize:22, fontWeight:700, color:'#2C2C2A', marginBottom:8 }}>
                    {instituicao?.nome_fantasia || 'CAPETTE'}
                  </div>
                  <div style={{ fontSize:13, color:'#5F5E5A', lineHeight:1.7, marginBottom:14 }}>
                    {instituicao?.missao || 'A CAPETTE atua há mais de 50 anos na promoção e defesa dos direitos de crianças, adolescentes e famílias em situação de vulnerabilidade social em Teresópolis, RJ.'}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {[instituicao?.endereco&&`📍 ${instituicao.endereco}`, instituicao?.telefone&&`📞 ${instituicao.telefone}`, instituicao?.email&&`✉ ${instituicao.email}`].filter(Boolean).map((info,i) => (
                      <span key={i} style={{ fontSize:11, color:'#5F5E5A', padding:'3px 10px', background:'rgba(255,255,255,0.8)', borderRadius:99, border:'0.5px solid #E0DDD5' }}>{info}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, minWidth:220 }}>
                  {[
                    { label:'Anos de atuação', val:'50+', cor:VERDE },
                    { label:'Usuários ativos', val:totalUsuarios, cor:AZUL },
                    { label:'Projetos ativos', val:projetos.length, cor:LARANJA },
                    { label:'Parcerias ativas', val:parcerias.length, cor:'#8B2FC9' },
                  ].map(m => (
                    <div key={m.label} style={{ background:'rgba(255,255,255,0.9)', borderRadius:10, padding:'.85rem', textAlign:'center' }}>
                      <div style={{ fontSize:24, fontWeight:700, color:m.cor }}>{m.val}</div>
                      <div style={{ fontSize:10, color:'#888780', marginTop:2 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumo financeiro rápido */}
            <FiltroPeriodo />
            {(resumo.ent > 0 || resumo.sai > 0) && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:'1.5rem' }}>
              {[
                { label:'Entradas', val:fmt(resumo.ent), cor:VERDE, icon:'↑' },
                { label:'Saídas', val:fmt(resumo.sai), cor:VERMELHO, icon:'↓' },
                { label:'Resultado', val:fmt(resumo.saldo), cor:resumo.saldo>=0?AZUL:VERMELHO, icon:'=' },
              ].map(m => (
                <div key={m.label} style={{ background:'#fff', borderRadius:12, padding:'1rem', border:'0.5px solid #E0DDD5', textAlign:'center' }}>
                  <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{m.icon} {m.label} — {periodoLabel}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:m.cor }}>{m.val}</div>
                </div>
              ))}
            </div>
            )}

            {/* Atalhos */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, marginBottom:'1.5rem' }}>
              {[
                { id:'financeiro', icon:'📊', label:'Ver financeiro completo', cor:VERDE },
                { id:'projetos', icon:'🎯', label:'Projetos e serviços', cor:AZUL },
                { id:'parcerias', icon:'🤝', label:'Parcerias e emendas', cor:LARANJA },
                { id:'documentos', icon:'📄', label:'Documentos públicos', cor:'#8B2FC9' },
                { id:'quem-somos', icon:'👥', label:'Quem somos', cor:'#5F5E5A' },
              ].map(a => (
                <button key={a.id} onClick={() => setAba(a.id)}
                  style={{ background:'#fff', border:`0.5px solid ${a.cor}30`, borderRadius:10, padding:'1rem', textAlign:'center', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background=`${a.cor}08`}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{a.icon}</div>
                  <div style={{ fontSize:11, color:'#5F5E5A' }}>{a.label}</div>
                </button>
              ))}
            </div>

            {/* Base legal */}
            <div style={{ background:'#EAF3DE', border:'0.5px solid #C0DD97', borderRadius:10, padding:'.85rem 1rem', fontSize:11, color:'#3B6D11', lineHeight:1.8 }}>
              <strong style={{ fontSize:12, display:'block', marginBottom:4 }}>Base legal da transparência</strong>
              Informações publicadas em observância à <strong>Lei nº 13.019/2014 — MROSC</strong>, <strong>LC nº 187/2021 — CEBAS</strong>, <strong>Decreto nº 11.791/2023</strong>, <strong>Portaria MDS nº 952/2023</strong> e LGPD.
            </div>
          </>
        )}

        {/* ===== FINANCEIRO ===== */}
        {aba === 'financeiro' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Informações Financeiras</div>
            <div style={{ fontSize:12, color:'#888780', marginBottom:'1.25rem' }}>Receitas e despesas com transparência e clareza.</div>

            <FiltroPeriodo />

            {/* Cards resumo */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:'1.25rem' }}>
              {[
                { label:'Entradas', val:fmt(resumo.ent), cor:VERDE },
                { label:'Saídas', val:fmt(resumo.sai), cor:VERMELHO },
                { label:'Resultado', val:fmt(resumo.saldo), cor:resumo.saldo>=0?AZUL:VERMELHO },
              ].map(m => (
                <div key={m.label} style={{ background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'0.5px solid #E0DDD5' }}>
                  <div style={{ height:3, borderRadius:99, background:m.cor, marginBottom:'.7rem' }} />
                  <div style={{ fontSize:11, color:'#888780', marginBottom:3 }}>{m.label} — {periodoLabel}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:m.cor }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Por mês (só quando filtro = ano) */}
            {periodo === 'ano' && (
              <div style={s.card}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Mês a mês — {anoSel}</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Mês','Entradas','Saídas','Resultado'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {MESES_NOMES.map((nome,i) => {
                      const m = String(i+1).padStart(2,'0')
                      const movsM = movs.filter(x => x.data?.startsWith(`${anoSel}-${m}`))
                      const ent = movsM.filter(x=>Number(x.valor)>0).reduce((a,x)=>a+Number(x.valor),0)
                      const sai = Math.abs(movsM.filter(x=>Number(x.valor)<0).reduce((a,x)=>a+Number(x.valor),0))
                      if (ent===0&&sai===0) return null
                      return (
                        <tr key={m} style={{ cursor:'pointer' }} onClick={() => { setPeriodo('mes'); setMesSel(`${anoSel}-${m}`) }}>
                          <td style={{ ...s.td, fontWeight:500, color:AZUL }}>{nome}/{anoSel} →</td>
                          <td style={{ ...s.td, color:VERDE }}>{fmt(ent)}</td>
                          <td style={{ ...s.td, color:VERMELHO }}>{fmt(sai)}</td>
                          <td style={{ ...s.td, color:(ent-sai)>=0?AZUL:VERMELHO, fontWeight:500 }}>{fmt(ent-sai)}</td>
                        </tr>
                      )
                    })}
                    <tr style={{ background:'#F8F7F2', fontWeight:700 }}>
                      <td style={s.td}>TOTAL {anoSel}</td>
                      <td style={{ ...s.td, color:VERDE, fontWeight:700 }}>{fmt(resumo.ent)}</td>
                      <td style={{ ...s.td, color:VERMELHO, fontWeight:700 }}>{fmt(resumo.sai)}</td>
                      <td style={{ ...s.td, color:resumo.saldo>=0?AZUL:VERMELHO, fontWeight:700 }}>{fmt(resumo.saldo)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Por categoria */}
            {(() => {
              const entradas = movs.filter(m=>Number(m.valor)>0)
              const saidas = movs.filter(m=>Number(m.valor)<0)
              const agrupar = lista => {
                const mapa = {}
                lista.forEach(m => { const cat=m.categoria?.nome||'Sem categoria'; mapa[cat]=(mapa[cat]||0)+Math.abs(Number(m.valor)) })
                return Object.entries(mapa).sort((a,b)=>b[1]-a[1])
              }
              const grpEnt = agrupar(entradas), grpSai = agrupar(saidas)
              const totEnt = entradas.reduce((a,m)=>a+Number(m.valor),0)
              const totSai = Math.abs(saidas.reduce((a,m)=>a+Number(m.valor),0))
              return (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1.25rem' }}>
                  <div style={s.card}>
                    <div style={{ fontSize:12, fontWeight:600, color:VERDE, marginBottom:'.85rem' }}>▲ Entradas por categoria</div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead><tr>{['Categoria','Total','%'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {grpEnt.map(([cat,val]) => (
                          <tr key={cat}>
                            <td style={s.td}>{cat}</td>
                            <td style={{ ...s.td, color:VERDE, fontWeight:500 }}>{fmt(val)}</td>
                            <td style={{ ...s.td, color:'#888780' }}>{totEnt>0?Math.round(val/totEnt*100):0}%</td>
                          </tr>
                        ))}
                        <tr style={{ background:'#F2FAE8', fontWeight:700 }}>
                          <td style={s.td}>Total</td>
                          <td style={{ ...s.td, color:VERDE, fontWeight:700 }}>{fmt(totEnt)}</td>
                          <td style={{ ...s.td }}>100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={s.card}>
                    <div style={{ fontSize:12, fontWeight:600, color:VERMELHO, marginBottom:'.85rem' }}>▼ Despesas por categoria</div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead><tr>{['Categoria','Total','%'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {grpSai.map(([cat,val]) => (
                          <tr key={cat}>
                            <td style={s.td}>{cat}</td>
                            <td style={{ ...s.td, color:VERMELHO, fontWeight:500 }}>{fmt(val)}</td>
                            <td style={{ ...s.td, color:'#888780' }}>{totSai>0?Math.round(val/totSai*100):0}%</td>
                          </tr>
                        ))}
                        <tr style={{ background:'#FEF2F2', fontWeight:700 }}>
                          <td style={s.td}>Total</td>
                          <td style={{ ...s.td, color:VERMELHO, fontWeight:700 }}>{fmt(totSai)}</td>
                          <td style={{ ...s.td }}>100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </>
        )}

        {/* ===== PROJETOS ===== */}
        {aba === 'projetos' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Projetos e Serviços</div>
            <div style={{ fontSize:12, color:'#888780', marginBottom:'1.25rem' }}>Ações executadas pela CAPETTE em prol da comunidade de Teresópolis.</div>
            <div style={{ background:`linear-gradient(135deg, ${VERDE}15, ${VERDE}05)`, border:`0.5px solid ${VERDE}40`, borderRadius:12, padding:'1.25rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ fontSize:40, fontWeight:700, color:VERDE }}>{totalUsuarios}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>Usuários ativos atendidos</div>
                <div style={{ fontSize:12, color:'#5F5E5A' }}>Pessoas beneficiadas diretamente pelos projetos da CAPETTE</div>
              </div>
            </div>
            {projetos.length === 0 ? (
              <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>Nenhum projeto ativo cadastrado.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
                {projetos.map(p => (
                  <div key={p.id} style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ background:`linear-gradient(135deg, ${VERDE}15, ${AZUL}08)`, padding:'14px 16px', borderBottom:'0.5px solid #E0DDD5' }}>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{p.tipo||'Projeto institucional'}</div>
                      <div style={{ fontSize:14, fontWeight:600 }}>{p.nome}</div>
                    </div>
                    <div style={{ padding:'12px 16px' }}>
                      {p.descricao_curta && <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:10, lineHeight:1.6 }}>{p.descricao_curta}</div>}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                        {[['Público-alvo',p.publico_alvo],['Faixa etária',p.faixa_etaria],['Capacidade',p.capacidade_prevista],['Funcionamento',p.funcionamento]].filter(([,v])=>v).map(([l,v]) => (
                          <div key={l} style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                            <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>{l}</div>
                            <div style={{ fontSize:11 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== PARCERIAS ===== */}
        {aba === 'parcerias' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Parcerias, Emendas e Editais</div>
            <div style={{ fontSize:12, color:'#888780', marginBottom:'1.25rem' }}>Instrumentos formais em execução com a Administração Pública.</div>
            {parcerias.length === 0 ? (
              <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>Nenhuma parceria ativa no momento.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
                {parcerias.map(p => {
                  const cor = p.situacao==='em execução' ? ['#FAEEDA','#854F0B'] : ['#EAF3DE','#3B6D11']
                  return (
                    <div key={p.id} style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, overflow:'hidden' }}>
                      <div style={{ background:`${LARANJA}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{TIPO_LABEL[p.tipo]||p.tipo}</div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{p.nome_projeto}</div>
                          {p.parlamentar && <div style={{ fontSize:11, color:'#888780' }}>{p.parlamentar}</div>}
                        </div>
                        <span style={{ ...s.badge(...cor), marginLeft:8 }}>{p.situacao}</span>
                      </div>
                      <div style={{ padding:'12px 16px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:8 }}>
                          {[['Órgão concedente',p.orgao_concedente],['Valor aprovado',p.valor_aprovado?fmt(p.valor_aprovado):null],['Vigência',p.vigencia_inicio?`${fmtData(p.vigencia_inicio)} a ${fmtData(p.vigencia_fim)}`:null],['Nº do termo',p.num_termo]].filter(([,v])=>v).map(([l,v]) => (
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

        {/* ===== DOCUMENTOS ===== */}
        {aba === 'documentos' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Documentos Públicos</div>
            <div style={{ fontSize:12, color:'#888780', marginBottom:'1.25rem' }}>Documentos institucionais, prestações de contas, relatórios e certidões.</div>
            {documentos.length === 0 ? (
              <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
                <div>Nenhum documento publicado ainda.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
                {documentos.map(doc => (
                  <a key={doc.id} href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                    style={{ display:'block', background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:10, padding:'1rem', textDecoration:'none' }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
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

        {/* ===== QUEM SOMOS ===== */}
        {aba === 'quem-somos' && (
          <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:'1.25rem' }}>Quem somos</div>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Dados institucionais</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
                {[['Nome completo',instituicao?.nome_completo],['Nome fantasia',instituicao?.nome_fantasia],['CNPJ',instituicao?.cnpj],['Endereço',instituicao?.endereco],['Telefone',instituicao?.telefone],['E-mail',instituicao?.email],['Site',instituicao?.site]].filter(([,v])=>v).map(([l,v]) => (
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
      <div style={{ background:'#2C2C2A', padding:'1.25rem 1.5rem' }}>
        <div style={{ maxWidth:1060, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', gap:3, alignItems:'center' }}>
            {LOGO.map(([l,c]) => <span key={l+c} style={{ fontSize:16, fontWeight:700, color:c }}>{l}</span>)}
          </div>
          <div style={{ fontSize:11, color:'#888780', textAlign:'center' }}>
            {instituicao?.nome_completo || 'Casa do Pequeno Trabalhador de Teresópolis'}<br />
            CNPJ {instituicao?.cnpj || '29.213.717/0001-01'} · Teresópolis — RJ
          </div>
          <div style={{ fontSize:11, color:'#888780' }}>AGENDO Integra · Portal de Transparência</div>
        </div>
      </div>
    </div>
  )
}
