import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { gerarPDFPrestacaoContas } from '../lib/pdf'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

const TIPO_LABEL = {
  emenda: 'Emenda Parlamentar',
  edital: 'Edital',
  fomento: 'Termo de Fomento',
  colaboracao: 'Termo de Colaboração',
  convenio: 'Convênio',
  projeto: 'Projeto Específico',
}

export default function PrestacaoContas() {
  const [contas, setContas] = useState([])
  const [contaSel, setContaSel] = useState(null)
  const [periodo, setPeriodo] = useState('total')
  const [mesInicio, setMesInicio] = useState('')
  const [mesFim, setMesFim] = useState('')
  const [tipoRelatorio, setTipoRelatorio] = useState('preliminar')
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pendencias, setPendencias] = useState([])

  useEffect(() => {
    supabase.from('contas').select('*')
      .not('tipo_conta', 'eq', 'principal')
      .order('nome')
      .then(({ data }) => setContas(data || []))
  }, [])

  async function gerarDados() {
    if (!contaSel) return
    setLoading(true)

    // Busca extratos da conta
    const { data: extratos } = await supabase
      .from('extratos')
      .select('id, competencia, saldo_final')
      .eq('conta_id', contaSel.id)

    if (!extratos || extratos.length === 0) {
      setLoading(false)
      setDados(null)
      alert('Nenhum extrato importado para esta conta.')
      return
    }

    const extratoIds = extratos.map(e => e.id)

    // Busca movimentações
    let q = supabase.from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), subcategoria:subcategorias(nome), plano:planos(nome_plano, valor_total_previsto)')
      .in('extrato_id', extratoIds)
      .order('data')

    if (periodo === 'mes' && mesInicio) {
      q = q.gte('data', mesInicio + '-01').lte('data', mesInicio + '-31')
    } else if (periodo === 'personalizado' && mesInicio && mesFim) {
      q = q.gte('data', mesInicio + '-01').lte('data', mesFim + '-31')
    }

    const { data: movs } = await q
    const lista = movs || []

    // Separa entradas e saídas
    const entradas = lista.filter(m => m.valor > 0)
    const saidas = lista.filter(m => m.valor < 0)

    // Receitas por tipo
    const repasses = entradas.filter(m => m.tipo_receita === 'Repasse da emenda' || (!m.tipo_receita && m.doc?.includes('TED')))
    const rendimentos = entradas.filter(m => m.tipo_receita === 'Rendimento de aplicação' || m.categoria?.nome?.toLowerCase().includes('rendimento'))
    const outrasEntradas = entradas.filter(m => !repasses.includes(m) && !rendimentos.includes(m))

    const totalRepasses = repasses.reduce((a, m) => a + Number(m.valor), 0)
    const totalRendimentos = rendimentos.reduce((a, m) => a + Number(m.valor), 0)
    const totalOutrasEnt = outrasEntradas.reduce((a, m) => a + Number(m.valor), 0)
    const totalDisponivel = totalRepasses + totalRendimentos + totalOutrasEnt
    const totalDespesas = Math.abs(saidas.reduce((a, m) => a + Number(m.valor), 0))
    const saldoFinal = totalDisponivel - totalDespesas

    // Bens permanentes
    const bens = saidas.filter(m => m.bem_permanente)

    // Despesas rateadas
    const rateadas = saidas.filter(m => m.despesa_rateada)

    // Execução por plano de trabalho
    const porPlano = {}
    saidas.forEach(m => {
      if (m.plano_trabalho_id && m.plano) {
        const key = m.plano_trabalho_id
        if (!porPlano[key]) porPlano[key] = { nome: m.plano.nome_plano, valor_previsto: Number(m.plano.valor_total_previsto || 0), executado: 0 }
        porPlano[key].executado += Math.abs(Number(m.valor))
      }
    })

    // Pendências
    const pends = []
    saidas.forEach(m => {
      const p = []
      if (!m.categoria_id) p.push({ tipo: 'Sem categoria', gravidade: 'crítica' })
      if (!m.fornecedor) p.push({ tipo: 'Sem fornecedor', gravidade: 'média' })
      if (!m.num_nota) p.push({ tipo: 'Sem nota/recibo', gravidade: contaSel.tipo_conta !== 'principal' ? 'crítica' : 'média' })
      if (!m.local_comprovante) p.push({ tipo: 'Sem local do comprovante', gravidade: 'média' })
      if (!m.plano_trabalho_id && contaSel.tipo_conta !== 'principal') p.push({ tipo: 'Sem item do plano de trabalho', gravidade: 'crítica' })
      if (!m.conciliado) p.push({ tipo: 'Não conciliado', gravidade: 'crítica' })
      if (p.length > 0) pends.push({ ...m, pendencias: p })
    })
    setPendencias(pends)

    setDados({
      conta: contaSel,
      extratos,
      entradas,
      saidas,
      repasses,
      rendimentos,
      outrasEntradas,
      totalRepasses,
      totalRendimentos,
      totalOutrasEnt,
      totalDisponivel,
      totalDespesas,
      saldoFinal,
      bens,
      rateadas,
      porPlano,
      totalMovs: lista.length,
      totalConciliados: lista.filter(m => m.conciliado).length,
    })
    setLoading(false)
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const pendCriticas = pendencias.reduce((a, m) => a + m.pendencias.filter(p => p.gravidade === 'crítica').length, 0)
  const podeGerarFinal = pendCriticas === 0

  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    btn: (bg, cor = '#fff') => ({ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer' }),
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Prestação de Conta — Emenda / Edital</div>

      {/* Seleção de conta e período */}
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Selecione a conta e o período</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Conta / Emenda / Edital</label>
            <select value={contaSel?.id || ''} onChange={e => setContaSel(contas.find(c => String(c.id) === e.target.value) || null)}
              style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
              <option value="">Selecione uma conta...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome} — {TIPO_LABEL[c.tipo_conta] || c.tipo_conta}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Período</label>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)}
              style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
              <option value="total">Vigência total</option>
              <option value="mes">Mês específico</option>
              <option value="personalizado">Período personalizado</option>
            </select>
          </div>
          {(periodo === 'mes' || periodo === 'personalizado') && (
            <div>
              <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>{periodo === 'mes' ? 'Mês' : 'De'}</label>
              <input type="month" value={mesInicio} onChange={e => setMesInicio(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
            </div>
          )}
          {periodo === 'personalizado' && (
            <div>
              <label style={{ fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 }}>Até</label>
              <input type="month" value={mesFim} onChange={e => setMesFim(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
            </div>
          )}
        </div>
        <button onClick={gerarDados} disabled={!contaSel || loading}
          style={s.btn(contaSel ? '#4A8FD4' : '#D3D1C7')}>
          {loading ? 'Carregando...' : 'Gerar relatório'}
        </button>
      </div>

      {dados && (
        <>
          {/* Identificação da conta */}
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>
              Identificação — {TIPO_LABEL[dados.conta.tipo_conta] || dados.conta.tipo_conta}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, fontSize: 12 }}>
              {[
                ['Conta', dados.conta.nome],
                ['Banco', dados.conta.banco],
                ['Agência / Conta', `${dados.conta.agencia} / ${dados.conta.conta_num}`],
                ['Parlamentar / Origem', dados.conta.parlamentar || '—'],
                ['Órgão concedente', dados.conta.orgao_concedente || '—'],
                ['Nº Termo / Processo', `${dados.conta.num_termo || '—'} / ${dados.conta.num_processo || '—'}`],
                ['Valor aprovado', dados.conta.valor_aprovado ? fmt(dados.conta.valor_aprovado) : '—'],
                ['Valor recebido', dados.conta.valor_recebido ? fmt(dados.conta.valor_recebido) : '—'],
                ['Vigência', `${fmtData(dados.conta.vigencia_inicio)} a ${fmtData(dados.conta.vigencia_fim)}`],
                ['Responsável financeiro', dados.conta.responsavel_financeiro || '—'],
                ['Representante legal', dados.conta.representante_legal || '—'],
                ['Status', dados.conta.status_conta || '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ background: '#F8F7F2', borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ fontSize: 10, color: '#888780', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
            {dados.conta.objeto && (
              <div style={{ marginTop: 8, background: '#F8F7F2', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                <div style={{ fontSize: 10, color: '#888780', marginBottom: 2 }}>Objeto</div>
                <div>{dados.conta.objeto}</div>
              </div>
            )}
          </div>

          {/* Resumo financeiro */}
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Resumo financeiro</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
              {[
                { label: 'Repasses recebidos', val: fmt(dados.totalRepasses), cor: VERDE },
                { label: 'Rendimentos', val: fmt(dados.totalRendimentos), cor: '#4A8FD4' },
                { label: 'Total disponível', val: fmt(dados.totalDisponivel), cor: '#4A8FD4' },
                { label: 'Total despesas', val: fmt(dados.totalDespesas), cor: VERMELHO },
              ].map(m => (
                <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
                  <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
                  <div style={{ fontSize: 10, color: '#888780', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: m.cor }}>{m.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'Saldo remanescente', val: fmt(dados.saldoFinal), cor: dados.saldoFinal >= 0 ? VERDE : VERMELHO },
                { label: 'Movimentações', val: dados.totalMovs, cor: '#5F5E5A' },
                { label: '% conciliado', val: dados.totalMovs > 0 ? Math.round(dados.totalConciliados / dados.totalMovs * 100) + '%' : '0%', cor: dados.totalConciliados === dados.totalMovs ? VERDE : '#BA7517' },
              ].map(m => (
                <div key={m.label} style={{ background: '#F8F7F2', borderRadius: 10, padding: '.75rem 1rem' }}>
                  <div style={{ fontSize: 10, color: '#888780', marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: m.cor }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pendências */}
          {pendencias.length > 0 && (
            <div style={{ background: pendCriticas > 0 ? '#FEF2F2' : '#FAEEDA', border: `0.5px solid ${pendCriticas > 0 ? '#F7C1C1' : '#F4C88A'}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: pendCriticas > 0 ? '#A32D2D' : '#854F0B', marginBottom: '.75rem' }}>
                ⚠ {pendencias.length} movimentações com pendências — {pendCriticas} críticas
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr>{['Data','Descrição','Valor','Pendências'].map(h=><th key={h} style={{ ...s.th, background: 'transparent' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {pendencias.map(m => (
                      <tr key={m.id}>
                        <td style={s.td}>{fmtData(m.data)}</td>
                        <td style={s.td}>{m.descricao?.slice(0, 40)}</td>
                        <td style={{ ...s.td, color: VERMELHO }}>{fmt(Math.abs(m.valor))}</td>
                        <td style={s.td}>
                          {m.pendencias.map((p, i) => (
                            <span key={i} style={s.badge(p.gravidade === 'crítica' ? '#FCEBEB' : '#FAEEDA', p.gravidade === 'crítica' ? '#A32D2D' : '#854F0B')}>
                              {p.tipo}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Execução por plano de trabalho */}
          {Object.keys(dados.porPlano).length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Execução por item do plano de trabalho</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Item do plano','Valor previsto','Executado','Saldo','% executado','Situação'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {Object.values(dados.porPlano).map((p, i) => {
                    const saldo = p.valor_total_previsto - p.executado
                    const pct = p.valor_total_previsto > 0 ? Math.round(p.executado / p.valor_total_previsto * 100) : 0
                    const sit = pct === 0 ? 'Não iniciado' : pct >= 100 ? 'Executado integralmente' : 'Em execução'
                    return (
                      <tr key={i}>
                        <td style={{ ...s.td, fontWeight: 500 }}>{p.nome}</td>
                        <td style={s.td}>{fmt(p.valor_total_previsto)}</td>
                        <td style={{ ...s.td, color: VERMELHO }}>{fmt(p.executado)}</td>
                        <td style={{ ...s.td, color: saldo >= 0 ? VERDE : VERMELHO }}>{fmt(saldo)}</td>
                        <td style={s.td}>{pct}%</td>
                        <td style={s.td}><span style={s.badge(pct >= 100 ? '#EAF3DE' : '#E6F1FB', pct >= 100 ? '#3B6D11' : '#185FA5')}>{sit}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Relação de receitas */}
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Relação de receitas ({dados.entradas.length})</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Data','Tipo','Descrição','Doc','Valor'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {dados.entradas.map(m => (
                  <tr key={m.id}>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{fmtData(m.data)}</td>
                    <td style={s.td}>{m.tipo_receita || m.categoria?.nome || '—'}</td>
                    <td style={s.td}>{m.descricao}</td>
                    <td style={{ ...s.td, fontSize: 10 }}>{m.doc}</td>
                    <td style={{ ...s.td, color: VERDE, fontWeight: 500 }}>{fmt(m.valor)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#F1EFE8' }}>
                  <td colSpan={4} style={{ ...s.td, fontWeight: 700 }}>TOTAL RECEITAS</td>
                  <td style={{ ...s.td, fontWeight: 700, color: VERDE }}>{fmt(dados.totalDisponivel)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Relação de despesas */}
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Relação de pagamentos efetuados ({dados.saidas.length})</div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                  <tr>{['Data','Fornecedor','CPF/CNPJ','Categoria','Plano','Nota','Local comprovante','Valor','Status'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {dados.saidas.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{fmtData(m.data)}</td>
                      <td style={{ ...s.td, fontWeight: 500 }}>{m.fornecedor || m.descricao?.slice(0,25) || '—'}</td>
                      <td style={{ ...s.td, fontSize: 10 }}>{m.cpf_cnpj || '—'}</td>
                      <td style={s.td}>{m.categoria?.nome || '—'}</td>
                      <td style={s.td}>{m.plano?.nome || '—'}</td>
                      <td style={s.td}>{m.num_nota || '—'}</td>
                      <td style={{ ...s.td, fontSize: 10, color: '#888780' }}>{m.local_comprovante || '—'}</td>
                      <td style={{ ...s.td, color: VERMELHO, fontWeight: 500, whiteSpace: 'nowrap' }}>{fmt(Math.abs(m.valor))}</td>
                      <td style={s.td}>
                        <span style={s.badge(m.conciliado ? '#EAF3DE' : '#FAEEDA', m.conciliado ? '#3B6D11' : '#854F0B')}>
                          {m.conciliado ? '✓' : 'Pend.'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F1EFE8' }}>
                    <td colSpan={7} style={{ ...s.td, fontWeight: 700 }}>TOTAL DESPESAS</td>
                    <td style={{ ...s.td, fontWeight: 700, color: VERMELHO }}>{fmt(dados.totalDespesas)}</td>
                    <td style={s.td}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bens adquiridos */}
          {dados.bens.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Relação de bens adquiridos ({dados.bens.length})</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Data','Bem / Descrição','Fornecedor','Nota','Plano','Local de guarda','Valor'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dados.bens.map(m => (
                    <tr key={m.id}>
                      <td style={s.td}>{fmtData(m.data)}</td>
                      <td style={{ ...s.td, fontWeight: 500 }}>{m.descricao_produto || m.descricao}</td>
                      <td style={s.td}>{m.fornecedor || '—'}</td>
                      <td style={s.td}>{m.num_nota || '—'}</td>
                      <td style={s.td}>{m.plano?.nome || '—'}</td>
                      <td style={s.td}>{m.local_guarda_bem || '—'}</td>
                      <td style={{ ...s.td, color: VERMELHO, fontWeight: 500 }}>{fmt(Math.abs(m.valor))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Botões de geração do PDF */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
            {!podeGerarFinal && (
              <div style={{ fontSize: 12, color: '#A32D2D', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>
                ⚠ Existem {pendCriticas} pendências críticas. O relatório final não pode ser emitido.
              </div>
            )}
            <button onClick={() => gerarPDFPrestacaoContas(dados, pendencias, 'preliminar')}
              style={s.btn('#F4821F')}>
              Exportar PDF Preliminar
            </button>
            <button onClick={() => {
              if (!podeGerarFinal) { alert('Resolva as pendências críticas antes de gerar o relatório final.'); return }
              gerarPDFPrestacaoContas(dados, pendencias, 'final')
            }}
              style={s.btn(podeGerarFinal ? VERDE : '#D3D1C7')}>
              Exportar PDF Final Consolidado
            </button>
          </div>
        </>
      )}
    </div>
  )
}
