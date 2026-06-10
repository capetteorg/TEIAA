import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F', ROXO = '#8B2FC9'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_CONFIG = {
  aberto:            { label:'Aberto',               bg:'#F1EFE8', cor:'#5F5E5A',  icon:'📂' },
  fechado:           { label:'Aguardando aprovação', bg:'#E6F1FB', cor:'#185FA5',  icon:'🔒' },
  aprovado:          { label:'Aprovado',             bg:'#EAF3DE', cor:'#3B6D11',  icon:'✅' },
  aprovado_ressalva: { label:'Aprovado c/ ressalva', bg:'#FAEEDA', cor:'#854F0B',  icon:'⚠️' },
  reprovado:         { label:'Reprovado',            bg:'#FEF2F2', cor:'#A32D2D',  icon:'❌' },
}

function badgeStatus(status) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.aberto
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:c.bg, color:c.cor }}>
      {c.icon} {c.label}
    </span>
  )
}

export default function Fechamento() {
  const { perfil } = useAuth()
  const isAdmin = perfil?.perfil === 'admin'
  const [fechamentos, setFechamentos] = useState([])
  const [extratos, setExtratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [aprovacaoAberta, setAprovacaoAberta] = useState(null)
  const [formAprov, setFormAprov] = useState({})
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [expandido, setExpandido] = useState(null)

  const [membrosCF, setMembrosCF] = useState([])

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
    if (!window.confirm(`Fechar o mês ${competencia}? Isso indica que a conciliação foi revisada e está pronta para aprovação do Conselho Fiscal.`)) return
    const { data } = await supabase.from('fechamentos').upsert({
      competencia,
      status: 'fechado',
      fechado_em: new Date().toISOString(),
      fechado_por: perfil?.nome || 'Admin',
    }, { onConflict: 'competencia' }).select().single()
    setMsg(`✅ Mês ${competencia} fechado e aguardando aprovação!`)
    carregar()
    setTimeout(() => setMsg(''), 4000)
  }

  async function reabrirMes(competencia) {
    if (!window.confirm(`Reabrir o mês ${competencia}?`)) return
    await supabase.from('fechamentos').update({ status:'aberto', fechado_em:null }).eq('competencia', competencia)
    setMsg('Mês reaberto.')
    carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  async function salvarAprovacao(competencia) {
    setSalvando(true)
    const { tipo_aprovacao, ressalvas, reuniao_data, reuniao_local, membros_presentes, observacoes, modalidade } = formAprov
    if (!tipo_aprovacao) { setMsg('⚠ Selecione o tipo de aprovação.'); setSalvando(false); return }
    if (!reuniao_data) { setMsg('⚠ Informe a data da reunião.'); setSalvando(false); return }
    await supabase.from('fechamentos').update({
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
    setAprovacaoAberta(null)
    setFormAprov({})
    setMsg(`✅ Aprovação registrada para ${competencia}!`)
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const fmt = v => 'R$ '+Math.abs(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'
  const fmtMes = comp => {
    if (!comp) return '—'
    const [y,m] = comp.split('-')
    return `${MESES[parseInt(m)-1]} de ${y}`
  }

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'7px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    btn: (bg,cor='#fff') => ({ padding:'5px 12px', fontSize:11, borderRadius:7, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    label: { fontSize:11, color:'#5F5E5A', display:'block', marginBottom:3 },
  }

  const aprovados = fechamentos.filter(f => f.fechamento?.status === 'aprovado' || f.fechamento?.status === 'aprovado_ressalva').length
  const aguardando = fechamentos.filter(f => f.fechamento?.status === 'fechado').length
  const abertos = fechamentos.filter(f => !f.fechamento || f.fechamento.status === 'aberto').length

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ marginBottom:'1.25rem' }}>
        <div style={{ fontSize:15, fontWeight:500 }}>Fechamento e Aprovação do Conselho Fiscal</div>
        <div style={{ fontSize:12, color:'#888780' }}>Controle de fechamento mensal e registro de aprovações</div>
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:'1.25rem' }}>
        {[
          { label:'Meses aprovados', val:aprovados, cor:VERDE },
          { label:'Aguardando aprovação', val:aguardando, cor:AZUL },
          { label:'Em aberto', val:abertos, cor:LARANJA },
          { label:'Total de meses', val:fechamentos.length, cor:'#5F5E5A' },
        ].map(m => (
          <div key={m.label} style={{ background:'#fff', borderRadius:10, padding:'.85rem 1rem', border:'0.5px solid #E0DDD5' }}>
            <div style={{ height:3, borderRadius:99, background:m.cor, marginBottom:'.7rem' }} />
            <div style={{ fontSize:11, color:'#888780', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:msg.includes('✅')?'#F2FAE8':msg.includes('⚠')?'#FAEEDA':'#E6F1FB', color:msg.includes('✅')?'#3B6D11':msg.includes('⚠')?'#854F0B':'#185FA5' }}>{msg}</div>}

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
                          <button onClick={() => fecharMes(competencia)} style={s.btn(AZUL)}>🔒 Fechar mês</button>
                        )}
                        {isAdmin && status === 'fechado' && (
                          <>
                            <button onClick={() => { setAprovacaoAberta(isAprovAberto?null:competencia); setFormAprov({ tipo_aprovacao:'', ressalvas:'', reuniao_data:'', reuniao_local:'', membros_presentes:'', membros_presentes_ids:[], modalidade:'presencial', observacoes:'' }) }} style={s.btn(VERDE)}>✅ Registrar aprovação</button>
                            <button onClick={() => reabrirMes(competencia)} style={s.btn('#F1EFE8','#5F5E5A')}>↩ Reabrir</button>
                          </>
                        )}
                        {isAdmin && (status === 'aprovado' || status === 'aprovado_ressalva' || status === 'reprovado') && (
                          <button onClick={() => { setAprovacaoAberta(isAprovAberto?null:competencia); setFormAprov({ tipo_aprovacao: fechamento.tipo_aprovacao||'', ressalvas: fechamento.ressalvas||'', reuniao_data: fechamento.reuniao_data||'', reuniao_local: fechamento.reuniao_local||'', membros_presentes: fechamento.membros_presentes||'', membros_presentes_ids:[], modalidade: fechamento.reuniao_modalidade||'presencial', observacoes: fechamento.observacoes||'' }) }} style={s.btn('#F1EFE8','#5F5E5A')}>✏ Editar</button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Painel de aprovação */}
                  {isAprovAberto && (
                    <tr>
                      <td colSpan={8} style={{ padding:0, borderBottom:'0.5px solid #E0DDD5' }}>
                        <div style={{ background:'#F2FAE8', padding:'16px', borderLeft:`3px solid ${VERDE}` }}>
                          <div style={{ fontSize:13, fontWeight:500, marginBottom:12, color:VERDE }}>
                            ✅ Registrar aprovação do Conselho Fiscal — {fmtMes(competencia)}
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                            <div>
                              <label style={s.label}>Tipo de aprovação *</label>
                              <select value={formAprov.tipo_aprovacao||''} onChange={e=>setFormAprov(f=>({...f,tipo_aprovacao:e.target.value}))} style={s.input}>
                                <option value="">Selecione...</option>
                                <option value="aprovado">✅ Aprovado</option>
                                <option value="aprovado_ressalva">⚠️ Aprovado com ressalva</option>
                                <option value="reprovado">❌ Reprovado</option>
                              </select>
                            </div>
                            <div>
                              <label style={s.label}>Data da reunião *</label>
                              <input type="date" value={formAprov.reuniao_data||''} onChange={e=>setFormAprov(f=>({...f,reuniao_data:e.target.value}))} style={s.input} />
                            </div>
                            <div>
                              <label style={s.label}>Modalidade</label>
                              <select value={formAprov.modalidade||'presencial'} onChange={e=>setFormAprov(f=>({...f,modalidade:e.target.value}))} style={s.input}>
                                <option value="presencial">🏢 Presencial</option>
                                <option value="online">💻 Online</option>
                                <option value="hibrida">🔀 Híbrida</option>
                              </select>
                            </div>
                            <div>
                              <label style={s.label}>Local / Plataforma</label>
                              <input value={formAprov.reuniao_local||''} onChange={e=>setFormAprov(f=>({...f,reuniao_local:e.target.value}))} style={s.input}
                                placeholder={formAprov.modalidade==='online'?'Ex: Google Meet':'Ex: Sede da CAPETTE'} />
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
                                    <label key={m.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer', padding:'5px 10px', borderRadius:8, background:sel?'#EAF3DE':'#F8F7F2', border:`0.5px solid ${sel?VERDE:'#E0DDD5'}` }}>
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
                            <button onClick={() => salvarAprovacao(competencia)} disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERDE)}>{salvando?'Salvando...':'💾 Salvar aprovação'}</button>
                            <button onClick={() => { setAprovacaoAberta(null); setFormAprov({}) }} style={s.btn('#F1EFE8','#5F5E5A')}>Cancelar</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Detalhes expandidos */}
                  {isExpand && fechamento && (
                    <tr>
                      <td colSpan={8} style={{ padding:0, borderBottom:'0.5px solid #E0DDD5' }}>
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
  )
}
