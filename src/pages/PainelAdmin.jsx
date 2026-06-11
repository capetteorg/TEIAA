import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const fimMes = m => { const [y,mo] = m.split('-'); return `${m}-${new Date(+y,+mo,0).getDate()}` }
const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', ROXO = '#8B2FC9', LARANJA = '#F4821F'
const AG_BLUE = '#0E7EA8', AG_RED = '#E63214'

const SAUDACAO = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function PainelAdmin() {
  const navigate = useNavigate()
  const [resumo, setResumo] = useState({ entradas:0, saidas:0, saldo:0 })
  const [mes, setMes] = useState('')
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const carregado = useRef(false)

  // Alertas
  const [cobrancasPendentes, setCobrancasPendentes] = useState(0)
  const [dividasAbertas, setDividasAbertas] = useState(0)
  const [totalDividaAberta, setTotalDividaAberta] = useState(0)
  const [pendenciasAbertas, setPendenciasAbertas] = useState(0)
  const [mesesSemFechar, setMesesSemFechar] = useState([])

  useEffect(() => {
    if (carregado.current) return
    carregado.current = true
    inicializar()
  }, [])

  useEffect(() => { if (mes) carregarResumo() }, [mes])

  async function inicializar() {
    const mesAtual = new Date().toISOString().slice(0,7)

    const [extRes, usuRes, cobRes, dividasRes, pendRes, fechRes] = await Promise.all([
      supabase.from('extratos').select('competencia').order('competencia', { ascending:false }).limit(1),
      supabase.from('usuarios').select('nome').limit(1).single(),
      supabase.from('cobrancas').select('id', { count:'exact', head:true }).eq('pago_confirmado', false),
      supabase.from('dividas').select('valor_original,valor_pago').eq('status','aberta'),
      supabase.from('pendencias').select('id', { count:'exact', head:true }).eq('resolvida', false),
      supabase.from('fechamentos').select('competencia,status').in('status',['aberto','fechado']).order('competencia', { ascending:false }).limit(3),
    ])

    const mesUso = extRes.data?.[0]?.competencia || mesAtual
    setMes(mesUso)
    setNome(usuRes.data?.nome?.split(' ')[0] || 'Admin')
    setCobrancasPendentes(cobRes.count || 0)
    const divs = dividasRes.data || []
    setDividasAbertas(divs.length)
    setTotalDividaAberta(divs.reduce((a,d) => a + (Number(d.valor_original||0) - Number(d.valor_pago||0)), 0))
    setPendenciasAbertas(pendRes.count || 0)
    setMesesSemFechar(fechRes.data || [])
    setLoading(false)
  }

  async function carregarResumo() {
    const { data: movs } = await supabase
      .from('extrato_movs').select('valor')
      .gte('data', mes+'-01').lte('data', fimMes(mes))
    const lista = movs || []
    const ent = lista.filter(m => Number(m.valor) > 0).reduce((a,m) => a+Number(m.valor), 0)
    const sai = Math.abs(lista.filter(m => Number(m.valor) < 0).reduce((a,m) => a+Number(m.valor), 0))
    setResumo({ entradas:ent, saidas:sai, saldo:ent-sai })
  }

  const fmt = v => 'R$ '+Math.abs(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
  const mesLabel = mes ? new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) : ''
  const dataHoje = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  const totalAlertas = (cobrancasPendentes>0?1:0)+(dividasAbertas>0?1:0)+(pendenciasAbertas>0?1:0)+(mesesSemFechar.length>0?1:0)

  const cardStyle = {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    border: '0.5px solid #E0DDD5',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 2px 24px rgba(0,0,0,0.06)',
    marginBottom: 0,
  }

  const metricStyle = (bg) => ({
    background: bg,
    borderRadius: 12,
    padding: '12px 16px',
    border: '0.5px solid rgba(0,0,0,0.05)',
  })

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:28, height:28, border:`2.5px solid ${VERDE}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding:'1.75rem 2rem', maxWidth:900, margin:'0 auto', position:'relative' }}>

      {/* Marca d'água Agendo */}
      <div style={{ position:'fixed', right:'-6vw', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0, opacity:0.04, filter:'grayscale(100%)' }}>
        <img src="/agendo-logo.png" alt="" style={{ width:'30vw', maxWidth:360 }} />
      </div>

      <div style={{ position:'relative', zIndex:1 }}>

      {/* Saudação */}
      <div style={{ marginBottom:'1.75rem' }}>
        <div style={{ fontSize:22, fontWeight:500, color:'#2C2C2A', marginBottom:3 }}>
          {SAUDACAO()}, {nome}.
        </div>
        <div style={{ fontSize:13, color:'#888780' }}>{dataHoje}</div>
      </div>

      {/* Alertas */}
      {totalAlertas > 0 && (
        <div style={{ ...cardStyle, marginBottom:'1.5rem' }}>
          <div style={{ fontSize:11, fontWeight:500, color:'#B4B2A9', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Precisa de atenção</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {cobrancasPendentes > 0 && (
              <div onClick={() => navigate('/cobrancas')} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'rgba(230,50,20,0.06)', border:'0.5px solid rgba(230,50,20,0.15)', cursor:'pointer' }}>
                <i className="ti ti-receipt-2" style={{ fontSize:16, color:AG_RED }} />
                <span style={{ fontSize:13, color:'#2C2C2A', flex:1 }}><strong>{cobrancasPendentes} cobranças</strong> pendentes de confirmação no extrato</span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:AG_RED }} />
              </div>
            )}
            {pendenciasAbertas > 0 && (
              <div onClick={() => navigate('/pendencias')} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'rgba(230,120,20,0.06)', border:'0.5px solid rgba(230,120,20,0.15)', cursor:'pointer' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize:16, color:'#E67814' }} />
                <span style={{ fontSize:13, color:'#2C2C2A', flex:1 }}><strong>{pendenciasAbertas} pendências</strong> em aberto aguardando resolução</span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'#E67814' }} />
              </div>
            )}
            {dividasAbertas > 0 && (
              <div onClick={() => navigate('/controle-dividas')} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'rgba(230,120,20,0.06)', border:'0.5px solid rgba(230,120,20,0.15)', cursor:'pointer' }}>
                <i className="ti ti-credit-card-off" style={{ fontSize:16, color:'#E67814' }} />
                <span style={{ fontSize:13, color:'#2C2C2A', flex:1 }}><strong>{dividasAbertas} dívida{dividasAbertas>1?'s':''}</strong> em aberto — {fmt(totalDividaAberta)}</span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'#E67814' }} />
              </div>
            )}
            {mesesSemFechar.length > 0 && (
              <div onClick={() => navigate('/fechamento')} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'rgba(14,126,168,0.06)', border:'0.5px solid rgba(14,126,168,0.15)', cursor:'pointer' }}>
                <i className="ti ti-lock-open" style={{ fontSize:16, color:AG_BLUE }} />
                <span style={{ fontSize:13, color:'#2C2C2A', flex:1 }}><strong>{mesesSemFechar.length} mês{mesesSemFechar.length>1?'es':''}</strong> sem fechamento aprovado pelo Conselho Fiscal</span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:AG_BLUE }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumo financeiro */}
      <div style={{ ...cardStyle, marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:500, color:'#B4B2A9', textTransform:'uppercase', letterSpacing:'.07em' }}>Financeiro</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'#888780' }}>{mesLabel}</span>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              style={{ fontSize:11, padding:'3px 7px', border:'0.5px solid #D3D1C7', borderRadius:7, color:'#5F5E5A', background:'rgba(255,255,255,0.8)' }} />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
          <div style={metricStyle('#EAF3DE')}>
            <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>Entradas</div>
            <div style={{ fontSize:17, fontWeight:500, color:'#3B6D11' }}>{fmt(resumo.entradas)}</div>
          </div>
          <div style={metricStyle('#FEF2F2')}>
            <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>Saídas</div>
            <div style={{ fontSize:17, fontWeight:500, color:'#A32D2D' }}>{fmt(resumo.saidas)}</div>
          </div>
          <div style={metricStyle(resumo.saldo>=0?'#E6F1FB':'#FEF2F2')}>
            <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>Saldo</div>
            <div style={{ fontSize:17, fontWeight:500, color:resumo.saldo>=0?AG_BLUE:'#A32D2D' }}>{(resumo.saldo<0?'–':'')+fmt(resumo.saldo)}</div>
          </div>
        </div>
        {resumo.entradas > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ height:5, background:'#EAF3DE', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:Math.min(Math.round(resumo.saidas/resumo.entradas*100),100)+'%', background:resumo.saidas>resumo.entradas?AG_RED:'#E67814', borderRadius:99, transition:'width .4s' }} />
            </div>
            <div style={{ fontSize:10, color:'#B4B2A9', marginTop:3 }}>
              {Math.round(resumo.saidas/resumo.entradas*100)}% das entradas comprometido em saídas
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { label:'Importar extrato', rota:'/importar' },
            { label:'Conciliação', rota:'/conciliacao' },
            { label:'Lançamentos', rota:'/lancamentos' },
          ].map(a => (
            <button key={a.rota} onClick={() => navigate(a.rota)} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:'0.5px solid #D3D1C7', background:'rgba(255,255,255,0.8)', color:'#5F5E5A', cursor:'pointer' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ações rápidas */}
      <div style={cardStyle}>
        <div style={{ fontSize:11, fontWeight:500, color:'#B4B2A9', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Ações rápidas</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))', gap:8 }}>
          {[
            { icon:'ti-circle-arrow-down', label:'Lançar despesa',   rota:'/despesas',          bg:'rgba(232,33,42,0.06)',   cor:AG_RED },
            { icon:'ti-circle-arrow-up',   label:'Lançar entrada',   rota:'/entradas',          bg:'rgba(107,191,43,0.08)',  cor:'#3B6D11' },
            { icon:'ti-file-upload',       label:'Importar',         rota:'/importar',          bg:'rgba(14,126,168,0.07)',  cor:AG_BLUE },
            { icon:'ti-checks',            label:'Conciliar',        rota:'/conciliacao',       bg:'rgba(107,191,43,0.08)',  cor:'#3B6D11' },
            { icon:'ti-receipt-2',         label:'Cobranças',        rota:'/cobrancas',         bg:'rgba(230,120,20,0.07)', cor:'#E67814', badge: cobrancasPendentes },
            { icon:'ti-report-analytics',  label:'Relatórios',       rota:'/relatorios',        bg:'rgba(139,47,201,0.07)', cor:ROXO },
            { icon:'ti-users',             label:'Usuários atend.',  rota:'/usuarios-atendidos',bg:'rgba(107,191,43,0.08)', cor:'#3B6D11' },
            { icon:'ti-checkup-list',      label:'Fechamento',       rota:'/fechamento',        bg:'rgba(0,0,0,0.04)',       cor:'#5F5E5A' },
            { icon:'ti-world',             label:'Transparência',    rota:'/transparencia',     bg:'rgba(14,126,168,0.07)', cor:AG_BLUE },
            { icon:'ti-file-certificate',  label:'Prestação',        rota:'/prestacao-contas',  bg:'rgba(139,47,201,0.07)', cor:ROXO },
          ].map(item => (
            <button key={item.rota} onClick={() => navigate(item.rota)}
              style={{ background:item.bg, border:'0.5px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'12px 6px 10px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <i className={`ti ${item.icon}`} style={{ fontSize:20, color:item.cor }} aria-hidden="true" />
              <span style={{ fontSize:10, color:'#5F5E5A', fontWeight:400, lineHeight:1.3, textAlign:'center' }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position:'absolute', top:5, right:5, background:AG_RED, color:'#fff', fontSize:9, fontWeight:700, borderRadius:99, minWidth:15, height:15, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      </div>
    </div>
  )
}
