import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

const TIPOS = ['emenda','edital','fomento','colaboracao','convenio','projeto']
const TIPO_LABEL = { emenda:'Emenda Parlamentar', edital:'Edital', fomento:'Termo de Fomento', colaboracao:'Termo de Colaboração', convenio:'Convênio', projeto:'Projeto Específico' }
const SITUACOES = ['em execução','prestação pendente','encerrada','suspensa']
const SITUACAO_COR = { 'em execução':['#EAF3DE','#3B6D11'], 'prestação pendente':['#FAEEDA','#854F0B'], 'encerrada':['#F1EFE8','#888780'], 'suspensa':['#FCEBEB','#A32D2D'] }

const FORM_VAZIO = {
  tipo:'emenda', nome_projeto:'', conta_id:'', num_termo:'', num_processo:'',
  orgao_concedente:'', responsavel:'', objeto:'', valor_aprovado:'', valor_recebido:'',
  vigencia_inicio:'', vigencia_fim:'', situacao:'em execução', observacoes:'',
}

export default function Parcerias() {
  const navigate = useNavigate()
  const [parcerias, setParcerias] = useState([])
  const [contas, setContas] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('parcerias')
      .select('*, conta:contas(id,nome,banco,agencia,conta_num)')
      .order('nome_projeto')
    setParcerias(data || [])
    const { data: contsData } = await supabase.from('contas').select('id,nome,banco').order('nome')
    setContas(contsData || [])
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      conta_id: form.conta_id ? parseInt(form.conta_id) : null,
      valor_aprovado: form.valor_aprovado ? parseFloat(form.valor_aprovado) : null,
      valor_recebido: form.valor_recebido ? parseFloat(form.valor_recebido) : null,
      vigencia_inicio: form.vigencia_inicio || null,
      vigencia_fim: form.vigencia_fim || null,
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('parcerias').update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from('parcerias').insert(dados))
    }
    if (error) { setMsg('Erro: ' + error.message) }
    else {
      setMsg('✅ Parceria salva!')
      setForm(FORM_VAZIO)
      setEditando(null)
      setMostrarForm(false)
      carregar()
    }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  function editar(p) {
    setForm({
      tipo: p.tipo, nome_projeto: p.nome_projeto, conta_id: p.conta_id||'',
      num_termo: p.num_termo||'', num_processo: p.num_processo||'',
      orgao_concedente: p.orgao_concedente||'', responsavel: p.responsavel||'',
      objeto: p.objeto||'', valor_aprovado: p.valor_aprovado||'',
      valor_recebido: p.valor_recebido||'', vigencia_inicio: p.vigencia_inicio||'',
      vigencia_fim: p.vigencia_fim||'', situacao: p.situacao||'em execução',
      observacoes: p.observacoes||'',
    })
    setEditando(p.id)
    setMostrarForm(true)
  }

  const fmt = v => v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const lista = filtro === 'todas' ? parcerias : parcerias.filter(p => p.situacao === filtro)

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    tab: ativo => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?LARANJA:'#D3D1C7'}`, background:ativo?LARANJA:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Parcerias, Emendas e Editais</div>
          <div style={{ fontSize:12, color:'#888780', marginTop:2 }}>Cadastro e acompanhamento de instrumentos jurídicos</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO) }}
          style={s.btn(mostrarForm ? '#F1EFE8' : LARANJA, mostrarForm ? '#5F5E5A' : '#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Nova parceria'}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:msg.includes('✅')?'#F2FAE8':'#FEF2F2', color:msg.includes('✅')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Formulário */}
      {mostrarForm && (
        <div style={{ ...s.card, borderColor:'#F4C88A' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>
            {editando ? 'Editar parceria' : 'Nova parceria / emenda / edital'}
          </div>
          <form onSubmit={salvar}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Tipo de instrumento *</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={s.input} required>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Nome do projeto *</label>
                <input value={form.nome_projeto} onChange={e=>setForm(f=>({...f,nome_projeto:e.target.value}))} placeholder="Ex: Emenda Michel Jahara 2025" style={s.input} required />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Nº do Termo / Instrumento</label>
                <input value={form.num_termo} onChange={e=>setForm(f=>({...f,num_termo:e.target.value}))} placeholder="Ex: 123456/2025" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Nº do Processo</label>
                <input value={form.num_processo} onChange={e=>setForm(f=>({...f,num_processo:e.target.value}))} placeholder="Ex: 71000.123456/2025" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Órgão concedente / Parceiro</label>
                <input value={form.orgao_concedente} onChange={e=>setForm(f=>({...f,orgao_concedente:e.target.value}))} placeholder="Ex: Ministério da Saúde" style={s.input} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Responsável pela parceria</label>
                <input value={form.responsavel} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Nome do responsável" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Conta bancária vinculada</label>
                <select value={form.conta_id} onChange={e=>setForm(f=>({...f,conta_id:e.target.value}))} style={s.input}>
                  <option value="">Selecione uma conta...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.banco}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Objeto / Descrição da parceria</label>
              <input value={form.objeto} onChange={e=>setForm(f=>({...f,objeto:e.target.value}))} placeholder="Descreva o objeto da parceria" style={s.input} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Valor aprovado (R$)</label>
                <input type="number" step="0.01" value={form.valor_aprovado} onChange={e=>setForm(f=>({...f,valor_aprovado:e.target.value}))} placeholder="0,00" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Valor recebido (R$)</label>
                <input type="number" step="0.01" value={form.valor_recebido} onChange={e=>setForm(f=>({...f,valor_recebido:e.target.value}))} placeholder="0,00" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Vigência início</label>
                <input type="date" value={form.vigencia_inicio} onChange={e=>setForm(f=>({...f,vigencia_inicio:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Vigência fim</label>
                <input type="date" value={form.vigencia_fim} onChange={e=>setForm(f=>({...f,vigencia_fim:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Situação</label>
                <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input}>
                  {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Observações adicionais" style={s.input} />
            </div>
            <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':LARANJA)}>
              {salvando ? 'Salvando...' : editando ? '💾 Salvar alterações' : '+ Cadastrar parceria'}
            </button>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setFiltro('todas')} style={s.tab(filtro==='todas')}>Todas ({parcerias.length})</button>
        {SITUACOES.map(sit => {
          const count = parcerias.filter(p => p.situacao === sit).length
          if (count === 0) return null
          return <button key={sit} onClick={() => setFiltro(sit)} style={s.tab(filtro===sit)}>{sit.charAt(0).toUpperCase()+sit.slice(1)} ({count})</button>
        })}
      </div>

      {/* Cards de parcerias */}
      {lista.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:13 }}>Nenhuma parceria cadastrada ainda.</div>
          <div style={{ fontSize:12, marginTop:4 }}>Clique em "+ Nova parceria" para começar.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'1rem' }}>
          {lista.map(p => {
            const [bg, cor] = SITUACAO_COR[p.situacao] || ['#F1EFE8','#5F5E5A']
            const pctExec = p.valor_aprovado && p.valor_recebido ? Math.round(p.valor_recebido/p.valor_aprovado*100) : 0
            return (
              <div key={p.id} style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, overflow:'hidden', cursor:'pointer', transition:'box-shadow .2s' }}
                onClick={() => navigate(`/parcerias/${p.id}`)}>
                {/* Header do card */}
                <div style={{ background:`${LARANJA}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{TIPO_LABEL[p.tipo]||p.tipo}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A' }}>{p.nome_projeto}</div>
                  </div>
                  <span style={s.badge(bg, cor)}>{p.situacao}</span>
                </div>
                {/* Body do card */}
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Valor aprovado</div>
                      <div style={{ fontSize:12, fontWeight:500 }}>{fmt(p.valor_aprovado)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Vigência</div>
                      <div style={{ fontSize:11 }}>{fmtData(p.vigencia_inicio)} a {fmtData(p.vigencia_fim)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Órgão concedente</div>
                      <div style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.orgao_concedente||'—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>Conta vinculada</div>
                      <div style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.conta?.nome||'—'}</div>
                    </div>
                  </div>
                  {p.valor_aprovado && (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888780', marginBottom:3 }}>
                        <span>Recebido</span><span>{pctExec}%</span>
                      </div>
                      <div style={{ height:5, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:pctExec+'%', background:pctExec>=100?VERDE:LARANJA, borderRadius:99 }} />
                      </div>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6, marginTop:10 }}>
                    <button onClick={e=>{ e.stopPropagation(); navigate(`/parcerias/${p.id}`) }}
                      style={{ ...s.btn(LARANJA), flex:1, fontSize:11 }}>Ver detalhes →</button>
                    <button onClick={e=>{ e.stopPropagation(); editar(p) }}
                      style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Editar</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
