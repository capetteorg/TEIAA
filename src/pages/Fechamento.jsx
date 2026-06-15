import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { gerarPDFParecer, gerarPDFParecerAnual } from '../lib/pdf'
import { auditar } from '../lib/auditoria'
import { confirmar } from '../lib/ui'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F', ROXO = '#8B2FC9'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_CONFIG = {
  aberto:            { label:'Aberto',               bg:'#F1EFE8', cor:'#5F5E5A',  icon:'ti-folder-open' },
  fechado:           { label:'Aguardando aprovação', bg:'#E6F1FB', cor:'#185FA5',  icon:'ti-lock' },
  aprovado:          { label:'Aprovado',             bg:'#EAF3DE', cor:'#3B6D11',  icon:'ti-circle-check' },
  aprovado_ressalva: { label:'Aprovado c/ ressalva', bg:'#FAEEDA', cor:'#854F0B',  icon:'ti-alert-triangle' },
  reprovado:         { label:'Reprovado',            bg:'#FEF2F2', cor:'#A32D2D',  icon:'ti-circle-x' },
}

function badgeStatus(status) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.aberto
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:c.bg, color:c.cor }}>
      <i className={`ti ${c.icon}`} style={{fontSize:12}} /> {c.label}
    </span>
  )
}

export default function Fechamento() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const isAdmin = perfil?.perfil === 'admin'
  const [fechamentos, setFechamentos] = useState([])
  const [extratos, setExtratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [aprovacaoAberta, setAprovacaoAberta] = useState(null)
  const [formAprov, setFormAprov] = useState({})
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [expandido, setExpandido] = useState(null)

  const [gerandoPDF, setGerandoPDF] = useState(null)

  async function gerarParecer(competencia, fechamento) {
    setGerandoPDF(competencia)
    const [y,m] = competencia.split('-')
    const ult = new Date(parseInt(y),parseInt(m),0).getDate()
    const { data: movData } = await supabase.from('extrato_movs')
      .select('valor').gte('data', `${competencia}-01`).lte('data', `${competencia}-${String(ult).padStart(2,'0')}`)
    const { data: inst } = await supabase.from('instituicao').select('*').limit(1).single()
    gerarPDFParecer({ fechamento, movs: movData||[], instituicao: inst||{} })
    setGerandoPDF(null)
  }

  // Anos com todos os 12 meses aprovados
  const anosCompletos = (() => {
    const porAno = {}
    fechamentos.forEach(f => {
      if (['aprovado','aprovado_ressalva'].includes(f.status)) {
        const ano = f.competencia.split('-')[0]
        porAno[ano] = (porAno[ano]||0) + 1
      }
    })
    return Object.entries(porAno).filter(([,n]) => n >= 12).map(([ano]) => ano).sort().reverse()
  })()

  async function parecerAnual(ano) {
    setGerandoPDF('anual-'+ano)
    const { data: movData } = await fetchAll(() => supabase.from('extrato_movs')
      .select('valor').gte('data', `${ano}-01-01`).lte('data', `${ano}-12-31`))
    const { data: inst } = await supabase.from('instituicao').select('*').limit(1).single()
    const fechAno = fechamentos.filter(f => f.competencia.startsWith(ano) && ['aprovado','aprovado_ressalva'].includes(f.status))
    gerarPDFParecerAnual({ ano, fechamentos: fechAno, movs: movData||[], instituicao: inst||{} })
    setGerandoPDF(null)
  }

  useEffect(() => { carregar(); carregarMembrosCF() }, [])

  async function carregarMembrosCF() {
    const { data } = await supabase.from('diretoria')
      .select('id,nome,cargo').eq('ativo', true)
      .in('cargo', ['1º Membro Conselho Fiscal','2º Membro Conselho Fiscal','Suplente Conselho Fiscal','Presidente Conselho Fiscal'])
      .order('cargo')
    setMembrosCF(data || [])
  }

  async function carregar() {
    setLoading(true)
    const [fechRes, extRes] = await Promise.all([
      supabase.from('fechamentos').select('*').order('competencia', { ascending: false }),
      supabase.from('extratos').select('id, competencia, total_movs, conta:contas(nome)').order('competencia', { ascending: false }),
    ])
    const fechMap = {}
    ;(fechRes.data || []).forEach(f => { fechMap[f.competencia] = f })

    // Montar lista de competências a partir dos extratos
    const competencias = [...new Set((extRes.data || []).map(e => e.competencia))].sort().reverse()
    const lista = competencias.map(comp => ({
      competencia: comp,
      extrato: (extRes.data || []).find(e => e.competencia === comp),
      fechamento: fechMap[comp] || null,
    }))
    setFechamentos(lista)
    setExtratos(extRes.data || [])
    setLoading(false)
  }

  async function fecharMes(competencia) {
    if (!(await confirmar(`Fechar o mês ${competencia}? Isso indica que a conciliação foi revisada e está pronta para aprovação do Conselho Fiscal.`, { titulo:'Fechar mês', confirmarLabel:'Fechar mês', perigo:false }))) return
    // Verificar se já existe fechamento para essa competência
    const { data: existe } = await supabase.from('fechamentos').select('id').eq('competencia', competencia).single()
    let erro
    if (existe) {
      const { error } = await supabase.from('fechamentos').update({
        status: 'fechado',
        fechado_em: new Date().toISOString(),
        fechado_por: perfil?.nome || 'Admin',
      }).eq('competencia', competencia)
      erro = error
    } else {
      const { error } = await supabase.from('fechamentos').insert({
        competencia,
        status: 'fechado',
        fechado_em: new Date().toISOString(),
        fechado_por: perfil?.nome || 'Admin',
      })
      erro = error
    }
    if (erro) { setMsg(`Erro: ${erro.message}`); return }
    auditar('Fechamento de mês', competencia)
    setMsg(`Mês ${competencia} fechado e aguardando aprovação!`)
    await carregar()
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function reabrirMes(competencia) {
    if (!(await confirmar(`Reabrir o mês ${competencia}? Os dados de aprovação serão resetados.`, { titulo:'Reabrir mês', confirmarLabel:'Reabrir' }))) return
    const { error } = await supabase.from('fechamentos').update({
      status: 'aberto',
      fechado_em: null,
      fechado_por: null,
      aprovado_em: null,
      aprovado_por: null,
      tipo_aprovacao: null,
      ressalvas: null,
      reuniao_data: null,
      reuniao_local: null,
      reuniao_modalidade: null,
      membros_presentes: null,
    }).eq('competencia', competencia)
    if (error) { setMsg(`Erro: ${error.message}`); return }
    auditar('Reabertura de mês', competencia)
    setMsg('Mês reaberto.')
    await carregar()
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function salvarAprovacao(competencia) {
    setSalvando(true)
    const { tipo_aprovacao, ressalvas, reuniao_data, reuniao_local, membros_presentes, observacoes, modalidade } = formAprov
    if (!tipo_aprovacao) { setMsg('Selecione o tipo de aprovação.'); setSalvando(false); return }
    if (!reuniao_data) { setMsg('Informe a data da reunião.'); setSalvando(false); return }
    const { error } = await supabase.from('fechamentos').update({
      status: tipo_aprovacao,
      tipo_aprovacao,
      aprovado_em: new Date().toISOString(),
      aprovado_por: perfil?.nome || 'Admin',
      ressalvas: ressalvas || null,
      reuniao_data,
      reuniao_local: reuniao_local || null,
      reuniao_modalidade: modalidade || 'presencial',
      membros_presentes: membros_presentes || null,
      observacoes: observacoes || null,
    }).eq('competencia', competencia)
    if (!error) auditar('Aprovação do Conselho Fiscal', `${competencia} — ${tipo_aprovacao}`)
    if (error) { setMsg(`Erro: ${error.message}`); setSalvando(false); return }
    setAprovacaoAberta(null)
    setFormAprov({})
    setMsg(`Aprovação registrada para ${competencia}!`)
    await carregar()
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  const fmt = v => 'R$ '+Math.abs(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'
  const fmtMes = comp => {
    if (!comp) return '—'
    const [y,m] = comp.split('-')
    return `${MESES[parseInt(m)-1]} de ${y}`
  }

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'7px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
    btn: (bg,cor='#fff') => ({ padding:'5px 12px', fontSize:11, borderRadius:7, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    label: { fontSize:11, color:'#5F5E5A', display:'block', marginBottom:3 },
  }

  const aprovados = fechamentos.filter(f => f.fechamento?.status === 'aprovado' || f.fechamento?.status === 'aprovado_ressalva').length
  const aguardando = fechamentos.filter(f => f.fechamento?.status === 'fechado').length
  const abertos = fechamentos.filter(f => !f.fechamento || f.fechamento.status === 'aberto').length

  return (
    <div>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Fechamento / Conselho Fiscal</div>
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
      {/* Checklist pré-fechamento */}
      {(() => {
        const mesAtualComp = new Date().toISOString().slice(0,7)
        const extratoMes = extratos.find(e => e.competencia === mesAtualComp)
        return (
          <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, padding: '14px 18px', marginBottom: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B4B2A9', marginBottom: 12 }}>
              Checklist para fechar {new Date(mesAtualComp+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {[
                {
                  ok: !!extratoMes,
                  label: 'Extrato importado',
                  desc: extratoMes ? `${extratoMes.total_movs} movimentações · ${extratoMes.arquivo_nome}` : 'Nenhum extrato importado para este mês',
                  rota: '/importar',
                  icon: 'ti-file-upload',
                },
                {
                  ok: !!extratoMes && (extratoMes.total_movs || 0) === extratos.filter(e=>e.competencia===mesAtualComp).reduce((a,e)=>a+(e.total_conciliados||0),0),
                  label: 'Conciliação completa',
                  desc: !extratoMes ? 'Aguardando extrato' : 'Verifique se todas as movimentações foram categorizadas',
                  rota: '/conciliacao',
                  icon: 'ti-checks',
                },
                {
                  ok: mesesPendentes === 0,
                  label: 'Sem meses anteriores pendentes',
                  desc: mesesPendentes > 0 ? `${mesesPendentes} mês(es) anterior(es) sem aprovação` : 'Todos os meses anteriores aprovados',
                  rota: '/fechamento',
                  icon: 'ti-history',
                },
                {
                  ok: true, // sempre pode tentar fechar
                  label: 'Reunião do Conselho Fiscal',
                  desc: 'Registre a data, modalidade e membros presentes',
                  rota: null,
                  icon: 'ti-users-group',
                },
              ].map(item => (
                <div key={item.label} onClick={() => item.rota && navigate(item.rota)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: item.ok ? 'rgba(59,109,17,0.05)' : 'rgba(0,0,0,0.02)', border: `0.5px solid ${item.ok ? 'rgba(59,109,17,0.2)' : '#E8E6DE'}`, cursor: item.rota ? 'pointer' : 'default' }}>
                  <i className={`ti ${item.ok ? 'ti-circle-check' : 'ti-circle-dashed'}`} style={{ fontSize: 16, color: item.ok ? '#3B6D11' : '#B4B2A9', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: item.ok ? '#3B6D11' : '#2C2C2A', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#888780', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:'1.25rem' }}>
        <div>
<div style={{ fontSize:12, color:'#888780', marginTop:2 }}>Fluxo: o financeiro <strong>fecha</strong> o mês após a conciliação → o Conselho Fiscal <strong>aprova</strong> (ou reprova) → meses aprovados aparecem na Transparência Pública.</div>
        <div style={{ fontSize:12, color:'#888780' }}>Controle de fechamento mensal e registro de aprovações</div>
        </div>
        {anosCompletos.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {anosCompletos.map(ano => (
              <button key={ano} onClick={() => parecerAnual(ano)} disabled={gerandoPDF==='anual-'+ano}
                style={{ padding:'7px 16px', fontSize:12, fontWeight:600, borderRadius:8, border:'none', background:'#0E7EA8', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <i className="ti ti-file-certificate" style={{fontSize:14}} />
                {gerandoPDF==='anual-'+ano ? 'Gerando...' : `Parecer anual ${ano}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:'1.25rem' }}>
        {[
          { label:'Meses aprovados', val:aprovados, cor:VERDE },
          { label:'Aguardando aprovação', val:aguardando, cor:AZUL },
          { label:'Em aberto', val:abertos, cor:LARANJA },
          { label:'Total de meses', val:fechamentos.length, cor:'#5F5E5A' },
        ].map(m => (
          <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ height:3, borderRadius:99, background:m.cor, marginBottom:'.7rem' }} />
            <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':msg.includes('Aviso')?'#FAEEDA':'#E6F1FB', color:!msg.includes('Erro')?'#3B6D11':msg.includes('Aviso')?'#854F0B':'#185FA5' }}>{msg}</div>}

      {/* Tabela */}
      <div style={{ ...s.card, padding:0, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr>
              {['Competência','Extrato','Status','Fechado em','Aprovado em','Tipo','Reunião',''].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ ...s.td, textAlign:'center', padding:'2rem', color:'#888780' }}>Carregando...</td></tr>
            ) : fechamentos.map(({ competencia, extrato, fechamento }) => {
              const status = fechamento?.status || 'aberto'
              const isExpand = expandido === competencia
              const isAprovAberto = aprovacaoAberta === competencia
              return (
                <React.Fragment key={competencia}>
                  <tr style={{ background: status==='aprovado'?'#F2FAE8': status==='aprovado_ressalva'?'#FFFBF0': status==='reprovado'?'#FEF2F2': status==='fechado'?'#F0F6FF':'#fff' }}>
                    <td style={{ ...s.td, fontWeight:600, fontSize:13 }}>
                      <div style={{ cursor:'pointer', color:AZUL }} onClick={() => setExpandido(isExpand?null:competencia)}>
                        {fmtMes(competencia)} {isExpand?'▲':'▼'}
                      </div>
                    </td>
                    <td style={{ ...s.td, fontSize:11 }}>
                      {extrato ? (
                        <div>
                          <div>{extrato.conta?.nome}</div>
                          <div style={{ color:'#888780' }}>{extrato.total_movs} movimentações</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={s.td}>{badgeStatus(status)}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>
                      {fechamento?.fechado_em ? (
                        <div>
                          <div>{fmtData(fechamento.fechado_em)}</div>
                          <div style={{ fontSize:10 }}>{fechamento.fechado_por}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>
                      {fechamento?.aprovado_em ? (
                        <div>
                          <div>{fmtData(fechamento.aprovado_em)}</div>
                          <div style={{ fontSize:10 }}>{fechamento.aprovado_por}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={s.td}>
                      {fechamento?.tipo_aprovacao ? badgeStatus(fechamento.tipo_aprovacao) : '—'}
                    </td>
                    <td style={{ ...s.td, fontSize:11 }}>
                      {fechamento?.reuniao_data ? (
                        <div>
                          <div>{fmtData(fechamento.reuniao_data+'T12:00:00')}</div>
                          {fechamento.reuniao_local && <div style={{ fontSize:10, color:'#888780' }}>{fechamento.reuniao_local}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ ...s.td }}>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {isAdmin && status === 'aberto' && (
                          <button onClick={() => fecharMes(competencia)} style={s.btn(AZUL)}><i className="ti ti-lock" style={{marginRight:4}} /> Fechar mês</button>
                        )}
                        {isAdmin && status === 'fechado' && (
                          <>
                            <button onClick={() => { setAprovacaoAberta(isAprovAberto?null:competencia); setFormAprov({ tipo_aprovacao:'', ressalvas:'', reuniao_data:'', reuniao_local:'', membros_presentes:'', membros_presentes_ids:[], modalidade:'presencial', observacoes:'' }) }} style={s.btn('#0E7EA8')}><i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Registrar aprovação</button>
                            <button onClick={() => reabrirMes(competencia)} style={s.btn('#F1EFE8','#5F5E5A')}>↩ Reabrir</button>
                          </>
                        )}
                        {isAdmin && (status === 'aprovado' || status === 'aprovado_ressalva' || status === 'reprovado') && (
                          <>
                            <button onClick={() => { setAprovacaoAberta(isAprovAberto?null:competencia); setFormAprov({ tipo_aprovacao: fechamento.tipo_aprovacao||'', ressalvas: fechamento.ressalvas||'', reuniao_data: fechamento.reuniao_data||'', reuniao_local: fechamento.reuniao_local||'', membros_presentes: fechamento.membros_presentes||'', membros_presentes_ids:[], modalidade: fechamento.reuniao_modalidade||'presencial', observacoes: fechamento.observacoes||'' }) }} style={s.btn('#F1EFE8','#5F5E5A')}><i className="ti ti-pencil" style={{marginRight:4}} /> Editar</button>
                            <button onClick={() => gerarParecer(competencia, fechamento)} disabled={gerandoPDF===competencia} style={s.btn('#0E7EA8')}>
                              {gerandoPDF===competencia ? '' : ''} Imprimir parecer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Painel de aprovação */}
                  {isAprovAberto && (
                    <tr>
                      <td colSpan={8} style={{ padding:0, borderBottom:'0.5px solid #E8E6DE' }}>
                        <div style={{ background:'#F2FAE8', padding:'16px', borderLeft:`3px solid ${VERDE}` }}>
                          <div style={{ fontSize:13, fontWeight:500, marginBottom:12, color:VERDE }}>
                            <i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Registrar aprovação do Conselho Fiscal — {fmtMes(competencia)}
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                            <div>
                              <label style={s.label}>Tipo de aprovação *</label>
                              <select value={formAprov.tipo_aprovacao||''} onChange={e=>setFormAprov(f=>({...f,tipo_aprovacao:e.target.value}))} style={s.input}>
                                <option value="">Selecione...</option>
                                <option value="aprovado"><i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Aprovado</option>
                                <option value="aprovado_ressalva"><i className="ti ti-alert-triangle" style={{fontSize:14, color:'#E67814'}} /> Aprovado com ressalva</option>
                                <option value="reprovado"><i className="ti ti-circle-x" style={{marginRight:4, color:'#A32D2D'}} /> Reprovado</option>
                              </select>
                            </div>
                            <div>
                              <label style={s.label}>Data da reunião *</label>
                              <input type="date" value={formAprov.reuniao_data||''} onChange={e=>setFormAprov(f=>({...f,reuniao_data:e.target.value}))} style={s.input} />
                            </div>
                            <div>
                              <label style={s.label}>Modalidade</label>
                              <select value={formAprov.modalidade||'presencial'} onChange={e=>setFormAprov(f=>({...f,modalidade:e.target.value}))} style={s.input}>
                                <option value="presencial"><i className="ti ti-building" style={{marginRight:4}} /> Presencial</option>
                                <option value="online"><i className="ti ti-laptop" style={{marginRight:4}} /> Online</option>
                                <option value="hibrida"><i className="ti ti-arrows-shuffle" style={{marginRight:4}} /> Híbrida</option>
                              </select>
                            </div>
                            <div>
                              <label style={s.label}>Local / Plataforma</label>
                              <input value={formAprov.reuniao_local||''} onChange={e=>setFormAprov(f=>({...f,reuniao_local:e.target.value}))} style={s.input}
                                placeholder={formAprov.modalidade==='online'?'Ex: Google Meet':'Ex: Sede da TEIAA'} />
                            </div>
                          </div>
                          <div style={{ marginBottom:10 }}>
                            <label style={s.label}>Membros presentes</label>
                            {membrosCF.length > 0 ? (
                              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                                {membrosCF.map(m => {
                                  const selecionados = (formAprov.membros_presentes_ids || [])
                                  const sel = selecionados.includes(m.id)
                                  return (
                                    <label key={m.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer', padding:'5px 10px', borderRadius:8, background:sel?'#EAF3DE':'#F8F7F2', border:`0.5px solid ${sel?VERDE:'#E8E6DE'}` }}>
                                      <input type="checkbox" checked={sel} onChange={e => {
                                        const ids = formAprov.membros_presentes_ids || []
                                        const novos = e.target.checked ? [...ids, m.id] : ids.filter(i=>i!==m.id)
                                        const nomes = membrosCF.filter(x=>novos.includes(x.id)).map(x=>x.nome).join(', ')
                                        setFormAprov(f => ({ ...f, membros_presentes_ids: novos, membros_presentes: nomes }))
                                      }} />
                                      <div>
                                        <div style={{ fontWeight:500 }}>{m.nome}</div>
                                        <div style={{ fontSize:10, color:'#888780' }}>{m.cargo}</div>
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                            ) : (
                              <input value={formAprov.membros_presentes||''} onChange={e=>setFormAprov(f=>({...f,membros_presentes:e.target.value}))} style={s.input} placeholder="Ex: Michel Jahara, João Silva" />
                            )}
                          </div>
                          {(formAprov.tipo_aprovacao === 'aprovado_ressalva' || formAprov.tipo_aprovacao === 'reprovado') && (
                            <div style={{ marginBottom:10 }}>
                              <label style={s.label}>Ressalvas / Motivo *</label>
                              <textarea value={formAprov.ressalvas||''} onChange={e=>setFormAprov(f=>({...f,ressalvas:e.target.value}))} style={{ ...s.input, height:80, resize:'vertical' }} />
                            </div>
                          )}
                          <div style={{ marginBottom:12 }}>
                            <label style={s.label}>Observações adicionais</label>
                            <input value={formAprov.observacoes||''} onChange={e=>setFormAprov(f=>({...f,observacoes:e.target.value}))} style={s.input} />
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => salvarAprovacao(competencia)} disabled={salvando} style={s.btn(salvando?'#D3D1C7':'#0E7EA8')}>{salvando?'Salvando...':'Salvar aprovação'}</button>
                            <button onClick={() => { setAprovacaoAberta(null); setFormAprov({}) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Detalhes expandidos */}
                  {isExpand && fechamento && (
                    <tr>
                      <td colSpan={8} style={{ padding:0, borderBottom:'0.5px solid #E8E6DE' }}>
                        <div style={{ background:'#F8F7F2', padding:'12px 16px', borderLeft:`3px solid ${AZUL}` }}>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10, fontSize:12 }}>
                            {fechamento.ressalvas && <div><span style={{ color:'#888780' }}>Ressalvas:</span><br/><strong>{fechamento.ressalvas}</strong></div>}
                            {fechamento.membros_presentes && <div><span style={{ color:'#888780' }}>Membros presentes:</span><br/><strong>{fechamento.membros_presentes}</strong></div>}
                            {fechamento.observacoes && <div><span style={{ color:'#888780' }}>Observações:</span><br/><strong>{fechamento.observacoes}</strong></div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
      </div>
  )
}