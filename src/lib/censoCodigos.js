// =====================================================================
// Censo SUAS — códigos da questão 37 (equipe) e a tradução da Equipe da
// TEIAA para eles. Usado pela tela do Censo (CensoSuas) e pelo link público
// do administrativo (CensoEquipeLink).
// =====================================================================
import { areaPelaFuncao } from './areas'

export const rotulo = (lista, cod) => (lista.find(([c]) => c === cod) || [, ''])[1]
export const codigoDe = (lista, txt) => (lista.find(([, t]) => t === txt) || [''])[0]

// ---------------------------------------------------------------------
// Códigos da questão 37 (legenda da pág. 11 do formulário)
// ---------------------------------------------------------------------
export const ESCOLARIDADE = ['Sem Escolaridade','Ensino Fundamental Incompleto','Ensino Fundamental Completo','Ensino Médio Incompleto','Ensino Médio Completo','Ensino Superior Incompleto','Ensino Superior Completo','Especialização','Mestrado','Doutorado']
  .map((t, i) => [String(i), t])
export const PROFISSAO = ['Assistente Social','Psicóloga(o)','Pedagoga(o)','Advogada(o)','Administrador(a)','Antropóloga(o)','Socióloga(o)','Fisioterapeuta','Cientista política(o)','Nutricionista','Médica(o)','Musicoterapeuta','Terapeuta Ocupacional','Economista','Economista Doméstica(o)','Enfermeira(o)','Analista de sistema','Programador(a)','Outro profissional de nível superior','Profissional de nível médio','Sem formação profissional']
  .map((t, i) => [String(i + 1), t])
export const VINCULO = ['Comissionado','Servidor/Estatutário','Servidor Temporário','Empregado Público Celetista – CLT','Terceirizado','Empregado Celetista do setor privado – CLT','Outro vínculo não permanente','Voluntário']
  .map((t, i) => [String(i + 1), t])
export const FUNCAO = ['Coordenador(a)','Técnico(a) de Nível Superior','Cuidador(a) social','Auxiliar de Cuidador','Educador(a) Social','Apoio administrativo','Estagiário(a)','Serviços Gerais','Outros']
  .map((t, i) => [String(i + 1), t])
export const CARGA = ['Até 10 horas semanais','De 11 a 20 horas semanais','De 21 a 30 horas semanais','De 31 a 40 horas semanais','De 41 a 44 horas semanais','Mais de 44 horas semanais']
  .map((t, i) => [String(i + 1), t])
export const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

// Equipe (cadastro da TEIAA) → códigos do Censo. É só sugestão: dá pra trocar na tela.
// Atenção: a ordem dos vínculos do Centro Dia é diferente da do Centro de Convivência.
export const VINCULO_DA_EQUIPE = {
  'CLT / Funcionário próprio da TEIAA': '6',
  'Servidor público / cedido por órgão público': '2',
  'POT / Programa da Prefeitura': '7',
  'Voluntário': '8',
  'Jovem aprendiz / CAMP': '6',
  'Apenado / Cumpridor de medida / CPMA': '7',
  'Prestador de serviço': '7',
  'Estagiário': '7',
  'Colaborador parceiro': '7',
  'Diretoria / Membro institucional': '8',
}
export const FUNCAO_DA_EQUIPE = {
  'Coordenação': '1', 'Direção': '1', 'Presidente': '1',
  'Assistente Social': '2', 'Pedagoga': '2', 'Psicóloga': '2',
  'Cuidador(a)': '3',
  'Professor(a)': '5', 'Apoio socioeducativo': '5', 'Recreador(a)': '5', 'Facilitador(a) de grupo': '5',
  'Oficineiro(a)': '5', 'Voluntário de atividade': '5',
  'Auxiliar de escritório': '6', 'Apoio administrativo': '6',
  'Cozinheiro(a)': '8', 'Zelador(a)': '8', 'Apoio operacional': '8',
}
// profissão pela função (palavra-chave). Neuropsicopedagogia/psicomotricidade
// ficam em branco de propósito: a formação de base varia — a pessoa escolhe.
export const PROFISSAO_POR_PALAVRA = [
  [['assistente social'], '1'], [['psicolog'], '2'], [['pedagog'], '3'], [['advog'], '4'], [['administrad'], '5'],
  [['fisioterap'], '8'], [['nutri'], '10'], [['medic'], '11'], [['musicoterap'], '12'], [['ocupacional'], '13'],
  [['enfermeir'], '16'], [['fono'], '19'],
]
export const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export function profissaoDaFuncao(funcao) {
  const f = semAcento(funcao)
  if (f.includes('neuropsicopedagog') || f.includes('psicopedagog') || f.includes('psicomotric')) return ''
  return (PROFISSAO_POR_PALAVRA.find(([ch]) => ch.some(c => f.includes(c))) || [, ''])[1]
}
export const DIAS_DA_EQUIPE = { 'Segunda a sexta': 5, 'Segunda, quarta e sexta': 3, 'Terça e quinta': 2, 'Finais de semana': 2 }
// quem normalmente NÃO é equipe do serviço (dá pra marcar na mão)
export const FORA_POR_PADRAO = ['Diretoria / Membro institucional', 'Apenado / Cumpridor de medida / CPMA']

export function cargaCenso(carga, dias) {
  const h = parseInt(carga)
  if (!h) return ''
  const sem = h * (DIAS_DA_EQUIPE[dias] || 5)
  if (sem <= 10) return '1'
  if (sem <= 20) return '2'
  if (sem <= 30) return '3'
  if (sem <= 40) return '4'
  if (sem <= 44) return '5'
  return '6'
}

// ---------------------------------------------------------------------
// Dados PESSOAIS moram na Equipe (ficha oficial). O Censo lê de lá e, o que
// for preenchido aqui, grava de volta lá (ver sincronizarEquipe). Os códigos
// do Censo (vínculo, função, carga, profissão) ficam só no Censo.
// [campo no Censo, coluna na Equipe]
// ---------------------------------------------------------------------
export const PESSOAIS = [['nome', 'nome'], ['cpf', 'cpf'], ['nascimento', 'data_nascimento'], ['inicio', 'data_entrada'],
  ['sexo', 'sexo'], ['rg_numero', 'rg_numero'], ['rg_orgao', 'rg_orgao'], ['rg_uf', 'rg_uf'], ['email', 'email']]
export const escolaridadeCod = txt => (ESCOLARIDADE.find(([, t]) => t === txt) || [''])[0]

export function dadosPessoaisDaEquipe(p) {
  const out = Object.fromEntries(PESSOAIS.map(([c, col]) => [c, p[col] || '']))
  if (!out.rg_uf) out.rg_uf = 'RJ'
  return out
}
// valor que vai pra coluna da Equipe (escolaridade e formação vão por extenso)
export function pessoaisParaEquipe(p) {
  const out = Object.fromEntries(PESSOAIS.map(([c, col]) => [col, p[c] || '']))
  out.escolaridade = p.escolaridade ? rotulo(ESCOLARIDADE, p.escolaridade) : ''
  out.formacao = p.profissao ? rotulo(PROFISSAO, p.profissao) : ''
  return out
}

export function pessoaDaEquipe(p) {
  const prof = codigoDe(PROFISSAO, p.formacao) || profissaoDaFuncao(p.funcao)
  let funcao = FUNCAO_DA_EQUIPE[p.funcao] || (areaPelaFuncao(p.funcao) ? '2' : '9')
  if (p.tipo_vinculo === 'Estagiário') funcao = '7'
  return {
    equipe_id: p.id,
    incluir: !FORA_POR_PADRAO.includes(p.tipo_vinculo),
    ...dadosPessoaisDaEquipe(p),
    escolaridade: escolaridadeCod(p.escolaridade) || (prof && prof !== '20' && prof !== '21' ? '6' : ''), profissao: prof,
    vinculo: VINCULO_DA_EQUIPE[p.tipo_vinculo] || '', funcao,
    carga: cargaCenso(p.carga_horaria, p.dias_atuacao),
    ref: `${p.funcao || '—'} · ${p.tipo_vinculo || '—'} · ${p.carga_horaria || '—'}`,
  }
}

// ---------------------------------------------------------------------
// Fichas da equipe vindas do link (censo_equipe_abrir): CPF/RG chegam
// mascarados (cpf_mask / rg_mask) e os campos cpf / rg_numero ficam vazios
// — só são preenchidos se a pessoa for corrigir.
// ---------------------------------------------------------------------
export const novoMid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))
export const so = t => String(t || '').replace(/\D/g, '')
export const mascaraCpf = t => so(t).length === 11 ? `***.${so(t).slice(3, 6)}.${so(t).slice(6, 9)}-**` : (t ? '•••' + String(t).slice(-3) : '')
export const mascaraDoc = t => t ? '•••' + String(t).replace(/\s/g, '').slice(-3) : ''
export const cheio = v => v != null && v !== ''

// o que o Censo exige de cada pessoa (e-mail é opcional)
export const OBRIGATORIOS = [['nascimento', 'nascimento'], ['sexo', 'sexo'], ['cpf', 'CPF'], ['rg', 'RG'], ['escolaridade', 'escolaridade'], ['profissao', 'formação'], ['vinculo', 'vínculo'], ['funcao', 'função'], ['carga', 'carga horária'], ['inicio', 'início na função']]
export function faltando(p) {
  return OBRIGATORIOS.filter(([c]) => {
    if (c === 'cpf') return !p.cpf && !p.cpf_mask
    if (c === 'rg') return !p.rg_numero && !p.rg_mask
    return !cheio(p[c])
  }).map(([, t]) => t)
}

// monta a ficha a partir do que o banco devolveu (Equipe + o que já está no Censo)
export function fichaDaEquipe(e) {
  const sug = pessoaDaEquipe({
    id: e.equipe_id, nome: e.nome, funcao: e.funcao_equipe, tipo_vinculo: e.tipo_vinculo, carga_horaria: e.carga_horaria, dias_atuacao: e.dias_atuacao,
    escolaridade: e.escolaridade_txt, formacao: e.formacao_txt, data_nascimento: e.nascimento, data_entrada: e.inicio,
    sexo: e.sexo, rg_orgao: e.rg_orgao, rg_uf: e.rg_uf, email: e.email,
  })
  const doCenso = Object.fromEntries(Object.entries(e.censo || {}).filter(([, v]) => cheio(v)))
  const f = { ...sug, ...doCenso }
  // a Equipe é a ficha oficial dos dados pessoais
  for (const [c, v] of [['nascimento', e.nascimento], ['inicio', e.inicio], ['sexo', e.sexo], ['rg_orgao', e.rg_orgao], ['rg_uf', e.rg_uf], ['email', e.email]]) if (cheio(v)) f[c] = v
  if (e.escolaridade_txt) f.escolaridade = codigoDe(ESCOLARIDADE, e.escolaridade_txt) || f.escolaridade
  if (e.formacao_txt) f.profissao = codigoDe(PROFISSAO, e.formacao_txt) || f.profissao
  return { ...f, equipe_id: e.equipe_id, nome: e.nome, funcao_equipe: e.funcao_equipe, cpf: '', rg_numero: '', cpf_mask: e.cpf_mask, rg_mask: e.rg_mask, incluir: e.censo?.incluir ?? sug.incluir, link_em: e.censo?.link_em }
}
export const fichaManual = m => ({ ...m, cpf: '', rg_numero: '', incluir: m.incluir ?? true })


// Pessoa incluída direto no Censo responde no formato da Equipe (RH): função,
// vínculo, carga por dia e dias. Os códigos do MDS saem daqui, do mesmo jeito
// que saem pra quem já está na Equipe (a tradução RH -> Censo é exata).
export function codigosDaCasa(casa = {}) {
  const p = pessoaDaEquipe({ funcao: casa.funcao, tipo_vinculo: casa.tipo_vinculo, carga_horaria: casa.carga_horaria, dias_atuacao: casa.dias_atuacao })
  return { vinculo: p.vinculo, funcao: casa.funcao ? p.funcao : '', carga: p.carga, profissao: p.profissao }
}
