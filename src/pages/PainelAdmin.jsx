import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', ROXO = '#8B2FC9', LARANJA = '#F4821F'

export default function PainelAdmin() {
  const navigate = useNavigate()
  const [resumoGeral, setResumoGeral] = useState({ entradas: 0, saidas: 0, saldo: 0 })
  const [parcerias, setParcerias] = useState([])
  const [contas, setContas] = useState([])
  const [ultimoExtrato, setUltimoExtrato] = useState(null)
  const [mes, setMes] = useState('')
  const [loading, setLoading] = useState(true)
  const carregado = useRef(false)
  const [instituicao, setInstituicao] = useState(null)
  const [presidente, setPresidente] = useState(null)
  const [totalFuncionarios, setTotalFuncionarios] = useState(0)
  const [totalCobrancas, setTotalCobrancas] = useState(0)

  useEffect(() => {
    if (carregado.current) return
    carregado.current = true
    inicializar()
  }, [])
  useEffect(() => { if (mes) carregarResumo() }, [mes])

  async function inicializar() {
    // Último extrato
    const { data: ext } = await supabase.from('extratos').select('competencia').order('competencia', { ascending: false }).limit(1)
    const mesAtual = new Date().toISOString().slice(0, 7)
    const mesUso = ext?.length ? ext[0].competencia : mesAtual
    setUltimoExtrato(mesUso)
    setMes(mesUso)

    // Parcerias
    const { data: parc } = await supabase.from('parcerias').select('*, conta:contas(id,nome,banco,agencia,conta_num)').order('nome_projeto')
    setParcerias(parc || [])

    // Contas
    const { data: contsData } = await supabase.from('contas').select('*').order('nome')
    setContas(contsData || [])

    // Instituição
    const { data: inst } = await supabase.from('instituicao').select('*').limit(1).single()
    setInstituicao(inst)

    // Presidente atual
    const hoje = new Date().toISOString().slice(0,10)
    const { data: pres } = await supabase.from('diretoria').select('nome,cargo,mandato_fim').eq('cargo','Presidente').eq('ativo',true).gte('mandato_fim', hoje).limit(1).single()
    setPresidente(pres)

    // Funcionários ativos
    const { count: funcCount } = await supabase.from('funcionarios').select('id', { count: 'exact' }).eq('status','ativo')
    setTotalFuncionarios(funcCount || 0)

    // Cobranças pendentes
    const { count: cobCount } = await supabase.from('cobrancas').select('id', { count: 'exact' }).eq('pago_confirmado', false)
    setTotalCobrancas(cobCount || 0)

    setLoading(false)
  }

  async function carregarResumo() {
    const { data: movs } = await supabase.from('extrato_movs').select('valor').gte('data', mes + '-01').lte('data', mes + '-31')
    const lista = movs || []
    const ent = lista.filter(m => Number(m.valor) > 0).reduce((a,m) => a + Number(m.valor), 0)
    const sai = Math.abs(lista.filter(m => Number(m.valor) < 0).reduce((a,m) => a + Number(m.valor), 0))
    setResumoGeral({ entradas: ent, saidas: sai, saldo: ent - sai })
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const mesLabel = mes ? new Date(mes+'-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''

  const TIPO_LABEL = { emenda:'Emenda Parlamentar', edital:'Edital', fomento:'Termo de Fomento', colaboracao:'Termo de Colaboração', convenio:'Convênio', projeto:'Projeto Específico' }
  const SITUACAO_COR = { 'em execução': ['#EAF3DE','#3B6D11'], 'prestação pendente': ['#FAEEDA','#854F0B'], 'encerrada': ['#F1EFE8','#888780'], 'suspensa': ['#FCEBEB','#A32D2D'] }

  const s = {
    card: (cor) => ({
      background: '#fff', borderRadius: 14, border: `1.5px solid ${cor}20`,
      padding: '1.25rem', cursor: 'pointer', transition: 'box-shadow .2s, transform .15s',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    }),
    badge: (bg, cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:`3px solid ${VERDE}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <div style={{ fontSize:13, color:'#888780' }}>Carregando painel...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* Saudação */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#2C2C2A' }}>
          Painel Administrativo
        </div>
        <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>
          {instituicao?.nome_completo || 'CAPETTE'} · {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>

      {/* Filtro de mês */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <span style={{ fontSize:12, color:'#888780' }}>Período:</span>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          style={{ fontSize:12, padding:'5px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }} />
        {ultimoExtrato && ultimoExtrato !== mes && (
          <button onClick={() => setMes(ultimoExtrato)}
            style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:`0.5px solid ${VERDE}`, background:'transparent', color:'#3B6D11', cursor:'pointer' }}>
            Último extrato ({ultimoExtrato})
          </button>
        )}
      </div>

      {/* ===== 3 CARDS PRINCIPAIS ===== */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'1.25rem', marginBottom:'1.75rem' }}>

        {/* CARD 1 — INSTITUIÇÃO */}
        <div style={{ ...s.card(ROXO), borderColor:`${ROXO}30` }}
          onClick={() => navigate('/instituicao')}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${ROXO}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏛️</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#2C2C2A' }}>Instituição</div>
              <div style={{ fontSize:11, color:'#888780' }}>Dados, diretoria e parcerias</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { label:'Presidente', val: presidente?.nome?.split(' ').slice(0,2).join(' ') || '—', cor: ROXO },
              { label:'Mandato até', val: presidente ? fmtData(presidente.mandato_fim) : '—', cor: '#5F5E5A' },
              { label:'Parcerias ativas', val: parcerias.filter(p => p.situacao === 'em execução').length, cor: ROXO },
              { label:'CNPJ', val: instituicao?.cnpj || '—', cor: '#5F5E5A' },
            ].map(item => (
              <div key={item.label} style={{ background:'#F8F7F2', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{item.label}</div>
                <div style={{ fontSize:12, fontWeight:500, color:item.cor, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={e => { e.stopPropagation(); navigate('/instituicao') }}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid ${ROXO}`, background:'transparent', color:ROXO, cursor:'pointer' }}>
              Ver dados
            </button>
            <button onClick={e => { e.stopPropagation(); navigate('/parcerias') }}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'none', background:ROXO, color:'#fff', cursor:'pointer' }}>
              Parcerias →
            </button>
            <button onClick={e => { e.stopPropagation(); navigate('/documentos') }}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>
              Documentos
            </button>
          </div>
        </div>

        {/* CARD 2 — CONTA PRINCIPAL */}
        <div style={{ ...s.card(AZUL), borderColor:`${AZUL}30` }}
          onClick={() => navigate('/conciliacao')}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${AZUL}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏦</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#2C2C2A' }}>Conta Principal</div>
              <div style={{ fontSize:11, color:'#888780' }}>Movimentação geral — {mesLabel}</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
            {[
              { label:'Entradas', val: fmt(resumoGeral.entradas), cor: VERDE },
              { label:'Saídas', val: fmt(resumoGeral.saidas), cor: VERMELHO },
              { label:'Resultado', val: fmt(resumoGeral.saldo), cor: resumoGeral.saldo >= 0 ? AZUL : VERMELHO },
            ].map(item => (
              <div key={item.label} style={{ background:'#F8F7F2', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{item.label}</div>
                <div style={{ fontSize:12, fontWeight:600, color:item.cor }}>{item.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={e => { e.stopPropagation(); navigate('/importar') }}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid ${AZUL}`, background:'transparent', color:AZUL, cursor:'pointer' }}>
              Importar extrato
            </button>
            <button onClick={e => { e.stopPropagation(); navigate('/conciliacao') }}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'none', background:AZUL, color:'#fff', cursor:'pointer' }}>
              Conciliar →
            </button>
            <button onClick={e => { e.stopPropagation(); navigate('/relatorios') }}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid #D3D1C7`, background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>
              Relatórios
            </button>
          </div>
        </div>

        {/* CARD 3 — EMENDAS / PARCERIAS */}
        <div style={{ ...s.card(LARANJA), borderColor:`${LARANJA}30` }}
          onClick={() => navigate('/parcerias')}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${LARANJA}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📋</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#2C2C2A' }}>Emendas / Parcerias</div>
              <div style={{ fontSize:11, color:'#888780' }}>
                {parcerias.length === 0 ? 'Nenhuma cadastrada' : `${parcerias.length} instrumento${parcerias.length > 1 ? 's' : ''}`}
              </div>
            </div>
          </div>

          {parcerias.length === 0 ? (
            <div style={{ textAlign:'center', padding:'1rem', color:'#888780', fontSize:12 }}>
              Nenhuma parceria cadastrada ainda.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10, maxHeight:120, overflowY:'auto' }}>
              {parcerias.slice(0,4).map(p => {
                const [bg, cor] = SITUACAO_COR[p.situacao] || ['#F1EFE8','#5F5E5A']
                return (
                  <div key={p.id}
                    onClick={e => { e.stopPropagation(); navigate(`/parcerias/${p.id}`) }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F8F7F2', borderRadius:8, padding:'7px 10px', cursor:'pointer' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:'#2C2C2A' }}>{p.nome_projeto}</div>
                      <div style={{ fontSize:10, color:'#888780' }}>{TIPO_LABEL[p.tipo] || p.tipo}</div>
                    </div>
                    <span style={s.badge(bg, cor)}>{p.situacao}</span>
                  </div>
                )
              })}
              {parcerias.length > 4 && (
                <div style={{ fontSize:11, color:'#888780', textAlign:'center' }}>+{parcerias.length-4} mais</div>
              )}
            </div>
          )}

          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={e => { e.stopPropagation(); navigate('/parcerias') }}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'none', background:LARANJA, color:'#fff', cursor:'pointer' }}>
              Ver todas →
            </button>
            <button onClick={e => { e.stopPropagation(); navigate('/parcerias/nova') }}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid ${LARANJA}`, background:'transparent', color:LARANJA, cursor:'pointer' }}>
              + Nova parceria
            </button>
          </div>
        </div>
      </div>

      {/* ===== ATALHOS RÁPIDOS ===== */}
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#5F5E5A', marginBottom:'.75rem' }}>Acesso rápido</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8 }}>
          {[
            { icon:'📥', label:'Lançar despesa', rota:'/despesas', cor:'#F1EFE8' },
            { icon:'📤', label:'Lançar entrada', rota:'/entradas', cor:'#EAF3DE' },
            { icon:'📊', label:'Relatórios', rota:'/relatorios', cor:'#E6F1FB' },
            { icon:'👥', label:'Funcionários', rota:'/funcionarios', cor:'#EEEDFE' },
            { icon:'🧾', label:'Cobranças', rota:'/cobrancas', cor:'#FEF2F2', badge: totalCobrancas > 0 ? totalCobrancas : null },
            { icon:'📄', label:'Prestação contas', rota:'/prestacao-contas', cor:'#FAEEDA' },
            { icon:'🔒', label:'Fechamento', rota:'/fechamento', cor:'#F8F7F2' },
            { icon:'💾', label:'Backup', rota:'/backup', cor:'#F8F7F2' },
          ].map(item => (
            <button key={item.rota} onClick={() => navigate(item.rota)}
              style={{ background:item.cor, border:'0.5px solid #E0DDD5', borderRadius:10, padding:'12px 10px', cursor:'pointer', textAlign:'center', position:'relative' }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{item.icon}</div>
              <div style={{ fontSize:11, color:'#2C2C2A', fontWeight:500 }}>{item.label}</div>
              {item.badge && (
                <div style={{ position:'absolute', top:6, right:6, background:VERMELHO, color:'#fff', fontSize:9, fontWeight:700, borderRadius:99, width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {item.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===== ALERTAS ===== */}
      {totalCobrancas > 0 && (
        <div style={{ background:'#FEF2F2', border:'0.5px solid #F7C1C1', borderRadius:10, padding:'.75rem 1rem', fontSize:12, color:'#A32D2D', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>⚠️</span>
          <span><strong>{totalCobrancas} cobranças</strong> pendentes de confirmação.</span>
          <button onClick={() => navigate('/cobrancas')}
            style={{ marginLeft:'auto', fontSize:11, padding:'4px 10px', borderRadius:6, border:'none', background:'#E8212A', color:'#fff', cursor:'pointer' }}>
            Ver cobranças
          </button>
        </div>
      )}
    </div>
  )
}
