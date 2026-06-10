import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

const TIPOS_ATEND = [
  'Atendimento individual', 'Atendimento familiar', 'Atendimento em grupo',
  'Acompanhamento de caso', 'Encaminhamento', 'Oficina', 'Palestra',
  'Roda de conversa', 'Reunião com famílias', 'Reunião de equipe',
  'Reunião com parceiros/rede', 'Evento institucional', 'Ação comunitária',
  'Atividade recreativa', 'Atividade pedagógica', 'Atividade socioeducativa',
  'Contato com família', 'Outro',
]

const TIPOS_INDIVIDUAIS = ['Atendimento individual', 'Atendimento familiar', 'Acompanhamento de caso', 'Encaminhamento', 'Contato com família']

const PUBLICOS = [
  'Crianças', 'Adolescentes', 'Famílias / responsáveis', 'Adultos',
  'Comunidade', 'Equipe interna', 'Parceiros / rede',
  'Homens autores de violência', 'Crianças e adolescentes impactados por violência', 'Outro',
]

const SITUACOES = ['realizado', 'agendado', 'cancelado', 'reagendado', 'em acompanhamento', 'encerrado', 'outro']

const SITUACAO_COR = {
  'realizado': ['#EAF3DE','#3B6D11'],
  'agendado': ['#E6F1FB','#185FA5'],
  'cancelado': ['#FCEBEB','#A32D2D'],
  'reagendado': ['#FAEEDA','#854F0B'],
  'em acompanhamento': ['#FAEEDA','#854F0B'],
  'encerrado': ['#F1EFE8','#888780'],
  'outro': ['#EEEDFE','#534AB7'],
}

const FORM_VAZIO = {
  data_atend: new Date().toISOString().slice(0,10),
  projeto_id: '', tipo_atend: 'Atendimento individual', tema: '',
  descricao: '', qtd_participantes: 1, publico_participante: [],
  pessoa_atendida: '', profissional_id: '', equipe_ids: [],
  encaminhamentos: '', orgao_encaminhamento: '', situacao: 'realizado', observacoes: '',
}

export default function Atendimentos() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const [atendimentos, setAtendimentos] = useState([])
  const [projetos, setProjetos] = useState([])
  const [equipe, setEquipe] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [filtros, setFiltros] = useState({ dataInicio:'', dataFim:'', projeto_id:'', tipo_atend:'', profissional_id:'', situacao:'' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('projetos').select('id,nome,tipo').eq('aceita_atendimentos', true).order('nome').then(({ data }) => setProjetos(data || []))
    supabase.from('equipe').select('id,nome,funcao').eq('situacao','ativo').order('nome').then(({ data }) => setEquipe(data || []))
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    let q = supabase.from('atendimentos')
      .select('*, projeto:projetos(nome,tipo), profissional:equipe(nome,funcao)')
      .order('data_atend', { ascending: false })
    if (filtros.dataInicio) q = q.gte('data_atend', filtros.dataInicio)
    if (filtros.dataFim) q = q.lte('data_atend', filtros.dataFim)
    if (filtros.projeto_id) q = q.eq('projeto_id', parseInt(filtros.projeto_id))
    if (filtros.tipo_atend) q = q.eq('tipo_atend', filtros.tipo_atend)
    if (filtros.profissional_id) q = q.eq('profissional_id', parseInt(filtros.profissional_id))
    if (filtros.situacao) q = q.eq('situacao', filtros.situacao)
    const { data } = await q
    setAtendimentos(data || [])
    setLoading(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : null,
      profissional_id: form.profissional_id ? parseInt(form.profissional_id) : null,
      qtd_participantes: form.qtd_participantes ? parseInt(form.qtd_participantes) : null,
      equipe_ids: form.equipe_ids.map(id => parseInt(id)),
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('atendimentos').update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from('atendimentos').insert(dados))
    }
    if (error) setMsg('Erro: ' + error.message)
    else { setMsg('Registro salvo!'); setForm(FORM_VAZIO); setEditando(null); setMostrarForm(false); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  function editar(a) {
    setForm({
      data_atend: a.data_atend, projeto_id: a.projeto_id||'', tipo_atend: a.tipo_atend,
      tema: a.tema||'', descricao: a.descricao, qtd_participantes: a.qtd_participantes||1,
      publico_participante: a.publico_participante||[], pessoa_atendida: a.pessoa_atendida||'',
      profissional_id: a.profissional_id||'', equipe_ids: a.equipe_ids||[],
      encaminhamentos: a.encaminhamentos||'', orgao_encaminhamento: a.orgao_encaminhamento||'',
      situacao: a.situacao, observacoes: a.observacoes||'',
    })
    setEditando(a.id)
    setMostrarForm(true)
    window.scrollTo(0,0)
  }

  function togglePublico(pub) {
    setForm(f => ({ ...f, publico_participante: f.publico_participante.includes(pub) ? f.publico_participante.filter(p => p !== pub) : [...f.publico_participante, pub] }))
  }

  function toggleEquipe(id) {
    const sid = String(id)
    setForm(f => ({ ...f, equipe_ids: f.equipe_ids.includes(sid) ? f.equipe_ids.filter(e => e !== sid) : [...f.equipe_ids, sid] }))
  }

  const isIndividual = TIPOS_INDIVIDUAIS.includes(form.tipo_atend)

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  // Estatísticas
  const totalParticipantes = atendimentos.reduce((a,m) => a + (Number(m.qtd_participantes)||0), 0)
  const totalRealizados = atendimentos.filter(a => a.situacao === 'realizado').length

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
  }

  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)

  async function excluir(id) {
    await supabase.from('atendimentos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }


  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Atendimentos / Atividades</div>
          <div style={{ fontSize:12, color:'#888780' }}>Registro de execução institucional</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO) }}
          style={s.btn(mostrarForm ? '#F1EFE8' : VERDE, mostrarForm ? '#5F5E5A' : '#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Registrar atendimento'}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Formulário */}
      {mostrarForm && (
        <div style={{ ...s.card, borderColor:'#C0DD97' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>
            {editando ? 'Editar registro' : 'Novo atendimento / atividade'}
          </div>
          <form onSubmit={salvar}>
            <div style={s.grupo('1fr 2fr 1fr')}>
              <div>
                <label style={s.label}>Data *</label>
                <input type="date" value={form.data_atend} onChange={e=>setForm(f=>({...f,data_atend:e.target.value}))} style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Projeto / Serviço / Ação vinculada *</label>
                <select value={form.projeto_id} onChange={e=>setForm(f=>({...f,projeto_id:e.target.value}))} style={s.input} required>
                  <option value="">Selecione o projeto...</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Situação</label>
                <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input}>
                  {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={s.grupo('1fr 1fr')}>
              <div>
                <label style={s.label}>Tipo de atendimento / atividade *</label>
                <select value={form.tipo_atend} onChange={e=>setForm(f=>({...f,tipo_atend:e.target.value}))} style={s.input} required>
                  {TIPOS_ATEND.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Tema / motivo</label>
                <input value={form.tema} onChange={e=>setForm(f=>({...f,tema:e.target.value}))} style={s.input} placeholder="Ex: Fortalecimento de vínculos, Orientação social..." />
              </div>
            </div>

            {/* Campo específico para individual */}
            {isIndividual && (
              <div style={{ marginBottom:10 }}>
                <label style={s.label}>Pessoa / família atendida</label>
                <input value={form.pessoa_atendida} onChange={e=>setForm(f=>({...f,pessoa_atendida:e.target.value}))} style={s.input} placeholder="Nome ou identificação (uso interno)" />
              </div>
            )}

            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Descrição / resumo *</label>
              <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
                rows={3} style={{ ...s.input, resize:'vertical' }} required
                placeholder="Descreva o que foi realizado..." />
            </div>

            <div style={s.grupo('1fr 2fr')}>
              <div>
                <label style={s.label}>Quantidade de participantes {!isIndividual && '*'}</label>
                <input type="number" min="1" value={form.qtd_participantes} onChange={e=>setForm(f=>({...f,qtd_participantes:e.target.value}))}
                  style={s.input} required={!isIndividual} />
              </div>
              <div>
                <label style={s.label}>Público participante</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {PUBLICOS.map(pub => (
                    <button key={pub} type="button" onClick={() => togglePublico(pub)}
                      style={{ fontSize:10, padding:'3px 8px', borderRadius:6, cursor:'pointer', border:`0.5px solid ${form.publico_participante.includes(pub)?AZUL:'#D3D1C7'}`, background:form.publico_participante.includes(pub)?'#E6F1FB':'#fff', color:form.publico_participante.includes(pub)?'#185FA5':'#5F5E5A' }}>
                      {form.publico_participante.includes(pub) ? '✓ ' : ''}{pub}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={s.grupo('1fr 1fr')}>
              <div>
                <label style={s.label}>Profissional responsável *</label>
                <select value={form.profissional_id} onChange={e=>setForm(f=>({...f,profissional_id:e.target.value}))} style={s.input} required>
                  <option value="">Selecione...</option>
                  {equipe.map(e => <option key={e.id} value={e.id}>{e.nome} — {e.funcao}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Equipe participante</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, maxHeight:80, overflowY:'auto',overflowX:'auto' }}>
                  {equipe.map(e => (
                    <button key={e.id} type="button" onClick={() => toggleEquipe(String(e.id))}
                      style={{ fontSize:10, padding:'3px 8px', borderRadius:6, cursor:'pointer', border:`0.5px solid ${form.equipe_ids.includes(String(e.id))?VERDE:'#D3D1C7'}`, background:form.equipe_ids.includes(String(e.id))?'#EAF3DE':'#fff', color:form.equipe_ids.includes(String(e.id))?'#3B6D11':'#5F5E5A' }}>
                      {form.equipe_ids.includes(String(e.id)) ? '✓ ' : ''}{e.nome.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={s.grupo('2fr 1fr')}>
              <div>
                <label style={s.label}>Encaminhamentos realizados</label>
                <input value={form.encaminhamentos} onChange={e=>setForm(f=>({...f,encaminhamentos:e.target.value}))} style={s.input} placeholder="Descreva encaminhamentos..." />
              </div>
              <div>
                <label style={s.label}>Órgão / rede de destino</label>
                <input value={form.orgao_encaminhamento} onChange={e=>setForm(f=>({...f,orgao_encaminhamento:e.target.value}))} style={s.input} placeholder="Ex: CRAS, CREAS, SME..." />
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERDE)}>
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : '+ Registrar'}
              </button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditando(null); setForm(FORM_VAZIO) }} style={s.btn('#F1EFE8','#5F5E5A')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:'1.25rem' }}>
        {[
          { label:'Total de registros', val:atendimentos.length, cor:AZUL },
          { label:'Realizados', val:totalRealizados, cor:VERDE },
          { label:'Total participantes', val:totalParticipantes.toLocaleString('pt-BR'), cor:LARANJA },
          { label:'Em acompanhamento', val:atendimentos.filter(a=>a.situacao==='em acompanhamento').length, cor:'#854F0B' },
        ].map(m => (
          <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ ...s.card, marginBottom:'1rem' }}>
        <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>Filtros</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:8 }}>
          <div>
            <label style={s.label}>Data início</label>
            <input type="date" value={filtros.dataInicio} onChange={e=>setFiltros(f=>({...f,dataInicio:e.target.value}))} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Data fim</label>
            <input type="date" value={filtros.dataFim} onChange={e=>setFiltros(f=>({...f,dataFim:e.target.value}))} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Projeto</label>
            <select value={filtros.projeto_id} onChange={e=>setFiltros(f=>({...f,projeto_id:e.target.value}))} style={s.input}>
              <option value="">Todos</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Tipo</label>
            <select value={filtros.tipo_atend} onChange={e=>setFiltros(f=>({...f,tipo_atend:e.target.value}))} style={s.input}>
              <option value="">Todos</option>
              {TIPOS_ATEND.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Profissional</label>
            <select value={filtros.profissional_id} onChange={e=>setFiltros(f=>({...f,profissional_id:e.target.value}))} style={s.input}>
              <option value="">Todos</option>
              {equipe.map(e => <option key={e.id} value={e.id}>{e.nome.split(' ')[0]} {e.nome.split(' ')[1]||''}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Situação</label>
            <select value={filtros.situacao} onChange={e=>setFiltros(f=>({...f,situacao:e.target.value}))} style={s.input}>
              <option value="">Todas</option>
              {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={carregar} style={s.btn(AZUL)}>Filtrar</button>
          <button onClick={() => { setFiltros({ dataInicio:'', dataFim:'', projeto_id:'', tipo_atend:'', profissional_id:'', situacao:'' }); setTimeout(carregar, 100) }} style={s.btn('#F1EFE8','#5F5E5A')}>Limpar filtros</button>
        </div>
      </div>

      {/* Lista */}
      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>{atendimentos.length} registros encontrados</div>
        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780' }}>Carregando...</div>
        ) : atendimentos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
            Nenhum registro encontrado. Clique em "+ Registrar atendimento" para começar.
          </div>
        ) : (
          <div style={{ maxHeight:560, overflowY:'auto',overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>{['Data','Projeto','Tipo','Tema','Profissional','Participantes','Situação',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {atendimentos.map((a,i) => {
                  const [bg,cor] = SITUACAO_COR[a.situacao]||['#F1EFE8','#888780']
                  return (
                    <tr key={a.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                      <td style={{ ...s.td, fontWeight:500, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.projeto?.nome||'—'}</td>
                      <td style={{ ...s.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.tipo_atend}</td>
                      <td style={{ ...s.td, color:'#888780', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.tema||'—'}</td>
                      <td style={{ ...s.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.profissional?.nome?.split(' ').slice(0,2).join(' ')||'—'}</td>
                      <td style={{ ...s.td, textAlign:'center' }}>{a.qtd_participantes||'—'}</td>
                      <td style={s.td}><span style={s.badge(bg,cor)}>{a.situacao}</span></td>
                      <td style={s.td}>
                        <button onClick={() => editar(a)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal confirmação exclusão */}
      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}><i className="ti ti-alert-triangle" style={{fontSize:14, color:'#E67814'}} />️</div>
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
