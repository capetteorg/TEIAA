import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

// =====================================================================
// Censo SUAS — REGISTRO DE ENVIO: quando e como o Censo saiu da OSC
// (ofício, e-mail, entregue em mãos...). Fica em censo_suas.envios (coluna
// própria, que o link do administrativo não alcança) e os comprovantes no
// storage PRIVADO 'censo' (abre por link temporário). Também gera o ofício
// de encaminhamento já numerado (tabela oficios) e deixa o envio pronto
// pra registrar. Ver sql_censo_envios.sql.
// =====================================================================

const AZUL = '#0E7EA8', ESCURO = '#06344F', CINZA = '#5F5E5A', VERDE = '#3B6D11', VERMELHO = '#A32D2D'
export const MEIOS_ENVIO = ['Ofício', 'E-mail', 'Entregue em mãos', 'Protocolo na Secretaria', 'Digitado no sistema do MDS', 'Outro']
const PARA_PADRAO = 'SMASDH – Vigilância Socioassistencial'
const hoje = () => new Date().toLocaleDateString('sv-SE')
const fmtData = d => d ? d.split('-').reverse().join('/') : ''
const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
const VAZIO = { data: '', meio: '', ident: '', para: PARA_PADRAO, por: '', obs: '' }

// texto curto do último envio (pro topo da tela)
export function resumoEnvio(envios) {
  const e = [...(envios || [])].sort((a, b) => (a.data || '').localeCompare(b.data || '')).at(-1)
  if (!e) return ''
  return `Enviado em ${fmtData(e.data)} por ${e.meio}${e.ident ? ` (${e.ident})` : ''}`
}

// Fica FORA do componente (senão o campo perde o foco a cada letra)
function Campo({ rot, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : 'auto' }}>
      <span style={{ fontSize: 11, color: '#888780', marginBottom: 3, display: 'block' }}>{rot}</span>{children}
    </div>
  )
}

// props: ano, tipo (censo_suas.tipo), org ('TEIAA'), questionario (nome do questionário),
// mesRef, envios/setEnvios, pessoas (nomes pra "quem enviou"), diretoria (pra assinar o
// ofício), gerarOficio({ oficio, instituicao }) e s (estilos da tela do Censo)
export default function CensoEnvios({ ano, tipo, org, questionario, mesRef, envios, setEnvios, pessoas, diretoria, gerarOficio, s }) {
  const [form, setForm] = useState(null)          // null = fechado
  const [arquivo, setArquivo] = useState(null)
  const [ofc, setOfc] = useState(null)            // formulário do ofício (null = fechado)
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState(['', ''])

  const lista = [...(envios || [])].sort((a, b) => (a.data || '').localeCompare(b.data || ''))
  const up = (c, v) => setForm(f => ({ ...f, [c]: v }))

  async function gravar(nova) {
    const { error } = await supabase.from('censo_suas').update({ envios: nova }).eq('ano', ano).eq('tipo', tipo)
    if (error) { setMsg(['erro', /envios/.test(error.message) ? 'Rode o SQL do registro de envio (sql_censo_envios.sql) no Supabase.' : 'Não salvou: ' + error.message]); return false }
    setEnvios(nova); return true
  }

  async function registrar() {
    if (!form.data || !form.meio) { setMsg(['erro', 'Preencha a data e o meio de envio.']); return }
    setOcupado(true)
    let arq = {}
    if (arquivo) {
      const nome = arquivo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_')
      const caminho = `${ano}/${tipo}/${Date.now()}-${nome}`
      const { error } = await supabase.storage.from('censo').upload(caminho, arquivo)
      if (error) { setOcupado(false); setMsg(['erro', 'Não subiu o comprovante: ' + error.message]); return }
      arq = { arquivo: caminho, arquivo_nome: arquivo.name }
    }
    const ok = await gravar([...(envios || []), { id: novoId(), ...form, ...arq, registrado_em: new Date().toISOString() }])
    setOcupado(false)
    if (ok) { setForm(null); setArquivo(null); setMsg(['ok', 'Envio registrado.']) }
  }

  async function abrirComprovante(e) {
    const janela = window.open('', '_blank')     // abre antes do await (senão o navegador bloqueia)
    const { data, error } = await supabase.storage.from('censo').createSignedUrl(e.arquivo, 600)
    if (error || !data?.signedUrl) { janela?.close(); setMsg(['erro', 'Não abriu o comprovante: ' + (error?.message || '')]); return }
    if (janela) janela.location = data.signedUrl; else window.location.href = data.signedUrl
  }

  async function remover(e) {
    if (!window.confirm(`Apagar o registro do envio de ${fmtData(e.data)} (${e.meio})?${e.arquivo ? ' O comprovante anexado também será apagado.' : ''}`)) return
    if (e.arquivo) await supabase.storage.from('censo').remove([e.arquivo])
    await gravar((envios || []).filter(x => x.id !== e.id))
  }

  async function emitirOficio() {
    if (!ofc.orgao) { setMsg(['erro', 'Preencha o órgão de destino do ofício.']); return }
    setOcupado(true)
    const anoOf = new Date(ofc.data + 'T12:00:00').getFullYear()
    const [{ data: ult }, { data: inst }] = await Promise.all([
      supabase.from('oficios').select('numero').eq('ano', anoOf).order('numero', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('instituicao').select('*').limit(1).maybeSingle(),
    ])
    const nomeOrg = inst?.nome_completo || org
    const corpo = `${ofc.vocativo},\n\nCumprimentando-o(a) cordialmente, a ${nomeOrg}${inst?.cnpj ? `, inscrita no CNPJ sob o nº ${inst.cnpj},` : ''} vem, por meio deste, encaminhar o questionário do Censo SUAS ${ano} – ${questionario}, devidamente preenchido e assinado, com informações referentes a ${mesRef}, para validação pelo órgão gestor e registro no sistema do Ministério do Desenvolvimento e Assistência Social, Família e Combate à Fome (MDS).\n\nColocamo-nos à disposição para quaisquer esclarecimentos.\n\nAtenciosamente,`
    const { data: oficio, error } = await supabase.from('oficios').insert({
      numero: (ult?.numero || 0) + 1, ano: anoOf, data: ofc.data,
      destinatario: ofc.destinatario || null, cargo_destinatario: ofc.cargo || null, orgao_destinatario: ofc.orgao,
      assunto: `Encaminhamento do Censo SUAS ${ano}`, corpo, com_assinatura: false,
    }).select().single()
    setOcupado(false)
    if (error) { setMsg(['erro', /oficios/.test(error.message) ? 'Rode o SQL do registro de envio (sql_censo_envios.sql) no Supabase.' : 'Não gerou o ofício: ' + error.message]); return }
    const rep = (diretoria || []).find(d => /presidente/i.test(d.cargo || '')) || (diretoria || [])[0] || {}
    gerarOficio({ oficio: { ...oficio, rep_nome: rep.nome, rep_cargo: rep.cargo, rep_cpf: rep.cpf }, instituicao: inst })
    setOfc(null)
    // envio já pré-preenchido: confere e registra depois de mandar
    setForm({ ...VAZIO, data: oficio.data, meio: 'Ofício', ident: `Ofício nº ${oficio.numero}/${oficio.ano}`, para: ofc.orgao, oficio_id: oficio.id })
    setMsg(['ok', `Ofício nº ${oficio.numero}/${oficio.ano} gerado. Depois de mandar, confira abaixo e clique em Registrar envio (dá pra anexar o protocolo).`])
  }

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: ESCURO }}><i className="ti ti-send" /> Envio à Secretaria</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!ofc && <button type="button" style={s.btnTxt} onClick={() => { setOfc({ data: hoje(), destinatario: '', cargo: 'Secretário(a) Municipal de Assistência Social', orgao: 'Secretaria Municipal de Assistência Social e Direitos Humanos – SMASDH', vocativo: 'Senhor(a) Secretário(a)' }); setMsg(['', '']) }}><i className="ti ti-file-text" /> Gerar ofício de encaminhamento</button>}
          {!form && <button type="button" style={s.btn(AZUL)} onClick={() => { setForm({ ...VAZIO, data: hoje() }); setMsg(['', '']) }}><i className="ti ti-plus" /> Registrar envio</button>}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: '#888780', margin: '3px 0 10px' }}>Quando e como o Censo saiu da {org}. Dá pra registrar mais de um (ex.: e-mail primeiro, original assinado depois).</div>

      {lista.length === 0 && !form && <div style={{ fontSize: 12.5, color: CINZA }}>Nenhum envio registrado ainda.</div>}
      {lista.map(e => (
        <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0', borderTop: '0.5px solid #EFEDE6', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12.5, color: ESCURO, lineHeight: 1.5 }}>
            <b>{fmtData(e.data)}</b> · {e.meio}{e.ident ? ` · ${e.ident}` : ''}
            <div style={{ fontSize: 11.5, color: CINZA }}>{[e.para && `para ${e.para}`, e.por && `por ${e.por}`].filter(Boolean).join(' · ')}{e.obs ? ` — ${e.obs}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {e.arquivo && <button type="button" style={s.btnTxt} onClick={() => abrirComprovante(e)}><i className="ti ti-paperclip" /> {e.arquivo_nome || 'Comprovante'}</button>}
            <button type="button" style={{ ...s.btnTxt, color: VERMELHO }} onClick={() => remover(e)}>Apagar</button>
          </div>
        </div>
      ))}

      {ofc && (
        <div style={{ marginTop: 10, border: '0.5px solid #C9DCEB', background: '#F4F8FB', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: ESCURO, marginBottom: 8 }}>Ofício de encaminhamento (numeração automática da {org})</div>
          <div style={s.grid(2)}>
            <Campo rot="Data"><input type="date" style={s.input} value={ofc.data} onChange={e => setOfc(o => ({ ...o, data: e.target.value }))} /></Campo>
            <Campo rot="Vocativo"><input style={s.input} value={ofc.vocativo} onChange={e => setOfc(o => ({ ...o, vocativo: e.target.value }))} /></Campo>
            <Campo rot="Destinatário (nome)"><input style={s.input} placeholder="Ex.: nome da Secretária" value={ofc.destinatario} onChange={e => setOfc(o => ({ ...o, destinatario: e.target.value }))} /></Campo>
            <Campo rot="Cargo"><input style={s.input} value={ofc.cargo} onChange={e => setOfc(o => ({ ...o, cargo: e.target.value }))} /></Campo>
            <Campo rot="Órgão" span={2}><input style={s.input} value={ofc.orgao} onChange={e => setOfc(o => ({ ...o, orgao: e.target.value }))} /></Campo>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button type="button" style={s.btn(AZUL)} disabled={ocupado} onClick={emitirOficio}><i className="ti ti-printer" /> {ocupado ? 'Gerando…' : 'Gerar e imprimir'}</button>
            <button type="button" style={s.btnTxt} onClick={() => setOfc(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {form && (
        <div style={{ marginTop: 10, border: '0.5px solid #E0DED6', borderRadius: 10, padding: '10px 12px' }}>
          <div style={s.grid(3)}>
            <Campo rot="Data do envio *"><input type="date" style={s.input} value={form.data} onChange={e => up('data', e.target.value)} /></Campo>
            <Campo rot="Meio *">
              <select style={s.input} value={form.meio} onChange={e => up('meio', e.target.value)}><option value="">—</option>{MEIOS_ENVIO.map(m => <option key={m}>{m}</option>)}</select>
            </Campo>
            <Campo rot="Nº / identificação"><input style={s.input} placeholder={form.meio === 'E-mail' ? 'e-mail de destino' : 'Ex.: Ofício nº 045/2026, protocolo…'} value={form.ident} onChange={e => up('ident', e.target.value)} /></Campo>
            <Campo rot="Para quem" span={2}><input style={s.input} value={form.para} onChange={e => up('para', e.target.value)} /></Campo>
            <Campo rot="Quem enviou">
              <input style={s.input} list="censo-envio-pessoas" value={form.por} onChange={e => up('por', e.target.value)} placeholder="Escolha ou digite" />
              <datalist id="censo-envio-pessoas">{(pessoas || []).map(n => <option key={n} value={n} />)}</datalist>
            </Campo>
            <Campo rot="Observação" span={2}><input style={s.input} value={form.obs} onChange={e => up('obs', e.target.value)} /></Campo>
            <Campo rot="Comprovante (opcional)"><input type="file" accept=".pdf,image/*" style={{ fontSize: 12 }} onChange={e => setArquivo(e.target.files?.[0] || null)} /></Campo>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button type="button" style={s.btn(AZUL)} disabled={ocupado} onClick={registrar}>{ocupado ? 'Salvando…' : 'Registrar envio'}</button>
            <button type="button" style={s.btnTxt} onClick={() => { setForm(null); setArquivo(null) }}>Cancelar</button>
          </div>
        </div>
      )}

      {msg[1] && <div style={{ fontSize: 12, marginTop: 8, color: msg[0] === 'erro' ? VERMELHO : VERDE }}>{msg[1]}</div>}
    </div>
  )
}
