import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F', ROXO = '#8B2FC9'

const TIPOS_PROJETO = [
  'Projeto institucional permanente',
  'Projeto novo de emenda parlamentar',
  'Projeto novo de edital',
  'Projeto de termo de colaboração',
  'Projeto de termo de fomento',
  'Projeto de convênio',
  'Projeto de parceria específica',
  'Ação pontual / evento',
  'Outro',
]

const SITUACOES = ['ativo', 'inativo', 'em planejamento', 'encerrado', 'suspenso', 'outro']

const SITUACAO_COR = {
  'ativo': ['#EAF3DE','#3B6D11'],
  'inativo': ['#F1EFE8','#888780'],
  'em planejamento': ['#E6F1FB','#185FA5'],
  'encerrado': ['#F1EFE8','#5F5E5A'],
  'suspenso': ['#FAEEDA','#854F0B'],
  'outro': ['#EEEDFE','#534AB7'],
}

const FORM_VAZIO = {
  nome:'', tipo:'Projeto institucional permanente', descricao:'',
  publico_alvo:'', faixa_etaria:'', capacidade_prevista:'',
  abrangencia:'Município de Teresópolis/RJ', funcionamento:'',
  situacao:'ativo', vinculado_instrumento:false, instrumento_vinc:'', parceria_id:'',
  aceita_equipe:true, aceita_atendimentos:true, aceita_financeiro:true, observacoes:'',
}

export default function Projetos() {
  const [projetos, setProjetos] = useState([])
  const [parcerias, setParcerias] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)

  useEffect(() => {
    carregar()
    supabase.from('parcerias').select('id,nome_projeto,tipo').order('nome_projeto').then(({ data }) => setParcerias(data || []))
  }, [])

  async function carregar() {
    const { data } = await supabase.from('projetos').select('*').order('nome')
    setProjetos(data || [])
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = { ...form, parceria_id: form.parceria_id ? parseInt(form.parceria_id) : null }
    let error
    if (editando) {
      ;({ error } = await supabase.from('projetos').update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from('projetos').insert(dados))
    }
    if (error) setMsg('Erro: ' + error.message)
    else { setMsg('✅ Projeto salvo!'); setForm(FORM_VAZIO); setEditando(null); setMostrarForm(false); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  function editar(p) {
    setForm({ ...FORM_VAZIO, ...p, parceria_id: p.parceria_id || '' })
    setEditando(p.id)
    setMostrarForm(true)
    window.scrollTo(0,0)
  }

  const lista = filtro === 'todos' ? projetos : projetos.filter(p => p.situacao === filtro)
  const ativos = projetos.filter(p => p.situacao === 'ativo').length

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    tab: ativo => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?VERDE:'#D3D1C7'}`, background:ativo?VERDE:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
  }

  async function excluir(id) {
    
    await supabase.from('projetos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }


  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Projetos / Serviços / Ações</div>
          <div style={{ fontSize:12, color:'#888780' }}>{ativos} projetos ativos · {projetos.length} total</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO) }}
          style={s.btn(mostrarForm ? '#F1EFE8' : VERDE, mostrarForm ? '#5F5E5A' : '#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Novo projeto'}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:msg.includes('✅')?'#F2FAE8':'#FEF2F2', color:msg.includes('✅')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Formulário */}
      {mostrarForm && (
        <div style={{ ...s.card, borderColor:'#C0DD97' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>
            {editando ? 'Editar projeto' : 'Novo projeto / serviço / ação'}
          </div>
          <form onSubmit={salvar}>
            <div style={s.grupo('2fr 1fr')}>
              <div>
                <label style={s.label}>Nome do projeto / serviço / ação *</label>
                <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Tipo *</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={s.input} required>
                  {TIPOS_PROJETO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Descrição curta</label>
              <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
                rows={3} style={{ ...s.input, resize:'vertical' }} placeholder="Resumo do projeto..." />
            </div>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Público-alvo</label>
                <input value={form.publico_alvo} onChange={e=>setForm(f=>({...f,publico_alvo:e.target.value}))} style={s.input} placeholder="Ex: Crianças de 02 a 05 anos" />
              </div>
              <div>
                <label style={s.label}>Faixa etária</label>
                <input value={form.faixa_etaria} onChange={e=>setForm(f=>({...f,faixa_etaria:e.target.value}))} style={s.input} placeholder="Ex: 02 a 05 anos" />
              </div>
              <div>
                <label style={s.label}>Capacidade prevista</label>
                <input value={form.capacidade_prevista} onChange={e=>setForm(f=>({...f,capacidade_prevista:e.target.value}))} style={s.input} placeholder="Ex: Até 100 crianças" />
              </div>
            </div>
            <div style={s.grupo('2fr 1fr')}>
              <div>
                <label style={s.label}>Funcionamento</label>
                <input value={form.funcionamento} onChange={e=>setForm(f=>({...f,funcionamento:e.target.value}))} style={s.input} placeholder="Ex: Período integral, encontros semanais..." />
              </div>
              <div>
                <label style={s.label}>Abrangência territorial</label>
                <input value={form.abrangencia} onChange={e=>setForm(f=>({...f,abrangencia:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={s.grupo('1fr 1fr')}>
              <div>
                <label style={s.label}>Situação</label>
                <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input}>
                  {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.vinculado_instrumento} onChange={e=>setForm(f=>({...f,vinculado_instrumento:e.target.checked}))} />
                  Vinculado a instrumento (emenda, edital, parceria...)
                </label>
              </div>
            </div>
            {form.vinculado_instrumento && (
              <div style={s.grupo('1fr 1fr')}>
                <div>
                  <label style={s.label}>Instrumento de vinculação</label>
                  <input value={form.instrumento_vinc} onChange={e=>setForm(f=>({...f,instrumento_vinc:e.target.value}))} style={s.input} placeholder="Ex: Edital SMASDH 2025" />
                </div>
                <div>
                  <label style={s.label}>Parceria cadastrada no sistema</label>
                  <select value={form.parceria_id} onChange={e=>setForm(f=>({...f,parceria_id:e.target.value}))} style={s.input}>
                    <option value="">Nenhuma</option>
                    {parcerias.map(p => <option key={p.id} value={p.id}>{p.nome_projeto}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
              {[
                { campo:'aceita_equipe', label:'Aceita equipe vinculada' },
                { campo:'aceita_atendimentos', label:'Aceita atendimentos/atividades' },
                { campo:'aceita_financeiro', label:'Aceita receitas/despesas' },
              ].map(item => (
                <label key={item.campo} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                  <input type="checkbox" checked={form[item.campo]} onChange={e=>setForm(f=>({...f,[item.campo]:e.target.checked}))} />
                  {item.label}
                </label>
              ))}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Observações</label>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', marginBottom:4 }}>
                <input type="checkbox" id="exibir_transp" checked={form.exibir_transparencia !== false}
                  onChange={e=>setForm(f=>({...f,exibir_transparencia:e.target.checked}))}
                  style={{ width:14, height:14, cursor:'pointer' }} />
                <label htmlFor="exibir_transp" style={{ fontSize:12, color:'#5F5E5A', cursor:'pointer' }}>
                  Exibir na página de Transparência Pública
                </label>
              </div>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERDE)}>
                {salvando ? 'Salvando...' : editando ? '💾 Salvar alterações' : '+ Cadastrar projeto'}
              </button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditando(null); setForm(FORM_VAZIO) }} style={s.btn('#F1EFE8','#5F5E5A')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setFiltro('todos')} style={s.tab(filtro==='todos')}>Todos ({projetos.length})</button>
        {SITUACOES.map(sit => {
          const count = projetos.filter(p => p.situacao === sit).length
          if (count === 0) return null
          return <button key={sit} onClick={() => setFiltro(sit)} style={s.tab(filtro===sit)}>{sit.charAt(0).toUpperCase()+sit.slice(1)} ({count})</button>
        })}
      </div>

      {/* Lista de projetos */}
      {lista.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:13 }}>Nenhum projeto cadastrado.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'1rem' }}>
          {lista.map(p => {
            const [bg, cor] = SITUACAO_COR[p.situacao] || ['#F1EFE8','#888780']
            return (
              <div key={p.id} style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, overflow:'hidden' }}>
                <div style={{ background:`${VERDE}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{p.tipo}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A' }}>{p.nome}</div>
                  </div>
                  <span style={s.badge(bg,cor)}>{p.situacao}</span>
                </div>
                <div style={{ padding:'12px 14px' }}>
                  {p.descricao && (
                    <div style={{ fontSize:11, color:'#5F5E5A', marginBottom:8, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {p.descricao}
                    </div>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                    {p.publico_alvo && (
                      <div style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                        <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>Público-alvo</div>
                        <div style={{ fontSize:11 }}>{p.publico_alvo}</div>
                      </div>
                    )}
                    {p.faixa_etaria && (
                      <div style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                        <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>Faixa etária</div>
                        <div style={{ fontSize:11 }}>{p.faixa_etaria}</div>
                      </div>
                    )}
                    {p.capacidade_prevista && (
                      <div style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                        <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>Capacidade</div>
                        <div style={{ fontSize:11 }}>{p.capacidade_prevista}</div>
                      </div>
                    )}
                    {p.funcionamento && (
                      <div style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                        <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>Funcionamento</div>
                        <div style={{ fontSize:11 }}>{p.funcionamento}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
                    {p.aceita_equipe && <span style={s.badge('#EAF3DE','#3B6D11')}>👥 Equipe</span>}
                    {p.aceita_atendimentos && <span style={s.badge('#E6F1FB','#185FA5')}>📋 Atendimentos</span>}
                    {p.aceita_financeiro && <span style={s.badge('#FAEEDA','#854F0B')}>💰 Financeiro</span>}
                    {p.vinculado_instrumento && <span style={s.badge('#EEEDFE','#534AB7')}>🔗 Instrumento</span>}
                  </div>
                  <button onClick={() => editar(p)} style={{ ...s.btn('#F1EFE8','#5F5E5A'), width:'100%', fontSize:11 }}>
                    Editar projeto
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Modal confirmação exclusão */}
      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Confirmar exclusão</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.5rem' }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir)}
                style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'#E8212A', color:'#fff', fontWeight:600, cursor:'pointer' }}>
                Excluir
              </button>
              <button onClick={() => setConfirmandoExcluir(null)}
                style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
