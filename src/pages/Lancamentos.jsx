import React, { useState, useEffect } from 'react'
import { lancamentos as dbLanc, contas as dbContas, rateios as dbRateios } from '../lib/db'
import CatSelect from '../components/CatSelect'

const contaArea = { e1: 'Educação', e2: 'Assistência Social', e3: 'Saúde' }

export default function Lancamentos({ tipo = 'despesa' }) {
  const [lista, setLista] = useState([])
  const [contas, setContas] = useState([])
  const [form, setForm] = useState({ nf: '', data: new Date().toISOString().slice(0,10), valor: '', descricao: '', conta_id: '', categoria_id: '' })
  const [rateio, setRateio] = useState({ educ: '', social: '', saude: '' })
  const [contaSel, setContaSel] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    carregarContas()
    carregarLista()
  }, [tipo])

  async function carregarContas() {
    const { data } = await dbContas.listar()
    setContas(data || [])
    if (data?.length) { setForm(f => ({ ...f, conta_id: data[0].id })); setContaSel(data[0]) }
  }

  async function carregarLista() {
    const { data } = await dbLanc.listar({ tipo })
    setLista(data || [])
  }

  function onContaChange(conta_id) {
    const c = contas.find(c => c.id == conta_id)
    setContaSel(c)
    setForm(f => ({ ...f, conta_id }))
  }

  const rateioTotal = (parseFloat(rateio.educ)||0) + (parseFloat(rateio.social)||0) + (parseFloat(rateio.saude)||0)
  const precisaRateio = contaSel?.preponderancia === 'rateio'

  async function salvar(e) {
    e.preventDefault()
    if (precisaRateio && rateioTotal !== 100) { setMsg('O rateio precisa somar 100%.'); return }
    setSalvando(true)
    const { data: lanc, error } = await dbLanc.criar({ ...form, tipo, valor: parseFloat(form.valor), conciliado: false })
    if (error) { setMsg('Erro ao salvar: ' + error.message); setSalvando(false); return }
    if (precisaRateio && lanc) {
      const itens = [
        { lancamento_id: lanc.id, area: 'Educação',          percentual: parseFloat(rateio.educ)||0 },
        { lancamento_id: lanc.id, area: 'Assistência Social', percentual: parseFloat(rateio.social)||0 },
        { lancamento_id: lanc.id, area: 'Saúde',             percentual: parseFloat(rateio.saude)||0 },
      ].filter(i => i.percentual > 0)
      await dbRateios.criar(itens)
    }
    setMsg('Lançamento salvo!')
    setForm(f => ({ ...f, nf: '', valor: '', descricao: '', categoria_id: '' }))
    setRateio({ educ: '', social: '', saude: '' })
    carregarLista()
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const v = parseFloat(form.valor) || 0
  const fmt = n => n > 0 ? 'R$ ' + (v * n / 100).toFixed(2) : 'R$ —'

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>
        {tipo === 'despesa' ? 'Lançar despesa' : 'Lançar entrada'}
      </div>

      {/* Formulário */}
      <form onSubmit={salvar}>
        <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Nova {tipo}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            {tipo === 'despesa' && (
              <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Nº nota fiscal</label>
                <input value={form.nf} onChange={e => setForm(f => ({ ...f, nf: e.target.value }))} placeholder="001234" style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} /></div>
            )}
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} /></div>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Valor (R$)</label>
              <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" required style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} /></div>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Conta bancária</label>
              <select value={form.conta_id} onChange={e => onContaChange(e.target.value)} required style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Descrição</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder={tipo === 'despesa' ? 'Ex: Conta de energia' : 'Ex: Doação portão'} required style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} /></div>
            <div><label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Categoria</label>
              <CatSelect tipo={tipo} value={form.categoria_id} onChange={v => setForm(f => ({ ...f, categoria_id: v }))} /></div>
          </div>

          {/* Rateio preponderância */}
          {precisaRateio ? (
            <div>
              <div style={{ background: '#F8F7F2', borderLeft: '3px solid #6BBF2B', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A', marginBottom: '.85rem' }}>
                Conta Principal — distribua a preponderância. Total deve ser 100%.
              </div>
              <div style={{ background: '#F8F7F2', borderRadius: 8, padding: '.75rem' }}>
                {[['educ','Educação'],['social','Assistência Social'],['saude','Saúde']].map(([k,label]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ width: 130, color: '#5F5E5A' }}>{label}</span>
                    <input type="number" min="0" max="100" value={rateio[k]} onChange={e => setRateio(r => ({ ...r, [k]: e.target.value }))}
                      placeholder="%" style={{ width: 64, fontSize: 13, padding: '5px 7px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
                    <span style={{ fontSize: 11, color: '#888780' }}>{fmt(parseFloat(rateio[k])||0)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888780', borderTop: '0.5px solid #E0DDD5', paddingTop: 8, marginTop: 8 }}>
                  <span>Total:</span>
                  <span style={{ fontWeight: 500, color: rateioTotal === 100 ? '#6BBF2B' : rateioTotal > 100 ? '#E8212A' : '#2C2C2A' }}>{rateioTotal}%</span>
                </div>
              </div>
            </div>
          ) : contaSel && (
            <div style={{ background: '#F8F7F2', borderLeft: '3px solid #B4B2A9', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A' }}>
              Preponderância definida pela conta: <strong>{contaSel.preponderancia}</strong>
            </div>
          )}

          {msg && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginTop: 10, background: msg.includes('Erro') ? '#FEF2F2' : '#F2FAE8', color: msg.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>{msg}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="submit" disabled={salvando} style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#6BBF2B', color: '#fff', cursor: 'pointer' }}>
              {salvando ? 'Salvando...' : 'Salvar ' + tipo}
            </button>
            <button type="button" onClick={() => setForm(f => ({ ...f, nf: '', valor: '', descricao: '', categoria_id: '' }))}
              style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>Limpar</button>
          </div>
        </div>
      </form>

      {/* Lista */}
      <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>
          {tipo === 'despesa' ? 'Despesas' : 'Entradas'} lançadas
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['Data','Descrição','Categoria','Conta','Valor','Situação'].map(h=>(
                <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', fontWeight: 500, borderBottom: '0.5px solid #E0DDD5' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#888780', fontSize: 12 }}>Nenhum lançamento ainda.</td></tr>}
              {lista.map(l => (
                <tr key={l.id}>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>{new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', maxWidth: 200 }}>{l.descricao}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>{l.categoria?.nome || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>{l.conta?.nome || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', fontWeight: 500, color: tipo === 'entrada' ? '#6BBF2B' : '#E8212A' }}>
                    {tipo === 'entrada' ? '+' : '-'}R$ {Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5' }}>
                    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: l.conciliado ? '#EAF3DE' : '#FAEEDA', color: l.conciliado ? '#3B6D11' : '#854F0B' }}>
                      {l.conciliado ? 'Conciliado' : 'Aguardando extrato'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
