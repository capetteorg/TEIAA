import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function NovaSenha() {
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    if (senha.length < 6) { setMsg('A senha precisa ter no mínimo 6 caracteres.'); return }
    if (senha !== confirma) { setMsg('As senhas não conferem.'); return }
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
    setMsg('Senha alterada com sucesso! Redirecionando...')
    setTimeout(() => navigate('/painel'), 1200)
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #F8F7F2 0%, #EEF4E8 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 24px rgba(0,0,0,0.08)', padding:'2rem', width:'100%', maxWidth:380 }}>
        <div style={{ fontSize:17, fontWeight:600, color:'#2C2C2A', marginBottom:4 }}>Definir nova senha</div>
        <div style={{ fontSize:12, color:'#888780', marginBottom:'1.5rem' }}>Crie uma nova senha de acesso ao AGENDO Integra.</div>
        <form onSubmit={salvar} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Nova senha</label>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required minLength={6}
              placeholder="Mínimo 6 caracteres"
              style={{ width:'100%', fontSize:13, padding:'9px 10px', border:'0.5px solid #D3D1C7', borderRadius:8, background:'#FAFAF8', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 }}>Confirmar nova senha</label>
            <input type="password" value={confirma} onChange={e=>setConfirma(e.target.value)} required
              placeholder="Repita a senha"
              style={{ width:'100%', fontSize:13, padding:'9px 10px', border:'0.5px solid #D3D1C7', borderRadius:8, background:'#FAFAF8', boxSizing:'border-box' }} />
          </div>
          {msg && (
            <div style={{ fontSize:12, padding:'8px 10px', borderRadius:8, background: msg.includes('Erro')||msg.includes('não')||msg.includes('precisa') ? '#FEF2F2' : '#F2FAE8', color: msg.includes('Erro')||msg.includes('não')||msg.includes('precisa') ? '#A32D2D' : '#3B6D11' }}>{msg}</div>
          )}
          <button type="submit" disabled={salvando}
            style={{ width:'100%', padding:'10px', background: salvando ? '#7FB3C9' : '#0E7EA8', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor: salvando ? 'default' : 'pointer' }}>
            {salvando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
