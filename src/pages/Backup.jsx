import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

function csvDe(dados, colunas) {
  if (!dados || dados.length === 0) return colunas.join(',') + '\n'
  const header = colunas.join(',')
  const linhas = dados.map(row =>
    colunas.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
    }).join(',')
  )
  return [header, ...linhas].join('\n')
}

async function zipCSVs(arquivos) {
  // Usa JSZip via CDN carregado dinamicamente
  if (!window.JSZip) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  const zip = new window.JSZip()
  arquivos.forEach(({ nome, conteudo }) => zip.file(nome, conteudo))
  return await zip.generateAsync({ type: 'blob' })
}

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function Backup() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [msg, setMsg] = useState('')
  const [tipoPeriodo, setTipoPeriodo] = useState('completo')
  const [mesInicio, setMesInicio] = useState('')
  const [mesFim, setMesFim] = useState('')

  useEffect(() => { carregarLogs() }, [])

  async function carregarLogs() {
    const { data } = await supabase
      .from('backup_log')
      .select('*')
      .order('gerado_em', { ascending: false })
      .limit(20)
    setLogs(data || [])
  }

  async function gerarBackup() {
    setLoading(true)
    setMsg('')
    let totalRegistros = 0
    const arquivos = []
    const dataHoje = new Date().toISOString().slice(0, 10)

    try {
      // 1. Usuários
      setProgresso('Exportando usuários...')
      const { data: usuarios } = await supabase.from('usuarios').select('id, nome, email, perfil, criado_em')
      arquivos.push({ nome: 'usuarios.csv', conteudo: csvDe(usuarios, ['id','nome','email','perfil','criado_em']) })
      totalRegistros += (usuarios||[]).length

      // 2. Contas
      setProgresso('Exportando contas bancárias...')
      const { data: contas } = await supabase.from('contas').select('*')
      arquivos.push({ nome: 'contas.csv', conteudo: csvDe(contas, ['id','nome','banco','agencia','conta_num','tipo_conta','preponderancia','status_conta','parlamentar','orgao_concedente','num_termo','num_processo','objeto','valor_aprovado','valor_recebido','vigencia_inicio','vigencia_fim','responsavel_financeiro','representante_legal']) })
      totalRegistros += (contas||[]).length

      // 3. Categorias
      setProgresso('Exportando categorias...')
      const { data: categorias } = await supabase.from('categorias').select('*')
      arquivos.push({ nome: 'categorias.csv', conteudo: csvDe(categorias, ['id','nome','tipo']) })
      totalRegistros += (categorias||[]).length

      // 4. Subcategorias
      setProgresso('Exportando subcategorias...')
      const { data: subcategorias } = await supabase.from('subcategorias').select('*')
      arquivos.push({ nome: 'subcategorias.csv', conteudo: csvDe(subcategorias, ['id','categoria_id','nome']) })
      totalRegistros += (subcategorias||[]).length

      // 5. Plano de trabalho
      setProgresso('Exportando plano de trabalho...')
      const { data: planos } = await supabase.from('plano_trabalho').select('*')
      arquivos.push({ nome: 'plano_trabalho.csv', conteudo: csvDe(planos, ['id','conta_id','nome','descricao','valor_previsto']) })
      totalRegistros += (planos||[]).length

      // 6. Extratos
      setProgresso('Exportando extratos...')
      let qExtratos = supabase.from('extratos').select('*')
      if (tipoPeriodo === 'personalizado' && mesInicio && mesFim) {
        qExtratos = qExtratos.gte('competencia', mesInicio).lte('competencia', mesFim)
      }
      const { data: extratos } = await qExtratos
      arquivos.push({ nome: 'extratos.csv', conteudo: csvDe(extratos, ['id','conta_id','competencia','total_movs','saldo_final','importado_em']) })
      totalRegistros += (extratos||[]).length

      // 7. Movimentações do extrato
      setProgresso('Exportando movimentações bancárias...')
      const extratoIds = (extratos||[]).map(e => e.id)
      let movs = []
      if (extratoIds.length > 0) {
        const { data } = await supabase.from('extrato_movs').select('*').in('extrato_id', extratoIds)
        movs = data || []
      }
      arquivos.push({ nome: 'extrato_movs.csv', conteudo: csvDe(movs, ['id','extrato_id','data','descricao','doc','tipo','valor','categoria_id','subcategoria_id','plano_trabalho_id','fornecedor','cpf_cnpj','num_nota','data_documento','local_comprovante','link_externo','bem_permanente','obs_prestacao','conciliado','prep_educacao','prep_social','prep_saude','evento_id','campanha_id','status_mov']) })
      totalRegistros += movs.length

      // 8. Lançamentos
      setProgresso('Exportando lançamentos manuais...')
      const { data: lancamentos } = await supabase.from('lancamentos').select('*')
      arquivos.push({ nome: 'lancamentos.csv', conteudo: csvDe(lancamentos, ['id','tipo','descricao','valor','data','conta_id','categoria_id','fornecedor','cpf_cnpj','num_nota','local_comprovante','obs_prestacao','status_lanc','criado_em']) })
      totalRegistros += (lancamentos||[]).length

      // 9. Eventos
      setProgresso('Exportando eventos...')
      const { data: eventos } = await supabase.from('eventos').select('*')
      arquivos.push({ nome: 'eventos.csv', conteudo: csvDe(eventos, ['id','nome','descricao','data_inicio','data_fim','meta_financeira','status','observacoes']) })
      totalRegistros += (eventos||[]).length

      // 10. Campanhas
      setProgresso('Exportando campanhas...')
      const { data: campanhas } = await supabase.from('campanhas').select('*')
      arquivos.push({ nome: 'campanhas.csv', conteudo: csvDe(campanhas, ['id','nome','descricao','objetivo','meta_financeira','data_inicio','data_fim','status']) })
      totalRegistros += (campanhas||[]).length

      // 11. Funcionários
      setProgresso('Exportando funcionários...')
      const { data: funcionarios } = await supabase.from('funcionarios').select('*')
      arquivos.push({ nome: 'funcionarios.csv', conteudo: csvDe(funcionarios, ['id','nome','funcao','tipo_vinculo','cpf_cnpj','email','telefone','data_admissao','status']) })
      totalRegistros += (funcionarios||[]).length

      // 12. Dívidas
      setProgresso('Exportando dívidas...')
      const { data: dividas } = await supabase.from('dividas').select('*')
      arquivos.push({ nome: 'dividas.csv', conteudo: csvDe(dividas, ['id','funcionario_id','descricao','valor_original','valor_pago','data_origem','status']) })
      totalRegistros += (dividas||[]).length

      // 13. Cobranças
      setProgresso('Exportando cobranças...')
      const { data: cobrancas } = await supabase.from('cobrancas').select('*')
      arquivos.push({ nome: 'cobrancas.csv', conteudo: csvDe(cobrancas, ['id','pagador','data_vencimento','valor','status','pago_informado','pago_confirmado','data_promessa','ultima_obs','lote_importacao']) })
      totalRegistros += (cobrancas||[]).length

      // 14. Aplicações e rendimentos
      setProgresso('Exportando aplicações...')
      const { data: aplicacoes } = await supabase.from('aplicacoes').select('*')
      arquivos.push({ nome: 'aplicacoes.csv', conteudo: csvDe(aplicacoes, ['id','conta_id','descricao','valor','data','tipo']) })
      totalRegistros += (aplicacoes||[]).length

      // 15. README
      const readme = `BACKUP FINOSC CAPETTE
=====================
Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
Tipo: ${tipoPeriodo === 'completo' ? 'Completo' : 'Período personalizado'}
${tipoPeriodo === 'personalizado' ? `Período: ${mesInicio} a ${mesFim}` : ''}
Total de registros: ${totalRegistros}

ARQUIVOS INCLUÍDOS:
- usuarios.csv
- contas.csv
- categorias.csv
- subcategorias.csv
- plano_trabalho.csv
- extratos.csv
- extrato_movs.csv
- lancamentos.csv
- eventos.csv
- campanhas.csv
- funcionarios.csv
- dividas.csv
- cobrancas.csv
- aplicacoes.csv

INSTITUIÇÃO: Casa do Pequeno Trabalhador de Teresópolis
CNPJ: 29.213.717/0001-01
SISTEMA: FinOSC Capette`

      arquivos.push({ nome: 'LEIA-ME.txt', conteudo: readme })

      // Gera ZIP
      setProgresso('Gerando arquivo ZIP...')
      const zipBlob = await zipCSVs(arquivos)
      const nomeArq = `backup-capette-${tipoPeriodo}-${dataHoje}.zip`
      baixarBlob(zipBlob, nomeArq)

      // Registra log
      await supabase.from('backup_log').insert({
        tipo: tipoPeriodo,
        periodo_inicio: tipoPeriodo === 'personalizado' ? mesInicio + '-01' : null,
        periodo_fim: tipoPeriodo === 'personalizado' ? mesFim + '-31' : null,
        total_registros: totalRegistros,
        status: 'baixado',
        gerado_por: user.id,
      })

      setMsg(`✅ Backup gerado com sucesso! ${totalRegistros} registros exportados.`)
      carregarLogs()
    } catch (err) {
      setMsg('Erro ao gerar backup: ' + err.message)
      console.error(err)
    }

    setLoading(false)
    setProgresso('')
    setTimeout(() => setMsg(''), 8000)
  }

  const fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') + ' ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'

  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    input: { width: '100%', fontSize: 13, padding: '6px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8 },
    th: { textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' },
    td: { padding: '7px 8px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12 },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Backup de segurança</div>

      <div style={{ background: '#E6F1FB', border: '0.5px solid #B3D1F0', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1.25rem', fontSize: 12, color: '#185FA5' }}>
        <strong>ℹ O backup baixa todos os dados em CSV dentro de um arquivo ZIP.</strong> Guarde o arquivo em local seguro — pasta local, Google Drive, OneDrive ou HD externo. Recomendamos fazer backup mensalmente.
      </div>

      {/* Configuração */}
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Gerar novo backup</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <div>
            <label style={s.label}>Tipo de backup</label>
            <select value={tipoPeriodo} onChange={e => setTipoPeriodo(e.target.value)} style={s.input}>
              <option value="completo">Completo — todos os dados</option>
              <option value="personalizado">Período personalizado</option>
            </select>
          </div>
          {tipoPeriodo === 'personalizado' && (
            <>
              <div>
                <label style={s.label}>De (mês/ano)</label>
                <input type="month" value={mesInicio} onChange={e => setMesInicio(e.target.value)} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Até (mês/ano)</label>
                <input type="month" value={mesFim} onChange={e => setMesFim(e.target.value)} style={s.input} />
              </div>
            </>
          )}
        </div>

        {msg && (
          <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 10, background: msg.includes('✅') ? '#F2FAE8' : '#FEF2F2', color: msg.includes('✅') ? '#3B6D11' : '#A32D2D' }}>
            {msg}
          </div>
        )}

        {loading && progresso && (
          <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 10, background: '#E6F1FB', color: '#185FA5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, border: '2px solid #185FA5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            {progresso}
          </div>
        )}

        <button onClick={gerarBackup} disabled={loading || (tipoPeriodo === 'personalizado' && (!mesInicio || !mesFim))}
          style={{ padding: '8px 20px', fontSize: 13, borderRadius: 8, border: 'none', background: loading ? '#D3D1C7' : VERDE, color: '#fff', cursor: loading ? 'default' : 'pointer', fontWeight: 500 }}>
          {loading ? 'Gerando backup...' : '⬇ Baixar backup'}
        </button>
      </div>

      {/* O que está incluído */}
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>O que está incluído no backup</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, fontSize: 12 }}>
          {[
            'Usuários', 'Contas bancárias', 'Categorias', 'Subcategorias',
            'Plano de trabalho', 'Extratos importados', 'Movimentações bancárias', 'Lançamentos manuais',
            'Eventos', 'Campanhas', 'Funcionários', 'Dívidas',
            'Cobranças', 'Aplicações', 'Arquivo LEIA-ME', '',
          ].map((item, i) => item ? (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5F5E5A' }}>
              <span style={{ color: VERDE, fontSize: 14 }}>✓</span> {item}
            </div>
          ) : <div key={i} />)}
        </div>
      </div>

      {/* Histórico */}
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Histórico de backups</div>
        {logs.length === 0 ? (
          <div style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: '1rem' }}>Nenhum backup gerado ainda.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Data','Tipo','Período','Registros','Status'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={s.td}>{fmt(l.gerado_em)}</td>
                  <td style={s.td}><span style={s.badge('#E6F1FB','#185FA5')}>{l.tipo}</span></td>
                  <td style={s.td}>
                    {l.periodo_inicio && l.periodo_fim
                      ? `${new Date(l.periodo_inicio+'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(l.periodo_fim+'T12:00:00').toLocaleDateString('pt-BR')}`
                      : 'Completo'}
                  </td>
                  <td style={s.td}>{l.total_registros?.toLocaleString('pt-BR')} registros</td>
                  <td style={s.td}><span style={s.badge('#EAF3DE','#3B6D11')}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
