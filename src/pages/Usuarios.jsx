import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PERFIS = { admin: { label: 'Administrador', cor: '#8B2FC9', bg: '#EEEDFE' }, diretoria: { label: 'Diretoria', cor: '#185FA5', bg: '#E6F1FB' }, operacional: { label: 'Operacional', cor: '#3B6D11', bg: '#EAF3DE' } }

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
    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: form.email, password: form.senha, email_confirm: true
    })
    if (authError) { setMsg('Erro: ' + authError.message); setSalvando(false); return }
    // Salva perfil na tabela usuarios
    await supabase.from('usuarios').insert({ id: authData.user.id, email: form.email, nome: form.nome, perfil: form.perfil })
    setMsg('Usuário criado!')
    setForm({ email: '', nome: '', perfil: 'operacional', senha: '' })
    carregarUsuarios()
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Usuários do sistema</div>

      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Usuários ativos</div>
        {lista.length === 0 ? <div style={{fontSize:12,color:'#888780'}}>Nenhum usuário cadastrado.</div> :
          lista.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid #E0DDD5', fontSize: 13 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: PERFIS[u.perfil]?.bg || '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: PERFIS[u.perfil]?.cor || '#5F5E5A', flexShrink: 0 }}>
                {(u.nome||'?').slice(0,2).toUpperCase()}
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

      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Adicionar usuário</div>
        <form onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Nome</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>E-mail</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="usuario@capette.org" required style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Senha inicial</label><input type="password" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))} placeholder="Mínimo 6 caracteres" required minLength={6} style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}} /></div>
            <div><label style={{fontSize:12,color:'#5F5E5A',display:'block',marginBottom:3}}>Perfil de acesso</label>
              <select value={form.perfil} onChange={e=>setForm(f=>({...f,perfil:e.target.value}))} style={{width:'100%',fontSize:13,padding:'6px 9px',border:'0.5px solid #D3D1C7',borderRadius:8}}>
                <option value="operacional">Operacional — lança despesas</option>
                <option value="diretoria">Diretoria — só visualiza</option>
                <option value="admin">Administrador — acesso total</option>
              </select></div>
          </div>
          {msg && <div style={{fontSize:12,padding:'7px 10px',borderRadius:8,marginBottom:10,background:msg.includes('Erro')?'#FEF2F2':'#F2FAE8',color:msg.includes('Erro')?'#A32D2D':'#3B6D11'}}>{msg}</div>}
          <button type="submit" disabled={salvando} style={{padding:'7px 16px',fontSize:12,borderRadius:8,border:'none',background:'#6BBF2B',color:'#fff',cursor:'pointer'}}>
            {salvando ? 'Criando...' : 'Criar usuário'}
          </button>
        </form>
      </div>
    </div>
  )
}
