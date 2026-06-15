import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#0E7EA8', AZUL = '#0E7EA8', VERMELHO = '#E8212A'

export default function Aplicacoes() {
  const [lista, setLista] = useState([])
  const [contas, setContas] = useState([])
  const [form, setForm] = useState({ nome:'', conta_id:'', saldo_atual:'' })
  const [formRend, setFormRend] = useState({ aplicacao_id:'', competencia:'', valor:'' })
  const [rendimentos, setRendimentos] = useState([])
  const [msg, setMsg] = useState('')
  const [msgRend, setMsgRend] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [aplRes, contRes, rendRes] = await Promise.all([
      supabase.from('aplicacoes').select('*, conta:contas(nome)').order('nome'),
      supabase.from('contas').select('id,nome').order('nome'),
      supabase.from('rendimentos_aplicacao').select('*, aplicacao:aplicacoes(nome)').order('competencia', { ascending:false }).limit(20),
    ])
    setLista(aplRes.data || [])
    setContas(contRes.data || [])
    setRendimentos(rendRes.data || [])
  }

  async function salvarAplicacao(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = { nome: form.nome, conta_id: parseInt(form.conta_id), saldo_atual: parseFloat(form.saldo_atual)||0 }
    const { error } = await supabase.from('aplicacoes').insert(dados)
    if (error) setMsg('Erro: ' + error.message)
    else { setMsg('Aplicação cadastrada!'); setForm({ nome:'', conta_id:'', saldo_atual:'' }); setMostrarForm(false); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function salvarRendimento(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      aplicacao_id: parseInt(formRend.aplicacao_id),
      competencia: formRend.competencia,
      valor: (parseFloat(formRend.valor) || 0),
    }
    const { error } = await supabase.from('rendimentos_aplicacao').insert(dados)
    if (error) { setMsgRend('Erro: ' + error.message); setSalvando(false); return }

    // Atualizar saldo da aplicação
    const aplic = lista.find(a => a.id === dados.aplicacao_id)
    if (aplic) {
      await supabase.from('aplicacoes').update({ saldo_atual: (Number(aplic.saldo_atual)||0) + dados.valor }).eq('id', dados.aplicacao_id)
    }
    setMsgRend('Rendimento registrado!')
    setFormRend({ aplicacao_id:'', competencia:'', valor:'' })
    carregar()
    setSalvando(false)
    setTimeout(() => setMsgRend(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  const fmt = v => 'R$ ' + Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits:2 })

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    btn: (bg,cor='#fff') => ({ padding:'7px 16px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Aplicações financeiras</div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
<div style={{ fontSize:12, color:'#888780' }}>Controle de aplicações e rendimentos</div>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} style={s.btn(mostrarForm?'#F1EFE8':AZUL, mostrarForm?'#5F5E5A':'#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Nova aplicação'}
        </button>
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:10, background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {mostrarForm && (
        <div style={{ ...s.card, borderColor:AZUL+'60' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Cadastrar nova aplicação</div>
          <form onSubmit={salvarAplicacao}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <div><label style={s.label}>Nome da aplicação *</label>
                <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} required style={s.input} placeholder="Ex: Poupança Sicredi" /></div>
              <div><label style={s.label}>Conta bancária</label>
                <select value={form.conta_id} onChange={e=>setForm(f=>({...f,conta_id:e.target.value}))} style={s.input}>
                  <option value="">Selecione...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select></div>
              <div><label style={s.label}>Saldo inicial (R$)</label>
                <input type="number" step="0.01" value={form.saldo_atual} onChange={e=>setForm(f=>({...f,saldo_atual:e.target.value}))} placeholder="0,00" style={s.input} /></div>
            </div>
            <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':AZUL)}>
              {salvando ? 'Salvando...' : '+ Cadastrar'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de aplicações */}
      {lista.length > 0 && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Aplicações ({lista.length})</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr>{['Nome','Conta','Saldo atual'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {lista.map((a,i) => (
                <tr key={a.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                  <td style={{ ...s.td, fontWeight:500 }}>{a.nome}</td>
                  <td style={{ ...s.td, color:'#888780' }}>{a.conta?.nome||'—'}</td>
                  <td style={{ ...s.td, fontWeight:600, color:VERDE }}>{fmt(a.saldo_atual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lista.length === 0 && !mostrarForm && (
        <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
          <div style={{ marginBottom:8 }}><i className="ti ti-trending-up" style={{fontSize:32, color:'#C8C6BC'}} /></div>
          <div>Nenhuma aplicação cadastrada ainda.</div>
          <button onClick={() => setMostrarForm(true)} style={{ marginTop:12, padding:'8px 20px', fontSize:12, fontWeight:600, borderRadius:8, border:'none', background:'#0E7EA8', color:'#fff', cursor:'pointer' }}>+ Nova aplicação</button>
        </div>
      )}

      {/* Registrar rendimento */}
      {lista.length > 0 && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Registrar rendimento</div>
          <form onSubmit={salvarRendimento}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <div><label style={s.label}>Aplicação *</label>
                <select value={formRend.aplicacao_id} onChange={e=>setFormRend(f=>({...f,aplicacao_id:e.target.value}))} required style={s.input}>
                  <option value="">Selecione...</option>
                  {lista.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
                </select></div>
              <div><label style={s.label}>Competência *</label>
                <input type="month" value={formRend.competencia} onChange={e=>setFormRend(f=>({...f,competencia:e.target.value}))} required style={s.input} /></div>
              <div><label style={s.label}>Valor do rendimento (R$) *</label>
                <input type="number" step="0.01" value={formRend.valor} onChange={e=>setFormRend(f=>({...f,valor:e.target.value}))} placeholder="0,00" required style={s.input} /></div>
            </div>
            {msgRend && <div style={{ fontSize:12, padding:'7px 10px', borderRadius:8, marginBottom:10, background:!msgRend.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msgRend.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msgRend}</div>}
            <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':'#0E7EA8')}>
              {salvando ? 'Salvando...' : 'Salvar rendimento'}
            </button>
          </form>
        </div>
      )}

      {/* Histórico de rendimentos */}
      {rendimentos.length > 0 && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Últimos rendimentos</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr>{['Aplicação','Competência','Valor'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {rendimentos.map((r,i) => (
                <tr key={r.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                  <td style={s.td}>{r.aplicacao?.nome||'—'}</td>
                  <td style={s.td}>{r.competencia}</td>
                  <td style={{ ...s.td, color:VERDE, fontWeight:500 }}>{fmt(r.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
