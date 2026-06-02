import React, { useState, useEffect } from 'react'
import { categorias as dbCats } from '../lib/db'

export default function CatSelect({ tipo, value, onChange }) {
  const [cats, setCats] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [tipo])

  async function carregar() {
    const { data } = await dbCats.listar(tipo)
    setCats(data || [])
  }

  async function salvar() {
    if (!novoNome.trim()) return
    setSalvando(true)
    const { data } = await dbCats.criar({ nome: novoNome.trim(), tipo })
    if (data) {
      await carregar()
      onChange(data.id)
      setNovoNome('')
      setShowForm(false)
      toast('Categoria "' + data.nome + '" criada!')
    }
    setSalvando(false)
  }

  function toast(msg) {
    let t = document.getElementById('toast-cat')
    if (!t) { t = document.createElement('div'); t.id = 'toast-cat'; t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#2C2C2A;color:#fff;padding:10px 18px;border-radius:10px;font-size:12px;z-index:9999;'; document.body.appendChild(t) }
    t.textContent = msg; t.style.opacity = '1'
    clearTimeout(t._t); t._t = setTimeout(() => t.style.opacity = '0', 2800)
  }

  const cor = tipo === 'entrada' ? '#6BBF2B' : '#E8212A'

  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ flex: 1, fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
          <option value="">Selecione a categoria...</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <button type="button" onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 12, borderRadius: 8, border: `0.5px solid ${cor}`, background: 'transparent', color: cor, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <i className="ti ti-plus" /> Nova
        </button>
      </div>

      {showForm && (
        <div style={{ marginTop: 6, background: tipo === 'entrada' ? '#F2FAE8' : '#FEF2F2', border: `0.5px solid ${tipo === 'entrada' ? '#C0DD97' : '#F7C1C1'}`, borderRadius: 10, padding: '.85rem 1rem' }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: '.6rem' }}>Nova categoria de {tipo === 'entrada' ? 'entrada' : 'despesa'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={novoNome} onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && salvar()}
              placeholder={tipo === 'entrada' ? 'Ex: Doação portão' : 'Ex: Material limpeza'}
              style={{ flex: 1, fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
            <button type="button" onClick={salvar} disabled={salvando}
              style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: cor, color: '#fff', cursor: 'pointer' }}>
              {salvando ? 'Criando...' : 'Criar e selecionar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
          <div style={{ fontSize: 11, color: tipo === 'entrada' ? '#3B6D11' : '#A32D2D', marginTop: 6 }}>
            Será criada e selecionada automaticamente neste lançamento.
          </div>
        </div>
      )}
    </div>
  )
}
