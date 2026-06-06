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
  exibir_transparencia:true,
  // Campos CNAS
  atividades_previstas:'', refeicoes_previstas:'', recursos_humanos:'',
  participacao_usuarios:'', monitoramento_avaliacao:'', temas_trabalhados:'',
}

export default function Projetos() {
  const [projetos, setProjetos] = useState([])
  const [parcerias, setParcerias] = useState([])
  const [equipe, setEquipe] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [projetoDetalhe, setProjetoDetalhe] = useState(null)
  const [abaCNAS, setAbaCNAS] = useState(false)

  useEffect(() => {
    carregar()
    supabase.from('parcerias').select('id,nome_projeto,tipo').order('nome_projeto').then(({ data }) => setParcerias(data || []))
    supabase.from('equipe').select('id,nome,funcao,tipo_vinculo,orgao_origem').eq('situacao','ativo').order('funcao,nome').then(({ data }) => setEquipe(data || []))
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
    setProjetoDetalhe(null)
    window.scrollTo(0,0)
  }

  function preencherEquipe() {
    const texto = equipe.map(e => `${e.nome} — ${e.funcao}${e.orgao_origem ? ` (${e.orgao_origem})` : ''}`).join('\n')
    setForm(f => ({ ...f, recursos_humanos: texto }))
  }

  const lista = filtro === 'todos' ? projetos : projetos.filter(p => p.situacao === filtro)
  const ativos = projetos.filter(p => p.situacao === 'ativo').length

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    textarea: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box', resize:'vertical' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    tab: ativo => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?VERDE:'#D3D1C7'}`, background:ativo?VERDE:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    tabSec: ativo => ({ padding:'5px 12px', fontSize:11, borderRadius:8, border:`0.5px solid ${ativo?ROXO:'#D3D1C7'}`, background:ativo?ROXO:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    secao: { fontSize:11, fontWeight:600, color:ROXO, borderLeft:`3px solid ${ROXO}`, paddingLeft:8, margin:'16px 0 8px', textTransform:'uppercase', letterSpacing:'.05em' },
    infoBox: { background:'#F8F7F2', borderRadius:8, padding:'8px 10px', marginBottom:8 },
    infoLabel: { fontSize:10, color:'#888780', marginBottom:2 },
    infoVal: { fontSize:12, lineHeight:1.6, whiteSpace:'pre-line' },
  }

  async function excluir(id) {
    await supabase.from('projetos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }

  // Tela de detalhe
  if (projetoDetalhe) {
    const p = projetoDetalhe
    const [bg,cor] = SITUACAO_COR[p.situacao] || ['#F1EFE8','#888780']
    return (
      <div style={{ padding:'1.25rem 1.5rem' }}>
        <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
          <button onClick={() => setProjetoDetalhe(null)} style={s.btn('#F1EFE8','#5F5E5A')}>← Voltar</button>
          <button onClick={() => editar(p)} style={s.btn(AZUL)}>Editar projeto</button>
        </div>

        {/* Cabeçalho */}
        <div style={{ ...s.card, background:'linear-gradient(135deg,#EAF3DE,#F8F7F2)', marginBottom:'1rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'#888780', marginBottom:2 }}>{p.tipo}</div>
              <div style={{ fontSize:16, fontWeight:600 }}>{p.nome}</div>
            </div>
            <span style={s.badge(bg,cor)}>{p.situacao}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:10 }}>
            {[
              ['Público-alvo', p.publico_alvo],
              ['Faixa etária', p.faixa_etaria],
              ['Capacidade', p.capacidade_prevista],
              ['Funcionamento', p.funcionamento],
              ['Abrangência', p.abrangencia],
            ].filter(([,v]) => v).map(([l,v]) => (
              <div key={l} style={{ background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'6px 10px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{l}</div>
                <div style={{ fontSize:11, fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
          {p.descricao && (
            <div style={{ background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>Descrição</div>
              <div style={{ fontSize:12 }}>{p.descricao}</div>
            </div>
          )}
        </div>

        {/* Abas */}
        <div style={{ display:'flex', gap:6, marginBottom:'1rem', flexWrap:'wrap' }}>
          <button onClick={() => setAbaCNAS(false)} style={s.tabSec(!abaCNAS)}>Geral</button>
          <button onClick={() => setAbaCNAS(true)} style={s.tabSec(abaCNAS)}>📋 Ficha CNAS</button>
        </div>

        {!abaCNAS && (
          <div style={s.card}>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
              {p.aceita_equipe && <span style={s.badge('#EAF3DE','#3B6D11')}>👥 Equipe</span>}
              {p.aceita_atendimentos && <span style={s.badge('#E6F1FB','#185FA5')}>📋 Atendimentos</span>}
              {p.aceita_financeiro && <span style={s.badge('#FAEEDA','#854F0B')}>💰 Financeiro</span>}
              {p.vinculado_instrumento && <span style={s.badge('#EEEDFE','#534AB7')}>🔗 {p.instrumento_vinc||'Instrumento'}</span>}
              {p.exibir_transparencia && <span style={s.badge('#E6F1FB','#185FA5')}>🌐 Transparência</span>}
            </div>
            {p.observacoes && <div style={{ fontSize:12, color:'#5F5E5A' }}>{p.observacoes}</div>}
          </div>
        )}

        {abaCNAS && (
          <div style={{ background:'#F0EAFA', border:'0.5px solid #C9B3E8', borderRadius:12, padding:'1rem 1.25rem' }}>
            <div style={{ fontSize:13, fontWeight:600, color:ROXO, marginBottom:14 }}>📋 Ficha CNAS — {p.nome}</div>

            {[
              ['Público-alvo', p.publico_alvo],
              ['Faixa etária', p.faixa_etaria],
              ['Capacidade de atendimento', p.capacidade_prevista],
              ['Abrangência territorial', p.abrangencia],
              ['Funcionamento', p.funcionamento],
            ].filter(([,v]) => v).map(([l,v]) => (
              <div key={l}>
                <div style={s.secao}>{l}</div>
                <div style={s.infoBox}><div style={s.infoVal}>{v}</div></div>
              </div>
            ))}

            {p.atividades_previstas && <>
              <div style={s.secao}>Atividades previstas</div>
              <div style={s.infoBox}><div style={s.infoVal}>{p.atividades_previstas}</div></div>
            </>}

            {p.temas_trabalhados && <>
              <div style={s.secao}>Temas trabalhados</div>
              <div style={s.infoBox}><div style={s.infoVal}>{p.temas_trabalhados}</div></div>
            </>}

            {p.refeicoes_previstas && <>
              <div style={s.secao}>Refeições previstas</div>
              <div style={s.infoBox}><div style={s.infoVal}>{p.refeicoes_previstas}</div></div>
            </>}

            {p.recursos_humanos && <>
              <div style={s.secao}>Recursos humanos envolvidos</div>
              <div style={s.infoBox}><div style={s.infoVal}>{p.recursos_humanos}</div></div>
            </>}

            {p.participacao_usuarios && <>
              <div style={s.secao}>Participação dos usuários e famílias</div>
              <div style={s.infoBox}><div style={s.infoVal}>{p.participacao_usuarios}</div></div>
            </>}

            {p.monitoramento_avaliacao && <>
              <div style={s.secao}>Monitoramento e avaliação</div>
              <div style={s.infoBox}><div style={s.infoVal}>{p.monitoramento_avaliacao}</div></div>
            </>}

            <div style={{ marginTop:14 }}>
              <button onClick={() => editar(p)} style={s.btn(ROXO)}>✏️ Editar campos CNAS</button>
            </div>
          </div>
        )}
      </div>
    )
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
                <label style={s.label}>Nome *</label>
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
              <label style={s.label}>Descrição</label>
              <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={2} style={s.textarea} />
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
                <input value={form.capacidade_prevista} onChange={e=>setForm(f=>({...f,capacidade_prevista:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={s.grupo('2fr 1fr')}>
              <div>
                <label style={s.label}>Funcionamento</label>
                <input value={form.funcionamento} onChange={e=>setForm(f=>({...f,funcionamento:e.target.value}))} style={s.input} />
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
                  Vinculado a instrumento
                </label>
              </div>
            </div>
            {form.vinculado_instrumento && (
              <div style={s.grupo('1fr 1fr')}>
                <div>
                  <label style={s.label}>Instrumento de vinculação</label>
                  <input value={form.instrumento_vinc} onChange={e=>setForm(f=>({...f,instrumento_vinc:e.target.value}))} style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Parceria cadastrada</label>
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
                { campo:'exibir_transparencia', label:'Exibir na transparência pública' },
              ].map(item => (
                <label key={item.campo} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                  <input type="checkbox" checked={!!form[item.campo]} onChange={e=>setForm(f=>({...f,[item.campo]:e.target.checked}))} />
                  {item.label}
                </label>
              ))}
            </div>

            {/* Campos CNAS */}
            <div style={{ background:'#F0EAFA', border:'0.5px solid #C9B3E8', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:ROXO, marginBottom:12 }}>📋 Campos CNAS</div>

              <div style={{ marginBottom:10 }}>
                <label style={s.label}>Atividades previstas</label>
                <textarea value={form.atividades_previstas} onChange={e=>setForm(f=>({...f,atividades_previstas:e.target.value}))}
                  rows={2} style={s.textarea} placeholder="Descreva as atividades previstas para este projeto..." />
              </div>

              <div style={{ marginBottom:10 }}>
                <label style={s.label}>Temas trabalhados</label>
                <textarea value={form.temas_trabalhados} onChange={e=>setForm(f=>({...f,temas_trabalhados:e.target.value}))}
                  rows={2} style={s.textarea} placeholder="Ex: masculinidades, relações de gênero, Lei Maria da Penha..." />
              </div>

              <div style={{ marginBottom:10 }}>
                <label style={s.label}>Refeições previstas</label>
                <input value={form.refeicoes_previstas} onChange={e=>setForm(f=>({...f,refeicoes_previstas:e.target.value}))}
                  style={s.input} placeholder="Ex: desjejum, almoço, lanche e jantar" />
              </div>

              <div style={{ marginBottom:4 }}>
                <label style={s.label}>Recursos humanos envolvidos</label>
                <textarea value={form.recursos_humanos} onChange={e=>setForm(f=>({...f,recursos_humanos:e.target.value}))}
                  rows={2} style={{ ...s.textarea, marginBottom:4 }} placeholder="Descreva a equipe envolvida..." />
                {equipe.length > 0 && (
                  <button type="button" onClick={preencherEquipe}
                    style={{ fontSize:11, background:'none', border:'none', color:AZUL, cursor:'pointer', padding:0 }}>
                    ↑ Preencher com equipe ativa atual
                  </button>
                )}
              </div>

              <div style={{ marginBottom:10, marginTop:10 }}>
                <label style={s.label}>Participação dos usuários e famílias</label>
                <textarea value={form.participacao_usuarios} onChange={e=>setForm(f=>({...f,participacao_usuarios:e.target.value}))}
                  rows={2} style={s.textarea} placeholder="Como os usuários e famílias participam..." />
              </div>

              <div style={{ marginBottom:0 }}>
                <label style={s.label}>Monitoramento e avaliação</label>
                <textarea value={form.monitoramento_avaliacao} onChange={e=>setForm(f=>({...f,monitoramento_avaliacao:e.target.value}))}
                  rows={2} style={s.textarea} placeholder="Como será feito o monitoramento e avaliação..." />
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Observações</label>
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

      {/* Lista */}
      {lista.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:13 }}>Nenhum projeto cadastrado.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'1rem' }}>
          {lista.map(p => {
            const [bg, cor] = SITUACAO_COR[p.situacao] || ['#F1EFE8','#888780']
            const temCnas = p.atividades_previstas || p.recursos_humanos || p.participacao_usuarios || p.monitoramento_avaliacao
            return (
              <div key={p.id} style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, overflow:'hidden' }}>
                <div style={{ background:`${VERDE}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{p.tipo}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A' }}>{p.nome}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <span style={s.badge(bg,cor)}>{p.situacao}</span>
                    {temCnas && <span style={s.badge('#F0EAFA',ROXO)}>CNAS ✓</span>}
                  </div>
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
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => { setProjetoDetalhe(p); setAbaCNAS(false) }} style={{ ...s.btn(VERDE), flex:1, fontSize:11 }}>Ver ficha completa →</button>
                    <button onClick={() => editar(p)} style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Editar</button>
                    <button onClick={() => setConfirmandoExcluir(p.id)} style={{ ...s.btn('#FEF2F2',VERMELHO), fontSize:11 }}>Excluir</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Confirmar exclusão</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.5rem' }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir)}
                style={{ padding:'8px 20px', borderRadius:8, border:'none', background:VERMELHO, color:'#fff', fontWeight:600, cursor:'pointer' }}>
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
