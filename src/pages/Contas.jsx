import React, { useState, useEffect } from 'react'
import { contas as dbContas } from '../lib/db'
import { supabase } from '../lib/supabase'

const TIPOS_CONTA = [
  { value: 'principal', label: 'Conta Principal' },
  { value: 'emenda', label: 'Emenda Parlamentar' },
  { value: 'edital', label: 'Edital' },
  { value: 'fomento', label: 'Termo de Fomento' },
  { value: 'colaboracao', label: 'Termo de Colaboração' },
  { value: 'convenio', label: 'Convênio' },
  { value: 'projeto', label: 'Projeto Específico' },
  { value: 'campanha', label: 'Campanha Específica' },
  { value: 'evento', label: 'Evento Específico' },
  { value: 'aplicacao', label: 'Conta de Aplicação/Rendimentos' },
  { value: 'outra', label: 'Outra Conta Vinculada' },
]

const STATUS_CONTA = ['ativa','inativa','encerrada','em execução','aguardando prestação de contas','prestação enviada','finalizada']
const AREAS = ['Educação','Assistência Social','Saúde','Mista','Cultura','Esporte','Segurança Alimentar','Outra']

const FORM_INICIAL = {
  nome: '', banco: '', agencia: '', conta_num: '', preponderancia: 'rateio', cor: '#6BBF2B',
  tipo_conta: 'principal', status_conta: 'ativa',
  num_termo: '', parlamentar: '', origem_recurso: '', orgao_concedente: '', num_processo: '',
  objeto: '', valor_aprovado: '', valor_recebido: '', data_recebimento: '',
  vigencia_inicio: '', vigencia_fim: '', prazo_prestacao: '',
  responsavel_financeiro: '', responsavel_tecnico: '', representante_legal: '', gestor_interno: '',
  area_preponderancia: '', obs_conta: '',
}

export default function Contas() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState(FORM_INICIAL)
  const [msg, setMsg] = useState('')
  const [expandida, setExpandida] = useState(null)
  const [editando, setEditando] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('contas').select('*').order('nome')
    setLista(data || [])
  }

  function set(campo, valor) { setForm(f => ({ ...f, [campo]: valor })) }

  async function salvar(e) {
    e.preventDefault()
    const dados = { ...form }
    if (dados.valor_aprovado) dados.valor_aprovado = parseFloat(dados.valor_aprovado)
    if (dados.valor_recebido) dados.valor_recebido = parseFloat(dados.valor_recebido)
    if (!dados.data_recebimento) delete dados.data_recebimento
    if (!dados.vigencia_inicio) delete dados.vigencia_inicio
    if (!dados.vigencia_fim) delete dados.vigencia_fim
    if (!dados.prazo_prestacao) delete dados.prazo_prestacao

    const { error } = editando
      ? await supabase.from('contas').update(dados).eq('id', editando)
      : await dbContas.criar(dados)

    if (error) { setMsg('Erro: ' + error.message); return }
    setMsg(editando ? 'Conta atualizada!' : 'Conta criada!')
    setForm(FORM_INICIAL); setEditando(null)
    carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  function iniciarEdicao(c) {
    setEditando(c.id)
    setForm({ ...FORM_INICIAL, ...c, valor_aprovado: c.valor_aprovado||'', valor_recebido: c.valor_recebido||'' })
    window.scrollTo(0, document.body.scrollHeight)
  }

  const tipoLabel = v => TIPOS_CONTA.find(t => t.value === v)?.label || v
  const precisaCamposExtras = ['emenda','edital','fomento','colaboracao','convenio','projeto'].includes(form.tipo_conta)
  const precisaPrepRateio = form.tipo_conta === 'principal'

  const s = {
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    input: { width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    secao: { fontSize: 11, fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '.08em', margin: '12px 0 6px', paddingBottom: 4, borderBottom: '0.5px solid #E0DDD5' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 },
    grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 },
  }

  // Badge de tipo
  const tipoCor = { principal: ['#EAF3DE','#3B6D11'], emenda: ['#E6F1FB','#185FA5'], edital: ['#EEEDFE','#534AB7'], fomento: ['#F1EFE8','#5F5E5A'], colaboracao: ['#FAEEDA','#854F0B'], convenio: ['#FCEBEB','#A32D2D'], projeto: ['#F8F7F2','#5F5E5A'] }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Contas bancárias</div>

      {/* Lista de contas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        {lista.map(c => {
          const [bg, cor] = tipoCor[c.tipo_conta] || ['#F1EFE8','#5F5E5A']
          const aberta = expandida === c.id
          return (
            <div key={c.id} style={s.card}>
              <div style={{ height: 4, background: c.cor || '#6BBF2B', borderRadius: '8px 8px 0 0', margin: '-1rem -1.25rem 10px', borderTop: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#888780' }}>{c.banco} · AG {c.agencia} · CC {c.conta_num}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: bg, color: cor, fontWeight: 500 }}>
                      {tipoLabel(c.tipo_conta)}
                    </span>
                    {c.status_conta && (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#F8F7F2', color: '#5F5E5A' }}>
                        {c.status_conta}
                      </span>
                    )}
                  </div>
                  {c.objeto && <div style={{ fontSize: 11, color: '#5F5E5A', marginTop: 4 }}>{c.objeto.slice(0,80)}{c.objeto.length>80?'...':''}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setExpandida(aberta ? null : c.id)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>
                    {aberta ? '▲' : '▼'}
                  </button>
                  <button onClick={() => iniciarEdicao(c)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '0.5px solid #4A8FD4', background: 'transparent', color: '#4A8FD4', cursor: 'pointer' }}>
                    Editar
                  </button>
                </div>
              </div>

              {aberta && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #E0DDD5', fontSize: 11 }}>
                  {c.parlamentar && <div style={{ marginBottom: 3 }}><strong>Parlamentar:</strong> {c.parlamentar}</div>}
                  {c.orgao_concedente && <div style={{ marginBottom: 3 }}><strong>Órgão:</strong> {c.orgao_concedente}</div>}
                  {c.num_termo && <div style={{ marginBottom: 3 }}><strong>Termo/Processo:</strong> {c.num_termo} {c.num_processo ? '· '+c.num_processo : ''}</div>}
                  {c.valor_aprovado && <div style={{ marginBottom: 3 }}><strong>Valor aprovado:</strong> R$ {Number(c.valor_aprovado).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>}
                  {c.valor_recebido && <div style={{ marginBottom: 3 }}><strong>Valor recebido:</strong> R$ {Number(c.valor_recebido).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>}
                  {c.vigencia_inicio && <div style={{ marginBottom: 3 }}><strong>Vigência:</strong> {new Date(c.vigencia_inicio+'T12:00:00').toLocaleDateString('pt-BR')} {c.vigencia_fim?' a '+new Date(c.vigencia_fim+'T12:00:00').toLocaleDateString('pt-BR'):''}</div>}
                  {c.responsavel_financeiro && <div style={{ marginBottom: 3 }}><strong>Resp. financeiro:</strong> {c.responsavel_financeiro}</div>}
                  {c.representante_legal && <div style={{ marginBottom: 3 }}><strong>Representante legal:</strong> {c.representante_legal}</div>}
                  {c.area_preponderancia && <div style={{ marginBottom: 3 }}><strong>Área:</strong> {c.area_preponderancia}</div>}
                  {c.obs_conta && <div style={{ marginBottom: 3 }}><strong>Obs:</strong> {c.obs_conta}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Formulário */}
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>
          {editando ? '✏️ Editando conta' : 'Adicionar nova conta'}
        </div>

        <form onSubmit={salvar}>
          {/* Campos básicos */}
          <div style={s.secao}>Dados bancários</div>
          <div style={s.grid4}>
            <div><label style={s.label}>Nome da conta</label><input value={form.nome} onChange={e=>set('nome',e.target.value)} placeholder="Ex: Emenda Parlamentar I" required style={s.input} /></div>
            <div><label style={s.label}>Banco</label><input value={form.banco} onChange={e=>set('banco',e.target.value)} placeholder="Ex: Sicredi" required style={s.input} /></div>
            <div><label style={s.label}>Agência</label><input value={form.agencia} onChange={e=>set('agencia',e.target.value)} placeholder="0000" style={s.input} /></div>
            <div><label style={s.label}>Conta / dígito</label><input value={form.conta_num} onChange={e=>set('conta_num',e.target.value)} placeholder="00000-0" style={s.input} /></div>
          </div>

          <div style={s.grid3}>
            <div>
              <label style={s.label}>Tipo / Finalidade</label>
              <select value={form.tipo_conta} onChange={e=>set('tipo_conta',e.target.value)} style={s.input}>
                {TIPOS_CONTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Status da conta</label>
              <select value={form.status_conta} onChange={e=>set('status_conta',e.target.value)} style={s.input}>
                {STATUS_CONTA.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            {precisaPrepRateio && (
              <div>
                <label style={s.label}>Preponderância</label>
                <select value={form.preponderancia} onChange={e=>set('preponderancia',e.target.value)} style={s.input}>
                  <option value="rateio">Rateia por lançamento</option>
                  <option value="Educação">Educação (fixa)</option>
                  <option value="Assistência Social">Assist. Social (fixa)</option>
                  <option value="Saúde">Saúde (fixa)</option>
                </select>
              </div>
            )}
            {!precisaPrepRateio && (
              <div>
                <label style={s.label}>Área / Preponderância</label>
                <select value={form.area_preponderancia} onChange={e=>set('area_preponderancia',e.target.value)} style={s.input}>
                  <option value="">Selecione...</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Campos extras para emenda/edital/convênio */}
          {precisaCamposExtras && (
            <>
              <div style={s.secao}>Dados da parceria / emenda / edital</div>
              <div style={s.grid3}>
                <div><label style={s.label}>Órgão concedente</label><input value={form.orgao_concedente} onChange={e=>set('orgao_concedente',e.target.value)} placeholder="Ex: Prefeitura de Teresópolis" style={s.input} /></div>
                <div><label style={s.label}>Parlamentar / Origem</label><input value={form.parlamentar} onChange={e=>set('parlamentar',e.target.value)} placeholder="Ex: Vereador João Silva" style={s.input} /></div>
                <div><label style={s.label}>Nº do Termo / Instrumento</label><input value={form.num_termo} onChange={e=>set('num_termo',e.target.value)} placeholder="Ex: 001/2026" style={s.input} /></div>
              </div>
              <div style={s.grid3}>
                <div><label style={s.label}>Nº do Processo</label><input value={form.num_processo} onChange={e=>set('num_processo',e.target.value)} placeholder="Ex: 2026/001234" style={s.input} /></div>
                <div><label style={s.label}>Valor aprovado (R$)</label><input type="number" step="0.01" value={form.valor_aprovado} onChange={e=>set('valor_aprovado',e.target.value)} placeholder="0,00" style={s.input} /></div>
                <div><label style={s.label}>Valor recebido (R$)</label><input type="number" step="0.01" value={form.valor_recebido} onChange={e=>set('valor_recebido',e.target.value)} placeholder="0,00" style={s.input} /></div>
              </div>
              <div style={s.grid4}>
                <div><label style={s.label}>Vigência início</label><input type="date" value={form.vigencia_inicio} onChange={e=>set('vigencia_inicio',e.target.value)} style={s.input} /></div>
                <div><label style={s.label}>Vigência fim</label><input type="date" value={form.vigencia_fim} onChange={e=>set('vigencia_fim',e.target.value)} style={s.input} /></div>
                <div><label style={s.label}>Data recebimento</label><input type="date" value={form.data_recebimento} onChange={e=>set('data_recebimento',e.target.value)} style={s.input} /></div>
                <div><label style={s.label}>Prazo prestação de contas</label><input type="date" value={form.prazo_prestacao} onChange={e=>set('prazo_prestacao',e.target.value)} style={s.input} /></div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>Objeto / Descrição da parceria</label>
                <textarea value={form.objeto} onChange={e=>set('objeto',e.target.value)} placeholder="Descreva o objeto da emenda/edital/convênio" rows={2} style={{ ...s.input, resize: 'vertical' }} />
              </div>

              <div style={s.secao}>Responsáveis</div>
              <div style={s.grid4}>
                <div><label style={s.label}>Responsável financeiro</label><input value={form.responsavel_financeiro} onChange={e=>set('responsavel_financeiro',e.target.value)} placeholder="Nome" style={s.input} /></div>
                <div><label style={s.label}>Responsável técnico</label><input value={form.responsavel_tecnico} onChange={e=>set('responsavel_tecnico',e.target.value)} placeholder="Nome" style={s.input} /></div>
                <div><label style={s.label}>Representante legal</label><input value={form.representante_legal} onChange={e=>set('representante_legal',e.target.value)} placeholder="Nome" style={s.input} /></div>
                <div><label style={s.label}>Gestor interno</label><input value={form.gestor_interno} onChange={e=>set('gestor_interno',e.target.value)} placeholder="Nome" style={s.input} /></div>
              </div>
            </>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>Observações</label>
            <textarea value={form.obs_conta} onChange={e=>set('obs_conta',e.target.value)} placeholder="Observações gerais" rows={2} style={{ ...s.input, resize: 'vertical' }} />
          </div>

          {msg && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: msg.includes('Erro') ? '#FEF2F2' : '#F2FAE8', color: msg.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>{msg}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#6BBF2B', color: '#fff', cursor: 'pointer' }}>
              {editando ? 'Salvar alterações' : 'Adicionar conta'}
            </button>
            {editando && (
              <button type="button" onClick={() => { setEditando(null); setForm(FORM_INICIAL) }}
                style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
