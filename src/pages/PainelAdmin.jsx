import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const AG_BLUE = '#0E7EA8'
const AG_RED  = '#E63214'
const TOPBAR_H = 62

const cardStyle = {
  background: 'rgba(255,255,255,0.92)',
  border: '0.5px solid #E8E6DE',
  borderRadius: 20,
  boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
}

export default function PainelAdmin() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [dados, setDados] = useState(null)
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0,7)
  })
  const [abaTabela, setAbaTabela] = useState('abertas')

  useEffect(() => { carregarDados() }, [mesAtual])

  async function carregarDados() {
    const [ano, mes] = mesAtual.split('-')
    const ini = `${ano}-${mes}-01`
    const fimMes = `${ano}-${mes}-31`

    const [
      { count: cobPend },
      { count: pendAbertas },
      { data: fechamentos },
      { data: movs },
      { count: dividasAbertas },
    ] = await Promise.all([
      supabase.from('cobrancas').select('id', { count:'exact', head:true }).eq('pago_confirmado', false),
      supabase.from('pendencias').select('id', { count:'exact', head:true }).eq('resolvida', false),
      supabase.from('fechamentos').select('competencia, tipo_aprovacao').order('competencia', { ascending:false }).limit(12),
      supabase.from('extrato_movs').select('valor').gte('data', ini).lte('data', fimMes),
      supabase.from('dividas').select('id', { count:'exact', head:true }).eq('status', 'aberta'),
    ])

    const entradas = (movs||[]).filter(m => Number(m.valor) > 0).reduce((a,m) => a + Number(m.valor), 0)
    const saidas   = Math.abs((movs||[]).filter(m => Number(m.valor) < 0).reduce((a,m) => a + Number(m.valor), 0))
    const mesesSemFechar = (fechamentos||[]).filter(f => !f.tipo_aprovacao).length

    // Saldo bancário — último saldo_final dos extratos
    const { data: ultimoExtrato } = await supabase.from('extratos')
      .select('saldo_final').order('competencia', { ascending: false }).limit(1).maybeSingle()

    // Checklist de fechamento
    const { count: extratoCount } = await supabase.from('extratos')
      .select('id', { count:'exact', head:true }).gte('competencia', mesAtual).lte('competencia', mesAtual)
    const { count: naoConc } = await supabase.from('extrato_movs')
      .select('id', { count:'exact', head:true }).eq('conciliado', false).gte('data', ini).lte('data', fimMes)
    const { count: docPend } = await supabase.from('documentos_fiscais')
      .select('id', { count:'exact', head:true })

    setDados({
      cobPend: cobPend || 0,
      pendAbertas: pendAbertas || 0,
      mesesSemFechar: mesesSemFechar || 0,
      entradas, saidas,
      resultado: entradas - saidas,
      pctComprometido: entradas > 0 ? Math.round(saidas / entradas * 100) : 0,
      saldoBancario: ultimoExtrato?.saldo_final || 0,
      dividasAbertas: dividasAbertas || 0,
      extratoOk: (extratoCount || 0) > 0,
      naoConc: naoConc || 0,
      docPend: docPend || 0,
      mesesSemFechCF: mesesSemFechar,
    })
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits:2 })
  const fmtK = v => {
    const n = Math.abs(Number(v)||0)
    return n >= 1000 ? `R$ ${(n/1000).toFixed(1).replace('.',',')}k` : fmt(v)
  }

  const d = dados

  const prioridades = d ? [
    { item:'Cobranças pendentes', desc:'pendentes de confirmação no extrato', modulo:'Cobranças', tipo:'Financeiro', status:'Crítico', statusColor:'red', qtd: d.cobPend, rota:'/cobrancas', show: d.cobPend > 0 },
    { item:'Pendências abertas', desc:'aguardando resolução dos responsáveis', modulo:'Pendências', tipo:'Gestão', status:'Atenção', statusColor:'orange', qtd: d.pendAbertas, rota:'/pendencias', show: d.pendAbertas > 0 },
    { item:'Fechamento sem aprovação', desc:'meses aguardando Conselho Fiscal', modulo:'Fechamento', tipo:'Relatórios', status:'Pendente', statusColor:'orange', qtd: d.mesesSemFechar, rota:'/fechamento', show: d.mesesSemFechar > 0 },
    { item:'Dívidas em aberto', desc:'controle de dívidas e parcelamentos', modulo:'Dívidas', tipo:'Financeiro', status:'Atenção', statusColor:'orange', qtd: d.dividasAbertas, rota:'/controle-dividas', show: d.dividasAbertas > 0 },
  ].filter(p => p.show) : []

  const badgeColor = { red:'#FEF2F2', orange:'#FFF6ED', blue:'#EAF4F8', green:'#EAF3DE', gray:'#F1EFE8' }
  const badgeText  = { red:'#A32D2D', orange:'#854F0B', blue:'#0E7EA8', green:'#3B6D11', gray:'#888780' }
  const badgeBorder= { red:'#F1C7C7', orange:'#EED2B3', blue:'#BFE1EE', green:'#C0DD97', gray:'#D3D1C7' }

  return (
    <div>
      {/* TOPBAR — alinhada com o topo da sidebar */}
      <div style={{ height: TOPBAR_H, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Avatar */}
          <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: '2px solid #E8E6DE', flexShrink: 0 }}>
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt={perfil.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${perfil.foto_position || '50%'}` }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: perfil?.cor_avatar || '#0E7EA8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {(perfil?.nome || 'A').slice(0,2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#06344F', letterSpacing: '-.03em', lineHeight: 1 }}>
              Boa {new Date().getHours() < 12 ? 'manhã' : new Date().getHours() < 18 ? 'tarde' : 'noite'}, {perfil?.nome?.split(' ')[0] || 'Admin'}.
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} · painel administrativo
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setBuscaAberta(true)} style={{ padding: '7px 14px', border: '0.5px solid #D3D1C7', borderRadius: 10, fontSize: 12, color: '#5F5E5A', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-search" /> Busca rápida Ctrl+K
          </button>
          <button onClick={() => navigate('/relatorios')} style={{ padding: '7px 14px', border: '0.5px solid #D3D1C7', borderRadius: 10, fontSize: 12, color: '#5F5E5A', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-report-analytics" /> Relatórios
          </button>
          <button onClick={() => navigate('/lancamentos')} style={{ padding: '7px 14px', border: 'none', borderRadius: 10, fontSize: 12, color: '#fff', background: '#0E7EA8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, boxShadow: '0 4px 12px rgba(14,126,168,.22)' }}>
            <i className="ti ti-plus" /> Novo lançamento
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* STEPPER DO MÊS */}
        {d && (() => {
          const mesLabel = new Date(mesAtual+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
          const etapas = [
            {
              num: 1, label: 'Importar extrato', icon: 'ti-file-upload',
              ok: d.extratoOk,
              pendente: !d.extratoOk,
              desc: d.extratoOk ? 'Extrato importado' : 'Nenhum extrato importado ainda',
              rota: '/importar',
            },
            {
              num: 2, label: 'Conciliar', icon: 'ti-checks',
              ok: d.extratoOk && d.naoConc === 0,
              pendente: d.extratoOk && d.naoConc > 0,
              desc: !d.extratoOk ? 'Aguardando extrato' : d.naoConc === 0 ? 'Tudo conciliado' : `${d.naoConc} movimentação(ões) pendente(s)`,
              rota: '/conciliacao',
            },
            {
              num: 3, label: 'Resolver pendências', icon: 'ti-alert-triangle',
              ok: d.extratoOk && d.naoConc === 0 && d.pendAbertas === 0,
              pendente: d.pendAbertas > 0,
              desc: d.pendAbertas === 0 ? 'Sem pendências abertas' : `${d.pendAbertas} pendência(s) para resolver`,
              rota: '/pendencias',
            },
            {
              num: 4, label: 'Fechar mês', icon: 'ti-lock',
              ok: d.mesesSemFechCF === 0,
              pendente: d.extratoOk && d.naoConc === 0 && d.pendAbertas === 0 && d.mesesSemFechCF > 0,
              desc: d.mesesSemFechCF === 0 ? 'Mês aprovado pelo CF' : 'Aguardando aprovação do Conselho Fiscal',
              rota: '/fechamento',
            },
          ]
          // Etapa atual = primeira não concluída
          const etapaAtual = etapas.findIndex(e => !e.ok)

          return (
            <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                Fluxo do mês — {mesLabel}
                {etapaAtual === -1 && <span style={{ color: '#3B6D11', fontWeight: 600 }}>✓ Mês completo</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, position: 'relative' }}>
                {/* Linha conectora */}
                <div style={{ position: 'absolute', top: 16, left: '12.5%', right: '12.5%', height: 2, background: '#E8E6DE', zIndex: 0 }} />
                {etapas.map((et, i) => {
                  const isOk = et.ok
                  const isCurrent = i === etapaAtual
                  const isLocked = !isOk && !isCurrent && !et.pendente
                  return (
                    <div key={et.num} onClick={() => navigate(et.rota)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', position: 'relative', zIndex: 1, padding: '0 8px' }}>
                      {/* Círculo */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isOk ? '#3B6D11' : isCurrent ? '#0E7EA8' : et.pendente ? '#854F0B' : '#E8E6DE',
                        border: `2px solid ${isOk ? '#3B6D11' : isCurrent ? '#0E7EA8' : et.pendente ? '#854F0B' : '#D3D1C7'}`,
                        transition: 'all .2s',
                      }}>
                        <i className={`ti ${isOk ? 'ti-check' : et.icon}`} style={{ fontSize: 13, color: isOk || isCurrent || et.pendente ? '#fff' : '#B4B2A9' }} />
                      </div>
                      {/* Label */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: isCurrent ? 600 : 500, color: isOk ? '#3B6D11' : isCurrent ? '#0E7EA8' : et.pendente ? '#854F0B' : '#B4B2A9' }}>
                          {et.label}
                        </div>
                        <div style={{ fontSize: 10, color: isOk ? '#3B6D11' : isCurrent ? '#0E7EA8' : et.pendente ? '#854F0B' : '#C8C6BC', marginTop: 2, lineHeight: 1.3 }}>
                          {et.desc}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ALERTAS */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Precisa de atenção
            <span style={{ fontSize: 10, color: '#C8C6BC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>prioridades do ambiente CAPETTE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { num: d?.cobPend || 0, label: 'Cobranças pendentes', sub: 'confirmação no extrato', ntxt: n => `${n} ${n===1?'item':'itens'} aguardando`, bord: 'rgba(163,45,45,0.35)', ncor: 'rgba(163,45,45,0.65)', rota: '/cobrancas' },
              { num: d?.pendAbertas || 0, label: 'Pendências abertas', sub: 'aguardando resolução', ntxt: n => `${n} ${n===1?'item':'itens'} em aberto`, bord: 'rgba(133,79,11,0.35)', ncor: 'rgba(133,79,11,0.65)', rota: '/pendencias' },
              { num: d?.mesesSemFechar || 0, label: 'Meses sem fechamento', sub: 'Conselho Fiscal pendente', ntxt: n => `${n} ${n===1?'mês':'meses'} sem aprovação`, bord: 'rgba(14,126,168,0.35)', ncor: 'rgba(14,126,168,0.65)', rota: '/fechamento' },
            ].map(a => (
              <div key={a.label} onClick={() => navigate(a.rota)}
                style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderLeft: `3px solid ${a.bord}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: 12, fontWeight: 500, color: '#2C2C2A' }}>{a.label}</strong>
                  <i className="ti ti-chevron-right" style={{ fontSize: 13, color: '#D3D1C7' }} />
                </div>
                <div style={{ fontSize: 10.5, color: '#888780' }}>{a.sub}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: a.ncor, marginTop: 8 }}>{a.ntxt(a.num)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: `Entradas · ${new Date(mesAtual+'-01').toLocaleDateString('pt-BR',{month:'long'})}`, val: fmt(d?.entradas||0), sub: 'receitas no mês', cor: '#3B6D11', barra: AG_BLUE },
            { label: `Saídas · ${new Date(mesAtual+'-01').toLocaleDateString('pt-BR',{month:'long'})}`, val: fmt(d?.saidas||0), sub: 'despesas no mês', cor: '#A32D2D', barra: '#A32D2D' },
            { label: 'Resultado do mês', val: (d?.resultado >= 0 ? '' : '−') + fmt(d?.resultado||0), sub: `${d?.pctComprometido||0}% comprometido`, cor: (d?.resultado||0) >= 0 ? '#3B6D11' : '#A32D2D', barra: (d?.resultado||0) >= 0 ? AG_BLUE : '#A32D2D' },
            { label: 'Saldo em conta', val: fmt(d?.saldoBancario||0), sub: 'Conta Principal', cor: '#06344F', barra: AG_BLUE },
          ].map(k => (
            <div key={k.label} style={{ ...cardStyle, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.barra }} />
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6C7A86', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: k.cor, letterSpacing: '-.03em' }}>{k.val}</div>
              <div style={{ fontSize: 11, color: '#687786', marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* GRID 2 COLUNAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

          {/* COLUNA ESQUERDA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* AÇÕES RÁPIDAS */}
            <div style={{ ...cardStyle, padding: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
                Ações rápidas
                <span style={{ fontSize: 10, color: '#C8C6BC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>organizadas por finalidade</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  { grupo: 'Financeiro principal', itens: [
                    { icon: 'circle-arrow-down', label: 'Despesa', sub: 'saída e anexos', rota: '/lancamentos' },
                    { icon: 'circle-arrow-up',   label: 'Entrada', sub: 'receitas e doações', rota: '/lancamentos' },
                    { icon: 'file-upload',        label: 'Importar', sub: 'extrato bancário', rota: '/importar' },
                    { icon: 'checks',             label: 'Conciliar', sub: 'movimentos', rota: '/conciliacao' },
                  ]},
                  { grupo: 'Acompanhamento', itens: [
                    { icon: 'receipt-2',      label: 'Cobranças', sub: 'confirmar', rota: '/cobrancas', badge: d?.cobPend },
                    { icon: 'alert-triangle', label: 'Pendências', sub: 'resolver', rota: '/pendencias', badge: d?.pendAbertas },
                    { icon: 'report-analytics', label: 'Relatórios', sub: 'central', rota: '/relatorios' },
                    { icon: 'checkup-list',   label: 'Fechamento', sub: 'conselho', rota: '/fechamento' },
                  ]},
                  { grupo: 'Institucional', itens: [
                    { icon: 'users',           label: 'Atendidos', sub: 'cadastro', rota: '/usuarios-atendidos' },
                    { icon: 'file-certificate', label: 'Prestação', sub: 'contas', rota: '/prestacao-contas' },
                    { icon: 'world',           label: 'Transparência', sub: 'pública', rota: '/transparencia' },
                    { icon: 'settings',        label: 'Configurar', sub: 'sistema', rota: '/configuracoes' },
                  ]},
                ].map(g => (
                  <div key={g.grupo}>
                    <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 8, paddingBottom: 5, borderBottom: '0.5px solid #E8E6DE' }}>{g.grupo}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      {g.itens.map(item => (
                        <button key={item.rota+item.label} onClick={() => navigate(item.rota)} className="acao-rapida"
                          style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: '9px 5px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative', transition: 'border-color .12s, background .12s' }}>
                          <i className={`ti ti-${item.icon}`} style={{ fontSize: 17, color: AG_BLUE }} />
                          <span style={{ fontSize: 9.5, color: '#2C2C2A', textAlign: 'center', lineHeight: 1.25, fontWeight: 500 }}>{item.label}</span>
                          <span style={{ fontSize: 8.5, color: '#B4B2A9', textAlign: 'center', lineHeight: 1.2 }}>{item.sub}</span>
                          {item.badge > 0 && (
                            <span style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(230,50,20,.14)', color: '#A32D2D', fontSize: 8, fontWeight: 700, borderRadius: 99, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TABELA PRIORIDADES */}
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #E8E6DE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#06344F', letterSpacing: '-.02em' }}>Prioridades administrativas</div>
                  <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>O Admin enxerga tudo que precisa de ação ou revisão.</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['abertas','financeiro','projetos'].map(aba => (
                    <button key={aba} onClick={() => setAbaTabela(aba)} style={{ border: `0.5px solid ${abaTabela===aba?'#0E7EA8':'#D3D1C7'}`, background: abaTabela===aba?'#0E7EA8':'#F8F7F2', color: abaTabela===aba?'#fff':'#5F5E5A', fontSize: 10.5, fontWeight: 500, padding: '5px 12px', borderRadius: 99, cursor: 'pointer', textTransform: 'capitalize' }}>
                      {aba.charAt(0).toUpperCase()+aba.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Item','Módulo','Tipo','Status','Qtd.'].map((h,i) => (
                      <th key={h} style={{ background: 'rgba(0,0,0,.018)', color: '#888780', fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', padding: '8px 16px', textAlign: i===4?'right':'left', borderBottom: '0.5px solid #E8E6DE' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prioridades.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#B4B2A9', fontSize: 12 }}>
                      <i className="ti ti-check" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                      Nenhuma pendência no momento
                    </td></tr>
                  ) : prioridades.map(pr => (
                    <tr key={pr.item} onClick={() => navigate(pr.rota)} style={{ borderBottom: '0.5px solid rgba(0,0,0,.04)', cursor: 'pointer' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{pr.item}</div>
                        <div style={{ fontSize: 10.5, color: '#888780', marginTop: 2 }}>{pr.desc}</div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#888780' }}>{pr.modulo}</td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#888780' }}>{pr.tipo}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: badgeColor[pr.statusColor], color: badgeText[pr.statusColor] }}>{pr.status}</span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: badgeText[pr.statusColor] }}>{pr.qtd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* COLUNA DIREITA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* CHECKLIST */}
            <div style={{ ...cardStyle, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9' }}>Checklist de fechamento</div>
                <button onClick={() => navigate('/fechamento')} style={{ fontSize: 10, padding: '4px 10px', border: '0.5px solid #D3D1C7', borderRadius: 6, background: 'transparent', color: '#0E7EA8', cursor: 'pointer' }}>Abrir fechamento</button>
              </div>
              {[
                { ok: d?.extratoOk, label: 'Extrato importado', sub: d?.extratoOk ? 'movimentos processados' : 'nenhum extrato no período' },
                { ok: d?.naoConc === 0, warn: (d?.naoConc||0) > 0, label: 'Conciliação', sub: d?.naoConc > 0 ? `${d.naoConc} pendências para revisar` : 'conciliado' },
                { ok: d?.docPend === 0, err: (d?.docPend||0) > 0, label: 'Documentos fiscais', sub: d?.docPend > 0 ? `${d.docPend} anexos pendentes` : 'documentos ok' },
                { ok: d?.mesesSemFechCF === 0, err: (d?.mesesSemFechCF||0) > 0, label: 'Conselho Fiscal', sub: d?.mesesSemFechCF > 0 ? `${d.mesesSemFechCF} meses sem aprovação` : 'em dia' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 0', borderBottom: '0.5px solid #F1EFE8' }}>
                  <i className={`ti ti-${item.ok ? 'circle-check' : 'alert-circle'}`} style={{ fontSize: 15, flexShrink: 0, marginTop: 1, color: item.ok ? '#3B6D11' : item.err ? '#A32D2D' : '#854F0B' }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#2C2C2A' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#888780', marginTop: 1 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* FINANCEIRO DO MÊS */}
            <div style={{ ...cardStyle, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9' }}>Financeiro do mês</div>
                <input type="month" value={mesAtual} onChange={e => setMesAtual(e.target.value)}
                  style={{ fontSize: 10, padding: '3px 6px', border: '0.5px solid #D3D1C7', borderRadius: 6, background: 'transparent', color: '#5F5E5A' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: '#F8F7F2', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: '#888780', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Entradas</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#3B6D11' }}>{fmtK(d?.entradas||0)}</div>
                </div>
                <div style={{ background: '#F8F7F2', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: '#888780', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Saídas</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#A32D2D' }}>{fmtK(d?.saidas||0)}</div>
                </div>
              </div>
              <div style={{ height: 5, background: '#E8E6DE', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', background: (d?.pctComprometido||0) > 100 ? '#A32D2D' : '#0E7EA8', borderRadius: 99, width: `${Math.min(d?.pctComprometido||0, 100)}%`, transition: 'width .4s' }} />
              </div>
              <div style={{ fontSize: 10, color: '#888780' }}>{d?.pctComprometido||0}% comprometido das entradas</div>
              {(d?.pctComprometido||0) > 100 && (
                <div style={{ marginTop: 8, fontSize: 10, color: '#A32D2D', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />
                  Saídas superam as entradas neste mês
                </div>
              )}
            </div>

            {/* ACESSO ADMIN */}
            <div style={{ ...cardStyle, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 10 }}>Acesso Admin</div>
              {[
                { icon: 'pencil', label: 'Editar dados', sub: 'lançamentos, projetos e cadastros', rota: '/lancamentos' },
                { icon: 'settings', label: 'Configurações', sub: 'instituição, usuários e backup', rota: '/configuracoes' },
                { icon: 'report-analytics', label: 'Relatórios', sub: 'todos os módulos', rota: '/relatorios' },
              ].map(item => (
                <div key={item.label} onClick={() => navigate(item.rota)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '0.5px solid #F1EFE8', cursor: 'pointer' }}>
                  <i className={`ti ti-${item.icon}`} style={{ fontSize: 14, color: '#0E7EA8', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#2C2C2A' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#888780', marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#3B6D11', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <i className="ti ti-check" style={{ fontSize: 11 }} /> Total
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      <style>{`
        .acao-rapida:hover { border-color: #0E7EA8 !important; background: rgba(14,126,168,0.05) !important; }
      `}</style>
    </div>
  )
}
