import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'

const AG_BLUE = '#0E7EA8'
const TOPBAR_H = 62

export default function PainelOperacional() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const isMobile = useIsMobile()
  const [dados, setDados] = useState(null)
  const [atendimentosRecentes, setAtendimentosRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function carregar() {
      const hoje = new Date()
      const ym = hoje.toISOString().slice(0,7)
      const inicioMes = ym + '-01'
      const [yy, mm] = ym.split('-')
      const fimMes = `${ym}-${new Date(+yy, +mm, 0).getDate()}`
      const hojeStr = hoje.toISOString().slice(0,10)

      const [
        atends, atendHoje, usuarios, equipe,
        cobrancas, doacoesMes, atRecentes
      ] = await Promise.all([
        // Atendimentos do mês
        supabase.from('atendimentos').select('id', { count:'exact', head:true })
          .gte('data_atend', inicioMes).lte('data_atend', fimMes),
        // Atendimentos de hoje
        supabase.from('atendimentos').select('id', { count:'exact', head:true })
          .eq('data_atend', hojeStr),
        // Usuários ativos
        supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true })
          .eq('situacao', 'ativo'),
        // Equipe ativa
        supabase.from('equipe').select('id', { count:'exact', head:true })
          .eq('situacao', 'ativo'),
        // Cobranças pendentes
        supabase.from('cobrancas').select('id', { count:'exact', head:true })
          .eq('pago_confirmado', false),
        // Doações do mês
        supabase.from('doacoes').select('valor').gte('data', inicioMes).lte('data', fimMes),
        // Atendimentos recentes
        supabase.from('atendimentos')
          .select('data_atend, tipo_atend, qtd_participantes, projeto:projetos(nome)')
          .order('data_atend', { ascending:false }).limit(8),
      ])

      if (!mounted) return

      const totalDoacoes = (doacoesMes.data||[]).reduce((a,d) => a + Number(d.valor||0), 0)

      setDados({
        atendimentosMes: atends.count || 0,
        atendimentosHoje: atendHoje.count || 0,
        usuarios: usuarios.count || 0,
        equipeAtiva: equipe.count || 0,
        cobrancas: cobrancas.count || 0,
        doacoesMes: totalDoacoes,
      })
      setAtendimentosRecentes(atRecentes.data || [])
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmt = v => 'R$ ' + Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits:2 })
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month:'long' })
  const nome = perfil?.nome?.split(' ')[0] || ''

  const card = {
    background: 'rgba(255,255,255,0.92)',
    border: '0.5px solid #E8E6DE',
    borderRadius: 14,
    boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
    padding: '14px 16px',
  }

  const ACOES = [
    { icon: 'ti-clipboard-list', label: 'Registrar atendimento', sub: 'atividade do dia', rota: '/atendimentos', destaque: true },
    { icon: 'ti-user-plus',      label: 'Cadastrar usuário',     sub: 'novo atendido',   rota: '/usuarios-atendidos' },
    { icon: 'ti-gift',           label: 'Registrar doação',      sub: 'recebida agora',  rota: '/doacoes' },
    { icon: 'ti-receipt-2',      label: 'Cobranças',             sub: 'boletos e promessas', rota: '/cobrancas', badge: dados?.cobrancas },
    { icon: 'ti-calendar-event', label: 'Eventos e Campanhas',   sub: 'atividades externas', rota: '/eventos-campanhas' },
    { icon: 'ti-users-group',    label: 'Equipe',                sub: 'ver colegas',     rota: '/equipe' },
    { icon: 'ti-circle-arrow-down', label: 'Lançar despesa',     sub: 'saída do dia',    rota: '/despesas' },
    { icon: 'ti-circle-arrow-up',   label: 'Lançar entrada',      sub: 'dinheiro recebido', rota: '/entradas' },
    { icon: 'ti-users',          label: 'Usuários atendidos',    sub: 'cadastro geral',  rota: '/usuarios-atendidos' },
  ]

  return (
    <div>
      {/* Topbar */}
      <div style={{ height: TOPBAR_H, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: '2px solid #E8E6DE', flexShrink: 0 }}>
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt={perfil.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${perfil.foto_position || '50%'}` }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: perfil?.cor_avatar || '#0E7EA8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {(perfil?.nome || 'U').slice(0,2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.03em', lineHeight: 1 }}>
              {saudacao}{nome ? `, ${nome}` : ''}!
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} · painel operacional
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/atendimentos')}
          style={{ padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 11 : 12, fontWeight: 600, borderRadius: 9, border: 'none', background: AG_BLUE, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-plus" /> Registrar atendimento
        </button>
      </div>

      <div style={{ padding: isMobile ? '12px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ALERTA cobranças */}
        {!loading && dados?.cobrancas > 0 && (
          <div onClick={() => navigate('/cobrancas')} style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderLeft: '3px solid rgba(133,79,11,0.4)', borderRadius: 14, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#2C2C2A', marginBottom: 2 }}>Cobranças pendentes</div>
              <div style={{ fontSize: 10.5, color: '#888780' }}>há famílias aguardando contato de cobrança</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(133,79,11,0.8)' }}>{dados.cobrancas}</div>
              <div style={{ fontSize: 10, color: '#B4B2A9' }}>pendentes</div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Atendimentos hoje',      val: loading ? '...' : dados?.atendimentosHoje,  cor: AG_BLUE,    barra: AG_BLUE },
            { label: `Atendimentos em ${mesAtual}`, val: loading ? '...' : dados?.atendimentosMes, cor: '#06344F', barra: AG_BLUE },
            { label: 'Usuários ativos',        val: loading ? '...' : dados?.usuarios,           cor: '#06344F', barra: AG_BLUE },
            { label: `Doações em ${mesAtual}`, val: loading ? '...' : fmt(dados?.doacoesMes),    cor: '#3B6D11', barra: '#3B6D11' },
          ].map(k => (
            <div key={k.label} style={{ ...card, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.barra }} />
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6C7A86', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.cor, letterSpacing: '-.03em' }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* GRID 2 COLUNAS */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 14, alignItems: 'start' }}>

          {/* AÇÕES RÁPIDAS */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 14 }}>
              Ações rápidas
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 8 }}>
              {ACOES.map(a => (
                <button key={a.rota+a.label} onClick={() => navigate(a.rota)}
                  style={{
                    background: a.destaque ? 'rgba(14,126,168,0.06)' : 'rgba(255,255,255,0.8)',
                    border: `0.5px solid ${a.destaque ? 'rgba(14,126,168,0.25)' : '#E8E6DE'}`,
                    borderRadius: 10, padding: '10px 6px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    position: 'relative', transition: 'border-color .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = AG_BLUE}
                  onMouseLeave={e => e.currentTarget.style.borderColor = a.destaque ? 'rgba(14,126,168,0.25)' : '#E8E6DE'}>
                  <i className={`ti ${a.icon}`} style={{ fontSize: 18, color: AG_BLUE }} />
                  <span style={{ fontSize: 10.5, fontWeight: 500, color: '#2C2C2A', textAlign: 'center', lineHeight: 1.25 }}>{a.label}</span>
                  <span style={{ fontSize: 9, color: '#B4B2A9', textAlign: 'center', lineHeight: 1.2 }}>{a.sub}</span>
                  {a.badge > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(133,79,11,0.15)', color: 'rgba(133,79,11,0.8)', fontSize: 8, fontWeight: 700, borderRadius: 99, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                      {a.badge > 99 ? '99+' : a.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ATENDIMENTOS RECENTES */}
          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9' }}>Últimos atendimentos</div>
              <button onClick={() => navigate('/atendimentos')}
                style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>
                Ver todos
              </button>
            </div>
            {loading ? (
              <div style={{ color: '#B4B2A9', fontSize: 12, padding: '1rem 0', textAlign: 'center' }}>Carregando...</div>
            ) : atendimentosRecentes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <i className="ti ti-clipboard-list" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: '#B4B2A9', marginBottom: 10 }}>Nenhum atendimento registrado</div>
                <button onClick={() => navigate('/atendimentos')}
                  style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, border: 'none', background: AG_BLUE, color: '#fff', cursor: 'pointer' }}>
                  Registrar agora
                </button>
              </div>
            ) : atendimentosRecentes.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: i < atendimentosRecentes.length - 1 ? '0.5px solid #F1EFE8' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.tipo_atend || '—'}</div>
                  <div style={{ fontSize: 10.5, color: '#888780', marginTop: 1 }}>{a.projeto?.nome || '—'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontSize: 10.5, color: '#888780' }}>{fmtData(a.data_atend)}</div>
                  {a.qtd_participantes > 0 && (
                    <div style={{ fontSize: 10.5, fontWeight: 500, color: AG_BLUE, marginTop: 1 }}>{a.qtd_participantes} part.</div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
