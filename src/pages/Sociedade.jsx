import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4'
const LOGO = [['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']]

const TIPOS_RECURSO = ['Todos', 'Recursos públicos', 'Doações', 'Recursos próprios', 'Eventos/campanhas', 'Outros']

export default function Sociedade() {
  const [aba, setAba] = useState('resumo')
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7))
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [tipoRecurso, setTipoRecurso] = useState('Todos')
  const [resumo, setResumo] = useState({ entMes:0, saiMes:0, entAno:0, saiAno:0 })
  const [movs, setMovs] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregarDados() }, [mes, ano])
  useEffect(() => { carregarDocumentos() }, [])

  async function carregarDados() {
    setLoading(true)

    // Entradas e saídas do mês
    const { data: movMes } = await supabase
      .from('extrato_movs')
      .select('valor, categoria:categorias(nome,tipo), extrato:extratos(conta_id)')
      .gte('data', mes + '-01')
      .lte('data', mes + '-31')

    const entMes = (movMes||[]).filter(m => Number(m.valor) > 0).reduce((a,m) => a + Number(m.valor), 0)
    const saiMes = Math.abs((movMes||[]).filter(m => Number(m.valor) < 0).reduce((a,m) => a + Number(m.valor), 0))

    // Entradas e saídas do ano
    const { data: movAno } = await supabase
      .from('extrato_movs')
      .select('valor')
      .gte('data', ano + '-01-01')
      .lte('data', ano + '-12-31')

    const entAno = (movAno||[]).filter(m => Number(m.valor) > 0).reduce((a,m) => a + Number(m.valor), 0)
    const saiAno = Math.abs((movAno||[]).filter(m => Number(m.valor) < 0).reduce((a,m) => a + Number(m.valor), 0))

    // Busca saldo geral (todas as movimentações)
    const { data: todas } = await supabase.from('extrato_movs').select('valor')
    const saldoGeral = (todas||[]).reduce((a,m) => a + Number(m.valor), 0)

    setResumo({ entMes, saiMes, entAno, saiAno, saldoGeral })

    // Movimentações para as abas
    const { data: movsCompletos } = await supabase
      .from('extrato_movs')
      .select('*, categoria:categorias(nome,tipo), extrato:extratos(conta_id, conta:contas(nome,tipo_conta))')
      .gte('data', ano + '-01-01')
      .lte('data', ano + '-12-31')
      .order('data', { ascending: false })

    setMovs(movsCompletos || [])
    setLoading(false)
  }

  async function carregarDocumentos() {
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .eq('publico', true)
      .order('criado_em', { ascending: false })
    setDocumentos(data || [])
  }

  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  // Filtra movs por tipo de recurso
  const movsPublicos = movs.filter(m => {
    const tipo = m.extrato?.conta?.tipo_conta
    return tipo && tipo !== 'principal'
  })
  const movsDoacoes = movs.filter(m => {
    const tipo = m.extrato?.conta?.tipo_conta
    return tipo === 'principal'
  })

  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    th: { textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5', background: '#FAFAF8' },
    td: { padding: '7px 10px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12 },
    tab: ativo => ({
      padding: '7px 16px', fontSize: 12, borderRadius: 8,
      border: '0.5px solid ' + (ativo ? VERDE : '#D3D1C7'),
      background: ativo ? VERDE : '#fff',
      color: ativo ? '#fff' : '#5F5E5A',
      cursor: 'pointer', whiteSpace: 'nowrap',
    }),
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
  }

  const anos = []
  for (let y = new Date().getFullYear(); y >= 2023; y--) anos.push(String(y))

  const CATS_DOC = [
    'Documentos institucionais',
    'Relatórios anuais',
    'Prestações de contas',
    'Planos de trabalho',
    'Balanços financeiros',
    'Certidões e registros',
    'Outros documentos',
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F2', padding: '0 0 3rem' }}>

      {/* Cabeçalho */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #E0DDD5', padding: '1.25rem 1.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="CAPETTE"
              style={{ height: 44, width: 'auto', objectFit: 'contain' }}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
            <div style={{ display: 'none', gap: 2, alignItems: 'center' }}>
              {LOGO.map(([l,c]) => <span key={l+c} style={{ fontSize: 18, fontWeight: 500, color: c }}>{l}</span>)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Transparência Pública — CAPETTE</div>
              <div style={{ fontSize: 11, color: '#888780' }}>Casa do Pequeno Trabalhador de Teresópolis · CNPJ 29.213.717/0001-01</div>
            </div>
          </div>
          <a href="/login" style={{ fontSize: 12, color: '#4A8FD4', textDecoration: 'none' }}>← Área interna</a>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Texto introdutório */}
        <div style={{ ...s.card, marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.7, margin: 0 }}>
            Esta página reúne informações financeiras, documentos e prestações de contas da CAPETTE, para consulta pública e controle social.
          </p>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 3 }}>Mês</div>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              style={{ fontSize: 12, padding: '5px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 3 }}>Ano</div>
            <select value={ano} onChange={e => setAno(e.target.value)}
              style={{ fontSize: 12, padding: '5px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 3 }}>Tipo de recurso</div>
            <select value={tipoRecurso} onChange={e => setTipoRecurso(e.target.value)}
              style={{ fontSize: 12, padding: '5px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 }}>
              {TIPOS_RECURSO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Cards de resumo */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 13 }}>Carregando dados...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
              {[
                { label: `Entradas — ${mes}`,  val: fmt(resumo.entMes),    cor: VERDE },
                { label: `Saídas — ${mes}`,    val: fmt(resumo.saiMes),    cor: VERMELHO },
                { label: `Resultado — ${mes}`, val: fmt(resumo.entMes - resumo.saiMes), cor: (resumo.entMes - resumo.saiMes) >= 0 ? AZUL : VERMELHO },
              ].map(m => (
                <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
                  <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.6rem' }} />
                  <div style={{ fontSize: 10, color: '#888780', marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: m.cor }}>{m.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
              {[
                { label: `Entradas — ${ano}`,  val: fmt(resumo.entAno),    cor: VERDE },
                { label: `Saídas — ${ano}`,    val: fmt(resumo.saiAno),    cor: VERMELHO },
                { label: 'Saldo geral',         val: fmt(resumo.saldoGeral), cor: Number(resumo.saldoGeral) >= 0 ? AZUL : VERMELHO },
              ].map(m => (
                <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
                  <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.6rem' }} />
                  <div style={{ fontSize: 10, color: '#888780', marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: m.cor }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Abas */}
            <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {[
                ['resumo', 'Resumo Geral'],
                ['publicos', 'Recursos Públicos'],
                ['doacoes', 'Doações e Recursos Próprios'],
                ['documentos', 'Documentos e Relatórios'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setAba(id)} style={s.tab(aba === id)}>{label}</button>
              ))}
            </div>

            {/* Aba: Resumo Geral */}
            {aba === 'resumo' && (
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Resumo Geral — {ano}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr>
                    <th style={s.th}>Período</th>
                    <th style={s.th}>Entradas</th>
                    <th style={s.th}>Saídas</th>
                    <th style={s.th}>Resultado</th>
                  </tr></thead>
                  <tbody>
                    {Array.from({length: 12}, (_,i) => {
                      const m = String(i+1).padStart(2,'0')
                      const mesStr = `${ano}-${m}`
                      const movsM = movs.filter(x => x.data?.startsWith(mesStr))
                      const ent = movsM.filter(x => Number(x.valor) > 0).reduce((a,x) => a+Number(x.valor), 0)
                      const sai = Math.abs(movsM.filter(x => Number(x.valor) < 0).reduce((a,x) => a+Number(x.valor), 0))
                      const res = ent - sai
                      if (ent === 0 && sai === 0) return null
                      const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
                      return (
                        <tr key={m}>
                          <td style={{ ...s.td, fontWeight: 500 }}>{nomes[i]}/{ano}</td>
                          <td style={{ ...s.td, color: VERDE }}>{fmt(ent)}</td>
                          <td style={{ ...s.td, color: VERMELHO }}>{fmt(sai)}</td>
                          <td style={{ ...s.td, color: res >= 0 ? AZUL : VERMELHO, fontWeight: 500 }}>{fmt(res)}</td>
                        </tr>
                      )
                    })}
                    <tr style={{ background: '#F8F7F2' }}>
                      <td style={{ ...s.td, fontWeight: 700 }}>TOTAL {ano}</td>
                      <td style={{ ...s.td, fontWeight: 700, color: VERDE }}>{fmt(resumo.entAno)}</td>
                      <td style={{ ...s.td, fontWeight: 700, color: VERMELHO }}>{fmt(resumo.saiAno)}</td>
                      <td style={{ ...s.td, fontWeight: 700, color: (resumo.entAno-resumo.saiAno) >= 0 ? AZUL : VERMELHO }}>{fmt(resumo.entAno - resumo.saiAno)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Aba: Recursos Públicos */}
            {aba === 'publicos' && (
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Recursos Públicos — {ano}</div>
                <div style={{ fontSize: 12, color: '#888780', marginBottom: '.85rem' }}>
                  Emendas parlamentares, termos de fomento, colaboração, editais públicos e convênios.
                </div>
                {movsPublicos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>
                    Nenhuma movimentação de recursos públicos no período.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr>
                      <th style={s.th}>Data</th>
                      <th style={s.th}>Conta / Recurso</th>
                      <th style={s.th}>Descrição</th>
                      <th style={s.th}>Categoria</th>
                      <th style={s.th}>Valor</th>
                    </tr></thead>
                    <tbody>
                      {movsPublicos.slice(0,100).map(m => (
                        <tr key={m.id}>
                          <td style={s.td}>{fmtData(m.data)}</td>
                          <td style={s.td}>{m.extrato?.conta?.nome || '—'}</td>
                          <td style={{ ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.descricao}</td>
                          <td style={s.td}>{m.categoria?.nome || '—'}</td>
                          <td style={{ ...s.td, fontWeight: 500, color: Number(m.valor) >= 0 ? VERDE : VERMELHO }}>{fmt(m.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Aba: Doações e Recursos Próprios */}
            {aba === 'doacoes' && (
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Doações e Recursos Próprios — {ano}</div>
                <div style={{ fontSize: 12, color: '#888780', marginBottom: '.85rem' }}>
                  Doações, campanhas, eventos, bazar e contribuições. Dados pessoais de doadores são protegidos e não exibidos.
                </div>
                {movsDoacoes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>
                    Nenhuma movimentação no período.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr>
                      <th style={s.th}>Data</th>
                      <th style={s.th}>Descrição</th>
                      <th style={s.th}>Categoria</th>
                      <th style={s.th}>Valor</th>
                    </tr></thead>
                    <tbody>
                      {movsDoacoes.slice(0,100).map(m => (
                        <tr key={m.id}>
                          <td style={s.td}>{fmtData(m.data)}</td>
                          <td style={{ ...s.td, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {/* Oculta CPF/CNPJ da descrição */}
                            {(m.descricao||'').replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***').replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '***')}
                          </td>
                          <td style={s.td}>{m.categoria?.nome || '—'}</td>
                          <td style={{ ...s.td, fontWeight: 500, color: Number(m.valor) >= 0 ? VERDE : VERMELHO }}>{fmt(m.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Aba: Documentos */}
            {aba === 'documentos' && (
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Documentos e Relatórios</div>
                {documentos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>
                    Nenhum documento publicado ainda.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                    {documentos.map(doc => (
                      <a key={doc.id} href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', background: '#F8F7F2', border: '0.5px solid #E0DDD5', borderRadius: 10, padding: '1rem', textDecoration: 'none', transition: 'border-color .15s' }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#2C2C2A', marginBottom: 3 }}>{doc.titulo}</div>
                        {doc.descricao && <div style={{ fontSize: 11, color: '#888780', marginBottom: 6 }}>{doc.descricao}</div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#E6F1FB', color: '#185FA5' }}>{doc.categoria}</span>
                          <span style={{ fontSize: 10, color: '#4A8FD4', fontWeight: 500 }}>Abrir →</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Base Legal */}
            <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: 10, padding: '.85rem 1rem', marginTop: '1.25rem', fontSize: 11, color: '#3B6D11', lineHeight: 1.8 }}>
              <strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Base legal da transparência</strong>
              As informações são publicadas para fins de transparência institucional, controle social e prestação de contas, observadas a <strong>Lei nº 13.019/2014 — MROSC</strong>, a <strong>Lei Complementar nº 187/2021 — CEBAS</strong>, o <strong>Decreto nº 11.791/2023</strong>, a <strong>Portaria MDS nº 952/2023</strong> e a proteção de dados pessoais.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
