import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const CORES = [
  { val: '#0E7EA8', label: 'Azul AGENDO' },
  { val: '#3B6D11', label: 'Verde' },
  { val: '#854F0B', label: 'Âmbar' },
  { val: '#A32D2D', label: 'Vermelho' },
  { val: '#5B3FA8', label: 'Roxo' },
  { val: '#1A6B5A', label: 'Esmeralda' },
]

const PERFIS = {
  admin:       { label: 'Administrador', desc: 'Acesso total ao sistema' },
  diretoria:   { label: 'Diretoria',     desc: 'Visualização financeira e relatórios' },
  operacional: { label: 'Operacional',   desc: 'Atendimentos, doações e cobranças' },
}

export default function MinhaConta() {
  const { perfil: perfilAuth } = useAuth()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  // Formulários
  const [nome, setNome] = useState('')
  const [bio, setBio] = useState('')
  const [corAvatar, setCorAvatar] = useState('#0E7EA8')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const inputFotoRef = useRef()

  useEffect(() => { carregarPerfil() }, [])

  async function carregarPerfil() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Atualizar último acesso
    await supabase.from('usuarios').update({ ultimo_acesso: new Date().toISOString() }).eq('id', user.id)

    const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    if (data) {
      setDados(data)
      setNome(data.nome || '')
      setBio(data.bio || '')
      setCorAvatar(data.cor_avatar || '#0E7EA8')
      setFotoPosition(data.foto_position || '50%')
    }
    setLoading(false)
  }

  function showMsg(tipo, texto) {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg({ tipo: '', texto: '' }), 4000)
  }

  async function salvarPerfil() {
    setSalvando(true)
    const { error } = await supabase.from('usuarios').update({
      nome, bio, cor_avatar: corAvatar, foto_position: fotoPosition,
    }).eq('id', dados.id)

    if (error) showMsg('erro', 'Erro ao salvar: ' + error.message)
    else { showMsg('ok', '✓ Perfil atualizado!'); carregarPerfil() }
    setSalvando(false)
  }

  async function alterarSenha() {
    if (novaSenha !== confirmarSenha) { showMsg('erro', 'As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { showMsg('erro', 'Senha deve ter mínimo 6 caracteres.'); return }
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) showMsg('erro', 'Erro: ' + error.message)
    else {
      showMsg('ok', '✓ Senha alterada com sucesso!')
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('')
    }
    setSalvando(false)
  }

  async function uploadFoto(file) {
    if (!file || !dados) return
    setUploadingFoto(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${dados.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('usuarios-fotos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('usuarios-fotos').getPublicUrl(path)
      const { error: updErr } = await supabase.from('usuarios').update({ avatar_url: urlData.publicUrl }).eq('id', dados.id)
      if (updErr) throw updErr

      showMsg('ok', '✓ Foto atualizada!')
      carregarPerfil()
    } catch (e) {
      showMsg('erro', 'Erro ao fazer upload: ' + e.message)
    }
    setUploadingFoto(false)
  }

  async function removerFoto() {
    if (!dados?.avatar_url) return
    await supabase.from('usuarios').update({ avatar_url: null }).eq('id', dados.id)
    showMsg('ok', '✓ Foto removida.')
    carregarPerfil()
  }

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const fmtDataHora = d => d ? new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

  const input = { width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8, background: '#FAFAF8', boxSizing: 'border-box' }
  const label = { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 4 }
  const card = { background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '20px 24px', marginBottom: 14 }
  const cardTitle = { fontSize: 13, fontWeight: 600, color: '#06344F', marginBottom: 16, paddingBottom: 10, borderBottom: '0.5px solid #F1EFE8' }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#B4B2A9' }}>Carregando...</div>
  )

  const iniciais = (nome || dados?.nome || 'U').slice(0,2).toUpperCase()

  return (
    <div>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Minha conta</div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 720, margin: '0 auto' }}>

        {msg.texto && (
          <div style={{ fontSize: 12, padding: '8px 14px', borderRadius: 10, marginBottom: 14, background: msg.tipo === 'erro' ? '#FEF2F2' : '#EAF3DE', color: msg.tipo === 'erro' ? '#A32D2D' : '#3B6D11' }}>
            {msg.texto}
          </div>
        )}

        {/* FOTO + INFO RÁPIDA */}
        <div style={{ ...card, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Avatar grande */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: '3px solid #E8E6DE', position: 'relative' }}>
              {dados?.avatar_url ? (
                <img src={dados.avatar_url} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${fotoPosition}` }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: corAvatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff' }}>
                  {iniciais}
                </div>
              )}
              {uploadingFoto && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>
                  enviando...
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => inputFotoRef.current?.click()}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#0E7EA8', cursor: 'pointer' }}>
                {dados?.avatar_url ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              {dados?.avatar_url && (
                <button onClick={removerFoto}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '0.5px solid rgba(163,45,45,0.2)', background: 'transparent', color: '#A32D2D', cursor: 'pointer' }}>
                  Remover
                </button>
              )}
            </div>
            <input ref={inputFotoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => uploadFoto(e.target.files[0])} />
            {dados?.avatar_url && (
              <div style={{ marginTop: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#B4B2A9', marginBottom: 3 }}>Ajustar posição</div>
                <input type="range" min="0" max="100" value={parseInt(fotoPosition)||50}
                  onChange={e => setFotoPosition(e.target.value + '%')}
                  style={{ width: 88, accentColor: '#0E7EA8' }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', marginBottom: 2 }}>{dados?.nome}</div>
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 10 }}>{dados?.email}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: '#E6F1FB', color: '#0E7EA8', fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
              <i className="ti ti-shield-check" style={{ fontSize: 12 }} />
              {PERFIS[dados?.perfil]?.label || dados?.perfil} — {PERFIS[dados?.perfil]?.desc}
            </div>
            {dados?.bio && (
              <div style={{ fontSize: 12, color: '#5F5E5A', fontStyle: 'italic', marginBottom: 8 }}>"{dados.bio}"</div>
            )}
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#B4B2A9' }}>
              {dados?.criado_em && (
                <span><i className="ti ti-calendar" style={{ marginRight: 4 }} />Na CAPETTE desde {fmtData(dados.criado_em)}</span>
              )}
              {dados?.ultimo_acesso && (
                <span><i className="ti ti-clock" style={{ marginRight: 4 }} />Último acesso {fmtDataHora(dados.ultimo_acesso)}</span>
              )}
            </div>
          </div>
        </div>

        {/* EDITAR PERFIL */}
        <div style={card}>
          <div style={cardTitle}>Editar perfil</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Nome completo</label>
              <input value={nome} onChange={e => setNome(e.target.value)} style={input} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Bio curta <span style={{ color: '#B4B2A9' }}>(aparece no sistema)</span></label>
              <input value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Ex: Assistente social há 8 anos na CAPETTE"
                maxLength={80} style={input} />
              <div style={{ fontSize: 10, color: '#B4B2A9', marginTop: 3, textAlign: 'right' }}>{bio.length}/80</div>
            </div>
          </div>

          {/* Cor do avatar */}
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Cor do avatar <span style={{ color: '#B4B2A9' }}>(quando não tem foto)</span></label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CORES.map(cor => (
                <button key={cor.val} onClick={() => setCorAvatar(cor.val)} title={cor.label}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: cor.val, border: corAvatar === cor.val ? '3px solid #06344F' : '3px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border .15s' }}>
                  {corAvatar === cor.val && <i className="ti ti-check" style={{ fontSize: 14, color: '#fff' }} />}
                </button>
              ))}
              {/* Preview do avatar com a cor escolhida */}
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: corAvatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', marginLeft: 8, border: '2px solid #E8E6DE' }}>
                {iniciais}
              </div>
            </div>
          </div>

          <button onClick={salvarPerfil} disabled={salvando}
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 9, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {/* ALTERAR SENHA */}
        <div style={card}>
          <div style={cardTitle}>Alterar senha</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Senha atual</label>
              <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
                placeholder="••••••" style={input} />
            </div>
            <div>
              <label style={label}>Nova senha</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres" style={input} />
            </div>
            <div>
              <label style={label}>Confirmar nova senha</label>
              <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="••••••" style={input} />
            </div>
          </div>
          <button onClick={alterarSenha} disabled={salvando || !novaSenha}
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 9, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer', opacity: (salvando || !novaSenha) ? 0.6 : 1 }}>
            {salvando ? 'Alterando...' : 'Alterar senha'}
          </button>
          <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 8 }}>
            Ou prefere <button onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + '/nova-senha' })
                showMsg('ok', '✓ E-mail de redefinição enviado para ' + user.email)
              }
            }} style={{ background: 'none', border: 'none', color: '#0E7EA8', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
              receber um e-mail de redefinição
            </button>?
          </div>
        </div>

      </div>
    </div>
  )
}
