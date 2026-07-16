import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import ProntuarioUsuario from '../components/ProntuarioUsuario'

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
  const [mensagensDev, setMensagensDev] = useState([])
  const [recadosAdmin, setRecadosAdmin] = useState([])
  const [prontuarioDe, setProntuarioDe] = useState(null)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    const [
      { count: pendAbertas },
      { count: totalAtendidos },
      { count: atendimentosHoje },
    ] = await Promise.all([
      supabase.from('pendencias').select('id', { count:'exact', head:true }).eq('resolvida', false),
      supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('ativo', true),
      supabase.from('atendimentos').select('id', { count:'exact', head:true }).eq('data', new Date().toISOString().slice(0,10)),
    ])

    // Buscar mensagens do desenvolvedor
    const { data: msgs } = await supabase.from('mensagens_desenvolvedor')
      .select('*').order('criado_em', { ascending: false }).limit(20)
    setMensagensDev(msgs || [])

    // Recados da equipe em aberto (coordenação acompanha todos)
    try {
      const { data: recs } = await supabase.from('prontuario_recados').select('*')
        .eq('status', 'aberto').is('parent_id', null)
        .order('created_at', { ascending: false }).limit(30)
      let lista = recs || []
      if (lista.length) {
        const ids = [...new Set(lista.map(r => r.usuario_atendido_id))]
        const { data: usrs } = await supabase.from('usuarios_atendidos').select('id,nome').in('id', ids)
        lista = lista.map(r => ({ ...r, usuario_nome: (usrs || []).find(u => String(u.id) === String(r.usuario_atendido_id))?.nome || 'Usuário' }))
      }
      setRecadosAdmin(lista)
    } catch { /* tabela de recados pode ainda não existir */ }

    setDados({
      pendAbertas: pendAbertas || 0,
      totalAtendidos: totalAtendidos || 0,
      atendimentosHoje: atendimentosHoje || 0,
    })
  }

  const d = dados

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
          <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }))} style={{ padding: '7px 14px', border: '0.5px solid #D3D1C7', borderRadius: 10, fontSize: 12, color: '#5F5E5A', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-search" /> Busca rápida Ctrl+K
          </button>
          <button onClick={() => navigate('/relatorios')} style={{ padding: '7px 14px', border: '0.5px solid #D3D1C7', borderRadius: 10, fontSize: 12, color: '#5F5E5A', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-report-analytics" /> Relatórios
          </button>
          <button onClick={() => navigate('/atendimentos')} style={{ padding: '7px 14px', border: 'none', borderRadius: 10, fontSize: 12, color: '#fff', background: '#0E7EA8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, boxShadow: '0 4px 12px rgba(14,126,168,.22)' }}>
            <i className="ti ti-plus" /> Novo atendimento
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPIs TEAcolher */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'Usuários ativos', val: d?.totalAtendidos ?? '—', sub: 'cadastrados no TEAcolher', cor: '#06344F', barra: AG_BLUE, rota: '/usuarios-atendidos' },
            { label: 'Atendimentos hoje', val: d?.atendimentosHoje ?? '—', sub: new Date().toLocaleDateString('pt-BR',{weekday:'long'}), cor: '#0E7EA8', barra: AG_BLUE, rota: '/atendimentos' },
            { label: 'Pendências abertas', val: d?.pendAbertas ?? '—', sub: 'aguardando resolução', cor: (d?.pendAbertas||0) > 0 ? '#854F0B' : '#3B6D11', barra: (d?.pendAbertas||0) > 0 ? '#F4821F' : '#96C11F', rota: '/pendencias' },
          ].map(k => (
            <div key={k.label} onClick={() => navigate(k.rota)} style={{ ...cardStyle, padding: '14px 16px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.barra }} />
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6C7A86', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: k.cor, letterSpacing: '-.03em' }}>{k.val}</div>
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
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 14 }}>
                Ações rápidas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { grupo: 'TEAcolher', itens: [
                    { icon: 'clipboard-list',   label: 'Atendimentos',    sub: 'agenda completa',    rota: '/atendimentos' },
                    { icon: 'users',            label: 'Usuários',        sub: 'cadastro e fichas',  rota: '/usuarios-atendidos' },
                    { icon: 'users-group',      label: 'Equipe',          sub: 'profissionais',      rota: '/equipe' },
                    { icon: 'clipboard-check',  label: 'Plano de Ação',   sub: 'metas e atividades', rota: '/planos-execucao' },
                  ]},
                  { grupo: 'Gestão', itens: [
                    { icon: 'alert-triangle',   label: 'Pendências',      sub: 'resolver',           rota: '/pendencias', badge: d?.pendAbertas },
                    { icon: 'report-analytics', label: 'Relatórios',      sub: 'central',            rota: '/relatorios' },
                    { icon: 'file-certificate', label: 'Prestação',       sub: 'de contas',          rota: '/prestacao-contas' },
                    { icon: 'settings',         label: 'Configurações',   sub: 'sistema',            rota: '/configuracoes' },
                  ]},
                ].map(g => (
                  <div key={g.grupo}>
                    <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 8, paddingBottom: 5, borderBottom: '0.5px solid #E8E6DE' }}>{g.grupo}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      {g.itens.map(item => (
                        <button key={item.rota} onClick={() => navigate(item.rota)} className="acao-rapida"
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

            {/* RECADOS DA EQUIPE */}
            {recadosAdmin.length > 0 && (
              <div style={{ ...cardStyle, padding: 18, borderLeft: '3px solid #F4821F' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#854F0B', marginBottom: 12 }}>
                  📬 Recados da equipe em aberto ({recadosAdmin.length})
                </div>
                {recadosAdmin.slice(0, 6).map((r, i) => (
                  <button key={r.id} onClick={() => setProntuarioDe({ id: r.usuario_atendido_id, nome: r.usuario_nome })}
                    style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '9px 0', borderBottom: i < Math.min(recadosAdmin.length, 6) - 1 ? '0.5px solid #F1EFE8' : 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2C2C2A' }}>
                        {r.usuario_nome}
                        <span style={{ fontWeight: 400, color: '#888780' }}> · {r.de_nome || 'equipe'} → {r.para_profissional_id ? 'profissional' : (r.para_area || 'equipe toda')}</span>
                      </span>
                      <span style={{ fontSize: 9.5, color: '#B4B2A9', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#5F5E5A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.texto}</div>
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* COLUNA DIREITA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ACESSO ADMIN */}
            <div style={{ ...cardStyle, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 10 }}>Acesso rápido</div>
              {[
                { icon: 'folder',           label: 'Projetos',      sub: 'cadastro e status',         rota: '/projetos' },
                { icon: 'building',         label: 'Instituição',   sub: 'dados da TEIAA',            rota: '/instituicao' },
                { icon: 'user-cog',         label: 'Usuários',      sub: 'contas e perfis',           rota: '/usuarios' },
                { icon: 'database-export',  label: 'Backup',        sub: 'exportar dados',            rota: '/backup' },
              ].map(item => (
                <div key={item.label} onClick={() => navigate(item.rota)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '0.5px solid #F1EFE8', cursor: 'pointer' }}>
                  <i className={`ti ti-${item.icon}`} style={{ fontSize: 14, color: '#0E7EA8', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#2C2C2A' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#888780', marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ fontSize: 12, color: '#D3D1C7' }} />
                </div>
              ))}
            </div>

            {/* MENSAGENS DO DESENVOLVEDOR */}
            {mensagensDev.length > 0 && (
              <div style={{ ...cardStyle, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  Mensagens dos usuários
                  <span style={{ background:'#0E7EA8', color:'#fff', fontSize:9, fontWeight:700, borderRadius:99, padding:'1px 6px' }}>{mensagensDev.filter(m=>!m.lida).length} novas</span>
                </div>
                {mensagensDev.slice(0,5).map(m => (
                  <div key={m.id} onClick={async () => {
                    await supabase.from('mensagens_desenvolvedor').update({ lida: true }).eq('id', m.id)
                    setMensagensDev(prev => prev.map(x => x.id===m.id ? {...x, lida:true} : x))
                  }} style={{ padding:'8px 0', borderBottom:'0.5px solid #F1EFE8', cursor:'pointer', opacity: m.lida ? 0.6 : 1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ fontSize:9, padding:'1px 6px', borderRadius:99, background: m.tipo==='problema'?'#FEF2F2':m.tipo==='elogio'?'#EAF3DE':m.tipo==='duvida'?'#FFF6ED':'#E6F1FB', color: m.tipo==='problema'?'#A32D2D':m.tipo==='elogio'?'#3B6D11':m.tipo==='duvida'?'#854F0B':'#0E7EA8' }}>
                          {m.tipo==='sugestao'?'💡':m.tipo==='problema'?'🐛':m.tipo==='duvida'?'❓':'⭐'} {m.tipo}
                        </span>
                        <span style={{ fontSize:10, fontWeight:500, color:'#2C2C2A' }}>{m.usuario_nome}</span>
                      </div>
                      <span style={{ fontSize:9, color:'#B4B2A9', whiteSpace:'nowrap' }}>{new Date(m.criado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#5F5E5A', lineHeight:1.4 }}>{m.mensagem}</div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

      {prontuarioDe && (
        <ProntuarioUsuario
          usuario={prontuarioDe}
          onClose={() => { setProntuarioDe(null); carregarDados() }}
          podeEditar
          abaInicial="equipe"
        />
      )}

      <style>{`
        .acao-rapida:hover { border-color: #0E7EA8 !important; background: rgba(14,126,168,0.05) !important; }
      `}</style>
    </div>
  )
}
