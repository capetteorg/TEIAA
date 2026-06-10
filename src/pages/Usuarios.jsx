import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PERFIS = {
  admin:       { label: 'Administrador', cor: '#8B2FC9', bg: '#EEEDFE' },
  diretoria:   { label: 'Diretoria',     cor: '#185FA5', bg: '#E6F1FB' },
  operacional: { label: 'Operacional',   cor: '#3B6D11', bg: '#EAF3DE' },
}

export default function Usuarios() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState({ email: '', nome: '', perfil: 'operacional', senha: '' })
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregarUsuarios() }, [])

  async function carregarUsuarios() {
    const { data } = await supabase.from('usuarios').select('*').order('nome')
    setLista(data || [])
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)

    // Cria conta usando signUp — funciona com publishable key
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: { emailRedirectTo: window.location.origin }
    })

    if (authError) {
      setMsg('Erro ao criar conta: ' + authError.message)
      setSalvando(false)
      return
    }

    // Salva perfil na tabela usuarios
    const { error: dbError } = await supabase.from('usuarios').insert({
      id: authData.user.id,
      email: form.email,
      nome: form.nome,
      perfil: form.perfil,
    })

    if (dbError) {
      setMsg('Conta criada mas erro ao salvar perfil: ' + dbError.message)
      setSalvando(false)
      return
    }

    setMsg('Usuário criado! Um e-mail de confirmação foi enviado para ' + form.email)
    setForm({ email: '', nome: '', perfil: 'operacional', senha: '' })
    carregarUsuarios()
    setSalvando(false)
    setTimeout(() => setMsg(''), 6000)
  }

  const s = {
    input: { width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Usuários do sistema</div>

      <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Usuários ativos ({lista.length})</div>
        {lista.length === 0
          ? <div style={{ fontSize: 12, color: '#888780' }}>Nenhum usuário cadastrado.</div>
          : lista.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid #E0DDD5', fontSize: 13 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: PERFIS[u.perfil]?.bg || '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: PERFIS[u.perfil]?.cor || '#5F5E5A', flexShrink: 0 }}>
                {(u.nome || '?').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{u.nome}</div>
                <div style={{ fontSize: 11, color: '#888780' }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: PERFIS[u.perfil]?.bg || '#F1EFE8', color: PERFIS[u.perfil]?.cor || '#5F5E5A' }}>
                {PERFIS[u.perfil]?.label || u.perfil}
              </span>
            </div>
          ))
        }
      </div>

      <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Adicionar usuário</div>
        <div style={{ background: '#F8F7F2', borderLeft: '3px solid #4A8FD4', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A', marginBottom: '1rem' }}>
          O usuário receberá um e-mail de confirmação. Após confirmar, poderá fazer login com a senha definida aqui.
        </div>
        <form onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={s.label}>Nome completo</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" required style={s.input} />
            </div>
            <div>
              <label style={s.label}>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@capette.org" required style={s.input} />
            </div>
            <div>
              <label style={s.label}>Senha inicial</label>
              <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" required minLength={6} style={s.input} />
            </div>
            <div>
              <label style={s.label}>Perfil de acesso</label>
              <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))} style={s.input}>
                <option value="operacional">Operacional — lança despesas</option>
                <option value="diretoria">Diretoria — só visualiza</option>
                <option value="admin">Administrador — acesso total</option>
              </select>
            </div>
          </div>
          {msg && (
            <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msg.includes('Erro') ? '#FEF2F2' : '#F2FAE8', color: msg.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>
              {msg}
            </div>
          )}
          <button type="submit" disabled={salvando} style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#6BBF2B', color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Criando...' : 'Criar usuário'}
          </button>
        </form>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Permissões por perfil</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>{['Função', 'Administrador', 'Diretoria', 'Operacional'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {[
              ['Ver painel e relatórios', true, true, false],
              ['Lançar despesas', true, false, true],
              ['Lançar entradas', true, false, false],
              ['Importar extrato / conciliar', true, false, false],
              ['Aplicações', true, false, false],
              ['Contas, categorias, classificações', true, false, false],
              ['Gerenciar usuários', true, false, false],
            ].map(([fn, adm, dir, op]) => (
              <tr key={fn}>
                <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>{fn}</td>
                {[adm, dir, op].map((v, i) => (
                  <td key={i} style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>
                    {v
                      ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500, background: '#EAF3DE', color: '#3B6D11' }}><i className="ti ti-check" style={{fontSize:14}} /></span>
                      : <span style={{ fontSize: 10, color: '#B4B2A9' }}>—</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
