import React, { useState, useEffect, useRef, useMemo, useContext, createContext } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAll } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { areaPelaFuncao } from '../lib/areas'

// =====================================================================
// Censo SUAS — Questionário "Centro Dia e outras unidades de habilitação e
// reabilitação de pessoas com deficiência" (é o que a TEIAA responde como
// OSC que atende pessoas com deficiência). Mesmo modelo do Censo da CAPETTE:
// uma tela por bloco, os "pule para a questão X" funcionam sozinhos, e o que
// o sistema já sabe (Instituição, Equipe, atendidos, atendimentos de agosto,
// parcerias) vem preenchido.
//
// Tudo fica salvo em `censo_suas.respostas` (jsonb) — ver sql_censo_suas.sql.
// No ano seguinte, o censo novo parte das respostas do anterior.
// Admin e operacional.
//
// No fim: resumo numerado (pra digitar no sistema do MDS) e versão impressa
// no formato do papel, com as assinaturas.
//
// TODO ANUAL: trocar ANO / MES_REF / MES_INI / MES_FIM e conferir BLOCOS
// com o PDF novo (o questionário muda um pouco todo ano).
// =====================================================================

const ANO = 2026
const MES_REF = 'agosto de 2026'
const MES_INI = '2026-08-01', MES_FIM = '2026-08-31'
const TIPO = 'centro_dia'

const AZUL = '#0E7EA8', ESCURO = '#06344F', CINZA = '#5F5E5A', VERDE = '#3B6D11', LARANJA = '#854F0B', VERMELHO = '#A32D2D'

// ---------------------------------------------------------------------
// Códigos da questão 37 (legenda da pág. 11 do formulário)
// ---------------------------------------------------------------------
const ESCOLARIDADE = ['Sem Escolaridade','Ensino Fundamental Incompleto','Ensino Fundamental Completo','Ensino Médio Incompleto','Ensino Médio Completo','Ensino Superior Incompleto','Ensino Superior Completo','Especialização','Mestrado','Doutorado']
  .map((t, i) => [String(i), t])
const PROFISSAO = ['Assistente Social','Psicóloga(o)','Pedagoga(o)','Advogada(o)','Administrador(a)','Antropóloga(o)','Socióloga(o)','Fisioterapeuta','Cientista política(o)','Nutricionista','Médica(o)','Musicoterapeuta','Terapeuta Ocupacional','Economista','Economista Doméstica(o)','Enfermeira(o)','Analista de sistema','Programador(a)','Outro profissional de nível superior','Profissional de nível médio','Sem formação profissional']
  .map((t, i) => [String(i + 1), t])
const VINCULO = ['Comissionado','Servidor/Estatutário','Servidor Temporário','Empregado Público Celetista – CLT','Terceirizado','Empregado Celetista do setor privado – CLT','Outro vínculo não permanente','Voluntário']
  .map((t, i) => [String(i + 1), t])
const FUNCAO = ['Coordenador(a)','Técnico(a) de Nível Superior','Cuidador(a) social','Auxiliar de Cuidador','Educador(a) Social','Apoio administrativo','Estagiário(a)','Serviços Gerais','Outros']
  .map((t, i) => [String(i + 1), t])
const CARGA = ['Até 10 horas semanais','De 11 a 20 horas semanais','De 21 a 30 horas semanais','De 31 a 40 horas semanais','De 41 a 44 horas semanais','Mais de 44 horas semanais']
  .map((t, i) => [String(i + 1), t])
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

// Equipe (cadastro da TEIAA) → códigos do Censo. É só sugestão: dá pra trocar na tela.
// Atenção: a ordem dos vínculos do Centro Dia é diferente da do Centro de Convivência.
const VINCULO_DA_EQUIPE = {
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
const FUNCAO_DA_EQUIPE = {
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
const PROFISSAO_POR_PALAVRA = [
  [['assistente social'], '1'], [['psicolog'], '2'], [['pedagog'], '3'], [['advog'], '4'], [['administrad'], '5'],
  [['fisioterap'], '8'], [['nutri'], '10'], [['medic'], '11'], [['musicoterap'], '12'], [['ocupacional'], '13'],
  [['enfermeir'], '16'], [['fono'], '19'],
]
const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
function profissaoDaFuncao(funcao) {
  const f = semAcento(funcao)
  if (f.includes('neuropsicopedagog') || f.includes('psicopedagog') || f.includes('psicomotric')) return ''
  return (PROFISSAO_POR_PALAVRA.find(([ch]) => ch.some(c => f.includes(c))) || [, ''])[1]
}
const DIAS_DA_EQUIPE = { 'Segunda a sexta': 5, 'Segunda, quarta e sexta': 3, 'Terça e quinta': 2, 'Finais de semana': 2 }
// quem normalmente NÃO é equipe do serviço (dá pra marcar na mão)
const FORA_POR_PADRAO = ['Diretoria / Membro institucional', 'Apenado / Cumpridor de medida / CPMA']

function cargaCenso(carga, dias) {
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
const PESSOAIS = [['nome', 'nome'], ['cpf', 'cpf'], ['nascimento', 'data_nascimento'], ['inicio', 'data_entrada'],
  ['sexo', 'sexo'], ['rg_numero', 'rg_numero'], ['rg_orgao', 'rg_orgao'], ['rg_uf', 'rg_uf'], ['email', 'email']]
const escolaridadeCod = txt => (ESCOLARIDADE.find(([, t]) => t === txt) || [''])[0]

function dadosPessoaisDaEquipe(p) {
  const out = Object.fromEntries(PESSOAIS.map(([c, col]) => [c, p[col] || '']))
  if (!out.rg_uf) out.rg_uf = 'RJ'
  return out
}
// valor que vai pra coluna da Equipe (escolaridade vai por extenso)
function pessoaisParaEquipe(p) {
  const out = Object.fromEntries(PESSOAIS.map(([c, col]) => [col, p[c] || '']))
  out.escolaridade = p.escolaridade ? rotulo(ESCOLARIDADE, p.escolaridade) : ''
  return out
}

function pessoaDaEquipe(p) {
  const prof = profissaoDaFuncao(p.funcao)
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
// O questionário. Cada pergunta: n (número no formulário), k (chave na
// resposta), tipo, opções. `mostrar(r)` faz os "pule para".
//   exclusiva = opção que desmarca as outras ("Não", "Não realiza…")
//   outro     = opção(ões) que pedem texto ("Outros. Qual?")
//   qtd       = opções que pedem quantidade ("Telefone. Quantos?")
//   numeros   → campos [chave, rótulo, máx, {ns: "Não sabe", soma: total automático}]
//   matriz    → linhas × colunas; modo 'unica' (uma por linha) ou 'multi'
// ---------------------------------------------------------------------
const OSC = 'Não Governamental/Organização da Sociedade Civil'
const ehOSC = r => r.q4 === OSC
const SN = ['Sim', 'Não']

const BLOCOS = [
  {
    id: 'b1', titulo: 'Identificação da unidade', curto: 'Identificação',
    nota: 'Caso necessário, atualize no CADSUAS.',
    questoes: [{ tipo: 'ident', k: 'ident' }],
  },
  {
    id: 'b2', titulo: 'Caracterização da unidade', curto: 'Caracterização',
    questoes: [
      { n: '1', k: 'q1', tipo: 'unica', texto: 'Dados provenientes da esfera de gestão estadual ou municipal', ajuda: 'Marcação automática do sistema do MDS — só confira.', opcoes: ['Estadual', 'Municipal/Distrital'] },
      { n: '2', k: 'q2', tipo: 'multi', texto: 'Público atendido nesta Unidade', ajuda: 'Caso necessário, atualize no CADSUAS.',
        opcoes: ['Criança/Adolescentes com deficiência e com algum grau de dependência e suas famílias', 'Adultas(os) com deficiência e com algum grau de dependência e suas famílias', 'Idosas(os) com deficiência e suas famílias', 'Idosas(os) com algum grau de dependência (sem deficiência) e suas famílias'] },
      { n: '3', k: 'q3', tipo: 'numeros', texto: 'Horário de funcionamento', campos: [['dias', 'dias por semana', 7], ['horas', 'horas por dia', 24]] },
      { n: '4', k: 'q4', tipo: 'unica', texto: 'Natureza desta Unidade', ajuda: 'Caso necessário, atualize no CADSUAS. Governamental pula para a questão 10.', opcoes: ['Governamental', OSC] },
      { n: '5', k: 'q5', tipo: 'texto', texto: 'CNPJ da Entidade Não Governamental/Organização da Sociedade Civil', placeholder: '00.000.000/0000-00', mostrar: ehOSC },
      { n: '6', k: 'q6', tipo: 'unica', texto: 'Esta entidade faz parte de alguma rede/federação nacional, estadual ou regional de entidades de defesa e apoio às pessoas com deficiência e suas famílias?', ajuda: 'Inscrição/registro em Conselho de Direitos e obtenção de CEBAS NÃO contam aqui.', opcoes: SN, mostrar: ehOSC },
      { n: '7', k: 'q7', tipo: 'unica', texto: 'Principal rede/federação de que faz parte', mostrar: r => ehOSC(r) && r.q6 === 'Sim', outro: 'Outras',
        opcoes: ['Federação Nacional e/ou Estadual de APAES', 'Federação Nacional e/ou Regional de Associações Pestalozzi', 'Federação Brasileira, Estadual ou Regional das Instituições de Excepcionais (FEBIEX)', 'Associação Brasileira de Autismo', 'Federação Nacional de Educação e Integração dos Surdos (FENEIS)', 'Organização Nacional dos Cegos', 'Organização Nacional de Deficiência Física (ONEDEF)', 'Sociedade São Vicente de Paula', 'Outras'] },
      { n: '8', k: 'q8', tipo: 'multi', texto: 'A entidade recebe recursos financeiros do Fundo de Assistência Social para a execução do serviço de PSE para Pessoas com Deficiência?', mostrar: ehOSC, exclusiva: 'Não',
        opcoes: ['Sim, municipal ou do Distrito Federal', 'Sim, estadual', 'Sim, federal (subvenções/emendas parlamentares)', 'Não'] },
      { n: '9', k: 'q9', tipo: 'multi', texto: 'A entidade recebe outras formas de apoio do poder público municipal, estadual ou do DF? Caso sim, quais?', ajuda: 'Só o apoio DIRETO — não o que já vem do recurso transferido pelo convênio.', mostrar: ehOSC,
        exclusiva: 'Não recebe nenhuma outra forma de apoio do poder público municipal',
        opcoes: ['Não recebe nenhuma outra forma de apoio do poder público municipal', 'Cessão de recursos humanos', 'Cessão de imóvel', 'Isenção de aluguel', 'Isenção de contas de água', 'Isenção de contas de luz ou telefone', 'Fornecimento de gêneros alimentícios', 'Fornecimento de materiais de higiene e limpeza', 'Fornecimento de materiais pedagógicos, culturais, esportivos e outros', 'Isenção de taxas ou tributos municipais (IPTU, IPVA, etc)', 'Treinamento e capacitação de trabalhadores da entidade', 'Outros'] },
      { n: '10', k: 'q10', tipo: 'multi', texto: 'Conselho(s) no(s) qual(is) esta unidade possui inscrição/registro', ajuda: 'Inscrição/registro da ENTIDADE no conselho (municipal, estadual ou do DF) — não é participação de pessoas no conselho.',
        exclusiva: 'Em nenhum dos citados acima', outro: 'Outros',
        opcoes: ['Conselho de Assistência Social', 'Conselho de Direitos da Criança e Adolescente', 'Conselho de Direitos do Idoso', 'Conselho de Direitos da Pessoa com Deficiência', 'Outros', 'Em nenhum dos citados acima'] },
      { n: '11', k: 'q11', tipo: 'unica', texto: 'Este Centro Dia está referenciado a um CREAS?', ajuda: 'Referenciamento = o CREAS coordena/orienta a unidade, com fluxo pactuado, monitoramento e articulação para os encaminhados por ele.',
        opcoes: SN, outro: 'Sim', outroPh: 'Número de identificação do CREAS (11 dígitos)' },
      { n: '12', k: 'q12', tipo: 'multi', texto: 'O CREAS que referencia este Centro Dia realiza quais atividades de referenciamento?', mostrar: r => r.q11 === 'Sim',
        exclusiva: 'Não realiza nenhuma das atividades acima',
        opcoes: ['Coleta/recebe periodicamente informações sobre dados de atendimento do Serviço', 'Realiza reuniões periódicas para avaliação do Serviço com o Centro Dia', 'Participa do processo de planejamento das atividades do Serviço', 'Acompanha cotidianamente as atividades do Serviço', 'Participa da construção de estratégias metodológicas do Serviço', 'Elabora relatórios técnicos específicos sobre casos atendidos/acompanhados pelo Serviço', 'Realiza estudos de caso em parceria com o Serviço', 'Define procedimentos comuns e/ou complementares ao Serviço', 'Possui fluxos de encaminhamentos e trocas de informações com o Serviço', 'Articula com a rede de serviços socioassistenciais', 'Articula com a rede dos serviços das políticas públicas setoriais', 'Articula com os demais órgãos do Sistema de Garantia de Direitos', 'Participa da definição dos critérios de acesso das(os) usuárias(os) ao serviço', 'Não realiza nenhuma das atividades acima'] },
      { n: '13', k: 'q13', tipo: 'matriz', modo: 'multi', texto: 'Em relação a outras políticas públicas, esta unidade…',
        linhas: ['Saúde', 'Educação', 'Outras'], linhaOutro: 'Outras', opcionais: ['Outras'],
        colunas: ['recebe recursos financeiros, visando à sua manutenção', 'compartilha espaços físicos, mas as ofertas são separadas', 'realiza a oferta de forma integrada', 'Nenhuma das anteriores'],
        curtas: ['recebe recursos', 'compartilha espaço', 'oferta integrada', 'nenhuma'], exclusivas: ['Nenhuma das anteriores'] },
    ],
  },
  {
    id: 'b3', titulo: 'Estrutura física', curto: 'Estrutura',
    questoes: [
      { n: '14', k: 'q14', tipo: 'numeros', texto: 'Espaço físico desta Unidade', ajuda: 'Cada sala é contada uma única vez.',
        campos: [['s5', 'Salas de atividades com capacidade máxima de 5 pessoas', 99], ['s6', 'Salas de atividades para 6 a 14 pessoas', 99], ['s15', 'Salas de atividades de 15 a 29 pessoas', 99], ['s30', 'Salas de atividades para 30 ou mais pessoas', 99],
          ['adm', 'Salas EXCLUSIVAS de coordenação, equipe técnica ou administração (não são de atendimento!)', 99], ['btrab', 'Banheiros de uso exclusivo das(os) trabalhadoras(es)', 99], ['busu', 'Banheiros para uso das(os) usuárias(os)', 99]] },
      { n: '14', k: 'q14b', tipo: 'matriz', modo: 'unica', texto: 'Demais ambientes — possui?', colunas: SN,
        linhas: ['Recepção', 'Cozinha/Copa', 'Refeitório', 'Almoxarifado ou similar', 'Piscina', 'Quadra esportiva', 'Espaço externo para atividades de convívio ou recreação (exceto quadra e piscina)', 'Área de Descanso para a(o) usuária(o)'] },
      { n: '15', k: 'q15', tipo: 'matriz', modo: 'unica', texto: 'Condições de acessibilidade para pessoas com deficiência e pessoas idosas',
        colunas: ['SIM, de acordo com a Norma da ABNT (NBR 9050)', 'SIM, mas não estão de acordo com a NBR 9050', 'Não possui'], curtas: ['Sim, NBR 9050', 'Sim, fora da norma', 'Não possui'],
        linhas: ['Acesso principal adaptado com rampas e rota acessível desde a calçada até a recepção no interior da unidade', 'Rota acessível aos espaços da Unidade (recepção, salas de atendimento e espaços de uso coletivo)', 'Rota acessível ao banheiro', 'Banheiro adaptado para pessoas com deficiência e/ou mobilidade reduzida'] },
      { n: '16', k: 'q16', tipo: 'multi', texto: 'Além dos itens acima, há outras adaptações para assegurar a acessibilidade desta unidade?', exclusiva: 'Não há outras adaptações.',
        outro: ['Sim, há outras adaptações ou estratégias para assegurar a acessibilidade às pessoas com deficiência auditiva/surdas e pessoas com deficiência visual', 'Sim, outras adaptações e tecnologias assistivas para deficiência física', 'Sim, outras adaptações e tecnologias assistivas para deficiência intelectual e autismo'],
        opcoes: ['Sim, suporte de profissional com conhecimento em LIBRAS', 'Sim, suporte de material em Braille', 'Sim, suporte para leitores de telas de computador para pessoas com deficiência visual', 'Sim, há outras adaptações ou estratégias para assegurar a acessibilidade às pessoas com deficiência auditiva/surdas e pessoas com deficiência visual', 'Sim, outras adaptações e tecnologias assistivas para deficiência física', 'Sim, outras adaptações e tecnologias assistivas para deficiência intelectual e autismo', 'Sim, pisos especiais com relevos para sinalização voltados para pessoa com deficiência visual', 'Não há outras adaptações.'] },
      { n: '17', k: 'q17', tipo: 'multi', texto: 'Equipamentos e materiais disponíveis, em perfeito funcionamento, para os Serviços desta unidade',
        qtd: ['Telefone', 'Impressora', 'Veículo de uso exclusivo', 'Veículo de uso compartilhado', 'Camas/Colchonetes'],
        opcoes: ['Telefone', 'Celular da Unidade', 'Impressora', 'Televisão (TV)', 'Equipamento de som', 'DVD', 'Datashow', 'Veículo de uso exclusivo', 'Veículo de uso compartilhado', 'Veículo adaptado para o transporte de cadeirantes', 'Acervo bibliográfico (livros)', 'Brinquedos', 'Materiais pedagógicos, culturais e esportivos', 'Armários individualizados para guarda de pertences', 'Artigos de higiene pessoal', 'Cadeira de rodas', 'Cadeiras para banho', 'Geladeira', 'Freezer', 'Fogão', 'Micro-ondas', 'Máquina de lavar roupa', 'Secadora de roupa', 'Camas/Colchonetes', 'Sofás/Poltronas/Cadeiras para descanso', 'Mesas e cadeiras para refeição/refeitório', 'Ar-condicionado', 'Ventilador'] },
      { n: '18', k: 'q18', tipo: 'numeros', texto: 'Computadores em perfeito funcionamento neste Centro Dia', ajuda: 'Se não possui, marque 0.',
        campos: [['total', '18.1 Computadores na unidade', 999], ['internet', '18.2 Computadores conectados à internet', 999], ['usuarios', '18.3 Desses (com internet), quantos ficam disponíveis para as(os) usuárias(os)', 999]] },
      { n: '19', k: 'q19', tipo: 'unica', texto: 'O local é servido por transporte público (ônibus/trem/metrô/barcas)?',
        opcoes: ['Sim, com ponto de transporte a menos de 1000 metros da Unidade (ou quinze minutos de caminhada)', 'Sim, com ponto de transporte entre 1000 e 2000 metros da Unidade (ou até 30 minutos de caminhada)', 'Não possui ponto de transporte público nas proximidades (ou exige caminhada superior a 30 minutos)'] },
    ],
  },
  {
    id: 'b4', titulo: 'Serviços e atividades', curto: 'Serviços',
    questoes: [
      { n: '20', k: 'q20', tipo: 'multi', texto: 'Ações e atividades desenvolvidas no "Serviço de Proteção Social Especial para Pessoas com Deficiência e Pessoas Idosas e suas famílias" nesta Unidade', outro: 'Outra(s)',
        opcoes: ['Acolhida e escuta inicial', 'Estudo social', 'Elaboração de Plano de Acompanhamento Individual e/ou Familiar', 'Realiza atividade de cuidados básicos de vida diária e de autocuidado (higiene, alimentação, descanso)', 'Oficinas e atividades coletivas de convívio e socialização', 'Atividades individualizadas ou em grupos de apoio ao desenvolvimento pessoal e autonomia', 'Colaboração na prática e recomendações de outros profissionais (fisioterapeuta, fonoaudiólogo, professor e outros)', 'Visitas domiciliares', 'Atividades com a família da(o) usuária(o)', 'Apoio e orientação aos(às) cuidadores(as) familiares', 'Orientação e apoio aos cuidadores familiares para o autocuidado', 'Orientação sobre tecnologias assistivas', 'Mobilização das(os) usuárias(os) para acesso ao serviço', 'Orientação sobre acesso ao BPC', 'Orientação sobre o acesso a outros benefícios', 'Orientação e apoio para obtenção de documentação pessoal', 'Orientação para realização de cadastro no Cadastro Único', 'Acompanhamento das(os) usuárias(os) encaminhados para a rede', 'Registro de informações em prontuário', 'Palestras e oficinas envolvendo a comunidade', 'Provimento de bens materiais', 'Realiza atividades de cuidados instrumentais da vida diária (ex. cuidar das próprias finanças, preparar a alimentação)', 'Orientação sobre o Auxílio Inclusão', 'Outra(s)'] },
      { n: '21', k: 'q21', tipo: 'multi', texto: 'Há realização de oficinas? Se sim, quais?', exclusiva: 'Não são realizadas oficinas.', outro: 'Outras atividades',
        opcoes: ['Atividades Esportivas', 'Atividades Artísticas e Culturais (musicalização, dança, teatro, entre outras)', 'Musicalidade (cantar, tocar instrumentos etc.)', 'Artesanato (bijuterias, pintura em tecido, bordado, crochê etc.)', 'Atividades de inclusão digital', 'Atividades de linguagem (produção de texto, contação de histórias, roda de conversa etc.)', 'Atividades que envolvam alimentos (oficinas de culinária, hortas etc.)', 'Jogos e Brincadeiras (jogos de tabuleiro etc.)', 'Atividades de orientação para o mundo do trabalho', 'Passeios e/ou atividades externas', 'Outras atividades', 'Não são realizadas oficinas.'] },
      { n: '22', k: 'q22', tipo: 'numeros', texto: 'Capacidade do Serviço: quantas(os) usuárias(os) por turno?', ajuda: 'Se não houver, marque 0.', campos: [['v', 'usuárias(os) por turno', 99]] },
      { n: '23', k: 'q23', tipo: 'unica', texto: 'Em média, quantos dias por semana as(os) usuárias(os) frequentam este serviço?',
        opcoes: ['Menos que uma vez por semana', 'Um dia por semana', 'Dois a três dias por semana', 'Quatro a cinco dias por semana', 'Mais de cinco dias por semana'] },
      { n: '24', k: 'q24', tipo: 'unica', texto: 'Em média, quantas horas por dia as(os) usuárias(os) permanecem na Unidade (nos dias em que vêm)?',
        opcoes: ['menos de uma hora', 'uma a duas horas', 'três a quatro horas', 'cinco a seis horas', 'sete a oito horas', 'nove a dez horas', 'mais de dez horas'] },
      { n: '25', k: 'q25', tipo: 'unica', texto: 'Em relação às vagas do Serviço de PSE para pessoas com deficiência, idosas(os) e suas famílias:',
        opcoes: ['Todas as vagas são preenchidas por usuárias(os) encaminhadas(os) pelos CREAS de referência', 'A maioria das vagas são preenchidas por usuárias(os) encaminhadas(os) pelos CREAS de referência', 'A minoria das vagas é preenchida por usuárias(os) encaminhadas(os) pelos CREAS de referência', 'As vagas são preenchidas de forma independente, de maneira que os encaminhamentos dos CREAS de referência não são um critério de priorização'] },
      { n: '26', k: 'q26', tipo: 'multi', texto: 'Esta Unidade oferece alimentação às(aos) usuárias(os)?', exclusiva: 'Não oferta alimentação',
        opcoes: ['Lanches/Café da manhã', 'Almoço', 'Lanche/Café da Tarde', 'Jantar', 'Lanche/Café da Noite', 'Não oferta alimentação'] },
      { n: '27', k: 'q27', tipo: 'multi', texto: 'Existe apoio para deslocamento das famílias/indivíduos para a sede desta Unidade? Como?', exclusiva: 'Não fornece apoio.', outro: 'Outros',
        opcoes: ['Não fornece apoio.', 'A unidade possui transporte adaptado e acessível para o deslocamento das(os) usuárias(os)', 'A unidade fornece ajuda de custo (passagens) para o deslocamento das(os) usuárias(os)', 'O poder público fornece gratuidade no transporte público para pessoas com deficiência e idosas', 'O poder público fornece passagens (vale-transporte etc.)', 'O poder público fornece transporte especializado para o deslocamento das(os) usuárias(os)', 'Outros'] },
      { n: '28', k: 'q28', tipo: 'multi', texto: 'Mecanismos de participação utilizados nesta unidade', outro: 'Outros',
        opcoes: ['As(os) usuárias(os) participam das reuniões de planejamento desta unidade', 'Os familiares das(os) usuárias(os) participam das reuniões de planejamento desta unidade', 'As(os) usuárias(os) contam com representante que participa do planejamento desta unidade', 'As(os) usuárias(os) escolhem os temas a serem trabalhados nas atividades coletivas (oficinas/palestras) da unidade', 'A equipe técnica disponibiliza outros meios para avaliação da oferta (questionário de satisfação, pesquisa de opinião, urna de sugestões)', 'Outros'] },
      { n: '29', k: 'q29', tipo: 'unica', texto: 'O serviço mantém lista de espera de usuários?', opcoes: SN },
      { n: '30', k: 'q30', tipo: 'numeros', texto: 'Quantas pessoas estão neste momento em lista de espera?', mostrar: r => r.q29 === 'Sim', campos: [['v', 'pessoas', 999]] },
    ],
  },
  {
    id: 'b5', titulo: 'Perfil das(os) usuárias(os)', curto: 'Perfil',
    nota: `Mês de referência: ${MES_REF}.`,
    questoes: [
      { n: '31', k: 'q31', tipo: 'numeros', texto: `Pessoas com deficiência e/ou dependência atendidas nesta Unidade em ${MES_REF}`, ajuda: 'Se não houver, marque 0.',
        campos: [['c0', 'Crianças de 0 a 6 anos, com deficiência', 999], ['c7', 'Crianças e adolescentes de 7 a 14 anos, com deficiência', 999], ['c15', 'Adolescentes de 15 a 17 anos, com deficiência', 999], ['a18', 'Jovens e adultos(as) (18 a 59 anos) com deficiência', 999],
          ['i60', 'Idosos(as) de 60 a 79 anos, com deficiência', 999], ['i80', 'Idosos(as) com 80 anos ou mais, com deficiência', 999], ['d60', 'Idosos(as) de 60 a 79 anos dependentes pela idade, sem deficiência', 999], ['d80', 'Idosos(as) com 80 anos ou mais, dependentes pela idade, sem deficiência', 999],
          ['total', `Total de pessoas atendidas no Serviço em ${MES_REF}`, 9999, { soma: true }]] },
      { n: '32', k: 'q32', tipo: 'numeros', texto: `Pessoas segundo o tipo de deficiência em ${MES_REF}`, ajuda: 'Deficiência múltipla: marque TODAS as deficiências da pessoa. Nenhuma linha pode passar do total da Q31. Se não houver, marque 0.',
        campos: [['fisica', 'Deficiência Física', 999, { ns: true }], ['visual', 'Deficiência Visual', 999, { ns: true }], ['auditiva', 'Deficiência Auditiva', 999, { ns: true }], ['intelectual', 'Deficiência Intelectual', 999, { ns: true }],
          ['psicossocial', 'Deficiência Psicossocial', 999, { ns: true }], ['tea', 'Transtorno do Espectro Autista (TEA)', 999, { ns: true }], ['zika', 'Microcefalia decorrente de Zika', 999, { ns: true }]] },
      { n: '33', k: 'q33', tipo: 'numeros', texto: `Dentre as(os) usuárias(os) atendidas(os) em ${MES_REF}:`, ajuda: 'Se não houver, marque 0.',
        campos: [['idosos_bpc', 'Pessoas idosas beneficiárias do BPC', 999, { ns: true }], ['pcd_bpc', 'Pessoas com deficiência beneficiárias do BPC', 999, { ns: true }], ['pensao', 'Pessoas que recebem pensão/aposentadoria', 999, { ns: true }], ['microcefalia', 'Pessoas que recebem a Pensão Especial por Microcefalia', 999, { ns: true }]] },
      { n: '34', k: 'q34', tipo: 'numeros', texto: 'Atualmente, em média, quantos usuários ficam na unidade em:', ajuda: 'Se não houver, marque 0.',
        campos: [['integral', 'Período integral', 999, { ns: true }], ['meio', 'Meio período', 999, { ns: true }], ['menos', 'Menos do que meio período', 999, { ns: true }]] },
      { n: '35', k: 'q35', tipo: 'matriz', modo: 'multi', texto: 'Ações de articulação deste Centro Dia com serviços, programas ou instituições do município',
        linhas: ['Unidades de Acolhimento', 'CRAS', 'CREAS', 'Serviços de Saúde', 'Serviços de Educação', 'Sistema de Justiça/Judiciário', 'Organizações e Entidades de Garantia e Defesa de Direitos das pessoas com Deficiência e/ou Idosas', 'Unidades e Projetos de Qualificação para o mundo do trabalho'],
        colunas: ['Possui dados de localização (endereço, telefone, etc.)', 'Recebe usuárias(os) encaminhadas(os) por este Centro Dia', 'Encaminha usuárias(os) para este Centro Dia', 'Acompanha os encaminhamentos', 'Realiza reuniões periódicas', 'Troca informações', 'Realiza estudos de caso em conjunto', 'Desenvolve atividades em parceria', 'Não tem nenhuma articulação', 'Serviço ou instituição não existente no Município ou no DF'],
        curtas: ['tem contato', 'recebe nossos encaminhados', 'nos encaminha', 'acompanha encaminhamentos', 'reuniões periódicas', 'troca informações', 'estudos de caso', 'atividades em parceria', 'nenhuma articulação', 'não existe no município'],
        exclusivas: ['Não tem nenhuma articulação', 'Serviço ou instituição não existente no Município ou no DF'] },
    ],
  },
  {
    id: 'b6', titulo: 'Gestão de pessoas', curto: 'Equipe',
    questoes: [
      { n: '36', k: 'q36', tipo: 'unica', texto: 'O(a) coordenador(a) desta Unidade:',
        opcoes: ['Exerce exclusivamente a função de coordenadora(or)', 'Acumula as funções de coordenadora(or) e de técnica(o) nesta Unidade', 'Acumula as funções de coordenadora(or) com outra atividade', 'Não há coordenadora(or) nesta Unidade'] },
      { n: '37', k: 'equipe', tipo: 'equipe', texto: 'Equipe desta Unidade' },
    ],
  },
  {
    id: 'b7', titulo: 'Responsável pelo preenchimento', curto: 'Responsáveis',
    questoes: [{ tipo: 'responsaveis', k: 'resp' }],
  },
]

const SEM_COORD = 'Não há coordenadora(or) nesta Unidade'
const CARGO_RESP = ['Coordenador(a) da unidade', 'Técnica(o) de nível superior da unidade', 'Outros']
const CARGO_GESTOR = ['Secretária(o) Municipal/Estadual de Assistência Social ou congênere', 'Diretor(a)/Coordenador(a)/Responsável pela área de proteção social especial no município ou estado', 'Técnica(o) da Secretaria Municipal e/ou Estadual de Assistência Social ou congênere', 'Outros']
const TIPOS_LOGRADOURO = ['Rua', 'Avenida', 'Praça', 'Estrada', 'Travessa', 'Alameda', 'Rodovia', 'Largo', 'Outro']
// Questões com sugestão do sistema (mostram a faixa verde)
const COM_SUGESTAO = ['q1', 'q2', 'q4', 'q5', 'q8', 'q10', 'q20', 'q31', 'q32', 'q33']

// ---------------------------------------------------------------------
// utilidades
// ---------------------------------------------------------------------
const vazio = v => v == null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(x => x === '' || x == null))
const fmtData = d => d ? d.split('-').reverse().join('/') : ''
const rotulo = (lista, cod) => (lista.find(([c]) => c === cod) || [, ''])[1]
const visivel = (q, r) => !q.mostrar || q.mostrar(r)
const pedeTexto = (q, o) => Array.isArray(q.outro) ? q.outro.includes(o) : q.outro === o
const qual = (r, q, o) => (r[q.k + '_qual'] || {})[o] || ''
const num = v => (v === '' || v == null) ? null : Number(v)
const somaCampos = (q, v) => q.campos.filter(([, , , o]) => !o?.soma).reduce((a, [c]) => a + (Number(v?.[c]) || 0), 0)
const valorCampo = (q, v, [c, , , o]) => o?.soma ? (q.campos.some(([cc, , , oo]) => !oo?.soma && (v?.[cc] ?? '') !== '') ? String(somaCampos(q, v)) : '') : (v?.[c] ?? '')
const campoFalta = (q, v, campo) => !campo[3]?.soma && valorCampo(q, v, campo) === '' && !v?.[campo[0] + '_ns']

function idadeEm(nasc, ref) {
  if (!nasc) return null
  const b = new Date(nasc + 'T12:00:00'), h = new Date(ref + 'T12:00:00')
  let a = h.getFullYear() - b.getFullYear()
  if (h.getMonth() < b.getMonth() || (h.getMonth() === b.getMonth() && h.getDate() < b.getDate())) a--
  return a
}

function identDaInstituicao(inst) {
  if (!inst) return {}
  const m = (inst.endereco || '').match(/^\s*(Rua|R\.|Avenida|Av\.?|Praça|Estrada|Travessa|Alameda|Rodovia|Largo)\s+(.+?)(?:,\s*(?:n[º°o]\s*)?(\d+\w*))?(?:,|\s*-\s*|$)/i)
  const tipo = m ? ({ 'r.': 'Rua', 'av': 'Avenida', 'av.': 'Avenida' }[m[1].toLowerCase()] || m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) : ''
  const fone = (inst.telefone || '').replace(/\D/g, '')
  return {
    nome: inst.nome_fantasia || inst.nome_completo || '',
    tipo_logradouro: tipo, endereco: m ? m[2] : (inst.endereco || ''), numero: m?.[3] || '',
    complemento: '', bairro: inst.bairro || '', cep: inst.cep || '',
    municipio: inst.municipio || '', uf: inst.uf || '', email: inst.email || '',
    ddd: fone.length >= 10 ? fone.slice(0, 2) : '', telefone: fone.length >= 10 ? fone.slice(2) : fone, ramal: '',
    data_implantacao: '',
  }
}

// Respostas → texto, na ordem do formulário (resumo e impressão)
function textoResposta(q, r) {
  const v = r[q.k]
  if (q.tipo === 'texto') return v || ''
  if (q.tipo === 'unica') return v ? (pedeTexto(q, v) && qual(r, q, v) ? `${v}: ${qual(r, q, v)}` : v) : ''
  if (q.tipo === 'multi') return (v || []).map(o => {
    const n = q.qtd?.includes(o) ? (r[q.k + '_qtd'] || {})[o] : ''
    const t = pedeTexto(q, o) ? qual(r, q, o) : ''
    return `${o}${n ? ` — ${n}` : ''}${t ? `: ${t}` : ''}`
  })
  if (q.tipo === 'numeros') {
    if (q.campos.length <= 2) return q.campos.map(([c, suf]) => (v?.[c] ?? '') === '' ? '' : `${v[c]} ${suf}`).filter(Boolean).join(' · ')
    return q.campos.map(campo => {
      const val = valorCampo(q, v, campo)
      return `${campo[1]}: ${v?.[campo[0] + '_ns'] ? 'não sabe' : (val === '' ? '—' : val)}`
    })
  }
  if (q.tipo === 'matriz') return q.linhas.map((l, i) => {
    const marc = q.modo === 'unica' ? (v?.[i] ? [v[i]] : []) : (v?.[i] || [])
    if (!marc.length) return ''
    const nome = l === q.linhaOutro && r[q.k + '_linha'] ? `${l} (${r[q.k + '_linha']})` : l
    return `${nome}: ${marc.join('; ')}`
  }).filter(Boolean)
  return ''
}

// questão sem resposta (pra contagem de pendências)
function semResposta(q, r) {
  const v = r[q.k]
  if (q.tipo === 'numeros') return q.campos.some(campo => campoFalta(q, v, campo))
  if (q.tipo === 'matriz') return q.linhas.some((l, i) => !q.opcionais?.includes(l) && (q.modo === 'unica' ? !v?.[i] : !(v?.[i] || []).length))
  return vazio(v)
}

// ---------------------------------------------------------------------
// Sugestões a partir do que o sistema já sabe (só sugestão — confira!)
// ---------------------------------------------------------------------
const ATEND_NAO_CONTA = ['agendado', 'reagendado', 'cancelado']

async function calcularSugestoes() {
  const sug = {}
  const desde = new Date(); desde.setFullYear(desde.getFullYear() - 1)
  const desdeStr = desde.toISOString().slice(0, 10)
  const [{ data: inst }, { data: equipe }, { data: atendidos }, { data: atAgo }, { data: at12 }, { data: parcerias }, anam, pias] = await Promise.all([
    supabase.from('instituicao').select('*').limit(1).maybeSingle(),
    supabase.from('equipe').select('*').eq('situacao', 'ativo').order('nome'),
    fetchAll(() => supabase.from('usuarios_atendidos').select('id,data_nascimento,situacao,tipo_deficiencia,condicao_neurodesenvolvimento,recebe_bpc')),
    fetchAll(() => supabase.from('atendimentos').select('usuario_atendido_id,situacao').gte('data_atend', MES_INI).lte('data_atend', MES_FIM).not('usuario_atendido_id', 'is', null)),
    fetchAll(() => supabase.from('atendimentos').select('situacao,etapa_fluxo,tipo_atend,modalidade_atendimento,atendido_relacao,tipo_encaminhamento').gte('data_atend', desdeStr)),
    supabase.from('parcerias').select('tipo,orgao_concedente,situacao,nome_projeto'),
    supabase.from('anamneses').select('id', { count: 'exact', head: true }),
    supabase.from('planos_individuais').select('id', { count: 'exact', head: true }),
  ])

  sug.ident = { valor: identDaInstituicao(inst), motivo: 'da tela Instituição' }
  if (inst?.cnpj) sug.q5 = { valor: inst.cnpj, motivo: 'CNPJ da tela Instituição' }
  sug.q4 = { valor: OSC, motivo: 'a TEIAA é uma OSC' }
  sug.q1 = { valor: 'Municipal/Distrital', motivo: 'unidade de gestão municipal (Teresópolis)' }
  sug.equipe = (equipe || []).map(pessoaDaEquipe)
  sug.equipeBruta = equipe || []

  // Q10 — conselhos pelos registros da tela Instituição
  const cons = [], porqueCons = []
  if (inst?.conselho_muni_assist || inst?.num_inscricao_conselho) { cons.push('Conselho de Assistência Social'); porqueCons.push('inscrição no CMAS') }
  if (inst?.cmdca) { cons.push('Conselho de Direitos da Criança e Adolescente'); porqueCons.push('registro no CMDCA') }
  if (cons.length) sug.q10 = { valor: cons, motivo: 'tela Instituição: ' + porqueCons.join(', ') }

  // Quem foi atendido em agosto (atendimento que de fato aconteceu)
  const servidosIds = new Set((atAgo || []).filter(a => !ATEND_NAO_CONTA.includes(a.situacao)).map(a => a.usuario_atendido_id))
  let servidos = (atendidos || []).filter(a => servidosIds.has(a.id))
  let base = `${servidos.length} pessoa(s) com atendimento realizado em ${MES_REF}`
  if (!servidos.length) {
    servidos = (atendidos || []).filter(a => a.situacao === 'ativo')
    base = `nenhum atendimento realizado em ${MES_REF} no sistema — usei os ${servidos.length} atendidos ativos hoje`
  }

  // Q31 — faixas etárias (idade no fim do mês de referência). TEA conta como
  // deficiência (Lei 12.764/2012), então todo atendido entra em "com deficiência".
  const FX = [['c0', 0, 6], ['c7', 7, 14], ['c15', 15, 17], ['a18', 18, 59], ['i60', 60, 79], ['i80', 80, 200]]
  const fx = Object.fromEntries([...FX.map(([c]) => [c, 0]), ['d60', 0], ['d80', 0]])
  let semNasc = 0
  for (const a of servidos) {
    const i = idadeEm(a.data_nascimento, MES_FIM)
    if (i == null) { semNasc++; continue }
    const f = FX.find(([, de, ate]) => i >= de && i <= ate)
    if (f) fx[f[0]]++
  }
  if (servidos.length) {
    sug.q31 = { valor: Object.fromEntries(Object.entries(fx).map(([c, n]) => [c, String(n)])), motivo: base + (semNasc ? `; ${semNasc} sem data de nascimento ficaram de fora — complete no cadastro` : '') }
    const pub = []
    if (fx.c0 + fx.c7 + fx.c15) pub.push(BLOCOS[1].questoes[1].opcoes[0])
    if (fx.a18) pub.push(BLOCOS[1].questoes[1].opcoes[1])
    if (fx.i60 + fx.i80) pub.push(BLOCOS[1].questoes[1].opcoes[2])
    if (pub.length) sug.q2 = { valor: pub, motivo: 'idades de quem foi atendido' }
  }

  // Q32 — tipo de deficiência (cadastro do atendido)
  if (servidos.length) {
    const arr = v => Array.isArray(v) ? v : (v ? [v] : [])
    const t = { fisica: 0, visual: 0, auditiva: 0, intelectual: 0, psicossocial: 0, tea: 0, zika: 0 }
    let soMultipla = 0, semInfo = 0
    for (const a of servidos) {
      const d = arr(a.tipo_deficiencia), c = arr(a.condicao_neurodesenvolvimento)
      const tem = x => d.some(y => y.startsWith(x))
      if (tem('Deficiência física')) t.fisica++
      if (tem('Deficiência visual')) t.visual++
      if (tem('Deficiência auditiva')) t.auditiva++
      if (tem('Deficiência intelectual') || c.includes('Transtorno do Desenvolvimento Intelectual')) t.intelectual++
      if (tem('Deficiência psicossocial')) t.psicossocial++
      if (c.includes('Transtorno do Espectro Autista (TEA)')) t.tea++
      const reais = d.filter(x => !['Não se aplica', 'Não informado'].includes(x))
      if (reais.length === 1 && reais[0] === 'Deficiência múltipla') soMultipla++
      if (!reais.length && !c.filter(x => !['Não se aplica', 'Não informado'].includes(x)).length) semInfo++
    }
    const avisos = []
    if (soMultipla) avisos.push(`${soMultipla} marcado(s) só como "Deficiência múltipla" — some na mão as deficiências dele(s)`)
    if (semInfo) avisos.push(`${semInfo} sem deficiência/condição no cadastro`)
    sug.q32 = { valor: Object.fromEntries(Object.entries(t).map(([c, n]) => [c, String(n)])), motivo: 'cadastro dos atendidos' + (avisos.length ? '; ' + avisos.join('; ') : '') }
  }

  // Q33 — BPC (campo "Recebe BPC?" do cadastro do atendido)
  if (servidos.length) {
    const sim = servidos.filter(a => a.recebe_bpc === 'sim').length
    const semInfo = servidos.filter(a => !a.recebe_bpc).length
    const idosos = servidos.filter(a => (idadeEm(a.data_nascimento, MES_FIM) ?? 0) >= 60)
    sug.q33 = {
      valor: { idosos_bpc: String(idosos.filter(a => a.recebe_bpc === 'sim').length), pcd_bpc: String(sim), pensao: '', microcefalia: '0' },
      motivo: `campo "Recebe BPC?" do cadastro: ${sim} sim` + (semInfo ? `, ${semInfo} sem informação — preencha no cadastro ou ajuste aqui` : ''),
    }
  }

  // Q20 — atividades, pelo que foi registrado nos últimos 12 meses
  const feitos = (at12 || []).filter(a => !ATEND_NAO_CONTA.includes(a.situacao))
  const at = [], porque = []
  const marca = (op, txt) => { if (!at.includes(op)) { at.push(op); porque.push(txt) } }
  const txt = a => semAcento(`${a.etapa_fluxo || ''} ${a.tipo_atend || ''}`)
  if (feitos.some(a => txt(a).includes('acolhimento'))) marca('Acolhida e escuta inicial', 'acolhimentos iniciais')
  if (feitos.some(a => txt(a).includes('visita'))) marca('Visitas domiciliares', 'visitas domiciliares')
  if (feitos.some(a => (a.atendido_relacao && a.atendido_relacao !== 'usuario') || a.modalidade_atendimento === 'Familiar')) marca('Atividades com a família da(o) usuária(o)', 'atendimentos à família')
  if (feitos.some(a => ['Grupo', 'Oficina'].includes(a.modalidade_atendimento))) marca('Oficinas e atividades coletivas de convívio e socialização', 'atendimentos em grupo/oficina')
  if (feitos.some(a => a.modalidade_atendimento === 'Individual')) marca('Atividades individualizadas ou em grupos de apoio ao desenvolvimento pessoal e autonomia', 'atendimentos individuais')
  if (feitos.some(a => a.tipo_encaminhamento && a.tipo_encaminhamento !== 'Sem encaminhamento externo')) marca('Acompanhamento das(os) usuárias(os) encaminhados para a rede', 'encaminhamentos para a rede')
  if (pias?.count) marca('Elaboração de Plano de Acompanhamento Individual e/ou Familiar', `${pias.count} PIA(s)`)
  if (anam?.count || feitos.length) marca('Registro de informações em prontuário', 'prontuário TEAcolher')
  if (at.length) sug.q20 = { valor: at, motivo: 'registros dos últimos 12 meses: ' + porque.join(', ') }

  // Q8 — Fundo de Assistência Social, pelas parcerias/instrumentos
  const fundo = []
  const p8 = []
  for (const p of parcerias || []) {
    if (['cancelado', 'não aprovado', 'em elaboração'].includes(p.situacao)) continue
    const t = `${p.orgao_concedente || ''} ${p.nome_projeto || ''}`.toLowerCase()
    const add = (op, q) => { if (!fundo.includes(op)) { fundo.push(op); p8.push(q) } }
    if (/federal|uni[aã]o|minist[eé]rio|mds|transferegov|deputad[oa] federal|senad/.test(t)) add('Sim, federal (subvenções/emendas parlamentares)', p.nome_projeto || p.orgao_concedente)
    else if (/estad|governo do rj|alerj|seas|deputad[oa] estadual/.test(t)) add('Sim, estadual', p.nome_projeto || p.orgao_concedente)
    else if (/smasdh|fmas|assist[eê]ncia social/.test(t)) add('Sim, municipal ou do Distrito Federal', p.nome_projeto || p.orgao_concedente)
  }
  if (fundo.length) sug.q8 = { valor: fundo, motivo: `parcerias: ${p8.join(', ')} — confira se o recurso é do Fundo de Assistência Social` }
  return sug
}

// Campos da pessoa na Q37. Ao abrir a tela, guarda quais FALTAVAM: esses viram
// campo (e continuam campo enquanto digita); o que já veio da Equipe aparece pronto.
const CAMPOS_PESSOA = ['nome', 'nascimento', 'sexo', 'cpf', 'rg_numero', 'rg_orgao', 'email', 'escolaridade', 'profissao', 'vinculo', 'funcao', 'carga', 'inicio']
const chavePessoa = (p, i) => p.equipe_id ? 'e' + p.equipe_id : 'm' + i

// Campo com rótulo. Fica FORA do componente da página (senão o input perde
// o foco a cada letra); sabe se é celular pelo contexto.
const MobileCtx = createContext(false)
function Campo({ rotulo: rot, children, span = 1 }) {
  const mobile = useContext(MobileCtx)
  return (
    <div style={{ gridColumn: mobile ? 'auto' : `span ${span}` }}>
      <span style={{ fontSize: 11, color: '#888780', marginBottom: 3, display: 'block' }}>{rot}</span>{children}
    </div>
  )
}

// =====================================================================
export default function CensoSuas() {
  const { user, perfil } = useAuth()
  const isMobile = useIsMobile()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [registro, setRegistro] = useState(null)     // linha de censo_suas
  const [r, setR] = useState({})                      // respostas
  const [sug, setSug] = useState({})
  const [passo, setPasso] = useState(0)               // 0..BLOCOS.length (último = revisão)
  const [salvoEm, setSalvoEm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [origemAnterior, setOrigemAnterior] = useState(null)
  const [faltavam, setFaltavam] = useState({})        // campos da Q37 que faltavam ao abrir (viram campo; o resto aparece pronto)
  const [abertos, setAbertos] = useState({})          // pessoas com "Corrigir" aberto
  const timer = useRef(null)
  const baseEquipe = useRef({})                       // como cada pessoa está na Equipe (pra só gravar o que mudou)
  const primeiro = useRef(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    try {
      const { data: atual, error } = await supabase.from('censo_suas').select('*').eq('ano', ANO).eq('tipo', TIPO).maybeSingle()
      if (error) throw error
      const sugestoes = await calcularSugestoes()
      setSug(sugestoes)
      let resp
      if (atual) {
        resp = atual.respostas || {}
        setRegistro(atual)
      } else {
        // parte do censo do ano anterior, se houver; senão, do sistema
        const { data: ant } = await supabase.from('censo_suas').select('ano,respostas').eq('tipo', TIPO).lt('ano', ANO).order('ano', { ascending: false }).limit(1).maybeSingle()
        if (ant) {
          resp = { ...ant.respostas, resp: { ...(ant.respostas?.resp || {}), data: '' }, gestor: { ...(ant.respostas?.gestor || {}), data: '' } }
          // números do mês de referência são do ano novo: vêm do sistema, não do ano passado
          for (const k of ['q30', 'q31', 'q32', 'q33', 'q34']) delete resp[k]
          for (const k of ['q31', 'q32', 'q33']) if (sugestoes[k]) resp[k] = sugestoes[k].valor
          setOrigemAnterior(ant.ano)
        } else {
          resp = {}
          for (const k of ['ident', ...COM_SUGESTAO]) if (sugestoes[k]) resp[k] = sugestoes[k].valor
          resp.resp = { nome: perfil?.nome || '', email: user?.email || '', cargo: '', cpf: '', telefone: '', data: '' }
        }
      }
      // equipe: junta quem entrou na Equipe depois (sem duplicar; quem já está mantém o que foi preenchido)
      const jaTem = new Set((resp.equipe || []).map(p => p.equipe_id).filter(Boolean))
      resp.equipe = [...(resp.equipe || []), ...sugestoes.equipe.filter(p => !jaTem.has(p.equipe_id))]
      // a Equipe é a ficha oficial: o que ela tem preenchido vale por cima do que estava salvo no Censo
      const daEquipe = Object.fromEntries(sugestoes.equipeBruta.map(p => [p.id, p]))
      resp.equipe = resp.equipe.map(p => {
        const e = p.equipe_id && daEquipe[p.equipe_id]
        if (!e) return p
        const of = dadosPessoaisDaEquipe(e), novo = { ...p }
        for (const [c, col] of PESSOAIS) if (e[col]) novo[c] = of[c]
        if (e.escolaridade) novo.escolaridade = escolaridadeCod(e.escolaridade) || p.escolaridade
        return novo
      })
      baseEquipe.current = Object.fromEntries(sugestoes.equipeBruta.map(e => [e.id, pessoaisParaEquipe({ ...dadosPessoaisDaEquipe(e), escolaridade: escolaridadeCod(e.escolaridade) })]))
      setFaltavam(Object.fromEntries(resp.equipe.map((p, i) => [chavePessoa(p, i), CAMPOS_PESSOA.filter(c => !p[c] || (c === 'rg_orgao' && !p.rg_numero))])))
      primeiro.current = true
      setR(resp)
    } catch (e) {
      setErro(/censo_suas|recebe_bpc|schema cache/.test(e?.message || '') ? 'O banco ainda não tem as tabelas do Censo. Rode sql_censo_suas.sql no SQL Editor do Supabase.' : 'Erro ao carregar: ' + (e?.message || e))
    }
    setCarregando(false)
  }

  // salva sozinho 1,2s depois da última mudança
  useEffect(() => {
    if (carregando || erro) return
    if (primeiro.current) { primeiro.current = false; return }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => salvar(), 1200)
    return () => clearTimeout(timer.current)
  }, [r])

  async function salvar(status) {
    setSalvando(true)
    const dados = { ano: ANO, tipo: TIPO, respostas: r, atualizado_em: new Date().toISOString(), atualizado_por: user?.id || null }
    if (status) dados.status = status
    const { data, error } = await supabase.from('censo_suas').upsert(dados, { onConflict: 'ano,tipo' }).select().single()
    setSalvando(false)
    if (error) { setErro('Não salvou: ' + error.message); return }
    const errEq = await sincronizarEquipe()
    setErro(errEq ? 'Censo salvo, mas não gravou na Equipe: ' + errEq : ''); setRegistro(data); setSalvoEm(new Date())
  }

  // Grava na Equipe os dados pessoais preenchidos aqui. Só o que mudou e não
  // está vazio (apagar um campo no Censo nunca apaga a ficha da Equipe).
  async function sincronizarEquipe() {
    for (const p of r.equipe || []) {
      if (!p.equipe_id) continue
      const base = baseEquipe.current[p.equipe_id] || {}
      const atual = pessoaisParaEquipe(p)
      const mudou = Object.fromEntries(Object.entries(atual).filter(([col, v]) => v && v !== base[col]))
      if (!Object.keys(mudou).length) continue
      const { error } = await supabase.from('equipe').update(mudou).eq('id', p.equipe_id)
      if (error) return error.message
      baseEquipe.current[p.equipe_id] = { ...base, ...mudou }
    }
    return null
  }

  const set = (k, v) => setR(prev => ({ ...prev, [k]: v }))
  const setSub = (k, sub, v) => setR(prev => ({ ...prev, [k]: { ...(prev[k] || {}), [sub]: v } }))

  // pendências e avisos
  const avisos = useMemo(() => {
    const out = []
    const sem = []
    for (const b of BLOCOS) for (const q of b.questoes) {
      if (!q.n || !visivel(q, r) || q.tipo === 'equipe') continue
      if (semResposta(q, r) && !sem.includes(q.n)) sem.push(q.n)
      if (q.tipo === 'multi' || q.tipo === 'unica') {
        const marc = q.tipo === 'multi' ? (r[q.k] || []) : (r[q.k] ? [r[q.k]] : [])
        for (const o of marc) {
          if (pedeTexto(q, o) && !qual(r, q, o)) out.push(['amarelo', `Q${q.n}: marcou "${o.length > 50 ? o.slice(0, 50) + '…' : o}" mas não escreveu qual.`])
          if (q.qtd?.includes(o) && !(r[q.k + '_qtd'] || {})[o]) out.push(['amarelo', `Q${q.n}: falta a quantidade de "${o}".`])
        }
      }
    }
    if (sem.length) out.push(['amarelo', `Sem resposta: questão ${sem.join(', ')}.`])
    const id = r.ident || {}
    const identFalta = [['nome', 'nome'], ['endereco', 'endereço'], ['bairro', 'bairro'], ['cep', 'CEP'], ['municipio', 'município'], ['data_implantacao', 'data de implantação']].filter(([c]) => !id[c]).map(([, t]) => t)
    if (identFalta.length) out.push(['amarelo', `Identificação: falta ${identFalta.join(', ')}.`])
    if ((r.q10 || []).includes('Conselho de Assistência Social') && r.q4 === 'Governamental') out.push(['vermelho', 'Q10: "Conselho de Assistência Social" só pode ser marcado por OSC (não governamental).'])

    // perfil: nenhuma linha pode passar do total
    const q31 = BLOCOS[4].questoes[0]
    const total = num(valorCampo(q31, r.q31, q31.campos.at(-1)))
    if (total != null) {
      for (const q of [BLOCOS[4].questoes[1], BLOCOS[4].questoes[2]])
        for (const [c, t] of q.campos) if (num(r[q.k]?.[c]) > total) out.push(['vermelho', `Q${q.n}: "${t}" (${r[q.k][c]}) passa do total de atendidos da Q31 (${total}).`])
      const q34 = ['integral', 'meio', 'menos'].reduce((a, c) => a + (Number(r.q34?.[c]) || 0), 0)
      if (q34 > total) out.push(['amarelo', `Q34: a soma dos períodos (${q34}) passa do total de atendidos da Q31 (${total}). Confira.`])
      if (total > 0 && r.q22?.v !== undefined && r.q22.v !== '' && Number(r.q22.v) === 0) out.push(['amarelo', 'Q22: capacidade 0, mas a Q31 tem pessoas atendidas.'])
    }
    const pub = r.q2 || []
    if ((num(r.q31?.c0) || num(r.q31?.c7) || num(r.q31?.c15)) && !pub.some(p => p.startsWith('Criança'))) out.push(['amarelo', 'Q2 não marca crianças/adolescentes, mas a Q31 tem atendidos de 0 a 17 anos.'])
    if (num(r.q31?.a18) && !pub.some(p => p.startsWith('Adultas'))) out.push(['amarelo', 'Q2 não marca adultos, mas a Q31 tem atendidos de 18 a 59 anos.'])

    const eq = (r.equipe || []).filter(p => p.incluir)
    const coords = eq.filter(p => p.funcao === '1')
    if (r.q36 && r.q36 !== SEM_COORD && coords.length === 0) out.push(['vermelho', 'Q36 diz que há coordenador(a), mas ninguém na equipe (Q37) está com a função "Coordenador(a)".'])
    if (r.q36 === SEM_COORD && coords.length) out.push(['vermelho', `Q36 diz que NÃO há coordenador(a), mas ${coords.map(p => p.nome).join(', ')} está como Coordenador(a) na Q37.`])
    if (!eq.length) out.push(['amarelo', 'Q37: nenhuma pessoa marcada na equipe.'])
    if (eq.length > 16) out.push(['amarelo', `Q37: ${eq.length} pessoas — o papel tem 16 linhas; no sistema do MDS dá pra incluir todas.`])
    for (const p of eq) {
      const f = [['cpf', 'CPF'], ['nascimento', 'nascimento'], ['sexo', 'sexo'], ['rg_numero', 'RG'], ['escolaridade', 'escolaridade'], ['profissao', 'profissão'], ['vinculo', 'vínculo'], ['funcao', 'função'], ['carga', 'carga horária'], ['inicio', 'início na função']].filter(([c]) => !p[c]).map(([, t]) => t)
      if (f.length) out.push([f.includes('CPF') ? 'vermelho' : 'amarelo', `Q37 · ${p.nome || 'sem nome'}: falta ${f.join(', ')}.`])
    }
    if (!r.resp?.nome || !r.resp?.cpf) out.push(['amarelo', 'Responsável pelas informações: falta nome ou CPF.'])
    return out
  }, [r])

  const pendBloco = b => {
    let n = 0
    for (const q of b.questoes) {
      if (!visivel(q, r)) continue
      if (q.tipo === 'ident') n += ['nome', 'endereco', 'bairro', 'cep', 'municipio', 'data_implantacao'].filter(c => !r.ident?.[c]).length ? 1 : 0
      else if (q.tipo === 'equipe') n += (r.equipe || []).some(p => p.incluir && !p.cpf) ? 1 : 0
      else if (q.tipo === 'responsaveis') n += (!r.resp?.nome || !r.resp?.cpf) ? 1 : 0
      else n += semResposta(q, r) ? 1 : 0
    }
    return n
  }

  // ---------------------------------------------------------------- estilos
  const s = {
    card: { background: 'rgba(255,255,255,0.94)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: isMobile ? '1rem' : '1.25rem 1.4rem', marginBottom: 12 },
    q: { padding: '14px 0', borderTop: '0.5px solid #EFEDE6' },
    qn: { display: 'inline-block', minWidth: 30, fontSize: 11, fontWeight: 700, color: AZUL, background: '#E6F1FB', borderRadius: 6, padding: '2px 6px', marginRight: 8, textAlign: 'center' },
    qt: { fontSize: 13.5, fontWeight: 600, color: '#1A1F1C', lineHeight: 1.45 },
    ajuda: { fontSize: 11.5, color: '#888780', margin: '4px 0 0 38px', lineHeight: 1.5 },
    corpo: { margin: isMobile ? '8px 0 0 0' : '8px 0 0 38px' },
    opc: on => ({ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 8, border: `0.5px solid ${on ? AZUL : '#E0DED6'}`, background: on ? '#EEF6FB' : '#fff', cursor: 'pointer', fontSize: 12.5, color: on ? ESCURO : CINZA, lineHeight: 1.4 }),
    input: { width: '100%', padding: '7px 9px', fontSize: isMobile ? 16 : 12.5, borderRadius: 8, border: '0.5px solid #D3D1C7', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' },
    btn: (bg, cor = '#fff') => ({ padding: '8px 15px', fontSize: 12.5, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }),
    btnTxt: { padding: '6px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: '#fff', color: CINZA, cursor: 'pointer' },
    chip: on => ({ padding: '4px 10px', fontSize: 11.5, borderRadius: 99, cursor: 'pointer', border: `0.5px solid ${on ? AZUL : '#D3D1C7'}`, background: on ? AZUL : '#fff', color: on ? '#fff' : CINZA, lineHeight: 1.35, textAlign: 'left' }),
    sug: { margin: isMobile ? '6px 0 0 0' : '6px 0 0 38px', fontSize: 11.5, color: VERDE, background: '#EAF3DE', borderRadius: 8, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    grid: n => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${n}, 1fr)`, gap: 10 }),
  }

  // ---------------------------------------------------------------- campos
  function Sugestao({ k, igual }) {
    const sg = sug[k]
    if (!sg) return null
    const mesma = igual ?? JSON.stringify(sg.valor) === JSON.stringify(r[k])
    return (
      <div style={s.sug}>
        <i className="ti ti-sparkles" />
        <span>{mesma ? 'Preenchido pelo sistema' : 'Sugestão do sistema'} — {sg.motivo}. Confira.</span>
        {!mesma && <button type="button" style={{ ...s.btnTxt, padding: '3px 8px', fontSize: 11 }} onClick={() => set(k, sg.valor)}>Usar sugestão</button>}
      </div>
    )
  }

  const inputQual = (q, o) => (
    <input style={{ ...s.input, marginTop: 5 }} placeholder={q.outroPh || 'Qual(is)?'} value={qual(r, q, o)} onChange={e => setSub(q.k + '_qual', o, e.target.value)} />
  )

  function Opcoes({ q }) {
    const v = r[q.k]
    if (q.tipo === 'unica') return (
      <div style={{ display: 'grid', gap: 6, ...s.corpo }}>
        {q.opcoes.map(o => (
          <div key={o}>
            <label style={s.opc(v === o)} onClick={() => set(q.k, v === o ? '' : o)}>
              <i className={`ti ti-${v === o ? 'circle-check-filled' : 'circle'}`} style={{ fontSize: 16, color: v === o ? AZUL : '#B4B2A9', marginTop: 1 }} />{o}
            </label>
            {v === o && pedeTexto(q, o) && inputQual(q, o)}
          </div>
        ))}
      </div>
    )
    const lista = v || []
    const alterna = o => {
      let nova = lista.includes(o) ? lista.filter(x => x !== o) : [...lista, o]
      if (!lista.includes(o) && q.exclusiva) nova = o === q.exclusiva ? [o] : nova.filter(x => x !== q.exclusiva)
      set(q.k, nova)
    }
    return (
      <div style={{ display: 'grid', gap: 6, ...s.corpo }}>
        <div style={{ fontSize: 11, color: '#888780' }}>Pode marcar mais de uma{q.exclusiva ? ` (exceto “${q.exclusiva}”)` : ''}.</div>
        {q.opcoes.map(o => {
          const on = lista.includes(o)
          return (
            <div key={o}>
              <label style={s.opc(on)} onClick={() => alterna(o)}>
                <i className={`ti ti-${on ? 'square-check-filled' : 'square'}`} style={{ fontSize: 16, color: on ? AZUL : '#B4B2A9', marginTop: 1 }} />
                <span style={{ flex: 1 }}>{o}</span>
                {on && q.qtd?.includes(o) && (
                  <input type="number" min={0} max={99} placeholder="Quantos?" onClick={e => e.stopPropagation()}
                    style={{ ...s.input, width: 96, padding: '3px 7px' }} value={(r[q.k + '_qtd'] || {})[o] || ''} onChange={e => setSub(q.k + '_qtd', o, e.target.value)} />
                )}
              </label>
              {on && pedeTexto(q, o) && inputQual(q, o)}
            </div>
          )
        })}
      </div>
    )
  }

  function Numeros({ q }) {
    const v = r[q.k] || {}
    if (q.campos.length <= 2) return (
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', ...s.corpo }}>
        {q.campos.map(([c, suf, max]) => (
          <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: CINZA }}>
            <input type="number" min={0} max={max} style={{ ...s.input, width: 90 }} value={v[c] ?? ''} onChange={e => setSub(q.k, c, e.target.value)} />{suf}
          </label>
        ))}
      </div>
    )
    return (
      <div style={{ display: 'grid', gap: 5, ...s.corpo }}>
        {q.campos.map(campo => {
          const [c, t, max, o] = campo
          const ns = !!v[c + '_ns']
          return (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '6px 10px', border: '0.5px solid #E0DED6', borderRadius: 8, background: o?.soma ? '#F4F8FB' : '#fff' }}>
              <span style={{ fontSize: 12.5, color: o?.soma ? ESCURO : CINZA, fontWeight: o?.soma ? 600 : 400, flex: 1 }}>{t}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {o?.soma
                  ? <b style={{ fontSize: 14, color: ESCURO, minWidth: 70, textAlign: 'right' }}>{valorCampo(q, v, campo) || '—'}</b>
                  : <input type="number" min={0} max={max} disabled={ns} style={{ ...s.input, width: 76, opacity: ns ? 0.4 : 1 }} value={ns ? '' : (v[c] ?? '')} onChange={e => setSub(q.k, c, e.target.value)} />}
                {o?.ns && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888780', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={ns} onChange={e => set(q.k, { ...v, [c + '_ns']: e.target.checked, ...(e.target.checked ? { [c]: '' } : {}) })} />não sabe
                  </label>
                )}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  function Matriz({ q }) {
    const v = r[q.k] || {}
    const curta = j => (q.curtas || q.colunas)[j]
    const alterna = (i, col) => {
      if (q.modo === 'unica') return setSub(q.k, i, v[i] === col ? '' : col)
      const lista = v[i] || []
      let nova = lista.includes(col) ? lista.filter(x => x !== col) : [...lista, col]
      if (!lista.includes(col) && q.exclusivas) nova = q.exclusivas.includes(col) ? [col] : nova.filter(x => !q.exclusivas.includes(x))
      setSub(q.k, i, nova)
    }
    return (
      <div style={{ display: 'grid', gap: 6, ...s.corpo }}>
        {q.curtas && (
          <details style={{ fontSize: 11, color: '#888780' }}>
            <summary style={{ cursor: 'pointer' }}>O que cada opção quer dizer</summary>
            <div style={{ marginTop: 4, lineHeight: 1.6 }}>{q.colunas.map((c, j) => <div key={c}><b>{q.curtas[j]}</b> = {c}</div>)}</div>
          </details>
        )}
        {q.modo === 'multi' && <div style={{ fontSize: 11, color: '#888780' }}>Pode marcar mais de uma por linha{q.exclusivas ? ` (exceto ${q.exclusivas.map(x => `“${(q.curtas || q.colunas)[q.colunas.indexOf(x)]}”`).join(' e ')})` : ''}.</div>}
        {q.linhas.map((l, i) => {
          const marc = q.modo === 'unica' ? (v[i] ? [v[i]] : []) : (v[i] || [])
          const falta = !marc.length && !q.opcionais?.includes(l)
          return (
            <div key={l} style={{ padding: '8px 10px', border: `0.5px solid ${falta ? '#E9D2A8' : '#E0DED6'}`, borderRadius: 8, background: '#fff' }}>
              <div style={{ fontSize: 12.5, color: ESCURO, fontWeight: 600, marginBottom: 6 }}>{l}{q.opcionais?.includes(l) && <span style={{ fontWeight: 400, color: '#888780' }}> (se houver)</span>}</div>
              {l === q.linhaOutro && <input style={{ ...s.input, marginBottom: 6 }} placeholder="Qual política?" value={r[q.k + '_linha'] || ''} onChange={e => set(q.k + '_linha', e.target.value)} />}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {q.colunas.map((col, j) => <button key={col} type="button" title={col} style={s.chip(marc.includes(col))} onClick={() => alterna(i, col)}>{curta(j)}</button>)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function Questao({ q }) {
    if (q.tipo === 'ident') return Identificacao()
    if (q.tipo === 'equipe') return QuadroEquipe({ q })
    if (q.tipo === 'responsaveis') return Responsaveis()
    return (
      <div style={s.q}>
        <div style={s.qt}><span style={s.qn}>{q.n}</span>{q.texto}</div>
        {q.ajuda && <div style={s.ajuda}>{q.ajuda}</div>}
        {(q.tipo === 'unica' || q.tipo === 'multi') && Opcoes({ q })}
        {q.tipo === 'texto' && (
          <div style={{ ...s.corpo, maxWidth: 320 }}>
            <input style={s.input} placeholder={q.placeholder} value={r[q.k] || ''} onChange={e => set(q.k, e.target.value)} />
          </div>
        )}
        {q.tipo === 'numeros' && Numeros({ q })}
        {q.tipo === 'matriz' && Matriz({ q })}
        {COM_SUGESTAO.includes(q.k) && Sugestao({ k: q.k })}
      </div>
    )
  }

  function Identificacao() {
    const id = r.ident || {}
    const up = (c, v) => set('ident', { ...id, [c]: v })
    const inp = (c, ph, extra = {}) => <input style={s.input} placeholder={ph} value={id[c] || ''} onChange={e => up(c, e.target.value)} {...extra} />
    return (
      <div style={{ ...s.q, borderTop: 'none' }}>
        <div style={s.grid(4)}>
          <Campo rotulo="Nome que identifica a unidade" span={4}>{inp('nome', 'Nome da unidade')}</Campo>
          <Campo rotulo="Tipo de logradouro">
            <select style={s.input} value={id.tipo_logradouro || ''} onChange={e => up('tipo_logradouro', e.target.value)}>
              <option value="">—</option>{TIPOS_LOGRADOURO.map(t => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Endereço" span={2}>{inp('endereco', 'Nome da rua')}</Campo>
          <Campo rotulo="Número">{inp('numero', 'Nº')}</Campo>
          <Campo rotulo="Complemento">{inp('complemento', '')}</Campo>
          <Campo rotulo="Bairro">{inp('bairro', '')}</Campo>
          <Campo rotulo="CEP">{inp('cep', '00000-000')}</Campo>
          <Campo rotulo="Município / UF">
            <div style={{ display: 'flex', gap: 6 }}>{inp('municipio', '')}<select style={{ ...s.input, width: 70 }} value={id.uf || ''} onChange={e => up('uf', e.target.value)}><option value="">—</option>{UFS.map(u => <option key={u}>{u}</option>)}</select></div>
          </Campo>
          <Campo rotulo="E-mail" span={2}>{inp('email', '')}</Campo>
          <Campo rotulo="DDD – Telefone">
            <div style={{ display: 'flex', gap: 6 }}><input style={{ ...s.input, width: 56 }} placeholder="DDD" value={id.ddd || ''} onChange={e => up('ddd', e.target.value)} />{inp('telefone', 'Telefone')}</div>
          </Campo>
          <Campo rotulo="Ramal">{inp('ramal', '')}</Campo>
          <Campo rotulo="Data de implantação desta unidade">{inp('data_implantacao', '', { type: 'date' })}</Campo>
        </div>
        {Sugestao({ k: 'ident', igual: sug.ident && Object.entries(sug.ident.valor).every(([c, v]) => !v || id[c] === v) })}
      </div>
    )
  }

  function QuadroEquipe({ q }) {
    const eq = r.equipe || []
    const up = (i, c, v) => set('equipe', eq.map((p, j) => j === i ? { ...p, [c]: v } : p))
    const sel = (i, c, lista) => (
      <select style={s.input} value={eq[i][c] || ''} onChange={e => up(i, c, e.target.value)}>
        <option value="">—</option>{lista.map(([cod, t]) => <option key={cod} value={cod}>{cod} – {t}</option>)}
      </select>
    )
    const txt = (i, c, extra = {}) => <input style={s.input} value={eq[i][c] || ''} onChange={e => up(i, c, e.target.value)} {...extra} />
    const codigo = (lista, c) => c ? `${c} – ${rotulo(lista, c)}` : ''
    // [chave, rótulo, largura, editor, como mostrar pronto]
    const CAMPOS = [
      ['nome', 'Nome completo', 2, i => txt(i, 'nome'), p => p.nome],
      ['nascimento', 'Data de nascimento', 1, i => txt(i, 'nascimento', { type: 'date' }), p => fmtData(p.nascimento)],
      ['sexo', 'Sexo', 1, i => (
        <div style={{ display: 'flex', gap: 6 }}>{['F', 'M'].map(o => <button key={o} type="button" onClick={() => up(i, 'sexo', eq[i].sexo === o ? '' : o)} style={{ ...s.btnTxt, flex: 1, borderColor: eq[i].sexo === o ? AZUL : '#D3D1C7', background: eq[i].sexo === o ? AZUL : '#fff', color: eq[i].sexo === o ? '#fff' : CINZA }}>{o}</button>)}</div>
      ), p => p.sexo],
      ['cpf', 'CPF *', 1, i => txt(i, 'cpf', { placeholder: '000.000.000-00' }), p => p.cpf],
      ['rg_numero', 'RG — número', 1, i => txt(i, 'rg_numero'), p => p.rg_numero],
      ['rg_orgao', 'RG — órgão emissor / UF', 1, i => (
        <div style={{ display: 'flex', gap: 6 }}>{txt(i, 'rg_orgao', { placeholder: 'DETRAN' })}<select style={{ ...s.input, width: 70 }} value={eq[i].rg_uf || ''} onChange={e => up(i, 'rg_uf', e.target.value)}><option value="">—</option>{UFS.map(u => <option key={u}>{u}</option>)}</select></div>
      ), p => p.rg_orgao ? `${p.rg_orgao}${p.rg_uf ? ' / ' + p.rg_uf : ''}` : ''],
      ['email', 'E-mail', 1, i => txt(i, 'email'), p => p.email],
      ['escolaridade', 'Escolaridade', 2, i => sel(i, 'escolaridade', ESCOLARIDADE), p => codigo(ESCOLARIDADE, p.escolaridade)],
      ['profissao', 'Profissão', 2, i => sel(i, 'profissao', PROFISSAO), p => codigo(PROFISSAO, p.profissao)],
      ['vinculo', 'Vínculo', 2, i => sel(i, 'vinculo', VINCULO), p => codigo(VINCULO, p.vinculo)],
      ['funcao', 'Função na unidade', 2, i => sel(i, 'funcao', FUNCAO), p => codigo(FUNCAO, p.funcao)],
      ['carga', 'Carga horária semanal', 2, i => sel(i, 'carga', CARGA), p => codigo(CARGA, p.carga)],
      ['inicio', 'Início do exercício da função', 1, i => txt(i, 'inicio', { type: 'date' }), p => fmtData(p.inicio)],
    ]
    const dentro = eq.filter(p => p.incluir).length
    return (
      <div style={s.q}>
        <div style={s.qt}><span style={s.qn}>{q.n}</span>{q.texto}</div>
        <div style={s.ajuda}>
          Os dados vêm da tela <b>Equipe</b> (pessoas ativas), já com os códigos do Censo. O que já existe aparece pronto —
          <b> só o que falta vira campo pra preencher</b>. Se algo puxado estiver errado, use <b>Corrigir</b>. Desmarque quem não trabalha no serviço.
          Os dados pessoais que você preencher aqui (CPF, RG, sexo, e-mail, escolaridade…) <b>ficam gravados na ficha da pessoa na Equipe</b>.
        </div>
        <div style={{ ...s.corpo, marginTop: 10, fontSize: 12, color: CINZA }}>{dentro} de {eq.length} pessoa(s) entram no Censo.</div>
        <div style={{ display: 'grid', gap: 10, ...s.corpo }}>
          {eq.map((p, i) => {
            const chave = chavePessoa(p, i)
            const tudo = !p.equipe_id || abertos[chave]
            const falt = faltavam[chave] || []
            const preencher = tudo ? CAMPOS : CAMPOS.filter(([c]) => falt.includes(c))
            const prontos = tudo ? [] : CAMPOS.filter(([c]) => !falt.includes(c))
            const aindaFalta = CAMPOS.filter(([c]) => c !== 'email' && !p[c]).length
            return (
              <div key={chave} style={{ border: `0.5px solid ${p.incluir ? '#C9DCEB' : '#E8E6DE'}`, borderRadius: 10, padding: '10px 12px', background: p.incluir ? '#fff' : '#FAFAF7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: p.incluir ? ESCURO : '#888780' }}>
                    <input type="checkbox" checked={!!p.incluir} onChange={e => up(i, 'incluir', e.target.checked)} />
                    {p.nome || 'Pessoa sem nome'}
                  </label>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {p.incluir && (aindaFalta
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: LARANJA, background: '#FAEEDA', borderRadius: 99, padding: '2px 8px' }}>falta {aindaFalta}</span>
                      : <span style={{ fontSize: 11, fontWeight: 600, color: VERDE, background: '#EAF3DE', borderRadius: 99, padding: '2px 8px' }}><i className="ti ti-check" /> completo</span>)}
                    {p.incluir && p.equipe_id && <button type="button" style={s.btnTxt} onClick={() => setAbertos(a => ({ ...a, [chave]: !a[chave] }))}>{abertos[chave] ? 'Fechar edição' : 'Corrigir'}</button>}
                    {!p.equipe_id && <button type="button" style={{ ...s.btnTxt, color: VERMELHO }} onClick={() => set('equipe', eq.filter((_, j) => j !== i))}>Remover</button>}
                  </span>
                </div>
                {!p.incluir && p.ref && <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>{p.ref}</div>}
                {p.incluir && prontos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '6px 14px', marginTop: 10, fontSize: 12 }}>
                    {prontos.map(([c, rot, , , mostra]) => (
                      <div key={c} style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, color: '#888780' }}>{rot.replace(' *', '')}</div>
                        <div style={{ color: ESCURO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mostra(p) || ''}>{mostra(p) || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
                {p.incluir && preencher.length > 0 && (
                  <div style={{ marginTop: 10, ...(prontos.length ? { borderTop: '0.5px dashed #E0DED6', paddingTop: 10 } : {}) }}>
                    {!tudo && <div style={{ fontSize: 11.5, fontWeight: 600, color: LARANJA, marginBottom: 6 }}>Preencher agora</div>}
                    <div style={s.grid(4)}>
                      {preencher.map(([c, rot, span, editor]) => <Campo key={c} rotulo={rot} span={span}>{editor(i)}</Campo>)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <button type="button" style={{ ...s.btnTxt, justifySelf: 'start' }} onClick={() => set('equipe', [...eq, { incluir: true, nome: '', nascimento: '', sexo: '', cpf: '', rg_numero: '', rg_orgao: '', rg_uf: 'RJ', email: '', escolaridade: '', profissao: '', vinculo: '', funcao: '', carga: '', inicio: '' }])}>
            <i className="ti ti-plus" /> Incluir pessoa que não está na Equipe
          </button>
        </div>
      </div>
    )
  }

  function Responsaveis() {
    const bloco = (k, titulo, cargos) => {
      const v = r[k] || {}
      const up = (c, x) => set(k, { ...v, [c]: x })
      return (
        <div style={s.q}>
          <div style={{ ...s.qt, marginBottom: 10 }}>{titulo}</div>
          <div style={s.grid(4)}>
            <Campo rotulo="Nome" span={2}><input style={s.input} value={v.nome || ''} onChange={e => up('nome', e.target.value)} /></Campo>
            <Campo rotulo="CPF"><input style={s.input} value={v.cpf || ''} onChange={e => up('cpf', e.target.value)} placeholder="000.000.000-00" /></Campo>
            <Campo rotulo={k === 'resp' ? 'Data de preenchimento' : 'Data de validação'}><input type="date" style={s.input} value={v.data || ''} onChange={e => up('data', e.target.value)} /></Campo>
            <Campo rotulo="Cargo/Função" span={2}>
              <select style={s.input} value={v.cargo || ''} onChange={e => up('cargo', e.target.value)}><option value="">—</option>{cargos.map(c => <option key={c}>{c}</option>)}</select>
            </Campo>
            {v.cargo === 'Outros' && <Campo rotulo="Especifique" span={2}><input style={s.input} value={v.cargo_outro || ''} onChange={e => up('cargo_outro', e.target.value)} /></Campo>}
            <Campo rotulo="Telefone"><input style={s.input} value={v.telefone || ''} onChange={e => up('telefone', e.target.value)} /></Campo>
            <Campo rotulo="E-mail"><input style={s.input} value={v.email || ''} onChange={e => up('email', e.target.value)} /></Campo>
          </div>
        </div>
      )
    }
    return (
      <>
        {bloco('resp', 'Pessoa responsável pelas informações prestadas pela unidade', CARGO_RESP)}
        {bloco('gestor', 'Agente público responsável no Órgão Gestor da Assistência Social (quem valida)', CARGO_GESTOR)}
        <div style={s.ajuda}>As assinaturas são feitas à mão, na versão impressa.</div>
      </>
    )
  }

  // ---------------------------------------------------------------- revisão
  const linhasResumo = () => {
    const out = []
    for (const b of BLOCOS) for (const q of b.questoes) {
      if (!q.n || q.tipo === 'equipe') continue
      out.push({ k: q.k, n: q.n, texto: q.texto, bloco: b.titulo, pulada: !visivel(q, r), resp: visivel(q, r) ? textoResposta(q, r) : '' })
    }
    return out
  }
  const cargoTxt = v => v?.cargo === 'Outros' && v.cargo_outro ? `Outros: ${v.cargo_outro}` : (v?.cargo || '')

  function Revisao() {
    const linhas = linhasResumo()
    const eq = (r.equipe || []).filter(p => p.incluir)
    const id = r.ident || {}
    let blocoAtual = ''
    return (
      <>
        <div style={s.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: ESCURO, marginBottom: 8 }}>Conferência</div>
          {avisos.length === 0
            ? <div style={{ fontSize: 13, color: VERDE }}><i className="ti ti-circle-check" /> Tudo respondido e sem inconsistências.</div>
            : <div style={{ display: 'grid', gap: 6 }}>{avisos.map(([cor, t], i) => (
                <div key={i} style={{ fontSize: 12.5, padding: '7px 10px', borderRadius: 8, background: cor === 'vermelho' ? '#FCEBEB' : '#FAEEDA', color: cor === 'vermelho' ? VERMELHO : LARANJA }}>
                  <i className={`ti ti-${cor === 'vermelho' ? 'alert-octagon' : 'alert-triangle'}`} /> {t}
                </div>))}
              </div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button style={s.btn(AZUL)} onClick={() => window.print()}><i className="ti ti-printer" /> Imprimir versão em papel</button>
            {registro?.status === 'concluido'
              ? <button style={s.btnTxt} onClick={() => salvar('rascunho')}>Reabrir (voltar a rascunho)</button>
              : <button style={s.btn('#6BBF2B')} onClick={() => salvar('concluido')}><i className="ti ti-check" /> Marcar como concluído</button>}
          </div>
        </div>

        <div style={s.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: ESCURO }}>Resumo para digitar no sistema do MDS</div>
          <div style={{ fontSize: 11.5, color: '#888780', margin: '2px 0 10px' }}>Na ordem do questionário. As questões que o próprio formulário manda pular aparecem como "pulada".</div>
          {ResumoIdent({ id })}
          {linhas.map(l => {
            const cab = l.bloco !== blocoAtual ? (blocoAtual = l.bloco) : null
            return (
              <React.Fragment key={l.k}>
                {cab && <div style={{ fontSize: 11, fontWeight: 700, color: AZUL, textTransform: 'uppercase', letterSpacing: '.04em', margin: '14px 0 4px' }}>{cab}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 8, padding: '7px 0', borderTop: '0.5px solid #EFEDE6', fontSize: 12.5 }}>
                  <span style={s.qn}>{l.n}</span>
                  <div>
                    <div style={{ color: '#888780', fontSize: 11.5 }}>{l.texto}</div>
                    {l.pulada ? <div style={{ color: '#B4B2A9', fontStyle: 'italic' }}>pulada</div>
                      : Array.isArray(l.resp) ? (l.resp.length ? l.resp.map((x, i) => <div key={i} style={{ color: ESCURO }}>☑ {x}</div>) : <div style={{ color: VERMELHO }}>sem resposta</div>)
                      : <div style={{ color: l.resp ? ESCURO : VERMELHO, fontWeight: l.resp ? 600 : 400 }}>{l.resp || 'sem resposta'}</div>}
                  </div>
                </div>
              </React.Fragment>
            )
          })}
          <div style={{ fontSize: 11, fontWeight: 700, color: AZUL, textTransform: 'uppercase', letterSpacing: '.04em', margin: '14px 0 4px' }}>Q37 — Equipe ({eq.length})</div>
          <div style={{ overflowX: 'auto' }}>
            {TabelaEquipe({ eq })}
          </div>
        </div>
      </>
    )
  }

  function ResumoIdent({ id }) {
    const linhas = [
      ['Nome', id.nome], ['Logradouro', [id.tipo_logradouro, id.endereco].filter(Boolean).join(' ')], ['Número', id.numero], ['Complemento', id.complemento],
      ['Bairro', id.bairro], ['CEP', id.cep], ['Município/UF', [id.municipio, id.uf].filter(Boolean).join(' / ')], ['E-mail', id.email],
      ['Telefone', id.telefone ? `(${id.ddd || '__'}) ${id.telefone}${id.ramal ? ' ramal ' + id.ramal : ''}` : ''], ['Data de implantação', fmtData(id.data_implantacao)],
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2px 16px', fontSize: 12.5 }}>
        {linhas.map(([t, v]) => <div key={t}><span style={{ color: '#888780' }}>{t}: </span><b style={{ color: v ? ESCURO : VERMELHO, fontWeight: v ? 600 : 400 }}>{v || '—'}</b></div>)}
      </div>
    )
  }

  function TabelaEquipe({ eq, papel }) {
    const th = { textAlign: 'left', padding: '5px 6px', fontSize: papel ? 8 : 10.5, color: papel ? '#000' : '#888780', borderBottom: '0.5px solid #D3D1C7', whiteSpace: 'nowrap', background: papel ? '#E6F1FB' : 'transparent' }
    const td = { padding: '5px 6px', fontSize: papel ? 8.5 : 11.5, borderBottom: '0.5px solid #EFEDE6', verticalAlign: 'top', color: '#1A1F1C' }
    const cod = (lista, c) => c ? (papel ? c : `${c} – ${rotulo(lista, c)}`) : '—'
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['#', 'Nome completo', 'Nasc.', 'Sexo', 'CPF', 'RG nº', 'Órgão', 'UF', 'E-mail', 'Escol.', 'Profissão', 'Vínculo', 'Função', 'Carga', 'Início'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {eq.map((p, i) => (
            <tr key={i}>
              <td style={td}>{i + 1}</td><td style={{ ...td, fontWeight: 600 }}>{p.nome}</td><td style={td}>{fmtData(p.nascimento)}</td><td style={td}>{p.sexo || '—'}</td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>{p.cpf || '—'}</td><td style={td}>{p.rg_numero || '—'}</td><td style={td}>{p.rg_orgao || '—'}</td><td style={td}>{p.rg_uf || '—'}</td><td style={td}>{p.email || '—'}</td>
              <td style={td}>{cod(ESCOLARIDADE, p.escolaridade)}</td><td style={td}>{cod(PROFISSAO, p.profissao)}</td><td style={td}>{cod(VINCULO, p.vinculo)}</td>
              <td style={td}>{cod(FUNCAO, p.funcao)}</td><td style={td}>{cod(CARGA, p.carga)}</td><td style={td}>{fmtData(p.inicio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ---------------------------------------------------------------- versão em papel (só na impressão)
  function VersaoPapel() {
    const id = r.ident || {}
    const eq = (r.equipe || []).filter(p => p.incluir)
    const caixa = on => <span style={{ display: 'inline-block', width: 10, height: 10, border: '1px solid #333', marginRight: 5, textAlign: 'center', lineHeight: '9px', fontSize: 9, fontWeight: 700, verticalAlign: 'middle' }}>{on ? 'X' : ''}</span>
    const sec = t => <div style={{ background: '#0E7EA8', color: '#fff', fontWeight: 700, fontSize: 10.5, padding: '4px 8px', margin: '12px 0 6px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t}</div>
    const cel = { border: '0.5px solid #999', padding: '2px 4px', fontSize: 8, verticalAlign: 'top' }
    const assinatura = (k, titulo, rotData) => {
      const v = r[k] || {}
      return (
        <div style={{ border: '0.5px solid #999', padding: '8px 10px', marginTop: 8, fontSize: 9.5, breakInside: 'avoid' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{titulo}</div>
          <div>Nome: <b>{v.nome}</b></div>
          <div>CPF: <b>{v.cpf}</b> &nbsp;&nbsp; {rotData}: <b>{fmtData(v.data) || '___/___/______'}</b></div>
          <div>Cargo/Função: <b>{cargoTxt(v)}</b></div>
          <div>Telefone: <b>{v.telefone}</b> &nbsp;&nbsp; E-mail: <b>{v.email}</b></div>
          <div style={{ marginTop: 22, borderTop: '0.5px solid #333', width: 280, paddingTop: 2 }}>Assinatura</div>
        </div>
      )
    }
    const corpo = q => {
      const v = r[q.k]
      if (q.tipo === 'unica' || q.tipo === 'multi') return (
        <div style={{ columns: q.opcoes.length > 8 ? 2 : 1, columnGap: 14, marginTop: 2 }}>
          {q.opcoes.map(o => {
            const on = q.tipo === 'unica' ? v === o : (v || []).includes(o)
            const n = on && q.qtd?.includes(o) ? (r[q.k + '_qtd'] || {})[o] : ''
            const t = on && pedeTexto(q, o) ? qual(r, q, o) : ''
            return <div key={o} style={{ breakInside: 'avoid' }}>{caixa(on)}{o}{n ? ` — ${n}` : ''}{t ? `: ${t}` : ''}</div>
          })}
        </div>
      )
      if (q.tipo === 'texto') return <div>Resposta: <b>{v || '________'}</b></div>
      if (q.tipo === 'numeros') return q.campos.length <= 2
        ? <div>Resposta: <b>{textoResposta(q, r) || '________'}</b></div>
        : <table style={{ borderCollapse: 'collapse', width: '100%' }}><tbody>{q.campos.map(campo => {
            const val = valorCampo(q, v, campo)
            return <tr key={campo[0]}><td style={cel}>{campo[1]}</td><td style={{ ...cel, width: 90, textAlign: 'center', fontWeight: 700 }}>{v?.[campo[0] + '_ns'] ? 'Não sabe' : (val === '' ? '' : val)}</td></tr>
          })}</tbody></table>
      if (q.tipo === 'matriz') return (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={cel} />{q.colunas.map((c, j) => <th key={c} style={{ ...cel, fontWeight: 600, fontSize: 7 }}>{(q.curtas && q.colunas.length > 4) ? q.curtas[j] : c}</th>)}</tr></thead>
          <tbody>{q.linhas.map((l, i) => {
            const marc = q.modo === 'unica' ? (v?.[i] ? [v[i]] : []) : (v?.[i] || [])
            return <tr key={l}><td style={cel}>{l === q.linhaOutro && r[q.k + '_linha'] ? `${l}: ${r[q.k + '_linha']}` : l}</td>{q.colunas.map(c => <td key={c} style={{ ...cel, textAlign: 'center' }}>{caixa(marc.includes(c))}</td>)}</tr>
          })}</tbody>
        </table>
      )
      return null
    }
    return (
      <div id="censo-papel" style={{ fontFamily: 'Arial, sans-serif', color: '#000', fontSize: 9.5 }}>
        <div style={{ textAlign: 'center', borderBottom: '1.5px solid #0E7EA8', paddingBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>CENSO SUAS {ANO} — Centro Dia e outras unidades de habilitação e reabilitação de pessoas com deficiência</div>
          <div>Serviço de Proteção Social Especial para pessoas com deficiência, idosas e suas famílias</div>
        </div>
        {sec('BLOCO 1 – IDENTIFICAÇÃO DA UNIDADE')}
        <div>Nome: <b>{id.nome}</b></div>
        <div>Endereço: <b>{[id.tipo_logradouro, id.endereco].filter(Boolean).join(' ')}</b>, nº <b>{id.numero}</b> {id.complemento && <>— {id.complemento}</>} · Bairro: <b>{id.bairro}</b></div>
        <div>CEP: <b>{id.cep}</b> · Município: <b>{id.municipio}</b> · UF: <b>{id.uf}</b></div>
        <div>E-mail: <b>{id.email}</b> · Telefone: <b>({id.ddd}) {id.telefone}</b>{id.ramal && <> · Ramal {id.ramal}</>} · Data de implantação: <b>{fmtData(id.data_implantacao)}</b></div>
        {BLOCOS.slice(1, -1).map((b, bi) => (
          <div key={b.id}>
            {sec(`BLOCO ${bi + 2} – ${b.titulo.toUpperCase()}`)}
            {b.questoes.map(q => {
              if (!q.n || q.tipo === 'equipe') return null
              const pul = !visivel(q, r)
              return (
                <div key={q.k} style={{ marginBottom: 6, breakInside: 'avoid', opacity: pul ? 0.5 : 1 }}>
                  <div style={{ fontWeight: 700 }}>{q.n}. {q.texto}{pul && ' — (pulada conforme o questionário)'}</div>
                  {!pul && corpo(q)}
                </div>
              )
            })}
            {b.id === 'b6' && (
              <div style={{ breakInside: 'avoid' }}>
                <div style={{ fontWeight: 700, margin: '6px 0 3px' }}>37. Equipe desta Unidade (códigos conforme a legenda do formulário)</div>
                {TabelaEquipe({ eq, papel: true })}
              </div>
            )}
          </div>
        ))}
        {sec(`BLOCO ${BLOCOS.length} – RESPONSÁVEL PELO PREENCHIMENTO`)}
        {assinatura('resp', '38. Pessoa responsável pelas informações prestadas pela Unidade', 'Data de preenchimento')}
        {assinatura('gestor', 'Agente público responsável, no Órgão Gestor da Assistência Social, pelas informações declaradas', 'Data de validação')}
        <div style={{ marginTop: 8, fontSize: 8.5, fontStyle: 'italic' }}>Este formulário original, após a digitação dos dados, deve permanecer arquivado na Secretaria Municipal de Assistência Social ou Secretaria Estadual de Assistência Social (ou congênere).</div>
      </div>
    )
  }

  // ---------------------------------------------------------------- render
  if (carregando) return <div style={{ padding: '2.5rem', textAlign: 'center', color: '#888780', fontSize: 13 }}>Carregando o Censo e puxando dados do sistema…</div>
  if (erro && !Object.keys(r).length) return <div style={{ ...s.card, color: VERMELHO, fontSize: 13, margin: '1.5rem' }}><i className="ti ti-alert-octagon" /> {erro}</div>

  const naRevisao = passo === BLOCOS.length
  const bloco = BLOCOS[passo]
  const totalQ = BLOCOS.flatMap(b => b.questoes).filter(q => q.n && visivel(q, r)).length
  const pendTotal = BLOCOS.reduce((a, b) => a + pendBloco(b), 0)

  return (
    <MobileCtx.Provider value={isMobile}>
    <div style={{ maxWidth: 920, margin: '0 auto', padding: isMobile ? '0.75rem' : '1.25rem 1.5rem 3rem' }}>
      <style>{`
        #censo-papel { display: none; }
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden !important; }
          #censo-papel, #censo-papel * { visibility: visible !important; }
          #censo-papel { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* topo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: ESCURO }}>Censo SUAS {ANO}</div>
          <div style={{ fontSize: 12.5, color: CINZA }}>Questionário Centro Dia (PSE para pessoas com deficiência) · mês de referência {MES_REF}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11.5, color: '#888780' }}>
          <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: registro?.status === 'concluido' ? '#EAF3DE' : '#FAEEDA', color: registro?.status === 'concluido' ? VERDE : LARANJA }}>
            {registro?.status === 'concluido' ? 'Concluído' : 'Rascunho'}
          </span>
          <div style={{ marginTop: 4 }}>{salvando ? 'Salvando…' : salvoEm ? `Salvo às ${salvoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : registro ? 'Salvo' : 'Ainda não salvo'}</div>
        </div>
      </div>

      {erro && <div style={{ ...s.card, color: VERMELHO, fontSize: 12.5, padding: '8px 12px' }}><i className="ti ti-alert-octagon" /> {erro}</div>}
      {origemAnterior && !registro && <div style={{ ...s.card, fontSize: 12.5, color: AZUL, padding: '8px 12px' }}><i className="ti ti-info-circle" /> Começou com as respostas do Censo {origemAnterior}. Confira o que mudou.</div>}

      {/* etapas */}
      <div style={{ ...s.card, padding: '10px 12px', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {[...BLOCOS, { id: 'rev', curto: 'Revisão' }].map((b, i) => {
            const on = i === passo
            const pend = b.id === 'rev' ? 0 : pendBloco(b)
            return (
              <button key={b.id} type="button" onClick={() => { setPasso(i); window.scrollTo({ top: 0 }) }}
                style={{ padding: '6px 11px', fontSize: 12, borderRadius: 8, whiteSpace: 'nowrap', cursor: 'pointer', border: `0.5px solid ${on ? AZUL : '#D3D1C7'}`, background: on ? AZUL : '#fff', color: on ? '#fff' : CINZA, display: 'flex', alignItems: 'center', gap: 5 }}>
                {b.id !== 'rev' && <span style={{ fontSize: 10, opacity: .8 }}>{i + 1}</span>}{b.curto}
                {b.id !== 'rev' && (pend
                  ? <span style={{ fontSize: 10, fontWeight: 700, background: on ? 'rgba(255,255,255,.25)' : '#FAEEDA', color: on ? '#fff' : LARANJA, borderRadius: 99, padding: '0 6px' }}>{pend}</span>
                  : <i className="ti ti-check" style={{ color: on ? '#fff' : VERDE }} />)}
              </button>
            )
          })}
        </div>
        <div style={{ height: 4, background: '#EFEDE6', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(100 * (1 - Math.min(pendTotal, totalQ) / Math.max(totalQ, 1)))}%`, background: '#6BBF2B', transition: 'width .3s' }} />
        </div>
      </div>

      {naRevisao ? Revisao() : (
        <div style={s.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: AZUL, textTransform: 'uppercase', letterSpacing: '.05em' }}>Bloco {passo + 1}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: ESCURO, marginBottom: 2 }}>{bloco.titulo}</div>
          {bloco.nota && <div style={{ fontSize: 11.5, color: '#888780' }}>{bloco.nota}</div>}
          {bloco.questoes.filter(q => visivel(q, r)).map(q => <React.Fragment key={q.k}>{Questao({ q })}</React.Fragment>)}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
        <button type="button" style={{ ...s.btnTxt, visibility: passo > 0 ? 'visible' : 'hidden' }} onClick={() => { setPasso(p => p - 1); window.scrollTo({ top: 0 }) }}>← Voltar</button>
        {!naRevisao && <button type="button" style={s.btn(AZUL)} onClick={() => { setPasso(p => p + 1); window.scrollTo({ top: 0 }) }}>{passo === BLOCOS.length - 1 ? 'Revisar e imprimir →' : 'Próximo bloco →'}</button>}
      </div>

      {VersaoPapel()}
    </div>
    </MobileCtx.Provider>
  )
}
