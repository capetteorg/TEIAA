import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F', ROXO = '#8B2FC9'

const TIPOS_PROJETO = [
  'Serviço de Convivência e Fortalecimento de Vínculos',
  'Serviço de Proteção Social Especial',
  'Projeto institucional permanente',
  'Projeto de emenda parlamentar',
  'Projeto de edital',
  'Projeto de termo de colaboração',
  'Projeto de termo de fomento',
  'Projeto de convênio',
  'Projeto de parceria específica',
  'Ação pontual / evento',
  'Atividades administrativas / apoio',
  'Outro',
]

const SITUACOES = ['ativo', 'em planejamento', 'suspenso', 'encerrado', 'inativo', 'outro']

const SITUACAO_COR = {
  'ativo': ['#EAF3DE','#3B6D11'],
  'inativo': ['#F1EFE8','#888780'],
  'em planejamento': ['#E6F1FB','#185FA5'],
  'encerrado': ['#F1EFE8','#5F5E5A'],
  'suspenso': ['#FAEEDA','#854F0B'],
  'outro': ['#EEEDFE','#534AB7'],
}

const ORIGENS_RECURSOS_OPCOES = [
  'Doações de pessoas físicas','Doações de empresas / patrocínio','Emendas parlamentares',
  'Editais e convênios','Repasses públicos municipais','Repasses públicos estaduais',
  'Repasses públicos federais','Mensalidades e contribuições de associados',
  'Rendimentos financeiros','Eventos e campanhas','Recursos próprios','Outras fontes',
]

const FORM_VAZIO = {
  nome:'', tipo:'Projeto institucional permanente', descricao:'',
  objeto:'', objetivo_geral:'', objetivos_especificos:'',
  publico_alvo:'', faixa_etaria:'', capacidade_prevista:'',
  periodo_inicio:'', periodo_fim:'',
  abrangencia:'Município de Teresópolis/RJ', funcionamento:'',
  situacao:'ativo', vinculado_instrumento:false, instrumento_vinc:'', parceria_id:'',
  orgao_parceiro:'', parcerias_envolvidas:'',
  aceita_equipe:true, aceita_atendimentos:true, aceita_financeiro:true,
  exibir_transparencia:true, observacoes:'',
  origens_recursos:[],
  finalidades_estatutarias:'', infraestrutura:'', justificativa_social:'',
  metas_previstas:'', resultados_esperados:'',
  atividades_previstas:'', refeicoes_previstas:'', recursos_humanos:'',
  participacao_usuarios:'', monitoramento_avaliacao:'', temas_trabalhados:'',
}

const FORM_EQUIPE_VAZIO = {
  equipe_id:'', funcao_no_projeto:'', tipo_vinculo:'',
  carga_horaria:'', data_inicio:'', data_fim:'',
  exclusivo:false, atividades_desempenhadas:'', observacoes:'',
}

const ABAS_FORM = [
  { id:'geral', label:'Dados gerais' },
  { id:'socioassistencial', label:'Socioassistencial' },
  { id:'cnas', label:'<i className="ti ti-clipboard-list" style={{marginRight:4}} /> CNAS' },
  { id:'config', label:'Configurações' },
]

export default function Projetos() {
  const [projetos, setProjetos] = useState([])
  const [parcerias, setParcerias] = useState([])
  const [equipe, setEquipe] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [abaForm, setAbaForm] = useState('geral')
  const [filtro, setFiltro] = useState('todos')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [projetoDetalhe, setProjetoDetalhe] = useState(null)
  const [abaDetalhe, setAbaDetalhe] = useState('geral')
  // Equipe do projeto
  const [projetoEquipe, setProjetoEquipe] = useState([])
  const [formEquipe, setFormEquipe] = useState(FORM_EQUIPE_VAZIO)
  const [editandoEquipe, setEditandoEquipe] = useState(null)
  const [salvandoEquipe, setSalvandoEquipe] = useState(false)
  const [msgEquipe, setMsgEquipe] = useState('')
  const [filtrarEquipeProjeto, setFiltrarEquipeProjeto] = useState(true)
  // Financeiro do projeto
  const [orcamento, setOrcamento] = useState([])
  const [lancamentosProjeto, setLancamentosProjeto] = useState([])
  const [formOrc, setFormOrc] = useState({ categoria:'', subcategoria:'', fonte_recurso:'', valor_previsto:'', valor_recebido:'', observacoes:'', ano:2026 })
  const [editandoOrc, setEditandoOrc] = useState(null)
  const [salvandoOrc, setSalvandoOrc] = useState(false)
  const [msgOrc, setMsgOrc] = useState('')

  useEffect(() => {
    carregar()
    supabase.from('parcerias').select('id,nome_projeto,tipo').order('nome_projeto').then(({ data }) => setParcerias(data || []))
    supabase.from('equipe').select('id,nome,funcao,tipo_vinculo,orgao_origem,projetos').eq('situacao','ativo').order('funcao,nome').then(({ data }) => setEquipe(data || []))
  }, [])

  async function carregar() {
    const { data } = await supabase.from('projetos').select('*').order('nome')
    setProjetos(data || [])
  }

  async function carregarEquipeProjeto(projetoId) {
    const { data } = await supabase.from('projeto_equipe')
      .select('*, membro:equipe(nome, funcao, tipo_vinculo, orgao_origem)')
      .eq('projeto_id', projetoId)
      .order('id')
    setProjetoEquipe(data || [])
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      parceria_id: form.parceria_id ? parseInt(form.parceria_id) : null,
      periodo_inicio: form.periodo_inicio || null,
      periodo_fim: form.periodo_fim || null,
      origens_recursos: form.origens_recursos || [],
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('projetos').update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from('projetos').insert(dados))
    }
    if (error) setMsg('Erro: ' + error.message)
    else {
      setMsg('Projeto salvo!')
      setForm(FORM_VAZIO); setEditando(null); setMostrarForm(false); setAbaForm('geral')
      carregar()
    }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  function editar(p) {
    setForm({ ...FORM_VAZIO, ...p, parceria_id: p.parceria_id || '', periodo_inicio: p.periodo_inicio || '', periodo_fim: p.periodo_fim || '', origens_recursos: p.origens_recursos || [] })
    setEditando(p.id)
    setMostrarForm(true)
    setAbaForm('geral')
    setProjetoDetalhe(null)
    window.scrollTo(0,0)
  }

  async function abrirDetalhe(p) {
    setProjetoDetalhe(p)
    setAbaDetalhe('geral')
    await carregarEquipeProjeto(p.id)
    await carregarFinanceiro(p.id)
  }

  async function carregarFinanceiro(projetoId) {
    const [orcRes, lancRes] = await Promise.all([
      supabase.from('projeto_orcamento').select('*').eq('projeto_id', projetoId).order('categoria'),
      supabase.from('lancamentos').select('*, conta:contas(nome)').eq('projeto_id', projetoId).order('data', { ascending: false }),
    ])
    setOrcamento(orcRes.data || [])
    setLancamentosProjeto(lancRes.data || [])
  }

  async function salvarOrcamento(e) {
    e.preventDefault()
    setSalvandoOrc(true)
    const dados = {
      projeto_id: projetoDetalhe.id,
      ano: formOrc.ano || 2026,
      categoria: formOrc.categoria,
      subcategoria: formOrc.subcategoria || null,
      fonte_recurso: formOrc.fonte_recurso || null,
      valor_previsto: parseFloat(formOrc.valor_previsto) || 0,
      valor_recebido: parseFloat(formOrc.valor_recebido) || 0,
      observacoes: formOrc.observacoes || null,
    }
    let error
    if (editandoOrc) {
      ;({ error } = await supabase.from('projeto_orcamento').update(dados).eq('id', editandoOrc))
    } else {
      ;({ error } = await supabase.from('projeto_orcamento').insert(dados))
    }
    if (error) setMsgOrc('Erro: ' + error.message)
    else {
      setMsgOrc('Salvo!')
      setFormOrc({ categoria:'', subcategoria:'', fonte_recurso:'', valor_previsto:'', valor_recebido:'', observacoes:'', ano:2026 })
      setEditandoOrc(null)
      carregarFinanceiro(projetoDetalhe.id)
    }
    setSalvandoOrc(false)
    setTimeout(() => setMsgOrc(''), 3000)
  }

  async function excluirOrcamento(id) {
    await supabase.from('projeto_orcamento').delete().eq('id', id)
    carregarFinanceiro(projetoDetalhe.id)
  }

  async function salvarEquipe(e) {
    e.preventDefault()
    setSalvandoEquipe(true)
    const dados = {
      projeto_id: projetoDetalhe.id,
      equipe_id: parseInt(formEquipe.equipe_id),
      funcao_no_projeto: formEquipe.funcao_no_projeto || null,
      tipo_vinculo: formEquipe.tipo_vinculo || null,
      carga_horaria: formEquipe.carga_horaria || null,
      data_inicio: formEquipe.data_inicio || null,
      data_fim: formEquipe.data_fim || null,
      exclusivo: formEquipe.exclusivo,
      atividades_desempenhadas: formEquipe.atividades_desempenhadas || null,
      observacoes: formEquipe.observacoes || null,
    }
    let error
    if (editandoEquipe) {
      ;({ error } = await supabase.from('projeto_equipe').update(dados).eq('id', editandoEquipe))
    } else {
      ;({ error } = await supabase.from('projeto_equipe').insert(dados))
    }
    if (error) setMsgEquipe('Erro: ' + error.message)
    else {
      setMsgEquipe('Membro vinculado!')
      setFormEquipe(FORM_EQUIPE_VAZIO)
      setEditandoEquipe(null)
      carregarEquipeProjeto(projetoDetalhe.id)
    }
    setSalvandoEquipe(false)
    setTimeout(() => setMsgEquipe(''), 3000)
  }

  async function removerEquipe(id) {
    await supabase.from('projeto_equipe').delete().eq('id', id)
    carregarEquipeProjeto(projetoDetalhe.id)
  }

  function toggleOrigem(origem) {
    setForm(f => ({
      ...f,
      origens_recursos: f.origens_recursos.includes(origem)
        ? f.origens_recursos.filter(o => o !== origem)
        : [...f.origens_recursos, origem]
    }))
  }

  function preencherEquipe() {
    const texto = equipe.map(e => `${e.nome} — ${e.funcao}${e.orgao_origem ? ` (${e.orgao_origem})` : ''}`).join('\n')
    setForm(f => ({ ...f, recursos_humanos: texto }))
  }

  async function excluir(id) {
    await supabase.from('projeto_equipe').delete().eq('projeto_id', id)
    await supabase.from('projetos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }

  const lista = filtro === 'todos' ? projetos : projetos.filter(p => p.situacao === filtro)
  const ativos = projetos.filter(p => p.situacao === 'ativo').length
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    textarea: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box', resize:'vertical' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    tab: ativo => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?VERDE:'#D3D1C7'}`, background:ativo?VERDE:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    tabForm: ativo => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?AZUL:'#D3D1C7'}`, background:ativo?AZUL:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    tabDet: ativo => ({ padding:'5px 12px', fontSize:11, borderRadius:8, border:`0.5px solid ${ativo?ROXO:'#D3D1C7'}`, background:ativo?ROXO:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    secao: cor => ({ fontSize:11, fontWeight:600, color:cor||ROXO, borderLeft:`3px solid ${cor||ROXO}`, paddingLeft:8, margin:'16px 0 8px', textTransform:'uppercase', letterSpacing:'.05em' }),
    infoBox: { background:'#F8F7F2', borderRadius:8, padding:'8px 10px', marginBottom:8 },
    infoLabel: { fontSize:10, color:'#888780', marginBottom:2 },
    infoVal: { fontSize:12, lineHeight:1.6, whiteSpace:'pre-line' },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
  }

  // ===== TELA DETALHE =====
  if (projetoDetalhe) {
    const p = projetoDetalhe
    const [bg,cor] = SITUACAO_COR[p.situacao] || ['#F1EFE8','#888780']
    return (
      <div style={{ padding:'1.25rem 1.5rem' }}>
        <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
          <button onClick={() => setProjetoDetalhe(null)} style={s.btn('#F1EFE8','#5F5E5A')}>← Voltar</button>
          <button onClick={() => editar(p)} style={s.btn(AZUL)}><i className="ti ti-pencil" style={{fontSize:14}} />️ Editar projeto</button>
        </div>

        {/* Cabeçalho */}
        <div style={{ ...s.card, background:'linear-gradient(135deg,#EAF3DE,#F8F7F2)', marginBottom:'1rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'#888780', marginBottom:2 }}>{p.tipo}</div>
              <div style={{ fontSize:16, fontWeight:600 }}>{p.nome}</div>
              {p.orgao_parceiro && <div style={{ fontSize:12, color:'#5F5E5A', marginTop:2 }}>{p.orgao_parceiro}</div>}
            </div>
            <span style={s.badge(bg,cor)}>{p.situacao}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
            {[
              ['Público-alvo', p.publico_alvo],
              ['Faixa etária', p.faixa_etaria],
              ['Capacidade', p.capacidade_prevista],
              ['Funcionamento', p.funcionamento],
              ['Abrangência', p.abrangencia],
              ['Período', p.periodo_inicio ? `${fmtData(p.periodo_inicio)} a ${fmtData(p.periodo_fim)}` : null],
            ].filter(([,v]) => v).map(([l,v]) => (
              <div key={l} style={{ background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'6px 10px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{l}</div>
                <div style={{ fontSize:11, fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Abas detalhe */}
        <div style={{ display:'flex', gap:6, marginBottom:'1rem', flexWrap:'wrap' }}>
          {[['geral','Dados gerais'],['equipe','<i className="ti ti-users" style={{marginRight:4}} /> Equipe'],['financeiro','<i className="ti ti-cash" style={{marginRight:4}} /> Financeiro'],['socioassistencial','Socioassistencial'],['cnas','<i className="ti ti-clipboard-list" style={{marginRight:4}} /> CNAS']].map(([id,label]) => (
            <button key={id} onClick={() => setAbaDetalhe(id)} style={s.tabDet(abaDetalhe===id)}>{label}</button>
          ))}
        </div>

        {/* Aba Geral */}
        {abaDetalhe === 'geral' && (
          <div style={s.card}>
            {p.objeto && <><div style={s.secao(AZUL)}>Objeto</div><div style={s.infoBox}><div style={s.infoVal}>{p.objeto}</div></div></>}
            {p.objetivo_geral && <><div style={s.secao(AZUL)}>Objetivo geral</div><div style={s.infoBox}><div style={s.infoVal}>{p.objetivo_geral}</div></div></>}
            {p.objetivos_especificos && <><div style={s.secao(AZUL)}>Objetivos específicos</div><div style={s.infoBox}><div style={s.infoVal}>{p.objetivos_especificos}</div></div></>}
            {p.metas_previstas && <><div style={s.secao(AZUL)}>Metas previstas</div><div style={s.infoBox}><div style={s.infoVal}>{p.metas_previstas}</div></div></>}
            {p.resultados_esperados && <><div style={s.secao(AZUL)}>Resultados esperados</div><div style={s.infoBox}><div style={s.infoVal}>{p.resultados_esperados}</div></div></>}
            {p.descricao && <><div style={s.secao(AZUL)}>Descrição</div><div style={s.infoBox}><div style={s.infoVal}>{p.descricao}</div></div></>}
            {p.observacoes && <><div style={s.secao('#888780')}>Observações</div><div style={s.infoBox}><div style={s.infoVal}>{p.observacoes}</div></div></>}
          </div>
        )}

        {/* Aba Equipe */}
        {abaDetalhe === 'equipe' && (
          <div>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Equipe vinculada ao projeto ({projetoEquipe.length})</div>

              {/* Formulário de vínculo */}
              <div style={{ background:'#F8F7F2', borderRadius:10, padding:12, marginBottom:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>
                  {editandoEquipe ? 'Editar vínculo' : 'Vincular membro da equipe'}
                </div>
                <form onSubmit={salvarEquipe}>
                  <div style={s.grupo('2fr 1fr')}>
                    <div>
                      <label style={s.label}>Membro da equipe *</label>
                      <select value={formEquipe.equipe_id} onChange={e=>setFormEquipe(f=>({...f,equipe_id:e.target.value}))} required style={s.input}>
                        <option value="">Selecione...</option>
                        {(() => {
                          const jaVinculados = projetoEquipe.map(pe => pe.equipe_id)
                          const nomeProjeto = projetoDetalhe?.nome
                          const doProj = equipe.filter(e => !jaVinculados.includes(e.id) && Array.isArray(e.projetos) && e.projetos.includes(nomeProjeto))
                          const outros = equipe.filter(e => !jaVinculados.includes(e.id) && !(Array.isArray(e.projetos) && e.projetos.includes(nomeProjeto)))
                          return (
                            <>
                              {filtrarEquipeProjeto && doProj.length > 0 && (
                                <optgroup label={`Marcados para ${nomeProjeto} (${doProj.length})`}>
                                  {doProj.map(e => <option key={e.id} value={e.id}>{e.nome} — {e.funcao}</option>)}
                                </optgroup>
                              )}
                              {(!filtrarEquipeProjeto || doProj.length === 0) && equipe.filter(e => !jaVinculados.includes(e.id)).map(e => (
                                <option key={e.id} value={e.id}>{e.nome} — {e.funcao}</option>
                              ))}
                              {filtrarEquipeProjeto && doProj.length > 0 && outros.length > 0 && (
                                <optgroup label={`Demais da equipe (${outros.length})`}>
                                  {outros.map(e => <option key={e.id} value={e.id}>{e.nome} — {e.funcao}</option>)}
                                </optgroup>
                              )}
                            </>
                          )
                        })()}
                      </select>
                      {(() => {
                        const nomeProjeto = projetoDetalhe?.nome
                        const doProj = equipe.filter(e => Array.isArray(e.projetos) && e.projetos.includes(nomeProjeto))
                        if (doProj.length > 0) return (
                          <div style={{ fontSize:11, color:'#888780', marginTop:3 }}>
                            <span style={{ color:'#3B6D11' }}><i className="ti ti-check" style={{marginRight:4}} /> {doProj.length} marcado{doProj.length>1?'s':''} para este projeto no cadastro</span>
                            {' · '}
                            <button type="button" onClick={() => setFiltrarEquipeProjeto(f=>!f)}
                              style={{ fontSize:11, background:'none', border:'none', color:AZUL, cursor:'pointer', padding:0 }}>
                              {filtrarEquipeProjeto ? 'ver todos separados' : 'agrupar por projeto'}
                            </button>
                          </div>
                        )
                        return <div style={{ fontSize:11, color:'#888780', marginTop:3 }}>Nenhum membro marcado especificamente para este projeto no cadastro de equipe.</div>
                      })()}
                    </div>
                    <div>
                      <label style={s.label}>Função no projeto</label>
                      <input value={formEquipe.funcao_no_projeto} onChange={e=>setFormEquipe(f=>({...f,funcao_no_projeto:e.target.value}))} style={s.input} placeholder="Ex: Facilitador, Coordenador..." />
                    </div>
                  </div>
                  <div style={s.grupo('1fr 1fr 1fr')}>
                    <div>
                      <label style={s.label}>Tipo de vínculo</label>
                      <input value={formEquipe.tipo_vinculo} onChange={e=>setFormEquipe(f=>({...f,tipo_vinculo:e.target.value}))} style={s.input} placeholder="CLT, voluntário, cedido..." />
                    </div>
                    <div>
                      <label style={s.label}>Carga horária</label>
                      <input value={formEquipe.carga_horaria} onChange={e=>setFormEquipe(f=>({...f,carga_horaria:e.target.value}))} style={s.input} placeholder="Ex: 40h/semana, 20h/mês..." />
                    </div>
                    <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                      <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                        <input type="checkbox" checked={formEquipe.exclusivo} onChange={e=>setFormEquipe(f=>({...f,exclusivo:e.target.checked}))} />
                        Exclusivo deste projeto
                      </label>
                    </div>
                  </div>
                  <div style={s.grupo('1fr 1fr')}>
                    <div>
                      <label style={s.label}>Data de início</label>
                      <input type="date" value={formEquipe.data_inicio} onChange={e=>setFormEquipe(f=>({...f,data_inicio:e.target.value}))} style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Data de término</label>
                      <input type="date" value={formEquipe.data_fim} onChange={e=>setFormEquipe(f=>({...f,data_fim:e.target.value}))} style={s.input} />
                    </div>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={s.label}>Atividades desempenhadas</label>
                    <textarea value={formEquipe.atividades_desempenhadas} onChange={e=>setFormEquipe(f=>({...f,atividades_desempenhadas:e.target.value}))} rows={2} style={s.textarea} />
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={s.label}>Observações</label>
                    <input value={formEquipe.observacoes} onChange={e=>setFormEquipe(f=>({...f,observacoes:e.target.value}))} style={s.input} />
                  </div>
                  {msgEquipe && <div style={{ fontSize:12, padding:'7px 10px', borderRadius:8, marginBottom:8, background:!msgEquipe.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msgEquipe.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msgEquipe}</div>}
                  <div style={{ display:'flex', gap:6 }}>
                    <button type="submit" disabled={salvandoEquipe} style={s.btn(salvandoEquipe?'#D3D1C7':VERDE)}>
                      {salvandoEquipe ? 'Salvando...' : editandoEquipe ? '<i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar' : '+ Vincular'}
                    </button>
                    {editandoEquipe && <button type="button" onClick={() => { setFormEquipe(FORM_EQUIPE_VAZIO); setEditandoEquipe(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>}
                  </div>
                </form>
              </div>

              {/* Tabela de equipe vinculada */}
              {projetoEquipe.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhum membro vinculado a este projeto.</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr>{['Nome','Função no projeto','Vínculo','Carga horária','Período','Exclusivo',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {projetoEquipe.map(pe => (
                      <tr key={pe.id}>
                        <td style={{ ...s.td, fontWeight:500 }}>
                          <div>{pe.membro?.nome}</div>
                          <div style={{ fontSize:10, color:'#888780' }}>{pe.membro?.funcao}</div>
                        </td>
                        <td style={s.td}>{pe.funcao_no_projeto || pe.membro?.funcao || '—'}</td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{pe.tipo_vinculo || pe.membro?.tipo_vinculo || '—'}</td>
                        <td style={{ ...s.td, fontSize:11 }}>{pe.carga_horaria || '—'}</td>
                        <td style={{ ...s.td, fontSize:11, whiteSpace:'nowrap' }}>
                          {pe.data_inicio ? `${fmtData(pe.data_inicio)}${pe.data_fim ? ` a ${fmtData(pe.data_fim)}` : ''}` : '—'}
                        </td>
                        <td style={{ ...s.td, textAlign:'center' }}>
                          {pe.exclusivo ? <span style={s.badge('#EAF3DE','#3B6D11')}>Sim</span> : <span style={{ color:'#B4B2A9', fontSize:11 }}>Não</span>}
                        </td>
                        <td style={s.td}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => { setFormEquipe({ equipe_id:String(pe.equipe_id), funcao_no_projeto:pe.funcao_no_projeto||'', tipo_vinculo:pe.tipo_vinculo||'', carga_horaria:pe.carga_horaria||'', data_inicio:pe.data_inicio||'', data_fim:pe.data_fim||'', exclusivo:pe.exclusivo||false, atividades_desempenhadas:pe.atividades_desempenhadas||'', observacoes:pe.observacoes||'' }); setEditandoEquipe(pe.id) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                            <button onClick={() => removerEquipe(pe.id)} style={s.btn('#FEF2F2',VERMELHO)}>Remover</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Resumo da equipe do projeto — formato CNAS */}
            {projetoEquipe.length > 0 && (
              <div style={{ background:'#F0EAFA', border:'0.5px solid #C9B3E8', borderRadius:12, padding:'1rem 1.25rem' }}>
                <div style={{ fontSize:12, fontWeight:600, color:ROXO, marginBottom:10 }}><i className="ti ti-clipboard-list" style={{marginRight:4}} /> Resumo para CNAS</div>
                <div style={{ fontSize:12, lineHeight:1.8, whiteSpace:'pre-line' }}>
                  {projetoEquipe.map(pe =>
                    `${pe.membro?.nome} — ${pe.funcao_no_projeto || pe.membro?.funcao}${pe.tipo_vinculo ? ` (${pe.tipo_vinculo})` : ''}${pe.carga_horaria ? ` · ${pe.carga_horaria}` : ''}`
                  ).join('\n')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aba Financeiro */}
        {abaDetalhe === 'financeiro' && (
          <div>
            {/* Métricas rápidas */}
            {(() => {
              const totalPrevisto = orcamento.reduce((a,o) => a + Number(o.valor_previsto||0), 0)
              const totalRecebido = orcamento.reduce((a,o) => a + Number(o.valor_recebido||0), 0)
              const totalExecutado = lancamentosProjeto.filter(l=>l.tipo==='despesa').reduce((a,l) => a + Number(l.valor||0), 0)
              const totalEntradas = lancamentosProjeto.filter(l=>l.tipo==='entrada').reduce((a,l) => a + Number(l.valor||0), 0)
              const fmt = v => 'R$ ' + Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})
              return (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:10 }}>
                  {[
                    ['Previsto', fmt(totalPrevisto), '#888780'],
                    ['Recebido', fmt(totalRecebido), AZUL],
                    ['Executado', fmt(totalExecutado), VERMELHO],
                    ['Entradas reais', fmt(totalEntradas), VERDE],
                    ['Saldo', fmt(totalEntradas - totalExecutado), totalEntradas >= totalExecutado ? VERDE : VERMELHO],
                  ].map(([l,v,cor]) => (
                    <div key={l} style={{ background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:12, boxShadow:'0 1px 8px rgba(0,0,0,0.04)', padding:'.85rem 1rem' }}>
                      <div style={{ height:3, borderRadius:99, background:cor, marginBottom:'.7rem' }} />
                      <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:14, fontWeight:600, color:cor }}>{v}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Orçamento previsto */}
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Orçamento previsto ({orcamento.length} itens)</div>
              <div style={{ background:'#F8F7F2', borderRadius:10, padding:12, marginBottom:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>{editandoOrc ? 'Editar item' : 'Adicionar item ao orçamento'}</div>
                <form onSubmit={salvarOrcamento}>
                  <div style={s.grupo('2fr 1fr 1fr')}>
                    <div>
                      <label style={s.label}>Categoria *</label>
                      <input value={formOrc.categoria} onChange={e=>setFormOrc(f=>({...f,categoria:e.target.value}))} required style={s.input} placeholder="Ex: Recursos humanos, Alimentação..." />
                    </div>
                    <div>
                      <label style={s.label}>Subcategoria</label>
                      <input value={formOrc.subcategoria} onChange={e=>setFormOrc(f=>({...f,subcategoria:e.target.value}))} style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Ano</label>
                      <input type="number" value={formOrc.ano} onChange={e=>setFormOrc(f=>({...f,ano:parseInt(e.target.value)}))} style={s.input} />
                    </div>
                  </div>
                  <div style={s.grupo('2fr 1fr 1fr')}>
                    <div>
                      <label style={s.label}>Fonte do recurso</label>
                      <input value={formOrc.fonte_recurso} onChange={e=>setFormOrc(f=>({...f,fonte_recurso:e.target.value}))} style={s.input} placeholder="Ex: Recurso próprio, Emenda, SMASDH..." />
                    </div>
                    <div>
                      <label style={s.label}>Valor previsto (R$) *</label>
                      <input type="number" step="0.01" value={formOrc.valor_previsto} onChange={e=>setFormOrc(f=>({...f,valor_previsto:e.target.value}))} required style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Valor recebido (R$)</label>
                      <input type="number" step="0.01" value={formOrc.valor_recebido} onChange={e=>setFormOrc(f=>({...f,valor_recebido:e.target.value}))} style={s.input} />
                    </div>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={s.label}>Observações</label>
                    <input value={formOrc.observacoes} onChange={e=>setFormOrc(f=>({...f,observacoes:e.target.value}))} style={s.input} />
                  </div>
                  {msgOrc && <div style={{ fontSize:12, padding:'7px 10px', borderRadius:8, marginBottom:8, background:!msgOrc.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msgOrc.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msgOrc}</div>}
                  <div style={{ display:'flex', gap:6 }}>
                    <button type="submit" disabled={salvandoOrc} style={s.btn(salvandoOrc?'#D3D1C7':VERDE)}>{salvandoOrc?'Salvando...':editandoOrc?'<i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar':'+ Adicionar'}</button>
                    {editandoOrc && <button type="button" onClick={() => { setFormOrc({ categoria:'', subcategoria:'', fonte_recurso:'', valor_previsto:'', valor_recebido:'', observacoes:'', ano:2026 }); setEditandoOrc(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>}
                  </div>
                </form>
              </div>

              {orcamento.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhum item de orçamento cadastrado.</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Categoria','Subcategoria','Fonte','Previsto','Recebido','Ano',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {orcamento.map(o => (
                      <tr key={o.id}>
                        <td style={{ ...s.td, fontWeight:500 }}>{o.categoria}</td>
                        <td style={{ ...s.td, color:'#888780' }}>{o.subcategoria||'—'}</td>
                        <td style={{ ...s.td, fontSize:11 }}>{o.fonte_recurso||'—'}</td>
                        <td style={{ ...s.td, color:AZUL, fontWeight:500 }}>R$ {Number(o.valor_previsto).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                        <td style={{ ...s.td, color:VERDE }}>R$ {Number(o.valor_recebido||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{o.ano}</td>
                        <td style={s.td}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => { setFormOrc({ categoria:o.categoria, subcategoria:o.subcategoria||'', fonte_recurso:o.fonte_recurso||'', valor_previsto:o.valor_previsto||'', valor_recebido:o.valor_recebido||'', observacoes:o.observacoes||'', ano:o.ano||2026 }); setEditandoOrc(o.id) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                            <button onClick={() => excluirOrcamento(o.id)} style={s.btn('#FEF2F2',VERMELHO)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Lançamentos reais vinculados */}
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Lançamentos vinculados a este projeto ({lancamentosProjeto.length})</div>
              {lancamentosProjeto.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>
                  Nenhum lançamento vinculado. Ao lançar despesas ou entradas, selecione este projeto para que apareçam aqui.
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr>{['Data','Descrição','Tipo','Conta','Valor'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {lancamentosProjeto.map((l,i) => (
                        <tr key={l.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                          <td style={{ ...s.td, whiteSpace:'nowrap' }}>{l.data ? new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                          <td style={{ ...s.td, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descricao}</td>
                          <td style={s.td}><span style={s.badge(l.tipo==='despesa'?'#FCEBEB':'#EAF3DE', l.tipo==='despesa'?'#A32D2D':'#3B6D11')}>{l.tipo}</span></td>
                          <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{l.conta?.nome||'—'}</td>
                          <td style={{ ...s.td, fontWeight:500, color:l.tipo==='despesa'?VERMELHO:VERDE, textAlign:'right' }}>
                            R$ {Number(l.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba Socioassistencial */}
        {abaDetalhe === 'socioassistencial' && (
          <div style={s.card}>
            {p.justificativa_social && <><div style={s.secao(LARANJA)}>Justificativa social</div><div style={s.infoBox}><div style={s.infoVal}>{p.justificativa_social}</div></div></>}
            {p.finalidades_estatutarias && <><div style={s.secao(LARANJA)}>Finalidades estatutárias relacionadas</div><div style={s.infoBox}><div style={s.infoVal}>{p.finalidades_estatutarias}</div></div></>}
            {p.infraestrutura && <><div style={s.secao(LARANJA)}>Infraestrutura disponível</div><div style={s.infoBox}><div style={s.infoVal}>{p.infraestrutura}</div></div></>}
            {p.origens_recursos?.length > 0 && <>
              <div style={s.secao(LARANJA)}>Origem dos recursos</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                {p.origens_recursos.map(o => <span key={o} style={s.badge('#F0EAFA',ROXO)}>{o}</span>)}
              </div>
            </>}
            {p.parcerias_envolvidas && <><div style={s.secao(LARANJA)}>Parcerias envolvidas</div><div style={s.infoBox}><div style={s.infoVal}>{p.parcerias_envolvidas}</div></div></>}
            {p.participacao_usuarios && <><div style={s.secao(LARANJA)}>Participação dos usuários e famílias</div><div style={s.infoBox}><div style={s.infoVal}>{p.participacao_usuarios}</div></div></>}
            {p.monitoramento_avaliacao && <><div style={s.secao(LARANJA)}>Monitoramento e avaliação</div><div style={s.infoBox}><div style={s.infoVal}>{p.monitoramento_avaliacao}</div></div></>}
          </div>
        )}

        {/* Aba CNAS */}
        {abaDetalhe === 'cnas' && (
          <div style={{ background:'#F0EAFA', border:'0.5px solid #C9B3E8', borderRadius:12, padding:'1rem 1.25rem' }}>
            <div style={{ fontSize:13, fontWeight:600, color:ROXO, marginBottom:14 }}><i className="ti ti-clipboard-list" style={{marginRight:4}} /> Ficha CNAS — {p.nome}</div>
            {[['Público-alvo',p.publico_alvo],['Faixa etária',p.faixa_etaria],['Capacidade de atendimento',p.capacidade_prevista],['Abrangência territorial',p.abrangencia],['Funcionamento',p.funcionamento],['Período',p.periodo_inicio?`${fmtData(p.periodo_inicio)} a ${fmtData(p.periodo_fim)}`:null]].filter(([,v])=>v).map(([l,v])=>(
              <div key={l}><div style={s.secao(ROXO)}>{l}</div><div style={s.infoBox}><div style={s.infoVal}>{v}</div></div></div>
            ))}
            {p.atividades_previstas && <><div style={s.secao(ROXO)}>Atividades previstas</div><div style={s.infoBox}><div style={s.infoVal}>{p.atividades_previstas}</div></div></>}
            {p.temas_trabalhados && <><div style={s.secao(ROXO)}>Temas trabalhados</div><div style={s.infoBox}><div style={s.infoVal}>{p.temas_trabalhados}</div></div></>}
            {p.refeicoes_previstas && <><div style={s.secao(ROXO)}>Refeições previstas</div><div style={s.infoBox}><div style={s.infoVal}>{p.refeicoes_previstas}</div></div></>}
            {projetoEquipe.length > 0 && <>
              <div style={s.secao(ROXO)}>Recursos humanos envolvidos</div>
              <div style={s.infoBox}>
                <div style={{ fontSize:12, lineHeight:1.8, whiteSpace:'pre-line' }}>
                  {projetoEquipe.map(pe => `${pe.membro?.nome} — ${pe.funcao_no_projeto||pe.membro?.funcao}${pe.tipo_vinculo?` (${pe.tipo_vinculo})`:''}${pe.carga_horaria?` · ${pe.carga_horaria}`:''}`).join('\n')}
                </div>
              </div>
            </>}
            {p.participacao_usuarios && <><div style={s.secao(ROXO)}>Participação dos usuários e famílias</div><div style={s.infoBox}><div style={s.infoVal}>{p.participacao_usuarios}</div></div></>}
            {p.monitoramento_avaliacao && <><div style={s.secao(ROXO)}>Monitoramento e avaliação</div><div style={s.infoBox}><div style={s.infoVal}>{p.monitoramento_avaliacao}</div></div></>}
            <div style={{ marginTop:14 }}><button onClick={() => editar(p)} style={s.btn(ROXO)}><i className="ti ti-pencil" style={{fontSize:14}} />️ Editar campos CNAS</button></div>
          </div>
        )}
      </div>
    )
  }

  // ===== TELA LISTA =====
  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Projetos / Serviços / Ações</div>
          <div style={{ fontSize:12, color:'#888780' }}>{ativos} ativos · {projetos.length} total</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO); setAbaForm('geral') }}
          style={s.btn(mostrarForm?'#F1EFE8':VERDE, mostrarForm?'#5F5E5A':'#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Novo projeto'}
        </button>
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {mostrarForm && (
        <div style={{ ...s.card, borderColor:'#C0DD97' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>{editando ? 'Editar projeto' : 'Novo projeto / serviço / ação'}</div>
          <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
            {ABAS_FORM.map(a => <button key={a.id} type="button" onClick={() => setAbaForm(a.id)} style={s.tabForm(abaForm===a.id)}>{a.label}</button>)}
          </div>
          <form onSubmit={salvar}>
            {abaForm === 'geral' && (<>
              <div style={s.grupo('2fr 1fr')}>
                <div><label style={s.label}>Nome do projeto *</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} style={s.input} required /></div>
                <div><label style={s.label}>Tipo *</label><select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={s.input} required>{TIPOS_PROJETO.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div style={s.grupo('1fr 1fr')}>
                <div><label style={s.label}>Órgão / parceiro / fonte</label><input value={form.orgao_parceiro} onChange={e=>setForm(f=>({...f,orgao_parceiro:e.target.value}))} style={s.input} /></div>
                <div><label style={s.label}>Situação</label><select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input}>{SITUACOES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
              </div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Objeto</label><textarea value={form.objeto} onChange={e=>setForm(f=>({...f,objeto:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Objetivo geral</label><textarea value={form.objetivo_geral} onChange={e=>setForm(f=>({...f,objetivo_geral:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Objetivos específicos</label><textarea value={form.objetivos_especificos} onChange={e=>setForm(f=>({...f,objetivos_especificos:e.target.value}))} rows={3} style={s.textarea} /></div>
              <div style={s.grupo('1fr 1fr 1fr')}>
                <div><label style={s.label}>Público-alvo</label><input value={form.publico_alvo} onChange={e=>setForm(f=>({...f,publico_alvo:e.target.value}))} style={s.input} /></div>
                <div><label style={s.label}>Faixa etária</label><input value={form.faixa_etaria} onChange={e=>setForm(f=>({...f,faixa_etaria:e.target.value}))} style={s.input} /></div>
                <div><label style={s.label}>Capacidade prevista</label><input value={form.capacidade_prevista} onChange={e=>setForm(f=>({...f,capacidade_prevista:e.target.value}))} style={s.input} /></div>
              </div>
              <div style={s.grupo('1fr 1fr 2fr')}>
                <div><label style={s.label}>Período início</label><input type="date" value={form.periodo_inicio} onChange={e=>setForm(f=>({...f,periodo_inicio:e.target.value}))} style={s.input} /></div>
                <div><label style={s.label}>Período fim</label><input type="date" value={form.periodo_fim} onChange={e=>setForm(f=>({...f,periodo_fim:e.target.value}))} style={s.input} /></div>
                <div><label style={s.label}>Abrangência territorial</label><input value={form.abrangencia} onChange={e=>setForm(f=>({...f,abrangencia:e.target.value}))} style={s.input} /></div>
              </div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Funcionamento</label><input value={form.funcionamento} onChange={e=>setForm(f=>({...f,funcionamento:e.target.value}))} style={s.input} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Metas previstas</label><textarea value={form.metas_previstas} onChange={e=>setForm(f=>({...f,metas_previstas:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Resultados esperados</label><textarea value={form.resultados_esperados} onChange={e=>setForm(f=>({...f,resultados_esperados:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Observações gerais</label><input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} /></div>
            </>)}
            {abaForm === 'socioassistencial' && (<>
              <div style={{ marginBottom:10 }}><label style={s.label}>Justificativa social</label><textarea value={form.justificativa_social} onChange={e=>setForm(f=>({...f,justificativa_social:e.target.value}))} rows={3} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Finalidades estatutárias relacionadas</label><textarea value={form.finalidades_estatutarias} onChange={e=>setForm(f=>({...f,finalidades_estatutarias:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Infraestrutura disponível</label><textarea value={form.infraestrutura} onChange={e=>setForm(f=>({...f,infraestrutura:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:14 }}>
                <label style={s.label}>Origem dos recursos</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                  {ORIGENS_RECURSOS_OPCOES.map(origem => (
                    <button key={origem} type="button" onClick={() => toggleOrigem(origem)}
                      style={{ fontSize:11, padding:'4px 10px', borderRadius:8, cursor:'pointer', border:`0.5px solid ${form.origens_recursos.includes(origem)?ROXO:'#D3D1C7'}`, background:form.origens_recursos.includes(origem)?'#F0EAFA':'#fff', color:form.origens_recursos.includes(origem)?ROXO:'#5F5E5A' }}>
                      {form.origens_recursos.includes(origem)?'✓ ':''}{origem}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Parcerias envolvidas</label><textarea value={form.parcerias_envolvidas} onChange={e=>setForm(f=>({...f,parcerias_envolvidas:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Participação dos usuários e famílias</label><textarea value={form.participacao_usuarios} onChange={e=>setForm(f=>({...f,participacao_usuarios:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Monitoramento e avaliação</label><textarea value={form.monitoramento_avaliacao} onChange={e=>setForm(f=>({...f,monitoramento_avaliacao:e.target.value}))} rows={2} style={s.textarea} /></div>
            </>)}
            {abaForm === 'cnas' && (<>
              <div style={{ marginBottom:10 }}><label style={s.label}>Atividades previstas</label><textarea value={form.atividades_previstas} onChange={e=>setForm(f=>({...f,atividades_previstas:e.target.value}))} rows={3} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Temas trabalhados</label><textarea value={form.temas_trabalhados} onChange={e=>setForm(f=>({...f,temas_trabalhados:e.target.value}))} rows={2} style={s.textarea} /></div>
              <div style={{ marginBottom:10 }}><label style={s.label}>Refeições previstas</label><input value={form.refeicoes_previstas} onChange={e=>setForm(f=>({...f,refeicoes_previstas:e.target.value}))} style={s.input} /></div>
              <div style={{ marginBottom:4 }}>
                <label style={s.label}>Recursos humanos envolvidos</label>
                <textarea value={form.recursos_humanos} onChange={e=>setForm(f=>({...f,recursos_humanos:e.target.value}))} rows={3} style={{ ...s.textarea, marginBottom:4 }} />
                {equipe.length > 0 && <button type="button" onClick={preencherEquipe} style={{ fontSize:11, background:'none', border:'none', color:AZUL, cursor:'pointer', padding:0 }}>↑ Preencher com equipe ativa atual</button>}
              </div>
            </>)}
            {abaForm === 'config' && (<>
              <div style={{ marginBottom:10 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.vinculado_instrumento} onChange={e=>setForm(f=>({...f,vinculado_instrumento:e.target.checked}))} />
                  Vinculado a instrumento (emenda, edital, parceria...)
                </label>
              </div>
              {form.vinculado_instrumento && (
                <div style={s.grupo('1fr 1fr')}>
                  <div><label style={s.label}>Instrumento de vinculação</label><input value={form.instrumento_vinc} onChange={e=>setForm(f=>({...f,instrumento_vinc:e.target.value}))} style={s.input} /></div>
                  <div><label style={s.label}>Parceria cadastrada</label><select value={form.parceria_id} onChange={e=>setForm(f=>({...f,parceria_id:e.target.value}))} style={s.input}><option value="">Nenhuma</option>{parcerias.map(p=><option key={p.id} value={p.id}>{p.nome_projeto}</option>)}</select></div>
                </div>
              )}
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                {[{campo:'aceita_equipe',label:'Aceita equipe vinculada'},{campo:'aceita_atendimentos',label:'Aceita atendimentos/atividades'},{campo:'aceita_financeiro',label:'Aceita receitas/despesas'},{campo:'exibir_transparencia',label:'Exibir na transparência pública'}].map(item => (
                  <label key={item.campo} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                    <input type="checkbox" checked={!!form[item.campo]} onChange={e=>setForm(f=>({...f,[item.campo]:e.target.checked}))} />{item.label}
                  </label>
                ))}
              </div>
            </>)}
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERDE)}>{salvando?'Salvando...':editando?'<i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar alterações':'+ Cadastrar projeto'}</button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditando(null); setForm(FORM_VAZIO) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setFiltro('todos')} style={s.tab(filtro==='todos')}>Todos ({projetos.length})</button>
        {SITUACOES.map(sit => { const count = projetos.filter(p=>p.situacao===sit).length; if (!count) return null; return <button key={sit} onClick={() => setFiltro(sit)} style={s.tab(filtro===sit)}>{sit.charAt(0).toUpperCase()+sit.slice(1)} ({count})</button> })}
      </div>

      {lista.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}><div style={{ fontSize:32, marginBottom:8 }}><i className="ti ti-clipboard-list" style={{fontSize:14}} /></div><div style={{ fontSize:13 }}>Nenhum projeto cadastrado.</div></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'1rem' }}>
          {lista.map(p => {
            const [bg,cor] = SITUACAO_COR[p.situacao]||['#F1EFE8','#888780']
            const temCnas = p.atividades_previstas || p.recursos_humanos || p.participacao_usuarios
            return (
              <div key={p.id} style={{ background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', overflow:'hidden' }}>
                <div style={{ background:`${VERDE}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{p.tipo}</div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{p.nome}</div>
                    {p.orgao_parceiro && <div style={{ fontSize:10, color:'#888780', marginTop:2 }}>{p.orgao_parceiro}</div>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                    <span style={s.badge(bg,cor)}>{p.situacao}</span>
                    {temCnas && <span style={s.badge('#F0EAFA',ROXO)}>CNAS <i className="ti ti-check" style={{fontSize:14}} /></span>}
                  </div>
                </div>
                <div style={{ padding:'12px 14px' }}>
                  {p.objeto && <div style={{ fontSize:11, color:'#5F5E5A', marginBottom:8, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.objeto}</div>}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                    {p.publico_alvo && <div style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}><div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>Público-alvo</div><div style={{ fontSize:11 }}>{p.publico_alvo}</div></div>}
                    {p.capacidade_prevista && <div style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}><div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>Capacidade</div><div style={{ fontSize:11 }}>{p.capacidade_prevista}</div></div>}
                    {p.periodo_inicio && <div style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px', gridColumn:'span 2' }}><div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>Período</div><div style={{ fontSize:11 }}>{fmtData(p.periodo_inicio)} a {fmtData(p.periodo_fim)}</div></div>}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => abrirDetalhe(p)} style={{ ...s.btn(VERDE), flex:1, fontSize:11 }}>Ver ficha →</button>
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
            <div style={{ fontSize:32, marginBottom:8 }}><i className="ti ti-alert-triangle" style={{fontSize:14, color:'#E67814'}} />️</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Confirmar exclusão</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.5rem' }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir)} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:VERMELHO, color:'#fff', fontWeight:600, cursor:'pointer' }}>Excluir</button>
              <button onClick={() => setConfirmandoExcluir(null)} style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
