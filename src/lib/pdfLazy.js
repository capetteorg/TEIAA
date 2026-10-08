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

// Telas que consultam o banco ANTES de gerar o PDF chamam isto no início do
// clique (antes do await da consulta) e depois só chamam o gerador normalmente.
// A janela reservada é usada pelo gerador seguinte — sem precisar passá-la nos
// argumentos nem editar cada função de PDF.
let _janelaReservada = null
export function reservarJanelaImpressao() {
  // Limpa reserva anterior órfã (ex.: uma impressão que abortou antes de gerar).
  if (_janelaReservada && !_janelaReservada.closed) _janelaReservada.close()
  _janelaReservada = typeof window !== 'undefined' ? window.open('', '_blank') : null
  return _janelaReservada
}

// Abre a janela de impressão AINDA dentro do clique, antes do await do import
// sob demanda. Sem isso o navegador do celular trata o window.open que viria
// depois do await como pop-up não solicitado e bloqueia. A janela é entregue ao
// pdf.js via __definirJanelaImpressao; em caso de erro ela é fechada.
function impressao(nome) {
  return async (...args) => {
    // Ordem da janela:
    //  1) reservada por reservarJanelaImpressao() — telas que consultam antes de gerar;
    //  2) opts.janela nos argumentos — chamador que já abriu e repassa (evita aba dupla);
    //  3) senão, abre agora (chamador síncrono: ainda está dentro do clique).
    const jaTem = args.some(a => a && typeof a === 'object' && a.janela)
    let janela = _janelaReservada
    _janelaReservada = null
    if (janela && janela.closed) janela = null // reserva órfã já fechada pelo chamador
    if (!janela && !jaTem && typeof window !== 'undefined') janela = window.open('', '_blank')
    let mod
    try {
      mod = await carregar()
    } catch (e) {
      if (janela && !janela.closed) janela.close()
      throw e
    }
    if (janela && mod.__definirJanelaImpressao) mod.__definirJanelaImpressao(janela)
    try {
      return await mod[nome](...args)
    } catch (e) {
      if (janela && !janela.closed) janela.close()
      throw e
    }
  }
}

export const gerarPDFConciliacao = impressao('gerarPDFConciliacao')
export const gerarPDFRelatorio = impressao('gerarPDFRelatorio')
export const gerarPDFTransparencia = impressao('gerarPDFTransparencia')
export const gerarPDFEvento = impressao('gerarPDFEvento')
export const gerarPDFCampanha = impressao('gerarPDFCampanha')
export const gerarPDFCobrancas = impressao('gerarPDFCobrancas')
export const gerarPDFPrestacaoContas = impressao('gerarPDFPrestacaoContas')
export const gerarPDFParecer = impressao('gerarPDFParecer')
export const gerarPDFParecerAnual = impressao('gerarPDFParecerAnual')
export const gerarPDFPlanoAcao = impressao('gerarPDFPlanoAcao')
export const gerarPDFRelatAnual = impressao('gerarPDFRelatAnual')
export const gerarPDFEquipe = impressao('gerarPDFEquipe')
export const gerarPDFUsuariosAtendidos = impressao('gerarPDFUsuariosAtendidos')
export const gerarPDFAtendimentos = impressao('gerarPDFAtendimentos')
export const gerarPDFAgendaTeacolher = impressao('gerarPDFAgendaTeacolher')
export const gerarPDFFichaAtendimentoTeacolher = impressao('gerarPDFFichaAtendimentoTeacolher')
export const gerarPDFRelatorioTecnicoTeacolher = impressao('gerarPDFRelatorioTecnicoTeacolher')
export const gerarPDFDoacoes = impressao('gerarPDFDoacoes')
export const gerarPDFAnexoTeacolher = impressao('gerarPDFAnexoTeacolher')
export const gerarPDFAgendaTecnicoTeacolher = impressao('gerarPDFAgendaTecnicoTeacolher')
export const gerarPDFCronogramaTeacolher = impressao('gerarPDFCronogramaTeacolher')
export const gerarPDFListaUsuariosComProfissionais = impressao('gerarPDFListaUsuariosComProfissionais')
export const gerarPDFAnexoOficialTeacolher = impressao('gerarPDFAnexoOficialTeacolher')
export const gerarPDFTermoAutorizacaoImagem = impressao('gerarPDFTermoAutorizacaoImagem')
export const gerarPDFAnamneseTeacolher = impressao('gerarPDFAnamneseTeacolher')
export const gerarPDFPiaTeacolher = impressao('gerarPDFPiaTeacolher')
export const gerarPDFFrequenciaTeacolher = impressao('gerarPDFFrequenciaTeacolher')
export const gerarPDFListaPresencaTeacolher = impressao('gerarPDFListaPresencaTeacolher')
