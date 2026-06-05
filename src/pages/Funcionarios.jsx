import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4'

const FORM_CREDOR_VAZIO = {
  nome: '', funcao: '', cpf_cnpj: '', telefone: '', observacoes: '',
}

const FORM_DIVIDA_VAZIO = {
  funcionario_id: '', descricao: '', valor_original: '', data_origem: '', observacoes: '',
}

const FORM_PGTO_VAZIO = {
  divida_id: '', valor: '', data_pagamento: '', observacoes: '',
}

export default function Funcionarios() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  const [credores, setCredores] = useState([])
  const [dividas, setDividas] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [tab, setTab] = useState('resumo')
  const [formCredor, setFormCredor] = useState(FORM_CREDOR_VAZIO)
  const [editandoCredor, setEditandoCredor] = useState(null)
  const [mostrarFormCredor, setMostrarFormCredor] = useState(false)
  const [formDivida, setFormDivida] = useState(FORM_DIVIDA_VAZIO)
  const [formPgto, setFormPgto] = useState(FORM_PGTO_VAZIO)
  const [msg, setMsg] = useState('')
  const [msgD, setMsgD] = useState('')
  const [msgP, setMsgP] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: c } = await supabase.from('funcionarios').select('*').order('nome')
    const { data: d } = await supabase.from('dividas')
      .select('*, funcionario:funcionarios(nome,funcao)')
      .order('data_origem', { ascending: false })
    const { data: pg } = await supabase.from('pagamentos_divida')
      .select('*, divida:dividas(descricao, funcionario:funcionarios(nome))')
      .order('data_pagamento', { ascending: false })
    setCredores(c || [])
    setDividas(d || [])
    setPagamentos(pg || [])
  }

  async function salvarCredor(e) {
    e.preventDefault()
    const dados = {
      nome: formCredor.nome,
      funcao: formCredor.funcao || null,
      cpf_cnpj: formCredor.cpf_cnpj || null,
      telefone: formCredor.telefone || null,
      observacoes: formCredor.observacoes || null,
      status: 'ativo',
    }
    let error
    if (editandoCredor) {
      ;({ error } = await supabase.from('funcionarios').update(dados).eq('id', editandoCredor))
    } else {
      ;({ error } = await supabase.from('funcionarios').insert(dados))
    }
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg(editandoCredor ? '✅ Credor atualizado!' : '✅ Credor cadastrado!')
    setFormCredor(FORM_CREDOR_VAZIO)
    setEditandoCredor(null)
    setMostrarFormCredor(false)
    carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  function editarCredor(c) {
    setFormCredor({
      nome: c.nome, funcao: c.funcao||'',
      cpf_cnpj: c.cpf_cnpj||'', telefone: c.telefone||'',
      observacoes: c.observacoes||'',
    })
    setEditandoCredor(c.id)
    setMostrarFormCredor(true)
    setTab('credores')
  }

  async function salvarDivida(e) {
    e.preventDefault()
    const { error } = await supabase.from('dividas').insert({
      funcionario_id: parseInt(formDivida.funcionario_id),
      descricao: formDivida.descricao,
      valor_original: parseFloat(formDivida.valor_original),
      valor_pago: 0,
      data_origem: formDivida.data_origem || null,
      observacoes: formDivida.observacoes || null,
      status: 'aberta',
    })
    if (error) { setMsgD('Erro: ' + error.message); return }
    setMsgD('✅ Dívida cadastrada!')
    setFormDivida(FORM_DIVIDA_VAZIO)
    carregar()
    setTimeout(() => setMsgD(''), 3000)
  }

  async function salvarPagamento(e) {
    e.preventDefault()
    const divida = dividas.find(d => String(d.id) === String(formPgto.divida_id))
    if (!divida) return
    const valor = parseFloat(formPgto.valor)
    const { error } = await supabase.from('pagamentos_divida').insert({
      divida_id: parseInt(formPgto.divida_id),
      valor,
      data_pagamento: formPgto.data_pagamento,
      observacoes: formPgto.observacoes || null,
    })
    if (!error) {
      const novoValorPago = Number(divida.valor_pago || 0) + valor
      const novoStatus = novoValorPago >= Number(divida.valor_original) ? 'quitada' : 'aberta'
      await supabase.from('dividas').update({ valor_pago: novoValorPago, status: novoStatus }).eq('id', divida.id)
    }
    if (error) { setMsgP('Erro: ' + error.message); return }
    setMsgP('✅ Abatimento registrado!')
    setFormPgto(FORM_PGTO_VAZIO)
    carregar()
    setTimeout(() => setMsgP(''), 3000)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const divAbertas = dividas.filter(d => d.status !== 'quitada')
  const totalDevido = divAbertas.reduce((a,d) => a + (Number(d.valor_original||0) - Number(d.valor_pago||0)), 0)
  const totalOriginal = dividas.reduce((a,d) => a + Number(d.valor_original||0), 0)
  const totalPago = pagamentos.reduce((a,pg) => a + Number(pg.valor||0), 0)

  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    input: { width: '100%', fontSize: 12, padding: '7px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8, boxSizing: 'border-box' },
    th: { textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5', background: '#FAFAF8' },
    td: { padding: '8px 10px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12, verticalAlign: 'middle' },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    tab: ativo => ({ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: `0.5px solid ${ativo?VERMELHO:'#D3D1C7'}`, background: ativo ? VERMELHO : 'transparent', color: ativo ? '#fff' : '#5F5E5A', cursor: 'pointer' }),
    btn: (bg, cor='#fff') => ({ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer', whiteSpace: 'nowrap' }),
    grupo: cols => ({ display: 'grid', gridTemplateColumns: cols, gap: 10, marginBottom: 10 }),
    secao: { fontSize: 11, fontWeight: 600, color: '#5F5E5A', borderLeft: `3px solid ${VERMELHO}`, paddingLeft: 8, margin: '14px 0 8px' },
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Controle de Dívidas</div>
          <div style={{ fontSize: 12, color: '#888780' }}>Dívidas da CAPETTE com funcionários e prestadores</div>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Dívidas abertas', val: divAbertas.length, cor: divAbertas.length > 0 ? VERMELHO : VERDE },
          { label: 'Total devido', val: fmt(totalDevido), cor: totalDevido > 0 ? VERMELHO : VERDE },
          { label: 'Total original', val: fmt(totalOriginal), cor: '#888780' },
          { label: 'Total abatido', val: fmt(totalPago), cor: VERDE },
          { label: 'Credores cadastrados', val: credores.length, cor: AZUL },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
            <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          ['resumo', 'Resumo'],
          ['dividas', 'Dívidas'],
          ['abatimentos', 'Abatimentos'],
          ['credores', 'Credores'],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={s.tab(tab === v)}>{l}</button>
        ))}
      </div>

      {msg && <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: '1rem', background: msg.includes('✅') ? '#F2FAE8' : '#FEF2F2', color: msg.includes('✅') ? '#3B6D11' : '#A32D2D' }}>{msg}</div>}

      {/* ===== RESUMO ===== */}
      {tab === 'resumo' && (
        <div>
          {divAbertas.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '3rem', color: '#888780' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13 }}>Nenhuma dívida em aberto.</div>
            </div>
          ) : (
            <div>
              {credores.map(c => {
                const divsCreor = divAbertas.filter(d => d.funcionario_id === c.id)
                if (divsCreor.length === 0) return null
                const saldoCreor = divsCreor.reduce((a, d) => a + (Number(d.valor_original||0) - Number(d.valor_pago||0)), 0)
                const pct = divsCreor.reduce((a,d) => a + Number(d.valor_pago||0), 0) /
                            divsCreor.reduce((a,d) => a + Number(d.valor_original||0), 0) * 100
                return (
                  <div key={c.id} style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                        <div style={{ fontSize: 11, color: '#888780' }}>{c.funcao||'—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#888780' }}>Saldo devedor</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: VERMELHO }}>{fmt(saldoCreor)}</div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#F1EFE8', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: Math.min(pct, 100) + '%', background: pct >= 100 ? VERDE : AZUL, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#888780', marginBottom: 10 }}>{Math.round(pct)}% abatido</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead><tr>{['Descrição','Origem','Original','Pago','Saldo'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {divsCreor.map(d => {
                          const saldo = Number(d.valor_original||0) - Number(d.valor_pago||0)
                          return (
                            <tr key={d.id}>
                              <td style={s.td}>{d.descricao}</td>
                              <td style={s.td}>{fmtData(d.data_origem)}</td>
                              <td style={{ ...s.td, color: '#888780' }}>{fmt(d.valor_original)}</td>
                              <td style={{ ...s.td, color: VERDE }}>{fmt(d.valor_pago)}</td>
                              <td style={{ ...s.td, fontWeight: 600, color: saldo > 0 ? VERMELHO : VERDE }}>{fmt(saldo)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== DÍVIDAS ===== */}
      {tab === 'dividas' && (
        <>
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Todas as dívidas ({dividas.length})</div>
            {dividas.length === 0 ? (
              <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhuma dívida cadastrada.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Credor','Descrição','Origem','Original','Pago','Saldo','Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dividas.map(d => {
                    const saldo = Number(d.valor_original||0) - Number(d.valor_pago||0)
                    return (
                      <tr key={d.id}>
                        <td style={{ ...s.td, fontWeight: 500 }}>{d.funcionario?.nome||'—'}</td>
                        <td style={s.td}>{d.descricao}</td>
                        <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{fmtData(d.data_origem)}</td>
                        <td style={{ ...s.td, color: '#888780' }}>{fmt(d.valor_original)}</td>
                        <td style={{ ...s.td, color: VERDE }}>{fmt(d.valor_pago)}</td>
                        <td style={{ ...s.td, fontWeight: 600, color: saldo > 0 ? VERMELHO : VERDE }}>{fmt(saldo)}</td>
                        <td style={s.td}>
                          <span style={s.badge(d.status === 'quitada' ? '#EAF3DE' : '#FCEBEB', d.status === 'quitada' ? '#3B6D11' : '#A32D2D')}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {p === 'admin' && (
            <div style={s.card}>
              <div style={s.secao}>Cadastrar nova dívida</div>
              <form onSubmit={salvarDivida}>
                <div style={s.grupo('1fr 2fr')}>
                  <div>
                    <label style={s.label}>Credor *</label>
                    <select value={formDivida.funcionario_id} onChange={e => setFormDivida(f => ({ ...f, funcionario_id: e.target.value }))} required style={s.input}>
                      <option value="">Selecione...</option>
                      {credores.map(c => <option key={c.id} value={c.id}>{c.nome} {c.funcao ? `— ${c.funcao}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Descrição *</label>
                    <input value={formDivida.descricao} onChange={e => setFormDivida(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Salário atrasado Jan/2026, Honorários contábeis Mar/2026..." required style={s.input} />
                  </div>
                </div>
                <div style={s.grupo('1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Valor total (R$) *</label>
                    <input type="number" step="0.01" value={formDivida.valor_original} onChange={e => setFormDivida(f => ({ ...f, valor_original: e.target.value }))} required style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Data de origem</label>
                    <input type="date" value={formDivida.data_origem} onChange={e => setFormDivida(f => ({ ...f, data_origem: e.target.value }))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Observações</label>
                    <input value={formDivida.observacoes} onChange={e => setFormDivida(f => ({ ...f, observacoes: e.target.value }))} style={s.input} />
                  </div>
                </div>
                {msgD && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msgD.includes('✅') ? '#F2FAE8' : '#FEF2F2', color: msgD.includes('✅') ? '#3B6D11' : '#A32D2D' }}>{msgD}</div>}
                <button type="submit" style={s.btn(VERMELHO)}>+ Cadastrar dívida</button>
              </form>
            </div>
          )}
        </>
      )}

      {/* ===== ABATIMENTOS ===== */}
      {tab === 'abatimentos' && (
        <>
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Histórico de abatimentos ({pagamentos.length})</div>
            {pagamentos.length === 0 ? (
              <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhum abatimento registrado.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Data','Credor','Dívida','Valor abatido','Obs'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {pagamentos.map(pg => (
                    <tr key={pg.id}>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{fmtData(pg.data_pagamento)}</td>
                      <td style={{ ...s.td, fontWeight: 500 }}>{pg.divida?.funcionario?.nome||'—'}</td>
                      <td style={s.td}>{pg.divida?.descricao||'—'}</td>
                      <td style={{ ...s.td, color: VERDE, fontWeight: 600 }}>{fmt(pg.valor)}</td>
                      <td style={{ ...s.td, color: '#888780' }}>{pg.observacoes||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {p === 'admin' && divAbertas.length > 0 && (
            <div style={s.card}>
              <div style={s.secao}>Registrar abatimento</div>
              <form onSubmit={salvarPagamento}>
                <div style={s.grupo('2fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Dívida *</label>
                    <select value={formPgto.divida_id} onChange={e => setFormPgto(f => ({ ...f, divida_id: e.target.value }))} required style={s.input}>
                      <option value="">Selecione...</option>
                      {divAbertas.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.funcionario?.nome} — {d.descricao} (Saldo: {fmt(Number(d.valor_original||0) - Number(d.valor_pago||0))})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Valor abatido (R$) *</label>
                    <input type="number" step="0.01" value={formPgto.valor} onChange={e => setFormPgto(f => ({ ...f, valor: e.target.value }))} required style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Data *</label>
                    <input type="date" value={formPgto.data_pagamento} onChange={e => setFormPgto(f => ({ ...f, data_pagamento: e.target.value }))} required style={s.input} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={s.label}>Observações</label>
                  <input value={formPgto.observacoes} onChange={e => setFormPgto(f => ({ ...f, observacoes: e.target.value }))} placeholder="Ex: Parcela 1 de 3, referente ao lançamento nº 123..." style={s.input} />
                </div>
                {msgP && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msgP.includes('✅') ? '#F2FAE8' : '#FEF2F2', color: msgP.includes('✅') ? '#3B6D11' : '#A32D2D' }}>{msgP}</div>}
                <button type="submit" style={s.btn(VERDE)}>Registrar abatimento</button>
              </form>
            </div>
          )}
        </>
      )}

      {/* ===== CREDORES ===== */}
      {tab === 'credores' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={() => { setMostrarFormCredor(!mostrarFormCredor); setEditandoCredor(null); setFormCredor(FORM_CREDOR_VAZIO) }}
              style={s.btn(mostrarFormCredor ? '#F1EFE8' : AZUL, mostrarFormCredor ? '#5F5E5A' : '#fff')}>
              {mostrarFormCredor ? 'Cancelar' : '+ Cadastrar credor'}
            </button>
          </div>

          {mostrarFormCredor && (
            <div style={{ ...s.card, borderColor: '#B3D1F0', marginBottom: '1rem' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>
                {editandoCredor ? 'Editar credor' : 'Novo credor'}
              </div>
              <form onSubmit={salvarCredor}>
                <div style={s.grupo('2fr 1fr')}>
                  <div>
                    <label style={s.label}>Nome completo *</label>
                    <input value={formCredor.nome} onChange={e => setFormCredor(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Paulo Henrique Teixeira, Maria Silva..." required style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Função / Tipo</label>
                    <input value={formCredor.funcao} onChange={e => setFormCredor(f => ({ ...f, funcao: e.target.value }))} placeholder="Ex: Contador, Funcionário CLT, Prestador..." style={s.input} />
                  </div>
                </div>
                <div style={s.grupo('1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>CPF / CNPJ</label>
                    <input value={formCredor.cpf_cnpj} onChange={e => setFormCredor(f => ({ ...f, cpf_cnpj: e.target.value }))} placeholder="000.000.000-00" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Telefone</label>
                    <input value={formCredor.telefone} onChange={e => setFormCredor(f => ({ ...f, telefone: e.target.value }))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Observações</label>
                    <input value={formCredor.observacoes} onChange={e => setFormCredor(f => ({ ...f, observacoes: e.target.value }))} style={s.input} />
                  </div>
                </div>
                <button type="submit" style={s.btn(AZUL)}>
                  {editandoCredor ? '💾 Salvar' : '+ Cadastrar'}
                </button>
              </form>
            </div>
          )}

          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Credores cadastrados ({credores.length})</div>
            {credores.length === 0 ? (
              <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhum credor cadastrado.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Nome','Função','CPF/CNPJ','Dívidas abertas','Saldo devedor',''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {credores.map(c => {
                    const divsC = divAbertas.filter(d => d.funcionario_id === c.id)
                    const saldo = divsC.reduce((a, d) => a + (Number(d.valor_original||0) - Number(d.valor_pago||0)), 0)
                    return (
                      <tr key={c.id}>
                        <td style={{ ...s.td, fontWeight: 500 }}>{c.nome}</td>
                        <td style={{ ...s.td, color: '#888780' }}>{c.funcao||'—'}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>{c.cpf_cnpj||'—'}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          {divsC.length > 0
                            ? <span style={s.badge('#FCEBEB','#A32D2D')}>{divsC.length}</span>
                            : <span style={{ color: '#B4B2A9' }}>—</span>}
                        </td>
                        <td style={{ ...s.td, fontWeight: 600, color: saldo > 0 ? VERMELHO : VERDE }}>
                          {saldo > 0 ? fmt(saldo) : '✅ Quitado'}
                        </td>
                        <td style={s.td}>
                          <button onClick={() => editarCredor(c)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
