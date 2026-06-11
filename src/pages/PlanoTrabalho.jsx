import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F', ROXO = '#8B2FC9'

const TIPOS_PLANO = [
  'Plano de Ação Institucional',
  'Plano de Trabalho',
  'Plano vinculado a Emenda',
  'Plano vinculado a Edital',
  'Plano vinculado a Termo de Fomento',
  'Plano vinculado a Termo de Colaboração',
  'Plano vinculado a Convênio',
  'Plano vinculado a Parceria',
  'Outro',
]

const SITUACOES_PLANO = ['em elaboração', 'aprovado', 'em execução', 'encerrado', 'cancelado', 'outro']

const UNIDADES_META = [
  'Usuários atendidos', 'Atendimentos realizados', 'Oficinas realizadas',
  'Reuniões realizadas', 'Participantes', 'Grupos realizados',
  'Meses de execução', 'Itens adquiridos', 'Outro',
]

const STATUS_META = ['não iniciada', 'em andamento', 'alcançada', 'parcialmente alcançada', 'não alcançada', 'outro']
const STATUS_ATIVIDADE = ['prevista', 'em execução', 'realizada', 'cancelada', 'reprogramada', 'outro']

const STATUS_META_COR = {
  'não iniciada': ['#F1EFE8','#888780'],
  'em andamento': ['#E6F1FB','#185FA5'],
  'alcançada': ['#EAF3DE','#3B6D11'],
  'parcialmente alcançada': ['#FAEEDA','#854F0B'],
  'não alcançada': ['#FCEBEB','#A32D2D'],
  'outro': ['#EEEDFE','#534AB7'],
}

const FORM_VAZIO = {
  nome_plano: '', tipo_plano: 'Plano de Trabalho', parceria_id: '', projeto_id: '',
  orgao_ou_parceiro: '', objeto: '', objetivo_geral: '', objetivos_especificos: '',
  publico_alvo: '', faixa_etaria: '', capacidade_prevista: '',
  periodo_inicio: '', periodo_fim: '', valor_total_previsto: '',
  situacao: 'em elaboração', observacoes: '',
}

const META_VAZIO = {
  descricao_meta: '', indicador: '', quantidade_prevista: '',
  unidade_medida: 'Usuários atendidos', quantidade_realizada: '',
  status_meta: 'não iniciada', justificativa: '',
}

const ATIVIDADE_VAZIA = {
  nome_atividade: '', descricao: '', periodo_inicio: '', periodo_fim: '',
  responsavel_equipe: '', status: 'prevista', observacoes: '',
}

export default function PlanoTrabalho() {
  const [planos, setPlanos] = useState([])
  const [parcerias, setParcerias] = useState([])
  const [projetos, setProjetos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [planoSel, setPlanoSel] = useState(null)
  const [aba, setAba] = useState('lista')
  const [abaDetalhe, setAbaDetalhe] = useState('metas')
  const [metas, setMetas] = useState([])
  const [atividades, setAtividades] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [formMeta, setFormMeta] = useState(META_VAZIO)
  const [editandoMeta, setEditandoMeta] = useState(null)
  const [formAtiv, setFormAtiv] = useState(ATIVIDADE_VAZIA)
  const [editandoAtiv, setEditandoAtiv] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    carregar()
    supabase.from('parcerias').select('id,nome_projeto,tipo').order('nome_projeto').then(({ data }) => setParcerias(data || []))
    supabase.from('projetos').select('id,nome').order('nome').then(({ data }) => setProjetos(data || []))
  }, [])

  async function carregar() {
    const { data } = await supabase.from('planos')
      .select('*, parceria:parcerias(nome_projeto,tipo), projeto:projetos(nome)')
      .order('criado_em', { ascending: false })
    setPlanos(data || [])
  }

  async function abrirDetalhe(p) {
    setPlanoSel(p)
    setAbaDetalhe('metas')
    setAba('detalhe')
    await carregarDetalhe(p)
  }

  async function carregarDetalhe(p) {
    const [metasRes, ativsRes, atendRes, usersRes] = await Promise.all([
      supabase.from('metas_plano').select('*, projeto:projetos(nome)').eq('plano_id', p.id).order('id'),
      supabase.from('atividades_previstas').select('*, projeto:projetos(nome)').eq('plano_id', p.id).order('id'),
      p.projeto_id ? supabase.from('atendimentos').select('*, projeto:projetos(nome), profissional:equipe(nome)').eq('projeto_id', p.projeto_id).order('data_atend', { ascending: false }).limit(50) : { data: [] },
      p.projeto_id ? supabase.from('usuarios_atendidos').select('*').eq('projeto_id', p.projeto_id).eq('situacao', 'ativo') : { data: [] },
    ])
    setMetas(metasRes.data || [])
    setAtividades(ativsRes.data || [])
    setAtendimentos(atendRes.data || [])
    setUsuarios(usersRes.data || [])
  }

  async function salvarPlano(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      parceria_id: form.parceria_id ? parseInt(form.parceria_id) : null,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : null,
      valor_total_previsto: form.valor_total_previsto ? parseFloat(form.valor_total_previsto) : null,
      periodo_inicio: form.periodo_inicio || null,
      periodo_fim: form.periodo_fim || null,
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('planos').update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from('planos').insert(dados))
    }
    if (error) setMsg('Erro: ' + error.message)
    else { setMsg('Plano salvo!'); setForm(FORM_VAZIO); setEditando(null); setMostrarForm(false); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function salvarMeta(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...formMeta,
      plano_id: planoSel.id,
      projeto_id: formMeta.projeto_id ? parseInt(formMeta.projeto_id) : planoSel.projeto_id,
      quantidade_prevista: formMeta.quantidade_prevista ? parseFloat(formMeta.quantidade_prevista) : null,
      quantidade_realizada: formMeta.quantidade_realizada ? parseFloat(formMeta.quantidade_realizada) : null,
    }
    let error
    if (editandoMeta) {
      ;({ error } = await supabase.from('metas_plano').update(dados).eq('id', editandoMeta))
    } else {
      ;({ error } = await supabase.from('metas_plano').insert(dados))
    }
    if (!error) { setFormMeta(META_VAZIO); setEditandoMeta(null); carregarDetalhe(planoSel) }
    else setMsg('Erro: ' + error.message)
    setSalvando(false)
  }

  async function salvarAtividade(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...formAtiv,
      plano_id: planoSel.id,
      projeto_id: planoSel.projeto_id || null,
      periodo_inicio: formAtiv.periodo_inicio || null,
      periodo_fim: formAtiv.periodo_fim || null,
    }
    let error
    if (editandoAtiv) {
      ;({ error } = await supabase.from('atividades_previstas').update(dados).eq('id', editandoAtiv))
    } else {
      ;({ error } = await supabase.from('atividades_previstas').insert(dados))
    }
    if (!error) { setFormAtiv(ATIVIDADE_VAZIA); setEditandoAtiv(null); carregarDetalhe(planoSel) }
    else setMsg('Erro: ' + error.message)
    setSalvando(false)
  }

  function editarPlano(p) {
    setForm({
      nome_plano: p.nome_plano, tipo_plano: p.tipo_plano, parceria_id: p.parceria_id||'',
      projeto_id: p.projeto_id||'', orgao_ou_parceiro: p.orgao_ou_parceiro||'',
      objeto: p.objeto||'', objetivo_geral: p.objetivo_geral||'',
      objetivos_especificos: p.objetivos_especificos||'', publico_alvo: p.publico_alvo||'',
      faixa_etaria: p.faixa_etaria||'', capacidade_prevista: p.capacidade_prevista||'',
      periodo_inicio: p.periodo_inicio||'', periodo_fim: p.periodo_fim||'',
      valor_total_previsto: p.valor_total_previsto||'', situacao: p.situacao||'em elaboração',
      observacoes: p.observacoes||'',
    })
    setEditando(p.id)
    setMostrarForm(true)
    setAba('lista')
  }

  const fmt = v => v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const pct = (real, prev) => prev > 0 ? Math.round((real/prev)*100) : 0

  const SITUACAO_COR = {
    'em elaboração': ['#E6F1FB','#185FA5'],
    'aprovado': ['#EAF3DE','#3B6D11'],
    'em execução': ['#FAEEDA','#854F0B'],
    'encerrado': ['#F1EFE8','#888780'],
    'cancelado': ['#FCEBEB','#A32D2D'],
    'outro': ['#EEEDFE','#534AB7'],
  }

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    textarea: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box', resize:'vertical' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    tab: ativo => ({ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?VERDE:'#D3D1C7'}`, background:ativo?VERDE:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer', whiteSpace:'nowrap' }),
    tabSec: ativo => ({ padding:'5px 12px', fontSize:11, borderRadius:8, border:`0.5px solid ${ativo?AZUL:'#D3D1C7'}`, background:ativo?AZUL:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer', whiteSpace:'nowrap' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Planos de Trabalho / Planos de Ação</div>
          <div style={{ fontSize:12, color:'#888780' }}>{planos.length} plano{planos.length!==1?'s':''} cadastrado{planos.length!==1?'s':''}</div>
        </div>
        {aba !== 'detalhe' && (
          <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO) }}
            style={s.btn(mostrarForm?'#F1EFE8':VERDE, mostrarForm?'#5F5E5A':'#fff')}>
            {mostrarForm ? 'Cancelar' : '+ Novo plano'}
          </button>
        )}
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Abas principais */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setAba('lista')} style={s.tab(aba==='lista')}>Lista de planos</button>
        {aba === 'detalhe' && planoSel && (
          <button style={s.tab(true)}>{planoSel.nome_plano.substring(0,30)}{planoSel.nome_plano.length>30?'...':''}</button>
        )}
      </div>

      {/* ===== ABA LISTA ===== */}
      {aba === 'lista' && (
        <>
          {/* Formulário */}
          {mostrarForm && (
            <div style={{ ...s.card, borderColor:'#C0DD97' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>
                {editando ? 'Editar plano' : 'Novo Plano de Trabalho / Plano de Ação'}
              </div>
              <form onSubmit={salvarPlano}>
                <div style={s.grupo('2fr 1fr')}>
                  <div>
                    <label style={s.label}>Nome do plano *</label>
                    <input value={form.nome_plano} onChange={e=>setForm(f=>({...f,nome_plano:e.target.value}))} style={s.input} required placeholder="Ex: Plano de Trabalho Emenda X 2026" />
                  </div>
                  <div>
                    <label style={s.label}>Tipo *</label>
                    <select value={form.tipo_plano} onChange={e=>setForm(f=>({...f,tipo_plano:e.target.value}))} style={s.input} required>
                      {TIPOS_PLANO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={s.grupo('1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Instrumento / Parceria vinculada</label>
                    <select value={form.parceria_id} onChange={e=>setForm(f=>({...f,parceria_id:e.target.value}))} style={s.input}>
                      <option value="">Nenhum</option>
                      {parcerias.map(p => <option key={p.id} value={p.id}>{p.nome_projeto}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Projeto vinculado</label>
                    <select value={form.projeto_id} onChange={e=>setForm(f=>({...f,projeto_id:e.target.value}))} style={s.input}>
                      <option value="">Nenhum</option>
                      {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Órgão / parceiro</label>
                    <input value={form.orgao_ou_parceiro} onChange={e=>setForm(f=>({...f,orgao_ou_parceiro:e.target.value}))} style={s.input} placeholder="Ex: SMASDH, CMDCA..." />
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Objeto *</label>
                  <textarea value={form.objeto} onChange={e=>setForm(f=>({...f,objeto:e.target.value}))} rows={2} style={s.textarea} placeholder="O que será executado..." />
                </div>
                <div style={s.grupo('1fr 1fr')}>
                  <div>
                    <label style={s.label}>Objetivo geral</label>
                    <textarea value={form.objetivo_geral} onChange={e=>setForm(f=>({...f,objetivo_geral:e.target.value}))} rows={2} style={s.textarea} />
                  </div>
                  <div>
                    <label style={s.label}>Objetivos específicos</label>
                    <textarea value={form.objetivos_especificos} onChange={e=>setForm(f=>({...f,objetivos_especificos:e.target.value}))} rows={2} style={s.textarea} />
                  </div>
                </div>
                <div style={s.grupo('1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Público-alvo</label>
                    <input value={form.publico_alvo} onChange={e=>setForm(f=>({...f,publico_alvo:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Faixa etária</label>
                    <input value={form.faixa_etaria} onChange={e=>setForm(f=>({...f,faixa_etaria:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Capacidade prevista</label>
                    <input value={form.capacidade_prevista} onChange={e=>setForm(f=>({...f,capacidade_prevista:e.target.value}))} style={s.input} placeholder="Ex: 100 crianças" />
                  </div>
                </div>
                <div style={s.grupo('1fr 1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Período início</label>
                    <input type="date" value={form.periodo_inicio} onChange={e=>setForm(f=>({...f,periodo_inicio:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Período fim</label>
                    <input type="date" value={form.periodo_fim} onChange={e=>setForm(f=>({...f,periodo_fim:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Valor total previsto (R$)</label>
                    <input type="number" step="0.01" value={form.valor_total_previsto} onChange={e=>setForm(f=>({...f,valor_total_previsto:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Situação</label>
                    <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input}>
                      {SITUACOES_PLANO.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Observações</label>
                  <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERDE)}>
                    {salvando ? 'Salvando...' : editando ? 'Salvar' : '+ Criar plano'}
                  </button>
                  <button type="button" onClick={() => { setMostrarForm(false); setEditando(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de planos */}
          {planos.length === 0 ? (
            <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
              <div style={{ marginBottom:8 }}><i className="ti ti-clipboard-list" style={{fontSize:32, color:'#C8C6BC'}} /></div>
              <div style={{ fontSize:13 }}>Nenhum plano cadastrado ainda.</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:'1rem' }}>
              {planos.map(p => {
                const [bg,cor] = SITUACAO_COR[p.situacao]||['#F1EFE8','#888780']
                return (
                  <div key={p.id} style={{ background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', overflow:'hidden', cursor:'pointer' }}
                    onClick={() => abrirDetalhe(p)}>
                    <div style={{ background:`${VERDE}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{p.tipo_plano}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A' }}>{p.nome_plano}</div>
                      </div>
                      <span style={s.badge(bg,cor)}>{p.situacao}</span>
                    </div>
                    <div style={{ padding:'12px 14px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                        {[
                          ['Instrumento', p.parceria?.nome_projeto||'—'],
                          ['Projeto', p.projeto?.nome||'—'],
                          ['Período', p.periodo_inicio ? `${fmtData(p.periodo_inicio)} a ${fmtData(p.periodo_fim)}` : '—'],
                          ['Valor previsto', fmt(p.valor_total_previsto)],
                        ].map(([l,v]) => (
                          <div key={l} style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                            <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>{l}</div>
                            <div style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {p.objeto && (
                        <div style={{ fontSize:11, color:'#5F5E5A', marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                          {p.objeto}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={e=>{e.stopPropagation();abrirDetalhe(p)}} style={{ ...s.btn(VERDE), flex:1, fontSize:11 }}>Ver plano completo →</button>
                        <button onClick={e=>{e.stopPropagation();editarPlano(p)}} style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Editar</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ===== ABA DETALHE ===== */}
      {aba === 'detalhe' && planoSel && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
            <button onClick={() => setAba('lista')} style={s.btn('#F1EFE8','#5F5E5A')}>← Voltar</button>
            <button onClick={() => editarPlano(planoSel)} style={s.btn(AZUL)}>Editar plano</button>
          </div>

          {/* Cabeçalho do plano */}
          <div style={{ ...s.card, background:'linear-gradient(135deg, #EAF3DE, #F8F7F2)', marginBottom:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11, color:'#888780', marginBottom:2 }}>{planoSel.tipo_plano}</div>
                <div style={{ fontSize:16, fontWeight:600, color:'#2C2C2A' }}>{planoSel.nome_plano}</div>
              </div>
              <span style={s.badge(...(SITUACAO_COR[planoSel.situacao]||['#F1EFE8','#888780']))}>{planoSel.situacao}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:10 }}>
              {[
                ['Instrumento', planoSel.parceria?.nome_projeto||'—'],
                ['Projeto', planoSel.projeto?.nome||'—'],
                ['Órgão/parceiro', planoSel.orgao_ou_parceiro||'—'],
                ['Período', planoSel.periodo_inicio ? `${fmtData(planoSel.periodo_inicio)} a ${fmtData(planoSel.periodo_fim)}` : '—'],
                ['Valor previsto', fmt(planoSel.valor_total_previsto)],
                ['Público-alvo', planoSel.publico_alvo||'—'],
                ['Faixa etária', planoSel.faixa_etaria||'—'],
                ['Capacidade', planoSel.capacidade_prevista||'—'],
              ].map(([l,v]) => (
                <div key={l} style={{ background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'6px 10px' }}>
                  <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{l}</div>
                  <div style={{ fontSize:11, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            {planoSel.objeto && (
              <div style={{ background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'8px 10px', marginBottom:6 }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>Objeto</div>
                <div style={{ fontSize:12 }}>{planoSel.objeto}</div>
              </div>
            )}
          </div>

          {/* Abas do detalhe */}
          <div style={{ display:'flex', gap:6, marginBottom:'1rem', flexWrap:'wrap' }}>
            {[['metas','Metas'],['atividades','Atividades previstas'],['execucao','Execução realizada'],['usuarios','Usuários'],].map(([id,label]) => (
              <button key={id} onClick={() => setAbaDetalhe(id)} style={s.tabSec(abaDetalhe===id)}>{label}</button>
            ))}
          </div>

          {/* Metas */}
          {abaDetalhe === 'metas' && (
            <div>
              <div style={s.card}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Metas do plano</div>
                <form onSubmit={salvarMeta} style={{ background:'#F8F7F2', borderRadius:10, padding:12, marginBottom:'1rem' }}>
                  <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>{editandoMeta ? 'Editar meta' : 'Adicionar meta'}</div>
                  <div style={s.grupo('2fr 1fr')}>
                    <div>
                      <label style={s.label}>Descrição da meta *</label>
                      <input value={formMeta.descricao_meta} onChange={e=>setFormMeta(f=>({...f,descricao_meta:e.target.value}))} style={s.input} required placeholder="Ex: Atender crianças de 02 a 05 anos" />
                    </div>
                    <div>
                      <label style={s.label}>Indicador</label>
                      <input value={formMeta.indicador} onChange={e=>setFormMeta(f=>({...f,indicador:e.target.value}))} style={s.input} placeholder="Ex: Nº de crianças atendidas" />
                    </div>
                  </div>
                  <div style={s.grupo('1fr 1fr 1fr 1fr')}>
                    <div>
                      <label style={s.label}>Qtd prevista</label>
                      <input type="number" value={formMeta.quantidade_prevista} onChange={e=>setFormMeta(f=>({...f,quantidade_prevista:e.target.value}))} style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Unidade</label>
                      <select value={formMeta.unidade_medida} onChange={e=>setFormMeta(f=>({...f,unidade_medida:e.target.value}))} style={s.input}>
                        {UNIDADES_META.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Qtd realizada</label>
                      <input type="number" value={formMeta.quantidade_realizada} onChange={e=>setFormMeta(f=>({...f,quantidade_realizada:e.target.value}))} style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Status</label>
                      <select value={formMeta.status_meta} onChange={e=>setFormMeta(f=>({...f,status_meta:e.target.value}))} style={s.input}>
                        {STATUS_META.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={s.label}>Justificativa / Observação</label>
                    <input value={formMeta.justificativa} onChange={e=>setFormMeta(f=>({...f,justificativa:e.target.value}))} style={s.input} />
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button type="submit" disabled={salvando} style={s.btn(VERDE)}>{editandoMeta ? 'Salvar' : '+ Adicionar meta'}</button>
                    {editandoMeta && <button type="button" onClick={() => { setFormMeta(META_VAZIO); setEditandoMeta(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>}
                  </div>
                </form>

                {metas.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhuma meta cadastrada.</div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr>{['Meta','Indicador','Previsto','Realizado','% Exec.','Status',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {metas.map(m => {
                        const [bg,cor] = STATUS_META_COR[m.status_meta]||['#F1EFE8','#888780']
                        const p = pct(Number(m.quantidade_realizada||0), Number(m.quantidade_prevista||0))
                        return (
                          <tr key={m.id}>
                            <td style={{ ...s.td, fontWeight:500, maxWidth:200 }}>{m.descricao_meta}</td>
                            <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{m.indicador||'—'}</td>
                            <td style={s.td}>{m.quantidade_prevista||'—'} {m.unidade_medida}</td>
                            <td style={{ ...s.td, color:VERDE, fontWeight:500 }}>{m.quantidade_realizada||'—'}</td>
                            <td style={s.td}>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <div style={{ width:50, height:5, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                                  <div style={{ height:'100%', width:Math.min(p,100)+'%', background:p>=100?VERDE:p>=50?LARANJA:VERMELHO, borderRadius:99 }} />
                                </div>
                                <span>{p}%</span>
                              </div>
                            </td>
                            <td style={s.td}><span style={s.badge(bg,cor)}>{m.status_meta}</span></td>
                            <td style={s.td}>
                              <button onClick={() => { setFormMeta({...m, quantidade_prevista:m.quantidade_prevista||'', quantidade_realizada:m.quantidade_realizada||''}); setEditandoMeta(m.id) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Atividades previstas */}
          {abaDetalhe === 'atividades' && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Atividades previstas</div>
              <form onSubmit={salvarAtividade} style={{ background:'#F8F7F2', borderRadius:10, padding:12, marginBottom:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>{editandoAtiv ? 'Editar atividade' : 'Adicionar atividade prevista'}</div>
                <div style={s.grupo('2fr 1fr')}>
                  <div>
                    <label style={s.label}>Nome da atividade *</label>
                    <input value={formAtiv.nome_atividade} onChange={e=>setFormAtiv(f=>({...f,nome_atividade:e.target.value}))} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Status</label>
                    <select value={formAtiv.status} onChange={e=>setFormAtiv(f=>({...f,status:e.target.value}))} style={s.input}>
                      {STATUS_ATIVIDADE.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom:8 }}>
                  <label style={s.label}>Descrição</label>
                  <input value={formAtiv.descricao} onChange={e=>setFormAtiv(f=>({...f,descricao:e.target.value}))} style={s.input} />
                </div>
                <div style={s.grupo('1fr 1fr 2fr')}>
                  <div>
                    <label style={s.label}>Período início</label>
                    <input type="date" value={formAtiv.periodo_inicio} onChange={e=>setFormAtiv(f=>({...f,periodo_inicio:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Período fim</label>
                    <input type="date" value={formAtiv.periodo_fim} onChange={e=>setFormAtiv(f=>({...f,periodo_fim:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Responsável / Equipe prevista</label>
                    <input value={formAtiv.responsavel_equipe} onChange={e=>setFormAtiv(f=>({...f,responsavel_equipe:e.target.value}))} style={s.input} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="submit" disabled={salvando} style={s.btn(VERDE)}>{editandoAtiv ? 'Salvar' : '+ Adicionar'}</button>
                  {editandoAtiv && <button type="button" onClick={() => { setFormAtiv(ATIVIDADE_VAZIA); setEditandoAtiv(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>}
                </div>
              </form>

              {atividades.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhuma atividade prevista cadastrada.</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Atividade','Descrição','Período','Responsável','Status',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {atividades.map(a => (
                      <tr key={a.id}>
                        <td style={{ ...s.td, fontWeight:500 }}>{a.nome_atividade}</td>
                        <td style={{ ...s.td, color:'#888780', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.descricao||'—'}</td>
                        <td style={{ ...s.td, fontSize:11, whiteSpace:'nowrap' }}>{a.periodo_inicio ? `${fmtData(a.periodo_inicio)} a ${fmtData(a.periodo_fim)}` : '—'}</td>
                        <td style={s.td}>{a.responsavel_equipe||'—'}</td>
                        <td style={s.td}><span style={s.badge(a.status==='realizada'?'#EAF3DE':a.status==='cancelada'?'#FCEBEB':'#E6F1FB', a.status==='realizada'?'#3B6D11':a.status==='cancelada'?'#A32D2D':'#185FA5')}>{a.status}</span></td>
                        <td style={s.td}>
                          <button onClick={() => { setFormAtiv({...a, periodo_inicio:a.periodo_inicio||'', periodo_fim:a.periodo_fim||''}); setEditandoAtiv(a.id) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Execução realizada */}
          {abaDetalhe === 'execucao' && (
            <div>
              <div style={{ ...s.card, background:'#E6F1FB', border:'0.5px solid #B3D1F0' }}>
                <div style={{ fontSize:12, color:'#185FA5' }}>
                  <strong>ℹ Execução realizada</strong> — dados puxados automaticamente do módulo Atendimentos/Atividades vinculados ao projeto <strong>{planoSel.projeto?.nome||'—'}</strong>.
                </div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>
                  Atendimentos e atividades realizadas ({atendimentos.length})
                </div>
                {atendimentos.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhum atendimento registrado para este projeto.</div>
                ) : (
                  <div style={{ maxHeight:400, overflowY:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead style={{ position:'sticky', top:0 }}>
                        <tr>{['Data','Tipo','Tema','Profissional','Participantes','Situação'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {atendimentos.map((a,i) => (
                          <tr key={a.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                            <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                            <td style={s.td}>{a.tipo_atend}</td>
                            <td style={{ ...s.td, color:'#888780' }}>{a.tema||'—'}</td>
                            <td style={s.td}>{a.profissional?.nome?.split(' ').slice(0,2).join(' ')||'—'}</td>
                            <td style={{ ...s.td, textAlign:'center' }}>{a.qtd_participantes||'—'}</td>
                            <td style={s.td}><span style={s.badge(a.situacao==='realizado'?'#EAF3DE':'#E6F1FB', a.situacao==='realizado'?'#3B6D11':'#185FA5')}>{a.situacao}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Comparativo metas x execução */}
              {metas.length > 0 && (
                <div style={s.card}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Comparativo metas previstas x realizadas</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr>{['Meta','Previsto','Realizado','% Exec.','Status'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {metas.map(m => {
                        const [bg,cor] = STATUS_META_COR[m.status_meta]||['#F1EFE8','#888780']
                        const p = pct(Number(m.quantidade_realizada||0), Number(m.quantidade_prevista||0))
                        return (
                          <tr key={m.id}>
                            <td style={{ ...s.td, fontWeight:500 }}>{m.descricao_meta}</td>
                            <td style={s.td}>{m.quantidade_prevista||'—'} {m.unidade_medida}</td>
                            <td style={{ ...s.td, color:VERDE, fontWeight:600 }}>{m.quantidade_realizada||'—'}</td>
                            <td style={s.td}>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <div style={{ width:60, height:6, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                                  <div style={{ height:'100%', width:Math.min(p,100)+'%', background:p>=100?VERDE:p>=50?LARANJA:VERMELHO, borderRadius:99 }} />
                                </div>
                                <span style={{ fontWeight:600 }}>{p}%</span>
                              </div>
                            </td>
                            <td style={s.td}><span style={s.badge(bg,cor)}>{m.status_meta}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Usuários */}
          {abaDetalhe === 'usuarios' && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>
                Usuários / Público atendido — {planoSel.projeto?.nome||'projeto vinculado'}
              </div>
              <div style={{ fontSize:12, color:'#888780', marginBottom:'.85rem' }}>
                {usuarios.length} usuário{usuarios.length!==1?'s':''} ativo{usuarios.length!==1?'s':''}
              </div>
              {usuarios.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhum usuário ativo vinculado a este projeto.</div>
              ) : (
                <div style={{ maxHeight:400, overflowY:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead style={{ position:'sticky', top:0 }}>
                      <tr>{['Nome','Data nasc.','Ingresso','Situação'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {usuarios.map((u,i) => (
                        <tr key={u.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                          <td style={{ ...s.td, fontWeight:500 }}>{u.nome}</td>
                          <td style={s.td}>{fmtData(u.data_nascimento)}</td>
                          <td style={s.td}>{fmtData(u.data_ingresso)}</td>
                          <td style={s.td}><span style={s.badge('#EAF3DE','#3B6D11')}>{u.situacao}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
