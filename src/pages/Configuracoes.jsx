import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Configuracoes() {
  const [senha, setSenha] = useState('')
  const [senhaOk, setSenhaOk] = useState(false)
  const [confirmando, setConfirmando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  function verificarSenha(e) {
    e.preventDefault()
    if (senha === 'confirmar') { setSenhaOk(true); setMsg('') }
    else { setMsg('Digite "confirmar" para continuar.'); setSenha('') }
  }

  async function executar(tipo) {
    setLoading(true)
    try {
      if (tipo === 'extratos') {
        // Limpa movimentações primeiro (FK), depois extratos
        await supabase.from('extrato_movs').delete().neq('id', 0)
        await supabase.from('extratos').delete().neq('id', 0)
        setMsg('✓ Extratos e movimentações excluídos.')

      } else if (tipo === 'lancamentos') {
        await supabase.from('rateios').delete().neq('id', 0)
        await supabase.from('lancamentos').delete().neq('id', 0)
        setMsg('✓ Lançamentos excluídos.')

      } else if (tipo === 'cobrancas') {
        await supabase.from('historico_cobrancas').delete().neq('id', 0)
        await supabase.from('cobrancas').delete().neq('id', 0)
        setMsg('✓ Cobranças excluídas.')

      } else if (tipo === 'eventos_campanhas') {
        await supabase.from('eventos').delete().neq('id', 0)
        await supabase.from('campanhas').delete().neq('id', 0)
        setMsg('✓ Eventos e campanhas excluídos.')

      } else if (tipo === 'funcionarios') {
        await supabase.from('pagamentos_divida').delete().neq('id', 0)
        await supabase.from('dividas').delete().neq('id', 0)
        await supabase.from('funcionarios').delete().neq('id', 0)
        setMsg('✓ Funcionários e dívidas excluídos.')

      } else if (tipo === 'fechamentos') {
        await supabase.from('fechamentos').delete().neq('id', 0)
        setMsg('✓ Fechamentos excluídos.')

      } else if (tipo === 'tudo') {
        // Ordem correta respeitando FKs
        await supabase.from('historico_cobrancas').delete().neq('id', 0)
        await supabase.from('cobrancas').delete().neq('id', 0)
        await supabase.from('historico_movs').delete().neq('id', 0)
        await supabase.from('pagamentos_divida').delete().neq('id', 0)
        await supabase.from('dividas').delete().neq('id', 0)
        await supabase.from('funcionarios').delete().neq('id', 0)
        await supabase.from('fechamentos').delete().neq('id', 0)
        await supabase.from('extrato_movs').delete().neq('id', 0)
        await supabase.from('extratos').delete().neq('id', 0)
        await supabase.from('rateios').delete().neq('id', 0)
        await supabase.from('lancamentos').delete().neq('id', 0)
        await supabase.from('eventos').delete().neq('id', 0)
        await supabase.from('campanhas').delete().neq('id', 0)
        setMsg('✓ Todos os dados de teste foram excluídos. Sistema pronto para uso real!')
      }
    } catch(err) {
      setMsg('Erro: ' + err.message)
    }
    setLoading(false)
    setConfirmando(null)
    setTimeout(() => setMsg(''), 5000)
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
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Configurações avançadas</div>

      <div style={{ background: '#FEF2F2', border: '0.5px solid #F7C1C1', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D', marginBottom: 4 }}>⚠ Zona de perigo</div>
        <div style={{ fontSize: 12, color: '#5F5E5A' }}>As ações abaixo são irreversíveis. Use apenas para limpar dados de teste antes de começar o uso real.</div>
      </div>

      {!senhaOk ? (
        <div style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1.5rem', maxWidth: 400 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Digite <strong>confirmar</strong> para continuar</div>
          <form onSubmit={verificarSenha}>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Senha master" required
              style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8, marginBottom: 10 }} />
            {msg && <div style={{ fontSize: 12, color: '#A32D2D', marginBottom: 10 }}>{msg}</div>}
            <button type="submit" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: '#E8212A', color: '#fff', cursor: 'pointer' }}>
              Verificar senha
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div style={{ background: '#F2FAE8', border: '0.5px solid #C0DD97', borderRadius: 10, padding: '.6rem 1rem', marginBottom: '1.25rem', fontSize: 12, color: '#3B6D11' }}>
            ✓ Senha verificada — você pode executar as ações abaixo.
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
