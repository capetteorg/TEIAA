// =============================================
// PDF SOB DEMANDA — o pdf.js pesa ~0,7MB (papel timbrado em base64).
// Este módulo expõe as mesmas funções, mas o arquivo pesado só é baixado
// na primeira impressão (ou no pré-carregamento ocioso do Layout).
// Trocar o import de ../lib/pdf para ../lib/pdfLazy não muda nenhuma chamada.
// =============================================

const carregar = () => import('./pdf')

// Pré-carrega em segundo plano (chamado pelo Layout depois que o app abre,
// pra janela de impressão nunca esbarrar no bloqueio de pop-up por demora).
export function precarregarPDF() { carregar() }

export const gerarPDFConciliacao = async (...args) => (await carregar()).gerarPDFConciliacao(...args)
export const gerarPDFRelatorio = async (...args) => (await carregar()).gerarPDFRelatorio(...args)
export const gerarPDFTransparencia = async (...args) => (await carregar()).gerarPDFTransparencia(...args)
export const gerarPDFEvento = async (...args) => (await carregar()).gerarPDFEvento(...args)
export const gerarPDFCampanha = async (...args) => (await carregar()).gerarPDFCampanha(...args)
export const gerarPDFCobrancas = async (...args) => (await carregar()).gerarPDFCobrancas(...args)
export const gerarPDFPrestacaoContas = async (...args) => (await carregar()).gerarPDFPrestacaoContas(...args)
export const gerarPDFParecer = async (...args) => (await carregar()).gerarPDFParecer(...args)
export const gerarPDFParecerAnual = async (...args) => (await carregar()).gerarPDFParecerAnual(...args)
export const gerarPDFPlanoAcao = async (...args) => (await carregar()).gerarPDFPlanoAcao(...args)
export const gerarPDFRelatAnual = async (...args) => (await carregar()).gerarPDFRelatAnual(...args)
export const gerarPDFEquipe = async (...args) => (await carregar()).gerarPDFEquipe(...args)
export const gerarPDFUsuariosAtendidos = async (...args) => (await carregar()).gerarPDFUsuariosAtendidos(...args)
export const gerarPDFAtendimentos = async (...args) => (await carregar()).gerarPDFAtendimentos(...args)
export const gerarPDFAgendaTeacolher = async (...args) => (await carregar()).gerarPDFAgendaTeacolher(...args)
export const gerarPDFFichaAtendimentoTeacolher = async (...args) => (await carregar()).gerarPDFFichaAtendimentoTeacolher(...args)
export const gerarPDFRelatorioTecnicoTeacolher = async (...args) => (await carregar()).gerarPDFRelatorioTecnicoTeacolher(...args)
export const gerarPDFDoacoes = async (...args) => (await carregar()).gerarPDFDoacoes(...args)
export const gerarPDFAnexoTeacolher = async (...args) => (await carregar()).gerarPDFAnexoTeacolher(...args)
export const gerarPDFAgendaTecnicoTeacolher = async (...args) => (await carregar()).gerarPDFAgendaTecnicoTeacolher(...args)
export const gerarPDFCronogramaTeacolher = async (...args) => (await carregar()).gerarPDFCronogramaTeacolher(...args)
export const gerarPDFListaUsuariosComProfissionais = async (...args) => (await carregar()).gerarPDFListaUsuariosComProfissionais(...args)
export const gerarPDFAnexoOficialTeacolher = async (...args) => (await carregar()).gerarPDFAnexoOficialTeacolher(...args)
export const gerarPDFTermoAutorizacaoImagem = async (...args) => (await carregar()).gerarPDFTermoAutorizacaoImagem(...args)
export const gerarPDFAnamneseTeacolher = async (...args) => (await carregar()).gerarPDFAnamneseTeacolher(...args)
export const gerarPDFPiaTeacolher = async (...args) => (await carregar()).gerarPDFPiaTeacolher(...args)
export const gerarPDFFrequenciaTeacolher = async (...args) => (await carregar()).gerarPDFFrequenciaTeacolher(...args)
