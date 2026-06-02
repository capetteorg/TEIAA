import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(''); setLoading(true)
    const { error } = await login(email, senha)
    if (error) setErro('E-mail ou senha incorretos.')
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'#F8F7F2',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#fff',borderRadius:14,border:'0.5px solid #E0DDD5',padding:'2rem',width:'100%',maxWidth:380}}>
        {/* Logo */}
        <div style={{display:'flex',gap:3,alignItems:'center',marginBottom:6}}>
          {[['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']].map(([l,c])=>(
            <span key={l+c} style={{fontSize:22,fontWeight:500,color:c,lineHeight:1}}>{l}</span>
          ))}
        </div>
        <div style={{fontSize:11,color:'#888780',marginBottom:'1.75rem'}}>Sistema financeiro · Controle interno</div>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>E-mail</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="seu@capette.org" required
              style={{width:'100%',fontSize:13,padding:'8px 10px',border:'0.5px solid #D3D1C7',borderRadius:8,background:'#fff'}} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Senha</label>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)}
              placeholder="••••••••" required
              style={{width:'100%',fontSize:13,padding:'8px 10px',border:'0.5px solid #D3D1C7',borderRadius:8,background:'#fff'}} />
          </div>
          {erro && <div style={{fontSize:12,color:'#E8212A',marginBottom:12,background:'#FEF2F2',padding:'7px 10px',borderRadius:8}}>{erro}</div>}
          <button type="submit" disabled={loading}
            style={{width:'100%',padding:'9px',background:'#6BBF2B',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',opacity:loading?0.7:1}}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{marginTop:'1.5rem',paddingTop:'1rem',borderTop:'0.5px solid #E0DDD5',textAlign:'center'}}>
          <a href="/transparencia" style={{fontSize:12,color:'#4A8FD4'}}>Ver página pública de transparência →</a>
        </div>
      </div>
    </div>
  )
}
