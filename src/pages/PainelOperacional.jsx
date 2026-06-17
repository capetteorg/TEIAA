import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'

const AG_BLUE = '#0E7EA8'
const AG_DARK = '#06344F'
const AG_GREEN = '#6BBF2B'
const AG_ORANGE = '#F4821F'
const TOPBAR_H = 62

export default function PainelOperacional() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const isMobile = useIsMobile()
  const [dados, setDados] = useState({ usuarios: 0, ativos: 0, teacolher: 0, agendadosHoje: 0, pendentesFinalizar: 0, realizadosMes: 0 })
  const [usuariosRecentes, setUsuariosRecentes] = useState([])
  const [agendaHoje, setAgendaHoje] = useState([])
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function carregar() {
      setLoading(true)
      const hoje = new Date().toISOString().slice(0, 10)
      const inicioMes = hoje.slice(0, 8) + '01'

      const [usuariosTotal, usuariosAtivos, listaProjetos, recentes] = await Promise.all([
        supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }),
        supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('situacao', 'ativo'),
        supabase.from('projetos').select('id,nome').eq('aceita_atendimentos', true).order('nome'),
        supabase.from('usuarios_atendidos')
          .select('id,nome,situacao,projeto_id,data_ingresso,criado_em')
          .order('criado_em', { ascending:false })
          .limit(6),
      ])

      if (!mounted) return

      const projetosData = listaProjetos.data || []
      const projetoTeacolher = projetosData.find(p => String(p.nome || '').toLowerCase().includes('teacolher'))
      let totalTeacolher = 0
      let agendadosHoje = 0
      let pendentesFinalizar = 0
      let realizadosMes = 0
      let agenda = []

      if (projetoTeacolher?.id) {
        const [uTea, agHoje, pendentes, realizados, agendaLista] = await Promise.all([
          supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoTeacolher.id),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoTeacolher.id).eq('data_atend', hoje).in('situacao', ['agendado', 'reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoTeacolher.id).lte('data_atend', hoje).in('situacao', ['agendado', 'reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoTeacolher.id).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos').select('id,data_atend,pessoa_atendida,usuario_atendido_id,profissional_id,tipo_atend,situacao').eq('projeto_id', projetoTeacolher.id).eq('data_atend', hoje).in('situacao', ['agendado', 'reagendado']).order('data_atend', { ascending:true }).limit(6),
        ])
        totalTeacolher = uTea.count || 0
        agendadosHoje = agHoje.count || 0
        pendentesFinalizar = pendentes.count || 0
        realizadosMes = realizados.count || 0
        agenda = agendaLista.data || []
      }

      if (!mounted) return
      setProjetos(projetosData)
      setDados({
        usuarios: usuariosTotal.count || 0,
        ativos: usuariosAtivos.count || 0,
        teacolher: totalTeacolher,
        agendadosHoje,
        pendentesFinalizar,
        realizadosMes,
      })
      setAgendaHoje(agenda)
      setUsuariosRecentes(recentes.data || [])
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = perfil?.nome?.split(' ')[0] || ''
  const nomeProjeto = id => projetos.find(p => String(p.id) === String(id))?.nome || 'Sem projeto'

  const card = {
    background: 'rgba(255,255,255,0.92)',
    border: '0.5px solid #E8E6DE',
    borderRadius: 14,
    boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
    padding: '14px 16px',
  }

  const acao = (titulo, desc, icon, cor, onClick) => (
    <button onClick={onClick}
      style={{ width:'100%', background:'rgba(255,255,255,0.92)', border:'0.5px solid rgba(14,126,168,0.18)', borderRadius:14, padding:'16px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
      <div style={{ width:44, height:44, borderRadius:13, background:cor, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <i className={`ti ti-${icon}`} style={{ fontSize:22 }} />
      </div>
      <div>
        <div style={{ fontSize:14.5, fontWeight:800, color:AG_DARK }}>{titulo}</div>
        <div style={{ fontSize:12, color:'#5F5E5A', marginTop:2, lineHeight:1.35 }}>{desc}</div>
      </div>
    </button>
  )

  return (
    <div>
      <div style={{ height: TOPBAR_H, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: '2px solid #E8E6DE', flexShrink: 0 }}>
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt={perfil.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${perfil.foto_position || '50%'}` }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: perfil?.cor_avatar || AG_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {(perfil?.nome || 'U').slice(0,2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: AG_DARK, letterSpacing: '-.03em', lineHeight: 1 }}>
              {saudacao}{nome ? `, ${nome}` : ''}!
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} · operação TEAcolher
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => navigate('/atendimentos?novo=1')}
            style={{ padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 11 : 12, fontWeight: 800, borderRadius: 9, border: 'none', background: AG_BLUE, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-calendar-plus" /> Agendar
          </button>
          {!isMobile && (
            <button onClick={() => navigate('/atendimentos?situacao=agendado')}
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 9, border: '0.5px solid rgba(244,130,31,0.35)', background: 'rgba(244,130,31,0.08)', color: '#854F0B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-checkup-list" /> Finalizar
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: isMobile ? '12px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, borderLeft: '3px solid rgba(14,126,168,.45)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: AG_DARK, marginBottom: 4 }}>Painel operacional TEAcolher</div>
          <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.45 }}>
            Use este painel como fluxo de trabalho: cadastre a família, agende o atendimento e depois finalize com o resultado técnico.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6,1fr)', gap: 10 }}>
          {[
            { label: 'Usuários TEAcolher', val: loading ? '...' : dados.teacolher, cor: AG_DARK },
            { label: 'Ativos', val: loading ? '...' : dados.ativos, cor: AG_BLUE },
            { label: 'Hoje', val: loading ? '...' : dados.agendadosHoje, cor: AG_DARK },
            { label: 'A finalizar', val: loading ? '...' : dados.pendentesFinalizar, cor: AG_ORANGE },
            { label: 'Realizados no mês', val: loading ? '...' : dados.realizadosMes, cor: AG_GREEN },
            { label: 'Total usuários', val: loading ? '...' : dados.usuarios, cor: '#888780' },
          ].map(k => (
            <div key={k.label} style={{ ...card, position: 'relative', overflow: 'hidden', padding:'12px 14px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.cor }} />
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6C7A86', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 23, fontWeight: 800, color: k.cor, letterSpacing: '-.03em' }}>{k.val}</div>
            </div>
          ))}
        </div>

        <div style={{ ...card, background:'rgba(14,126,168,0.045)', borderColor:'rgba(14,126,168,0.16)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#7C8A96', marginBottom: 12 }}>O que você vai fazer agora?</div>
          <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3, 1fr)', gap:10 }}>
            {acao('Agendar atendimento', 'Marca data, usuário/família, profissional, etapa e área do TEAcolher.', 'calendar-plus', AG_BLUE, () => navigate('/atendimentos?novo=1'))}
            {acao('Finalizar atendimento', 'Registra comparecimento, evolução, encaminhamento e próxima ação.', 'checkup-list', AG_ORANGE, () => navigate('/atendimentos?situacao=agendado'))}
            {acao('Cadastrar usuário/família', 'Inclui o usuário do Projeto TEAcolher e libera o Anexo I.', 'user-plus', AG_DARK, () => navigate('/usuarios-atendidos'))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 14, alignItems: 'start' }}>
          <div style={{ ...card }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9' }}>Agenda de hoje</div>
                <div style={{ fontSize:12, color:'#5F5E5A', marginTop:2 }}>Atendimentos agendados para finalizar depois.</div>
              </div>
              <button onClick={() => navigate('/atendimentos')} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #D3D1C7', background: '#fff', color: '#5F5E5A', cursor: 'pointer' }}>Ver agenda</button>
            </div>
            {loading ? (
              <div style={{ color:'#B4B2A9', fontSize:12, padding:'1rem 0' }}>Carregando...</div>
            ) : agendaHoje.length === 0 ? (
              <div style={{ textAlign:'center', padding:'1.25rem 0', color:'#888780', fontSize:12 }}>
                Nenhum atendimento agendado para hoje.
                <div><button onClick={() => navigate('/atendimentos?novo=1')} style={{ marginTop:10, padding:'7px 16px', borderRadius:8, border:'none', background:AG_BLUE, color:'#fff', fontWeight:700, cursor:'pointer' }}>+ Agendar atendimento</button></div>
              </div>
            ) : agendaHoje.map((a, i) => (
              <div key={a.id} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'9px 0', borderBottom:i < agendaHoje.length - 1 ? '0.5px solid #F1EFE8' : 'none' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#2C2C2A' }}>{a.pessoa_atendida || 'Usuário cadastrado'}</div>
                  <div style={{ fontSize:10.5, color:'#888780', marginTop:2 }}>{a.tipo_atend || 'Atendimento'} · {fmtData(a.data_atend)}</div>
                </div>
                <button onClick={() => navigate('/atendimentos?situacao=agendado')} style={{ flexShrink:0, fontSize:10, padding:'5px 9px', borderRadius:7, border:'none', background:AG_GREEN, color:'#fff', cursor:'pointer', fontWeight:700 }}>Finalizar</button>
              </div>
            ))}
          </div>

          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9' }}>Últimos usuários</div>
              <button onClick={() => navigate('/usuarios-atendidos')} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>Ver todos</button>
            </div>
            {loading ? (
              <div style={{ color: '#B4B2A9', fontSize: 12, padding: '1rem 0', textAlign: 'center' }}>Carregando...</div>
            ) : usuariosRecentes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <i className="ti ti-users" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: '#B4B2A9' }}>Nenhum usuário cadastrado</div>
              </div>
            ) : usuariosRecentes.map((u, i) => (
              <div key={u.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: i < usuariosRecentes.length - 1 ? '0.5px solid #F1EFE8' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome || '—'}</div>
                  <div style={{ fontSize: 10.5, color: '#888780', marginTop: 1 }}>{nomeProjeto(u.projeto_id)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontSize: 10.5, color: '#888780' }}>{fmtData(u.data_ingresso)}</div>
                  <div style={{ fontSize: 10, color: u.situacao === 'ativo' ? '#3B6D11' : '#888780', marginTop: 1 }}>{u.situacao || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
