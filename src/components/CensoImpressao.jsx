import React from 'react'
import { createPortal } from 'react-dom'
import { ESCOLARIDADE, PROFISSAO, VINCULO, FUNCAO, CARGA } from '../lib/censoCodigos'

// =====================================================================
// Versão impressa do Censo SUAS no FORMATO DO FORMULÁRIO DO MDS
// (questionário Centro Dia). Só aparece na impressão (window.print).
//
// Fica num portal direto no <body> pra imprimir em fluxo normal (várias
// páginas, página deitada pra equipe) sem o menu do sistema.
//
// MDS = textos do papel que não cabem na tela: enunciado oficial (t),
// instrução em vermelho (inst), caixa "Atenção!" (atencao), nota em
// vermelho ao lado de uma opção (notas) e jeito de desenhar (formato).
// TODO ANUAL: conferir com o PDF novo do MDS.
// =====================================================================

const MDS = {
  q1: { t: 'Dados provenientes da esfera de gestão estadual ou municipal:', inst: '(marcação do sistema)', linha: true },
  q2: { t: 'Indique o Público atendido nesta Unidade:', inst: '(marcação múltipla – caso necessário, atualize no CADSUAS)' },
  q3: { t: 'Horário de funcionamento:' },
  q4: { t: 'Indique a Natureza desta Unidade:', inst: '(marcação única – caso necessário, atualize no CADSUAS)', notas: { Governamental: '(pule para questão 10)' } },
  q5: { t: 'Em caso de Entidade Não Governamental/ Organização da Sociedade Civil, indique o CNPJ:', inst: '(caso necessário, atualize no CADSUAS)' },
  q6: { t: 'Esta entidade faz parte de alguma rede/federação nacional, estadual ou regional de entidades de defesa e apoio às pessoas com deficiência e suas famílias?', atencao: 'Inscrição/registro em Conselho de Direitos não devem ser registrados nesta questão e/ou a obtenção de CEBAS.', notas: { 'Não': '(pule para a questão 8)' }, linha: true },
  q7: { t: 'Caso sim, informe a principal rede/federação de que faz parte:', inst: '(marcação única)' },
  q8: { t: 'A entidade recebe recursos financeiros do Fundo de Assistência Social para a execução do serviço de PSE para Pessoas com Deficiência?', inst: '(Admite múltipla resposta, exceto se marcar a última opção)' },
  q9: { t: 'A entidade recebe outras formas de apoio do poder público municipal, estadual ou do Distrito Federal? Caso sim, indique quais:', inst: '(admite múltipla resposta, exceto se marcar a primeira opção)', atencao: 'Assinalar os itens apenas quando o apoio ocorrer de forma direta, não sendo decorrente do próprio recurso financeiro transferido pelo Convênio' },
  q10: { t: 'Assinale o(s) Conselho(s) no(s) qual(is) esta unidade possui inscrição/registro:', inst: '(Admite múltipla resposta, exceto se marcar a última opção.)', caixa: 'A inscrição/registro é a autorização de funcionamento concedida pelos conselhos para projetos/atividades a políticas públicas específicas. Esta pergunta não se refere a participação de pessoas em conselhos, mas de inscrição/registro da entidade nestes Conselho, seja no Conselho Municipal, Estadual ou do Distrito Federal.', notas: { 'Conselho de Assistência Social': '(esta opção só pode ser marcada por organizações da sociedade civil-não governamental)' } },
  q11: { t: 'Este Centro Dia está referenciado a um Centro de Referência Especializado de Assistência Social (CREAS)?', atencao: 'Considera-se referenciamento ao CREAS o processo de coordenação e orientação das unidades que ofertam serviços de Proteção Social Especial e tenham pactuação de fluxo, monitoramento e outras articulações para atendimento das usuárias/os encaminhados pelos CREAS.', notas: { 'Não': '(pule para a questão 13)' }, qualRotulo: { Sim: 'Qual? Número de Identificação' } },
  q12: { t: 'O Centro de Referência Especializado de Assistência Social (CREAS) que referencia este Centro Dia realiza quais atividades de referenciamento:', inst: '(Admite múltiplas respostas, exceto se marcar a última opção)' },
  q13: { t: 'Em relação a outras políticas públicas, esta unidade...', inst: '(admite múltipla resposta por linha, exceto se marcar a opção “Nenhuma das anteriores”)' },
  q14: { t: 'Descreva o espaço físico desta Unidade', inst: '(Atenção! Cada sala deve ser contada uma única vez na descrição do espaço)', formato: 'salas' },
  q14b: { semNumero: true, formato: 'simnao' },
  q15: { t: 'Assinale as condições de acessibilidade para pessoas com deficiência e pessoas idosas nesta Unidade:', inst: '(Resposta única por linha)', cabecalho: 'Condições de acessibilidade apresentadas' },
  q16: { t: 'Além dos itens acima, há outras adaptações para assegurar a acessibilidade desta unidade?', inst: '(Admite múltiplas respostas, exceto se marcar a última opção)' },
  q17: { t: 'Indique os equipamentos e materiais disponíveis, em perfeito funcionamento, para o desenvolvimento dos Serviços desta unidade.', inst: '(Admite múltiplas respostas)', colunas: 2 },
  q18: { t: 'Indique a quantidade de computadores, em perfeito funcionamento, existente neste Centro Dia:', inst: '(Caso não possua, marque “0”)', formato: 'linhas' },
  q19: { t: 'O local onde funciona a Unidade é servido por transporte público (ônibus/trem/metrô/barcas)?', inst: '(resposta única)' },
  q20: { t: 'Indique as ações e atividades desenvolvidas no âmbito do “Serviço de Proteção Social Especial para Pessoas com Deficiência e Pessoas Idosas e suas famílias” nesta Unidade:', inst: '(admite múltiplas respostas).' },
  q21: { t: 'Há realização de oficinas? Se sim, quais?', inst: '(admite múltiplas respostas, exceto se marcar a última opção)' },
  q22: { t: 'O Serviço de Proteção Social Especial Para Pessoas Com Deficiência, Idosas e Suas Famílias, ofertado nesta Unidade, possui capacidade para atender quantas(os) usuárias(os) por turno?', inst: '(Se não houver, marcar 0)' },
  q23: { t: 'Em média, quantos dias por semana as(os) usuárias(os) da unidade frequentam/acessam este serviço?', inst: '(Resposta única)' },
  q24: { t: 'Em média, quantas horas por dia as(os) usuárias(os) da unidade permanecem na Unidade (nos dias em que este utiliza o serviço)?', inst: '(Resposta única)', colunas: 2 },
  q25: { t: 'Em relação às vagas do Serviço de PSE para pessoas com deficiência, idosas(os) e suas famílias, informe se:', inst: '(Resposta única)' },
  q26: { t: 'Esta Unidade oferece alimentação às(aos) usuárias(os)?', inst: '(Admite múltiplas respostas, exceto se marcar “Não oferta alimentação”).', colunas: 2 },
  q27: { t: 'Existe apoio para deslocamento das famílias/indivíduos para a sede desta Unidade e como se dá este apoio?', inst: '(Admite múltiplas respostas)' },
  q28: { t: 'Quais mecanismos de participação são utilizados nesta unidade?', inst: '(Admite múltiplas respostas)' },
  q29: { t: 'O serviço mantém lista de espera de usuários?', notas: { 'Não': '(pular para a questão 31)' }, linha: true },
  q30: { t: 'Se sim, quantas pessoas estão neste momento em lista de espera?' },
  q31: { t: 'Informe o número de pessoas com deficiência e/ou dependência atendidas nesta Unidade durante o mês de {MES}, conforme o quadro abaixo:', inst: '(Se não houver, marcar 0)', formato: 'tabela' },
  q32: { t: 'Indique a quantidade de pessoas segundo o tipo de deficiência durante o mês de {MES}:', inst: '(Caso o indivíduo tenha deficiência múltipla, marcar todas as deficiências. O valor de cada linha não pode ser maior que o Total de pessoas atendidas no Serviço. Caso não haja pessoas com algum tipo específico de deficiência, informe o valor “0”)', formato: 'tabela' },
  q33: { t: 'Dentre as(os) usuárias(os) atendidas(os) nesta unidade no mês de {MES}, informe:', inst: '(Caso não haja beneficiárias(os) do BPC entre as pessoas desta Unidade, informe o valor “zero”)', formato: 'lista' },
  q34: { t: 'Atualmente, em média, quantos usuários ficam na unidade em:', inst: '(Caso não haja, informe o valor “zero”)', formato: 'lista' },
  q35: { t: 'Indique as ações de articulação deste Centro Dia e similar com os seguintes serviços, programas ou instituições existentes no município:', inst: '(Admite múltiplas respostas, exceto se marcar ‘Não possui articulação’ ou ‘Serviço ou Instituição não existente no município ou no DF’)', vertical: true, cabecalho: 'Serviços, programas ou instituições com os quais mantém articulação' },
  q36: { t: 'O(a) coordenador(a) desta Unidade:', inst: '(resposta única)' },
}

const TITULO = 'Centro Dia e outras unidades de habilitação e reabilitação de pessoas com deficiência'
const CARGO_RESP = ['Coordenador(a) da unidade', 'Técnica(o) de nível superior da unidade', 'Outros']
const CARGO_GESTOR = ['Secretária(o) Municipal/Estadual de Assistência Social ou congênere', 'Diretor(a)/Coordenador(a)/Responsável pela área de proteção social especial no município ou estado', 'Técnica(o) da Secretaria Municipal e/ou Estadual de Assistência Social ou congênere', 'Outros']

// utilidades (mesma lógica da tela)
const visivel = (q, r) => !q.mostrar || q.mostrar(r)
const pedeTexto = (q, o) => Array.isArray(q.outro) ? q.outro.includes(o) : q.outro === o
const qual = (r, q, o) => (r[q.k + '_qual'] || {})[o] || ''
const fmtData = d => d ? d.split('-').reverse().join('/') : ''
const somaCampos = (q, v) => q.campos.filter(([, , , o]) => !o?.soma).reduce((a, [c]) => a + (Number(v?.[c]) || 0), 0)
const valorCampo = (q, v, [c, , , o]) => o?.soma ? (q.campos.some(([cc, , , oo]) => !oo?.soma && (v?.[cc] ?? '') !== '') ? String(somaCampos(q, v)) : '') : (v?.[c] ?? '')

// ------------------------------------------------------------- peças do papel
const PRETO = '#000', VERMELHO = '#C00000'
const Q = ({ on }) => <span className="cx">{on ? 'X' : ''}</span>                     // |__| com X
const Num = ({ v, w = 46 }) => <span className="num" style={{ minWidth: w }}>{v ?? ''}</span>  // |__|__|__| com o valor
const Inst = ({ children }) => children ? <span className="inst"> {children}</span> : null
const Linha = ({ children, w }) => <span className="preench" style={w ? { minWidth: w } : null}>{children || ' '}</span>

function Bloco({ titulo }) { return <div className="bloco">{titulo}</div> }

// =====================================================================
export default function CensoImpressao({ blocos, r, equipe, ano, mesRef }) {
  const id = r.ident || {}
  const eq = (equipe || []).filter(p => p.incluir)
  const linhasEq = [...eq, ...Array.from({ length: Math.max(0, 16 - eq.length) }, () => null)]
  const perguntas = blocos.slice(1, -1)

  function Enunciado({ q, m }) {
    return (
      <div className="enun">
        {!m.semNumero && <>{q.n}. </>}{(m.t || q.texto).replace('{MES}', mesRef)}<Inst>{m.inst}</Inst>
      </div>
    )
  }

  function Opcoes({ q, m, r }) {
    const v = r[q.k]
    const marc = o => q.tipo === 'unica' ? v === o : (v || []).includes(o)
    const lin = o => (
      <div key={o} className="opc">
        <Q on={marc(o)} /> {o}
        {q.qtd?.includes(o) && <> Quantos? <Num v={marc(o) ? (r[q.k + '_qtd'] || {})[o] : ''} w={30} /></>}
        {pedeTexto(q, o) && <> {m.qualRotulo?.[o] || 'Qual?'} <Linha>{marc(o) ? qual(r, q, o) : ''}</Linha></>}
        {m.notas?.[o] && <Inst>{m.notas[o]}</Inst>}
      </div>
    )
    if (m.linha) return <div className="opcs linha">{q.opcoes.map(lin)}</div>
    return <div className="opcs" style={m.colunas ? { columns: m.colunas, columnGap: 24 } : null}>{q.opcoes.map(lin)}</div>
  }

  function Numeros({ q, m, r }) {
    const v = r[q.k] || {}
    const ns = c => v[c + '_ns']
    if (m.formato === 'salas') {
      const sec = { s5: 'Salas utilizadas para atividades com as(os) usuárias(os)', adm: 'Salas exclusivas de Coordenação, equipe técnica ou administração' }
      const rot = { s5: 'Quantidade de Salas com capacidade máxima de 5 pessoas', s6: 'Quantidade de Salas com capacidade para 6 a 14 pessoas', s15: 'Quantidade de Salas com capacidade de 15 a 29 pessoas', s30: 'Quantidade de Salas com capacidade para 30 ou mais pessoas', adm: 'Quantidade de salas (Atenção! Não são salas utilizadas para atendimento!)', btrab: 'Banheiros de uso exclusivo das(os) trabalhadoras(es)', busu: 'Banheiros para uso das(os) usuárias(os)' }
      const negrito = ['btrab', 'busu']
      return (
        <table className="grade" style={{ width: '88%', margin: '4px auto' }}><tbody>
          {q.campos.map(([c]) => (
            <React.Fragment key={c}>
              {sec[c] && <tr className="cinza"><th style={{ textAlign: 'left' }}>{sec[c]}</th><th style={{ width: 110 }}>{c === 's5' ? 'Quantidade' : ''}</th></tr>}
              <tr className={negrito.includes(c) ? 'cinza' : ''}><td style={negrito.includes(c) ? { fontWeight: 700 } : null}>{rot[c]}</td><td className="centro"><Num v={v[c]} /></td></tr>
            </React.Fragment>
          ))}
        </tbody></table>
      )
    }
    if (m.formato === 'tabela') return (
      <table className="grade" style={{ width: '92%', margin: '4px auto' }}><tbody>
        <tr className="cinza"><th style={{ textAlign: 'left' }}>Número de usuárias(os) atendidas(os) no Serviço no mês de {mesRef}</th><th colSpan={q.campos.some(c => c[3]?.ns) ? 2 : 1} style={{ width: 170 }}>Quantidade</th></tr>
        {q.campos.map(campo => {
          const [c, t, , o] = campo
          return (
            <tr key={c}>
              <td>{t}</td>
              <td className="centro"><Num v={ns(c) ? '' : valorCampo(q, v, campo)} />{o?.soma && <span style={{ marginLeft: 6 }}>( ) Não Sabe</span>}</td>
              {q.campos.some(cc => cc[3]?.ns) && <td className="centro" style={{ width: 80 }}>{o?.ns ? <>({ns(c) ? 'X' : '  '}) Não Sabe</> : null}</td>}
            </tr>
          )
        })}
      </tbody></table>
    )
    if (m.formato === 'lista') return (
      <div className="opcs">
        {q.campos.map(([c, t, , o]) => (
          <div key={c} className="opc" style={{ display: 'flex', gap: 8 }}>
            <Num v={ns(c) ? '' : v[c]} /><span style={{ flex: 1 }}>{q.k === 'q33' ? `Quantidade de ${t.charAt(0).toLowerCase()}${t.slice(1)}` : t}</span>
            {o?.ns && <span style={{ width: 150 }}><Q on={ns(c)} /> Não sabe informar</span>}
          </div>
        ))}
      </div>
    )
    if (m.formato === 'linhas') return (
      <div className="opcs">
        {q.campos.map(([c, t]) => <div key={c} className="opc" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{t}</span><Num v={v[c]} /></div>)}
      </div>
    )
    return (
      <div className="opcs">
        {q.campos.map(([c, suf]) => <div key={c} className="opc"><Num v={v[c]} w={34} /> {suf}</div>)}
      </div>
    )
  }

  function Matriz({ q, m, r }) {
    const v = r[q.k] || {}
    const marc = (i, col) => q.modo === 'unica' ? v[i] === col : (v[i] || []).includes(col)
    if (m.formato === 'simnao') return (
      <table className="grade" style={{ width: '88%', margin: '6px auto 4px' }}><tbody>
        <tr className="cinza"><th style={{ textAlign: 'left' }}>Demais Ambientes</th><th style={{ width: 150 }}>Possui?</th></tr>
        {q.linhas.map((l, i) => <tr key={l}><td>{l}</td><td className="centro"><Q on={marc(i, 'Sim')} /> Sim &nbsp;&nbsp; <Q on={marc(i, 'Não')} /> Não</td></tr>)}
      </tbody></table>
    )
    return (
      <table className="grade" style={{ width: '100%', margin: '4px 0' }}>
        <thead>
          {m.vertical && <tr className="cinza"><th rowSpan={2} style={{ textAlign: 'left', verticalAlign: 'middle' }}>{m.cabecalho}</th><th colSpan={q.colunas.length - (q.exclusivas?.length || 0)}>Tipo de Articulação</th>{(q.exclusivas || []).map(x => <th key={x} rowSpan={2} className="vert"><span>{x}</span></th>)}</tr>}
          <tr className="cinza">
            {!m.vertical && <th style={{ textAlign: 'left' }}>{m.cabecalho || ''}</th>}
            {q.colunas.filter(c => !(m.vertical && q.exclusivas?.includes(c))).map(c => m.vertical ? <th key={c} className="vert"><span>{c}</span></th> : <th key={c} style={{ width: `${Math.round(60 / q.colunas.length)}%` }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {q.linhas.map((l, i) => (
            <tr key={l}>
              <td>{l === q.linhaOutro ? <>{l}. Qual? <Linha>{r[q.k + '_linha']}</Linha></> : l}</td>
              {[...q.colunas.filter(c => !(m.vertical && q.exclusivas?.includes(c))), ...(m.vertical ? q.exclusivas || [] : [])].map(c => <td key={c} className="centro"><Q on={marc(i, c)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  function Questao({ q }) {
    const m = MDS[q.k] || {}
    const pulada = !visivel(q, r)
    const rv = pulada ? {} : r   // pulada = sai em branco, como no papel
    const Comp = q.tipo === 'numeros' ? Numeros : q.tipo === 'matriz' ? Matriz : q.tipo === 'texto' ? null : Opcoes
    return (
      <div className="questao">
        {q.k !== 'q14b' && <Enunciado q={q} m={m} />}
        {m.atencao && <div className="atencao"><b><i>Atenção!</i></b> <i>{m.atencao}</i></div>}
        {m.caixa && <div className="atencao"><i>{m.caixa}</i></div>}
        {Comp ? <Comp q={q} m={m} r={rv} /> : <div className="opcs"><Linha>{rv[q.k]}</Linha></div>}
      </div>
    )
  }

  const assinatura = (k, titulo, rotData, cargos) => {
    const v = r[k] || {}
    return (
      <div className="caixa-ass">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{titulo}</div>
        <div>Nome: <Linha>{v.nome}</Linha></div>
        <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
          <span style={{ flex: 1 }}>CPF: <Linha>{v.cpf}</Linha></span>
          <span>{rotData}: <Linha>{fmtData(v.data) || '___ / ___ / ______'}</Linha></span>
        </div>
        <div style={{ marginTop: 6 }}><b>Cargo/Função:</b></div>
        {cargos.map(c => <div key={c} className="opc"><Q on={v.cargo === c} /> {c === 'Outros' ? <>Outros. Especifique: <Linha>{v.cargo === 'Outros' ? v.cargo_outro : ''}</Linha></> : c}</div>)}
        <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
          <span style={{ flex: 1 }}>Telefone: <Linha>{v.telefone}</Linha></span>
          <span style={{ flex: 1 }}>E-mail: <Linha>{v.email}</Linha></span>
        </div>
        <div style={{ marginTop: 20 }}>Assinatura: <span className="preench" style={{ minWidth: 300 }}>&nbsp;</span></div>
      </div>
    )
  }

  const cod = c => c || ''
  const pagina = (
    <div id="censo-mds">
      <style>{CSS}</style>

      {/* capa */}
      <div className="capa">
        <div style={{ fontSize: 30, fontWeight: 700, textAlign: 'center', marginTop: 30 }}>CENSO SUAS {ano}</div>
        <div style={{ borderTop: '1px dotted #999', margin: '10px 0 6px' }} />
        <div style={{ textAlign: 'center', fontWeight: 700, color: '#2E5A1C' }}>Secretaria Nacional de Assistência Social</div>
        <div style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '60px 20px 30px', lineHeight: 1.25 }}>{TITULO}</div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 10 }}>RECOMENDAMOS A LEITURA DO MANUAL PARA O CORRETO PREENCHIMENTO DO QUESTIONÁRIO</div>
        <div style={{ textAlign: 'center', fontWeight: 700, margin: '14px 0', textDecoration: 'underline', color: '#1F4FA0' }}>https://censo-suas.mds.gov.br</div>
        <div style={{ textAlign: 'center', margin: '0 30px 14px' }}>Este questionário deve ser preenchido para as Unidades Não-Governamentais e Governamentais que executam o <b><u>“Serviço de Proteção Social Especial para pessoas com deficiência, idosas e suas famílias”</u></b>, seja na modalidade Centro Dia, seja em qualquer outra modalidade. A exceção é a execução por meio de CREAS, que responderá no respectivo questionário.</div>
        <div className="atencao" style={{ margin: '0 30px' }}>Serviço para a oferta de atendimento socioassistencial especializado a Pessoas com Deficiência e Idosos com algum grau de dependência de cuidados e suas famílias. Tem a finalidade de oferecer cuidados durante o dia, em atividades básicas e instrumentais, complementares aos ofertados pela família, com o objetivo de proteger, evitar o isolamento social, promover autonomias, fortalecer os vínculos familiares, sociais e comunitários, a inclusão social e a melhoria da qualidade de vida das pessoas participantes.</div>
        <div style={{ textAlign: 'center', margin: '24px 30px 0' }}><i><u>O questionário pode ser preenchido diretamente no sistema eletrônico</u></i>, ou ainda pode ser preenchido primeiramente no papel, assinado pelo agente público responsável e armazenado.</div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 9, margin: '60px 20px 0' }}>As informações declaradas pelo agente público neste questionário possuem Fé Pública e constituem registros administrativos do Sistema Único de Assistência Social. O fornecimento de informações inverídicas sujeita o agente responsável a sanções administrativas, civis e penais.</div>
      </div>

      {/* bloco 1 */}
      <div className="quebra" />
      <div className="caixa-b1">
        <div className="bloco" style={{ margin: '0 -10px 8px', borderWidth: '0 0 1px' }}>BLOCO 1 – IDENTIFICAÇÃO DA UNIDADE</div>
        <div><b>Nome que identifica a unidade:</b> <Linha>{id.nome}</Linha></div>
        <div><b>Selecione o Tipo de Logradouro (avenida, rua etc.):</b> <Linha>{id.tipo_logradouro}</Linha></div>
        <div style={{ display: 'flex', gap: 12 }}><span style={{ flex: 3 }}><b>Endereço:</b> <Linha>{id.endereco}</Linha></span><span style={{ whiteSpace: 'nowrap' }}><b>Número:</b> <Linha w={70}>{id.numero}</Linha></span></div>
        <div style={{ display: 'flex', gap: 12 }}><span style={{ flex: 1 }}><b>Complemento:</b> <Linha>{id.complemento}</Linha></span><span style={{ flex: 1 }}><b>Bairro:</b> <Linha>{id.bairro}</Linha></span></div>
        <div><b>CEP:</b> <Linha>{id.cep}</Linha></div>
        <div style={{ display: 'flex', gap: 12 }}><span style={{ flex: 3 }}><b>Município: (Seleção)</b> <Linha>{id.municipio}</Linha></span><span style={{ whiteSpace: 'nowrap' }}><b>UF: (Seleção)</b> <Linha w={60}>{id.uf}</Linha></span></div>
        <div><b>E-mail:</b> <Linha>{id.email}</Linha></div>
        <div><b>DDD – Telefone:</b> <Num v={id.ddd} w={26} /> - <Num v={id.telefone} w={110} /> <b>Ramal:</b> <Num v={id.ramal} w={40} /></div>
        <div><b>Data de Implantação desta Unidade:</b> <Num v={fmtData(id.data_implantacao)} w={90} /></div>
      </div>

      {/* blocos 2 a 6 */}
      {perguntas.map((b, bi) => (
        <div key={b.id}>
          <Bloco titulo={`BLOCO ${bi + 2} – ${b.titulo.toUpperCase()}`} />
          {b.questoes.filter(q => q.tipo !== 'equipe').map(q => <Questao key={q.k} q={q} />)}
          {b.questoes.some(q => q.tipo === 'equipe') && (
            <div className="paisagem">
              <div className="enun" style={{ marginTop: 0 }}>37. Indique o nome, data de nascimento, sexo, CPF, RG, escolaridade, profissão, vínculo, função e carga horária de cada membro da equipe desta Unidade, conforme quadros abaixo:</div>
              <table className="grade equipe">
                <thead>
                  <tr className="cinza">
                    <th rowSpan={2} style={{ width: '17%' }}>Nome Completo</th><th rowSpan={2}>Data de Nascimento DD/MM/AAAA</th><th rowSpan={2}>Sexo</th><th rowSpan={2}>Número do CPF</th>
                    <th colSpan={3}>Dados do RG</th><th rowSpan={2}>E-mail</th>
                    {['Escolaridade', 'Profissão', 'Vínculo', 'Função'].map(h => <th key={h} rowSpan={2} className="vert"><span>{h}</span></th>)}
                    <th rowSpan={2} className="vert"><span>Carga horária <b>SEMANAL</b></span></th><th rowSpan={2} className="vert"><span>Início do exercício da função DD/MM/AAAA</span></th>
                  </tr>
                  <tr className="cinza"><th>Número</th><th>Órgão Emissor</th><th>UF</th></tr>
                </thead>
                <tbody>
                  {linhasEq.map((p, i) => (
                    <tr key={i}>
                      <td>{i + 1}) {p?.nome}</td><td className="centro">{fmtData(p?.nascimento)}</td>
                      <td className="centro" style={{ whiteSpace: 'nowrap' }}><Q on={p?.sexo === 'F'} />F <Q on={p?.sexo === 'M'} />M</td>
                      <td className="centro">{p ? (p.cpf || p.cpf_mask || '') : ''}</td><td className="centro">{p ? (p.rg_numero || p.rg_mask || '') : ''}</td><td className="centro">{p?.rg_orgao}</td><td className="centro">{p?.rg_uf}</td>
                      <td style={{ wordBreak: 'break-all' }}>{p?.email}</td>
                      <td className="centro"><Num v={cod(p?.escolaridade)} w={18} /></td><td className="centro"><Num v={cod(p?.profissao)} w={24} /></td><td className="centro"><Num v={cod(p?.vinculo)} w={18} /></td>
                      <td className="centro"><Num v={cod(p?.funcao)} w={18} /></td><td className="centro"><Num v={cod(p?.carga)} w={18} /></td><td className="centro">{fmtData(p?.inicio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="atencao" style={{ width: '60%', margin: '18px auto', textAlign: 'center', background: '#D9D9D9' }}><i>CASO SEJA NECESSÁRIO ATUALIZAR ESTES DADOS, ATUALIZE NO CADSUAS.</i></div>
              <div className="quebra" />
              <table className="grade legenda">
                <thead><tr className="cinza"><th>Escolaridade</th><th>Profissão</th><th>Tipo de Vínculo</th><th>Função na unidade</th><th>Carga Horária</th></tr></thead>
                <tbody><tr>
                  <td>{ESCOLARIDADE.map(([c, t]) => <div key={c}>{c}. {t}</div>)}</td>
                  <td>{PROFISSAO.map(([c, t]) => <div key={c}>{c} – {t}</div>)}</td>
                  <td>{VINCULO.map(([c, t]) => <div key={c}>{c}. {t}</div>)}</td>
                  <td>{FUNCAO.map(([c, t]) => <div key={c}>{c}. {t}</div>)}</td>
                  <td>{CARGA.map(([c, t]) => <div key={c}>{c}. {t}</div>)}</td>
                </tr></tbody>
              </table>
              <div style={{ fontStyle: 'italic', fontSize: 9 }}>Preencha o quadro anterior utilizando número correspondente à Escolaridade, Profissão, ao Tipo de Vínculo, Função e Carga Horária e Serviços realizado de cada trabalhador.</div>
            </div>
          )}
        </div>
      ))}

      {/* bloco 7 (a página deitada da equipe já força a quebra) */}
      <Bloco titulo={`BLOCO ${blocos.length} – RESPONSÁVEL PELO PREENCHIMENTO`} />
      <div className="enun">38. Identificação da pessoa responsável pelas informações prestadas pela Unidade:</div>
      {assinatura('resp', '', 'Data de preenchimento', CARGO_RESP)}
      {assinatura('gestor', 'Identificação do agente público responsável, no Órgão Gestor da Assistência Social, pelas informações declaradas neste formulário:', 'Data de validação', CARGO_GESTOR)}
      <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 14 }}>Este formulário original, após a digitação dos dados, deve permanecer arquivado na</div>
      <div style={{ textAlign: 'center', fontWeight: 700, fontStyle: 'italic' }}>Secretaria Municipal de Assistência Social ou Secretaria Estadual de Assistência Social (ou congênere)</div>
    </div>
  )
  return createPortal(pagina, document.body)
}

const CSS = `
#censo-mds { display: none; }
@media print {
  @page { size: A4 portrait; margin: 14mm 13mm; }
  @page deitada { size: A4 landscape; margin: 10mm; }
  body > *:not(#censo-mds) { display: none !important; }
  html, body { background: #fff !important; }
  #censo-mds { display: block !important; font-family: Arial, Helvetica, sans-serif; color: ${PRETO}; font-size: 10.5px; line-height: 1.35; }
  #censo-mds * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #censo-mds .capa { border: 3px double #3A6B23; outline: 1px solid #3A6B23; outline-offset: 3px; padding: 18px 26px; min-height: 250mm; box-sizing: border-box; }
  #censo-mds .quebra { break-after: page; }
  #censo-mds .bloco { border: 1px solid #000; background: #F2F2F2; text-align: center; font-weight: 700; padding: 3px; margin: 14px 0 10px; break-after: avoid; }
  #censo-mds .caixa-b1 { border: 1px solid #000; padding: 0 10px 8px; }
  #censo-mds .caixa-b1 > div { margin: 6px 0; }
  #censo-mds .questao { margin: 0 0 12px; break-inside: avoid; }
  #censo-mds .enun { font-weight: 700; margin: 10px 0 4px; }
  #censo-mds .inst { color: ${VERMELHO}; font-style: italic; font-weight: 700; font-size: 9px; }
  #censo-mds .atencao { border: 1px solid #000; padding: 4px 6px; margin: 4px 0 6px; font-size: 9.5px; }
  #censo-mds .opcs { margin: 2px 0 0; }
  #censo-mds .opcs.linha { display: flex; gap: 40px; }
  #censo-mds .opc { margin: 1px 0; break-inside: avoid; }
  #censo-mds .cx { display: inline-block; width: 15px; height: 11px; border: 1px solid #000; border-top: 0; text-align: center; font-weight: 700; font-size: 10px; line-height: 11px; vertical-align: -1px; margin-right: 3px; }
  #censo-mds .num { display: inline-block; height: 13px; border: 1px solid #000; border-top: 0; text-align: center; font-weight: 700; line-height: 13px; padding: 0 3px; vertical-align: -2px; }
  #censo-mds .preench { display: inline-block; min-width: 140px; border-bottom: 1px solid #000; font-weight: 700; padding: 0 3px; }
  #censo-mds table.grade { border-collapse: collapse; }
  #censo-mds table.grade th, #censo-mds table.grade td { border: 1px solid #000; padding: 2px 5px; font-size: 9.5px; vertical-align: middle; }
  #censo-mds table.grade th { font-weight: 700; }
  #censo-mds table.grade tr.cinza th, #censo-mds table.grade tr.cinza td { background: #E7E6E6; }
  #censo-mds .centro { text-align: center; }
  #censo-mds th.vert { height: 150px; padding: 2px 1px; }
  #censo-mds th.vert span { writing-mode: vertical-rl; transform: rotate(180deg); white-space: normal; font-size: 8.5px; display: inline-block; max-height: 145px; }
  #censo-mds .paisagem { page: deitada; break-before: page; }
  #censo-mds table.equipe { width: 100%; }
  #censo-mds table.equipe td { height: 17px; font-size: 8.5px; }
  #censo-mds table.equipe th { font-size: 8.5px; }
  #censo-mds table.equipe th.vert { height: 90px; }
  #censo-mds table.legenda { width: 100%; margin-top: 10px; }
  #censo-mds table.legenda td { vertical-align: top; line-height: 1.7; font-size: 9px; }
  #censo-mds .caixa-ass { border: 1px solid #000; padding: 8px 10px; margin: 8px 0 14px; break-inside: avoid; }
}
`
