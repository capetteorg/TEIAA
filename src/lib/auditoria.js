// =============================================
// AUDITORIA — registro de ações sensíveis
// Tabela: auditoria (ver SQL em MIGRACAO_AUDITORIA.sql)
// =============================================
import { supabase } from './supabase'

export async function auditar(acao, detalhe = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('auditoria').insert({
      usuario: user?.email || 'desconhecido',
      acao,
      detalhe: String(detalhe).slice(0, 500),
    })
  } catch {
    // Auditoria nunca deve quebrar a ação principal
  }
}
