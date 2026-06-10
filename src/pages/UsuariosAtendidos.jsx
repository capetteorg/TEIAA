import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

const SITUACOES = ['ativo', 'desligado', 'encerrado', 'afastado', 'outro']
const MOTIVOS_SAIDA = [
  'Conclusão do atendimento', 'Desistência / evasão', 'Mudança de endereço',
  'Transferência para outro serviço', 'Encaminhamento para a rede',
  'Idade limite do projeto', 'Solicitação da família / responsável',
  'Encerramento do projeto', 'Outro',
]
const SITUACAO_COR = {
  'ativo': ['#EAF3DE','#3B6D11'],
  'desligado': ['#FCEBEB','#A32D2D'],
  'encerrado': ['#F1EFE8','#888780'],
  'afastado': ['#FAEEDA','#854F0B'],
  'outro': ['#E6F1FB','#185FA5'],
}

const FORM_VAZIO = {
  nome:'', nis:'', cpf:'', data_nascimento:'', projeto_id:'',
  data_ingresso:'', data_saida:'', motivo_saida:'', situacao:'ativo', observacoes:'',
}

export default function UsuariosAtendidos() {
  const isMobile = useIsMobile()
  const [usuarios, setUsuarios] = useState([])
  const [projetos, setProjetos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [filtros, setFiltros] = useState({ situacao:'', projeto_id:'', dataInicio:'', dataFim:'' })
  const [abaAtiva, setAbaAtiva] = useState('lista')

  useEffect(() => {
    supabase.from('projetos').select('id,nome').eq('aceita_atendimentos', true).order('nome').then(({ data }) => setProjetos(data || []))
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    let q = supabase.from('usuarios_atendidos')
      .select('*, projeto:projetos(nome,tipo)')
      .order('nome')
    if (filtros.situacao) q = q.eq('situacao', filtros.situacao)
    if (filtros.projeto_id) q = q.eq('projeto_id', parseInt(filtros.projeto_id))
    if (filtros.dataInicio) q = q.gte('data_ingresso', filtros.dataInicio)
    if (filtros.dataFim) q = q.lte('data_ingresso', filtros.dataFim)
    const { data } = await q
    setUsuarios(data || [])
    setLoading(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : null,
      data_nascimento: form.data_nascimento || null,
      data_ingresso: form.data_ingresso || null,
      data_saida: form.data_saida || null,
      motivo_saida: form.motivo_saida || null,
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('usuarios_atendidos').update(dados).eq('id', editando))
    } else {
      ;({ error } = await supabase.from('usuarios_atendidos').insert(dados))
    }
    if (error) setMsg('Erro: ' + error.message)
    else { setMsg('Usuário salvo!'); setForm(FORM_VAZIO); setEditando(null); setMostrarForm(false); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  function editar(u) {
    setForm({
      nome:u.nome, nis:u.nis||'', cpf:u.cpf||'', data_nascimento:u.data_nascimento||'',
      projeto_id:u.projeto_id||'', data_ingresso:u.data_ingresso||'',
      data_saida:u.data_saida||'', motivo_saida:u.motivo_saida||'',
      situacao:u.situacao, observacoes:u.observacoes||'',
    })
    setEditando(u.id)
    setMostrarForm(true)
    setAbaAtiva('lista')
  }

  // Calcular idade
  function calcIdade(dataNasc) {
    if (!dataNasc) return null
    const hoje = new Date()
    const nasc = new Date(dataNasc+'T12:00:00')
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  // Métricas
  const ativos = usuarios.filter(u => u.situacao === 'ativo').length
  const porProjeto = {}
  usuarios.forEach(u => {
    const nome = u.projeto?.nome || 'Sem projeto'
    if (!porProjeto[nome]) porProjeto[nome] = { ativo:0, total:0 }
    porProjeto[nome].total++
    if (u.situacao === 'ativo') porProjeto[nome].ativo++
  })

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    tab: ativo => ({ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?VERDE:'#D3D1C7'}`, background:ativo?VERDE:'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
  }

  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)

  async function excluir(id) {
    await supabase.from('usuarios_atendidos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }


  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Usuários / Público Atendido</div>
          <div style={{ fontSize:12, color:'#888780' }}>{ativos} ativos · {usuarios.length} total</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO) }}
          style={s.btn(mostrarForm?'#F1EFE8':VERDE, mostrarForm?'#5F5E5A':'#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Cadastrar usuário'}
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
            {editando ? 'Editar usuário' : 'Cadastrar usuário / público atendido'}
          </div>
          <form onSubmit={salvar}>
            <div style={s.grupo('2fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Nome completo *</label>
                <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} style={s.input} required />
              </div>
              <div>
                <label style={s.label}>CPF</label>
                <input value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00" style={s.input} />
              </div>
              <div>
                <label style={s.label}>NIS</label>
                <input value={form.nis} onChange={e=>setForm(f=>({...f,nis:e.target.value}))} placeholder="NIS/PIS" style={s.input} />
              </div>
            </div>
            <div style={s.grupo('1fr 2fr')}>
              <div>
                <label style={s.label}>Data de nascimento</label>
                <input type="date" value={form.data_nascimento} onChange={e=>setForm(f=>({...f,data_nascimento:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Projeto / Serviço / Ação vinculada</label>
                <select value={form.projeto_id} onChange={e=>setForm(f=>({...f,projeto_id:e.target.value}))} style={s.input}>
                  <option value="">Selecione o projeto...</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Data de ingresso</label>
                <input type="date" value={form.data_ingresso} onChange={e=>setForm(f=>({...f,data_ingresso:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Data de saída</label>
                <input type="date" value={form.data_saida} onChange={e=>setForm(f=>({...f,data_saida:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Situação atual</label>
                <select value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))} style={s.input}>
                  {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            {(form.situacao === 'desligado' || form.situacao === 'encerrado' || form.data_saida) && (
              <div style={{ marginBottom:10 }}>
                <label style={s.label}>Motivo da saída</label>
                <select value={form.motivo_saida} onChange={e=>setForm(f=>({...f,motivo_saida:e.target.value}))} style={s.input}>
                  <option value="">Selecione...</option>
                  {MOTIVOS_SAIDA.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} placeholder="Observações sobre o usuário ou atendimento..." />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':VERDE)}>
                {salvando ? 'Salvando...' : editando ? '<i className="ti ti-device-floppy" style={{marginRight:4}} /> Salvar alterações' : '+ Cadastrar'}
              </button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditando(null); setForm(FORM_VAZIO) }} style={s.btn('#F1EFE8','#5F5E5A')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setAbaAtiva('lista')} style={s.tab(abaAtiva==='lista')}>Lista</button>
        <button onClick={() => setAbaAtiva('relatorio')} style={s.tab(abaAtiva==='relatorio')}>Relatório / Quantitativo</button>
      </div>

      {/* ABA LISTA */}
      {abaAtiva === 'lista' && (
        <>
          {/* Filtros */}
          <div style={{ ...s.card, marginBottom:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:8, marginBottom:8 }}>
              <div>
                <label style={s.label}>Situação</label>
                <select value={filtros.situacao} onChange={e=>setFiltros(f=>({...f,situacao:e.target.value}))} style={s.input}>
                  <option value="">Todas</option>
                  {SITUACOES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Projeto</label>
                <select value={filtros.projeto_id} onChange={e=>setFiltros(f=>({...f,projeto_id:e.target.value}))} style={s.input}>
                  <option value="">Todos</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Ingresso de</label>
                <input type="date" value={filtros.dataInicio} onChange={e=>setFiltros(f=>({...f,dataInicio:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Ingresso até</label>
                <input type="date" value={filtros.dataFim} onChange={e=>setFiltros(f=>({...f,dataFim:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={carregar} style={s.btn(AZUL)}>Filtrar</button>
              <button onClick={() => { setFiltros({ situacao:'', projeto_id:'', dataInicio:'', dataFim:'' }); setTimeout(carregar,100) }} style={s.btn('#F1EFE8','#5F5E5A')}>Limpar</button>
            </div>
          </div>

          {/* Métricas rápidas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Ativos', val:ativos, cor:VERDE },
              { label:'Desligados', val:usuarios.filter(u=>u.situacao==='desligado'||u.situacao==='encerrado').length, cor:VERMELHO },
              { label:'Afastados', val:usuarios.filter(u=>u.situacao==='afastado').length, cor:LARANJA },
              { label:'Total', val:usuarios.length, cor:AZUL },
            ].map(m => (
              <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:18, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Tabela */}
          <div style={s.card}>
            {loading ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#888780' }}>Carregando...</div>
            ) : usuarios.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
                Nenhum usuário cadastrado. Clique em "+ Cadastrar usuário" para começar.
              </div>
            ) : (
              <div style={{ maxHeight:520, overflowY:'auto',overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead style={{ position:'sticky', top:0 }}>
                    <tr>{['Nome','Projeto','Idade','Ingresso','Saída','Situação',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u,i) => {
                      const [bg,cor] = SITUACAO_COR[u.situacao]||['#F1EFE8','#888780']
                      const idade = calcIdade(u.data_nascimento)
                      return (
                        <tr key={u.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                          <td style={{ ...s.td, fontWeight:500 }}>{u.nome}</td>
                          <td style={{ ...s.td, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.projeto?.nome||'—'}</td>
                          <td style={s.td}>{idade !== null ? `${idade} anos` : '—'}</td>
                          <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(u.data_ingresso)}</td>
                          <td style={{ ...s.td, whiteSpace:'nowrap', color:u.data_saida?VERMELHO:'#888780' }}>{fmtData(u.data_saida)}</td>
                          <td style={s.td}><span style={s.badge(bg,cor)}>{u.situacao}</span></td>
                          <td style={s.td}>
                            <button onClick={() => editar(u)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ABA RELATÓRIO */}
      {abaAtiva === 'relatorio' && (
        <div>
          {/* Por projeto */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Usuários por projeto</div>
            {Object.entries(porProjeto).sort((a,b) => b[1].total-a[1].total).map(([nome, dados]) => (
              <div key={nome} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                  <span style={{ fontWeight:500 }}>{nome}</span>
                  <span style={{ color:'#888780' }}>
                    <span style={{ color:VERDE, fontWeight:500 }}>{dados.ativo} ativos</span> · {dados.total} total
                  </span>
                </div>
                <div style={{ height:6, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:(dados.ativo/Math.max(...Object.values(porProjeto).map(d=>d.total))*100)+'%', background:VERDE, borderRadius:99 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Por situação */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Usuários por situação</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:8 }}>
              {SITUACOES.map(sit => {
                const count = usuarios.filter(u => u.situacao === sit).length
                const [bg,cor] = SITUACAO_COR[sit]||['#F1EFE8','#888780']
                return (
                  <div key={sit} style={{ background:bg, borderRadius:10, padding:'.85rem 1rem' }}>
                    <div style={{ fontSize:10, color:cor, marginBottom:3 }}>{sit.charAt(0).toUpperCase()+sit.slice(1)}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:cor }}>{count}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Por motivo de saída */}
          {usuarios.filter(u => u.motivo_saida).length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Motivos de saída</div>
              {MOTIVOS_SAIDA.map(motivo => {
                const count = usuarios.filter(u => u.motivo_saida === motivo).length
                if (count === 0) return null
                return (
                  <div key={motivo} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                    <span>{motivo}</span>
                    <span style={{ fontWeight:500, color:VERMELHO }}>{count}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Faixa etária */}
          {(() => {
            const comIdade = usuarios.filter(u => u.data_nascimento)
            if (comIdade.length === 0) return null
            const faixas = { '0-5': 0, '6-11': 0, '12-17': 0, '18-29': 0, '30-59': 0, '60+': 0 }
            comIdade.forEach(u => {
              const idade = calcIdade(u.data_nascimento)
              if (idade <= 5) faixas['0-5']++
              else if (idade <= 11) faixas['6-11']++
              else if (idade <= 17) faixas['12-17']++
              else if (idade <= 29) faixas['18-29']++
              else if (idade <= 59) faixas['30-59']++
              else faixas['60+']++
            })
            return (
              <div style={s.card}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Faixa etária</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px,1fr))', gap:8 }}>
                  {Object.entries(faixas).map(([faixa, count]) => (
                    <div key={faixa} style={{ background:'#F8F7F2', borderRadius:10, padding:'.75rem', textAlign:'center' }}>
                      <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{faixa} anos</div>
                      <div style={{ fontSize:18, fontWeight:700, color:AZUL }}>{count}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:11, color:'#888780', marginTop:8 }}>*Apenas usuários com data de nascimento cadastrada ({comIdade.length} de {usuarios.length})</div>
              </div>
            )
          })()}
        </div>
      )}
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
