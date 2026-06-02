import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PlanoTrabalho() {
  const [contas, setContas] = useState([])
  const [planos, setPlanos] = useState([])
  const [form, setForm] = useState({ conta_id: '', nome: '', descricao: '', valor_previsto: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('contas').select('*').order('nome').then(({ data }) => {
      const emendas = (data||[]).filter(c => c.preponderancia !== 'rateio')
      setContas(emendas)
      if (emendas.length) setForm(f => ({ ...f, conta_id: String(emendas[0].id) }))
    })
    carregar()
  }, [])

  async function carregar() {
    const { data } = await supabase.from('plano_trabalho').select('*, conta:contas(nome)').order('conta_id').order('nome')
    setPlanos(data || [])
  }

  async function salvar(e) {
    e.preventDefault()
    const { error } = await supabase.from('plano_trabalho').insert({
      conta_id: parseInt(form.conta_id),
      nome: form.nome,
      descricao: form.descricao,
      valor_previsto: parseFloat(form.valor_previsto) || 0,
    })
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Item criado!')
    setForm(f => ({ ...f, nome: '', descricao: '', valor_previsto: '' }))
    carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  async function excluir(id) {
    if (!confirm('Excluir este item do plano?')) return
    await supabase.from('plano_trabalho').delete().eq('id', id)
    carregar()
  }

  const fmt = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  // Agrupa por conta
  const porConta = planos.reduce((acc, p) => {
    const nome = p.conta?.nome || 'Sem conta'
    if (!acc[nome]) acc[nome] = []
    acc[nome].push(p)
    return acc
  }, {})

  const s = {
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12 },
    input: { width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Plano de trabalho — Emendas Parlamentares</div>

      <div style={{ background: '#F8F7F2', borderLeft: '3px solid #4A8FD4', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A', marginBottom: '1.25rem' }}>
        Cadastre os itens do plano de trabalho de cada emenda. Na conciliação, cada movimentação será vinculada a um item do plano.
      </div>

      {/* Lista por conta */}
      {Object.entries(porConta).map(([conta, items]) => (
        <div key={conta} style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-file-text" style={{ color: '#4A8FD4' }} />
            {conta}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              {['Item do plano', 'Descrição', 'Valor previsto', ''].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id}>
                  <td style={{ ...s.td, fontWeight: 500 }}>{p.nome}</td>
                  <td style={{ ...s.td, color: '#888780' }}>{p.descricao || '—'}</td>
                  <td style={s.td}>{fmt(p.valor_previsto)}</td>
                  <td style={s.td}>
                    <button onClick={() => excluir(p.id)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '0.5px solid #E8212A', background: 'transparent', color: '#E8212A', cursor: 'pointer' }}>Excluir</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={4} style={{ padding: '1rem', color: '#888780', textAlign: 'center', fontSize: 12 }}>Nenhum item cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      ))}

      {Object.keys(porConta).length === 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#888780', marginBottom: 10 }}>
          Nenhum item cadastrado ainda.
        </div>
      )}

      {/* Formulário */}
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Adicionar item ao plano</div>
        {contas.length === 0 ? (
          <div style={{ fontSize: 12, color: '#888780' }}>Nenhuma emenda cadastrada. Vá em <strong>Contas</strong> para cadastrar.</div>
        ) : (
          <form onSubmit={salvar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={s.label}>Emenda / Conta</label>
                <select value={form.conta_id} onChange={e => setForm(f => ({ ...f, conta_id: e.target.value }))} style={s.input}>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Item do plano</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Aquisição de material" required style={s.input} />
              </div>
              <div>
                <label style={s.label}>Descrição (opcional)</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes do item" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Valor previsto (R$)</label>
                <input type="number" step="0.01" value={form.valor_previsto} onChange={e => setForm(f => ({ ...f, valor_previsto: e.target.value }))} placeholder="0,00" style={s.input} />
              </div>
            </div>
            {msg && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msg.includes('Erro') ? '#FEF2F2' : '#F2FAE8', color: msg.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>{msg}</div>}
            <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#4A8FD4', color: '#fff', cursor: 'pointer' }}>
              Adicionar item
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
