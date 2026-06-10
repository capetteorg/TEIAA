import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

const ABAS = [
  { id:'institucional', label:'📋 Institucional', desc:'Estatuto, atas, CNPJ, certidões' },
  { id:'mrosc', label:'⚖️ MROSC / Habilitação', desc:'Documentos exigidos pelo art. 34 da Lei 13.019/2014' },
  { id:'declaracoes', label:'📝 Declarações', desc:'Declarações exigidas em parcerias' },
  { id:'parcerias', label:'🤝 Parcerias', desc:'Documentos por parceria/convênio' },
  { id:'resolucoes', label:'📜 Resoluções', desc:'Resoluções e deliberações' },
]

const TIPOS_INSTITUCIONAL = [
  'Estatuto Social', 'Ata de Fundação', 'Ata de Eleição da Diretoria', 'CNPJ',
  'Comprovante de Endereço', 'Relação de Dirigentes', 'Regimento Interno',
  'Balanço Patrimonial', 'Demonstração de Resultados', 'Outro',
]

const TIPOS_MROSC = [
  'Certidão de Regularidade Federal (CND/PGFN)',
  'Certidão de Regularidade FGTS',
  'Certidão de Regularidade Trabalhista (CNDT)',
  'Certidão de Regularidade Estadual',
  'Certidão de Regularidade Municipal',
  'Certidão de Existência Jurídica',
  'Ata de Eleição do Quadro de Dirigentes',
  'Relação Nominal Atualizada dos Dirigentes',
  'Comprovação de Funcionamento no Endereço',
  'Experiência Prévia (art. 33, V)',
]

const TIPOS_DECLARACOES = [
  'Declaração de Capacidade Técnica',
  'Declaração de Inexistência de Impedimentos',
  'Declaração de Não Distribuição de Resultados',
  'Declaração de Finalidade Não Eleitoral',
  'Declaração de Conformidade com a LGPD',
  'Declaração de Ausência de Conflito de Interesses',
  'Declaração de Ciência das Obrigações',
  'Declaração de Estrutura Operacional',
  'Declaração de Veracidade',
  'Outra Declaração',
]

const TEXTOS_DECLARACOES = {
  'Declaração de Capacidade Técnica': (inst, rep) => `DECLARAÇÃO DE CAPACIDADE TÉCNICA

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede à ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, declara, para fins de formalização de parceria com a Administração Pública, que possui plena capacidade técnica, operacional e administrativa para executar o objeto descrito no Plano de Trabalho anexo, em conformidade com os requisitos legais estabelecidos na Lei nº 13.019/2014.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

__________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,

  'Declaração de Inexistência de Impedimentos': (inst, rep) => `DECLARAÇÃO DE INEXISTÊNCIA DE IMPEDIMENTOS

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede na ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, neste ato representada por ${rep?.nome || 'seu representante legal'}, portador do CPF nº ${rep?.cpf || ''}, DECLARA, para os devidos fins, que não possui qualquer impedimento legal, judicial ou administrativo que obstrua a celebração de parcerias com o Poder Público, nos termos do art. 33 da Lei nº 13.019, de 31 de julho de 2014.

Por ser expressão da verdade, firma a presente para os devidos fins legais.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,

  'Declaração de Não Distribuição de Resultados': (inst, rep) => `DECLARAÇÃO DE NÃO DISTRIBUIÇÃO DE RESULTADOS

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede à ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, declara, sob as penas da lei, que não distribui, sob qualquer forma, eventuais resultados operacionais, dividendos, bonificações, participações ou parcela do patrimônio aos seus membros, dirigentes, conselheiros, colaboradores ou a terceiros, conforme preconizado em seu Estatuto Social, e nos termos do art. 2º, inciso I, da Lei nº 13.019, de 31 de julho de 2014.

Por ser expressão da verdade, firma a presente para os devidos fins legais.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,

  'Declaração de Finalidade Não Eleitoral': (inst, rep) => `DECLARAÇÃO DE FINALIDADE NÃO ELEITORAL

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede à ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, declara, sob as penas da lei, que os recursos públicos eventualmente repassados no âmbito da presente parceria não serão utilizados, direta ou indiretamente, para fins eleitorais, em estrita observância ao disposto na legislação eleitoral vigente e demais normas aplicáveis.

Por ser expressão da verdade, firma a presente para os devidos fins legais.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,

  'Declaração de Conformidade com a LGPD': (inst, rep) => `DECLARAÇÃO DE CONFORMIDADE COM A LGPD

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede à ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, declara, sob as penas da lei, que está em conformidade com os princípios, direitos e obrigações previstos na Lei Federal nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD), comprometendo-se com o tratamento ético, responsável e seguro de todos os dados pessoais eventualmente coletados, utilizados ou armazenados durante a execução da presente parceria com a Administração Pública.

Por ser expressão da verdade, firma a presente para os devidos fins legais.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,

  'Declaração de Ausência de Conflito de Interesses': (inst, rep) => `DECLARAÇÃO DE AUSÊNCIA DE CONFLITO DE INTERESSES

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede à ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, declara, sob as penas da lei, que não há qualquer situação de conflito de interesses entre os membros de sua equipe diretiva, técnica ou administrativa e os servidores ou agentes públicos vinculados ao órgão concedente da presente parceria, em conformidade com o disposto na legislação vigente, especialmente a Lei nº 12.813/2013.

Por ser expressão da verdade, firma a presente para os devidos fins legais.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,

  'Declaração de Ciência das Obrigações': (inst, rep) => `DECLARAÇÃO DE CIÊNCIA DAS OBRIGAÇÕES

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede à ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, declara, sob as penas da lei, que está plenamente ciente das obrigações legais, técnicas e administrativas relativas à execução da parceria firmada com a Administração Pública, bem como da necessidade de prestar contas dos recursos recebidos, conforme a legislação vigente, em especial a Lei nº 13.019/2014 e demais normativos aplicáveis.

Por ser expressão da verdade, firma a presente para os devidos fins legais.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,

  'Declaração de Estrutura Operacional': (inst, rep) => `DECLARAÇÃO DE ESTRUTURA OPERACIONAL

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede à ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, declara, sob as penas da lei, que dispõe de estrutura física, técnica, operacional e de pessoal qualificado, adequada e suficiente para a execução do objeto pactuado, conforme os requisitos estabelecidos na legislação vigente, em especial na Lei nº 13.019/2014 e demais normativos aplicáveis.

Por ser expressão da verdade, firma a presente para os devidos fins legais.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,

  'Declaração de Veracidade': (inst, rep) => `DECLARAÇÃO DE VERACIDADE

A ${inst.nome_completo || 'CAPETTE'}, inscrita no CNPJ sob o nº ${inst.cnpj || '29.213.717/0001-01'}, com sede à ${inst.endereco || 'Rua Juruena, 73, Agriões, Teresópolis – RJ'}, declara, sob as penas da lei, que todas as informações e documentos apresentados para fins de celebração da presente parceria são verdadeiros, completos e condizentes com a realidade institucional, responsabilizando-se integralmente por sua autenticidade e exatidão, nos termos da legislação vigente.

Por ser expressão da verdade, firma a presente para os devidos fins legais.

Teresópolis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'CAPETTE'}`,
}

export default function DocumentosFiscais() {
  const { perfil } = useAuth()
  const isAdmin = perfil?.perfil === 'admin'
  const [aba, setAba] = useState('institucional')
  const [docs, setDocs] = useState([])
  const [instituicao, setInstituicao] = useState({})
  const [representante, setRepresentante] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ titulo:'', tipo:'', aba:'institucional', vencimento:'', emitido_em:'', observacoes:'', publico:false })
  const [declaracoesSel, setDeclaracoesSel] = useState([])
  const inputFileRef = useRef()
  const [arquivo, setArquivo] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [docsRes, instRes, dirRes] = await Promise.all([
      supabase.from('documentos_fiscais').select('*').order('criado_em', { ascending:false }),
      supabase.from('instituicao').select('*').limit(1).single(),
      supabase.from('diretoria').select('*').eq('cargo', 'Presidente').eq('ativo', true).limit(1).single(),
    ])
    setDocs(docsRes.data || [])
    setInstituicao(instRes.data || {})
    setRepresentante(dirRes.data || null)
    setLoading(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    let arquivo_url = null
    if (arquivo) {
      const ext = arquivo.name.split('.').pop()
      const path = `documentos/${Date.now()}.${ext}`
      const { data: up } = await supabase.storage.from('documentos').upload(path, arquivo)
      if (up) {
        const { data: url } = supabase.storage.from('documentos').getPublicUrl(path)
        arquivo_url = url.publicUrl
      }
    }
    await supabase.from('documentos_fiscais').insert({ ...form, aba, arquivo_url })
    setMsg('✅ Documento salvo!')
    setMostrarForm(false)
    setForm({ titulo:'', tipo:'', aba:'institucional', vencimento:'', emitido_em:'', observacoes:'', publico:false })
    setArquivo(null)
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este documento?')) return
    await supabase.from('documentos_fiscais').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  function gerarDeclaracoesPDF() {
    if (declaracoesSel.length === 0) { setMsg('Selecione ao menos uma declaração.'); return }
    const conteudo = declaracoesSel.map(tipo => {
      const fn = TEXTOS_DECLARACOES[tipo]
      return fn ? fn(instituicao, representante) : `${tipo}\n\n[Texto não disponível]`
    }).join('\n\n' + '='.repeat(80) + '\n\n')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.8; color: #2C2C2A; }
      .declaracao { page-break-after: always; padding: 60px; min-height: 100vh; display: flex; flex-direction: column; }
      .declaracao:last-child { page-break-after: auto; }
      pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.8; }
      h2 { font-size: 14px; text-align: center; margin-bottom: 40px; letter-spacing: 1px; }
    </style></head><body>
    ${declaracoesSel.map(tipo => {
      const fn = TEXTOS_DECLARACOES[tipo]
      const texto = fn ? fn(instituicao, representante) : `${tipo}\n\n[Texto não disponível]`
      const linhas = texto.split('\n')
      const titulo = linhas[0]
      const corpo = linhas.slice(1).join('\n')
      return `<div class="declaracao"><h2>${titulo}</h2><pre>${corpo}</pre></div>`
    }).join('')}
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const docsDaAba = docs.filter(d => d.aba === aba)
  const hoje = new Date().toISOString().slice(0,10)

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
  }

  const tiposPorAba = { institucional: TIPOS_INSTITUCIONAL, mrosc: TIPOS_MROSC, declaracoes: TIPOS_DECLARACOES, parcerias: [], resolucoes: [] }
  const tipos = tiposPorAba[aba] || []

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500 }}>Documentos Fiscais e Institucionais</div>
          <div style={{ fontSize:12, color:'#888780' }}>Gestão centralizada de documentos da organização</div>
        </div>
        {isAdmin && (
          <button onClick={() => setMostrarForm(!mostrarForm)} style={s.btn(mostrarForm?'#F1EFE8':AZUL, mostrarForm?'#5F5E5A':'#fff')}>
            {mostrarForm ? 'Cancelar' : '+ Adicionar documento'}
          </button>
        )}
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:msg.includes('✅')?'#F2FAE8':'#FEF2F2', color:msg.includes('✅')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {/* Form adicionar */}
      {isAdmin && mostrarForm && (
        <div style={{ ...s.card, borderColor:AZUL+'60', marginBottom:'1.25rem' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Adicionar documento</div>
          <form onSubmit={salvar}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Título *</label>
                <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} required style={s.input} />
              </div>
              <div>
                <label style={s.label}>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={s.input}>
                  <option value="">Selecione...</option>
                  {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>Aba</label>
                <select value={form.aba} onChange={e=>setForm(f=>({...f,aba:e.target.value}))} style={s.input}>
                  {ABAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Data de emissão</label>
                <input type="date" value={form.emitido_em} onChange={e=>setForm(f=>({...f,emitido_em:e.target.value}))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Vencimento</label>
                <input type="date" value={form.vencimento} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Arquivo (PDF, JPG, etc.)</label>
              <input ref={inputFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>setArquivo(e.target.files[0])} style={s.input} />
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={s.label}>Observações</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
              <input type="checkbox" checked={form.publico} onChange={e=>setForm(f=>({...f,publico:e.target.checked}))} id="publico" />
              <label htmlFor="publico" style={{ fontSize:12 }}>Exibir no Portal de Transparência</label>
            </div>
            <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':AZUL)}>{salvando?'Salvando...':'💾 Salvar'}</button>
          </form>
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${aba===a.id?VERDE:'#D3D1C7'}`, background:aba===a.id?VERDE:'transparent', color:aba===a.id?'#fff':'#5F5E5A', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Gerador de declarações */}
      {aba === 'declaracoes' && (
        <div style={{ ...s.card, borderColor:LARANJA+'60', marginBottom:'1.25rem' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>📄 Gerador de Declarações</div>
          <div style={{ fontSize:12, color:'#888780', marginBottom:12 }}>
            Selecione as declarações e gere um PDF — uma folha por declaração, pronta para impressão e assinatura.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:6, marginBottom:12 }}>
            {TIPOS_DECLARACOES.filter(t => TEXTOS_DECLARACOES[t]).map(tipo => (
              <label key={tipo} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer', padding:'6px 10px', borderRadius:8, background: declaracoesSel.includes(tipo)?'#EAF3DE':'#F8F7F2', border:`0.5px solid ${declaracoesSel.includes(tipo)?VERDE:'#E0DDD5'}` }}>
                <input type="checkbox" checked={declaracoesSel.includes(tipo)}
                  onChange={e => setDeclaracoesSel(prev => e.target.checked ? [...prev, tipo] : prev.filter(t=>t!==tipo))} />
                {tipo}
              </label>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={gerarDeclaracoesPDF} style={s.btn(declaracoesSel.length>0?LARANJA:'#D3D1C7')}>
              🖨️ Gerar PDF ({declaracoesSel.length} declarações)
            </button>
            <button onClick={() => setDeclaracoesSel(Object.keys(TEXTOS_DECLARACOES))} style={s.btn('#F1EFE8','#5F5E5A')}>Todas</button>
            <button onClick={() => setDeclaracoesSel([])} style={s.btn('#F1EFE8','#5F5E5A')}>Limpar</button>
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      <div style={s.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
          <div style={{ fontSize:13, fontWeight:500 }}>{ABAS.find(a=>a.id===aba)?.label} ({docsDaAba.length})</div>
          <div style={{ fontSize:11, color:'#888780' }}>{ABAS.find(a=>a.id===aba)?.desc}</div>
        </div>
        {loading ? <div style={{ textAlign:'center', padding:'2rem', color:'#888780' }}>Carregando...</div> :
        docsDaAba.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2.5rem', color:'#888780' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📁</div>
            <div style={{ fontSize:13 }}>Nenhum documento cadastrado nesta aba.</div>
            {isAdmin && <div style={{ fontSize:12, marginTop:4 }}>Clique em "+ Adicionar documento" para começar.</div>}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr>{['Título','Tipo','Emissão','Vencimento','Status','Público',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {docsDaAba.map((d,i) => {
                const vencido = d.vencimento && d.vencimento < hoje
                const venceEm30 = d.vencimento && d.vencimento >= hoje && d.vencimento <= new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10)
                return (
                  <tr key={d.id} style={{ background: vencido?'#FEF2F2': venceEm30?'#FFFBF0': i%2===0?'#fff':'#FAFAF8' }}>
                    <td style={{ ...s.td, fontWeight:500 }}>
                      {d.arquivo_url ? (
                        <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer" style={{ color:AZUL, textDecoration:'none' }}>📎 {d.titulo}</a>
                      ) : d.titulo}
                    </td>
                    <td style={{ ...s.td, color:'#888780' }}>{d.tipo||'—'}</td>
                    <td style={{ ...s.td, fontSize:11 }}>{d.emitido_em ? new Date(d.emitido_em+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ ...s.td, fontSize:11 }}>
                      {d.vencimento ? (
                        <span style={{ color: vencido?VERMELHO: venceEm30?LARANJA:'inherit', fontWeight: (vencido||venceEm30)?600:400 }}>
                          {new Date(d.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}
                          {vencido && ' ⚠ Vencido'}
                          {venceEm30 && ' ⚡ Vence em breve'}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={s.td}>
                      <span style={s.badge(vencido?'#FEF2F2':venceEm30?'#FAEEDA':'#EAF3DE', vencido?VERMELHO:venceEm30?LARANJA:VERDE)}>
                        {vencido?'Vencido':venceEm30?'Atenção':'Válido'}
                      </span>
                    </td>
                    <td style={s.td}><span style={s.badge(d.publico?'#EAF3DE':'#F1EFE8', d.publico?VERDE:'#888780')}>{d.publico?'Sim':'Não'}</span></td>
                    <td style={s.td}>
                      {isAdmin && <button onClick={() => excluir(d.id)} style={{ ...s.btn('#FEF2F2',VERMELHO), fontSize:11 }}>Excluir</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
