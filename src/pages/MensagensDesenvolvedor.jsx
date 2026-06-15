import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPOS = {
  sugestao: { label: 'Sugestão', emoji: '💡', bg: '#E6F1FB', cor: '#0E7EA8' },
  problema: { label: 'Problema', emoji: '🐛', bg: '#FEF2F2', cor: '#A32D2D' },
  duvida:   { label: 'Dúvida',   emoji: '❓', bg: '#FFF6ED', cor: '#854F0B' },
  elogio:   { label: 'Elogio',   emoji: '⭐', bg: '#EAF3DE', cor: '#3B6D11' },
}

export default function MensagensDesenvolvedor() {
  const [mensagens, setMensagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [expandida, setExpandida] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('mensagens_desenvolvedor')
      .select('*')
      .order('criado_em', { ascending: false })
    setMensagens(data || [])
    setLoading(false)
  }

  async function marcarLida(id, lida) {
    await supabase.from('mensagens_desenvolvedor').update({ lida }).eq('id', id)
    setMensagens(prev => prev.map(m => m.id === id ? { ...m, lida } : m))
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta mensagem?')) return
    await supabase.from('mensagens_desenvolvedor').delete().eq('id', id)
    setMensagens(prev => prev.filter(m => m.id !== id))
  }

  const fmtData = d => new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const filtradas = mensagens.filter(m =>
    filtro === 'todas' ? true :
    filtro === 'nao_lidas' ? !m.lida :
    m.tipo === filtro
  )

  const naoLidas = mensagens.filter(m => !m.lida).length

  const card = {
    background: 'rgba(255,255,255,0.92)',
    border: '0.5px solid #E8E6DE',
    borderRadius: 14,
    boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
  }

  return (
    <div>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>
            Mensagens dos usuários
          </div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>
            {mensagens.length} mensagens · {naoLidas} não lidas
          </div>
        </div>
        {naoLidas > 0 && (
          <button onClick={async () => {
            await supabase.from('mensagens_desenvolvedor').update({ lida: true }).eq('lida', false)
            setMensagens(prev => prev.map(m => ({ ...m, lida: true })))
          }} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 9, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { val: 'todas',     label: `Todas (${mensagens.length})` },
            { val: 'nao_lidas', label: `Não lidas (${naoLidas})` },
            ...Object.entries(TIPOS).map(([val, { emoji, label }]) => ({
              val, label: `${emoji} ${label}`
            }))
          ].map(f => (
            <button key={f.val} onClick={() => setFiltro(f.val)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                border: '0.5px solid ' + (filtro === f.val ? '#0E7EA8' : '#D3D1C7'),
                background: filtro === f.val ? '#0E7EA8' : 'transparent',
                color: filtro === f.val ? '#fff' : '#5F5E5A' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#B4B2A9' }}>Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ ...card, padding: 40, textAlign: 'center', color: '#B4B2A9' }}>
            <i className="ti ti-message-off" style={{ fontSize: 32, display: 'block', marginBottom: 12 }} />
            Nenhuma mensagem encontrada
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtradas.map(m => {
              const tipo = TIPOS[m.tipo] || TIPOS.sugestao
              const aberta = expandida === m.id
              return (
                <div key={m.id} style={{ ...card, opacity: m.lida ? 0.75 : 1,
                  borderLeft: m.lida ? '0.5px solid #E8E6DE' : '3px solid #0E7EA8' }}>
                  
                  {/* Cabeçalho */}
                  <div onClick={() => {
                    setExpandida(aberta ? null : m.id)
                    if (!m.lida) marcarLida(m.id, true)
                  }} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                    
                    {/* Tipo badge */}
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, fontWeight: 600,
                      background: tipo.bg, color: tipo.cor, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {tipo.emoji} {tipo.label}
                    </span>

                    {/* Remetente */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: m.lida ? 400 : 600, color: '#2C2C2A',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.usuario_nome || 'Usuário desconhecido'}
                      </div>
                      {!aberta && (
                        <div style={{ fontSize: 11, color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                          {m.mensagem}
                        </div>
                      )}
                    </div>

                    {/* Data e não lida */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, color: '#B4B2A9', whiteSpace: 'nowrap' }}>
                        {fmtData(m.criado_em)}
                      </div>
                      {!m.lida && (
                        <div style={{ fontSize: 9, color: '#0E7EA8', fontWeight: 700, marginTop: 2 }}>NOVA</div>
                      )}
                    </div>

                    <i className={`ti ti-chevron-${aberta ? 'up' : 'down'}`}
                      style={{ fontSize: 13, color: '#B4B2A9', flexShrink: 0 }} />
                  </div>

                  {/* Conteúdo expandido */}
                  {aberta && (
                    <div style={{ padding: '0 16px 14px' }}>
                      <div style={{ background: '#FAFAF8', border: '0.5px solid #E8E6DE', borderRadius: 10,
                        padding: '12px 14px', fontSize: 13, color: '#2C2C2A', lineHeight: 1.6, marginBottom: 12,
                        whiteSpace: 'pre-wrap' }}>
                        {m.mensagem}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => marcarLida(m.id, !m.lida)}
                          style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7,
                            border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>
                          {m.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                        </button>
                        <button onClick={() => excluir(m.id)}
                          style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7,
                            border: '0.5px solid rgba(163,45,45,0.2)', background: 'transparent', color: '#A32D2D', cursor: 'pointer' }}>
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
