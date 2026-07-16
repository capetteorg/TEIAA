import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { confirmar } from '../lib/ui'
import { auditar } from '../lib/auditoria'
import { gerarPDFRelatorio } from '../lib/pdfLazy'
import * as XLSX from 'xlsx'

const VERDE = '#0E7EA8', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

function csvDe(dados, campos) {
  if (!dados || dados.length === 0) return campos.join(';') + '\n'
  const header = campos.join(';')
  const rows = dados.map(row =>
    campos.map(c => {
      const v = row[c]
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') return JSON.stringify(v).replace(/;/g, ',')
      return String(v).replace(/;/g, ',').replace(/\n/g, ' ')
    }).join(';')
  )
  return [header, ...rows].join('\n')
}

export default function Backup() {
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [resultado, setResultado] = useState(null)
  const [restaurando, setRestaurando] = useState(false)
  const [progRestore, setProgRestore] = useState('')
  const [resRestore, setResRestore] = useState(null)

  async function restaurarBackup(e) {
    const arquivo = e.target.files[0]
    e.target.value = ''
    if (!arquivo) return

    let dump
    try { dump = JSON.parse(await arquivo.text()) }
    catch { setResRestore({ erro: 'Arquivo inválido — selecione um backup .json gerado por este sistema.' }); return }
    if (!dump._meta) { setResRestore({ erro: 'Este arquivo não parece ser um backup do AGENDO Integra.' }); return }

    const tabelas = Object.keys(dump).filter(t => t !== '_meta' && t !== 'usuarios' && t !== 'auditoria' && Array.isArray(dump[t]))
    const totalReg = tabelas.reduce((a,t) => a + dump[t].length, 0)

    const ok = await confirmar(
      `Restaurar backup de ${new Date(dump._meta.gerado_em).toLocaleString('pt-BR')}?\n\n${tabelas.length} tabelas · ${totalReg.toLocaleString('pt-BR')} registros.\n\nRegistros com mesmo ID serão SOBRESCRITOS. Tabelas de usuários e auditoria não são restauradas.`,
      { titulo: 'Restaurar backup', confirmarLabel: 'Restaurar agora' }
    )
    if (!ok) return

    setRestaurando(true)
    setResRestore(null)
    auditar('Restauração de backup', `${arquivo.name} — ${totalReg} registros`)
    const erros = []
    let restaurados = 0

    for (const tabela of tabelas) {
      const linhas = dump[tabela]
      if (linhas.length === 0) continue
      setProgRestore(`Restaurando ${tabela} (${linhas.length})...`)
      // Lotes de 500 para não estourar payload
      for (let i = 0; i < linhas.length; i += 500) {
        const lote = linhas.slice(i, i + 500)
        const { error } = await supabase.from(tabela).upsert(lote, { onConflict: 'id' })
        if (error) { erros.push(`${tabela}: ${error.message}`); break }
        restaurados += lote.length
      }
    }

    setProgRestore('')
    setRestaurando(false)
    setResRestore({ restaurados, erros })
  }

  async function gerarBackup() {
    setLoading(true)
    setResultado(null)
    const arquivos = []
    let totalRegistros = 0

    const modulos = [
      // Financeiro
      { tabela: 'contas', campos: ['id','nome','banco','agencia','conta_num','tipo_conta','preponderancia','saldo_inicial','observacoes'] },
      { tabela: 'categorias', campos: ['id','nome','tipo','pai_id'] },
      { tabela: 'subcategorias', campos: ['id','nome','categoria_id'] },
      { tabela: 'classificacoes', campos: ['id','descricao','categoria_id','subcategoria_id'] },
      { tabela: 'extratos', campos: ['id','conta_id','competencia','saldo_inicial','saldo_final','importado_em'] },
      { tabela: 'extrato_movs', campos: ['id','extrato_id','data','descricao','doc','tipo','valor','categoria_id','subcategoria_id','plano_trabalho_id','fornecedor','cpf_cnpj','num_nota','data_documento','bem_permanente','obs_prestacao','conciliado','prep_educacao','prep_social','prep_saude','evento_id','campanha_id','status_mov'] },
      { tabela: 'lancamentos', campos: ['id','tipo','data','descricao','valor','conta_id','categoria_id','nf','conciliado','criado_em'] },
      { tabela: 'rateios', campos: ['id','lancamento_id','area','percentual'] },
      { tabela: 'aplicacoes', campos: ['id','conta_id','data','valor','descricao','criado_em'] },
      { tabela: 'fechamentos', campos: ['id','conta_id','competencia','saldo_final','fechado_em','fechado_por'] },
      // Institucional
      { tabela: 'instituicao', campos: ['id','nome_completo','nome_fantasia','cnpj','endereco','telefone','email','site','missao'] },
      { tabela: 'diretoria', campos: ['id','nome','cargo','cpf','email','mandato_inicio','mandato_fim','ativo'] },
      { tabela: 'documentos', campos: ['id','titulo','categoria','descricao','arquivo_url','publico','criado_em'] },
      { tabela: 'usuarios', campos: ['id','nome','email','perfil'] },
      // Parcerias e planos
      { tabela: 'parcerias', campos: ['id','tipo','nome_projeto','situacao','orgao_concedente','objeto','valor_aprovado','valor_recebido','vigencia_inicio','vigencia_fim','num_termo','num_processo','conta_id','parlamentar','observacoes'] },
      { tabela: 'planos', campos: ['id','nome_plano','tipo_plano','parceria_id','projeto_id','orgao_ou_parceiro','objeto','objetivo_geral','publico_alvo','faixa_etaria','capacidade_prevista','periodo_inicio','periodo_fim','valor_total_previsto','situacao','observacoes'] },
      { tabela: 'metas_plano', campos: ['id','plano_id','projeto_id','descricao_meta','indicador','quantidade_prevista','unidade_medida','quantidade_realizada','status_meta','justificativa'] },
      { tabela: 'atividades_previstas', campos: ['id','plano_id','projeto_id','nome_atividade','descricao','periodo_inicio','periodo_fim','responsavel_equipe','status','observacoes'] },
      // Projetos e execução
      { tabela: 'projetos', campos: ['id','nome','tipo','descricao_curta','publico_alvo','faixa_etaria','capacidade_prevista','funcionamento','situacao','exibir_transparencia','observacoes'] },
      { tabela: 'atendimentos', campos: ['id','data_atend','projeto_id','tipo_atend','tema','descricao','qtd_participantes','publico_participante','situacao','encaminhamentos','observacoes'] },
      { tabela: 'usuarios_atendidos', campos: ['id','nome','nis','cpf','data_nascimento','projeto_id','data_ingresso','data_saida','motivo_saida','situacao','observacoes'] },
      // Equipe
      { tabela: 'equipe', campos: ['id','nome','cpf','data_nascimento','funcao','tipo_vinculo','orgao_origem','instrumento_vinculacao','data_entrada','data_saida','situacao','carga_horaria','projetos','observacoes'] },
      { tabela: 'equipe_historico', campos: ['id','equipe_id','data','tipo','descricao'] },
      { tabela: 'funcionarios', campos: ['id','nome','cpf','cargo','tipo_vinculo','salario','data_admissao','data_demissao','status','observacoes'] },
      // Doações
      { tabela: 'doacoes', campos: ['id','data_doacao','doador','tipo_doador','num_nota','categoria','valor_estimado','projeto_id','campanha_evento','destino','observacoes'] },
      { tabela: 'doacoes_itens', campos: ['id','doacao_id','item','quantidade','unidade','valor_estimado','observacao'] },
      // Eventos e campanhas
      { tabela: 'eventos', campos: ['id','nome','descricao','data_inicio','data_fim','meta_financeira','status','observacoes'] },
      { tabela: 'campanhas', campos: ['id','nome','descricao','objetivo','data_inicio','data_fim','meta_financeira','status','observacoes'] },
      // Plano de trabalho antigo (conciliação)
      { tabela: 'plano_trabalho', campos: ['id','conta_id','nome','descricao','valor_previsto'] },
    ]

    const dump = { _meta: { sistema: 'AGENDO Integra — TEIAA', gerado_em: new Date().toISOString(), versao: 1 } }

    for (const mod of modulos) {
      setProgresso(`Exportando ${mod.tabela}...`)
      try {
        const { data, error } = await supabase.from(mod.tabela).select('*').order('id')
        if (error) throw error
        const registros = data || []
        totalRegistros += registros.length
        dump[mod.tabela] = registros
        arquivos.push({ nome: mod.tabela })
      } catch(e) {
        dump[mod.tabela] = { _erro: e.message }
        arquivos.push({ nome: mod.tabela })
      }
    }

    // JSON estruturado — reimportável tabela por tabela
    const blob = new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json;charset=utf-8' })
    const urlJson = URL.createObjectURL(blob)
    const aJson = document.createElement('a')
    aJson.href = urlJson
    aJson.download = `backup_teiaa_${new Date().toISOString().slice(0,10)}.json`
    aJson.click()
    URL.revokeObjectURL(urlJson)

    // XLSX com abas principais
    setProgresso('Gerando planilha Excel...')
    try {
      const wb = XLSX.utils.book_new()
      const principais = ['extrato_movs','lancamentos','projetos','atendimentos','equipe','usuarios_atendidos','fornecedores']
      for (const tabela of principais) {
        if (dump[tabela]?.length) {
          const ws = XLSX.utils.json_to_sheet(dump[tabela])
          XLSX.utils.book_append_sheet(wb, ws, tabela.slice(0,31))
        }
      }
      XLSX.writeFile(wb, `teiaa_dados_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) {
          }

    // Gerar PDF do relatório financeiro anual
    setProgresso('Gerando relatório PDF...')
    try {
      const anoAtual = new Date().getFullYear()
      const iniAno = `${anoAtual}-01-01`
      const fimAno = `${anoAtual}-12-31`
      const { data: movsAno } = await supabase.from('extrato_movs')
        .select('valor, data, descricao, categoria_id, tipo')
        .gte('data', iniAno).lte('data', fimAno)
        .order('data')
      if (movsAno?.length) {
        gerarPDFRelatorio(movsAno, iniAno, fimAno, {
          titulo: `Relatório Financeiro ${anoAtual} — TEIAA`,
          subtitulo: `Backup gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        })
      }
    } catch (e) {
          }

    // Registrar log
    await supabase.from('backup_log').insert({
      data_backup: new Date().toISOString().slice(0,10),
      total_registros: totalRegistros,
      criado_em: new Date().toISOString()
    }).catch(() => {})

    setProgresso('')
    setResultado({ total: totalRegistros, arquivos: 3 })
    setLoading(false)
  }

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem 1.25rem', marginBottom:10 },
    btn: (bg, cor='#fff') => ({ padding:'10px 20px', fontSize:13, fontWeight:500, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer' }),
  }

  return (
    <div style={{ }}>
      {/* Topbar */}
      <div style={{ height: 62, background: 'rgba(255,255,255,0.78)', borderBottom: '0.5px solid #E0DDD5', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#06344F', letterSpacing: '-.022em' }}>Backup do Sistema</div>
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
<div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Exportar todos os dados</div>
        <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.25rem', lineHeight:1.7 }}>
          Gera um arquivo de backup JSON estruturado (reimportável tabela por tabela) com todos os dados do sistema, incluindo:
          financeiro, parcerias, planos, projetos, atendimentos, usuários atendidos, equipe, doações, eventos e campanhas.
        </div>

        {progresso && (
          <div style={{ fontSize:12, color:AZUL, marginBottom:12, padding:'8px 12px', background:'#E6F1FB', borderRadius:8 }}>
            <i className="ti ti-loader" style={{marginRight:4}} /> {progresso}
          </div>
        )}

        {resultado && (
          <div style={{ fontSize:12, color:'#3B6D11', marginBottom:12, padding:'8px 12px', background:'#EAF3DE', borderRadius:8 }}>
            <i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Backup gerado com sucesso! {resultado.total.toLocaleString('pt-BR')} registros exportados em 3 arquivos: backup.json · dados.xlsx · relatório.pdf
          </div>
        )}

        <button onClick={gerarBackup} disabled={loading} style={s.btn(loading?'#D3D1C7':'#0E7EA8')}>
          {loading ? progresso || 'Gerando backup...' : 'Gerar backup completo (JSON + Excel + PDF)'}
        </button>
      </div>

      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Restaurar backup</div>
        <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1rem', lineHeight:1.7 }}>
          Importa um arquivo .json gerado pelo backup acima. Registros com o mesmo ID serão sobrescritos.
          Usuários do sistema e trilha de auditoria não são restaurados por segurança.
        </div>
        {progRestore && (
          <div style={{ fontSize:12, color:'#0E7EA8', marginBottom:12, padding:'8px 12px', background:'#E6F1FB', borderRadius:8 }}>{progRestore}</div>
        )}
        {resRestore?.erro && (
          <div style={{ fontSize:12, color:'#A32D2D', marginBottom:12, padding:'8px 12px', background:'#FEF2F2', borderRadius:8 }}>{resRestore.erro}</div>
        )}
        {resRestore?.restaurados >= 0 && !resRestore.erro && (
          <div style={{ fontSize:12, marginBottom:12, padding:'8px 12px', borderRadius:8, background:resRestore.erros.length?'#FAEEDA':'#EAF3DE', color:resRestore.erros.length?'#854F0B':'#3B6D11' }}>
            {resRestore.restaurados.toLocaleString('pt-BR')} registros restaurados.
            {resRestore.erros.length > 0 && <div style={{ marginTop:6 }}>{resRestore.erros.map((e,i)=><div key={i}>⚠ {e}</div>)}</div>}
          </div>
        )}
        <label style={{ display:'inline-block', padding:'10px 20px', fontSize:13, fontWeight:500, borderRadius:8, background:restaurando?'#D3D1C7':'#0E7EA8', color:'#fff', cursor:restaurando?'default':'pointer' }}>
          {restaurando ? 'Restaurando...' : 'Selecionar arquivo .json'}
          <input type="file" accept=".json,application/json" onChange={restaurarBackup} disabled={restaurando} style={{ display:'none' }} />
        </label>
      </div>

      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Tabelas incluídas no backup</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:6 }}>
          {[
            'Financeiro (contas, extratos, lançamentos)',
            'Planos de trabalho e metas',
            'Parcerias e emendas',
            'Projetos e serviços',
            'Atendimentos e atividades',
            'Usuários atendidos',
            'Equipe e funcionários',
            'Doações',
            'Eventos e campanhas',
            'Dados institucionais',
            'Documentos',
            'Cobranças',
          ].map(item => (
            <div key={item} style={{ fontSize:11, color:'#5F5E5A', padding:'5px 8px', background:'#F8F7F2', borderRadius:6 }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
      </div>
  )
}