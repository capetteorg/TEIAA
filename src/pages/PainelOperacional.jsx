import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'

const AG_BLUE = '#0E7EA8'
const DARK = '#06344F'
const GREEN = '#6BBF2B'
const ORANGE = '#F4821F'
const RED = '#E8212A'
const TOPBAR_H = 62

export default function PainelOperacional() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const isMobile = useIsMobile()
  const [dados, setDados] = useState({ usuarios: 0, ativos: 0, teacolher: 0, hoje: 0, finalizar: 0, realizadosMes: 0 })
  const [usuariosRecentes, setUsuariosRecentes] = useState([])
  const [agenda, setAgenda] = useState([])
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
      const projetoTea = projetosData.find(p => String(p.nome || '').toLowerCase().includes('teacolher'))
      let totalTea = 0
      let agendaHoje = 0
      let pendentesFinalizar = 0
      let realizadosMes = 0
      let agendaData = []

      if (projetoTea?.id) {
        const [countTea, agendaHojeRes, finalizarRes, realizadosRes, listaAgenda] = await Promise.all([
          supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoTea.id),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoTea.id).eq('data_atend', hoje).in('situacao', ['agendado', 'reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoTea.id).lte('data_atend', hoje).in('situacao', ['agendado', 'reagendado']),
          supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('projeto_id', projetoTea.id).gte('data_atend', inicioMes).eq('situacao', 'realizado'),
          supabase.from('atendimentos')
            .select('id,data_atend,hora_inicio,pessoa_atendida,usuario_atendido_id,profissional_id,etapa_fluxo,tipo_atend,situacao')
            .eq('projeto_id', projetoTea.id)
            .order('data_atend', { ascending:true })
            .order('hora_inicio', { ascending:true })
            .limit(8),
        ])
        totalTea = countTea.count || 0
        agendaHoje = agendaHojeRes.count || 0
        pendentesFinalizar = finalizarRes.count || 0
        realizadosMes = realizadosRes.count || 0
        agendaData = listaAgenda.data || []
      }

      if (!mounted) return
      setProjetos(projetosData)
      setUsuariosRecentes(recentes.data || [])
      setAgenda(agendaData)
      setDados({
        usuarios: usuariosTotal.count || 0,
        ativos: usuariosAtivos.count || 0,
        teacolher: totalTea,
        hoje: agendaHoje,
        finalizar: pendentesFinalizar,
        realizadosMes,
      })
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtHora = h => h ? String(h).slice(0, 5) : '—'
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

  const btnPrincipal = {
    width: '100%', border: 'none', borderRadius: 12, padding: '15px 16px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: '#fff', fontWeight: 700,
  }

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
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK, letterSpacing: '-.03em', lineHeight: 1 }}>
              {saudacao}{nome ? `, ${nome}` : ''}!
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
              Fluxo operacional do Projeto TEAcolher
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => navigate('/atendimentos?novo=1')} style={{ padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 11 : 12, fontWeight: 700, borderRadius: 9, border: 'none', background: AG_BLUE, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-calendar-plus" /> Agendar
          </button>
          {!isMobile && (
            <button onClick={() => navigate('/atendimentos?situacao=agendado')} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 9, border: '0.5px solid rgba(244,130,31,0.3)', background: 'rgba(244,130,31,0.08)', color: '#854F0B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-checkup-list" /> Finalizar
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: isMobile ? '12px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, borderLeft: '3px solid rgba(14,126,168,.45)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 4 }}>O que fazer agora?</div>
          <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.45 }}>
            Primeiro cadastre o usuário/família. Depois agende o atendimento. Após a realização, finalize o registro técnico para alimentar a prestação de contas do TEAcolher.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: 'Usuários TEAcolher', val: loading ? '...' : dados.teacolher, cor: DARK },
            { label: 'Agenda de hoje', val: loading ? '...' : dados.hoje, cor: AG_BLUE },
            { label: 'A finalizar', val: loading ? '...' : dados.finalizar, cor: ORANGE },
            { label: 'Realizados no mês', val: loading ? '...' : dados.realizadosMes, cor: GREEN },
          ].map(k => (
            <div key={k.label} style={{ ...card, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.cor }} />
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6C7A86', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.cor, letterSpacing: '-.03em' }}>{k.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, alignItems: 'start' }}>
          <div style={{ ...card }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 14 }}>Fluxo principal</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <button onClick={() => navigate('/usuarios-atendidos')} style={{ ...btnPrincipal, background: AG_BLUE }}>
                <i className="ti ti-user-plus" style={{ fontSize: 23 }} />
                <div><div>Cadastrar usuário/família</div><div style={{ fontSize: 11, opacity: .85, fontWeight: 500 }}>Inscrição e dados do público atendido</div></div>
              </button>
              <button onClick={() => navigate('/atendimentos?novo=1')} style={{ ...btnPrincipal, background: DARK }}>
                <i className="ti ti-calendar-plus" style={{ fontSize: 23 }} />
                <div><div>Agendar atendimento TEAcolher</div><div style={{ fontSize: 11, opacity: .85, fontWeight: 500 }}>Data, horário, profissional, etapa e objetivo</div></div>
              </button>
              <button onClick={() => navigate('/atendimentos?situacao=agendado')} style={{ ...btnPrincipal, background: ORANGE }}>
                <i className="ti ti-check" style={{ fontSize: 23 }} />
                <div><div>Finalizar atendimento realizado</div><div style={{ fontSize: 11, opacity: .9, fontWeight: 500 }}>Evolução, comparecimento, encaminhamento e próxima ação</div></div>
              </button>
              <button onClick={() => navigate('/atendimentos')} style={{ ...btnPrincipal, background: GREEN }}>
                <i className="ti ti-report-analytics" style={{ fontSize: 23 }} />
                <div><div>Ver agenda e execução</div><div style={{ fontSize: 11, opacity: .9, fontWeight: 500 }}>Base da prestação de contas técnica</div></div>
              </button>
            </div>
          </div>

          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9' }}>Agenda e pendências</div>
              <button onClick={() => navigate('/atendimentos')} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>Ver tudo</button>
            </div>
            {loading ? (
              <div style={{ color: '#B4B2A9', fontSize: 12, padding: '1rem 0', textAlign: 'center' }}>Carregando...</div>
            ) : agenda.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <i className="ti ti-calendar" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: '#B4B2A9' }}>Nenhum atendimento na agenda</div>
              </div>
            ) : agenda.map((a, i) => (
              <div key={a.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < agenda.length - 1 ? '0.5px solid #F1EFE8' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.pessoa_atendida || 'Usuário/família'}</div>
                  <div style={{ fontSize: 10.5, color: '#888780', marginTop: 1 }}>{a.etapa_fluxo || a.tipo_atend || 'Atendimento'} · {fmtData(a.data_atend)} {fmtHora(a.hora_inicio)}</div>
                </div>
                <button onClick={() => navigate('/atendimentos?situacao=' + encodeURIComponent(a.situacao || 'agendado'))} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, border:'none', background: a.situacao === 'realizado' ? '#EAF3DE' : '#E6F1FB', color: a.situacao === 'realizado' ? '#3B6D11' : '#185FA5', cursor:'pointer' }}>
                  {a.situacao || '—'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9' }}>Últimos usuários cadastrados</div>
            <button onClick={() => navigate('/usuarios-atendidos')} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>Ver usuários</button>
          </div>
          {usuariosRecentes.length === 0 ? (
            <div style={{ fontSize:12, color:'#888780', textAlign:'center', padding:'1rem 0' }}>Nenhum usuário cadastrado</div>
          ) : usuariosRecentes.map((u, i) => (
            <div key={u.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: i < usuariosRecentes.length - 1 ? '0.5px solid #F1EFE8' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome || '—'}</div>
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
  )
}
