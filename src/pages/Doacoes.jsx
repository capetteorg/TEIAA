import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'
import { useIsMobile } from '../hooks/useIsMobile'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

const TIPOS_DOADOR = ['Pessoa física', 'Pessoa jurídica', 'Famílias / responsáveis', 'Parceiro institucional', 'Anônimo', 'Outro']

const CATEGORIAS = [
  'Alimentação', 'Material de limpeza', 'Material de higiene', 'Material pedagógico',
  'Material de expediente', 'Brinquedos', 'Roupas / calçados', 'Móveis',
  'Equipamentos', 'Eletrodomésticos', 'Itens para evento', 'Serviço doado',
  'Produto diverso', 'Outro',
]

const UNIDADES = ['Unidade', 'Kg', 'Litro', 'Pacote', 'Caixa', 'Cesta', 'Lote', 'Lata', 'Garrafa', 'Fardo', 'Serviço', 'Outro']

const DESTINOS = [
  'Uso geral da CAPETTE', 'Cozinha / alimentação', 'Primeira Infância',
  'Evento institucional', 'Campanha específica', 'Manutenção / Apoio geral',
  'Projeto específico', 'Outro',
]

const DOADORES_SUGERIDOS = [
  'SESC Mesa Brasil', 'Comida Invisível', 'Hortifruti Mesa Brasil', 'Mc Donalds',
  'Pais / responsáveis', 'Famílias dos usuários', 'Empresa parceira',
  'Pessoa física', 'Doador anônimo', 'Outro',
]

const FORM_VAZIO = {
  data_doacao: new Date().toISOString().slice(0,10),
  doador: '', tipo_doador: 'Parceiro institucional', num_nota: '',
  categoria: 'Alimentação', valor_estimado: '', projeto_id: '',
  campanha_evento: '', destino: 'Uso geral da CAPETTE', observacoes: '',
}

const ITEM_VAZIO = { item: '', quantidade: '', unidade: 'Unidade', valor_estimado: '', observacao: '' }

export default function Doacoes() {
  const isMobile = useIsMobile()
  const [doacoes, setDoacoes] = useState([])
  const [projetos, setProjetos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }])
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [filtros, setFiltros] = useState({ dataInicio:'', dataFim:'', categoria:'', projeto_id:'', doador:'' })
  const [abaAtiva, setAbaAtiva] = useState('lista')
  const [detalhe, setDetalhe] = useState(null)
  const [itensDetalhe, setItensDetalhe] = useState([])

  useEffect(() => {
    supabase.from('projetos').select('id,nome').order('nome').then(({ data }) => setProjetos(data || []))
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    const montar = () => {
      let q = supabase.from('doacoes')
        .select('*, projeto:projetos(nome)')
        .order('data_doacao', { ascending: false })
      if (filtros.dataInicio) q = q.gte('data_doacao', filtros.dataInicio)
      if (filtros.dataFim) q = q.lte('data_doacao', filtros.dataFim)
      if (filtros.categoria) q = q.eq('categoria', filtros.categoria)
      if (filtros.projeto_id) q = q.eq('projeto_id', parseInt(filtros.projeto_id))
      if (filtros.doador) q = q.ilike('doador', `%${filtros.doador}%`)
      return q
    }
    const { data } = await fetchAll(montar)
    setDoacoes(data || [])
    setLoading(false)
  }

  async function abrirDetalhe(d) {
    setDetalhe(d)
    const { data } = await supabase.from('doacoes_itens').select('*').eq('doacao_id', d.id).order('id')
    setItensDetalhe(data || [])
    setAbaAtiva('detalhe')
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      ...form,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : null,
      valor_estimado: form.valor_estimado ? (parseFloat(form.valor_estimado) || 0) : null,
    }

    let error, data
    if (editando) {
      ;({ error } = await supabase.from('doacoes').update(dados).eq('id', editando))
      if (!error) {
        await supabase.from('doacoes_itens').delete().eq('doacao_id', editando)
        const itensValidos = itens.filter(i => i.item.trim())
        if (itensValidos.length > 0) {
          await supabase.from('doacoes_itens').insert(itensValidos.map(i => ({
            doacao_id: editando,
            item: i.item,
            quantidade: i.quantidade ? parseFloat(i.quantidade) : null,
            unidade: i.unidade,
            valor_estimado: i.valor_estimado ? parseFloat(i.valor_estimado) : null,
            observacao: i.observacao || null,
          })))
        }
      }
    } else {
      ;({ data, error } = await supabase.from('doacoes').insert(dados).select().single())
      if (!error && data) {
        const itensValidos = itens.filter(i => i.item.trim())
        if (itensValidos.length > 0) {
          await supabase.from('doacoes_itens').insert(itensValidos.map(i => ({
            doacao_id: data.id,
            item: i.item,
            quantidade: i.quantidade ? parseFloat(i.quantidade) : null,
            unidade: i.unidade,
            valor_estimado: i.valor_estimado ? parseFloat(i.valor_estimado) : null,
            observacao: i.observacao || null,
          })))
        }
      }
    }

    if (error) setMsg('Erro: ' + error.message)
    else { setMsg('Doação registrada!'); setForm(FORM_VAZIO); setItens([{ ...ITEM_VAZIO }]); setEditando(null); setMostrarForm(false); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  function editar(d) {
    setForm({
      data_doacao: d.data_doacao, doador: d.doador, tipo_doador: d.tipo_doador||'Parceiro institucional',
      num_nota: d.num_nota||'', categoria: d.categoria||'Alimentação',
      valor_estimado: d.valor_estimado||'', projeto_id: d.projeto_id||'',
      campanha_evento: d.campanha_evento||'', destino: d.destino||'Uso geral da CAPETTE',
      observacoes: d.observacoes||'',
    })
    supabase.from('doacoes_itens').select('*').eq('doacao_id', d.id).order('id').then(({ data }) => {
      setItens(data?.length ? data : [{ ...ITEM_VAZIO }])
    })
    setEditando(d.id)
    setMostrarForm(true)
    setAbaAtiva('lista')
  }

  function addItem() { setItens(prev => [...prev, { ...ITEM_VAZIO }]) }
  function removeItem(i) { setItens(prev => prev.filter((_,idx) => idx !== i)) }
  function updateItem(i, campo, val) { setItens(prev => prev.map((item, idx) => idx === i ? { ...item, [campo]: val } : item)) }

  const fmt = v => v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const totalEstimado = doacoes.reduce((a,d) => a + Number(d.valor_estimado||0), 0)

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    grupo: cols => ({ display:'grid', gridTemplateColumns:cols, gap:10, marginBottom:10 }),
    tab: ativo => ({ padding:'7px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${ativo?'#0E7EA8':'#D3D1C7'}`, background:ativo?'#0E7EA8':'#fff', color:ativo?'#fff':'#5F5E5A', cursor:'pointer' }),
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8', whiteSpace:'nowrap' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
  }

  async function excluir(id) {
        await supabase.from('doacoes_itens').delete().eq('id', id)
    await supabase.from('doacoes').delete().eq('id', id)
    setConfirmandoExcluir(null)
    carregar()
  }


  return (
    <div style={{ padding:'1.25rem 1.5rem', maxWidth:1020, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:19, fontWeight:600, letterSpacing:'-0.02em' }}>Doações recebidas</div>
          <div style={{ fontSize:12, color:'#888780' }}>Doações não financeiras · {doacoes.length} registros</div>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO); setItens([{...ITEM_VAZIO}]) }}
          style={s.btn(mostrarForm?'#F1EFE8':VERDE, mostrarForm?'#5F5E5A':'#fff')}>
          {mostrarForm ? 'Cancelar' : '+ Registrar doação'}
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
            {editando ? 'Editar doação' : 'Registrar nova doação'}
          </div>
          <form onSubmit={salvar}>
            <div style={s.grupo('1fr 2fr 1fr')}>
              <div>
                <label style={s.label}>Data da doação *</label>
                <input type="date" value={form.data_doacao} onChange={e=>setForm(f=>({...f,data_doacao:e.target.value}))} style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Doador / Origem *</label>
                <input list="doadores-list" value={form.doador} onChange={e=>setForm(f=>({...f,doador:e.target.value}))} style={s.input} required placeholder="Nome do doador ou origem" />
                <datalist id="doadores-list">
                  {DOADORES_SUGERIDOS.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div>
                <label style={s.label}>Tipo de doador</label>
                <select value={form.tipo_doador} onChange={e=>setForm(f=>({...f,tipo_doador:e.target.value}))} style={s.input}>
                  {TIPOS_DOADOR.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Categoria geral</label>
                <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} style={s.input}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Nº da nota de doação</label>
                <input value={form.num_nota} onChange={e=>setForm(f=>({...f,num_nota:e.target.value}))} style={s.input} placeholder="Opcional" />
              </div>
              <div>
                <label style={s.label}>Valor estimado total (R$)</label>
                <input type="number" step="0.01" value={form.valor_estimado} onChange={e=>setForm(f=>({...f,valor_estimado:e.target.value}))} style={s.input} placeholder="Opcional" />
              </div>
            </div>
            <div style={s.grupo('1fr 1fr 1fr')}>
              <div>
                <label style={s.label}>Projeto vinculado</label>
                <select value={form.projeto_id} onChange={e=>setForm(f=>({...f,projeto_id:e.target.value}))} style={s.input}>
                  <option value="">Nenhum</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Campanha / evento vinculado</label>
                <input value={form.campanha_evento} onChange={e=>setForm(f=>({...f,campanha_evento:e.target.value}))} style={s.input} placeholder="Ex: Festa Junina, Bazar..." />
              </div>
              <div>
                <label style={s.label}>Destino da doação</label>
                <select value={form.destino} onChange={e=>setForm(f=>({...f,destino:e.target.value}))} style={s.input}>
                  {DESTINOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} placeholder="Informações complementares..." />
            </div>

            {/* Itens da doação */}
            <div style={{ background:'#F8F7F2', borderRadius:10, padding:'12px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>Itens da doação</div>
                <button type="button" onClick={addItem} style={s.btn('#EAF3DE','#3B6D11')}>+ Adicionar item</button>
              </div>
              {itens.map((item, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:8, marginBottom:8, alignItems:'flex-end' }}>
                  <div>
                    {i === 0 && <label style={s.label}>Item doado *</label>}
                    <input value={item.item} onChange={e=>updateItem(i,'item',e.target.value)} style={s.input} placeholder="Nome do item" />
                  </div>
                  <div>
                    {i === 0 && <label style={s.label}>Quantidade</label>}
                    <input type="number" step="0.01" value={item.quantidade} onChange={e=>updateItem(i,'quantidade',e.target.value)} style={s.input} placeholder="Qtd" />
                  </div>
                  <div>
                    {i === 0 && <label style={s.label}>Unidade</label>}
                    <select value={item.unidade} onChange={e=>updateItem(i,'unidade',e.target.value)} style={s.input}>
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label style={s.label}>Valor est. (R$)</label>}
                    <input type="number" step="0.01" value={item.valor_estimado} onChange={e=>updateItem(i,'valor_estimado',e.target.value)} style={s.input} placeholder="Opcional" />
                  </div>
                  <div style={{ paddingBottom:2 }}>
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} style={{ ...{ ...s.btn('#FEF2F2', VERMELHO), background:'transparent', border:'none', color:'#C0392B' }, padding:'7px 10px' }}><i className="ti ti-x" style={{fontSize:14}} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':'#0E7EA8')}>
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : '+ Registrar doação'}
              </button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditando(null) }} style={s.btn('#F1EFE8','#5F5E5A')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={() => setAbaAtiva('lista')} style={s.tab(abaAtiva==='lista')}>Lista</button>
        <button onClick={() => setAbaAtiva('relatorio')} style={s.tab(abaAtiva==='relatorio')}>Relatório</button>
        {abaAtiva === 'detalhe' && detalhe && <button style={s.tab(true)}>{detalhe.doador}</button>}
      </div>

      {/* ABA LISTA */}
      {abaAtiva === 'lista' && (
        <>
          {/* Métricas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px,1fr))', gap:8, marginBottom:'1.25rem' }}>
            {[
              { label:'Total de doações', val:doacoes.length, cor:AZUL },
              { label:'Valor estimado total', val:fmt(totalEstimado), cor:VERDE },
              { label:'Alimentação', val:doacoes.filter(d=>d.categoria==='Alimentação').length, cor:LARANJA },
              { label:'Doadores únicos', val:new Set(doacoes.map(d=>d.doador)).size, cor:'#8B2FC9' },
            ].map(m => (
              <div key={m.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.75rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:10, color:'#888780', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:15, fontWeight:600, color:m.cor }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ ...s.card, marginBottom:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:8, marginBottom:8 }}>
              <div>
                <label style={s.label}>Data início</label>
                <input type="date" value={filtros.dataInicio} onChange={e=>setFiltros(f=>({...f,dataInicio:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Data fim</label>
                <input type="date" value={filtros.dataFim} onChange={e=>setFiltros(f=>({...f,dataFim:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Categoria</label>
                <select value={filtros.categoria} onChange={e=>setFiltros(f=>({...f,categoria:e.target.value}))} style={s.input}>
                  <option value="">Todas</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
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
                <label style={s.label}>Doador</label>
                <input value={filtros.doador} onChange={e=>setFiltros(f=>({...f,doador:e.target.value}))} style={s.input} placeholder="Buscar doador..." />
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={carregar} style={s.btn(AZUL)}>Filtrar</button>
              <button onClick={() => { setFiltros({ dataInicio:'', dataFim:'', categoria:'', projeto_id:'', doador:'' }); setTimeout(carregar,100) }} style={s.btn('#F1EFE8','#5F5E5A')}>Limpar</button>
            </div>
          </div>

          {/* Tabela */}
          <div style={s.card}>
            {loading ? (
              <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div>
            ) : doacoes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
                Nenhuma doação registrada. Clique em "+ Registrar doação" para começar.
              </div>
            ) : (
              <div style={{ maxHeight:520, overflowY:'auto',overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead style={{ position:'sticky', top:0 }}>
                    <tr>{['Data','Doador','Categoria','Projeto','Destino','Valor est.',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {doacoes.map((d,i) => (
                      <tr key={d.id} style={{ background:i%2===0?'#fff':'#FAFAF8', cursor:'pointer' }} onClick={() => abrirDetalhe(d)}>
                        <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(d.data_doacao)}</td>
                        <td style={{ ...s.td, fontWeight:500 }}>{d.doador}</td>
                        <td style={s.td}><span style={s.badge('#EAF3DE','#3B6D11')}>{d.categoria}</span></td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{d.projeto?.nome||'—'}</td>
                        <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{d.destino||'—'}</td>
                        <td style={{ ...s.td, color:VERDE, fontWeight:500 }}>{d.valor_estimado ? fmt(d.valor_estimado) : '—'}</td>
                        <td style={s.td}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={e=>{e.stopPropagation();abrirDetalhe(d)}} style={s.btn(AZUL)}>Ver</button>
                            <button onClick={e=>{e.stopPropagation();editar(d)}} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ABA DETALHE */}
      {abaAtiva === 'detalhe' && detalhe && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:'1rem' }}>
            <button onClick={() => setAbaAtiva('lista')} style={s.btn('#F1EFE8','#5F5E5A')}>← Voltar</button>
            <button onClick={() => editar(detalhe)} style={s.btn(AZUL)}>Editar</button>
          </div>
          <div style={{ ...s.card, background:'linear-gradient(135deg, #EAF3DE, #F8F7F2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:'#2C2C2A' }}>{detalhe.doador}</div>
                <div style={{ fontSize:12, color:'#5F5E5A' }}>{detalhe.tipo_doador} · {fmtData(detalhe.data_doacao)}</div>
              </div>
              <span style={s.badge('#EAF3DE','#3B6D11')}>{detalhe.categoria}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:8 }}>
              {[
                ['Nº nota', detalhe.num_nota||'—'],
                ['Destino', detalhe.destino||'—'],
                ['Projeto', detalhe.projeto?.nome||'—'],
                ['Campanha/evento', detalhe.campanha_evento||'—'],
                ['Valor estimado', detalhe.valor_estimado ? fmt(detalhe.valor_estimado) : '—'],
              ].map(([l,v]) => (
                <div key={l} style={{ background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'6px 10px' }}>
                  <div style={{ fontSize:10, color:'#888780', marginBottom:1 }}>{l}</div>
                  <div style={{ fontSize:11, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            {detalhe.observacoes && (
              <div style={{ marginTop:10, fontSize:11, color:'#888780', fontStyle:'italic' }}>{detalhe.observacoes}</div>
            )}
          </div>

          {/* Itens */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Itens da doação</div>
            {itensDetalhe.length === 0 ? (
              <div style={{ textAlign:'center', padding:'1rem', color:'#888780', fontSize:12 }}>Nenhum item cadastrado.</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['Item','Quantidade','Unidade','Valor est.','Obs.'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {itensDetalhe.map(item => (
                    <tr key={item.id}>
                      <td style={{ ...s.td, fontWeight:500 }}>{item.item}</td>
                      <td style={s.td}>{item.quantidade||'—'}</td>
                      <td style={s.td}>{item.unidade||'—'}</td>
                      <td style={{ ...s.td, color:VERDE }}>{item.valor_estimado ? fmt(item.valor_estimado) : '—'}</td>
                      <td style={{ ...s.td, color:'#888780', fontSize:11 }}>{item.observacao||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ABA RELATÓRIO */}
      {abaAtiva === 'relatorio' && (
        <div>
          {/* Por categoria */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Doações por categoria</div>
            {CATEGORIAS.map(cat => {
              const count = doacoes.filter(d => d.categoria === cat).length
              const total = doacoes.filter(d => d.categoria === cat).reduce((a,d) => a+Number(d.valor_estimado||0), 0)
              if (count === 0) return null
              return (
                <div key={cat} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{cat}</span>
                  <span style={{ color:'#888780' }}>{count} doação{count>1?'s':''} {total > 0 ? `· ${fmt(total)}` : ''}</span>
                </div>
              )
            })}
          </div>

          {/* Por doador */}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Doações por doador / origem</div>
            {[...new Set(doacoes.map(d => d.doador))].map(doador => {
              const lista = doacoes.filter(d => d.doador === doador)
              const total = lista.reduce((a,d) => a+Number(d.valor_estimado||0), 0)
              return (
                <div key={doador} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span style={{ fontWeight:500 }}>{doador}</span>
                  <span style={{ color:'#888780' }}>{lista.length} doação{lista.length>1?'s':''} {total > 0 ? `· ${fmt(total)}` : ''}</span>
                </div>
              )
            })}
          </div>

          {/* Por projeto */}
          {doacoes.some(d => d.projeto_id) && (
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Doações por projeto</div>
              {projetos.filter(p => doacoes.some(d => d.projeto_id === p.id)).map(proj => {
                const lista = doacoes.filter(d => d.projeto_id === proj.id)
                const total = lista.reduce((a,d) => a+Number(d.valor_estimado||0), 0)
                return (
                  <div key={proj.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                    <span>{proj.nome}</span>
                    <span style={{ color:'#888780' }}>{lista.length} doação{lista.length>1?'s':''} {total > 0 ? `· ${fmt(total)}` : ''}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {/* Modal confirmação exclusão */}
      {confirmandoExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', maxWidth:340, width:'90%', textAlign:'center' }}>
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
