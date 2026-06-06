import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

const FORM_VAZIO = {
  nome: '', nome_fantasia: '', tipo: 'juridica', cpf_cnpj: '',
  telefone: '', email: '', endereco: '',
  banco: '', agencia: '', conta_bancaria: '', pix: '',
  area_atuacao: '', observacoes: '',
}

export default function Fornecedores() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lista, setLista] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroIncompleto, setFiltroIncompleto] = useState(false)
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [historico, setHistorico] = useState(null) // fornecedor selecionado
  const [historicoLanc, setHistoricoLanc] = useState([])
  const [historicoPeriodo, setHistoricoPeriodo] = useState('')
  const [historicoLoading, setHistoricoLoading] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    setLista(data || [])
  }

  async function verificarDuplicata() {
    if (!form.cpf_cnpj && !form.nome) return
    const { data } = await supabase.from('fornecedores')
      .select('id,nome,cpf_cnpj,cadastro_rapido')
      .or(form.cpf_cnpj ? `cpf_cnpj.eq.${form.cpf_cnpj}` : `nome.ilike.%${form.nome}%`)
    const dups = (data || []).filter(d => d.id !== editando)
    setDuplicatas(dups)
  }

  async function abrirHistorico(forn) {
    setHistorico(forn)
    setHistoricoLoading(true)
    const { data } = await supabase.from('lancamentos')
      .select('*, conta:contas(nome), categoria:categorias(nome)')
      .eq('fornecedor_id', forn.id)
      .order('data', { ascending: false })
    setHistoricoLanc(data || [])
    setHistoricoLoading(false)
  }

  async function filtrarHistorico(periodo) {
    setHistoricoPeriodo(periodo)
    setHistoricoLoading(true)
    let q = supabase.from('lancamentos')
      .select('*, conta:contas(nome), categoria:categorias(nome)')
      .eq('fornecedor_id', historico.id)
      .order('data', { ascending: false })
    if (periodo) q = q.gte('data', periodo+'-01').lte('data', periodo+'-31')
    const { data } = await q
    setHistoricoLanc(data || [])
    setHistoricoLoading(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = { ...form, criado_por: user?.id, cadastro_rapido: false }
    let error
    if (editando) {
      ;({ error } = await supabase.from('fornecedores').update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from('fornecedores').insert(dados))
    }
    if (error) { setMsg('Erro: ' + error.message) }
    else {
      setMsg('✅ Fornecedor salvo!')
      setForm(FORM_VAZIO); setEditando(null); setMostrarForm(false)
      setDuplicatas([])
      carregar()
    }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function excluir(id) {
    await supabase.from('fornecedores').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }

  function editar(f) {
    setForm({
      nome: f.nome||'', nome_fantasia: f.nome_fantasia||'', tipo: f.tipo||'juridica',
      cpf_cnpj: f.cpf_cnpj||'', telefone: f.telefone||'', email: f.email||'',
      endereco: f.endereco||'', banco: f.banco||'', agencia: f.agencia||'',
      conta_bancaria: f.conta_bancaria||'', pix: f.pix||'',
      area_atuacao: f.area_atuacao||'', observacoes: f.observacoes||'',
    })
    setEditando(f.id)
    setMostrarForm(true)
    setDuplicatas([])
  }

  function incompleto(f) {
    return f.cadastro_rapido || !f.cpf_cnpj || !f.telefone || !f.email
  }

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  const listaFiltrada = lista.filter(f => {
    const ok = !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (f.cpf_cnpj||'').includes(busca) || (f.nome_fantasia||'').toLowerCase().includes(busca.toLowerCase())
    return ok && (!filtroIncompleto || incompleto(f))
  })

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
  }

  const incompletos = lista.filter(incompleto).length

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Fornecedores</div>
          <div style={{ fontSize:12, color:'#888780' }}>{lista.length} cadastrado{lista.length!==1?'s':''} · {incompletos > 0 && <span style={{ color:LARANJA }}>{incompletos} incompleto{incompletos>1?'s':''}</span>}</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO); setDuplicatas([]) }}
          style={s.btn(mostrarForm?'#F1EFE8':VERDE, mostrarForm?'#5F5E5A':'#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Novo fornecedor'}
        </button>
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:10, background:msg.includes('✅')?'#F2FAE8':'#FEF2F2', color:msg.includes('✅')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {/* Formulário */}
      {mostrarForm && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>
            {editando ? 'Editar fornecedor' : 'Novo fornecedor'}
          </div>

          {/* Alerta de duplicata */}
          {duplicatas.length > 0 && (
            <div style={{ background:'#FAEEDA', border:'0.5px solid #F5C99A', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:12, color:'#854F0B' }}>
              ⚠️ Possível duplicata encontrada:
              {duplicatas.map(d => (
                <div key={d.id} style={{ marginTop:4 }}>
                  <strong>{d.nome}</strong> {d.cpf_cnpj ? `— ${d.cpf_cnpj}` : ''} {d.cadastro_rapido ? '(cadastro rápido — incompleto)' : ''}
                  <button onClick={() => editar(d)} style={{ marginLeft:8, fontSize:11, padding:'1px 8px', borderRadius:6, border:`0.5px solid ${LARANJA}`, background:'transparent', color:LARANJA, cursor:'pointer' }}>
                    Completar este
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={salvar}>
            <div style={s.grupo('2fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Nome / Razão social *</label>
                <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
                  onBlur={verificarDuplicata} required style={s.input} placeholder="Ex: Papelaria Silva LTDA" />
              </div>
              <div>
                <label style={s.label}>Tipo *</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={s.input}>
                  <option value="juridica">Pessoa Jurídica</option>
                  <option value="fisica">Pessoa Física</option>
                </select>
              </div>
              <div>
                <label style={s.label}>{form.tipo==='fisica'?'CPF':'CNPJ'}</label>
                <input value={form.cpf_cnpj} onChange={e=>setForm(f=>({...f,cpf_cnpj:e.target.value}))}
                  onBlur={verificarDuplicata}
                  placeholder={form.tipo==='fisica'?'000.000.000-00':'00.000.000/0001-00'} style={s.input} />
              </div>
            </div>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Nome fantasia</label>
                <input value={form.nome_fantasia} onChange={e=>setForm(f=>({...f,nome_fantasia:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Telefone</label>
                <input value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="(21) 99999-9999" style={s.input} />
              </div>
              <div>
                <label style={s.label}>E-mail</label>
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Endereço</label>
              <input value={form.endereco} onChange={e=>setForm(f=>({...f,endereco:e.target.value}))} placeholder="Rua, número, bairro, cidade" style={s.input} />
            </div>
            <div style={s.grupo('1fr 1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Banco</label>
                <input value={form.banco} onChange={e=>setForm(f=>({...f,banco:e.target.value}))} placeholder="Ex: Sicredi" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Agência</label>
                <input value={form.agencia} onChange={e=>setForm(f=>({...f,agencia:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Conta</label>
                <input value={form.conta_bancaria} onChange={e=>setForm(f=>({...f,conta_bancaria:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Chave PIX</label>
                <input value={form.pix} onChange={e=>setForm(f=>({...f,pix:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={s.grupo('1fr 1fr')}>
              <div>
                <label style={s.label}>Área de atuação</label>
                <input value={form.area_atuacao} onChange={e=>setForm(f=>({...f,area_atuacao:e.target.value}))} placeholder="Ex: Material pedagógico, TI..." style={s.input} />
              </div>
              <div>
                <label style={s.label}>Observações</label>
                <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERDE)}>
                {salvando ? 'Salvando...' : editando ? '💾 Salvar alterações' : '+ Cadastrar fornecedor'}
              </button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditando(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou CPF/CNPJ..."
          style={{ flex:1, minWidth:200, fontSize:12, padding:'7px 10px', border:'0.5px solid #D3D1C7', borderRadius:8 }} />
        {incompletos > 0 && (
          <button onClick={() => setFiltroIncompleto(!filtroIncompleto)}
            style={{ fontSize:11, padding:'6px 12px', borderRadius:8, border:`0.5px solid ${filtroIncompleto?LARANJA:'#D3D1C7'}`, background:filtroIncompleto?'#FAEEDA':'transparent', color:filtroIncompleto?LARANJA:'#5F5E5A', cursor:'pointer' }}>
            ⚠️ Ver incompletos ({incompletos})
          </button>
        )}
        <span style={{ fontSize:12, color:'#888780' }}>{listaFiltrada.length} resultado{listaFiltrada.length!==1?'s':''}</span>
      </div>

      {/* Lista */}
      {listaFiltrada.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:'2.5rem', color:'#888780' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🏪</div>
          <div style={{ fontSize:13 }}>{busca ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado ainda.'}</div>
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>{['Nome','Tipo','CPF/CNPJ','Telefone','Área','PIX','Status',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {listaFiltrada.map((f,i) => (
                  <tr key={f.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                    <td style={{ ...s.td, fontWeight:500 }}>
                      {f.nome}
                      {f.nome_fantasia && <div style={{ fontSize:10, color:'#888780' }}>{f.nome_fantasia}</div>}
                    </td>
                    <td style={s.td}><span style={s.badge(f.tipo==='fisica'?'#E6F1FB':'#F0EAFA', f.tipo==='fisica'?'#185FA5':'#534AB7')}>{f.tipo==='fisica'?'PF':'PJ'}</span></td>
                    <td style={{ ...s.td, fontFamily:'monospace', fontSize:11 }}>{f.cpf_cnpj||'—'}</td>
                    <td style={{ ...s.td, color:'#5F5E5A' }}>{f.telefone||'—'}</td>
                    <td style={{ ...s.td, color:'#888780', fontSize:11 }}>{f.area_atuacao||'—'}</td>
                    <td style={{ ...s.td, fontFamily:'monospace', fontSize:11 }}>{f.pix||'—'}</td>
                    <td style={s.td}>
                      {incompleto(f)
                        ? <span style={s.badge('#FAEEDA','#854F0B')}>⚠️ Incompleto</span>
                        : <span style={s.badge('#EAF3DE','#3B6D11')}>✓ Completo</span>}
                    </td>
                    <td style={s.td}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => navigate(`/fornecedores/${f.id}/historico`)} style={s.btn('#EAF3DE',VERDE)}>Histórico</button>
                        <button onClick={() => editar(f)} style={s.btn('#E6F1FB',AZUL)}>Editar</button>
                        <button onClick={() => setConfirmandoExcluir(f)} style={s.btn('#FEF2F2',VERMELHO)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal histórico */}
      {historico && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', width:'100%', maxWidth:760, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600 }}>{historico.nome}</div>
                <div style={{ fontSize:12, color:'#888780' }}>
                  {historico.cpf_cnpj && <span style={{ fontFamily:'monospace', marginRight:8 }}>{historico.cpf_cnpj}</span>}
                  {historico.telefone && <span style={{ marginRight:8 }}>{historico.telefone}</span>}
                  {historico.email && <span>{historico.email}</span>}
                </div>
              </div>
              <button onClick={() => { setHistorico(null); setHistoricoLanc([]); setHistoricoPeriodo('') }}
                style={{ padding:'5px 12px', fontSize:12, borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', cursor:'pointer' }}>✕ Fechar</button>
            </div>

            {/* Filtro período */}
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:'1rem' }}>
              <input type="month" value={historicoPeriodo} onChange={e => filtrarHistorico(e.target.value)}
                style={{ fontSize:12, padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }} />
              {historicoPeriodo && <button onClick={() => filtrarHistorico('')} style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', cursor:'pointer' }}>Limpar filtro</button>}
            </div>

            {/* Métricas */}
            {!historicoLoading && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:'1rem' }}>
                {[
                  { label:'Total gasto', val:'R$ ' + historicoLanc.filter(l=>l.tipo==='despesa').reduce((a,l)=>a+Number(l.valor||0),0).toLocaleString('pt-BR',{minimumFractionDigits:2}), cor:VERMELHO },
                  { label:'Total recebido', val:'R$ ' + historicoLanc.filter(l=>l.tipo==='entrada').reduce((a,l)=>a+Number(l.valor||0),0).toLocaleString('pt-BR',{minimumFractionDigits:2}), cor:VERDE },
                  { label:'Lançamentos', val:historicoLanc.length, cor:AZUL },
                ].map(m => (
                  <div key={m.label} style={{ background:'#FAFAF8', borderRadius:10, padding:'.75rem 1rem', border:'0.5px solid #E0DDD5' }}>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                    <div style={{ fontSize:15, fontWeight:600, color:m.cor }}>{m.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabela */}
            {historicoLoading ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Carregando...</div>
            ) : historicoLanc.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
                Nenhum lançamento encontrado para este fornecedor.
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>{['Data','Tipo','Descrição','Categoria','Conta','Valor'].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'6px 8px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {historicoLanc.map((l,i) => (
                    <tr key={l.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, whiteSpace:'nowrap' }}>
                        {new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #E0DDD5', fontSize:12 }}>
                        <span style={{ display:'inline-block', padding:'2px 7px', borderRadius:99, fontSize:10, fontWeight:500, background:l.tipo==='entrada'?'#EAF3DE':'#FEF2F2', color:l.tipo==='entrada'?'#3B6D11':VERMELHO }}>
                          {l.tipo==='entrada'?'Entrada':'Despesa'}
                        </span>
                      </td>
                      <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descricao}</td>
                      <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #E0DDD5', fontSize:11, color:'#888780' }}>{l.categoria?.nome||'—'}</td>
                      <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #E0DDD5', fontSize:11, color:'#888780' }}>{l.conta?.nome||'—'}</td>
                      <td style={{ padding:'7px 8px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, fontWeight:500, color:l.tipo==='entrada'?VERDE:VERMELHO, textAlign:'right', whiteSpace:'nowrap' }}>
                        {l.tipo==='entrada'?'+':'-'}R$ {Number(l.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal excluir */}
      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Excluir fornecedor?</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.5rem' }}><strong>{confirmandoExcluir.nome}</strong></div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir.id)} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:VERMELHO, color:'#fff', fontWeight:600, cursor:'pointer' }}>Excluir</button>
              <button onClick={() => setConfirmandoExcluir(null)} style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
