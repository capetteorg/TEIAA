import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { gerarPDFAnamneseTeacolher, gerarPDFPiaTeacolher, gerarPDFFrequenciaTeacolher } from '../lib/pdf'

const AZUL = '#0E7EA8', ESCURO = '#06344F', ROXO = '#6B5FA8'

const AREAS_PIA = [
  'Interdisciplinar', 'Psicologia', 'Fisioterapia', 'Nutrição', 'Psicomotricidade',
  'Neuropsicopedagogia', 'Fonoaudiologia', 'Terapia ocupacional', 'Serviço social',
  'Socioeducativo', 'Orientação familiar', 'Outro',
]

const SITUACOES_META = ['Em andamento', 'Atingida', 'Parcialmente atingida', 'Não atingida']

// Seções da anamnese — mesma fonte para o formulário e para a visualização,
// espelhando a ordem da ficha impressa.
const SECOES_ANAMNESE = [
  { titulo: '1. Queixa principal', campos: [
    ['queixa_principal', 'Queixa principal / motivo da procura'],
  ]},
  { titulo: '2. Histórico de desenvolvimento e saúde', campos: [
    ['historico_gestacao_parto', 'Gestação e parto'],
    ['desenvolvimento_inicial', 'Desenvolvimento inicial (marcos: sentar, andar, falar)'],
    ['historico_saude', 'Histórico de saúde (doenças, internações, cirurgias)'],
    ['medicacoes_em_uso', 'Medicações em uso'],
    ['alergias_restricoes', 'Alergias e restrições'],
    ['acompanhamentos_externos', 'Acompanhamentos externos (saúde/terapias fora do projeto)'],
  ]},
  { titulo: '3. Vida escolar', campos: [
    ['escola_atual', 'Escola atual'],
    ['escola_serie_turno', 'Série / turma / turno'],
    ['historico_escolar', 'Histórico escolar (adaptações, mediador, dificuldades)'],
  ]},
  { titulo: '4. Rotina e comunicação', campos: [
    ['rotina_diaria', 'Rotina diária'],
    ['alimentacao_sono', 'Alimentação e sono'],
    ['comunicacao_interacao', 'Comunicação e interação (como se comunica, interesses)'],
  ]},
  { titulo: '5. Contexto sociofamiliar', campos: [
    ['contexto_sociofamiliar', 'Composição e dinâmica familiar'],
    ['beneficios_sociais', 'Benefícios sociais (BPC, Bolsa Família etc.)'],
    ['rede_apoio', 'Rede de apoio'],
  ]},
  { titulo: '6. Observações complementares', campos: [
    ['observacoes', 'Observações'],
  ]},
]

const CAMPOS_TEXTO_ANAMNESE = SECOES_ANAMNESE.flatMap(s => s.campos.map(c => c[0]))

const ANAMNESE_VAZIA = {
  data_entrevista: new Date().toISOString().slice(0, 10),
  entrevistado_nome: '', entrevistado_parentesco: '', profissional_id: '',
  ...Object.fromEntries(CAMPOS_TEXTO_ANAMNESE.map(c => [c, ''])),
}

const META_VAZIA = { area: 'Interdisciplinar', objetivo: '', estrategias: '', prazo: '', situacao: 'Em andamento' }

const PIA_VAZIO = {
  data_elaboracao: new Date().toISOString().slice(0, 10),
  data_revisao_prevista: '', situacao: 'vigente', profissional_id: '',
  demandas_identificadas: '', objetivo_geral: '', metas: [{ ...META_VAZIA }],
  frequencia_prevista: '', participacao_familia: '', encaminhamentos_rede: '',
  resultado_revisao: '', observacoes: '',
}

const s = {
  label: { display:'block', fontSize:10, color:'#888780', marginBottom:3, textTransform:'uppercase', letterSpacing:'.06em' },
  input: { width:'100%', boxSizing:'border-box', fontSize:12.5, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, background:'#fff', fontFamily:'inherit' },
  textarea: { width:'100%', boxSizing:'border-box', fontSize:12.5, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, background:'#fff', resize:'vertical', fontFamily:'inherit', lineHeight:1.5 },
  btn: (bg, cor='#fff') => ({ border:'none', borderRadius:8, background:bg, color:cor, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }),
  tab: ativo => ({ border:'none', borderRadius:99, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', background:ativo?ESCURO:'#F1EFE8', color:ativo?'#fff':'#5F5E5A' }),
  bloco: { border:'0.5px solid #E8E6DE', borderRadius:8, padding:'8px 11px', marginBottom:6, background:'#FAFAF8' },
  blocoLabel: { fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'#888780', marginBottom:3, fontWeight:700 },
  blocoValor: { fontSize:12.5, color:'#2C2C2A', lineHeight:1.5, whiteSpace:'pre-wrap' },
  secao: { fontSize:11.5, fontWeight:800, color:ESCURO, margin:'14px 0 7px', paddingBottom:4, borderBottom:'0.5px solid #E8E6DE' },
}

export default function ProntuarioUsuario({ usuario, onClose, podeEditar = false, profissionalPadrao = null }) {
  const [aba, setAba] = useState('anamnese')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [usuarioCompleto, setUsuarioCompleto] = useState(usuario)
  const [equipe, setEquipe] = useState([])

  const [anamnese, setAnamnese] = useState(null)
  const [editandoA, setEditandoA] = useState(false)
  const [formA, setFormA] = useState(ANAMNESE_VAZIA)
  const [salvandoA, setSalvandoA] = useState(false)

  const [planos, setPlanos] = useState([])
  const [planoSelId, setPlanoSelId] = useState(null)
  const [editandoP, setEditandoP] = useState(null) // null | 'novo' | id do plano
  const [formP, setFormP] = useState(PIA_VAZIO)
  const [salvandoP, setSalvandoP] = useState(false)

  const [freqModo, setFreqModo] = useState('mes')
  const [freqMes, setFreqMes] = useState(new Date().toISOString().slice(0, 7))
  const [freqLista, setFreqLista] = useState(null)
  const [freqLoading, setFreqLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    async function carregar() {
      setLoading(true)
      const [uRes, aRes, pRes, eRes] = await Promise.all([
        supabase.from('usuarios_atendidos').select('*').eq('id', usuario.id).maybeSingle(),
        supabase.from('anamneses').select('*').eq('usuario_atendido_id', usuario.id).maybeSingle(),
        supabase.from('planos_individuais').select('*').eq('usuario_atendido_id', usuario.id).order('data_elaboracao', { ascending: false }).order('id', { ascending: false }),
        supabase.from('equipe').select('id,nome,funcao').order('nome'),
      ])
      if (!mounted) return
      // Se a RLS não deixar ler o cadastro completo, segue com o que veio por prop
      if (uRes.data) setUsuarioCompleto(uRes.data)
      if (aRes.error && !String(aRes.error.message).includes('0 rows')) {
        setMsg(aRes.error.message.includes('does not exist') || aRes.error.message.includes('schema cache')
          ? 'As tabelas do prontuário ainda não existem no banco. Rode o arquivo sql_prontuario_teacolher.sql no SQL Editor do Supabase.'
          : 'Erro ao carregar anamnese: ' + aRes.error.message)
      }
      setAnamnese(aRes.data || null)
      const lp = pRes.data || []
      setPlanos(lp)
      setPlanoSelId(lp.find(p => p.situacao === 'vigente')?.id ?? lp[0]?.id ?? null)
      setEquipe(eRes.data || [])
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [usuario.id])

  const fmtData = d => d ? new Date(String(d).includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const nomeProf = id => {
    const e = equipe.find(e => String(e.id) === String(id))
    if (e) return e.funcao ? `${e.nome} — ${e.funcao}` : e.nome
    if (profissionalPadrao && String(profissionalPadrao.id) === String(id)) return profissionalPadrao.nome
    return null
  }
  const planoSel = planos.find(p => p.id === planoSelId) || null

  // ---------- ANAMNESE ----------
  function abrirEdicaoAnamnese() {
    setFormA(anamnese
      ? { ...ANAMNESE_VAZIA, ...Object.fromEntries(Object.keys(ANAMNESE_VAZIA).map(k => [k, anamnese[k] ?? ''])) }
      : { ...ANAMNESE_VAZIA, profissional_id: profissionalPadrao?.id || '' })
    setEditandoA(true)
  }

  async function salvarAnamnese() {
    setSalvandoA(true); setMsg('')
    const dados = {
      usuario_atendido_id: usuario.id,
      data_entrevista: formA.data_entrevista || null,
      entrevistado_nome: formA.entrevistado_nome || null,
      entrevistado_parentesco: formA.entrevistado_parentesco || null,
      profissional_id: formA.profissional_id || null,
      ...Object.fromEntries(CAMPOS_TEXTO_ANAMNESE.map(c => [c, formA[c] || null])),
    }
    const { error } = anamnese
      ? await supabase.from('anamneses').update(dados).eq('id', anamnese.id)
      : await supabase.from('anamneses').insert(dados)
    if (error) setMsg('Erro ao salvar anamnese: ' + error.message)
    else {
      const { data } = await supabase.from('anamneses').select('*').eq('usuario_atendido_id', usuario.id).maybeSingle()
      setAnamnese(data || null)
      setEditandoA(false)
      setMsg('Anamnese salva!')
      setTimeout(() => setMsg(m => m === 'Anamnese salva!' ? '' : m), 3000)
    }
    setSalvandoA(false)
  }

  function imprimirAnamnese() {
    gerarPDFAnamneseTeacolher(usuarioCompleto, { ...anamnese, profissional_nome: nomeProf(anamnese?.profissional_id) })
  }

  // ---------- PIA ----------
  function abrirEdicaoPia(plano) {
    if (plano) {
      setFormP({
        ...PIA_VAZIO,
        ...Object.fromEntries(Object.keys(PIA_VAZIO).map(k => [k, plano[k] ?? PIA_VAZIO[k]])),
        metas: Array.isArray(plano.metas) && plano.metas.length ? plano.metas.map(m => ({ ...META_VAZIA, ...m })) : [{ ...META_VAZIA }],
      })
      setEditandoP(plano.id)
    } else {
      setFormP({ ...PIA_VAZIO, metas: [{ ...META_VAZIA }], profissional_id: profissionalPadrao?.id || '' })
      setEditandoP('novo')
    }
  }

  async function salvarPia() {
    setSalvandoP(true); setMsg('')
    const dados = {
      usuario_atendido_id: usuario.id,
      data_elaboracao: formP.data_elaboracao || null,
      data_revisao_prevista: formP.data_revisao_prevista || null,
      situacao: formP.situacao || 'vigente',
      profissional_id: formP.profissional_id || null,
      demandas_identificadas: formP.demandas_identificadas || null,
      objetivo_geral: formP.objetivo_geral || null,
      metas: (formP.metas || []).filter(m => m.objetivo || m.estrategias),
      frequencia_prevista: formP.frequencia_prevista || null,
      participacao_familia: formP.participacao_familia || null,
      encaminhamentos_rede: formP.encaminhamentos_rede || null,
      resultado_revisao: formP.resultado_revisao || null,
      observacoes: formP.observacoes || null,
    }
    let error
    if (editandoP === 'novo') {
      // Um novo plano vigente arquiva os anteriores como "revisado"
      if (dados.situacao === 'vigente') {
        await supabase.from('planos_individuais').update({ situacao: 'revisado' }).eq('usuario_atendido_id', usuario.id).eq('situacao', 'vigente')
      }
      ;({ error } = await supabase.from('planos_individuais').insert(dados))
    } else {
      ;({ error } = await supabase.from('planos_individuais').update(dados).eq('id', editandoP))
    }
    if (error) setMsg('Erro ao salvar PIA: ' + error.message)
    else {
      const { data } = await supabase.from('planos_individuais').select('*').eq('usuario_atendido_id', usuario.id).order('data_elaboracao', { ascending: false }).order('id', { ascending: false })
      const lp = data || []
      setPlanos(lp)
      setPlanoSelId(lp.find(p => p.situacao === 'vigente')?.id ?? lp[0]?.id ?? null)
      setEditandoP(null)
      setMsg('PIA salvo!')
      setTimeout(() => setMsg(m => m === 'PIA salvo!' ? '' : m), 3000)
    }
    setSalvandoP(false)
  }

  function imprimirPia(plano) {
    gerarPDFPiaTeacolher(usuarioCompleto, { ...plano, profissional_nome: nomeProf(plano?.profissional_id) })
  }

  function setMeta(i, campo, valor) {
    setFormP(f => ({ ...f, metas: f.metas.map((m, j) => j === i ? { ...m, [campo]: valor } : m) }))
  }

  // ---------- FREQUÊNCIA ----------
  async function buscarFrequencia() {
    setFreqLoading(true); setMsg('')
    let q = supabase.from('atendimentos')
      .select('data_atend,hora_inicio,area_atendimento,situacao,comparecimento,profissional_id')
      .eq('usuario_atendido_id', usuario.id)
      .order('data_atend', { ascending: true })
    if (freqModo === 'mes' && freqMes) {
      const [ano, mes] = freqMes.split('-').map(Number)
      const fim = new Date(ano, mes, 0).toISOString().slice(0, 10)
      q = q.gte('data_atend', `${freqMes}-01`).lte('data_atend', fim)
    }
    const { data, error } = await q
    if (error) { setMsg('Erro ao buscar atendimentos: ' + error.message); setFreqLoading(false); return }
    setFreqLista((data || []).map(a => ({ ...a, profissional_nome: nomeProf(a.profissional_id) || '—' })))
    setFreqLoading(false)
  }

  useEffect(() => { if (aba === 'frequencia') buscarFrequencia() }, [aba, freqModo, freqMes]) // eslint-disable-line react-hooks/exhaustive-deps

  function periodoLabelFreq() {
    if (freqModo === 'historico') return 'Todo o histórico'
    const [ano, mes] = (freqMes || '').split('-')
    if (!ano) return 'Período selecionado'
    const nomeMes = new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)
  }

  const freqResumo = (() => {
    if (!freqLista) return null
    const normal = v => String(v || '').toLowerCase()
    const compareceu = freqLista.filter(a => normal(a.comparecimento) === 'compareceu' || (normal(a.situacao) === 'realizado' && !a.comparecimento)).length
    const faltas = freqLista.filter(a => ['faltou', 'falta justificada'].includes(normal(a.comparecimento))).length
    const base = compareceu + faltas
    return { total: freqLista.length, compareceu, faltas, assiduidade: base > 0 ? Math.round(compareceu / base * 100) : null }
  })()

  // ---------- RENDER ----------
  const blocoVer = (label, valor) => (
    <div style={s.bloco} key={label}>
      <div style={s.blocoLabel}>{label}</div>
      <div style={{ ...s.blocoValor, color: valor ? '#2C2C2A' : '#B4B2A9' }}>{valor || 'Não preenchido'}</div>
    </div>
  )

  const selectProfissional = (valor, onChange) => (
    <select value={valor || ''} onChange={e => onChange(e.target.value)} style={s.input}>
      <option value="">Selecione o profissional...</option>
      {equipe.map(e => <option key={e.id} value={e.id}>{e.nome}{e.funcao ? ` — ${e.funcao}` : ''}</option>)}
      {equipe.length === 0 && profissionalPadrao && (
        <option value={profissionalPadrao.id}>{profissionalPadrao.nome}</option>
      )}
    </select>
  )

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(26,31,28,0.45)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:12, backdropFilter:'blur(2px)' }}>
      <div style={{ background:'#FDFDFB', borderRadius:16, width:'100%', maxWidth:860, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>

        {/* Cabeçalho */}
        <div style={{ padding:'14px 20px', borderBottom:'0.5px solid #E8E6DE', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:ESCURO }}>📋 Prontuário — {usuarioCompleto?.nome || usuario.nome}</div>
            <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>
              {usuarioCompleto?.data_nascimento ? `Nascimento: ${fmtData(usuarioCompleto.data_nascimento)} · ` : ''}
              Projeto TEAcolher{podeEditar ? '' : ' · somente visualização e impressão'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:'#B4B2A9', cursor:'pointer', lineHeight:1, padding:0 }}>×</button>
        </div>

        {/* Abas */}
        <div style={{ display:'flex', gap:6, padding:'10px 20px', borderBottom:'0.5px solid #F1EFE8', flexWrap:'wrap' }}>
          <button onClick={() => setAba('anamnese')} style={s.tab(aba==='anamnese')}>Anamnese</button>
          <button onClick={() => setAba('pia')} style={s.tab(aba==='pia')}>PIA — Plano Individual</button>
          <button onClick={() => setAba('frequencia')} style={s.tab(aba==='frequencia')}>Frequência</button>
        </div>

        <div style={{ overflowY:'auto', padding:'14px 20px', flex:1 }}>
          {msg && (
            <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:10,
              background: msg.includes('Erro') || msg.includes('não existem') ? '#FCEBEB' : '#EAF3DE',
              color: msg.includes('Erro') || msg.includes('não existem') ? '#A32D2D' : '#3B6D11' }}>{msg}</div>
          )}
          {loading ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'#B4B2A9', fontSize:13 }}>Carregando prontuário...</div>
          ) : (<>

            {/* ============ ANAMNESE ============ */}
            {aba === 'anamnese' && !editandoA && (
              <div>
                {!anamnese ? (
                  <div style={{ textAlign:'center', padding:'2rem 1rem', color:'#888780', fontSize:13 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#2C2C2A', marginBottom:4 }}>Anamnese ainda não preenchida</div>
                    <div style={{ maxWidth:420, margin:'0 auto 14px' }}>Registre o histórico de desenvolvimento, saúde, vida escolar, rotina e contexto sociofamiliar do usuário.</div>
                    {podeEditar && <button onClick={abrirEdicaoAnamnese} style={s.btn(AZUL)}>+ Preencher anamnese</button>}
                  </div>
                ) : (<>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                    <div style={{ fontSize:11.5, color:'#888780' }}>
                      Entrevista em <strong style={{ color:'#2C2C2A' }}>{fmtData(anamnese.data_entrevista)}</strong>
                      {anamnese.entrevistado_nome ? <> com <strong style={{ color:'#2C2C2A' }}>{anamnese.entrevistado_nome}</strong>{anamnese.entrevistado_parentesco ? ` (${anamnese.entrevistado_parentesco})` : ''}</> : ''}
                      {nomeProf(anamnese.profissional_id) ? <> · {nomeProf(anamnese.profissional_id)}</> : ''}
                      {anamnese.updated_at ? <> · atualizada em {new Date(anamnese.updated_at).toLocaleDateString('pt-BR')}</> : ''}
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {podeEditar && <button onClick={abrirEdicaoAnamnese} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>}
                      <button onClick={imprimirAnamnese} style={s.btn(ROXO)}>🖨 Imprimir anamnese</button>
                    </div>
                  </div>
                  {SECOES_ANAMNESE.map(sec => {
                    const preenchidos = sec.campos.filter(([k]) => anamnese[k])
                    if (preenchidos.length === 0 && sec.titulo.startsWith('6')) return null
                    return (
                      <div key={sec.titulo}>
                        <div style={s.secao}>{sec.titulo}</div>
                        {sec.campos.map(([k, label]) => blocoVer(label, anamnese[k]))}
                      </div>
                    )
                  })}
                </>)}
              </div>
            )}

            {aba === 'anamnese' && editandoA && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:8, marginBottom:6 }}>
                  <div>
                    <label style={s.label}>Data da entrevista</label>
                    <input type="date" value={formA.data_entrevista || ''} onChange={e => setFormA(f => ({ ...f, data_entrevista: e.target.value }))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Entrevistado(a)</label>
                    <input value={formA.entrevistado_nome} onChange={e => setFormA(f => ({ ...f, entrevistado_nome: e.target.value }))} style={s.input} placeholder="Nome de quem respondeu" />
                  </div>
                  <div>
                    <label style={s.label}>Parentesco / vínculo</label>
                    <input value={formA.entrevistado_parentesco} onChange={e => setFormA(f => ({ ...f, entrevistado_parentesco: e.target.value }))} style={s.input} placeholder="Mãe, pai, avó..." />
                  </div>
                  <div>
                    <label style={s.label}>Profissional responsável</label>
                    {selectProfissional(formA.profissional_id, v => setFormA(f => ({ ...f, profissional_id: v })))}
                  </div>
                </div>
                {SECOES_ANAMNESE.map(sec => (
                  <div key={sec.titulo}>
                    <div style={s.secao}>{sec.titulo}</div>
                    {sec.campos.map(([k, label]) => (
                      <div key={k} style={{ marginBottom:8 }}>
                        <label style={s.label}>{label}</label>
                        {k === 'escola_atual' || k === 'escola_serie_turno'
                          ? <input value={formA[k]} onChange={e => setFormA(f => ({ ...f, [k]: e.target.value }))} style={s.input} />
                          : <textarea rows={k === 'queixa_principal' ? 3 : 2} value={formA[k]} onChange={e => setFormA(f => ({ ...f, [k]: e.target.value }))} style={s.textarea} />}
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ display:'flex', gap:8, marginTop:12, position:'sticky', bottom:0, background:'#FDFDFB', padding:'10px 0' }}>
                  <button onClick={salvarAnamnese} disabled={salvandoA} style={s.btn(salvandoA ? '#D3D1C7' : AZUL)}>{salvandoA ? 'Salvando...' : 'Salvar anamnese'}</button>
                  <button onClick={() => setEditandoA(false)} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                </div>
              </div>
            )}

            {/* ============ PIA ============ */}
            {aba === 'pia' && !editandoP && (
              <div>
                {planos.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'2rem 1rem', color:'#888780', fontSize:13 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#2C2C2A', marginBottom:4 }}>Nenhum PIA elaborado</div>
                    <div style={{ maxWidth:440, margin:'0 auto 14px' }}>O Plano Individual de Atendimento define objetivos, metas por área e prazos, revisados na avaliação participativa trimestral.</div>
                    {podeEditar && <button onClick={() => abrirEdicaoPia(null)} style={s.btn(AZUL)}>+ Elaborar PIA</button>}
                  </div>
                ) : (<>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {planos.map(p => (
                        <button key={p.id} onClick={() => setPlanoSelId(p.id)}
                          style={{ border:'0.5px solid ' + (planoSelId===p.id ? AZUL : '#D3D1C7'), borderRadius:99, padding:'4px 11px', fontSize:11, fontWeight:600, cursor:'pointer',
                            background: planoSelId===p.id ? 'rgba(14,126,168,0.08)' : '#fff',
                            color: planoSelId===p.id ? AZUL : '#5F5E5A' }}>
                          {fmtData(p.data_elaboracao)}{p.situacao === 'vigente' ? ' · vigente' : p.situacao === 'encerrado' ? ' · encerrado' : ''}
                        </button>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {podeEditar && <button onClick={() => abrirEdicaoPia(null)} style={s.btn('#F1EFE8','#5F5E5A')}>+ Novo PIA</button>}
                      {podeEditar && planoSel && <button onClick={() => abrirEdicaoPia(planoSel)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>}
                      {planoSel && <button onClick={() => imprimirPia(planoSel)} style={s.btn(ROXO)}>🖨 Imprimir PIA</button>}
                    </div>
                  </div>
                  {planoSel && (<>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:6, marginBottom:8 }}>
                      {[
                        ['Situação', planoSel.situacao || 'vigente'],
                        ['Elaborado em', fmtData(planoSel.data_elaboracao)],
                        ['Revisão prevista', fmtData(planoSel.data_revisao_prevista)],
                        ['Profissional', nomeProf(planoSel.profissional_id) || '—'],
                      ].map(([l, v]) => (
                        <div key={l} style={s.bloco}>
                          <div style={s.blocoLabel}>{l}</div>
                          <div style={{ ...s.blocoValor, fontWeight:600 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {blocoVer('Demandas identificadas', planoSel.demandas_identificadas)}
                    {blocoVer('Objetivo geral do acompanhamento', planoSel.objetivo_geral)}
                    <div style={s.secao}>Metas e estratégias por área</div>
                    {(Array.isArray(planoSel.metas) ? planoSel.metas : []).length === 0
                      ? <div style={{ fontSize:12, color:'#B4B2A9', marginBottom:8 }}>Nenhuma meta registrada.</div>
                      : (
                        <div style={{ overflowX:'auto', marginBottom:8 }}>
                          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                            <thead>
                              <tr>{['Área','Objetivo específico','Estratégias','Prazo','Situação'].map(h => (
                                <th key={h} style={{ textAlign:'left', padding:'6px 8px', fontSize:10, color:'#888780', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid #E8E6DE' }}>{h}</th>
                              ))}</tr>
                            </thead>
                            <tbody>
                              {planoSel.metas.map((m, i) => (
                                <tr key={i} style={{ background: i%2===0 ? '#fff' : '#FAFAF8' }}>
                                  <td style={{ padding:'6px 8px', fontWeight:600, whiteSpace:'nowrap' }}>{m.area || '—'}</td>
                                  <td style={{ padding:'6px 8px' }}>{m.objetivo || '—'}</td>
                                  <td style={{ padding:'6px 8px' }}>{m.estrategias || '—'}</td>
                                  <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>{m.prazo || '—'}</td>
                                  <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>{m.situacao || 'Em andamento'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    {blocoVer('Frequência prevista de atendimentos', planoSel.frequencia_prevista)}
                    {blocoVer('Participação da família', planoSel.participacao_familia)}
                    {blocoVer('Encaminhamentos à rede (SUS, SUAS, Educação)', planoSel.encaminhamentos_rede)}
                    {planoSel.resultado_revisao ? blocoVer('Resultado da revisão / avaliação participativa', planoSel.resultado_revisao) : null}
                    {planoSel.observacoes ? blocoVer('Observações', planoSel.observacoes) : null}
                  </>)}
                </>)}
              </div>
            )}

            {aba === 'pia' && editandoP && (
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:ESCURO, marginBottom:10 }}>
                  {editandoP === 'novo' ? 'Novo Plano Individual de Atendimento' : 'Editar PIA'}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:8, marginBottom:8 }}>
                  <div>
                    <label style={s.label}>Elaborado em</label>
                    <input type="date" value={formP.data_elaboracao || ''} onChange={e => setFormP(f => ({ ...f, data_elaboracao: e.target.value }))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Revisão prevista</label>
                    <input type="date" value={formP.data_revisao_prevista || ''} onChange={e => setFormP(f => ({ ...f, data_revisao_prevista: e.target.value }))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Situação</label>
                    <select value={formP.situacao} onChange={e => setFormP(f => ({ ...f, situacao: e.target.value }))} style={s.input}>
                      <option value="vigente">Vigente</option>
                      <option value="revisado">Revisado (arquivado)</option>
                      <option value="encerrado">Encerrado</option>
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Profissional responsável</label>
                    {selectProfissional(formP.profissional_id, v => setFormP(f => ({ ...f, profissional_id: v })))}
                  </div>
                </div>
                <div style={{ marginBottom:8 }}>
                  <label style={s.label}>Demandas identificadas</label>
                  <textarea rows={2} value={formP.demandas_identificadas} onChange={e => setFormP(f => ({ ...f, demandas_identificadas: e.target.value }))} style={s.textarea} />
                </div>
                <div style={{ marginBottom:8 }}>
                  <label style={s.label}>Objetivo geral do acompanhamento</label>
                  <textarea rows={2} value={formP.objetivo_geral} onChange={e => setFormP(f => ({ ...f, objetivo_geral: e.target.value }))} style={s.textarea} />
                </div>

                <div style={s.secao}>Metas e estratégias por área</div>
                {formP.metas.map((m, i) => (
                  <div key={i} style={{ border:'0.5px solid #E0DDD5', borderRadius:10, padding:'10px 12px', marginBottom:8, background:'#FAFAF8' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8, marginBottom:6 }}>
                      <div>
                        <label style={s.label}>Área</label>
                        <select value={m.area} onChange={e => setMeta(i, 'area', e.target.value)} style={s.input}>
                          {AREAS_PIA.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={s.label}>Prazo</label>
                        <input value={m.prazo} onChange={e => setMeta(i, 'prazo', e.target.value)} style={s.input} placeholder="Ex.: 3 meses" />
                      </div>
                      <div>
                        <label style={s.label}>Situação</label>
                        <select value={m.situacao} onChange={e => setMeta(i, 'situacao', e.target.value)} style={s.input}>
                          {SITUACOES_META.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end' }}>
                        <button onClick={() => setFormP(f => ({ ...f, metas: f.metas.filter((_, j) => j !== i) }))}
                          title="Remover meta" style={{ ...s.btn('#FEF2F2','#A32D2D'), padding:'7px 10px' }}>✕</button>
                      </div>
                    </div>
                    <div style={{ marginBottom:6 }}>
                      <label style={s.label}>Objetivo específico</label>
                      <input value={m.objetivo} onChange={e => setMeta(i, 'objetivo', e.target.value)} style={s.input} placeholder="O que se pretende alcançar nesta área" />
                    </div>
                    <div>
                      <label style={s.label}>Estratégias</label>
                      <input value={m.estrategias} onChange={e => setMeta(i, 'estrategias', e.target.value)} style={s.input} placeholder="Como será trabalhado" />
                    </div>
                  </div>
                ))}
                <button onClick={() => setFormP(f => ({ ...f, metas: [...f.metas, { ...META_VAZIA }] }))} style={{ ...s.btn('#F1EFE8','#5F5E5A'), marginBottom:12 }}>+ Adicionar meta</button>

                {[
                  ['frequencia_prevista', 'Frequência prevista de atendimentos', 'Ex.: 1x/semana Fonoaudiologia + 1x/semana Psicologia'],
                  ['participacao_familia', 'Participação da família', ''],
                  ['encaminhamentos_rede', 'Encaminhamentos à rede (SUS, SUAS, Educação)', ''],
                  ['resultado_revisao', 'Resultado da revisão / avaliação participativa', 'Preencher na revisão trimestral'],
                  ['observacoes', 'Observações', ''],
                ].map(([k, label, ph]) => (
                  <div key={k} style={{ marginBottom:8 }}>
                    <label style={s.label}>{label}</label>
                    <textarea rows={2} value={formP[k]} onChange={e => setFormP(f => ({ ...f, [k]: e.target.value }))} style={s.textarea} placeholder={ph} />
                  </div>
                ))}

                <div style={{ display:'flex', gap:8, marginTop:12, position:'sticky', bottom:0, background:'#FDFDFB', padding:'10px 0' }}>
                  <button onClick={salvarPia} disabled={salvandoP} style={s.btn(salvandoP ? '#D3D1C7' : AZUL)}>{salvandoP ? 'Salvando...' : 'Salvar PIA'}</button>
                  <button onClick={() => setEditandoP(null)} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                </div>
              </div>
            )}

            {/* ============ FREQUÊNCIA ============ */}
            {aba === 'frequencia' && (
              <div>
                <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap', marginBottom:12 }}>
                  <div>
                    <label style={s.label}>Período</label>
                    <select value={freqModo} onChange={e => setFreqModo(e.target.value)} style={{ ...s.input, width:180 }}>
                      <option value="mes">Mês específico</option>
                      <option value="historico">Todo o histórico</option>
                    </select>
                  </div>
                  {freqModo === 'mes' && (
                    <div>
                      <label style={s.label}>Mês</label>
                      <input type="month" value={freqMes} onChange={e => setFreqMes(e.target.value)} style={{ ...s.input, width:170 }} />
                    </div>
                  )}
                  <button onClick={() => gerarPDFFrequenciaTeacolher(usuarioCompleto, freqLista || [], periodoLabelFreq())}
                    disabled={!freqLista || freqLista.length === 0} style={s.btn(!freqLista || freqLista.length === 0 ? '#D3D1C7' : ROXO)}>
                    🖨 Imprimir folha de frequência
                  </button>
                </div>
                {freqLoading ? (
                  <div style={{ textAlign:'center', padding:'1.5rem', color:'#B4B2A9', fontSize:13 }}>Carregando...</div>
                ) : !freqLista || freqLista.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:13 }}>Nenhum atendimento no período selecionado.</div>
                ) : (<>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:8, marginBottom:12 }}>
                    {[
                      ['Sessões', freqResumo.total, AZUL],
                      ['Compareceu', freqResumo.compareceu, '#3B6D11'],
                      ['Faltas', freqResumo.faltas, '#A32D2D'],
                      ['Assiduidade', freqResumo.assiduidade === null ? '—' : freqResumo.assiduidade + '%', ESCURO],
                    ].map(([l, v, cor]) => (
                      <div key={l} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:12, padding:'10px 12px' }}>
                        <div style={{ fontSize:9.5, color:'#888780', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:3 }}>{l}</div>
                        <div style={{ fontSize:18, fontWeight:800, color:cor }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr>{['Data','Hora','Área','Profissional','Frequência'].map(h => (
                          <th key={h} style={{ textAlign:'left', padding:'6px 8px', fontSize:10, color:'#888780', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid #E8E6DE' }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {freqLista.map((a, i) => {
                          const c = String(a.comparecimento || '').toLowerCase()
                          const sit = String(a.situacao || '').toLowerCase()
                          const [rotulo, cor, bg] =
                            c === 'compareceu' || (sit === 'realizado' && !a.comparecimento) ? ['✓ Compareceu', '#3B6D11', '#EAF3DE']
                            : c === 'faltou' ? ['✗ Faltou', '#A32D2D', '#FCEBEB']
                            : c === 'falta justificada' ? ['✗ Falta justificada', '#854F0B', '#FAEEDA']
                            : sit === 'cancelado' ? ['Cancelado', '#888780', '#F1EFE8']
                            : ['agendado','reagendado'].includes(sit) ? ['Agendado', '#185FA5', '#E6F1FB']
                            : [a.situacao || '—', '#888780', '#F1EFE8']
                          return (
                            <tr key={i} style={{ background: i%2===0 ? '#fff' : '#FAFAF8' }}>
                              <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                              <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>{a.hora_inicio ? String(a.hora_inicio).slice(0,5) : '—'}</td>
                              <td style={{ padding:'6px 8px' }}>{a.area_atendimento || 'Interdisciplinar'}</td>
                              <td style={{ padding:'6px 8px' }}>{a.profissional_nome}</td>
                              <td style={{ padding:'6px 8px' }}>
                                <span style={{ fontSize:10.5, fontWeight:700, color:cor, background:bg, borderRadius:99, padding:'2px 9px', whiteSpace:'nowrap' }}>{rotulo}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>)}
              </div>
            )}
          </>)}
        </div>
      </div>
    </div>
  )
}
