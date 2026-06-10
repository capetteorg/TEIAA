import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const fimMes = m => { const [y,mo] = m.split('-'); return `${m}-${new Date(+y,+mo,0).getDate()}` }
const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', ROXO = '#8B2FC9', LARANJA = '#F4821F'

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

  const s = {
    secao: { fontSize:11, fontWeight:500, color:'#B4B2A9', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 },
    atalho: (bg, cor) => ({
      display:'flex', flexDirection:'column', alignItems:'center', gap:5,
      padding:'12px 8px', borderRadius:10, background:bg,
      border:'0.5px solid transparent', cursor:'pointer',
    }),
    atalhoIcon: (cor) => ({
      width:36, height:36, borderRadius:9, background:cor+'22',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
    }),
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:28, height:28, border:`2.5px solid ${VERDE}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding:'1.75rem 2rem', maxWidth:900, margin:'0 auto' }}>

      {/* Saudação */}
      <div style={{ marginBottom:'1.75rem' }}>
        <div style={{ fontSize:22, fontWeight:500, color:'#2C2C2A', marginBottom:3 }}>
          {SAUDACAO()}, {nome}.
        </div>
        <div style={{ fontSize:13, color:'#888780' }}>{dataHoje}</div>
      </div>

      {/* Alertas — só aparecem se tiver algo */}
      {totalAlertas > 0 && (
        <div style={{ marginBottom:'1.75rem' }}>
          <div style={s.secao}>Precisa de atenção</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>

            {cobrancasPendentes > 0 && (
              <div onClick={() => navigate('/cobrancas')} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'#FEF2F2', border:'0.5px solid #F7C1C1', cursor:'pointer' }}>
                <i className="ti ti-receipt-2" style={{ fontSize:16, color:VERMELHO }} />
                <span style={{ fontSize:13, color:'#2C2C2A', flex:1 }}>
                  <strong>{cobrancasPendentes} cobranças</strong> pendentes de confirmação no extrato
                </span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'#A32D2D' }} />
              </div>
            )}

            {pendenciasAbertas > 0 && (
              <div onClick={() => navigate('/pendencias')} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'#FAEEDA', border:'0.5px solid #FAC775', cursor:'pointer' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize:16, color:LARANJA }} />
                <span style={{ fontSize:13, color:'#2C2C2A', flex:1 }}>
                  <strong>{pendenciasAbertas} pendências</strong> em aberto aguardando resolução
                </span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'#854F0B' }} />
              </div>
            )}

            {dividasAbertas > 0 && (
              <div onClick={() => navigate('/controle-dividas')} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'#FAEEDA', border:'0.5px solid #FAC775', cursor:'pointer' }}>
                <i className="ti ti-credit-card-off" style={{ fontSize:16, color:LARANJA }} />
                <span style={{ fontSize:13, color:'#2C2C2A', flex:1 }}>
                  <strong>{dividasAbertas} dívida{dividasAbertas>1?'s':''}</strong> em aberto — {fmt(totalDividaAberta)}
                </span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'#854F0B' }} />
              </div>
            )}

            {mesesSemFechar.length > 0 && (
              <div onClick={() => navigate('/fechamento')} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'#E6F1FB', border:'0.5px solid #B5D4F4', cursor:'pointer' }}>
                <i className="ti ti-lock-open" style={{ fontSize:16, color:AZUL }} />
                <span style={{ fontSize:13, color:'#2C2C2A', flex:1 }}>
                  <strong>{mesesSemFechar.length} mês{mesesSemFechar.length>1?'es':''}</strong> sem fechamento aprovado pelo Conselho Fiscal
                </span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'#185FA5' }} />
              </div>
            )}

          </div>
        </div>
      )}

      {/* Resumo financeiro */}
      <div style={{ marginBottom:'1.75rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={s.secao}>Financeiro</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'#888780' }}>{mesLabel}</span>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              style={{ fontSize:11, padding:'3px 7px', border:'0.5px solid #D3D1C7', borderRadius:7, color:'#5F5E5A', background:'#fff' }} />
          </div>
        </div>

        {/* Métricas em faixa */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
          {[
            { label:'Entradas', val:fmt(resumo.entradas), cor:VERDE, bg:'#EAF3DE' },
            { label:'Saídas', val:fmt(resumo.saidas), cor:VERMELHO, bg:'#FEF2F2' },
            { label:'Saldo', val:(resumo.saldo<0?'–':'')+fmt(resumo.saldo), cor:resumo.saldo>=0?AZUL:VERMELHO, bg:resumo.saldo>=0?'#E6F1FB':'#FEF2F2' },
          ].map(m => (
            <div key={m.label} style={{ background:m.bg, borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:16, fontWeight:500, color:m.cor }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Barra saídas/entradas */}
        {resumo.entradas > 0 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ height:5, background:'#EAF3DE', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:Math.min(Math.round(resumo.saidas/resumo.entradas*100),100)+'%', background:resumo.saidas>resumo.entradas?VERMELHO:LARANJA, borderRadius:99, transition:'width .4s' }} />
            </div>
            <div style={{ fontSize:10, color:'#888780', marginTop:3 }}>
              {Math.round(resumo.saidas/resumo.entradas*100)}% das entradas comprometido em saídas
            </div>
          </div>
        )}

        {/* Links rápidos financeiro */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { label:'Importar extrato', rota:'/importar', cor:AZUL },
            { label:'Conciliação', rota:'/conciliacao', cor:AZUL },
            { label:'Lançamentos', rota:'/lancamentos', cor:'#5F5E5A' },
          ].map(a => (
            <button key={a.rota} onClick={() => navigate(a.rota)} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, border:`0.5px solid ${a.cor}50`, background:'transparent', color:a.cor, cursor:'pointer' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ações rápidas */}
      <div>
        <div style={s.secao}>Ações rápidas</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))', gap:8 }}>
          {[
            { icon:'ti-circle-arrow-down', label:'Lançar despesa',   rota:'/despesas',         bg:'#FEF2F2', cor:VERMELHO },
            { icon:'ti-circle-arrow-up',   label:'Lançar entrada',   rota:'/entradas',         bg:'#EAF3DE', cor:VERDE },
            { icon:'ti-file-upload',       label:'Importar',         rota:'/importar',         bg:'#E6F1FB', cor:AZUL },
            { icon:'ti-checks',            label:'Conciliar',        rota:'/conciliacao',      bg:'#EAF3DE', cor:VERDE },
            { icon:'ti-receipt-2',         label:'Cobranças',        rota:'/cobrancas',        bg:'#FAEEDA', cor:LARANJA, badge: cobrancasPendentes },
            { icon:'ti-report-analytics',  label:'Relatórios',       rota:'/relatorios',       bg:'#EEEDFE', cor:ROXO },
            { icon:'ti-users',             label:'Usuários atend.',  rota:'/usuarios-atendidos',bg:'#EAF3DE', cor:VERDE },
            { icon:'ti-checkup-list',      label:'Fechamento',       rota:'/fechamento',       bg:'#F8F7F2', cor:'#5F5E5A' },
            { icon:'ti-world',             label:'Transparência',    rota:'/transparencia',    bg:'#E6F1FB', cor:AZUL },
            { icon:'ti-file-certificate',  label:'Prestação',        rota:'/prestacao-contas', bg:'#EEEDFE', cor:ROXO },
          ].map(item => (
            <button key={item.rota} onClick={() => navigate(item.rota)}
              style={{ background:item.bg, border:'0.5px solid transparent', borderRadius:10, padding:'12px 6px 10px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative' }}>
              <i className={`ti ${item.icon}`} style={{ fontSize:20, color:item.cor }} aria-hidden="true" />
              <span style={{ fontSize:10, color:'#2C2C2A', fontWeight:400, lineHeight:1.3, textAlign:'center' }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position:'absolute', top:5, right:5, background:VERMELHO, color:'#fff', fontSize:9, fontWeight:700, borderRadius:99, minWidth:15, height:15, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
