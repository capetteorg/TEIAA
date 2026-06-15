import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const AG_BLUE = '#0E7EA8'
const TOPBAR_H = 62

export default function PainelOperacional() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [resumo, setResumo] = useState(null)
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

      const [atends, usuarios, equipe, cobrancas, atRecentes, pendencias] = await Promise.all([
        supabase.from('atendimentos').select('id', { count:'exact', head:true }).gte('data_atend', inicioMes).lte('data_atend', fimMes),
        supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('situacao', 'ativo'),
        supabase.from('equipe').select('id', { count:'exact', head:true }).eq('situacao', 'ativo'),
        supabase.from('cobrancas').select('id', { count:'exact', head:true }).eq('pago_confirmado', false),
        supabase.from('atendimentos').select('data_atend, tipo_atend, qtd_participantes, projeto:projetos(nome)').order('data_atend', { ascending:false }).limit(6),
        supabase.from('pendencias').select('id', { count:'exact', head:true }).eq('resolvida', false).eq('gravidade', 'critica'),
      ])

      if (!mounted) return
      setResumo({
        atendimentos: atends.count || 0,
        usuarios: usuarios.count || 0,
        equipeAtiva: equipe.count || 0,
        cobrancas: cobrancas.count || 0,
        pendenciasCriticas: pendencias.count || 0,
      })
      setAtendimentosRecentes(atRecentes.data || [])
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month:'long' })
  const nome = perfil?.nome?.split(' ')[0] || ''

  const cardStyle = {
    background: 'rgba(255,255,255,0.92)',
    border: '0.5px solid #E8E6DE',
    borderRadius: 14,
    boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
    padding: '14px 16px',
  }

  return (
    <div>
      {/* Topbar */}
      <div style={{ height: TOPBAR_H, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.03em', lineHeight: 1 }}>
            {saudacao}{nome ? `, ${nome}` : ''}!
          </div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
            {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} · painel operacional
          </div>
        </div>
        <button onClick={() => navigate('/atendimentos')}
          style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, borderRadius: 9, border: 'none', background: AG_BLUE, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-plus" /> Registrar atendimento
        </button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ALERTA se tiver cobranças ou pendências críticas */}
        {!loading && (resumo.cobrancas > 0 || resumo.pendenciasCriticas > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: resumo.cobrancas > 0 && resumo.pendenciasCriticas > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>
            {resumo.cobrancas > 0 && (
              <div onClick={() => navigate('/cobrancas')} style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderLeft: '3px solid rgba(133,79,11,0.4)', borderRadius: 14, padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <strong style={{ fontSize: 12, fontWeight: 500, color: '#2C2C2A' }}>Cobranças pendentes</strong>
                  <i className="ti ti-chevron-right" style={{ fontSize: 13, color: '#D3D1C7' }} />
                </div>
                <div style={{ fontSize: 10.5, color: '#888780' }}>confirmação no extrato</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(133,79,11,0.7)', marginTop: 6 }}>{resumo.cobrancas} {resumo.cobrancas === 1 ? 'item' : 'itens'} aguardando</div>
              </div>
            )}
            {resumo.pendenciasCriticas > 0 && (
              <div onClick={() => navigate('/pendencias')} style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderLeft: '3px solid rgba(163,45,45,0.4)', borderRadius: 14, padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <strong style={{ fontSize: 12, fontWeight: 500, color: '#2C2C2A' }}>Pendências críticas</strong>
                  <i className="ti ti-chevron-right" style={{ fontSize: 13, color: '#D3D1C7' }} />
                </div>
                <div style={{ fontSize: 10.5, color: '#888780' }}>precisam de atenção</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(163,45,45,0.7)', marginTop: 6 }}>{resumo.pendenciasCriticas} {resumo.pendenciasCriticas === 1 ? 'item' : 'itens'} em aberto</div>
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: `Atendimentos em ${mesAtual}`, val: resumo?.atendimentos ?? '...', cor: AG_BLUE, barra: AG_BLUE },
            { label: 'Usuários ativos', val: resumo?.usuarios ?? '...', cor: '#06344F', barra: AG_BLUE },
            { label: 'Equipe ativa', val: resumo?.equipeAtiva ?? '...', cor: '#06344F', barra: AG_BLUE },
            { label: 'Cobranças pendentes', val: resumo?.cobrancas ?? '...', cor: (resumo?.cobrancas||0) > 0 ? '#A32D2D' : '#06344F', barra: (resumo?.cobrancas||0) > 0 ? '#A32D2D' : AG_BLUE },
          ].map(k => (
            <div key={k.label} style={{ ...cardStyle, position: 'relative', overflow: 'hidden', padding: '14px 16px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.barra }} />
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6C7A86', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.cor, letterSpacing: '-.03em' }}>{loading ? '...' : k.val}</div>
            </div>
          ))}
        </div>

        {/* GRID 2 COLUNAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>

          {/* AÇÕES RÁPIDAS */}
          <div style={{ ...cardStyle }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 14 }}>Ações rápidas</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { icon: 'ti-clipboard-list', label: 'Registrar atendimento', sub: 'lançar atividade', rota: '/atendimentos' },
                { icon: 'ti-users', label: 'Cadastrar usuário', sub: 'público atendido', rota: '/usuarios-atendidos' },
                { icon: 'ti-users-group', label: 'Equipe', sub: 'funcionários e voluntários', rota: '/equipe' },
                { icon: 'ti-circle-arrow-down', label: 'Lançar despesa', sub: 'saída financeira', rota: '/lancamentos' },
                { icon: 'ti-circle-arrow-up', label: 'Lançar entrada', sub: 'receita ou doação', rota: '/lancamentos' },
                { icon: 'ti-receipt-2', label: 'Cobranças', sub: 'boletos e promessas', rota: '/cobrancas' },
              ].map(a => (
                <button key={a.label} onClick={() => navigate(a.rota)}
                  style={{ background: 'rgba(255,255,255,0.8)', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: '10px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'border-color .12s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = AG_BLUE}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#E8E6DE'}>
                  <i className={`ti ${a.icon}`} style={{ fontSize: 18, color: AG_BLUE }} />
                  <span style={{ fontSize: 10.5, fontWeight: 500, color: '#2C2C2A', textAlign: 'center', lineHeight: 1.25 }}>{a.label}</span>
                  <span style={{ fontSize: 9.5, color: '#B4B2A9', textAlign: 'center', lineHeight: 1.2 }}>{a.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ATENDIMENTOS RECENTES */}
          <div style={{ ...cardStyle }}>
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
                <div style={{ fontSize: 12, color: '#B4B2A9' }}>Nenhum atendimento registrado</div>
                <button onClick={() => navigate('/atendimentos')}
                  style={{ marginTop: 10, fontSize: 11, padding: '6px 12px', borderRadius: 8, border: 'none', background: AG_BLUE, color: '#fff', cursor: 'pointer' }}>
                  Registrar agora
                </button>
              </div>
            ) : atendimentosRecentes.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < atendimentosRecentes.length - 1 ? '0.5px solid #F1EFE8' : 'none' }}>
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
