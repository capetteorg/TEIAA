import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

const TIPOS_VINCULO = [
  'CLT / Funcionário próprio da CAPETTE',
  'Servidor público / cedido por órgão público',
  'POT / Programa da Prefeitura',
  'Voluntário',
  'Jovem aprendiz / CAMP',
  'Apenado / Cumpridor de medida / CPMA',
  'Prestador de serviço',
  'Estagiário',
  'Colaborador parceiro',
  'Diretoria / Membro institucional',
  'Outro',
]

const ORGAOS_ORIGEM = [
  'CAPETTE',
  'SME — Secretaria Municipal de Educação',
  'SMASDH — Secretaria Municipal de Assistência Social e Direitos Humanos',
  'CAMP',
  'CPMA',
  'POT — Programa da Prefeitura',
  'Instituição de ensino',
  'Empresa parceira',
  'Outra OSC / Entidade parceira',
  'Outro',
]

const INSTRUMENTOS_FIXOS = [
  'Contrato direto com a CAPETTE',
  'Termo de compromisso com a SME',
  'Parceria com a SMASDH',
  'Termo de compromisso com o CAMP',
  'Encaminhamento pelo POT',
  'Encaminhamento pela CPMA',
  'Termo de voluntariado',
  'Contrato de prestação de serviço',
  'Termo de estágio',
  'Acordo de cooperação',
  'Outro',
]

const FUNCOES = [
  'Assistente Social', 'Pedagoga', 'Psicóloga', 'Professor(a)',
  'Apoio socioeducativo', 'Auxiliar de escritório', 'Recreador(a)',
  'Cozinheiro(a)', 'Zelador(a)', 'Apoio operacional', 'Apoio administrativo',
  'Facilitador(a) de grupo', 'Oficineiro(a)', 'Cuidador(a)',
  'Coordenação', 'Direção', 'Presidente', 'Voluntário de atividade',
  'Prestador de serviço', 'Outro',
]

const FUNCOES_COM_REGISTRO = ['Assistente Social', 'Pedagoga', 'Psicóloga', 'Professor(a)', 'Cuidador(a)', 'Coordenação']
const CONSELHOS = ['CRESS', 'CRP', 'CRN', 'CREFITO', 'CRC', 'OAB', 'CRM', 'CREA', 'Outro']

const PROJETOS_FIXOS = [
  'Primeira Infância',
  'Projeto Jardineiro Mirim / Esperança',
  'Projeto Reparação',
  'Projeto Mãos que Acolhem',
  'Atividades com Famílias e Comunidade',
  'Administração Geral da CAPETTE',
  'Eventos institucionais',
  'Ações comunitárias',
  'Manutenção / Apoio geral',
  'Outro',
]

const CARGAS = ['4h', '6h', '8h', 'Sem carga horária fixa', 'Outro']

const DIAS = [
  'Segunda a sexta', 'Segunda, quarta e sexta', 'Terça e quinta',
  'Finais de semana', 'Dias alternados', 'Conforme escala',
  'Conforme demanda', 'Sem dias fixos', 'Outro',
]

const SITUACOES = ['ativo', 'desligado', 'afastado', 'encerrado', 'outro']

const TIPOS_MOV = [
  'Entrada na instituição', 'Mudança de função', 'Mudança de projeto/serviço vinculado',
  'Alteração de carga horária', 'Alteração de dias de atuação', 'Afastamento',
  'Retorno de afastamento', 'Encerramento de vínculo', 'Desligamento',
  'Renovação de termo/parceria', 'Observação administrativa', 'Outro',
]

const SITUACAO_COR = {
  ativo: ['#EAF3DE','#3B6D11'],
  desligado: ['#FCEBEB','#A32D2D'],
  afastado: ['#FAEEDA','#854F0B'],
  encerrado: ['#F1EFE8','#888780'],
  outro: ['#E6F1FB','#185FA5'],
}

const FORM_VAZIO = {
  nome:'', cpf:'', data_nascimento:'', funcao:'Assistente Social',
  tem_registro_prof: false, conselho_prof:'CRESS', num_registro:'', uf_registro:'',
  tipo_vinculo:'CLT / Funcionário próprio da CAPETTE', orgao_origem:'CAPETTE',
  instrumento_vinc:'Contrato direto com a CAPETTE', parceria_id:'',
  projetos:[], data_entrada:'', data_saida:'', situacao:'ativo',
  carga_horaria:'8h', obs_carga_horaria:'', dias_atuacao:'Segunda a sexta',
  observacoes:'',
}

export default function Equipe() {
  const { user } = useAuth()
  const [aba, setAba] = useState('lista')
  const [pessoas, setPessoas] = useState([])
  const [parcerias, setParcerias] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [pessoaSel, setPessoaSel] = useState(null)
  const [historico, setHistorico] = useState([])
  const [formMov, setFormMov] = useState({ data_mov:'', tipo_mov:'Entrada na instituição', descricao:'' })
  const [filtroSit, setFiltroSit] = useState('todos')
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [msg, setMsg] = useState('')
  const [novoOrgao, setNovoOrgao] = useState('')
  const [orgaosExtra, setOrgaosExtra] = useState([])

  useEffect(() => {
    carregar()
    supabase.from('parcerias').select('id,nome_projeto,tipo').order('nome_projeto').then(({ data }) => setParcerias(data || []))
  }, [])

  async function carregar() {
    const { data } = await supabase.from('equipe').select('*').order('nome')
    setPessoas(data || [])
  }

  async function carregarHistorico(id) {
    const { data } = await supabase.from('equipe_historico').select('*').eq('equipe_id', id).order('data_mov', { ascending: false })
    setHistorico(data || [])
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      parceria_id: form.parceria_id ? parseInt(form.parceria_id) : null,
      data_nascimento: form.data_nascimento || null,
      data_saida: form.data_saida || null,
      projetos: form.projetos,
    }
    let error, data
    if (editando) {
      ;({ error } = await supabase.from('equipe').update(dados).eq('id', editando))
    } else {
      ;({ data, error } = await supabase.from('equipe').insert(dados).select().single())
      // Registra entrada no histórico
      if (!error && data) {
        await supabase.from('equipe_historico').insert({
          equipe_id: data.id, data_mov: form.data_entrada,
          tipo_mov: 'Entrada na instituição', descricao: `Cadastro inicial — ${form.tipo_vinculo}`, usuario_id: user?.id,
        })
      }
    }
    if (error) setMsg('Erro: ' + error.message)
    else { setMsg('Pessoa salva com sucesso!'); setForm(FORM_VAZIO); setEditando(null); setAba('lista'); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function salvarMovimentacao(e) {
    e.preventDefault()
    if (!pessoaSel) return
    const { error } = await supabase.from('equipe_historico').insert({
      equipe_id: pessoaSel.id, data_mov: formMov.data_mov,
      tipo_mov: formMov.tipo_mov, descricao: formMov.descricao, usuario_id: user?.id,
    })
    if (!error) {
      setFormMov({ data_mov:'', tipo_mov:'Observação administrativa', descricao:'' })
      carregarHistorico(pessoaSel.id)
      setMsg('Movimentação registrada!')
      setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
    }
  }

  function editarPessoa(p) {
    setForm({
      nome:p.nome, cpf:p.cpf, data_nascimento:p.data_nascimento||'',
      funcao:p.funcao, tem_registro_prof:p.tem_registro_prof||false,
      conselho_prof:p.conselho_prof||'CRESS', num_registro:p.num_registro||'',
      uf_registro:p.uf_registro||'', tipo_vinculo:p.tipo_vinculo,
      orgao_origem:p.orgao_origem||'CAPETTE', instrumento_vinc:p.instrumento_vinc||'',
      parceria_id:p.parceria_id||'', projetos:p.projetos||[],
      data_entrada:p.data_entrada||'', data_saida:p.data_saida||'',
      situacao:p.situacao||'ativo', carga_horaria:p.carga_horaria||'8h',
      obs_carga_horaria:p.obs_carga_horaria||'', dias_atuacao:p.dias_atuacao||'',
      observacoes:p.observacoes||'',
    })
    setEditando(p.id)
    setAba('cadastro')
  }

  function abrirPerfil(p) {
    setPessoaSel(p)
    carregarHistorico(p.id)
    setAba('perfil')
  }

  function toggleProjeto(proj) {
    setForm(f => ({
      ...f,
      projetos: f.projetos.includes(proj) ? f.projetos.filter(p => p !== proj) : [...f.projetos, proj]
    }))
  }

  const todosInstrumentos = [
    ...INSTRUMENTOS_FIXOS,
    ...parcerias.map(p => `${p.nome_projeto} (${p.tipo})`),
  ]

  const todosProjetos = [
    ...PROJETOS_FIXOS,
    ...parcerias.map(p => p.nome_projeto),
  ]

  const todosOrgaos = [...ORGAOS_ORIGEM, ...orgaosExtra]

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const lista = pessoas.filter(p => {
    const matchSit = filtroSit === 'todos' || p.situacao === filtroSit
    const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.cpf.includes(busca)
    return matchSit && matchBusca
  })

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    tab: ativo => ({ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?'#0E7EA8':'#D3D1C7'}`, background:ativo?'#0E7EA8':'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer', whiteSpace:'nowrap' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
    grupo: (cols) => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
  }

  async function excluir(id) {
    
    await supabase.from('equipe').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }


  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Equipe</div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
<div style={{ fontSize:12, color:'#888780' }}>Controle institucional de atuação</div>
        </div>
        {aba !== 'cadastro' && (
          <button onClick={() => { setAba('cadastro'); setEditando(null); setForm(FORM_VAZIO) }} style={s.btn('#0E7EA8')}>
            + Cadastrar pessoa
          </button>
        )}
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setAba('lista')} style={s.tab(aba==='lista')}>Lista ({pessoas.length})</button>
        {aba === 'cadastro' && <button style={s.tab(true)}>{editando ? 'Editando' : 'Cadastrar'}</button>}
        {aba === 'perfil' && pessoaSel && <button style={s.tab(true)}>{pessoaSel.nome.split(' ')[0]}</button>}
      </div>

      {/* ===== ABA LISTA ===== */}
      {aba === 'lista' && (
        <div>
          {/* Filtros */}
          <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou CPF..."
              style={{ fontSize:12, padding:'6px 10px', border:'0.5px solid #D3D1C7', borderRadius:8, minWidth:220 }} />
            <select value={filtroSit} onChange={e=>setFiltroSit(e.target.value)}
              style={{ fontSize:12, padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:8 }}>
              <option value="todos">Todas as situações</option>
              {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
            <span style={{ fontSize:12, color:'#888780' }}>{lista.length} pessoas</span>
          </div>

          {/* Métricas rápidas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Ativas', val: pessoas.filter(p=>p.situacao==='ativo').length, cor:VERDE },
              { label:'Afastadas', val: pessoas.filter(p=>p.situacao==='afastado').length, cor:LARANJA },
              { label:'Desligadas', val: pessoas.filter(p=>p.situacao==='desligado'||p.situacao==='encerrado').length, cor:VERMELHO },
              { label:'Total', val: pessoas.length, cor:AZUL },
            ].map(m => (
              <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>

          {lista.length === 0 ? (
            <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
              <div style={{ marginBottom:8 }}><i className="ti ti-users" style={{fontSize:32, color:'#C8C6BC'}} /></div>
              <div style={{ fontSize:13 }}>Nenhuma pessoa cadastrada ainda.</div>
            <button onClick={() => { setAba('cadastro'); setEditando(null); setForm(FORM_VAZIO) }} style={{ marginTop:12, padding:'8px 20px', fontSize:12, fontWeight:600, borderRadius:8, border:'none', background:'#0E7EA8', color:'#fff', cursor:'pointer' }}>+ Cadastrar pessoa</button>
            </div>
          ) : (
            <div style={s.card}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['Nome','Função','Vínculo','Situação','Entrada','Projetos',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {lista.map(p => {
                    const [bg,cor] = SITUACAO_COR[p.situacao]||['#F1EFE8','#888780']
                    return (
                      <tr key={p.id} style={{ cursor:'pointer' }} onClick={() => abrirPerfil(p)}>
                        <td style={{ ...s.td, fontWeight:500 }}>
                          {p.nome}
                          {p.tem_registro_prof && <span style={{ ...s.badge('#E6F1FB','#185FA5'), marginLeft:6 }}>{p.conselho_prof}</span>}
                        </td>
                        <td style={s.td}>{p.funcao}</td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.tipo_vinculo}</td>
                        <td style={s.td}><span style={s.badge(bg,cor)}>{p.situacao}</span></td>
                        <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(p.data_entrada)}</td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {(p.projetos||[]).join(', ')||'—'}
                        </td>
                        <td style={s.td}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={e=>{ e.stopPropagation(); abrirPerfil(p) }} style={s.btn(AZUL)}>Ver</button>
                            <button onClick={e=>{ e.stopPropagation(); editarPessoa(p) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== ABA CADASTRO ===== */}
      {aba === 'cadastro' && (
        <form onSubmit={salvar}>
          {/* Dados básicos */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Dados básicos</div>
            <div style={s.grupo('2fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Nome completo *</label>
                <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} style={s.input} required />
              </div>
              <div>
                <label style={s.label}>CPF *</label>
                <input value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00" style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Data de nascimento</label>
                <input type="date" value={form.data_nascimento} onChange={e=>setForm(f=>({...f,data_nascimento:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={s.grupo('1fr 1fr')}>
              <div>
                <label style={s.label}>Função exercida na CAPETTE *</label>
                <select value={form.funcao} onChange={e=>setForm(f=>({...f,funcao:e.target.value}))} style={s.input} required>
                  {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer', paddingBottom:2 }}>
                  <input type="checkbox" checked={form.tem_registro_prof} onChange={e=>setForm(f=>({...f,tem_registro_prof:e.target.checked}))} />
                  Possui registro profissional
                </label>
              </div>
            </div>
            {form.tem_registro_prof && (
              <div style={s.grupo('1fr 2fr 1fr')}>
                <div>
                  <label style={s.label}>Conselho profissional</label>
                  <select value={form.conselho_prof} onChange={e=>setForm(f=>({...f,conselho_prof:e.target.value}))} style={s.input}>
                    {CONSELHOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Número do registro</label>
                  <input value={form.num_registro} onChange={e=>setForm(f=>({...f,num_registro:e.target.value}))} placeholder="Ex: 12345" style={s.input} />
                </div>
                <div>
                  <label style={s.label}>UF</label>
                  <input value={form.uf_registro} onChange={e=>setForm(f=>({...f,uf_registro:e.target.value}))} placeholder="RJ" style={s.input} />
                </div>
              </div>
            )}
          </div>

          {/* Vínculo */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Vínculo e origem</div>
            <div style={s.grupo('1fr 1fr')}>
              <div>
                <label style={s.label}>Tipo de vínculo *</label>
                <select value={form.tipo_vinculo} onChange={e=>setForm(f=>({...f,tipo_vinculo:e.target.value}))} style={s.input} required>
                  {TIPOS_VINCULO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Órgão / Programa / Entidade de origem</label>
                <select value={form.orgao_origem} onChange={e=>setForm(f=>({...f,orgao_origem:e.target.value}))} style={s.input}>
                  {todosOrgaos.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {/* Adicionar novo órgão */}
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              <input value={novoOrgao} onChange={e=>setNovoOrgao(e.target.value)} placeholder="Adicionar novo órgão/entidade..."
                style={{ ...s.input, flex:1 }} />
              <button type="button" onClick={() => { if(novoOrgao.trim()){ setOrgaosExtra(prev=>[...prev,novoOrgao.trim()]); setNovoOrgao('') }}}
                style={s.btn('#F1EFE8','#5F5E5A')}>+ Adicionar</button>
            </div>
            <div style={s.grupo('1fr 1fr')}>
              <div>
                <label style={s.label}>Instrumento de vinculação</label>
                <select value={form.instrumento_vinc} onChange={e=>setForm(f=>({...f,instrumento_vinc:e.target.value}))} style={s.input}>
                  <optgroup label="Instrumentos fixos">
                    {INSTRUMENTOS_FIXOS.map(i => <option key={i} value={i}>{i}</option>)}
                  </optgroup>
                  {parcerias.length > 0 && (
                    <optgroup label="Parcerias / Emendas cadastradas">
                      {parcerias.map(p => <option key={p.id} value={p.nome_projeto}>{p.nome_projeto}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label style={s.label}>Parceria vinculada (opcional)</label>
                <select value={form.parceria_id} onChange={e=>setForm(f=>({...f,parceria_id:e.target.value}))} style={s.input}>
                  <option value="">Nenhuma</option>
                  {parcerias.map(p => <option key={p.id} value={p.id}>{p.nome_projeto}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Projetos */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.5rem' }}>Projeto / Serviço / Ação vinculada</div>
            <div style={{ fontSize:11, color:'#888780', marginBottom:'.85rem' }}>Selecione um ou mais projetos</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {todosProjetos.map(proj => (
                <button key={proj} type="button" onClick={() => toggleProjeto(proj)}
                  style={{ fontSize:11, padding:'5px 10px', borderRadius:8, cursor:'pointer', border:`0.5px solid ${form.projetos.includes(proj)?'#0E7EA8':'#D3D1C7'}`, background:form.projetos.includes(proj)?'#E6F1FB':'#fff', color:form.projetos.includes(proj)?'#0E7EA8':'#5F5E5A' }}>
                  {form.projetos.includes(proj) ? '✓ ' : ''}{proj}
                </button>
              ))}
            </div>
          </div>

          {/* Período e situação */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Período e situação</div>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Data de entrada *</label>
                <input type="date" value={form.data_entrada} onChange={e=>setForm(f=>({...f,data_entrada:e.target.value}))} style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Data de saída</label>
                <input type="date" value={form.data_saida} onChange={e=>setForm(f=>({...f,data_saida:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Situação atual *</label>
                <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input} required>
                  {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Carga horária</label>
                <select value={form.carga_horaria} onChange={e=>setForm(f=>({...f,carga_horaria:e.target.value}))} style={s.input}>
                  {CARGAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Dias de atuação</label>
                <select value={form.dias_atuacao} onChange={e=>setForm(f=>({...f,dias_atuacao:e.target.value}))} style={s.input}>
                  {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Obs. carga horária</label>
                <input value={form.obs_carga_horaria} onChange={e=>setForm(f=>({...f,obs_carga_horaria:e.target.value}))} placeholder="Ex: conforme escala" style={s.input} />
              </div>
            </div>
            <div>
              <label style={s.label}>Observações gerais</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':'#0E7EA8')}>
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : '+ Cadastrar pessoa'}
            </button>
            <button type="button" onClick={() => { setAba('lista'); setEditando(null); setForm(FORM_VAZIO) }} style={s.btn('#F1EFE8','#5F5E5A')}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ===== ABA PERFIL ===== */}
      {aba === 'perfil' && pessoaSel && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:'1rem' }}>
            <button onClick={() => setAba('lista')} style={s.btn('#F1EFE8','#5F5E5A')}>← Voltar</button>
            <button onClick={() => editarPessoa(pessoaSel)} style={s.btn(AZUL)}>Editar dados</button>
          </div>

          {/* Cabeçalho do perfil */}
          <div style={{ ...s.card, background:'linear-gradient(135deg, #EAF3DE, #F8F7F2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:'#2C2C2A', marginBottom:4 }}>{pessoaSel.nome}</div>
                <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:4 }}>{pessoaSel.funcao}</div>
                {pessoaSel.tem_registro_prof && (
                  <div style={{ fontSize:11, color:'#888780' }}>
                    {pessoaSel.conselho_prof}-{pessoaSel.uf_registro} nº {pessoaSel.num_registro}
                  </div>
                )}
              </div>
              <span style={s.badge(...(SITUACAO_COR[pessoaSel.situacao]||['#F1EFE8','#888780']))}>
                {pessoaSel.situacao}
              </span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8, marginTop:12 }}>
              {[
                ['CPF', pessoaSel.cpf],
                ['Tipo de vínculo', pessoaSel.tipo_vinculo],
                ['Órgão de origem', pessoaSel.orgao_origem||'—'],
                ['Instrumento', pessoaSel.instrumento_vinc||'—'],
                ['Entrada', fmtData(pessoaSel.data_entrada)],
                ['Saída', pessoaSel.data_saida ? fmtData(pessoaSel.data_saida) : 'Em atividade'],
                ['Carga horária', pessoaSel.carga_horaria||'—'],
                ['Dias', pessoaSel.dias_atuacao||'—'],
              ].map(([l,v]) => (
                <div key={l} style={{ background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'6px 10px' }}>
                  <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{l}</div>
                  <div style={{ fontSize:11, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            {(pessoaSel.projetos||[]).length > 0 && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:4 }}>Projetos vinculados</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {pessoaSel.projetos.map(p => (
                    <span key={p} style={s.badge('#EAF3DE','#3B6D11')}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            {pessoaSel.observacoes && (
              <div style={{ marginTop:10, fontSize:11, color:'#888780', fontStyle:'italic' }}>{pessoaSel.observacoes}</div>
            )}
          </div>

          {/* Histórico de movimentações */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Histórico de movimentações</div>
            {/* Registrar nova movimentação */}
            <form onSubmit={salvarMovimentacao} style={{ background:'#F8F7F2', borderRadius:10, padding:'12px', marginBottom:'1rem' }}>
              <div style={{ fontSize:12, fontWeight:500, marginBottom:8, color:'#5F5E5A' }}>Registrar movimentação</div>
              <div style={s.grupo('1fr 2fr')}>
                <div>
                  <label style={s.label}>Data</label>
                  <input type="date" value={formMov.data_mov} onChange={e=>setFormMov(f=>({...f,data_mov:e.target.value}))} style={s.input} required />
                </div>
                <div>
                  <label style={s.label}>Tipo</label>
                  <select value={formMov.tipo_mov} onChange={e=>setFormMov(f=>({...f,tipo_mov:e.target.value}))} style={s.input}>
                    {TIPOS_MOV.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:8 }}>
                <label style={s.label}>Descrição / Observação</label>
                <input value={formMov.descricao} onChange={e=>setFormMov(f=>({...f,descricao:e.target.value}))} style={s.input} placeholder="Descreva a movimentação..." />
              </div>
              <button type="submit" style={s.btn('#0E7EA8')}>+ Registrar</button>
            </form>

            {/* Lista do histórico */}
            {historico.length === 0 ? (
              <div style={{ textAlign:'center', padding:'1rem', color:'#888780', fontSize:12 }}>Nenhuma movimentação registrada.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {historico.map(h => (
                  <div key={h.id} style={{ display:'flex', gap:12, padding:'10px 12px', background:'#F8F7F2', borderRadius:8, borderLeft:`3px solid ${VERDE}` }}>
                    <div style={{ fontSize:11, color:'#888780', whiteSpace:'nowrap', minWidth:80 }}>{fmtData(h.data_mov)}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:'#2C2C2A' }}>{h.tipo_mov}</div>
                      {h.descricao && <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>{h.descricao}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ marginBottom:8 }}><i className="ti ti-inbox" style={{fontSize:32, color:'#C8C6BC'}} /></div>
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
