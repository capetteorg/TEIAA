import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../hooks/useAuth'
import { gerarPDFAnexoTeacolher } from '../lib/pdf'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

const SITUACOES = ['ativo', 'desligado', 'encerrado', 'afastado', 'outro']
const MOTIVOS_SAIDA = [
  'Conclusão do atendimento', 'Desistência / evasão', 'Mudança de endereço',
  'Transferência para outro serviço', 'Encaminhamento para a rede',
  'Idade limite do projeto', 'Solicitação da família / responsável',
  'Encerramento do projeto', 'Outro',
]

const GENEROS = [
  'Mulher cis',
  'Mulher trans',
  'Homem cis',
  'Homem trans',
  'Pessoa não binária',
  'Prefiro não informar',
  'Outro',
]

const TIPOS_DEFICIENCIA = [
  'Deficiência Física',
  'Deficiência Auditiva',
  'Deficiência Visual',
  'Deficiência Intelectual',
  'Deficiência Mental/Psicossocial',
  'Deficiência Múltipla',
]

const TIPOS_SANGUINEOS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'Não informado',
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
  tipo_sanguineo:'', genero:'', genero_outro:'', rg:'', endereco:'', bairro:'', cidade:'Teresópolis',
  telefone:'', email:'', tipo_deficiencia:'', deficiencia_detalhes:'',
  contato_familiar_nome:'', contato_familiar_parentesco:'', contato_familiar_telefone:'',
  renda_familiar_bruta:'', pessoas_nucleo_familiar:'',
}

export default function UsuariosAtendidos() {
  const isMobile = useIsMobile()
  const { perfil } = useAuth()
  const perfilAtual = perfil?.perfil
  const podeGerenciarUsuarios = perfilAtual === 'admin' || perfilAtual === 'operacional'
  const podeExcluirUsuario = perfilAtual === 'admin'
  const podeImprimirAnexo = perfilAtual === 'admin' || perfilAtual === 'operacional'
  const [usuarios, setUsuarios] = useState([])
  const [limite, setLimite] = useState(300)
  const [temMais, setTemMais] = useState(false)
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

  const projetoSelecionado = projetos.find(p => String(p.id) === String(form.projeto_id))
  const formEhTeacolher = projetoSelecionado?.nome?.toLowerCase().includes('teacolher')

  function nomeProjetoPorId(id) {
    if (!id) return ''
    return projetos.find(p => String(p.id) === String(id))?.nome || ''
  }

  function usuarioEhTeacolher(usuario) {
    const nomeProjeto = usuario?.projeto?.nome || nomeProjetoPorId(usuario?.projeto_id)
    return nomeProjeto?.toLowerCase().includes('teacolher')
  }

  function parseMoedaBR(valor) {
    if (valor === null || valor === undefined || valor === '') return null
    const limpo = String(valor).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')
    const numero = Number(limpo)
    return Number.isFinite(numero) ? numero : null
  }

  async function carregar() {
    setLoading(true)
    const montar = () => {
      let q = supabase.from('usuarios_atendidos')
        .select('*')
        .order('nome')
      if (filtros.situacao) q = q.eq('situacao', filtros.situacao)
      if (filtros.projeto_id) q = q.eq('projeto_id', parseInt(filtros.projeto_id))
      if (filtros.dataInicio) q = q.gte('data_ingresso', filtros.dataInicio)
      if (filtros.dataFim) q = q.lte('data_ingresso', filtros.dataFim)
      return q
    }
    const { data, error } = await fetchAll(montar, 1000, limite + 1)
    if (error) {
      setMsg('Erro ao carregar usuários: ' + error.message)
      setUsuarios([])
      setTemMais(false)
      setLoading(false)
      return
    }
    const recebidos = data || []
    setTemMais(recebidos.length > limite)
    setUsuarios(recebidos.slice(0, limite))
    setLoading(false)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!podeGerenciarUsuarios) {
      setMsg('Seu perfil tem acesso somente para visualização.')
      return
    }
    setSalvando(true)
    const dados = {
      ...form,
      projeto_id: form.projeto_id ? parseInt(form.projeto_id) : null,
      data_nascimento: form.data_nascimento || null,
      data_ingresso: form.data_ingresso || null,
      data_saida: form.data_saida || null,
      motivo_saida: form.motivo_saida || null,
      tipo_sanguineo: form.tipo_sanguineo || null,
      genero: form.genero || null,
      genero_outro: form.genero === 'Outro' ? (form.genero_outro || null) : null,
      rg: form.rg || null,
      endereco: form.endereco || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      telefone: form.telefone || null,
      email: form.email || null,
      tipo_deficiencia: form.tipo_deficiencia || null,
      deficiencia_detalhes: form.deficiencia_detalhes || null,
      contato_familiar_nome: form.contato_familiar_nome || null,
      contato_familiar_parentesco: form.contato_familiar_parentesco || null,
      contato_familiar_telefone: form.contato_familiar_telefone || null,
      renda_familiar_bruta: parseMoedaBR(form.renda_familiar_bruta),
      pessoas_nucleo_familiar: form.pessoas_nucleo_familiar ? parseInt(form.pessoas_nucleo_familiar) : null,
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
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  function editar(u) {
    setForm({
      nome:u.nome, nis:u.nis||'', cpf:u.cpf||'', data_nascimento:u.data_nascimento||'',
      projeto_id:u.projeto_id||'', data_ingresso:u.data_ingresso||'',
      data_saida:u.data_saida||'', motivo_saida:u.motivo_saida||'',
      situacao:u.situacao, observacoes:u.observacoes||'',
      tipo_sanguineo:u.tipo_sanguineo||'', genero:u.genero||'', genero_outro:u.genero_outro||'',
      rg:u.rg||'', endereco:u.endereco||'', bairro:u.bairro||'', cidade:u.cidade||'Teresópolis',
      telefone:u.telefone||'', email:u.email||'', tipo_deficiencia:u.tipo_deficiencia||'',
      deficiencia_detalhes:u.deficiencia_detalhes||'', contato_familiar_nome:u.contato_familiar_nome||'',
      contato_familiar_parentesco:u.contato_familiar_parentesco||'', contato_familiar_telefone:u.contato_familiar_telefone||'',
      renda_familiar_bruta:u.renda_familiar_bruta ?? '', pessoas_nucleo_familiar:u.pessoas_nucleo_familiar ?? '',
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
  const fmtMoeda = v => v !== null && v !== undefined && v !== ''
    ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  function mediaNumerica(valores) {
    const nums = valores.map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0)
    if (nums.length === 0) return null
    return nums.reduce((a, v) => a + v, 0) / nums.length
  }

  function contarPorCampo(lista, campo, vazio = 'Não informado') {
    return lista.reduce((acc, item) => {
      const valor = item?.[campo] || vazio
      acc[valor] = (acc[valor] || 0) + 1
      return acc
    }, {})
  }

  function perc(qtd, total) {
    return total > 0 ? Math.round((qtd / total) * 100) : 0
  }

  // Métricas
  const ativos = usuarios.filter(u => u.situacao === 'ativo').length
  const porProjeto = {}
  usuarios.forEach(u => {
    const nome = nomeProjetoPorId(u.projeto_id) || u.projeto?.nome || 'Sem projeto'
    if (!porProjeto[nome]) porProjeto[nome] = { ativo:0, total:0 }
    porProjeto[nome].total++
    if (u.situacao === 'ativo') porProjeto[nome].ativo++
  })

  const usuariosTeacolher = usuarios.filter(usuarioEhTeacolher)
  const totalTeacolher = usuariosTeacolher.length
  const ativosTeacolher = usuariosTeacolher.filter(u => u.situacao === 'ativo').length
  const comTelefoneTeacolher = usuariosTeacolher.filter(u => u.telefone).length
  const comResponsavelTeacolher = usuariosTeacolher.filter(u => u.contato_familiar_nome || u.contato_familiar_telefone).length
  const rendaMediaTeacolher = mediaNumerica(usuariosTeacolher.map(u => u.renda_familiar_bruta))
  const nucleoMedioTeacolher = mediaNumerica(usuariosTeacolher.map(u => u.pessoas_nucleo_familiar))
  const generosTeacolher = contarPorCampo(usuariosTeacolher, 'genero')
  const deficienciasTeacolher = contarPorCampo(usuariosTeacolher, 'tipo_deficiencia')
  const bairrosTeacolher = contarPorCampo(usuariosTeacolher, 'bairro')
  const incompletosTeacolher = usuariosTeacolher.filter(u =>
    !u.tipo_deficiencia || !u.deficiencia_detalhes || !u.renda_familiar_bruta || !u.pessoas_nucleo_familiar ||
    !u.cpf || !u.data_nascimento || !u.telefone || !u.contato_familiar_nome
  )
  const faixasTeacolher = { '0 a 5': 0, '6 a 11': 0, '12 a 17': 0, '18 a 29': 0, '30 a 59': 0, '60+': 0, 'Sem idade': 0 }
  usuariosTeacolher.forEach(u => {
    const idade = calcIdade(u.data_nascimento)
    if (idade === null) faixasTeacolher['Sem idade']++
    else if (idade <= 5) faixasTeacolher['0 a 5']++
    else if (idade <= 11) faixasTeacolher['6 a 11']++
    else if (idade <= 17) faixasTeacolher['12 a 17']++
    else if (idade <= 29) faixasTeacolher['18 a 29']++
    else if (idade <= 59) faixasTeacolher['30 a 59']++
    else faixasTeacolher['60+']++
  })

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

  const [confirmandoExcluir, setConfirmandoExcluir] = useState(null)

  async function excluir(id) {
    if (!podeExcluirUsuario) {
      setMsg('Seu perfil não tem permissão para excluir usuários atendidos.')
      setConfirmandoExcluir(null)
      return
    }
    const { error } = await supabase.from('usuarios_atendidos').delete().eq('id', id)
    setConfirmandoExcluir(null)
    if (error) {
      setMsg('Erro ao excluir: ' + error.message)
    } else {
      setMsg('Usuário excluído.')
      carregar()
    }
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }


  return (
    <div style={{ }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Usuários / Público Atendido</div>
      </div>
      <div style={{ padding: isMobile ? '.75rem' : '1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
<div style={{ fontSize:12, color:'#888780' }}>{ativos} ativos · {usuarios.length} total</div>
        </div>
        {podeGerenciarUsuarios && (
          <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VAZIO) }}
            style={s.btn(mostrarForm?'#F1EFE8':'#0E7EA8', mostrarForm?'#5F5E5A':'#fff')}>
            {mostrarForm ? 'Cancelar' : '+ Cadastrar usuário'}
          </button>
        )}
      </div>

      {msg && (
        <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Formulário */}
      {mostrarForm && podeGerenciarUsuarios && (
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
            {formEhTeacolher && (
              <div style={{ margin:'14px 0', padding:14, border:'1px solid #BBDCEA', borderRadius:12, background:'#F5FBFD' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#06344F', marginBottom:4 }}>Anexo I — Formulário de Cadastro do Projeto TEAcolher</div>
                <div style={{ fontSize:11, color:'#5F5E5A', marginBottom:12 }}>Campos oficiais para impressão do cadastro do participante.</div>

                <div style={s.grupo('1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Tipo sanguíneo</label>
                    <select value={form.tipo_sanguineo} onChange={e=>setForm(f=>({...f,tipo_sanguineo:e.target.value}))} style={s.input}>
                      <option value="">Selecione...</option>
                      {TIPOS_SANGUINEOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Gênero</label>
                    <select value={form.genero} onChange={e=>setForm(f=>({...f,genero:e.target.value, genero_outro:e.target.value === 'Outro' ? f.genero_outro : ''}))} style={s.input}>
                      <option value="">Selecione...</option>
                      {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  {form.genero === 'Outro' && (
                    <div>
                      <label style={s.label}>Outro gênero</label>
                      <input value={form.genero_outro} onChange={e=>setForm(f=>({...f,genero_outro:e.target.value}))} style={s.input} />
                    </div>
                  )}
                </div>

                <div style={s.grupo('1fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>RG</label>
                    <input value={form.rg} onChange={e=>setForm(f=>({...f,rg:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Telefone/WhatsApp</label>
                    <input value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="(21) 00000-0000" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>E-mail</label>
                    <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={s.input} />
                  </div>
                </div>

                <div style={s.grupo('2fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Endereço</label>
                    <input value={form.endereco} onChange={e=>setForm(f=>({...f,endereco:e.target.value}))} placeholder="Rua, número, complemento" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Bairro</label>
                    <input value={form.bairro} onChange={e=>setForm(f=>({...f,bairro:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Cidade</label>
                    <input value={form.cidade} onChange={e=>setForm(f=>({...f,cidade:e.target.value}))} style={s.input} />
                  </div>
                </div>

                <div style={s.grupo('1fr 2fr')}>
                  <div>
                    <label style={s.label}>Tipo de deficiência</label>
                    <select value={form.tipo_deficiencia} onChange={e=>setForm(f=>({...f,tipo_deficiencia:e.target.value}))} style={s.input}>
                      <option value="">Selecione...</option>
                      {TIPOS_DEFICIENCIA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Detalhes sobre a deficiência</label>
                    <input value={form.deficiencia_detalhes} onChange={e=>setForm(f=>({...f,deficiencia_detalhes:e.target.value}))} placeholder="Diagnóstico, observações, necessidades específicas..." style={s.input} />
                  </div>
                </div>

                <div style={s.grupo('2fr 1fr 1fr')}>
                  <div>
                    <label style={s.label}>Nome do familiar/cuidador</label>
                    <input value={form.contato_familiar_nome} onChange={e=>setForm(f=>({...f,contato_familiar_nome:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Relação/parentesco</label>
                    <input value={form.contato_familiar_parentesco} onChange={e=>setForm(f=>({...f,contato_familiar_parentesco:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Telefone do familiar/cuidador</label>
                    <input value={form.contato_familiar_telefone} onChange={e=>setForm(f=>({...f,contato_familiar_telefone:e.target.value}))} style={s.input} />
                  </div>
                </div>

                <div style={s.grupo('1fr 1fr')}>
                  <div>
                    <label style={s.label}>Renda familiar bruta</label>
                    <input value={form.renda_familiar_bruta} onChange={e=>setForm(f=>({...f,renda_familiar_bruta:e.target.value}))} placeholder="Ex.: 2500,00" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Número de pessoas no núcleo familiar</label>
                    <input type="number" min="0" value={form.pessoas_nucleo_familiar} onChange={e=>setForm(f=>({...f,pessoas_nucleo_familiar:e.target.value}))} style={s.input} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} placeholder="Observações sobre o usuário ou atendimento..." />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':'#0E7EA8')}>
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : '+ Cadastrar'}
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
        <button onClick={() => setAbaAtiva('teacolher')} style={s.tab(abaAtiva==='teacolher')}>Dashboard TEAcolher</button>
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
              <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div>
            ) : usuarios.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#2C2C2A', marginBottom:4 }}>Nenhum usuário cadastrado</div>
                <div style={{ fontSize:12, color:'#888780', maxWidth:380, margin:'0 auto' }}>Cadastre as pessoas atendidas pela instituição para acompanhar atendimentos, projetos e relatórios.</div>
                {podeGerenciarUsuarios && (
                  <button onClick={() => setMostrarForm(true)} style={{ marginTop:12, padding:'8px 20px', fontSize:12, fontWeight:600, borderRadius:8, border:'none', background:'#0E7EA8', color:'#fff', cursor:'pointer' }}>+ Cadastrar usuário</button>
                )}
              </div>
            ) : (
              <div style={{ maxHeight:520, overflowY:'auto',overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead style={{ position:'sticky', top:0 }}>
                    <tr>{['Nome','Projeto','Idade','Ingresso','Saída','Situação','Ações'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u,i) => {
                      const [bg,cor] = SITUACAO_COR[u.situacao]||['#F1EFE8','#888780']
                      const idade = calcIdade(u.data_nascimento)
                      return (
                        <tr key={u.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                          <td style={{ ...s.td, fontWeight:500 }}>{u.nome}</td>
                          <td style={{ ...s.td, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nomeProjetoPorId(u.projeto_id) || u.projeto?.nome || '—'}</td>
                          <td style={s.td}>{idade !== null ? `${idade} anos` : '—'}</td>
                          <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(u.data_ingresso)}</td>
                          <td style={{ ...s.td, whiteSpace:'nowrap', color:u.data_saida?VERMELHO:'#888780' }}>{fmtData(u.data_saida)}</td>
                          <td style={s.td}><span style={s.badge(bg,cor)}>{u.situacao}</span></td>
                          <td style={s.td}>
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                              {podeGerenciarUsuarios && (
                                <button onClick={() => editar(u)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button>
                              )}
                              {podeImprimirAnexo && usuarioEhTeacolher(u) && (
                                <button onClick={() => gerarPDFAnexoTeacolher(u, { projetoNome: nomeProjetoPorId(u.projeto_id) || u.projeto?.nome || 'Projeto TEAcolher' })} style={s.btn('#0E7EA8')}>Imprimir Anexo I</button>
                              )}
                              {podeExcluirUsuario && (
                                <button type="button" onClick={() => setConfirmandoExcluir(u.id)} style={s.btn('#FEF2F2','#A32D2D')}>Excluir</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          {temMais && (
            <div style={{ textAlign:'center', marginTop:12 }}>
              <button onClick={() => setLimite(l => l + 300)}
                style={{ padding:'8px 24px', fontSize:12, borderRadius:8, border:'0.5px solid #D3D1C7', background:'rgba(255,255,255,0.92)', color:'#5F5E5A', cursor:'pointer' }}>
                Carregar mais 300
              </button>
            </div>
          )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ABA DASHBOARD TEACOLHER */}
      {abaAtiva === 'teacolher' && (
        <div>
          <div style={{ ...s.card, borderLeft:'3px solid rgba(14,126,168,.45)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#06344F', marginBottom:4 }}>Dashboard do Projeto TEAcolher</div>
                <div style={{ fontSize:12, color:'#5F5E5A', lineHeight:1.45 }}>Perfil consolidado dos usuários vinculados ao Projeto TEAcolher, com base nos cadastros carregados na tela.</div>
              </div>
              {podeGerenciarUsuarios && (
                <button onClick={() => { setAbaAtiva('lista'); setMostrarForm(true); setEditando(null); setForm(FORM_VAZIO) }} style={s.btn(AZUL)}>
                  + Cadastrar usuário
                </button>
              )}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px,1fr))', gap:8, marginBottom:'1rem' }}>
            {[
              { label:'Total TEAcolher', val:totalTeacolher, cor:AZUL },
              { label:'Ativos', val:ativosTeacolher, cor:VERDE },
              { label:'Com telefone', val:`${comTelefoneTeacolher} (${perc(comTelefoneTeacolher,totalTeacolher)}%)`, cor:'#06344F' },
              { label:'Com responsável', val:`${comResponsavelTeacolher} (${perc(comResponsavelTeacolher,totalTeacolher)}%)`, cor:'#3B6D11' },
              { label:'Renda média', val:fmtMoeda(rendaMediaTeacolher), cor:'#854F0B' },
              { label:'Núcleo familiar médio', val:nucleoMedioTeacolher ? nucleoMedioTeacolher.toFixed(1).replace('.', ',') : '—', cor:'#185FA5' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.92)', borderRadius:12, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:9.5, color:'#888780', marginBottom:4, textTransform:'uppercase', letterSpacing:'.08em' }}>{k.label}</div>
                <div style={{ fontSize:18, fontWeight:700, color:k.cor }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:10, marginBottom:10 }}>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:'.85rem', color:'#06344F' }}>Faixa etária</div>
              {Object.entries(faixasTeacolher).map(([faixa, count]) => (
                <div key={faixa} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                    <span>{faixa}</span><span style={{ color:'#888780' }}>{count} · {perc(count,totalTeacolher)}%</span>
                  </div>
                  <div style={{ height:6, background:'#F1EFE8', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${perc(count,totalTeacolher)}%`, background:AZUL, borderRadius:99 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:'.85rem', color:'#06344F' }}>Tipo de deficiência</div>
              {Object.entries(deficienciasTeacolher).sort((a,b)=>b[1]-a[1]).map(([tipo, count]) => (
                <div key={tipo} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{tipo}</span><span style={{ fontWeight:600, color:AZUL }}>{count}</span>
                </div>
              ))}
              {totalTeacolher === 0 && <div style={{ fontSize:12, color:'#888780' }}>Nenhum usuário vinculado ao TEAcolher.</div>}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:10, marginBottom:10 }}>
            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:'.85rem', color:'#06344F' }}>Gênero</div>
              {Object.entries(generosTeacolher).sort((a,b)=>b[1]-a[1]).map(([genero, count]) => (
                <div key={genero} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{genero}</span><span style={{ fontWeight:600, color:AZUL }}>{count}</span>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:'.85rem', color:'#06344F' }}>Bairros mais frequentes</div>
              {Object.entries(bairrosTeacolher).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([bairro, count]) => (
                <div key={bairro} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1EFE8', fontSize:12 }}>
                  <span>{bairro}</span><span style={{ fontWeight:600, color:AZUL }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={s.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:'.85rem', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#06344F' }}>Cadastros pendentes do Anexo I</div>
                <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>Faltando laudo/deficiência, renda familiar ou núcleo familiar — exigidos para prestação de contas.</div>
              </div>
              <span style={s.badge(incompletosTeacolher.length ? '#FFF6ED' : '#EAF3DE', incompletosTeacolher.length ? '#854F0B' : '#3B6D11')}>
                {incompletosTeacolher.length} pendente(s)
              </span>
            </div>
            {incompletosTeacolher.length === 0 ? (
              <div style={{ fontSize:12, color:'#3B6D11' }}>Todos os cadastros do TEAcolher estão com o Anexo I e os dados básicos completos.</div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr>{['Nome','Faltando','Ação'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {incompletosTeacolher.slice(0,12).map(u => {
                      const faltandoAnexo1 = [
                        !u.tipo_deficiencia && 'Tipo de deficiência',
                        !u.deficiencia_detalhes && 'Laudo/detalhes',
                        !u.renda_familiar_bruta && 'Renda familiar',
                        !u.pessoas_nucleo_familiar && 'Pessoas no núcleo',
                      ].filter(Boolean)
                      const faltandoBasico = [
                        !u.cpf && 'CPF',
                        !u.data_nascimento && 'Nascimento',
                        !u.telefone && 'Telefone',
                        !u.contato_familiar_nome && 'Contato familiar',
                      ].filter(Boolean)
                      return (
                        <tr key={u.id}>
                          <td style={s.td}>{u.nome}</td>
                          <td style={s.td}>
                            {faltandoAnexo1.length > 0 && (
                              <div style={{ color:'#A32D2D', fontWeight:600 }}>Anexo I: {faltandoAnexo1.join(', ')}</div>
                            )}
                            {faltandoBasico.length > 0 && (
                              <div style={{ color:'#9199A2', fontSize:11, marginTop:faltandoAnexo1.length?2:0 }}>Básico: {faltandoBasico.join(', ')}</div>
                            )}
                          </td>
                          <td style={s.td}><button onClick={() => editar(u)} style={s.btn('#F1EFE8','#5F5E5A')}>Editar</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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
                  <div style={{ height:'100%', width:(dados.ativo/Math.max(...Object.values(porProjeto).map(d=>d.total))*100)+'%', background:AZUL, borderRadius:99 }} />
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
      </div>
  )
}