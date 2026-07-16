// Áreas de atendimento do TEAcolher — usadas como destino dos recados da equipe
// e no mapeamento função→área abaixo.
export const AREAS_EQUIPE = [
  'Psicologia', 'Fisioterapia', 'Nutrição', 'Psicomotricidade', 'Neuropsicopedagogia',
  'Fonoaudiologia', 'Terapia ocupacional', 'Serviço social', 'Socioeducativo', 'Orientação familiar',
]

// Liga a função/cargo do profissional (cadastro da equipe) à área de atendimento
// do TEAcolher. Usada no agendamento (pra área não ficar desencontrada do
// profissional escolhido) e no prontuário (pra destacar as seções da anamnese
// que são da área de quem está preenchendo).
export function areaPelaFuncao(funcao = '') {
  const f = String(funcao || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const mapa = [
    [['psicolog'], 'Psicologia'],
    [['fisioterap'], 'Fisioterapia'],
    [['nutri'], 'Nutrição'],
    [['psicomotric'], 'Psicomotricidade'],
    [['neuropsicopedagog', 'psicopedagog'], 'Neuropsicopedagogia'],
    [['fonoaudiolog', 'fono'], 'Fonoaudiologia'],
    [['ocupacional'], 'Terapia ocupacional'],
    [['assistente social', 'servico social'], 'Serviço social'],
    [['socioeducad', 'socioeducativ'], 'Socioeducativo'],
    [['orientador familiar', 'orientacao familiar'], 'Orientação familiar'],
  ]
  for (const [chaves, area] of mapa) {
    if (chaves.some(c => f.includes(c))) return area
  }
  return null
}
