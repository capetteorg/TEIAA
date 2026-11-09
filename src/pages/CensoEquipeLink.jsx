import React, { useState, useContext, createContext } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'
import { ESCOLARIDADE, PROFISSAO, VINCULO, FUNCAO, CARGA, UFS, rotulo, novoMid, mascaraCpf, mascaraDoc, faltando, fichaDaEquipe, fichaManual } from '../lib/censoCodigos'

// =====================================================================
// Bloco Equipe (questão 37) do Censo SUAS aberto pelo LINK público do
// administrativo (CensoSuas com token). Cada ficha é salva na hora, pessoa
// a pessoa. Tudo passa pelas funções
// censo_equipe_abrir / censo_equipe_salvar / censo_equipe_remover
// (sql_censo_link_equipe.sql): o navegador não lê nenhuma tabela direto.
// CPF e RG já cadastrados chegam MASCARADOS; campo vazio não apaga nada.
// =====================================================================

const AZUL = '#0E7EA8', ESCURO = '#06344F', CINZA = '#5F5E5A', VERDE = '#3B6D11', LARANJA = '#854F0B', VERMELHO = '#A32D2D'

// Fica FORA da página (senão o campo perde o foco a cada letra)
const MobileCtx = createContext(false)
function Campo({ rot, ajuda, children, inteiro }) {
  const mobile = useContext(MobileCtx)
  return (
    <div style={{ gridColumn: inteiro && !mobile ? 'span 2' : 'auto' }}>
      <span style={{ fontSize: 12, color: '#888780', marginBottom: 4, display: 'block' }}>{rot}</span>{children}
      {ajuda && <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>{ajuda}</div>}
    </div>
  )
}

// pessoas/setPessoas vêm do CensoSuas (modo link), que carrega a equipe
// com censo_equipe_abrir — assim a revisão e a impressão também enxergam.
export default function CensoEquipeLink({ token, pessoas, setPessoas }) {
  const isMobile = useIsMobile()
  const [aberta, setAberta] = useState(null)       // chave da pessoa com a ficha aberta
  const [salvando, setSalvando] = useState(null)
  const [aviso, setAviso] = useState({})           // chave → mensagem depois de salvar

  const chave = p => p.equipe_id ? 'e' + p.equipe_id : 'm' + p.mid
  const up = (k, c, v) => setPessoas(ps => ps.map(p => chave(p) === k ? { ...p, [c]: v } : p))

  async function salvar(p, extra = {}) {
    const k = chave(p)
    const f = { ...p, ...extra }
    setSalvando(k)
    const envio = {
      ...(f.equipe_id ? { equipe_id: f.equipe_id } : { mid: f.mid, nome: f.nome }),
      incluir: !!f.incluir,
      nascimento: f.nascimento, sexo: f.sexo, cpf: f.cpf, rg_numero: f.rg_numero, rg_orgao: f.rg_orgao, rg_uf: f.rg_uf, email: f.email,
      escolaridade: f.escolaridade, escolaridade_txt: f.escolaridade ? rotulo(ESCOLARIDADE, f.escolaridade) : '',
      profissao: f.profissao, formacao_txt: f.profissao ? rotulo(PROFISSAO, f.profissao) : '',
      vinculo: f.vinculo, funcao: f.funcao, carga: f.carga, inicio: f.inicio,
    }
    const { data, error } = await supabase.rpc('censo_equipe_salvar', { p_token: token, p_pessoa: envio })
    setSalvando(null)
    if (error) {
      setAviso(a => ({ ...a, [k]: ['erro', /link_invalido/.test(error.message) ? 'O link venceu ou foi cancelado. Peça um link novo.' : 'Não salvou: ' + error.message] }))
      return false
    }
    setPessoas(ps => ps.map(x => chave(x) !== k ? x : {
      ...x, ...extra, link_em: data?.link_em,
      cpf: '', rg_numero: '',
      cpf_mask: f.cpf ? mascaraCpf(f.cpf) : x.cpf_mask, rg_mask: f.rg_numero ? mascaraDoc(f.rg_numero) : x.rg_mask,
    }))
    setAviso(a => ({ ...a, [k]: ['ok', 'Salvo!'] }))
    return true
  }

  async function remover(p) {
    if (!window.confirm(`Remover ${p.nome || 'esta pessoa'} da lista?`)) return
    const { error } = await supabase.rpc('censo_equipe_remover', { p_token: token, p_mid: p.mid })
    if (!error) setPessoas(ps => ps.filter(x => chave(x) !== chave(p)))
  }

  function incluirPessoa() {
    const p = { mid: novoMid(), nome: '', incluir: true, rg_uf: 'RJ', cpf: '', rg_numero: '' }
    setPessoas(ps => [...ps, p]); setAberta('m' + p.mid)
  }

  // ---------------------------------------------------------------- estilos
  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DED6', borderRadius: 10, padding: isMobile ? '12px' : '12px 14px', marginBottom: 8 },
    input: { width: '100%', padding: '9px 10px', fontSize: 16, borderRadius: 8, border: '0.5px solid #D3D1C7', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' },
    label: { fontSize: 12, color: '#888780', marginBottom: 4, display: 'block' },
    btn: (bg, cor = '#fff') => ({ padding: '10px 16px', fontSize: 14, borderRadius: 9, border: 'none', background: bg, color: cor, cursor: 'pointer', fontWeight: 600 }),
    btnTxt: { padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '0.5px solid #D3D1C7', background: '#fff', color: CINZA, cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 },
    chip: (bg, cor) => ({ fontSize: 11.5, fontWeight: 600, color: cor, background: bg, borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap' }),
  }

  const ativas = pessoas.filter(p => p.incluir)
  const completas = ativas.filter(p => !faltando(p).length).length

  function Ficha(p) {
    const k = chave(p)
    const sel = (c, lista, ph = '—') => (
      <select style={s.input} value={p[c] || ''} onChange={e => up(k, c, e.target.value)}>
        <option value="">{ph}</option>{lista.map(([cod, t]) => <option key={cod} value={cod}>{t}</option>)}
      </select>
    )
    const txt = (c, extra = {}) => <input style={s.input} value={p[c] || ''} onChange={e => up(k, c, e.target.value)} {...extra} />
    return (
      <div style={{ marginTop: 12, borderTop: '0.5px solid #EFEDE6', paddingTop: 12 }}>
        <div style={s.grid}>
          {!p.equipe_id && <Campo rot="Nome completo" inteiro>{txt('nome', { placeholder: 'Nome completo' })}</Campo>}
          <Campo rot="Data de nascimento">{txt('nascimento', { type: 'date' })}</Campo>
          <Campo rot="Sexo">
            <div style={{ display: 'flex', gap: 8 }}>
              {[['F', 'Feminino'], ['M', 'Masculino']].map(([v, t]) => (
                <button key={v} type="button" onClick={() => up(k, 'sexo', p.sexo === v ? '' : v)}
                  style={{ ...s.btnTxt, flex: 1, borderColor: p.sexo === v ? AZUL : '#D3D1C7', background: p.sexo === v ? AZUL : '#fff', color: p.sexo === v ? '#fff' : CINZA }}>{t}</button>
              ))}
            </div>
          </Campo>
          <Campo rot="CPF" ajuda={p.cpf_mask ? `Já cadastrado: ${p.cpf_mask}. Só preencha se estiver errado.` : null}>
            {txt('cpf', { placeholder: p.cpf_mask ? 'Preencher só se for corrigir' : '000.000.000-00', inputMode: 'numeric' })}
          </Campo>
          <Campo rot="RG — número" ajuda={p.rg_mask ? `Já cadastrado: ${p.rg_mask}. Só preencha se estiver errado.` : null}>
            {txt('rg_numero', { placeholder: p.rg_mask ? 'Preencher só se for corrigir' : '' })}
          </Campo>
          <Campo rot="RG — órgão emissor / UF">
            <div style={{ display: 'flex', gap: 8 }}>
              {txt('rg_orgao', { placeholder: 'Ex.: DETRAN' })}
              <select style={{ ...s.input, width: 84 }} value={p.rg_uf || ''} onChange={e => up(k, 'rg_uf', e.target.value)}><option value="">UF</option>{UFS.map(u => <option key={u}>{u}</option>)}</select>
            </div>
          </Campo>
          <Campo rot="E-mail (opcional)">{txt('email', { type: 'email' })}</Campo>
          <Campo rot="Escolaridade">{sel('escolaridade', ESCOLARIDADE)}</Campo>
          <Campo rot="Formação / profissão">{sel('profissao', PROFISSAO)}</Campo>
          <Campo rot="Tipo de vínculo" ajuda="Funcionário com carteira assinada da TEIAA = Empregado Celetista do setor privado – CLT">{sel('vinculo', VINCULO)}</Campo>
          <Campo rot="Função na unidade">{sel('funcao', FUNCAO)}</Campo>
          <Campo rot="Carga horária por semana">{sel('carga', CARGA)}</Campo>
          <Campo rot="Começou nesta função em">{txt('inicio', { type: 'date' })}</Campo>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          <button type="button" style={s.btn(AZUL)} disabled={salvando === k || (!p.equipe_id && !p.nome)}
            onClick={async () => { if (await salvar(p)) setAberta(null) }}>
            {salvando === k ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" style={s.btnTxt} onClick={() => setAberta(null)}>Fechar</button>
          {!p.equipe_id && p.link_em && <button type="button" style={{ ...s.btnTxt, color: VERMELHO }} onClick={() => remover(p)}>Remover pessoa</button>}
          {!p.equipe_id && !p.link_em && <button type="button" style={{ ...s.btnTxt, color: VERMELHO }} onClick={() => setPessoas(ps => ps.filter(x => chave(x) !== k))}>Desistir</button>}
        </div>
      </div>
    )
  }

  return (
    <MobileCtx.Provider value={isMobile}>
    <div>
        <div style={{ ...s.card, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: ESCURO, fontWeight: 600 }}>
            <span>{completas} de {ativas.length} pessoa(s) completa(s)</span>
            {completas === ativas.length && ativas.length > 0 && <span style={{ color: VERDE }}><i className="ti ti-circle-check" /> Tudo pronto!</span>}
          </div>
          <div style={{ height: 6, background: '#EFEDE6', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ativas.length ? Math.round(100 * completas / ativas.length) : 0}%`, background: '#6BBF2B', transition: 'width .3s' }} />
          </div>
        </div>

        {pessoas.map(p => {
          const k = chave(p)
          const falta = faltando(p)
          const av = aviso[k]
          return (
            <div key={k} style={{ ...s.card, opacity: p.incluir ? 1 : 0.65 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', cursor: p.incluir ? 'pointer' : 'default' }}
                onClick={() => p.incluir && setAberta(aberta === k ? null : k)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: ESCURO }}>{p.nome || 'Nova pessoa'}</div>
                  {p.funcao_equipe && <div style={{ fontSize: 12, color: '#888780' }}>{p.funcao_equipe}</div>}
                </div>
                {!p.incluir
                  ? <span style={s.chip('#F1EFE8', CINZA)}>não trabalha no serviço</span>
                  : falta.length
                    ? <span style={s.chip('#FAEEDA', LARANJA)}>falta {falta.length}</span>
                    : <span style={s.chip('#EAF3DE', VERDE)}><i className="ti ti-check" /> completo</span>}
              </div>
              {p.incluir && falta.length > 0 && aberta !== k && <div style={{ fontSize: 12, color: LARANJA, marginTop: 6 }}>Falta: {falta.join(', ')}</div>}
              {av && aberta !== k && <div style={{ fontSize: 12, marginTop: 6, color: av[0] === 'ok' ? VERDE : VERMELHO }}>{av[1]}</div>}
              {aberta === k && Ficha(p)}
              {aberta === k && av?.[0] === 'erro' && <div style={{ fontSize: 12.5, marginTop: 8, color: VERMELHO }}>{av[1]}</div>}
              {p.equipe_id && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: CINZA, marginTop: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!p.incluir} disabled={salvando === k}
                    onChange={e => salvar(p, { incluir: !e.target.checked })} />
                  Esta pessoa não trabalha no serviço (fica fora do Censo)
                </label>
              )}
            </div>
          )
        })}

        <button type="button" style={{ ...s.btnTxt, marginTop: 4 }} onClick={incluirPessoa}><i className="ti ti-plus" /> Incluir pessoa que não está na lista</button>
    </div>
    </MobileCtx.Provider>
  )
}
