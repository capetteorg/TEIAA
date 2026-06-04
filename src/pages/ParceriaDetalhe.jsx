import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'
const TIPO_LABEL = { emenda:'Emenda Parlamentar', edital:'Edital', fomento:'Termo de Fomento', colaboracao:'Termo de Colaboração', convenio:'Convênio', projeto:'Projeto Específico' }
const SITUACAO_COR = { 'em execução':['#EAF3DE','#3B6D11'], 'prestação pendente':['#FAEEDA','#854F0B'], 'encerrada':['#F1EFE8','#888780'], 'suspensa':['#FCEBEB','#A32D2D'] }

export default function ParceriaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [parceria, setParceria] = useState(null)
  const [aba, setAba] = useState('resumo')
  const [movs, setMovs] = useState([])
  const [planos, setPlanos] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [resumoFin, setResumoFin] = useState({ entradas:0, saidas:0 })

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const { data: parc } = await supabase.from('parcerias')
      .select('*, conta:contas(id,nome,banco,agencia,conta_num,tipo_conta)')
      .eq('id', parseInt(id)).single()
    setParceria(parc)

    if (parc?.conta_id) {
      // Movimentações da conta vinculada
      const { data: extratos } = await supabase.from('extratos').select('id').eq('conta_id', parc.conta_id)
      if (extratos?.length) {
        const ids = extratos.map(e => e.id)
        const { data: movsData } = await supabase.from('extrato_movs')
          .select('*, categoria:categorias(nome), plano:plano_trabalho(nome)')
          .in('extrato_id', ids).order('data', { ascending: false })
        setMovs(movsData || [])
        const lista = movsData || []
        const ent = lista.filter(m => Number(m.valor) > 0).reduce((a,m) => a+Number(m.valor), 0)
        const sai = Math.abs(lista.filter(m => Number(m.valor) < 0).reduce((a,m) => a+Number(m.valor), 0))
        setResumoFin({ entradas: ent, saidas: sai })
      }
      // Planos de trabalho da conta
      const { data: planosData } = await supabase.from('plano_trabalho').select('*').eq('conta_id', parc.conta_id)
      setPlanos(planosData || [])
    }
    // Documentos
    const { data: docs } = await supabase.from('documentos').select('*').eq('publico', true).order('criado_em', { ascending: false })
    setDocumentos(docs || [])
    setLoading(false)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  if (loading) return <div style={{ padding:'2rem', textAlign:'center', color:'#888780' }}>Carregando...</div>
  if (!parceria) return <div style={{ padding:'2rem', textAlign:'center', color:'#888780' }}>Parceria não encontrada.</div>

  const [bg, cor] = SITUACAO_COR[parceria.situacao] || ['#F1EFE8','#5F5E5A']
  const pctExec = parceria.valor_aprovado && parceria.valor_recebido ? Math.round(parceria.valor_recebido/parceria.valor_aprovado*100) : 0
  const saldoFin = resumoFin.entradas - resumoFin.saidas

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    tab: ativo => ({ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?LARANJA:'#D3D1C7'}`, background:ativo?LARANJA:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer', whiteSpace:'nowrap' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => navigate('/parcerias')}
          style={{ padding:'5px 10px', fontSize:12, borderRadius:8, border:'0.5px solid #D3D1C7', background:'transparent', cursor:'pointer' }}>
          ← Voltar
        </button>
        <div>
          <div style={{ fontSize:10, color:'#888780' }}>{TIPO_LABEL[parceria.tipo]||parceria.tipo}</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#2C2C2A' }}>{parceria.nome_projeto}</div>
        </div>
        <span style={{ ...s.badge(bg,cor), marginLeft:4 }}>{parceria.situacao}</span>
      </div>

      {/* Cards de resumo */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:'1.25rem' }}>
        {[
          { label:'Valor aprovado', val:fmt(parceria.valor_aprovado), cor:AZUL },
          { label:'Valor recebido', val:fmt(parceria.valor_recebido), cor:VERDE },
          { label:'Entradas na conta', val:fmt(resumoFin.entradas), cor:VERDE },
          { label:'Saídas na conta', val:fmt(resumoFin.saidas), cor:VERMELHO },
          { label:'Saldo atual', val:fmt(saldoFin), cor:saldoFin>=0?AZUL:VERMELHO },
        ].map(m => (
          <div key={m.label} style={{ background:'#fff', borderRadius:10, padding:'.75rem 1rem', border:'0.5px solid #E0DDD5' }}>
            <div style={{ height:3, borderRadius:99, background:m.cor, marginBottom:'.5rem' }} />
            <div style={{ fontSize:10, color:'#888780', marginBottom:3 }}>{m.label}</div>
            <div style={{ fontSize:14, fontWeight:600, color:m.cor }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {[['resumo','Resumo'],['financeiro','Financeiro'],['plano','Plano de trabalho'],['documentos','Documentos'],['prestacao','Prestação de contas']].map(([id,label]) => (
          <button key={id} onClick={() => setAba(id)} style={s.tab(aba===id)}>{label}</button>
        ))}
      </div>

      {/* ABA: Resumo */}
      {aba === 'resumo' && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Dados do instrumento</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
            {[
              ['Tipo',parceria.tipo?TIPO_LABEL[parceria.tipo]:'-'],
              ['Nº Termo',parceria.num_termo||'—'],
              ['Nº Processo',parceria.num_processo||'—'],
              ['Órgão concedente',parceria.orgao_concedente||'—'],
              ['Responsável',parceria.responsavel||'—'],
              ['Vigência',`${fmtData(parceria.vigencia_inicio)} a ${fmtData(parceria.vigencia_fim)}`],
              ['Conta bancária',parceria.conta?.nome||'—'],
              ['Banco',parceria.conta ? `${parceria.conta.banco} Ag:${parceria.conta.agencia} CC:${parceria.conta.conta_num}` : '—'],
              ['Situação',parceria.situacao||'—'],
            ].map(([l,v]) => (
              <div key={l} style={{ background:'#F8F7F2', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
          {parceria.objeto && (
            <div style={{ background:'#F8F7F2', borderRadius:8, padding:'8px 10px', marginBottom:10 }}>
              <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>Objeto</div>
              <div style={{ fontSize:12 }}>{parceria.objeto}</div>
            </div>
          )}
          {parceria.valor_aprovado && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#888780', marginBottom:4 }}>
                <span>Execução financeira — {fmt(parceria.valor_recebido)} recebido de {fmt(parceria.valor_aprovado)}</span>
                <span>{pctExec}%</span>
              </div>
              <div style={{ height:8, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:pctExec+'%', background:pctExec>=100?VERDE:LARANJA, borderRadius:99 }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA: Financeiro */}
      {aba === 'financeiro' && (
        <div style={s.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Movimentações financeiras</div>
            {parceria.conta_id && (
              <button onClick={() => navigate('/conciliacao')}
                style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid ${AZUL}`, background:'transparent', color:AZUL, cursor:'pointer' }}>
                Ir para conciliação →
              </button>
            )}
          </div>
          {movs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
              {parceria.conta_id ? 'Nenhuma movimentação encontrada para esta conta.' : 'Nenhuma conta bancária vinculada a esta parceria.'}
            </div>
          ) : (
            <div style={{ maxHeight:440, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead style={{ position:'sticky', top:0 }}>
                  <tr>{['Data','Descrição','Fornecedor','Categoria','Plano','Valor','Status'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {movs.map((m,i) => (
                    <tr key={m.id} style={{ background: i%2===0?'#fff':'#FAFAF8' }}>
                      <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(m.data)}</td>
                      <td style={{ ...s.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</td>
                      <td style={s.td}>{m.fornecedor||'—'}</td>
                      <td style={s.td}>{m.categoria?.nome||'—'}</td>
                      <td style={s.td}>{m.plano?.nome||'—'}</td>
                      <td style={{ ...s.td, fontWeight:500, color:Number(m.valor)>=0?VERDE:VERMELHO, whiteSpace:'nowrap' }}>{fmt(m.valor)}</td>
                      <td style={s.td}><span style={s.badge(m.conciliado?'#EAF3DE':'#FAEEDA', m.conciliado?'#3B6D11':'#854F0B')}>{m.conciliado?'✓ OK':'Pendente'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA: Plano de trabalho */}
      {aba === 'plano' && (
        <div style={s.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Plano de trabalho</div>
            <button onClick={() => navigate('/plano-trabalho')}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid ${LARANJA}`, background:'transparent', color:LARANJA, cursor:'pointer' }}>
              Gerenciar plano →
            </button>
          </div>
          {planos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
              {parceria.conta_id ? 'Nenhum item do plano cadastrado para esta conta.' : 'Vincule uma conta bancária para ver o plano de trabalho.'}
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr>{['Item','Descrição','Valor previsto','Executado','Saldo','% Exec.'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {planos.map(plan => {
                  const exec = movs.filter(m => m.plano_trabalho_id === plan.id && Number(m.valor) < 0).reduce((a,m) => a+Math.abs(Number(m.valor)), 0)
                  const saldo = Number(plan.valor_previsto||0) - exec
                  const pct = plan.valor_previsto > 0 ? Math.round(exec/plan.valor_previsto*100) : 0
                  return (
                    <tr key={plan.id}>
                      <td style={{ ...s.td, fontWeight:500 }}>{plan.nome}</td>
                      <td style={{ ...s.td, color:'#888780' }}>{plan.descricao||'—'}</td>
                      <td style={s.td}>{fmt(plan.valor_previsto)}</td>
                      <td style={{ ...s.td, color:VERMELHO }}>{fmt(exec)}</td>
                      <td style={{ ...s.td, color:saldo>=0?VERDE:VERMELHO }}>{fmt(saldo)}</td>
                      <td style={s.td}>{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ABA: Documentos */}
      {aba === 'documentos' && (
        <div style={s.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Documentos vinculados</div>
            <button onClick={() => navigate('/documentos')}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`0.5px solid ${AZUL}`, background:'transparent', color:AZUL, cursor:'pointer' }}>
              Gerenciar documentos →
            </button>
          </div>
          {documentos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhum documento publicado.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:8 }}>
              {documentos.map(doc => (
                <a key={doc.id} href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', background:'#F8F7F2', border:'0.5px solid #E0DDD5', borderRadius:10, padding:'1rem', textDecoration:'none' }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>📄</div>
                  <div style={{ fontSize:12, fontWeight:500, color:'#2C2C2A', marginBottom:2 }}>{doc.titulo}</div>
                  <div style={{ fontSize:10, color:'#888780' }}>{doc.categoria}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: Prestação de contas */}
      {aba === 'prestacao' && (
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Prestação de contas</div>
          <div style={{ background:'#E6F1FB', border:'0.5px solid #B3D1F0', borderRadius:10, padding:'.75rem 1rem', fontSize:12, color:'#185FA5', marginBottom:'1rem' }}>
            <strong>ℹ</strong> A prestação de contas completa com PDF MROSC está disponível na tela específica, filtrada por esta conta.
          </div>
          <button onClick={() => navigate('/prestacao-contas')}
            style={{ padding:'8px 20px', fontSize:13, borderRadius:8, border:'none', background:LARANJA, color:'#fff', cursor:'pointer', fontWeight:500 }}>
            Ir para Prestação de Contas →
          </button>
        </div>
      )}
    </div>
  )
}
