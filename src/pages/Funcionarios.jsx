import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TIPOS_VINCULO = [
  { value: 'clt', label: 'CLT', desc: 'Folha de pagamento assinada' },
  { value: 'pj', label: 'PJ', desc: 'CNPJ + Nota fiscal' },
  { value: 'sem_vinculo', label: 'Sem vínculo', desc: 'Recibo simples ou declaração' },
]
const FUNCOES = ['Administrativo','Assistente Social','Educador(a)','Coordenador(a)','Diretor(a)','Contador(a)','Auxiliar Administrativo','Auxiliar de Serviços Gerais','Psicólogo(a)','Nutricionista','Outro']
const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

export default function Funcionarios() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  const [funcionarios, setFuncionarios] = useState([])
  const [dividas, setDividas] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [tab, setTab] = useState('funcionarios')
  const [form, setForm] = useState({ nome: '', funcao: '', tipo_vinculo: 'pj', cpf_cnpj: '', email: '', telefone: '', data_admissao: '', status: 'ativo', observacoes: '' })
  const [formDivida, setFormDivida] = useState({ funcionario_id: '', descricao: '', valor_original: '', data_origem: '', observacoes: '' })
  const [formPgto, setFormPgto] = useState({ divida_id: '', valor: '', data_pagamento: '', observacoes: '' })
  const [msg, setMsg] = useState('')
  const [msgD, setMsgD] = useState('')
  const [msgP, setMsgP] = useState('')
  const [funcSel, setFuncSel] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: f } = await supabase.from('funcionarios').select('*').order('nome')
    const { data: d } = await supabase.from('dividas').select('*, funcionario:funcionarios(nome)').order('criado_em', { ascending: false })
    const { data: pg } = await supabase.from('pagamentos_divida').select('*, divida:dividas(descricao, funcionario:funcionarios(nome))').order('criado_em', { ascending: false })
    setFuncionarios(f || [])
    setDividas(d || [])
    setPagamentos(pg || [])
  }

  async function salvarFuncionario(e) {
    e.preventDefault()
    const { error } = await supabase.from('funcionarios').insert(form)
    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg('Funcionário cadastrado!')
    setForm({ nome: '', funcao: '', tipo_vinculo: 'pj', cpf_cnpj: '', email: '', telefone: '', data_admissao: '', status: 'ativo', observacoes: '' })
    carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  async function salvarDivida(e) {
    e.preventDefault()
    const { error } = await supabase.from('dividas').insert({
      ...formDivida,
      funcionario_id: parseInt(formDivida.funcionario_id),
      valor_original: parseFloat(formDivida.valor_original),
      valor_pago: 0,
    })
    if (error) { setMsgD('Erro: ' + error.message); return }
    setMsgD('Dívida cadastrada!')
    setFormDivida({ funcionario_id: '', descricao: '', valor_original: '', data_origem: '', observacoes: '' })
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
      observacoes: formPgto.observacoes,
    })
    if (!error) {
      const novoValorPago = Number(divida.valor_pago || 0) + valor
      const novoStatus = novoValorPago >= Number(divida.valor_original) ? 'quitada' : 'aberta'
      await supabase.from('dividas').update({ valor_pago: novoValorPago, status: novoStatus }).eq('id', divida.id)
    }
    if (error) { setMsgP('Erro: ' + error.message); return }
    setMsgP('Pagamento registrado!')
    setFormPgto({ divida_id: '', valor: '', data_pagamento: '', observacoes: '' })
    carregar()
    setTimeout(() => setMsgP(''), 3000)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    input: { width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    tab: ativo => ({ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: ativo ? VERDE : 'transparent', color: ativo ? '#fff' : '#5F5E5A', cursor: 'pointer' }),
  }

  const divAbertas = dividas.filter(d => d.status !== 'quitada')
  const totalDividas = divAbertas.reduce((a,d) => a + (Number(d.valor_original||0) - Number(d.valor_pago||0)), 0)
  const vincCor = { clt: ['#EAF3DE','#3B6D11'], pj: ['#E6F1FB','#185FA5'], sem_vinculo: ['#F1EFE8','#5F5E5A'] }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Recursos Humanos</div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Funcionários ativos', val: funcionarios.filter(f=>f.status==='ativo').length, cor: VERDE },
          { label: 'Dívidas abertas', val: divAbertas.length, cor: divAbertas.length>0?VERMELHO:VERDE },
          { label: 'Total em dívidas', val: fmt(totalDividas), cor: totalDividas>0?VERMELHO:VERDE },
          { label: 'Pagamentos registrados', val: pagamentos.length, cor: '#4A8FD4' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
            <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem' }}>
        {[['funcionarios','Funcionários'],['dividas','Dívidas'],['pagamentos','Pagamentos'],['cadastrar','Cadastrar']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={s.tab(tab===v)}>{l}</button>
        ))}
      </div>

      {/* Funcionários */}
      {tab === 'funcionarios' && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Funcionários ({funcionarios.length})</div>
          {funcionarios.length === 0 ? (
            <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhum funcionário cadastrado.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Nome','Função','Vínculo','CPF/CNPJ','Status',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {funcionarios.map(f => {
                  const [bg, cor] = vincCor[f.tipo_vinculo] || ['#F1EFE8','#5F5E5A']
                  const divFunc = dividas.filter(d => d.funcionario_id === f.id && d.status !== 'quitada')
                  const saldoFunc = divFunc.reduce((a,d) => a + (Number(d.valor_original||0) - Number(d.valor_pago||0)), 0)
                  return (
                    <tr key={f.id}>
                      <td style={{ ...s.td, fontWeight: 500 }}>{f.nome}</td>
                      <td style={s.td}>{f.funcao||'—'}</td>
                      <td style={s.td}><span style={s.badge(bg,cor)}>{TIPOS_VINCULO.find(t=>t.value===f.tipo_vinculo)?.label||f.tipo_vinculo}</span></td>
                      <td style={s.td}>{f.cpf_cnpj||'—'}</td>
                      <td style={s.td}>
                        <span style={s.badge(f.status==='ativo'?'#EAF3DE':'#FCEBEB',f.status==='ativo'?'#3B6D11':'#A32D2D')}>{f.status}</span>
                        {saldoFunc > 0 && <span style={{ ...s.badge('#FAEEDA','#854F0B'), marginLeft: 4 }}>Dívida: {fmt(saldoFunc)}</span>}
                      </td>
                      <td style={s.td}>
                        {p === 'admin' && (
                          <button onClick={() => { setFuncSel(f); setTab('dividas') }}
                            style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, border: '0.5px solid #4A8FD4', background: 'transparent', color: '#4A8FD4', cursor: 'pointer' }}>
                            Ver dívidas
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Dívidas */}
      {tab === 'dividas' && (
        <>
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Dívidas em aberto</div>
            {dividas.length === 0 ? (
              <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhuma dívida cadastrada.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Funcionário','Descrição','Valor original','Valor pago','Saldo restante','Status'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dividas.map(d => {
                    const saldo = Number(d.valor_original||0) - Number(d.valor_pago||0)
                    return (
                      <tr key={d.id}>
                        <td style={{ ...s.td, fontWeight: 500 }}>{d.funcionario?.nome||'—'}</td>
                        <td style={s.td}>{d.descricao}</td>
                        <td style={{ ...s.td, color: VERMELHO }}>{fmt(d.valor_original)}</td>
                        <td style={{ ...s.td, color: VERDE }}>{fmt(d.valor_pago)}</td>
                        <td style={{ ...s.td, fontWeight: 500, color: saldo>0?VERMELHO:VERDE }}>{fmt(saldo)}</td>
                        <td style={s.td}><span style={s.badge(d.status==='quitada'?'#EAF3DE':'#FAEEDA',d.status==='quitada'?'#3B6D11':'#854F0B')}>{d.status}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {p === 'admin' && (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Cadastrar dívida</div>
              <form onSubmit={salvarDivida}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={s.label}>Funcionário</label>
                    <select value={formDivida.funcionario_id} onChange={e=>setFormDivida(f=>({...f,funcionario_id:e.target.value}))} required style={s.input}>
                      <option value="">Selecione...</option>
                      {funcionarios.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                  <div><label style={s.label}>Descrição</label><input value={formDivida.descricao} onChange={e=>setFormDivida(f=>({...f,descricao:e.target.value}))} placeholder="Ex: Salário atrasado Jan/2026" required style={s.input} /></div>
                  <div><label style={s.label}>Valor (R$)</label><input type="number" step="0.01" value={formDivida.valor_original} onChange={e=>setFormDivida(f=>({...f,valor_original:e.target.value}))} required style={s.input} /></div>
                  <div><label style={s.label}>Data de origem</label><input type="date" value={formDivida.data_origem} onChange={e=>setFormDivida(f=>({...f,data_origem:e.target.value}))} style={s.input} /></div>
                </div>
                {msgD && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msgD.includes('Erro')?'#FEF2F2':'#F2FAE8', color: msgD.includes('Erro')?'#A32D2D':'#3B6D11' }}>{msgD}</div>}
                <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: VERMELHO, color: '#fff', cursor: 'pointer' }}>Cadastrar dívida</button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Pagamentos */}
      {tab === 'pagamentos' && (
        <>
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Histórico de pagamentos</div>
            {pagamentos.length === 0 ? (
              <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhum pagamento registrado.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Data','Funcionário','Dívida','Valor pago','Obs'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {pagamentos.map(pg => (
                    <tr key={pg.id}>
                      <td style={s.td}>{new Date(pg.data_pagamento+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ ...s.td, fontWeight: 500 }}>{pg.divida?.funcionario?.nome||'—'}</td>
                      <td style={s.td}>{pg.divida?.descricao||'—'}</td>
                      <td style={{ ...s.td, color: VERDE, fontWeight: 500 }}>{fmt(pg.valor)}</td>
                      <td style={s.td}>{pg.observacoes||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {p === 'admin' && dividas.filter(d=>d.status!=='quitada').length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Registrar pagamento de dívida</div>
              <form onSubmit={salvarPagamento}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={s.label}>Dívida</label>
                    <select value={formPgto.divida_id} onChange={e=>setFormPgto(f=>({...f,divida_id:e.target.value}))} required style={s.input}>
                      <option value="">Selecione...</option>
                      {dividas.filter(d=>d.status!=='quitada').map(d=>(
                        <option key={d.id} value={d.id}>{d.funcionario?.nome} — {d.descricao} (Saldo: {fmt(Number(d.valor_original||0)-Number(d.valor_pago||0))})</option>
                      ))}
                    </select>
                  </div>
                  <div><label style={s.label}>Valor pago (R$)</label><input type="number" step="0.01" value={formPgto.valor} onChange={e=>setFormPgto(f=>({...f,valor:e.target.value}))} required style={s.input} /></div>
                  <div><label style={s.label}>Data do pagamento</label><input type="date" value={formPgto.data_pagamento} onChange={e=>setFormPgto(f=>({...f,data_pagamento:e.target.value}))} required style={s.input} /></div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={s.label}>Observações</label>
                  <input value={formPgto.observacoes} onChange={e=>setFormPgto(f=>({...f,observacoes:e.target.value}))} placeholder="Ex: Parcela 1 de 3" style={s.input} />
                </div>
                {msgP && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msgP.includes('Erro')?'#FEF2F2':'#F2FAE8', color: msgP.includes('Erro')?'#A32D2D':'#3B6D11' }}>{msgP}</div>}
                <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: VERDE, color: '#fff', cursor: 'pointer' }}>Registrar pagamento</button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Cadastrar */}
      {tab === 'cadastrar' && p === 'admin' && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Cadastrar funcionário</div>
          <form onSubmit={salvarFuncionario}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ gridColumn: 'span 2' }}><label style={s.label}>Nome completo</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome do funcionário" required style={s.input} /></div>
              <div>
                <label style={s.label}>Função</label>
                <select value={form.funcao} onChange={e=>setForm(f=>({...f,funcao:e.target.value}))} style={s.input}>
                  <option value="">Selecione...</option>
                  {FUNCOES.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Tipo de vínculo</label>
                <select value={form.tipo_vinculo} onChange={e=>setForm(f=>({...f,tipo_vinculo:e.target.value}))} style={s.input}>
                  {TIPOS_VINCULO.map(t=><option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={s.label}>{form.tipo_vinculo==='pj'?'CNPJ':'CPF'}</label><input value={form.cpf_cnpj} onChange={e=>setForm(f=>({...f,cpf_cnpj:e.target.value}))} placeholder={form.tipo_vinculo==='pj'?'00.000.000/0001-00':'000.000.000-00'} style={s.input} /></div>
              <div><label style={s.label}>E-mail</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com" style={s.input} /></div>
              <div><label style={s.label}>Telefone</label><input value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="(00) 00000-0000" style={s.input} /></div>
              <div><label style={s.label}>Data de admissão</label><input type="date" value={form.data_admissao} onChange={e=>setForm(f=>({...f,data_admissao:e.target.value}))} style={s.input} /></div>
            </div>
            {msg && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msg.includes('Erro')?'#FEF2F2':'#F2FAE8', color: msg.includes('Erro')?'#A32D2D':'#3B6D11' }}>{msg}</div>}
            <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: VERDE, color: '#fff', cursor: 'pointer' }}>Cadastrar funcionário</button>
          </form>
        </div>
      )}
    </div>
  )
}
