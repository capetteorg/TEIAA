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
  const [dados, setDados] = useState({ total: 0, ativos: 0, teacolher: 0 })
  const [usuariosRecentes, setUsuariosRecentes] = useState([])
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function carregar() {
      setLoading(true)

      const [usuariosTotal, usuariosAtivos, listaProjetos, recentes] = await Promise.all([
        supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }),
        supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('situacao', 'ativo'),
        supabase.from('projetos').select('id,nome').eq('aceita_atendimentos', true).order('nome'),
        supabase.from('usuarios_atendidos')
          .select('id,nome,situacao,projeto_id,data_ingresso,criado_em')
          .order('criado_em', { ascending:false })
          .limit(8),
      ])

      if (!mounted) return

      const projetosData = listaProjetos.data || []
      const projetoTeacolher = projetosData.find(p => String(p.nome || '').toLowerCase().includes('teacolher'))
      let totalTeacolher = 0

      if (projetoTeacolher?.id) {
        const { count } = await supabase.from('usuarios_atendidos')
          .select('id', { count:'exact', head:true })
          .eq('projeto_id', projetoTeacolher.id)
        totalTeacolher = count || 0
      }

      if (!mounted) return

      setProjetos(projetosData)
      setDados({
        total: usuariosTotal.count || 0,
        ativos: usuariosAtivos.count || 0,
        teacolher: totalTeacolher,
      })
      setUsuariosRecentes(recentes.data || [])
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
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
            <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.03em', lineHeight: 1 }}>
              {saudacao}{nome ? `, ${nome}` : ''}!
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} · acesso operacional restrito
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => navigate('/usuarios-atendidos')}
            style={{ padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 11 : 12, fontWeight: 700, borderRadius: 9, border: 'none', background: AG_BLUE, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-user-plus" /> Cadastrar usuário
          </button>
          <button onClick={() => navigate('/atendimentos')}
            style={{ padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 11 : 12, fontWeight: 700, borderRadius: 9, border: '0.5px solid rgba(14,126,168,0.25)', background: 'rgba(14,126,168,0.08)', color: '#06344F', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-clipboard-plus" /> Atendimento
          </button>
          {!isMobile && (
            <button onClick={() => navigate('/usuarios-atendidos')}
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 9, border: '0.5px solid #D3D1C7', background: 'rgba(255,255,255,0.8)', color: '#5F5E5A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-users" /> Ver usuários
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: isMobile ? '12px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, borderLeft: '3px solid rgba(14,126,168,.45)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#06344F', marginBottom: 4 }}>Painel operacional da TEIAA</div>
          <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.45 }}>
            Este perfil está liberado para cadastrar, editar e consultar usuários atendidos, registrar atendimentos do Projeto TEAcolher e imprimir o Anexo I quando disponível.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Usuários ativos', val: loading ? '...' : dados.ativos, cor: '#06344F' },
            { label: 'Total de usuários', val: loading ? '...' : dados.total, cor: AG_BLUE },
            { label: 'Projeto TEAcolher', val: loading ? '...' : dados.teacolher, cor: '#3B6D11' },
          ].map(k => (
            <div key={k.label} style={{ ...card, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: AG_BLUE }} />
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6C7A86', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.cor, letterSpacing: '-.03em' }}>{k.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 14, alignItems: 'start' }}>
          <div style={{ ...card }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 14 }}>
              Função disponível
            </div>
            <button onClick={() => navigate('/usuarios-atendidos')}
              style={{ width: '100%', background: 'rgba(14,126,168,0.06)', border: '0.5px solid rgba(14,126,168,0.25)', borderRadius: 12, padding: '18px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: AG_BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-users" style={{ fontSize: 22 }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#06344F' }}>Usuários atendidos</div>
                <div style={{ fontSize: 12, color: '#5F5E5A', marginTop: 2 }}>Cadastrar, editar, consultar cadastro geral e imprimir Anexo I do TEAcolher.</div>
              </div>
            </button>
            <button onClick={() => navigate('/usuarios-atendidos')}
              style={{ marginTop: 10, width: '100%', background: AG_BLUE, border: 'none', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className="ti ti-user-plus" /> + Cadastrar usuário atendido
            </button>
            <button onClick={() => navigate('/atendimentos')}
              style={{ marginTop: 8, width: '100%', background: '#06344F', border: 'none', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className="ti ti-clipboard-plus" /> + Registrar atendimento TEAcolher
            </button>
          </div>

          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9' }}>Últimos cadastros</div>
              <button onClick={() => navigate('/usuarios-atendidos')}
                style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>
                Ver todos
              </button>
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
    </div>
  )
}
