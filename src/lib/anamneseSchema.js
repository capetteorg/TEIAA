// =============================================
// SCHEMA DA ANAMNESE TEACOLHER
// Fonte única de verdade: o formulário da tela (ProntuarioUsuario) e a ficha
// impressa (pdf.js) leem daqui. Mexer num campo aqui muda os dois de uma vez.
//
// Estrutura montada a partir das fichas que as profissionais já usavam no papel
// (neuropsicopedagogia, psicomotricidade, psicologia e nutrição), mantendo os
// blocos comuns a todas as áreas — em especial os de TEA: perfil sensorial,
// estereotipias, comunicação, rigidez/rotina e seletividade alimentar.
//
// tipos: text | idade | date | textarea | select | checks | numero
// =============================================

const NIVEL_SENSORIAL = ['Hipersensível', 'Hipossensível', 'Sem alteração', 'Não informado']
const SIM_NAO_NI = ['Sim', 'Não', 'Não informado']

export const SECOES_ANAMNESE = [
  {
    titulo: '1. Queixa e diagnóstico',
    campos: [
      { k: 'queixa_principal', label: 'Queixa principal / motivo da procura', tipo: 'textarea', rows: 3 },
      { k: 'diagnostico', label: 'Diagnóstico', tipo: 'text', ph: 'Ex.: Transtorno do Espectro Autista' },
      { k: 'diagnostico_cid', label: 'CID', tipo: 'text', ph: 'Ex.: F84.0' },
      { k: 'diagnostico_profissional', label: 'Quem diagnosticou', tipo: 'text', ph: 'Profissional / serviço' },
      { k: 'diagnostico_data', label: 'Data do diagnóstico', tipo: 'date' },
      { k: 'possui_laudo', label: 'Possui laudo?', tipo: 'select', opcoes: ['Sim', 'Não', 'Em avaliação', 'Não informado'] },
      { k: 'expectativa_familia', label: 'O que a família espera do acompanhamento', tipo: 'textarea' },
    ],
  },
  {
    titulo: '2. Gestação, parto e primeiros meses',
    campos: [
      { k: 'gravidez_planejada', label: 'Gravidez planejada?', tipo: 'select', opcoes: SIM_NAO_NI },
      { k: 'pre_natal', label: 'Fez pré-natal?', tipo: 'select', opcoes: ['Sim', 'Não', 'Parcial', 'Não informado'] },
      { k: 'pre_natal_inicio', label: 'Pré-natal a partir de que mês', tipo: 'text', ph: 'Ex.: 2º mês' },
      { k: 'intercorrencias_gestacao', label: 'Intercorrências na gestação', tipo: 'checks', opcoes: [
        'Diabetes gestacional', 'Hipertensão / pré-eclâmpsia', 'Infecções (rubéola, toxoplasmose, sífilis…)',
        'Perda de sangue / ameaça de aborto', 'Queda ou acidente', 'Uso de medicamentos',
        'Fumo', 'Álcool', 'Outras drogas', 'Depressão / ansiedade', 'Desnutrição',
        'Sem intercorrências', 'Não informado',
      ]},
      { k: 'historico_gestacao_parto', label: 'Observações sobre a gestação', tipo: 'textarea' },
      { k: 'tipo_parto', label: 'Tipo de parto', tipo: 'select', opcoes: ['Normal', 'Cesárea', 'Fórceps', 'Induzido', 'Não informado'] },
      { k: 'semanas_gestacao', label: 'Semanas de gestação', tipo: 'text', ph: 'Ex.: 38 semanas' },
      { k: 'prematuro', label: 'Prematuro?', tipo: 'select', opcoes: SIM_NAO_NI },
      { k: 'apgar', label: 'Apgar', tipo: 'text', ph: 'Ex.: 8/9' },
      { k: 'intercorrencias_parto', label: 'Intercorrências no parto / nascimento', tipo: 'checks', opcoes: [
        'Cordão em volta do pescoço', 'Precisou de oxigênio', 'Demorou a chorar', 'Ficou roxo / cianose',
        'Sofrimento fetal', 'Icterícia / fototerapia', 'Ficou na incubadora', 'Cirurgia ao nascer',
        'Internação em UTI neonatal', 'Sem intercorrências', 'Não informado',
      ]},
      { k: 'amamentacao', label: 'Amamentação (mamou no peito, até quando, desmame)', tipo: 'textarea' },
    ],
  },
  {
    titulo: '3. Marcos do desenvolvimento',
    areas: ['Fisioterapia','Psicomotricidade','Neuropsicopedagogia','Fonoaudiologia','Terapia ocupacional'],
    campos: [
      { k: 'marco_rolou', label: 'Rolou', tipo: 'idade' },
      { k: 'marco_sentou', label: 'Sentou', tipo: 'idade' },
      { k: 'marco_engatinhou', label: 'Engatinhou', tipo: 'idade' },
      { k: 'marco_andou', label: 'Andou', tipo: 'idade' },
      { k: 'marco_primeiras_palavras', label: 'Primeiras palavras', tipo: 'idade' },
      { k: 'marco_frases', label: 'Primeiras frases', tipo: 'idade' },
      { k: 'marco_esfincter_diurno', label: 'Controle de esfíncter — diurno', tipo: 'idade' },
      { k: 'marco_esfincter_noturno', label: 'Controle de esfíncter — noturno', tipo: 'idade' },
      { k: 'dominancia_manual', label: 'Dominância manual', tipo: 'select', opcoes: ['Destro', 'Canhoto', 'Ambidestro', 'Ainda não definida', 'Não informado'] },
      { k: 'desenvolvimento_inicial', label: 'Observações sobre o desenvolvimento (atrasos, regressões, perda de habilidades)', tipo: 'textarea' },
    ],
  },
  {
    titulo: '4. Saúde',
    campos: [
      { k: 'condicoes_saude', label: 'Condições de saúde já apresentadas', tipo: 'checks', opcoes: [
        'Convulsões / epilepsia', 'Traumatismo craniano', 'Perda de consciência / desmaio',
        'Internações', 'Cirurgias', 'Infecções de ouvido recorrentes', 'Asma / bronquite',
        'Pneumonia', 'Meningite', 'Problemas cardíacos', 'Problemas respiratórios',
        'Distúrbios gastrointestinais', 'Nenhuma', 'Não informado',
      ]},
      { k: 'historico_saude', label: 'Detalhamento do histórico de saúde (quando, idade, tratamento)', tipo: 'textarea' },
      { k: 'medicacoes_em_uso', label: 'Medicações em uso (nome, dose, desde quando)', tipo: 'textarea' },
      { k: 'alergias_restricoes', label: 'Alergias e restrições', tipo: 'textarea' },
      { k: 'problemas_visao', label: 'Visão (usa óculos, exame realizado)', tipo: 'text' },
      { k: 'problemas_audicao', label: 'Audição (exame realizado, resultado)', tipo: 'text' },
      { k: 'vacinas', label: 'Vacinas', tipo: 'select', opcoes: ['Em dia', 'Não estão em dia', 'Não informado'] },
      { k: 'acompanhamentos_externos', label: 'Acompanhamentos externos (pediatra, neuro, terapias fora do projeto)', tipo: 'textarea' },
    ],
  },
  {
    titulo: '5. Perfil sensorial e estereotipias',
    areas: ['Terapia ocupacional','Psicomotricidade','Psicologia','Fonoaudiologia','Fisioterapia'],
    campos: [
      { k: 'sensibilidade_auditiva', label: 'Sensibilidade auditiva', tipo: 'select', opcoes: NIVEL_SENSORIAL },
      { k: 'sensibilidade_visual', label: 'Sensibilidade visual', tipo: 'select', opcoes: NIVEL_SENSORIAL },
      { k: 'sensibilidade_tatil', label: 'Sensibilidade tátil', tipo: 'select', opcoes: NIVEL_SENSORIAL },
      { k: 'sensibilidade_gustativa_olfativa', label: 'Sensibilidade gustativa / olfativa', tipo: 'select', opcoes: NIVEL_SENSORIAL },
      { k: 'sensibilidade_vestibular', label: 'Sensibilidade vestibular / proprioceptiva', tipo: 'select', opcoes: NIVEL_SENSORIAL },
      { k: 'reacoes_sensoriais', label: 'Como reage a barulho, luz, texturas, multidão', tipo: 'textarea' },
      { k: 'estereotipias', label: 'Estereotipias e movimentos repetitivos', tipo: 'checks', opcoes: [
        'Balançar o corpo', 'Flapping (bater as mãos)', 'Girar objetos', 'Girar o próprio corpo',
        'Andar na ponta dos pés', 'Vocalizações repetitivas', 'Alinhar / enfileirar objetos',
        'Bater a cabeça', 'Autoagressão', 'Roer unhas', 'Chupar o dedo', 'Puxar o cabelo',
        'Tiques', 'Nenhuma observada', 'Não informado',
      ]},
      { k: 'estereotipias_detalhes', label: 'Em que situações aparecem (detalhar)', tipo: 'textarea' },
      { k: 'estrategias_regulacao', label: 'O que acalma e o que desorganiza (estratégias de regulação)', tipo: 'textarea' },
    ],
  },
  {
    titulo: '6. Comunicação e linguagem',
    areas: ['Fonoaudiologia','Psicologia','Neuropsicopedagogia'],
    campos: [
      { k: 'forma_comunicacao', label: 'Como se comunica hoje', tipo: 'checks', opcoes: [
        'Verbal — frases completas', 'Verbal — palavras isoladas', 'Ecolalia', 'Gestos / apontar',
        'Puxa pela mão', 'CAA (PECS, prancha, tablet)', 'Não verbal', 'Não informado',
      ]},
      { k: 'contato_visual', label: 'Contato visual', tipo: 'select', opcoes: ['Presente e sustentado', 'Presente, mas breve', 'Inconsistente', 'Ausente', 'Não informado'] },
      { k: 'responde_ao_nome', label: 'Responde/olha quando chamado pelo nome', tipo: 'select', opcoes: ['Sim', 'Às vezes', 'Não', 'Não informado'] },
      { k: 'fala_compreensivel', label: 'A fala é compreensível?', tipo: 'select', opcoes: ['Sim', 'Parcialmente', 'Não', 'Não se aplica', 'Não informado'] },
      { k: 'compreende_ordens', label: 'Compreende ordens e recados (simples, complexos)', tipo: 'textarea' },
      { k: 'comunicacao_interacao', label: 'Observações sobre comunicação e interação', tipo: 'textarea' },
    ],
  },
  {
    titulo: '7. Comportamento, interação e rotina',
    areas: ['Psicologia','Terapia ocupacional','Socioeducativo','Orientação familiar'],
    campos: [
      { k: 'rotina_diaria', label: 'Descreva um dia da rotina (de quando acorda até dormir)', tipo: 'textarea', rows: 3 },
      { k: 'brincadeira_preferencia', label: 'Prefere brincar', tipo: 'select', opcoes: ['Sozinho', 'Em grupo', 'Indiferente', 'Não informado'] },
      { k: 'brincadeira_funcional', label: 'Brinca de forma funcional?', tipo: 'select', opcoes: ['Sim', 'Parcialmente', 'Não', 'Não informado'] },
      { k: 'interesses_restritos', label: 'Interesses restritos / brinquedos e temas preferidos', tipo: 'textarea' },
      { k: 'reacao_mudanca_rotina', label: 'Reação a mudança de rotina ou de ambiente', tipo: 'select', opcoes: ['Aceita bem', 'Estranha, mas se adapta', 'Reage intensamente', 'Não informado'] },
      { k: 'reacao_frustracao', label: 'Como reage ao "não" e à frustração', tipo: 'textarea' },
      { k: 'comportamentos', label: 'Comportamentos observados', tipo: 'checks', opcoes: [
        'Agitação / inquietude', 'Impulsividade', 'Agressividade', 'Autoagressão', 'Birras intensas',
        'Apatia / retraimento', 'Teimosia / oposição', 'Timidez', 'Ansiedade', 'Medos específicos',
        'Dificuldade de atenção', 'Dificuldade com regras', 'Nenhum observado', 'Não informado',
      ]},
      { k: 'medos', label: 'Medos (quais)', tipo: 'text' },
      { k: 'tempo_telas', label: 'Uso de telas', tipo: 'select', opcoes: ['Muito', 'Moderado', 'Pouco', 'Não usa', 'Não informado'] },
      { k: 'reacao_saida_telas', label: 'Como reage quando precisa sair das telas', tipo: 'text' },
      { k: 'socializacao', label: 'Socialização (relação com colegas, adultos, ambientes novos)', tipo: 'textarea' },
    ],
  },
  {
    titulo: '8. Alimentação e sono',
    areas: ['Nutrição','Fonoaudiologia','Terapia ocupacional'],
    campos: [
      { k: 'seletividade_alimentar', label: 'Seletividade alimentar', tipo: 'select', opcoes: ['Sim — intensa', 'Sim — moderada', 'Não', 'Não informado'] },
      { k: 'seletividade_detalhes', label: 'O que recusa / texturas, cores e temperaturas que evita ou prefere', tipo: 'textarea' },
      { k: 'reacao_novos_alimentos', label: 'Como reage a alimentos novos', tipo: 'textarea' },
      { k: 'rituais_refeicao', label: 'Rituais ou comportamentos repetitivos nas refeições', tipo: 'textarea' },
      { k: 'peso', label: 'Peso (kg)', tipo: 'text' },
      { k: 'altura', label: 'Altura (m)', tipo: 'text' },
      { k: 'imc', label: 'IMC', tipo: 'text' },
      { k: 'sono_caracteristicas', label: 'Características do sono', tipo: 'checks', opcoes: [
        'Sono tranquilo', 'Sono agitado', 'Dificuldade para adormecer', 'Acorda durante a noite',
        'Acorda chorando', 'Pesadelos', 'Range os dentes (bruxismo)', 'Fala dormindo',
        'Sonambulismo', 'Xixi na cama (enurese)', 'Sono leve', 'Sono pesado', 'Não informado',
      ]},
      { k: 'sono_detalhes', label: 'Onde e com quem dorme, horários, como adormece', tipo: 'textarea' },
      { k: 'alimentacao_sono', label: 'Observações gerais sobre alimentação e sono', tipo: 'textarea' },
    ],
  },
  {
    titulo: '9. Vida escolar',
    areas: ['Neuropsicopedagogia','Psicologia','Socioeducativo'],
    campos: [
      { k: 'escola_atual', label: 'Escola atual', tipo: 'text' },
      { k: 'escola_serie_turno', label: 'Série / turma / turno', tipo: 'text' },
      { k: 'escola_tipo', label: 'Tipo de escola', tipo: 'select', opcoes: ['Pública', 'Particular', 'Não frequenta', 'Não informado'] },
      { k: 'tem_mediador', label: 'Possui mediador / profissional de apoio?', tipo: 'select', opcoes: ['Sim', 'Não', 'Em processo', 'Não informado'] },
      { k: 'adaptacoes_escolares', label: 'Adaptações curriculares / plano educacional individualizado', tipo: 'textarea' },
      { k: 'queixas_escola', label: 'Queixas trazidas pela escola', tipo: 'textarea' },
      { k: 'historico_escolar', label: 'Histórico escolar (idade de ingresso, trocas de escola, alfabetização, dificuldades)', tipo: 'textarea' },
    ],
  },
  {
    titulo: '10. Contexto sociofamiliar e antecedentes',
    areas: ['Serviço social','Orientação familiar'],
    campos: [
      { k: 'com_quem_mora', label: 'Com quem mora', tipo: 'text' },
      { k: 'contexto_sociofamiliar', label: 'Composição e dinâmica familiar', tipo: 'textarea' },
      { k: 'beneficios_sociais', label: 'Benefícios sociais (BPC, Bolsa Família etc.)', tipo: 'text' },
      { k: 'rede_apoio', label: 'Rede de apoio (quem ajuda no cuidado)', tipo: 'textarea' },
      { k: 'antecedentes_familiares', label: 'Antecedentes familiares', tipo: 'checks', opcoes: [
        'TEA', 'TDAH', 'Deficiência intelectual', 'Transtornos de aprendizagem (dislexia, discalculia)',
        'Transtorno mental (depressão, bipolaridade, esquizofrenia)', 'Epilepsia / convulsões',
        'Deficiência auditiva ou visual', 'Uso abusivo de álcool / drogas', 'Nenhum relatado', 'Não informado',
      ]},
      { k: 'antecedentes_familiares_detalhes', label: 'Quem e o quê (grau de parentesco)', tipo: 'textarea' },
    ],
  },
  {
    titulo: '11. Observações complementares',
    campos: [
      { k: 'observacoes', label: 'Observações', tipo: 'textarea', rows: 3 },
    ],
  },
]

export const CAMPOS_ANAMNESE = SECOES_ANAMNESE.flatMap(s => s.campos)

// Campos que guardam array (checkboxes) — precisam de tratamento próprio ao
// salvar/carregar e ao imprimir.
export const CAMPOS_LISTA = CAMPOS_ANAMNESE.filter(c => c.tipo === 'checks').map(c => c.k)

// Campos de data — vão para o banco como null quando vazios.
export const CAMPOS_DATA = CAMPOS_ANAMNESE.filter(c => c.tipo === 'date').map(c => c.k)

// Cabeçalho da ficha (fora das seções — identificação da entrevista)
export const CAMPOS_CABECALHO = [
  { k: 'data_entrevista', label: 'Data da entrevista', tipo: 'date' },
  { k: 'entrevistado_nome', label: 'Entrevistado(a)', tipo: 'text', ph: 'Nome de quem respondeu' },
  { k: 'entrevistado_parentesco', label: 'Parentesco / vínculo', tipo: 'text', ph: 'Mãe, pai, avó...' },
]
