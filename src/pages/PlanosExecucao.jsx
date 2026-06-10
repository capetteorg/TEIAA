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
const UNIDADES_META = ['Usuários atendidos','Atendimentos realizados','Oficinas realizadas','Reuniões realizadas','Participantes','Grupos realizados','Meses de execução','Itens adquiridos','Outro']
const STATUS_META = ['não iniciada','em andamento','alcançada','parcialmente alcançada','não alcançada','outro']
const STATUS_ATIVIDADE = ['prevista','em execução','realizada','cancelada','reprogramada','outro']

const STATUS_META_COR = {
  'não iniciada': ['#F1EFE8','#888780'],
  'em andamento': ['#E6F1FB','#185FA5'],
  'alcançada': ['#EAF3DE','#3B6D11'],
  'parcialmente alcançada': ['#FAEEDA','#854F0B'],
  'não alcançada': ['#FCEBEB','#A32D2D'],
  'outro': ['#EEEDFE','#534AB7'],
}

const ORIGENS_RECURSOS_OPCOES = [
  'Doações de pessoas físicas','Doações de empresas / patrocínio','Emendas parlamentares',
  'Editais e convênios','Repasses públicos municipais','Repasses públicos estaduais',
  'Repasses públicos federais','Mensalidades e contribuições de associados',
  'Rendimentos financeiros','Eventos e campanhas','Recursos próprios','Outras fontes',
]

const ANO_ATUAL = new Date().getFullYear()

const FORM_VAZIO = {
  nome_plano: '', tipo_plano: 'Plano de Trabalho', parceria_id: '',
  orgao_ou_parceiro: '', objeto: '', objetivo_geral: '', objetivos_especificos: '',
  publico_alvo: '', faixa_etaria: '', capacidade_prevista: '',
  periodo_inicio: '', periodo_fim: '', valor_total_previsto: '',
  situacao: 'em elaboração', observacoes: '',
  origens_recursos: [],
  finalidades_estatutarias: '', infraestrutura: '', recursos_financeiros: '',
  recursos_humanos_cnas: '', forma_participacao_usuarios: '',
  abrangencia_territorial: 'Município de Teresópolis/RJ',
}

const META_VAZIO = {
  descricao_meta: '', indicador: '', quantidade_prevista: '',
  unidade_medida: 'Usuários atendidos', quantidade_realizada: '',
  status_meta: 'não iniciada', justificativa: '', projeto_id: '',
}

const ATIVIDADE_VAZIA = {
  nome_atividade: '', descricao: '', periodo_inicio: '', periodo_fim: '',
  responsavel_equipe: '', status: 'prevista', observacoes: '', projeto_id: '',
}

export default function PlanosExecucao() {
  const [planos, setPlanos] = useState([])
  const [parcerias, setParcerias] = useState([])
  const [projetos, setProjetos] = useState([])
  const [instituicao, setInstituicao] = useState(null)
  const [presidente, setPresidente] = useState(null)
  const [equipe, setEquipe] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [planoSel, setPlanoSel] = useState(null)
  const [aba, setAba] = useState('lista')
  const [abaDetalhe, setAbaDetalhe] = useState('projetos')
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
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [projetosVinculados, setProjetosVinculados] = useState([])
  const [projetoParaVincular, setProjetoParaVincular] = useState('')
  const [msgProjetos, setMsgProjetos] = useState('')
  const [orcamento, setOrcamento] = useState([])
  const [formOrc, setFormOrc] = useState({ descricao: '', tipo: 'saida', valor_previsto: '', valor_realizado: '', categoria: '', observacoes: '' })
  const [editandoOrc, setEditandoOrc] = useState(null)
  const [salvandoOrc, setSalvandoOrc] = useState(false)
  const [msgOrc, setMsgOrc] = useState('')

  useEffect(() => {
    inicializar()
    supabase.from('parcerias').select('id,nome_projeto,tipo').order('nome_projeto').then(({ data }) => setParcerias(data || []))
    supabase.from('projetos').select('id,nome,situacao').order('nome').then(({ data }) => setProjetos(data || []))
    supabase.from('instituicao').select('*').limit(1).single().then(({ data }) => setInstituicao(data))
    const hoje = new Date().toISOString().slice(0,10)
    supabase.from('diretoria').select('nome,cpf,rg,mandato_inicio,mandato_fim').eq('cargo','Presidente').eq('ativo',true).gte('mandato_fim',hoje).limit(1).single().then(({ data }) => setPresidente(data))
    supabase.from('equipe').select('id,nome,funcao,tipo_vinculo').eq('situacao','ativo').order('nome').then(({ data }) => setEquipe(data || []))
  }, [])

  async function inicializar() {
    const lista = await carregar()
    // Se só tem um plano (caso normal), abre direto
    if (lista.length === 1) {
      const p = lista[0]
      setPlanoSel(p)
      setAba('detalhe')
      setAbaDetalhe('projetos')
      await carregarDetalhe(p)
      await carregarProjetosVinculados(p.id)
    }
  }

  async function carregar() {
    const { data } = await supabase.from('planos')
      .select('*, parceria:parcerias(nome_projeto,tipo), projeto:projetos(nome)')
      .eq('tipo_plano', 'Plano de Ação Institucional')
      .order('criado_em', { ascending: false })
    setPlanos(data || [])
    return data || []
  }

  async function abrirDetalhe(p) {
    setPlanoSel(p)
    setAbaDetalhe('projetos')
    setAba('detalhe')
    await carregarDetalhe(p)
    await carregarProjetosVinculados(p.id)
  }

  async function carregarProjetosVinculados(planoId) {
    const { data } = await supabase.from('plano_projetos')
      .select('*, projeto:projetos(id,nome,tipo,situacao,publico_alvo,faixa_etaria,capacidade_prevista,objeto,objetivo_geral,atividades_previstas,recursos_humanos,participacao_usuarios,monitoramento_avaliacao,origens_recursos)')
      .eq('plano_id', planoId).order('ordem')
    setProjetosVinculados(data || [])
  }

  async function vincularProjeto() {
    if (!projetoParaVincular) return
    const jaVinculado = projetosVinculados.find(pv => String(pv.projeto_id) === String(projetoParaVincular))
    if (jaVinculado) { setMsgProjetos('Este projeto já está vinculado ao plano.'); return }
    const { error } = await supabase.from('plano_projetos').insert({
      plano_id: planoSel.id,
      projeto_id: parseInt(projetoParaVincular),
      ordem: projetosVinculados.length + 1,
    })
    if (error) setMsgProjetos('Erro: ' + error.message)
    else {
      setMsgProjetos('Projeto vinculado!')
      setProjetoParaVincular('')
      carregarProjetosVinculados(planoSel.id)
    }
    setTimeout(() => setMsgProjetos(''), 3000)
  }

  async function desvincularProjeto(id) {
    await supabase.from('plano_projetos').delete().eq('id', id)
    carregarProjetosVinculados(planoSel.id)
  }

  async function carregarDetalhe(p) {
    const [metasRes, ativsRes, atendRes, usersRes, orcRes] = await Promise.all([
      supabase.from('metas_plano').select('*, projeto:projetos(nome)').eq('plano_id', p.id).order('id'),
      supabase.from('atividades_previstas').select('*, projeto:projetos(nome)').eq('plano_id', p.id).order('id'),
      p.projeto_id ? supabase.from('atendimentos').select('*, projeto:projetos(nome), profissional:equipe(nome)').eq('projeto_id', p.projeto_id).order('data_atend', { ascending: false }).limit(50) : { data: [] },
      p.projeto_id ? supabase.from('usuarios_atendidos').select('*').eq('projeto_id', p.projeto_id).eq('situacao', 'ativo') : { data: [] },
      supabase.from('plano_orcamento').select('*').eq('plano_id', p.id).order('tipo').order('id'),
    ])
    setMetas(metasRes.data || [])
    setAtividades(ativsRes.data || [])
    setAtendimentos(atendRes.data || [])
    setUsuarios(usersRes.data || [])
    setOrcamento(orcRes.data || [])
  }

  async function salvarOrcamento(e) {
    e.preventDefault()
    setSalvandoOrc(true)
    const dados = {
      ...formOrc,
      plano_id: planoSel.id,
      valor_previsto: formOrc.valor_previsto ? parseFloat(formOrc.valor_previsto) : null,
      valor_realizado: formOrc.valor_realizado ? parseFloat(formOrc.valor_realizado) : null,
    }
    let error
    if (editandoOrc) {
      ;({ error } = await supabase.from('plano_orcamento').update(dados).eq('id', editandoOrc))
    } else {
      ;({ error } = await supabase.from('plano_orcamento').insert(dados))
    }
    if (!error) {
      setFormOrc({ descricao: '', tipo: 'saida', valor_previsto: '', valor_realizado: '', categoria: '', observacoes: '' })
      setEditandoOrc(null)
      carregarDetalhe(planoSel)
      setMsgOrc('Salvo!')
      setTimeout(() => setMsgOrc(''), 3000)
    } else {
      setMsgOrc('Erro: ' + error.message)
    }
    setSalvandoOrc(false)
  }

  async function excluirOrcamento(id) {
    await supabase.from('plano_orcamento').delete().eq('id', id)
    carregarDetalhe(planoSel)
  }

  function novoPlanoAcao() {
    setForm({
      ...FORM_VAZIO,
      tipo_plano: 'Plano de Ação Institucional',
      nome_plano: `Plano de Ação Institucional ${ANO_ATUAL}`,
      periodo_inicio: `${ANO_ATUAL}-01-01`,
      periodo_fim: `${ANO_ATUAL}-12-31`,
      finalidades_estatutarias: 'Promoção e defesa dos direitos de crianças, adolescentes e famílias em situação de vulnerabilidade social; prestação de serviços de assistência social, educação e proteção social; fortalecimento de vínculos familiares e comunitários.',
      abrangencia_territorial: 'Município de Teresópolis/RJ',
      infraestrutura: instituicao?.endereco ? `Sede própria: ${instituicao.endereco}` : '',
    })
    setEditando(null)
    setMostrarForm(true)
  }

  async function salvarPlano(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      parceria_id: form.parceria_id ? parseInt(form.parceria_id) : null,
      projeto_id: null, // projetos são vinculados pela aba Projetos
      valor_total_previsto: form.valor_total_previsto ? parseFloat(form.valor_total_previsto) : null,
      periodo_inicio: form.periodo_inicio || null,
      periodo_fim: form.periodo_fim || null,
      origens_recursos: form.origens_recursos || [],
    }
    let error, novoId
    if (editando) {
      ;({ error } = await supabase.from('planos').update(dados).eq('id', editando))
    } else {
      const { data: inserido, error: err } = await supabase.from('planos').insert(dados).select().single()
      error = err
      novoId = inserido?.id
    }

    if (error) {
      setMsg('Erro: ' + error.message)
      setSalvando(false)
      return
    }

    if (editando) {
      // Edição: volta para lista normalmente
      setMsg('Plano salvo!')
      setForm(FORM_VAZIO); setEditando(null); setMostrarForm(false)
      carregar()
      setTimeout(() => setMsg(''), 4000)
    } else {
      // Novo plano: abre direto na aba Projetos com orientação
      setForm(FORM_VAZIO); setMostrarForm(false)
      const lista = await carregar()
      const novo = lista.find(p => p.id === novoId) || lista[0]
      if (novo) {
        await carregarDetalhe(novo)
        await carregarProjetosVinculados(novo.id)
        setPlanoSel(novo)
        setAbaDetalhe('projetos')
        setAba('detalhe')
        setMsgProjetos('Plano criado com sucesso! Agora vincule os projetos e serviços que fazem parte deste plano.')
        setTimeout(() => setMsgProjetos(''), 6000)
      }
    }
    setSalvando(false)
  }

  async function salvarMeta(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...formMeta,
      plano_id: planoSel.id,
      projeto_id: formMeta.projeto_id ? parseInt(formMeta.projeto_id) : null,
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
      projeto_id: formAtiv.projeto_id ? parseInt(formAtiv.projeto_id) : null,
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
      orgao_ou_parceiro: p.orgao_ou_parceiro||'', objeto: p.objeto||'',
      objetivo_geral: p.objetivo_geral||'', objetivos_especificos: p.objetivos_especificos||'',
      publico_alvo: p.publico_alvo||'', faixa_etaria: p.faixa_etaria||'',
      capacidade_prevista: p.capacidade_prevista||'',
      periodo_inicio: p.periodo_inicio||'', periodo_fim: p.periodo_fim||'',
      valor_total_previsto: p.valor_total_previsto||'', situacao: p.situacao||'em elaboração',
      observacoes: p.observacoes||'',
      origens_recursos: p.origens_recursos || [],
      finalidades_estatutarias: p.finalidades_estatutarias || '',
      infraestrutura: p.infraestrutura || '',
      recursos_financeiros: p.recursos_financeiros || '',
      recursos_humanos_cnas: p.recursos_humanos_cnas || '',
      forma_participacao_usuarios: p.forma_participacao_usuarios || '',
      abrangencia_territorial: p.abrangencia_territorial || 'Município de Teresópolis/RJ',
    })
    setEditando(p.id)
    setMostrarForm(true)
    setAba('lista')
  }

  function toggleOrigem(origem) {
    setForm(f => ({
      ...f,
      origens_recursos: f.origens_recursos.includes(origem)
        ? f.origens_recursos.filter(o => o !== origem)
        : [...f.origens_recursos, origem]
    }))
  }

  async function excluir(item) {
    const id = item?.id || item
    await supabase.from('metas_plano').delete().eq('plano_id', id)
    await supabase.from('atividades_previstas').delete().eq('plano_id', id)
    await supabase.from('plano_projetos').delete().eq('plano_id', id)
    await supabase.from('planos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }

  async function excluirMeta(id) {
    await supabase.from('metas_plano').delete().eq('id', id)
    carregarDetalhe(planoSel)
  }

  async function excluirAtividade(id) {
    await supabase.from('atividades_previstas').delete().eq('id', id)
    carregarDetalhe(planoSel)
  }

  const fmt = v => v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const pct = (real, prev) => prev > 0 ? Math.round((real/prev)*100) : 0
  const isPlanoAcao = form.tipo_plano === 'Plano de Ação Institucional'

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
    secaoCnas: { fontSize:11, fontWeight:600, color:'#185FA5', borderLeft:`3px solid ${AZUL}`, paddingLeft:8, margin:'16px 0 8px', textTransform:'uppercase', letterSpacing:'.05em' },
    infoBox: { background:'#F8F7F2', borderRadius:8, padding:'8px 10px', marginBottom:8 },
    infoLabel: { fontSize:10, color:'#888780', marginBottom:2 },
    infoVal: { fontSize:12, fontWeight:500 },
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Plano de Ação Institucional</div>
          <div style={{ fontSize:12, color:'#888780' }}>{planos.length} plano{planos.length!==1?'s':''} cadastrado{planos.length!==1?'s':''}</div>
        </div>
        {aba !== 'detalhe' && (
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={novoPlanoAcao} style={{ ...s.btn(ROXO), fontSize:11 }}>+ Plano de Ação Institucional</button>
            <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO) }}
              style={s.btn(mostrarForm?'#F1EFE8':VERDE, mostrarForm?'#5F5E5A':'#fff')}>
              {mostrarForm ? 'Cancelar' : '+ Outro plano'}
            </button>
          </div>
        )}
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setAba('lista')} style={s.tab(aba==='lista')}>Lista de planos</button>
        {aba === 'detalhe' && planoSel && (
          <button style={s.tab(true)}>{planoSel.nome_plano.substring(0,30)}{planoSel.nome_plano.length>30?'...':''}</button>
        )}
      </div>

      {/* ===== ABA LISTA ===== */}
      {aba === 'lista' && (
        <>
          {mostrarForm && (
            <div style={{ ...s.card, borderColor: isPlanoAcao ? '#C9B3E8' : '#C0DD97' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>
                {editando ? 'Editar plano' : isPlanoAcao ? '<i className="ti ti-clipboard-list" style={{marginRight:4}} /> Plano de Ação Institucional' : 'Novo Plano de Trabalho'}
              </div>

              {/* Banner orientação novo plano */}
              {!editando && (
                <div style={{ background:'#E6F1FB', border:'0.5px solid #B3D1F0', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12, color:'#185FA5' }}>
                  <strong>ℹ Novo plano:</strong> preencha as informações gerais e salve. Em seguida, você será direcionado para vincular os projetos e serviços que fazem parte deste plano.
                </div>
              )}

              <form onSubmit={salvarPlano}>
                <div style={s.grupo('2fr 1fr')}>
                  <div>
                    <label style={s.label}>Nome do plano *</label>
                    <input value={form.nome_plano} onChange={e=>setForm(f=>({...f,nome_plano:e.target.value}))} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Tipo *</label>
                    <select value={form.tipo_plano} onChange={e=>setForm(f=>({...f,tipo_plano:e.target.value}))} style={s.input} required>
                      {TIPOS_PLANO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={s.grupo('1fr 1fr')}>
                  <div>
                    <label style={s.label}>Instrumento / Parceria vinculada</label>
                    <select value={form.parceria_id} onChange={e=>setForm(f=>({...f,parceria_id:e.target.value}))} style={s.input}>
                      <option value="">Nenhum</option>
                      {parcerias.map(p => <option key={p.id} value={p.id}>{p.nome_projeto}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Órgão / parceiro</label>
                    <input value={form.orgao_ou_parceiro} onChange={e=>setForm(f=>({...f,orgao_ou_parceiro:e.target.value}))} style={s.input} placeholder="Ex: SMASDH, CMDCA..." />
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>Objeto</label>
                  <textarea value={form.objeto} onChange={e=>setForm(f=>({...f,objeto:e.target.value}))} rows={2} style={s.textarea} />
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
                    <input value={form.capacidade_prevista} onChange={e=>setForm(f=>({...f,capacidade_prevista:e.target.value}))} style={s.input} />
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

                {/* Campos CNAS */}
                {isPlanoAcao && (
                  <div style={{ background:'#F0EAFA', border:'0.5px solid #C9B3E8', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:ROXO, marginBottom:12 }}><i className="ti ti-clipboard-list" style={{marginRight:4}} /> Campos específicos CNAS</div>

                    <div style={s.secaoCnas}>Identificação da instituição</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginBottom:12 }}>
                      {[['Nome completo',instituicao?.nome_completo||'—'],['CNPJ',instituicao?.cnpj||'—'],['Endereço',instituicao?.endereco||'—'],['Telefone',instituicao?.telefone||'—']].map(([l,v])=>(
                        <div key={l} style={s.infoBox}><div style={s.infoLabel}>{l}</div><div style={s.infoVal}>{v}</div></div>
                      ))}
                    </div>

                    <div style={s.secaoCnas}>Representante legal</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginBottom:12 }}>
                      {[['Nome',presidente?.nome||'—'],['CPF',presidente?.cpf||'—'],['RG',presidente?.rg||'—'],['Mandato',presidente?`${fmtData(presidente.mandato_inicio)} a ${fmtData(presidente.mandato_fim)}`:'—']].map(([l,v])=>(
                        <div key={l} style={s.infoBox}><div style={s.infoLabel}>{l}</div><div style={s.infoVal}>{v}</div></div>
                      ))}
                    </div>

                    <div style={s.secaoCnas}>Origem dos recursos</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
                      {ORIGENS_RECURSOS_OPCOES.map(origem => (
                        <button key={origem} type="button" onClick={() => toggleOrigem(origem)}
                          style={{ fontSize:11, padding:'4px 10px', borderRadius:8, cursor:'pointer', border:`0.5px solid ${form.origens_recursos.includes(origem)?ROXO:'#D3D1C7'}`, background:form.origens_recursos.includes(origem)?'#F0EAFA':'#fff', color:form.origens_recursos.includes(origem)?ROXO:'#5F5E5A' }}>
                          {form.origens_recursos.includes(origem)?'✓ ':''}{origem}
                        </button>
                      ))}
                    </div>

                    <div style={s.secaoCnas}>Finalidades estatutárias</div>
                    <div style={{ marginBottom:12 }}>
                      <textarea value={form.finalidades_estatutarias} onChange={e=>setForm(f=>({...f,finalidades_estatutarias:e.target.value}))} rows={3} style={{ ...s.textarea, marginBottom:0 }} />
                    </div>

                    <div style={s.secaoCnas}>Infraestrutura disponível</div>
                    <div style={{ marginBottom:12 }}>
                      <textarea value={form.infraestrutura} onChange={e=>setForm(f=>({...f,infraestrutura:e.target.value}))} rows={2} style={{ ...s.textarea, marginBottom:0 }} />
                    </div>

                    <div style={s.secaoCnas}>Abrangência territorial</div>
                    <div style={{ marginBottom:12 }}>
                      <input value={form.abrangencia_territorial} onChange={e=>setForm(f=>({...f,abrangencia_territorial:e.target.value}))} style={{ ...s.input, marginBottom:0 }} />
                    </div>

                    <div style={s.secaoCnas}>Recursos financeiros previstos</div>
                    <div style={{ marginBottom:12 }}>
                      <textarea value={form.recursos_financeiros} onChange={e=>setForm(f=>({...f,recursos_financeiros:e.target.value}))} rows={2} style={{ ...s.textarea, marginBottom:0 }} />
                    </div>

                    <div style={s.secaoCnas}>Recursos humanos</div>
                    <div style={{ marginBottom:4 }}>
                      <textarea value={form.recursos_humanos_cnas} onChange={e=>setForm(f=>({...f,recursos_humanos_cnas:e.target.value}))} rows={2} style={{ ...s.textarea, marginBottom:4 }} />
                      {equipe.length > 0 && (
                        <div style={{ fontSize:11, color:'#888780' }}>
                          {equipe.slice(0,5).map(e => e.nome.split(' ')[0]).join(', ')}{equipe.length > 5 ? ` e mais ${equipe.length-5}` : ''}
                          {' '}<button type="button" onClick={() => setForm(f => ({...f, recursos_humanos_cnas: equipe.map(e => `${e.nome} — ${e.funcao||'Função não informada'} (${e.tipo_vinculo||''})`).join('\n')}))}
                            style={{ fontSize:11, background:'none', border:'none', color:AZUL, cursor:'pointer', padding:0 }}>
                            ↑ Preencher com equipe atual
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ ...s.secaoCnas, marginTop:14 }}>Forma de participação dos usuários</div>
                    <div style={{ marginBottom:4 }}>
                      <textarea value={form.forma_participacao_usuarios} onChange={e=>setForm(f=>({...f,forma_participacao_usuarios:e.target.value}))} rows={2} style={{ ...s.textarea, marginBottom:0 }} />
                    </div>
                  </div>
                )}

                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Observações</label>
                  <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':isPlanoAcao?ROXO:VERDE)}>
                    {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar e vincular projetos →'}
                  </button>
                  <button type="button" onClick={() => { setMostrarForm(false); setEditando(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {planos.length === 0 ? (
            <div style={{ ...s.card, textAlign:'center', padding:'3rem', color:'#888780' }}>
              <div style={{ fontSize:32, marginBottom:8 }}><i className="ti ti-clipboard-list" style={{fontSize:14}} /></div>
              <div style={{ fontSize:13 }}>Nenhum plano cadastrado ainda.</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:'1rem' }}>
              {planos.map(p => {
                const [bg,cor] = SITUACAO_COR[p.situacao]||['#F1EFE8','#888780']
                const isPai = p.tipo_plano === 'Plano de Ação Institucional'
                return (
                  <div key={p.id} style={{ background:'rgba(255,255,255,0.92)', border:`0.5px solid ${isPai?'#C9B3E8':'#E8E6DE'}`, borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', overflow:'hidden', cursor:'pointer' }}
                    onClick={() => abrirDetalhe(p)}>
                    <div style={{ background:isPai?`${ROXO}10`:`${VERDE}10`, borderBottom:'0.5px solid #E0DDD5', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:isPai?ROXO:'#888780', marginBottom:2, fontWeight:isPai?600:400 }}>{p.tipo_plano}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A' }}>{p.nome_plano}</div>
                      </div>
                      <span style={s.badge(bg,cor)}>{p.situacao}</span>
                    </div>
                    <div style={{ padding:'12px 14px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                        {[
                          ['Instrumento', p.parceria?.nome_projeto||'—'],
                          ['Período', p.periodo_inicio ? `${fmtData(p.periodo_inicio)} a ${fmtData(p.periodo_fim)}` : '—'],
                          ['Valor previsto', fmt(p.valor_total_previsto)],
                          ['Situação', p.situacao],
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
                      {isPai && p.origens_recursos?.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:8 }}>
                          {p.origens_recursos.slice(0,3).map(o => <span key={o} style={s.badge('#F0EAFA',ROXO)}>{o}</span>)}
                          {p.origens_recursos.length > 3 && <span style={s.badge('#F0EAFA',ROXO)}>+{p.origens_recursos.length-3}</span>}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={e=>{e.stopPropagation();abrirDetalhe(p)}} style={{ ...s.btn(isPai?ROXO:VERDE), flex:1, fontSize:11 }}>Ver plano completo →</button>
                        <button onClick={e=>{e.stopPropagation();editarPlano(p)}} style={{ ...s.btn('#F1EFE8','#5F5E5A'), fontSize:11 }}>Editar</button>
                        <button onClick={e=>{e.stopPropagation();setConfirmandoExcluir({id:p.id,tipo:'plano'})}} style={{ ...s.btn('#FEF2F2','#E8212A'), fontSize:11 }}>Excluir</button>
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

          <div style={{ display:'flex', gap:6, marginBottom:'1rem', flexWrap:'wrap' }}>
            {[
              ['projetos','<i className="ti ti-folder" style={{marginRight:4}} /> Projetos e Serviços'],
              ['orcamento','<i className="ti ti-cash" style={{marginRight:4}} /> Orçamento'],
              ['metas','Metas'],
              ['atividades','Atividades previstas'],
              ['execucao','Execução realizada'],
              ['usuarios','Usuários'],
              ...(planoSel.tipo_plano === 'Plano de Ação Institucional' ? [['cnas','<i className="ti ti-clipboard-list" style={{marginRight:4}} /> CNAS']] : []),
            ].map(([id,label]) => (
              <button key={id} onClick={() => setAbaDetalhe(id)} style={s.tabSec(abaDetalhe===id)}>{label}</button>
            ))}
          </div>

          {/* Projetos vinculados */}
          {abaDetalhe === 'projetos' && (
            <div>
              {msgProjetos && (
                <div style={{ fontSize:12, padding:'10px 14px', borderRadius:8, marginBottom:'1rem', background:!msgProjetos.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msgProjetos.includes('Erro')?'#3B6D11':'#A32D2D', fontWeight:500 }}>
                  {msgProjetos}
                </div>
              )}
              <div style={s.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>Projetos e Serviços vinculados</div>
                    <div style={{ fontSize:11, color:'#888780' }}>{projetosVinculados.length} vínculo{projetosVinculados.length!==1?'s':''}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                  <select value={projetoParaVincular} onChange={e => setProjetoParaVincular(e.target.value)}
                    style={{ ...s.input, flex:1, minWidth:200 }}>
                    <option value="">Selecione um projeto / serviço para vincular...</option>
                    {projetos.filter(p => !projetosVinculados.find(pv => pv.projeto_id === p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.nome} {p.situacao !== 'ativo' ? `(${p.situacao})` : ''}</option>
                    ))}
                  </select>
                  <button onClick={vincularProjeto} style={s.btn(VERDE)}>+ Vincular</button>
                </div>

                {projetosVinculados.length === 0 ? (
                  <div style={{ background:'#F8F7F2', borderRadius:10, padding:'1.5rem', textAlign:'center' }}>
                    <div style={{ fontSize:28, marginBottom:8 }}><i className="ti ti-folder" style={{fontSize:14}} /></div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#5F5E5A', marginBottom:4 }}>Nenhum projeto vinculado ainda</div>
                    <div style={{ fontSize:12, color:'#888780' }}>
                      Selecione os projetos, serviços e programas que fazem parte deste plano usando o campo acima.
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {projetosVinculados.map((pv, idx) => {
                      const p = pv.projeto
                      const SITUACAO_COR_P = { 'ativo':['#EAF3DE','#3B6D11'], 'em planejamento':['#E6F1FB','#185FA5'], 'suspenso':['#FAEEDA','#854F0B'], 'encerrado':['#F1EFE8','#5F5E5A'] }
                      const [bg,cor] = SITUACAO_COR_P[p?.situacao] || ['#F1EFE8','#888780']
                      return (
                        <div key={pv.id} style={{ border:'0.5px solid #E0DDD5', borderRadius:10, overflow:'hidden' }}>
                          <div style={{ background:`${VERDE}08`, borderBottom:'0.5px solid #E0DDD5', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:'#888780' }}>{idx+1}.</span>
                              <div>
                                <div style={{ fontSize:11, color:'#888780', marginBottom:1 }}>{p?.tipo}</div>
                                <div style={{ fontSize:13, fontWeight:600 }}>{p?.nome}</div>
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                              <span style={s.badge(bg,cor)}>{p?.situacao}</span>
                              <button onClick={() => desvincularProjeto(pv.id)}
                                style={{ fontSize:11, padding:'3px 10px', borderRadius:6, border:'none', background:'#FEF2F2', color:VERMELHO, cursor:'pointer' }}>
                                Desvincular
                              </button>
                            </div>
                          </div>
                          <div style={{ padding:'10px 14px' }}>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:6, marginBottom: p?.objeto ? 8 : 0 }}>
                              {[['Público-alvo',p?.publico_alvo],['Faixa etária',p?.faixa_etaria],['Capacidade',p?.capacidade_prevista]].filter(([,v])=>v).map(([l,v])=>(
                                <div key={l} style={{ background:'#F8F7F2', borderRadius:6, padding:'5px 8px' }}>
                                  <div style={{ fontSize:9, color:'#888780', marginBottom:1 }}>{l}</div>
                                  <div style={{ fontSize:11 }}>{v}</div>
                                </div>
                              ))}
                            </div>
                            {p?.objeto && <div style={{ fontSize:11, color:'#5F5E5A', lineHeight:1.5, marginBottom:p?.atividades_previstas?8:0, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.objeto}</div>}
                            {p?.atividades_previstas && <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}><strong style={{ color:'#5F5E5A' }}>Atividades:</strong> {p.atividades_previstas.substring(0,150)}{p.atividades_previstas.length>150?'...':''}</div>}
                            {p?.origens_recursos?.length > 0 && (
                              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                                {p.origens_recursos.map(o => <span key={o} style={s.badge('#F0EAFA',ROXO)}>{o}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Orçamento */}
          {abaDetalhe === 'orcamento' && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Orçamento do plano</div>

              {msgOrc && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msgOrc.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msgOrc.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msgOrc}</div>}

              <form onSubmit={salvarOrcamento} style={{ background:'#F8F7F2', borderRadius:10, padding:12, marginBottom:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>{editandoOrc ? 'Editar linha' : 'Adicionar linha'}</div>
                <div style={s.grupo('2fr 1fr 1fr')}>
                  <div><label style={s.label}>Descrição *</label><input value={formOrc.descricao} onChange={e=>setFormOrc(f=>({...f,descricao:e.target.value}))} style={s.input} required /></div>
                  <div><label style={s.label}>Tipo</label>
                    <select value={formOrc.tipo} onChange={e=>setFormOrc(f=>({...f,tipo:e.target.value}))} style={s.input}>
                      <option value="entrada">Entrada (receita)</option>
                      <option value="saida">Saída (despesa)</option>
                    </select>
                  </div>
                  <div><label style={s.label}>Categoria</label><input value={formOrc.categoria} onChange={e=>setFormOrc(f=>({...f,categoria:e.target.value}))} style={s.input} placeholder="Ex: Recursos humanos" /></div>
                </div>
                <div style={s.grupo('1fr 1fr 2fr')}>
                  <div><label style={s.label}>Valor previsto (R$)</label><input type="number" step="0.01" value={formOrc.valor_previsto} onChange={e=>setFormOrc(f=>({...f,valor_previsto:e.target.value}))} style={s.input} /></div>
                  <div><label style={s.label}>Valor realizado (R$)</label><input type="number" step="0.01" value={formOrc.valor_realizado} onChange={e=>setFormOrc(f=>({...f,valor_realizado:e.target.value}))} style={s.input} /></div>
                  <div><label style={s.label}>Observações</label><input value={formOrc.observacoes} onChange={e=>setFormOrc(f=>({...f,observacoes:e.target.value}))} style={s.input} /></div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="submit" disabled={salvandoOrc} style={s.btn(VERDE)}>{editandoOrc?'<i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar':'+ Adicionar'}</button>
                  {editandoOrc && <button type="button" onClick={() => { setFormOrc({ descricao:'', tipo:'saida', valor_previsto:'', valor_realizado:'', categoria:'', observacoes:'' }); setEditandoOrc(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>}
                </div>
              </form>

              {orcamento.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhuma linha de orçamento cadastrada.</div>
              ) : (() => {
                const entradas = orcamento.filter(o => o.tipo === 'entrada')
                const saidas = orcamento.filter(o => o.tipo === 'saida')
                const totalPrevEntradas = entradas.reduce((s,o) => s + Number(o.valor_previsto||0), 0)
                const totalPrevSaidas = saidas.reduce((s,o) => s + Number(o.valor_previsto||0), 0)
                const totalRealEntradas = entradas.reduce((s,o) => s + Number(o.valor_realizado||0), 0)
                const totalRealSaidas = saidas.reduce((s,o) => s + Number(o.valor_realizado||0), 0)
                return (
                  <div>
                    {/* Resumo */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:'1rem' }}>
                      {[
                        ['Entradas previstas', fmt(totalPrevEntradas), VERDE],
                        ['Saídas previstas', fmt(totalPrevSaidas), VERMELHO],
                        ['Saldo previsto', fmt(totalPrevEntradas - totalPrevSaidas), totalPrevEntradas >= totalPrevSaidas ? VERDE : VERMELHO],
                        ['Entradas realizadas', fmt(totalRealEntradas), VERDE],
                        ['Saídas realizadas', fmt(totalRealSaidas), VERMELHO],
                        ['Saldo realizado', fmt(totalRealEntradas - totalRealSaidas), totalRealEntradas >= totalRealSaidas ? VERDE : VERMELHO],
                      ].map(([l,v,cor]) => (
                        <div key={l} style={{ background:'#F8F7F2', borderRadius:8, padding:'8px 10px' }}>
                          <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{l}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:cor }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Entradas */}
                    {entradas.length > 0 && (
                      <div style={{ marginBottom:'1rem' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:VERDE, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ display:'inline-block', width:10, height:10, borderRadius:99, background:VERDE }} /> Receitas / Entradas
                        </div>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                          <thead><tr>{['Descrição','Categoria','Previsto','Realizado','% Exec.',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                          <tbody>
                            {entradas.map(o => {
                              const pct = o.valor_previsto > 0 ? Math.round((Number(o.valor_realizado||0)/Number(o.valor_previsto))*100) : 0
                              return (
                                <tr key={o.id}>
                                  <td style={{ ...s.td, fontWeight:500 }}>{o.descricao}</td>
                                  <td style={{ ...s.td, color:'#888780' }}>{o.categoria||'—'}</td>
                                  <td style={{ ...s.td, color:VERDE, fontWeight:500 }}>{fmt(o.valor_previsto)}</td>
                                  <td style={s.td}>{fmt(o.valor_realizado)}</td>
                                  <td style={s.td}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                      <div style={{ width:50, height:5, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                                        <div style={{ height:'100%', width:Math.min(pct,100)+'%', background:pct>=100?VERDE:pct>=50?LARANJA:AZUL, borderRadius:99 }} />
                                      </div>
                                      <span>{pct}%</span>
                                    </div>
                                  </td>
                                  <td style={s.td}>
                                    <button onClick={() => { setFormOrc({...o, valor_previsto:o.valor_previsto||'', valor_realizado:o.valor_realizado||''}); setEditandoOrc(o.id) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                                    <button onClick={() => excluirOrcamento(o.id)} style={s.btn('#FEF2F2',VERMELHO)}>Excluir</button>
                                  </td>
                                </tr>
                              )
                            })}
                            <tr style={{ background:'#F2FAE8' }}>
                              <td colSpan={2} style={{ ...s.td, fontWeight:600, color:VERDE }}>Total entradas</td>
                              <td style={{ ...s.td, fontWeight:700, color:VERDE }}>{fmt(totalPrevEntradas)}</td>
                              <td style={{ ...s.td, fontWeight:700, color:VERDE }}>{fmt(totalRealEntradas)}</td>
                              <td colSpan={2} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Saídas */}
                    {saidas.length > 0 && (
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:VERMELHO, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ display:'inline-block', width:10, height:10, borderRadius:99, background:VERMELHO }} /> Despesas / Saídas
                        </div>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                          <thead><tr>{['Descrição','Categoria','Previsto','Realizado','% Exec.',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                          <tbody>
                            {saidas.map(o => {
                              const pct = o.valor_previsto > 0 ? Math.round((Number(o.valor_realizado||0)/Number(o.valor_previsto))*100) : 0
                              return (
                                <tr key={o.id}>
                                  <td style={{ ...s.td, fontWeight:500 }}>{o.descricao}</td>
                                  <td style={{ ...s.td, color:'#888780' }}>{o.categoria||'—'}</td>
                                  <td style={{ ...s.td, color:VERMELHO, fontWeight:500 }}>{fmt(o.valor_previsto)}</td>
                                  <td style={s.td}>{fmt(o.valor_realizado)}</td>
                                  <td style={s.td}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                      <div style={{ width:50, height:5, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                                        <div style={{ height:'100%', width:Math.min(pct,100)+'%', background:pct>=100?VERDE:pct>=50?LARANJA:VERMELHO, borderRadius:99 }} />
                                      </div>
                                      <span>{pct}%</span>
                                    </div>
                                  </td>
                                  <td style={s.td}>
                                    <button onClick={() => { setFormOrc({...o, valor_previsto:o.valor_previsto||'', valor_realizado:o.valor_realizado||''}); setEditandoOrc(o.id) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                                    <button onClick={() => excluirOrcamento(o.id)} style={s.btn('#FEF2F2',VERMELHO)}>Excluir</button>
                                  </td>
                                </tr>
                              )
                            })}
                            <tr style={{ background:'#FEF2F2' }}>
                              <td colSpan={2} style={{ ...s.td, fontWeight:600, color:VERMELHO }}>Total saídas</td>
                              <td style={{ ...s.td, fontWeight:700, color:VERMELHO }}>{fmt(totalPrevSaidas)}</td>
                              <td style={{ ...s.td, fontWeight:700, color:VERMELHO }}>{fmt(totalRealSaidas)}</td>
                              <td colSpan={2} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Metas */}
          {abaDetalhe === 'metas' && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Metas do plano</div>
              <form onSubmit={salvarMeta} style={{ background:'#F8F7F2', borderRadius:10, padding:12, marginBottom:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>{editandoMeta ? 'Editar meta' : 'Adicionar meta'}</div>
                <div style={s.grupo('2fr 1fr')}>
                  <div><label style={s.label}>Descrição da meta *</label><input value={formMeta.descricao_meta} onChange={e=>setFormMeta(f=>({...f,descricao_meta:e.target.value}))} style={s.input} required /></div>
                  <div><label style={s.label}>Projeto vinculado</label><select value={formMeta.projeto_id||''} onChange={e=>setFormMeta(f=>({...f,projeto_id:e.target.value}))} style={s.input}><option value="">Plano geral</option>{projetosVinculados.map(pv=><option key={pv.projeto_id} value={pv.projeto_id}>{pv.projeto?.nome}</option>)}</select></div>
                </div>
                <div style={{ marginBottom:8 }}><label style={s.label}>Indicador</label><input value={formMeta.indicador} onChange={e=>setFormMeta(f=>({...f,indicador:e.target.value}))} style={s.input} /></div>
                <div style={s.grupo('1fr 1fr 1fr 1fr')}>
                  <div><label style={s.label}>Qtd prevista</label><input type="number" value={formMeta.quantidade_prevista} onChange={e=>setFormMeta(f=>({...f,quantidade_prevista:e.target.value}))} style={s.input} /></div>
                  <div><label style={s.label}>Unidade</label><select value={formMeta.unidade_medida} onChange={e=>setFormMeta(f=>({...f,unidade_medida:e.target.value}))} style={s.input}>{UNIDADES_META.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                  <div><label style={s.label}>Qtd realizada</label><input type="number" value={formMeta.quantidade_realizada} onChange={e=>setFormMeta(f=>({...f,quantidade_realizada:e.target.value}))} style={s.input} /></div>
                  <div><label style={s.label}>Status</label><select value={formMeta.status_meta} onChange={e=>setFormMeta(f=>({...f,status_meta:e.target.value}))} style={s.input}>{STATUS_META.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
                </div>
                <div style={{ marginBottom:8 }}><label style={s.label}>Justificativa / Observação</label><input value={formMeta.justificativa} onChange={e=>setFormMeta(f=>({...f,justificativa:e.target.value}))} style={s.input} /></div>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="submit" disabled={salvando} style={s.btn(VERDE)}>{editandoMeta?'<i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar':'+ Adicionar meta'}</button>
                  {editandoMeta && <button type="button" onClick={() => { setFormMeta(META_VAZIO); setEditandoMeta(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>}
                </div>
              </form>
              {metas.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhuma meta cadastrada.</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Projeto','Meta','Indicador','Previsto','Realizado','% Exec.','Status',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {metas.map(m => {
                      const [bg,cor] = STATUS_META_COR[m.status_meta]||['#F1EFE8','#888780']
                      const p = pct(Number(m.quantidade_realizada||0), Number(m.quantidade_prevista||0))
                      return (
                        <tr key={m.id}>
                          <td style={{ ...s.td, fontSize:11, color:'#888780', whiteSpace:'nowrap' }}>{m.projeto?.nome||<span style={{ color:'#D3D1C7' }}>Geral</span>}</td>
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
                            <button onClick={() => { setFormMeta({...m, quantidade_prevista:m.quantidade_prevista||'', quantidade_realizada:m.quantidade_realizada||'', projeto_id:m.projeto_id||''}); setEditandoMeta(m.id) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                            <button onClick={() => excluirMeta(m.id)} style={s.btn('#FEF2F2','#E8212A')}>Excluir</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Atividades */}
          {abaDetalhe === 'atividades' && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Atividades previstas</div>
              <form onSubmit={salvarAtividade} style={{ background:'#F8F7F2', borderRadius:10, padding:12, marginBottom:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>{editandoAtiv ? 'Editar atividade' : 'Adicionar atividade prevista'}</div>
                <div style={s.grupo('2fr 1fr')}>
                  <div><label style={s.label}>Nome da atividade *</label><input value={formAtiv.nome_atividade} onChange={e=>setFormAtiv(f=>({...f,nome_atividade:e.target.value}))} style={s.input} required /></div>
                  <div><label style={s.label}>Projeto vinculado</label><select value={formAtiv.projeto_id||''} onChange={e=>setFormAtiv(f=>({...f,projeto_id:e.target.value}))} style={s.input}><option value="">Plano geral</option>{projetosVinculados.map(pv=><option key={pv.projeto_id} value={pv.projeto_id}>{pv.projeto?.nome}</option>)}</select></div>
                </div>
                <div style={s.grupo('3fr 1fr')}>
                  <div><label style={s.label}>Descrição</label><input value={formAtiv.descricao} onChange={e=>setFormAtiv(f=>({...f,descricao:e.target.value}))} style={s.input} /></div>
                  <div><label style={s.label}>Status</label><select value={formAtiv.status} onChange={e=>setFormAtiv(f=>({...f,status:e.target.value}))} style={s.input}>{STATUS_ATIVIDADE.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
                </div>
                <div style={s.grupo('1fr 1fr 2fr')}>
                  <div><label style={s.label}>Período início</label><input type="date" value={formAtiv.periodo_inicio} onChange={e=>setFormAtiv(f=>({...f,periodo_inicio:e.target.value}))} style={s.input} /></div>
                  <div><label style={s.label}>Período fim</label><input type="date" value={formAtiv.periodo_fim} onChange={e=>setFormAtiv(f=>({...f,periodo_fim:e.target.value}))} style={s.input} /></div>
                  <div><label style={s.label}>Responsável / Equipe prevista</label><input value={formAtiv.responsavel_equipe} onChange={e=>setFormAtiv(f=>({...f,responsavel_equipe:e.target.value}))} style={s.input} /></div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="submit" disabled={salvando} style={s.btn(VERDE)}>{editandoAtiv?'<i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar':'+ Adicionar'}</button>
                  {editandoAtiv && <button type="button" onClick={() => { setFormAtiv(ATIVIDADE_VAZIA); setEditandoAtiv(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>}
                </div>
              </form>
              {atividades.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhuma atividade prevista cadastrada.</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Projeto','Atividade','Descrição','Período','Responsável','Status',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {atividades.map(a => (
                      <tr key={a.id}>
                        <td style={{ ...s.td, fontSize:11, color:'#888780', whiteSpace:'nowrap' }}>{a.projeto?.nome||<span style={{ color:'#D3D1C7' }}>Geral</span>}</td>
                        <td style={{ ...s.td, fontWeight:500 }}>{a.nome_atividade}</td>
                        <td style={{ ...s.td, color:'#888780', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.descricao||'—'}</td>
                        <td style={{ ...s.td, fontSize:11, whiteSpace:'nowrap' }}>{a.periodo_inicio ? `${fmtData(a.periodo_inicio)} a ${fmtData(a.periodo_fim)}` : '—'}</td>
                        <td style={s.td}>{a.responsavel_equipe||'—'}</td>
                        <td style={s.td}><span style={s.badge(a.status==='realizada'?'#EAF3DE':a.status==='cancelada'?'#FCEBEB':'#E6F1FB', a.status==='realizada'?'#3B6D11':a.status==='cancelada'?'#A32D2D':'#185FA5')}>{a.status}</span></td>
                        <td style={s.td}>
                          <button onClick={() => { setFormAtiv({...a, periodo_inicio:a.periodo_inicio||'', periodo_fim:a.periodo_fim||'', projeto_id:a.projeto_id||''}); setEditandoAtiv(a.id) }} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                          <button onClick={() => excluirAtividade(a.id)} style={s.btn('#FEF2F2','#E8212A')}>Excluir</button>
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
                  <strong>ℹ Execução realizada</strong> — dados consolidados dos projetos vinculados a este plano.
                  {projetosVinculados.length === 0 && ' Vincule projetos na aba "Projetos e Serviços" para ver os dados aqui.'}
                </div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Atendimentos realizados ({atendimentos.length})</div>
                {atendimentos.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhum atendimento registrado.</div>
                ) : (
                  <div style={{ maxHeight:400, overflowY:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead style={{ position:'sticky', top:0 }}><tr>{['Data','Tipo','Tema','Profissional','Participantes','Situação'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
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
              {metas.length > 0 && (
                <div style={s.card}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Metas previstas x realizadas</div>
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
              <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>Usuários / Público atendido</div>
              <div style={{ fontSize:12, color:'#888780', marginBottom:'.85rem' }}>{usuarios.length} usuário{usuarios.length!==1?'s':''} ativo{usuarios.length!==1?'s':''}</div>
              {usuarios.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>Nenhum usuário ativo vinculado.</div>
              ) : (
                <div style={{ maxHeight:400, overflowY:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead style={{ position:'sticky', top:0 }}><tr>{['Nome','Data nasc.','Ingresso','Situação'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
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

          {/* Aba CNAS */}
          {abaDetalhe === 'cnas' && planoSel.tipo_plano === 'Plano de Ação Institucional' && (
            <div>
              <div style={{ background:'#F0EAFA', border:'0.5px solid #C9B3E8', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:600, color:ROXO, marginBottom:14 }}><i className="ti ti-clipboard-list" style={{marginRight:4}} /> Ficha CNAS — Plano de Ação Institucional</div>
                <div style={s.secaoCnas}>Identificação da instituição</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8, marginBottom:14 }}>
                  {[['Nome completo',instituicao?.nome_completo||planoSel.nome_plano],['CNPJ',instituicao?.cnpj||'—'],['Endereço',instituicao?.endereco||'—'],['Telefone/E-mail',[instituicao?.telefone,instituicao?.email].filter(Boolean).join(' · ')||'—']].map(([l,v])=>(
                    <div key={l} style={s.infoBox}><div style={s.infoLabel}>{l}</div><div style={s.infoVal}>{v}</div></div>
                  ))}
                </div>
                <div style={s.secaoCnas}>Representante legal</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8, marginBottom:14 }}>
                  {[['Nome',presidente?.nome||'—'],['CPF',presidente?.cpf||'—'],['RG',presidente?.rg||'—'],['Mandato',presidente?`${fmtData(presidente.mandato_inicio)} a ${fmtData(presidente.mandato_fim)}`:'—']].map(([l,v])=>(
                    <div key={l} style={s.infoBox}><div style={s.infoLabel}>{l}</div><div style={s.infoVal}>{v}</div></div>
                  ))}
                </div>
                <div style={s.secaoCnas}>Período de vigência</div>
                <div style={{ ...s.infoBox, marginBottom:14 }}><div style={s.infoVal}>{planoSel.periodo_inicio ? `${fmtData(planoSel.periodo_inicio)} a ${fmtData(planoSel.periodo_fim)}` : '—'}</div></div>
                <div style={s.secaoCnas}>Origem dos recursos</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
                  {planoSel.origens_recursos?.length > 0 ? planoSel.origens_recursos.map(o => <span key={o} style={s.badge('#F0EAFA',ROXO)}>{o}</span>) : <span style={{ fontSize:12, color:'#888780' }}>Não informado</span>}
                </div>
                {[['Finalidades estatutárias',planoSel.finalidades_estatutarias],['Infraestrutura disponível',planoSel.infraestrutura],['Abrangência territorial',planoSel.abrangencia_territorial||'Município de Teresópolis/RJ'],['Recursos financeiros previstos',planoSel.recursos_financeiros],['Recursos humanos',planoSel.recursos_humanos_cnas],['Forma de participação dos usuários',planoSel.forma_participacao_usuarios]].map(([l,v]) => v ? (
                  <div key={l}>
                    <div style={s.secaoCnas}>{l}</div>
                    <div style={{ ...s.infoBox, marginBottom:14 }}><div style={{ fontSize:12, lineHeight:1.7, whiteSpace:'pre-line' }}>{v}</div></div>
                  </div>
                ) : null)}
                <div style={{ marginTop:14 }}>
                  <button onClick={() => editarPlano(planoSel)} style={s.btn(ROXO)}><i className="ti ti-pencil" style={{fontSize:14}} />️ Editar campos CNAS</button>
                </div>
              </div>
              {metas.length > 0 && (
                <div style={s.card}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Metas do plano ({metas.length})</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr>{['Meta','Previsto','Realizado','% Exec.'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {metas.map(m => {
                        const p = pct(Number(m.quantidade_realizada||0), Number(m.quantidade_prevista||0))
                        return (
                          <tr key={m.id}>
                            <td style={{ ...s.td, fontWeight:500 }}>{m.descricao_meta}</td>
                            <td style={s.td}>{m.quantidade_prevista||'—'} {m.unidade_medida}</td>
                            <td style={{ ...s.td, color:VERDE }}>{m.quantidade_realizada||'—'}</td>
                            <td style={s.td}>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <div style={{ width:50, height:5, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                                  <div style={{ height:'100%', width:Math.min(p,100)+'%', background:p>=100?VERDE:LARANJA, borderRadius:99 }} />
                                </div>
                                <span>{p}%</span>
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
        </div>
      )}

      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}><i className="ti ti-alert-triangle" style={{fontSize:14, color:'#E67814'}} />️</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Confirmar exclusão</div>
            <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.5rem' }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => excluir(confirmandoExcluir.id)} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'#E8212A', color:'#fff', fontWeight:600, cursor:'pointer' }}>Excluir</button>
              <button onClick={() => setConfirmandoExcluir(null)} style={{ padding:'8px 20px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
