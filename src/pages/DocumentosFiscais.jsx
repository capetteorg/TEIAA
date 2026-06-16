import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { confirmar } from '../lib/ui'

const VERDE = '#0E7EA8', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

const ABAS = [
  { id:'institucional', label:'Institucional', desc:'Estatuto, atas, CNPJ, certidÃµes' },
  { id:'mrosc', label:'MROSC / HabilitaÃ§Ã£o', desc:'Documentos exigidos pelo art. 34 da Lei 13.019/2014' },
  { id:'declaracoes', label:'DeclaraÃ§Ãµes', desc:'DeclaraÃ§Ãµes exigidas em parcerias' },
  { id:'parcerias', label:'Parcerias', desc:'Documentos por parceria/convÃªnio' },
  { id:'resolucoes', label:'ResoluÃ§Ãµes', desc:'ResoluÃ§Ãµes e deliberaÃ§Ãµes' },
  { id:'arquivos', label:'Arquivos', desc:'RelatÃ³rios anuais, balanÃ§os e outros documentos pÃºblicos' },
]

const CATEGORIAS_ARQUIVO = [
  'Documentos institucionais', 'RelatÃ³rios anuais', 'PrestaÃ§Ãµes de contas',
  'Planos de trabalho', 'BalanÃ§os financeiros', 'CertidÃµes e registros', 'Outros documentos',
]

const TIPOS_INSTITUCIONAL = [
  'Estatuto Social', 'Ata de FundaÃ§Ã£o', 'Ata de EleiÃ§Ã£o da Diretoria', 'CNPJ',
  'Comprovante de EndereÃ§o', 'RelaÃ§Ã£o de Dirigentes', 'Regimento Interno',
  'BalanÃ§o Patrimonial', 'DemonstraÃ§Ã£o de Resultados', 'Outro',
]

const TIPOS_MROSC = [
  'CertidÃ£o de Regularidade Federal (CND/PGFN)',
  'CertidÃ£o de Regularidade FGTS',
  'CertidÃ£o de Regularidade Trabalhista (CNDT)',
  'CertidÃ£o de Regularidade Estadual',
  'CertidÃ£o de Regularidade Municipal',
  'CertidÃ£o de ExistÃªncia JurÃ­dica',
  'Ata de EleiÃ§Ã£o do Quadro de Dirigentes',
  'RelaÃ§Ã£o Nominal Atualizada dos Dirigentes',
  'ComprovaÃ§Ã£o de Funcionamento no EndereÃ§o',
  'ExperiÃªncia PrÃ©via (art. 33, V)',
]

const TIPOS_DECLARACOES = [
  'DeclaraÃ§Ã£o de Capacidade TÃ©cnica',
  'DeclaraÃ§Ã£o de InexistÃªncia de Impedimentos',
  'DeclaraÃ§Ã£o de NÃ£o DistribuiÃ§Ã£o de Resultados',
  'DeclaraÃ§Ã£o de Finalidade NÃ£o Eleitoral',
  'DeclaraÃ§Ã£o de Conformidade com a LGPD',
  'DeclaraÃ§Ã£o de AusÃªncia de Conflito de Interesses',
  'DeclaraÃ§Ã£o de CiÃªncia das ObrigaÃ§Ãµes',
  'DeclaraÃ§Ã£o de Estrutura Operacional',
  'DeclaraÃ§Ã£o de Veracidade',
  'Outra DeclaraÃ§Ã£o',
]

const TEXTOS_DECLARACOES = {
  'DeclaraÃ§Ã£o de Capacidade TÃ©cnica': (inst, rep) => `DECLARAÃ‡ÃƒO DE CAPACIDADE TÃ‰CNICA

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede Ã  ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, declara, para fins de formalizaÃ§Ã£o de parceria com a AdministraÃ§Ã£o PÃºblica, que possui plena capacidade tÃ©cnica, operacional e administrativa para executar o objeto descrito no Plano de Trabalho anexo, em conformidade com os requisitos legais estabelecidos na Lei nÂº 13.019/2014.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

__________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,

  'DeclaraÃ§Ã£o de InexistÃªncia de Impedimentos': (inst, rep) => `DECLARAÃ‡ÃƒO DE INEXISTÃŠNCIA DE IMPEDIMENTOS

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede na ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, neste ato representada por ${rep?.nome || 'seu representante legal'}, portador do CPF nÂº ${rep?.cpf || ''}, DECLARA, para os devidos fins, que nÃ£o possui qualquer impedimento legal, judicial ou administrativo que obstrua a celebraÃ§Ã£o de parcerias com o Poder PÃºblico, nos termos do art. 33 da Lei nÂº 13.019, de 31 de julho de 2014.

Por ser expressÃ£o da verdade, firma a presente para os devidos fins legais.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,

  'DeclaraÃ§Ã£o de NÃ£o DistribuiÃ§Ã£o de Resultados': (inst, rep) => `DECLARAÃ‡ÃƒO DE NÃƒO DISTRIBUIÃ‡ÃƒO DE RESULTADOS

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede Ã  ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, declara, sob as penas da lei, que nÃ£o distribui, sob qualquer forma, eventuais resultados operacionais, dividendos, bonificaÃ§Ãµes, participaÃ§Ãµes ou parcela do patrimÃ´nio aos seus membros, dirigentes, conselheiros, colaboradores ou a terceiros, conforme preconizado em seu Estatuto Social, e nos termos do art. 2Âº, inciso I, da Lei nÂº 13.019, de 31 de julho de 2014.

Por ser expressÃ£o da verdade, firma a presente para os devidos fins legais.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,

  'DeclaraÃ§Ã£o de Finalidade NÃ£o Eleitoral': (inst, rep) => `DECLARAÃ‡ÃƒO DE FINALIDADE NÃƒO ELEITORAL

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede Ã  ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, declara, sob as penas da lei, que os recursos pÃºblicos eventualmente repassados no Ã¢mbito da presente parceria nÃ£o serÃ£o utilizados, direta ou indiretamente, para fins eleitorais, em estrita observÃ¢ncia ao disposto na legislaÃ§Ã£o eleitoral vigente e demais normas aplicÃ¡veis.

Por ser expressÃ£o da verdade, firma a presente para os devidos fins legais.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,

  'DeclaraÃ§Ã£o de Conformidade com a LGPD': (inst, rep) => `DECLARAÃ‡ÃƒO DE CONFORMIDADE COM A LGPD

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede Ã  ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, declara, sob as penas da lei, que estÃ¡ em conformidade com os princÃ­pios, direitos e obrigaÃ§Ãµes previstos na Lei Federal nÂº 13.709/2018 â€“ Lei Geral de ProteÃ§Ã£o de Dados Pessoais (LGPD), comprometendo-se com o tratamento Ã©tico, responsÃ¡vel e seguro de todos os dados pessoais eventualmente coletados, utilizados ou armazenados durante a execuÃ§Ã£o da presente parceria com a AdministraÃ§Ã£o PÃºblica.

Por ser expressÃ£o da verdade, firma a presente para os devidos fins legais.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,

  'DeclaraÃ§Ã£o de AusÃªncia de Conflito de Interesses': (inst, rep) => `DECLARAÃ‡ÃƒO DE AUSÃŠNCIA DE CONFLITO DE INTERESSES

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede Ã  ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, declara, sob as penas da lei, que nÃ£o hÃ¡ qualquer situaÃ§Ã£o de conflito de interesses entre os membros de sua equipe diretiva, tÃ©cnica ou administrativa e os servidores ou agentes pÃºblicos vinculados ao Ã³rgÃ£o concedente da presente parceria, em conformidade com o disposto na legislaÃ§Ã£o vigente, especialmente a Lei nÂº 12.813/2013.

Por ser expressÃ£o da verdade, firma a presente para os devidos fins legais.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,

  'DeclaraÃ§Ã£o de CiÃªncia das ObrigaÃ§Ãµes': (inst, rep) => `DECLARAÃ‡ÃƒO DE CIÃŠNCIA DAS OBRIGAÃ‡Ã•ES

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede Ã  ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, declara, sob as penas da lei, que estÃ¡ plenamente ciente das obrigaÃ§Ãµes legais, tÃ©cnicas e administrativas relativas Ã  execuÃ§Ã£o da parceria firmada com a AdministraÃ§Ã£o PÃºblica, bem como da necessidade de prestar contas dos recursos recebidos, conforme a legislaÃ§Ã£o vigente, em especial a Lei nÂº 13.019/2014 e demais normativos aplicÃ¡veis.

Por ser expressÃ£o da verdade, firma a presente para os devidos fins legais.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,

  'DeclaraÃ§Ã£o de Estrutura Operacional': (inst, rep) => `DECLARAÃ‡ÃƒO DE ESTRUTURA OPERACIONAL

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede Ã  ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, declara, sob as penas da lei, que dispÃµe de estrutura fÃ­sica, tÃ©cnica, operacional e de pessoal qualificado, adequada e suficiente para a execuÃ§Ã£o do objeto pactuado, conforme os requisitos estabelecidos na legislaÃ§Ã£o vigente, em especial na Lei nÂº 13.019/2014 e demais normativos aplicÃ¡veis.

Por ser expressÃ£o da verdade, firma a presente para os devidos fins legais.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,

  'DeclaraÃ§Ã£o de Veracidade': (inst, rep) => `DECLARAÃ‡ÃƒO DE VERACIDADE

A ${inst.nome_completo || 'TEIAA'}, inscrita no CNPJ sob o nÂº ${inst.cnpj || '27.837.768/0001-70'}, com sede Ã  ${inst.endereco || 'Rua Juruena, 73, AgriÃµes, TeresÃ³polis â€“ RJ'}, declara, sob as penas da lei, que todas as informaÃ§Ãµes e documentos apresentados para fins de celebraÃ§Ã£o da presente parceria sÃ£o verdadeiros, completos e condizentes com a realidade institucional, responsabilizando-se integralmente por sua autenticidade e exatidÃ£o, nos termos da legislaÃ§Ã£o vigente.

Por ser expressÃ£o da verdade, firma a presente para os devidos fins legais.

TeresÃ³polis, ${new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})}

______________________________________________________
${rep?.nome || 'Representante Legal'}
${rep?.cargo || 'Presidente'}
CPF: ${rep?.cpf || ''}
${inst.nome_fantasia || inst.nome_completo || 'TEIAA'}`,
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
  // Aba Arquivos (antigo Documentos)
  const [docsArquivo, setDocsArquivo] = useState([])
  const [mostrarFormArquivo, setMostrarFormArquivo] = useState(false)
  const [formArquivo, setFormArquivo] = useState({ titulo:'', descricao:'', categoria: CATEGORIAS_ARQUIVO[0], publico:true })
  const [arquivoUpload, setArquivoUpload] = useState(null)
  const [uploadando, setUploadando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [docsRes, instRes, dirRes, arqRes] = await Promise.all([
      supabase.from('documentos_fiscais').select('*').order('criado_em', { ascending:false }),
      supabase.from('instituicao').select('*').limit(1).single(),
      supabase.from('diretoria').select('*').eq('cargo', 'Presidente').eq('ativo', true).limit(1).single(),
      supabase.from('documentos').select('*').order('criado_em', { ascending:false }),
    ])
    setDocs(docsRes.data || [])
    setInstituicao(instRes.data || {})
    setRepresentante(dirRes.data || null)
    setDocsArquivo(arqRes.data || [])
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
    setMsg('Documento salvo!')
    setMostrarForm(false)
    setForm({ titulo:'', tipo:'', aba:'institucional', vencimento:'', emitido_em:'', observacoes:'', publico:false })
    setArquivo(null)
    carregar()
    setSalvando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function excluir(id) {
    if (!(await confirmar('Excluir este documento?', { titulo:'Excluir documento', confirmarLabel:'Excluir' }))) return
    await supabase.from('documentos_fiscais').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  async function uploadArquivo(e) {
    e.preventDefault()
    if (!arquivoUpload) { setMsg('Selecione um arquivo.'); return }
    setUploadando(true)
    try {
      const ext = arquivoUpload.name.split('.').pop()
      const nomeArq = `${Date.now()}-${arquivoUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from('documentos').upload(nomeArq, arquivoUpload, { upsert:false })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(nomeArq)
      await supabase.from('documentos').insert({
        titulo: formArquivo.titulo,
        descricao: formArquivo.descricao || null,
        categoria: formArquivo.categoria,
        arquivo_url: urlData.publicUrl,
        arquivo_nome: arquivoUpload.name,
        tamanho_kb: Math.round(arquivoUpload.size / 1024),
        publico: formArquivo.publico,
      })
      setMsg('Arquivo publicado!')
      setFormArquivo({ titulo:'', descricao:'', categoria: CATEGORIAS_ARQUIVO[0], publico:true })
      setArquivoUpload(null)
      setMostrarFormArquivo(false)
      carregar()
    } catch(err) { setMsg('Erro: ' + err.message) }
    setUploadando(false)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  async function excluirArquivo(doc) {
    if (!(await confirmar(`Excluir "${doc.titulo}"?`, { titulo:'Excluir arquivo', confirmarLabel:'Excluir' }))) return
    const nomeArq = doc.arquivo_url?.split('/').pop()
    if (nomeArq) await supabase.storage.from('documentos').remove([nomeArq])
    await supabase.from('documentos').delete().eq('id', doc.id)
    carregar()
  }

  async function alternarPublico(doc) {
    await supabase.from('documentos').update({ publico: !doc.publico }).eq('id', doc.id)
    carregar()
  }

  const fmtTamanho = n => n >= 1024 ? (n/1024).toFixed(1) + ' MB' : n + ' KB'

  function gerarDeclaracoesPDF() {
    if (declaracoesSel.length === 0) { setMsg('Selecione ao menos uma declaraÃ§Ã£o.'); return }
    const conteudo = declaracoesSel.map(tipo => {
      const fn = TEXTOS_DECLARACOES[tipo]
      return fn ? fn(instituicao, representante) : `${tipo}\n\n[Texto nÃ£o disponÃ­vel]`
    }).join('\n\n' + '='.repeat(80) + '\n\n')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Inter, Arial, sans-serif; font-size: 12px; color: #171A1F; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4 portrait; margin: 0; }
      @media print { body { background: #fff; } }
      .decl-pg { width: 210mm; min-height: 297mm; padding: 18mm 20mm; margin: 0 auto; border-left: 5px solid #0E7EA8; page-break-after: always; }
      .decl-pg:last-child { page-break-after: auto; }
      .logo-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0E7EA8; padding-bottom: 11px; margin-bottom: 36px; }
      .logo-name { font-size: 15px; font-weight: 900; color: #06344F; letter-spacing: .04em; }
      .logo-sub { font-size: 8px; color: #888; margin-top: 2px; }
      .logo-right { text-align: right; font-size: 9px; color: #5F6874; max-width: 220px; line-height: 1.5; }
      h2 { font-size: 12px; font-weight: 700; text-align: center; color: #06344F; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 8px; line-height: 1.5; }
      .decl-subtitle { text-align: center; font-size: 10px; color: #626B76; margin-bottom: 40px; }
      pre { white-space: pre-wrap; font-family: Georgia, 'Times New Roman', serif; font-size: 12px; line-height: 1.85; color: #303842; }
      .decl-date { font-size: 11px; color: #303842; margin: 32px 0 48px; }
      .decl-assin { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 8px; }
      .assin-item { text-align: center; }
      .assin-line { height: 44px; border-bottom: 1px solid #9199A2; margin-bottom: 7px; }
      .assin-name { font-size: 10px; font-weight: 700; color: #06344F; }
      .assin-role { font-size: 9px; color: #626B76; margin-top: 2px; }
      .decl-footer { margin-top: 32px; border-top: 1px solid #D7D0C2; padding-top: 9px; display: flex; justify-content: space-between; color: #66717E; font-size: 8.5px; }
      .decl-footer strong { color: #06344F; }
      .decl-nota { font-size: 8.5px; color: #9199A2; margin-top: 3px; font-style: italic; }
    </style></head><body>
    ${declaracoesSel.map(tipo => {
      const fn = TEXTOS_DECLARACOES[tipo]
      const texto = fn ? fn(instituicao, representante) : `${tipo}\n\n[Texto nÃ£o disponÃ­vel]`
      const linhas = texto.split('\n')
      const titulo = linhas[0]
      const corpo = linhas.slice(1).join('\n')
      return `<div class="decl-pg">
        <div class="logo-row">
          <div><div class="logo-name">TEIAA</div><div class="logo-sub">TeresÃ³polis/RJ</div></div>
          <div class="logo-right">
            <div style="font-size:10px;font-weight:700;color:#20252C">${instituicao?.nome_completo || 'AssociaÃ§Ã£o TEIAA'}</div>
            <div style="font-size:9px;font-weight:700;color:#20252C;margin:2px 0">CNPJ: ${instituicao?.cnpj || '27.837.768/0001-70'}</div>
          </div>
        </div>
        <h2>${titulo}</h2>
        <div class="decl-subtitle">Art. 34 da Lei nÂº 13.019/2014 â€” MROSC</div>
        <pre>${corpo}</pre>
        <div class="decl-date">TeresÃ³polis â€” RJ, _______ de _________________________ de ${new Date().getFullYear()}.</div>
        <div class="decl-assin">
          <div class="assin-item"><div class="assin-line"></div><div class="assin-name">${representante?.nome || '[Nome do Representante Legal]'}</div><div class="assin-role">Presidente / Representante Legal</div></div>
          <div class="assin-item"><div class="assin-line"></div><div class="assin-name">[Nome da Testemunha]</div><div class="assin-role">Testemunha Â· CPF: [CPF]</div></div>
        </div>
        <div class="decl-footer">
          <div>AGENDO Integra Â· GestÃ£o integrada para OSCs<div class="decl-nota">Documento gerado automaticamente â€” verificar dados antes de assinar</div></div>
          <div><strong>TEIAA</strong> Â· ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>`
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
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E8E6DE', background:'#FAFAF8' },
    td: { padding:'8px 10px', borderBottom:'0.5px solid #E8E6DE', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
    btn: (bg,cor='#fff') => ({ padding:'6px 14px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', whiteSpace:'nowrap' }),
    input: { width:'100%', fontSize:12, padding:'7px 9px', border:'0.5px solid #D3D1C7', borderRadius:8, boxSizing:'border-box' },
    label: { fontSize:12, color:'#5F5E5A', display:'block', marginBottom:3 },
  }

  const tiposPorAba = { institucional: TIPOS_INSTITUCIONAL, mrosc: TIPOS_MROSC, declaracoes: TIPOS_DECLARACOES, parcerias: [], resolucoes: [] }
  const tipos = tiposPorAba[aba] || []

  return (
    <div style={{ maxWidth:1020, margin:'0 auto' }}>
      <div style={{ padding: '1.25rem 1.5rem' }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Documentos Fiscais e Institucionais</div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
        <div>
<div style={{ fontSize:12, color:'#888780' }}>GestÃ£o centralizada de documentos da organizaÃ§Ã£o</div>
        </div>
        {isAdmin && (
          <button onClick={() => setMostrarForm(!mostrarForm)} style={s.btn(mostrarForm?'#F1EFE8':AZUL, mostrarForm?'#5F5E5A':'#fff')}>
            {mostrarForm ? 'Cancelar' : '+ Adicionar documento'}
          </button>
        )}
      </div>

      {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:'1rem', background:!msg.includes('Erro')?'#F2FAE8':'#FEF2F2', color:!msg.includes('Erro')?'#3B6D11':'#A32D2D' }}>{msg}</div>}

      {/* Form adicionar */}
      {isAdmin && mostrarForm && (
        <div style={{ ...s.card, borderColor:AZUL+'60', marginBottom:'1.25rem' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Adicionar documento</div>
          <form onSubmit={salvar}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={s.label}>TÃ­tulo *</label>
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
                <label style={s.label}>Data de emissÃ£o</label>
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
              <label style={s.label}>ObservaÃ§Ãµes</label>
              <input value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={s.input} />
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
              <input type="checkbox" checked={form.publico} onChange={e=>setForm(f=>({...f,publico:e.target.checked}))} id="publico" />
              <label htmlFor="publico" style={{ fontSize:12 }}>Exibir no Portal de TransparÃªncia</label>
            </div>
            <button type="submit" disabled={salvando} style={s.btn(salvando?'#D3D1C7':AZUL)}>{salvando?'Salvando...':'Salvar'}</button>
          </form>
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding:'6px 14px', fontSize:12, borderRadius:8, border:`0.5px solid ${aba===a.id?'#0E7EA8':'#D3D1C7'}`, background:aba===a.id?'#0E7EA8':'transparent', color:aba===a.id?'#fff':'#5F5E5A', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Gerador de declaraÃ§Ãµes */}
      {aba === 'declaracoes' && (
        <div style={{ ...s.card, borderColor:'#E8E6DE', marginBottom:'1.25rem' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}><i className="ti ti-file" style={{marginRight:4}} /> Gerador de DeclaraÃ§Ãµes</div>
          <div style={{ fontSize:12, color:'#888780', marginBottom:12 }}>
            Selecione as declaraÃ§Ãµes e gere um PDF â€” uma folha por declaraÃ§Ã£o, pronta para impressÃ£o e assinatura.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:6, marginBottom:12 }}>
            {TIPOS_DECLARACOES.filter(t => TEXTOS_DECLARACOES[t]).map(tipo => (
              <label key={tipo} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer', padding:'6px 10px', borderRadius:8, background: declaracoesSel.includes(tipo)?'#E6F1FB':'#F8F7F2', border:`0.5px solid ${declaracoesSel.includes(tipo)?'#0E7EA8':'#E8E6DE'}` }}>
                <input type="checkbox" checked={declaracoesSel.includes(tipo)}
                  onChange={e => setDeclaracoesSel(prev => e.target.checked ? [...prev, tipo] : prev.filter(t=>t!==tipo))} />
                {tipo}
              </label>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={gerarDeclaracoesPDF} style={s.btn(declaracoesSel.length>0?'#0E7EA8':'#D3D1C7')}>
              <i className="ti ti-printer" style={{fontSize:14}} /> Gerar PDF ({declaracoesSel.length} declaraÃ§Ãµes)
            </button>
            <button onClick={() => setDeclaracoesSel(Object.keys(TEXTOS_DECLARACOES))} style={s.btn('#F1EFE8','#5F5E5A')}>Todas</button>
            <button onClick={() => setDeclaracoesSel([])} style={s.btn('#F1EFE8','#5F5E5A')}>Limpar</button>
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      {aba !== 'arquivos' && (
      <div style={s.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
          <div style={{ fontSize:13, fontWeight:500 }}>{ABAS.find(a=>a.id===aba)?.label} ({docsDaAba.length})</div>
          <div style={{ fontSize:11, color:'#888780' }}>{ABAS.find(a=>a.id===aba)?.desc}</div>
        </div>
        {loading ? <div style={{ padding:'1.25rem' }}><div className="skeleton" style={{height:13, width:'42%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'68%', marginBottom:10}} /><div className="skeleton" style={{height:13, width:'55%'}} /></div> :
        docsDaAba.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2.5rem', color:'#888780' }}>
            <div style={{ marginBottom:8 }}><i className="ti ti-folder" style={{fontSize:32, color:'#C8C6BC'}} /></div>
            <div style={{ fontSize:13 }}>Nenhum documento cadastrado nesta aba.</div>
            {isAdmin && <div style={{ fontSize:12, marginTop:4 }}>Clique em "+ Adicionar documento" para comeÃ§ar.</div>}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr>{['TÃ­tulo','Tipo','EmissÃ£o','Vencimento','Status','PÃºblico',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {docsDaAba.map((d,i) => {
                const vencido = d.vencimento && d.vencimento < hoje
                const venceEm30 = d.vencimento && d.vencimento >= hoje && d.vencimento <= new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10)
                return (
                  <tr key={d.id} style={{ background: vencido?'#FEF2F2': venceEm30?'#FFFBF0': i%2===0?'#fff':'#FAFAF8' }}>
                    <td style={{ ...s.td, fontWeight:500 }}>
                      {d.arquivo_url ? (
                        <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer" style={{ color:AZUL, textDecoration:'none' }}><i className="ti ti-paperclip" style={{marginRight:4}} /> {d.titulo}</a>
                      ) : d.titulo}
                    </td>
                    <td style={{ ...s.td, color:'#888780' }}>{d.tipo||'â€”'}</td>
                    <td style={{ ...s.td, fontSize:11 }}>{d.emitido_em ? new Date(d.emitido_em+'T12:00:00').toLocaleDateString('pt-BR') : 'â€”'}</td>
                    <td style={{ ...s.td, fontSize:11 }}>
                      {d.vencimento ? (
                        <span style={{ color: vencido?VERMELHO: venceEm30?LARANJA:'inherit', fontWeight: (vencido||venceEm30)?600:400 }}>
                          {new Date(d.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}
                          {vencido && ' Vencido'}
                          {venceEm30 && ' Vence em breve'}
                        </span>
                      ) : 'â€”'}
                    </td>
                    <td style={s.td}>
                      <span style={s.badge(vencido?'#FEF2F2':venceEm30?'#FAEEDA':'#EAF3DE', vencido?VERMELHO:venceEm30?LARANJA:VERDE)}>
                        {vencido?'Vencido':venceEm30?'AtenÃ§Ã£o':'VÃ¡lido'}
                      </span>
                    </td>
                    <td style={s.td}><span style={s.badge(d.publico?'#EAF3DE':'#F1EFE8', d.publico?VERDE:'#888780')}>{d.publico?'Sim':'NÃ£o'}</span></td>
                    <td style={s.td}>
                      {isAdmin && <button onClick={() => excluir(d.id)} style={{ ...{ ...s.btn('#FEF2F2',VERMELHO), background:'transparent', border:'none', color:'#C0392B' }, fontSize:11 }}>Excluir</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      )}

      {/* Aba Arquivos */}
      {aba === 'arquivos' && (
        <div>
          <div style={{ background:'#E6F1FB', border:'0.5px solid #B3D1F0', borderRadius:10, padding:'.75rem 1rem', marginBottom:'1.25rem', fontSize:12, color:'#185FA5' }}>
            <strong>â„¹</strong> Documentos marcados como <strong>PÃºblicos</strong> aparecem no Portal de TransparÃªncia.
          </div>
          {isAdmin && (
            <div style={{ marginBottom:'1.25rem' }}>
              <button onClick={() => setMostrarFormArquivo(!mostrarFormArquivo)} style={s.btn(mostrarFormArquivo?'#F1EFE8':AZUL, mostrarFormArquivo?'#5F5E5A':'#fff')}>
                {mostrarFormArquivo ? 'Cancelar' : '+ Publicar arquivo'}
              </button>
            </div>
          )}
          {isAdmin && mostrarFormArquivo && (
            <div style={{ ...s.card, borderColor:AZUL+'60', marginBottom:'1.25rem' }}>
              <form onSubmit={uploadArquivo}>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10, marginBottom:10 }}>
                  <div><label style={s.label}>TÃ­tulo *</label>
                    <input value={formArquivo.titulo} onChange={e=>setFormArquivo(f=>({...f,titulo:e.target.value}))} required style={s.input} placeholder="Ex: RelatÃ³rio Anual 2025" /></div>
                  <div><label style={s.label}>Categoria</label>
                    <select value={formArquivo.categoria} onChange={e=>setFormArquivo(f=>({...f,categoria:e.target.value}))} style={s.input}>
                      {CATEGORIAS_ARQUIVO.map(c=><option key={c} value={c}>{c}</option>)}
                    </select></div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={s.label}>DescriÃ§Ã£o</label>
                  <input value={formArquivo.descricao} onChange={e=>setFormArquivo(f=>({...f,descricao:e.target.value}))} style={s.input} placeholder="Breve descriÃ§Ã£o..." />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10, marginBottom:12 }}>
                  <div><label style={s.label}>Arquivo (PDF, DOCX, XLSX, imagem) *</label>
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e=>setArquivoUpload(e.target.files[0])} style={{ ...s.input, padding:'5px 9px' }} required />
                    {arquivoUpload && <div style={{ fontSize:11, color:'#888780', marginTop:3 }}>{arquivoUpload.name} Â· {fmtTamanho(Math.round(arquivoUpload.size/1024))}</div>}
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer' }}>
                      <input type="checkbox" checked={formArquivo.publico} onChange={e=>setFormArquivo(f=>({...f,publico:e.target.checked}))} />
                      VisÃ­vel na transparÃªncia
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={uploadando} style={s.btn(uploadando?'#D3D1C7':AZUL)}>
                  {uploadando ? 'Publicando...' : 'â¬† Publicar'}
                </button>
              </form>
            </div>
          )}
          <div style={s.card}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:'.85rem' }}>Arquivos publicados ({docsArquivo.length})</div>
            {docsArquivo.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#888780', fontSize:12 }}>Nenhum arquivo publicado ainda.</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['TÃ­tulo','Categoria','Arquivo','Tamanho','Visibilidade','Data',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {docsArquivo.map(doc => (
                    <tr key={doc.id}>
                      <td style={{ ...s.td, fontWeight:500 }}>
                        <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" style={{ color:AZUL, textDecoration:'none' }}><i className="ti ti-file" style={{marginRight:4}} /> {doc.titulo}</a>
                      </td>
                      <td style={s.td}><span style={s.badge('#E6F1FB','#185FA5')}>{doc.categoria}</span></td>
                      <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{doc.arquivo_nome}</td>
                      <td style={{ ...s.td, color:'#888780' }}>{doc.tamanho_kb ? fmtTamanho(doc.tamanho_kb) : 'â€”'}</td>
                      <td style={s.td}>
                        {isAdmin ? (
                          <button onClick={() => alternarPublico(doc)} style={{ ...s.badge(doc.publico?'#EAF3DE':'#F1EFE8', doc.publico?'#3B6D11':'#5F5E5A'), border:'none', cursor:'pointer' }}>
                            {doc.publico ? 'PÃºblico' : 'Privado'}
                          </button>
                        ) : (
                          <span style={s.badge(doc.publico?'#EAF3DE':'#F1EFE8', doc.publico?'#3B6D11':'#5F5E5A')}>{doc.publico?'PÃºblico':'Privado'}</span>
                        )}
                      </td>
                      <td style={{ ...s.td, color:'#888780', fontSize:11 }}>{new Date(doc.criado_em).toLocaleDateString('pt-BR')}</td>
                      <td style={s.td}>
                        {isAdmin && <button onClick={() => excluirArquivo(doc)} style={{ ...s.btn('#FEF2F2',VERMELHO), background:'transparent', border:'none', color:'#C0392B' }}>Excluir</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
      </div>
  )
}
