import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

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
      { tabela: 'dividas', campos: ['id','funcionario_id','descricao','valor_total','data_inicio','status'] },
      { tabela: 'pagamentos_divida', campos: ['id','divida_id','data_pagamento','valor','observacoes'] },
      // Doações
      { tabela: 'doacoes', campos: ['id','data_doacao','doador','tipo_doador','num_nota','categoria','valor_estimado','projeto_id','campanha_evento','destino','observacoes'] },
      { tabela: 'doacoes_itens', campos: ['id','doacao_id','item','quantidade','unidade','valor_estimado','observacao'] },
      // Eventos e campanhas
      { tabela: 'eventos', campos: ['id','nome','descricao','data_inicio','data_fim','meta_financeira','status','observacoes'] },
      { tabela: 'campanhas', campos: ['id','nome','descricao','objetivo','data_inicio','data_fim','meta_financeira','status','observacoes'] },
      // Cobranças
      { tabela: 'cobrancas', campos: ['id','descricao','valor','data_vencimento','situacao','observacoes'] },
      { tabela: 'historico_cobrancas', campos: ['id','cobranca_id','data','descricao'] },
      // Plano de trabalho antigo (conciliação)
      { tabela: 'plano_trabalho', campos: ['id','conta_id','nome','descricao','valor_previsto'] },
    ]

    for (const mod of modulos) {
      setProgresso(`Exportando ${mod.tabela}...`)
      try {
        const { data } = await supabase.from(mod.tabela).select('*').order('id')
        const registros = data || []
        totalRegistros += registros.length
        arquivos.push({ nome: `${mod.tabela}.csv`, conteudo: csvDe(registros, mod.campos) })
      } catch(e) {
        arquivos.push({ nome: `${mod.tabela}.csv`, conteudo: `erro: ${e.message}` })
      }
    }

    // Gerar ZIP via download individual ou arquivo único
    const conteudoTotal = arquivos.map(a => 
      `\n\n========== ${a.nome} ==========\n${a.conteudo}`
    ).join('')

    const blob = new Blob([conteudoTotal], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_capette_${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)

    // Registrar log
    await supabase.from('backup_log').insert({
      data_backup: new Date().toISOString().slice(0,10),
      total_registros: totalRegistros,
      criado_em: new Date().toISOString()
    }).catch(() => {})

    setProgresso('')
    setResultado({ total: totalRegistros, arquivos: arquivos.length })
    setLoading(false)
  }

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1.25rem', marginBottom:10 },
    btn: (bg, cor='#fff') => ({ padding:'10px 20px', fontSize:13, fontWeight:500, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer' }),
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:'1.25rem' }}>Backup do Sistema</div>

      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Exportar todos os dados</div>
        <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:'1.25rem', lineHeight:1.7 }}>
          Gera um arquivo de backup com todos os dados do sistema em formato CSV, incluindo:
          financeiro, parcerias, planos, projetos, atendimentos, usuários atendidos, equipe, doações, eventos e campanhas.
        </div>

        {progresso && (
          <div style={{ fontSize:12, color:AZUL, marginBottom:12, padding:'8px 12px', background:'#E6F1FB', borderRadius:8 }}>
            <i className="ti ti-loader" style={{marginRight:4}} /> {progresso}
          </div>
        )}

        {resultado && (
          <div style={{ fontSize:12, color:'#3B6D11', marginBottom:12, padding:'8px 12px', background:'#EAF3DE', borderRadius:8 }}>
            <i className="ti ti-circle-check" style={{marginRight:4, color:'#3B6D11'}} /> Backup gerado com sucesso! {resultado.total.toLocaleString('pt-BR')} registros em {resultado.arquivos} tabelas.
          </div>
        )}

        <button onClick={gerarBackup} disabled={loading} style={s.btn(loading?'#D3D1C7':VERDE)}>
          {loading ? 'Gerando backup...' : '⬇️ Gerar e baixar backup'}
        </button>
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
  )
}
