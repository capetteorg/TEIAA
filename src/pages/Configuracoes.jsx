import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { auditar } from '../lib/auditoria'

export default function Configuracoes() {
  const [senha, setSenha] = useState('')
  const [senhaOk, setSenhaOk] = useState(false)
  const [confirmando, setConfirmando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  function verificarSenha(e) {
    e.preventDefault()
    if (senha === 'confirmar') { setSenhaOk(true); setMsg('') }
    else { setMsg('Digite exatamente a palavra "confirmar" para liberar as ações.'); setSenha('') }
  }

  // Deleta com verificação de erro — aborta a sequência na primeira falha
  async function del(tabela) {
    const { error } = await supabase.from(tabela).delete().neq('id', 0)
    if (error) throw new Error(`Falha ao limpar "${tabela}": ${error.message}. Operação interrompida — verifique e tente novamente.`)
  }

  async function executar(tipo) {
    setLoading(true)
    auditar('Zona de perigo — exclusão em massa', tipo)
    try {
      if (tipo === 'extratos') {
        // Limpa movimentações primeiro (FK), depois extratos
        await del('extrato_movs')
        await del('extratos')
        setMsg('Extratos e movimentações excluídos.')

      } else if (tipo === 'lancamentos') {
        await del('rateios')
        await del('lancamentos')
        setMsg('Lançamentos excluídos.')

      } else if (tipo === 'cobrancas') {
        await del('historico_cobrancas')
        await del('cobrancas')
        setMsg('Cobranças excluídas.')

      } else if (tipo === 'eventos_campanhas') {
        await del('eventos')
        await del('campanhas')
        setMsg('Eventos e campanhas excluídos.')

      } else if (tipo === 'funcionarios') {
        await del('pagamentos_divida')
        await del('dividas')
        await del('funcionarios')
        setMsg('Funcionários e dívidas excluídos.')

      } else if (tipo === 'fechamentos') {
        await del('fechamentos')
        setMsg('Fechamentos excluídos.')

      } else if (tipo === 'tudo') {
        // Ordem correta respeitando FKs
        await del('historico_cobrancas')
        await del('cobrancas')
        await del('historico_movs')
        await del('pagamentos_divida')
        await del('dividas')
        await del('funcionarios')
        await del('fechamentos')
        await del('extrato_movs')
        await del('extratos')
        await del('rateios')
        await del('lancamentos')
        await del('eventos')
        await del('campanhas')
        setMsg('Todos os dados de teste foram excluídos. Sistema pronto para uso real!')
      }
    } catch(err) {
      setMsg('Erro: ' + err.message)
    }
    setLoading(false)
    setConfirmando(null)
    setTimeout(() => setMsg(m => m && m.includes('Erro') ? m : ''), 4000)
  }

  const acoes = [
    { id: 'extratos',         titulo: 'Excluir extratos importados',    desc: 'Remove todos os extratos bancários e movimentações. Não afeta lançamentos manuais.', cor: '#F4821F' },
    { id: 'lancamentos',      titulo: 'Excluir lançamentos manuais',    desc: 'Remove despesas e entradas lançadas manualmente. Não afeta extratos.', cor: '#F4821F' },
    { id: 'cobrancas',        titulo: 'Excluir cobranças',              desc: 'Remove todos os boletos e histórico de cobranças.', cor: '#F4821F' },
    { id: 'eventos_campanhas',titulo: 'Excluir eventos e campanhas',    desc: 'Remove todos os eventos e campanhas cadastrados.', cor: '#F4821F' },
    { id: 'funcionarios',     titulo: 'Excluir funcionários e dívidas', desc: 'Remove funcionários, dívidas e pagamentos cadastrados.', cor: '#F4821F' },
    { id: 'fechamentos',      titulo: 'Excluir fechamentos',            desc: 'Remove todos os registros de fechamento de período.', cor: '#F4821F' },
    { id: 'tudo',             titulo: 'Limpar TUDO — dados de teste',   desc: 'Remove TODOS os dados operacionais. Use antes de começar o uso real.', cor: '#E8212A', destaque: true },
  ]

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.022em', marginBottom: '1.25rem' }}>Configurações avançadas</div>

      <div style={{ background: '#FEF2F2', border: '0.5px solid #F7C1C1', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D', marginBottom: 4 }}><i className="ti ti-alert-triangle" style={{marginRight:4, color:'#E67814'}} /> Zona de perigo</div>
        <div style={{ fontSize: 12, color: '#5F5E5A' }}>As ações abaixo são irreversíveis. Use apenas para limpar dados de teste antes de começar o uso real.</div>
      </div>

      {!senhaOk ? (
        <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1.5rem', maxWidth: 400 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Digite <strong>confirmar</strong> para continuar</div>
          <form onSubmit={verificarSenha}>
            <input type="text" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder='Digite: confirmar' required autoComplete="off"
              style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8, marginBottom: 10 }} />
            {msg && <div style={{ fontSize: 12, color: '#A32D2D', marginBottom: 10 }}>{msg}</div>}
            <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#E8212A', color: '#fff', cursor: 'pointer' }}>
              Liberar ações
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div style={{ background: '#F2FAE8', border: '0.5px solid #C0DD97', borderRadius: 10, padding: '.6rem 1rem', marginBottom: '1.25rem', fontSize: 12, color: '#0E7EA8' }}>
            <i className="ti ti-check" style={{marginRight:4}} /> Senha verificada — você pode executar as ações abaixo.
          </div>

          {msg && (
            <div style={{ background: msg.includes('Erro') ? '#FEF2F2' : '#F2FAE8', border: `0.5px solid ${msg.includes('Erro') ? '#F7C1C1' : '#C0DD97'}`, borderRadius: 10, padding: '.6rem 1rem', marginBottom: '1.25rem', fontSize: 12, color: msg.includes('Erro') ? '#A32D2D' : '#3B6D11' }}>
              {msg}
            </div>
          )}

          {acoes.map(a => (
            <div key={a.id} style={{ background: 'rgba(255,255,255,0.92)', border: `0.5px solid ${a.destaque ? '#F7C1C1' : '#E8E6DE'}`, borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: a.cor, marginBottom: 4 }}>{a.titulo}</div>
                  <div style={{ fontSize: 12, color: '#5F5E5A' }}>{a.desc}</div>
                </div>
                {confirmando === a.id ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => executar(a.id)} disabled={loading}
                      style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: '#E8212A', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {loading ? 'Excluindo...' : 'Confirmar'}
                    </button>
                    <button onClick={() => setConfirmando(null)}
                      style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmando(a.id)}
                    style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: `0.5px solid ${a.cor}`, background: 'transparent', color: a.cor, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Executar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
