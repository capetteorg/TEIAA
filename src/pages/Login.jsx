import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const LOGO_LETRAS = [['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']]

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F8F7F2 0%, #EEF4E8 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>

      {/* Cabeçalho institucional */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 12, color: '#888780', letterSpacing: '.05em', textTransform: 'uppercase' }}>
          Casa do Pequeno Trabalhador de Teresópolis
        </div>
        <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2 }}>
          CNPJ 29.213.717/0001-01 · Desde 1974
        </div>
      </div>

      {/* Cards lado a lado */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.25rem',
        width: '100%',
        maxWidth: 740,
      }}>

        {/* Card 1 — Área Interna */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '0.5px solid #E0DDD5',
          padding: '2rem',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <img src="/logo.png" alt="CAPETTE"
              style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }}
              onError={e => { e.target.style.display='none'; document.getElementById('login-logo-letras').style.display='flex' }} />
            <div id="login-logo-letras" style={{ display: 'none', gap: 2, justifyContent: 'center', marginBottom: 8 }}>
              {LOGO_LETRAS.map(([l,c]) => (
                <span key={l+c} style={{ fontSize: 22, fontWeight: 500, color: c, lineHeight: 1 }}>{l}</span>
              ))}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2A', marginBottom: 3 }}>Área Interna</div>
            <div style={{ fontSize: 12, color: '#888780' }}>Sistema financeiro e controle interno</div>
          </div>

          {/* Divisor */}
          <div style={{ height: '0.5px', background: '#E0DDD5', marginBottom: '1.25rem' }} />

          {/* Formulário */}
          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@capette.org" required
                style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8, background: '#FAFAF8', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" required
                style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8, background: '#FAFAF8', boxSizing: 'border-box' }} />
            </div>

            {erro && (
              <div style={{ fontSize: 12, color: '#E8212A', background: '#FEF2F2', border: '0.5px solid #F7C1C1', padding: '7px 10px', borderRadius: 8 }}>
                {erro}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px', background: loading ? '#9DD466' : '#6BBF2B',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: loading ? 'default' : 'pointer', marginTop: 4, letterSpacing: '.02em',
              transition: 'background .15s',
            }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 11, color: '#B4B2A9' }}>
            🔒 Acesso restrito à equipe autorizada.
          </div>
        </div>

        {/* Card 2 — Transparência Pública */}
        <div style={{
          background: 'linear-gradient(135deg, #EAF3DE 0%, #E6F1FB 100%)',
          borderRadius: 16,
          border: '0.5px solid #C0DD97',
          padding: '2rem',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {/* Ícone e título */}
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, marginBottom: '1rem', boxShadow: '0 2px 8px rgba(107,191,43,0.15)',
            }}>
              🌐
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2A', marginBottom: 4 }}>
              Transparência Pública
            </div>
            <div style={{ fontSize: 12, color: '#5F5E5A', marginBottom: '1rem' }}>
              Prestação de contas aberta à sociedade
            </div>

            {/* Divisor */}
            <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.08)', marginBottom: '1rem' }} />

            <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Consulte receitas, despesas, relatórios e prestações de contas da CAPETTE.
              Todas as informações são atualizadas pela equipe interna.
            </div>

            {/* Destaques */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem' }}>
              {[
                { icon: '📊', texto: 'Receitas e despesas por período' },
                { icon: '📄', texto: 'Relatórios de prestação de contas' },
                { icon: '🔍', texto: 'Consulta livre, sem cadastro' },
              ].map(item => (
                <div key={item.texto} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3B6D11' }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.texto}
                </div>
              ))}
            </div>
          </div>

          <a href="/transparencia" style={{
            display: 'block', textAlign: 'center', padding: '10px',
            background: '#fff', color: '#3B6D11', border: '1.5px solid #6BBF2B',
            borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            cursor: 'pointer', letterSpacing: '.02em',
            transition: 'background .15s',
          }}
            onMouseEnter={e => e.target.style.background='#F2FAE8'}
            onMouseLeave={e => e.target.style.background='#fff'}
          >
            Acessar Transparência →
          </a>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 11, color: '#6BBF2B' }}>
            🌿 Sem necessidade de login
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: 11, color: '#B4B2A9' }}>
        FinOSC Capette · Sistema de gestão financeira para OSCs
      </div>
    </div>
  )
}
