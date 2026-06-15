import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { auditar } from '../lib/auditoria'

const PERFIS = {
  admin:       { label: 'Administrador', cor: '#0E7EA8', bg: '#E6F1FB' },
  diretoria:   { label: 'Diretoria',     cor: '#185FA5', bg: '#E6F1FB' },
  operacional: { label: 'Operacional',   cor: '#3B6D11', bg: '#EAF3DE' },
}

const FORM_VAZIO = { email: '', nome: '', perfil: 'operacional', senha: '' }

export default function Usuarios() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null) // id do usuário sendo editado
  const [formEdit, setFormEdit] = useState({ nome: '', perfil: 'operacional' })
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [resetando, setResetando] = useState(null)
  const [logs, setLogs] = useState([])
  const [uploadingFoto, setUploadingFoto] = useState(null) // id do usuário fazendo upload

  useEffect(() => {
    carregarUsuarios()
    supabase.from('auditoria').select('*').order('criado_em', { ascending:false }).limit(50)
      .then(({ data }) => setLogs(data || []))
  }, [])

  async function uploadFoto(userId, file) {
    if (!file) return
    setUploadingFoto(userId)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${userId}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('usuarios-fotos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage
        .from('usuarios-fotos')
        .getPublicUrl(path)

      // Salvar URL limpa no banco (sem timestamp)
      const url = urlData.publicUrl
      const { error: updErr } = await supabase.from('usuarios').update({ avatar_url: url }).eq('id', userId)
      if (updErr) throw updErr
      carregarUsuarios()
    } catch (e) {
      setMsg('Erro ao fazer upload: ' + e.message)
    }
    setUploadingFoto(null)
  }

  async function carregarUsuarios() {
    const { data } = await supabase.from('usuarios').select('*').order('nome')
    setLista(data || [])
  }

  // Criar usuário
  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setMsg('')

    const { data: { session: sessaoAdmin } } = await supabase.auth.getSession()

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

    if (sessaoAdmin) {
      await supabase.auth.setSession({ access_token: sessaoAdmin.access_token, refresh_token: sessaoAdmin.refresh_token })
    }

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

    auditar('Criação de usuário', `${form.email} — perfil ${form.perfil}`)
    setMsg('✓ Usuário criado! E-mail de confirmação enviado para ' + form.email)
    setForm(FORM_VAZIO)
    carregarUsuarios()
    setSalvando(false)
    setTimeout(() => setMsg(''), 5000)
  }

  // Abrir edição
  function abrirEditar(u) {
    setEditando(u.id)
    setFormEdit({ nome: u.nome, perfil: u.perfil })
    setMsg('')
  }

  // Salvar edição
  async function salvarEdicao(id) {
    setSalvando(true)
    const { error } = await supabase.from('usuarios').update({
      nome: formEdit.nome,
      perfil: formEdit.perfil,
    }).eq('id', id)

    if (error) {
      setMsg('Erro ao editar: ' + error.message)
    } else {
      auditar('Edição de usuário', `id ${id} — nome: ${formEdit.nome}, perfil: ${formEdit.perfil}`)
      setMsg('✓ Usuário atualizado com sucesso.')
      setEditando(null)
      carregarUsuarios()
      setTimeout(() => setMsg(''), 4000)
    }
    setSalvando(false)
  }

  // Resetar senha — envia email de redefinição
  async function resetarSenha(email) {
    setResetando(email)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/nova-senha'
    })
    if (error) {
      setMsg('Erro ao enviar reset: ' + error.message)
    } else {
      setMsg(`✓ E-mail de redefinição de senha enviado para ${email}`)
      auditar('Reset de senha', `${email}`)
      setTimeout(() => setMsg(''), 5000)
    }
    setResetando(null)
  }

  // Excluir usuário (só da tabela — não remove do Auth)
  async function excluir(u) {
    if (!window.confirm(`Remover ${u.nome} do sistema? O acesso será bloqueado.`)) return
    await supabase.from('usuarios').delete().eq('id', u.id)
    auditar('Remoção de usuário', `${u.email}`)
    setMsg('✓ Usuário removido.')
    carregarUsuarios()
    setTimeout(() => setMsg(''), 4000)
  }

  const s = {
    input: { width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    card: { background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: 12 },
  }

  return (
    <div>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Usuários do sistema</div>
      </div>

      <div style={{ padding: '1.25rem 1.5rem' }}>

        {/* Mensagem global */}
        {msg && (
          <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: msg.includes('Erro') ? '#FEF2F2' : '#EAF3DE', color: msg.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>
            {msg}
          </div>
        )}

        {/* Lista de usuários */}
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Usuários ativos ({lista.length})</div>
          {lista.length === 0 ? (
            <div style={{ fontSize: 12, color: '#888780' }}>Nenhum usuário cadastrado.</div>
          ) : lista.map(u => (
            <div key={u.id}>
              {/* Linha do usuário */}
              {editando !== u.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #F1EFE8' }}>
                  <label title="Clique para trocar a foto" style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative', display: 'block' }}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url + '?t=' + Date.now()} alt={u.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
                    ) : null}
                    {(!u.avatar_url) && (
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: PERFIS[u.perfil]?.bg || '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: PERFIS[u.perfil]?.cor || '#5F5E5A' }}>
                        {uploadingFoto === u.id ? '...' : (u.nome || '?').slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => uploadFoto(u.id, e.target.files[0])} />
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{u.nome}</div>
                    <div style={{ fontSize: 11, color: '#888780' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: PERFIS[u.perfil]?.bg || '#F1EFE8', color: PERFIS[u.perfil]?.cor || '#5F5E5A', flexShrink: 0 }}>
                    {PERFIS[u.perfil]?.label || u.perfil}
                  </span>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => abrirEditar(u)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#0E7EA8', cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => resetarSenha(u.email)} disabled={resetando === u.email}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>
                      {resetando === u.email ? '...' : 'Resetar senha'}
                    </button>
                    <button onClick={() => excluir(u)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '0.5px solid rgba(163,45,45,0.2)', background: 'transparent', color: '#A32D2D', cursor: 'pointer' }}>
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulário de edição inline */
                <div style={{ padding: '12px 0', borderBottom: '0.5px solid #F1EFE8' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0E7EA8', marginBottom: 8 }}>Editando {u.email}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={s.label}>Nome completo</label>
                      <input value={formEdit.nome} onChange={e => setFormEdit(f => ({ ...f, nome: e.target.value }))}
                        style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Perfil de acesso</label>
                      <select value={formEdit.perfil} onChange={e => setFormEdit(f => ({ ...f, perfil: e.target.value }))}
                        style={s.input}>
                        <option value="operacional">Operacional</option>
                        <option value="diretoria">Diretoria</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => salvarEdicao(u.id)} disabled={salvando}
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer' }}>
                      {salvando ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                    <button onClick={() => setEditando(null)}
                      style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', color: '#5F5E5A', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Adicionar usuário */}
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Adicionar usuário</div>
          <div style={{ background: '#FAFAF8', borderLeft: '3px solid #0E7EA8', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A', marginBottom: '1rem' }}>
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
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seuemail@exemplo.com" required style={s.input} />
              </div>
              <div>
                <label style={s.label}>Senha inicial</label>
                <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" required minLength={6} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Perfil de acesso</label>
                <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))} style={s.input}>
                  <option value="operacional">Operacional — atendimentos, doações, cobranças</option>
                  <option value="diretoria">Diretoria — visualização financeira</option>
                  <option value="admin">Administrador — acesso total</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={salvando}
              style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#0E7EA8', color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Criando...' : 'Criar usuário'}
            </button>
          </form>
        </div>

        {/* Permissões por perfil */}
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Permissões por perfil</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['Função','Administrador','Diretoria','Operacional'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'5px 8px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[
                ['Painel e relatórios financeiros',     true,  true,  false],
                ['Atendimentos e usuários atendidos',   true,  false, true ],
                ['Doações e eventos',                   true,  false, true ],
                ['Cobranças',                           true,  false, true ],
                ['Lançar despesas e entradas',          true,  false, true ],
                ['Importar extrato / conciliar',        true,  false, false],
                ['Fechamento / Conselho Fiscal',        true,  false, false],
                ['Fornecedores, patrimônio, parcerias', true,  false, false],
                ['Configurações e usuários',            true,  false, false],
              ].map(([fn, adm, dir, op]) => (
                <tr key={fn}>
                  <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #F1EFE8' }}>{fn}</td>
                  {[adm, dir, op].map((v, i) => (
                    <td key={i} style={{ padding:'7px 8px', borderBottom:'0.5px solid #F1EFE8' }}>
                      {v
                        ? <span style={{ fontSize:13, color:'#3B6D11' }}><i className="ti ti-check" /></span>
                        : <span style={{ fontSize:12, color:'#D3D1C7' }}>—</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Auditoria */}
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Atividades recentes (auditoria)</div>
          {logs.length === 0 ? (
            <div style={{ fontSize: 12, color: '#888780' }}>Nenhuma atividade registrada ainda.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr>{['Quando','Quem','Ação','Detalhe'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'5px 8px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE' }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #F1EFE8', fontSize:11, color:'#888780', whiteSpace:'nowrap' }}>
                      {new Date(l.criado_em).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #F1EFE8', fontSize:11 }}>{l.usuario}</td>
                    <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #F1EFE8', fontWeight:500 }}>{l.acao}</td>
                    <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #F1EFE8', fontSize:11, color:'#5F5E5A' }}>{l.detalhe || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
