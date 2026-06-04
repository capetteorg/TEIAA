import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4'

const CARGOS = ['Presidente', 'Vice-presidente', 'Tesoureiro', 'Secretário', 'Conselho Fiscal', 'Outro cargo']

const FORM_INST_VAZIO = {
  nome_completo: '', nome_fantasia: '', cnpj: '', endereco: '', cep: '',
  telefone: '', email: '', site: '', ano_fundacao: '',
  inscricao_municipal: '', inscricao_estadual: 'Isento',
  conselho_muni_assist: '', cmdca: '', cebas: '', utilidade_publica: '',
}

const FORM_DIR_VAZIO = {
  nome: '', cargo: 'Presidente', cpf: '', rg: '',
  email: '', telefone: '', mandato_inicio: '', mandato_fim: '',
  observacoes: '',
}

export default function Instituicao() {
  const { user } = useAuth()
  const [aba, setAba] = useState('instituicao')
  const [inst, setInst] = useState(null)
  const [formInst, setFormInst] = useState(FORM_INST_VAZIO)
  const [diretoria, setDiretoria] = useState([])
  const [formDir, setFormDir] = useState(FORM_DIR_VAZIO)
  const [ata, setAta] = useState(null)
  const [editandoDir, setEditandoDir] = useState(null)
  const [mostrarFormDir, setMostrarFormDir] = useState(false)
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: instData } = await supabase.from('instituicao').select('*').limit(1).single()
    if (instData) { setInst(instData); setFormInst(instData) }

    const { data: dirData } = await supabase
      .from('diretoria').select('*').order('mandato_inicio', { ascending: false })
    setDiretoria(dirData || [])
    setLoading(false)
  }

  async function salvarInstituicao(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = { ...formInst, atualizado_em: new Date().toISOString() }
    let error
    if (inst?.id) {
      ({ error } = await supabase.from('instituicao').update(dados).eq('id', inst.id))
    } else {
      ({ error } = await supabase.from('instituicao').insert(dados))
    }
    if (error) { setMsg('Erro: ' + error.message) }
    else { setMsg('✅ Dados institucionais salvos!'); carregar() }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function salvarDiretor(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      let ataUrl = formDir.ata_url || null
      let ataNome = formDir.ata_nome || null

      // Upload da ata se selecionada
      if (ata) {
        const nomeArq = `atas/${Date.now()}-${ata.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error: upErr } = await supabase.storage.from('documentos').upload(nomeArq, ata, { upsert: false })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(nomeArq)
        ataUrl = urlData.publicUrl
        ataNome = ata.name
      }

      const dados = {
        ...formDir,
        ata_url: ataUrl,
        ata_nome: ataNome,
        mandato_inicio: formDir.mandato_inicio || null,
        mandato_fim: formDir.mandato_fim || null,
        ativo: true,
      }

      let error
      if (editandoDir) {
        ;({ error } = await supabase.from('diretoria').update(dados).eq('id', editandoDir))
      } else {
        ;({ error } = await supabase.from('diretoria').insert(dados))
      }
      if (error) throw error

      setMsg('✅ Membro da diretoria salvo!')
      setFormDir(FORM_DIR_VAZIO)
      setAta(null)
      setEditandoDir(null)
      setMostrarFormDir(false)
      carregar()
    } catch (err) {
      setMsg('Erro: ' + err.message)
    }
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function encerrarMandato(id) {
    await supabase.from('diretoria').update({ ativo: false }).eq('id', id)
    carregar()
  }

  function editarDiretor(d) {
    setFormDir({
      nome: d.nome, cargo: d.cargo, cpf: d.cpf||'', rg: d.rg||'',
      email: d.email||'', telefone: d.telefone||'',
      mandato_inicio: d.mandato_inicio||'', mandato_fim: d.mandato_fim||'',
      observacoes: d.observacoes||'', ata_url: d.ata_url||'', ata_nome: d.ata_nome||'',
    })
    setEditandoDir(d.id)
    setMostrarFormDir(true)
    setAba('diretoria')
  }

  // Presidente atual: cargo Presidente, ativo e mandato_fim >= hoje
  const hoje = new Date().toISOString().slice(0,10)
  const presidenteAtual = diretoria.find(d =>
    d.cargo === 'Presidente' && d.ativo &&
    (!d.mandato_fim || d.mandato_fim >= hoje)
  )

  const diretoríaAtiva = diretoria.filter(d => d.ativo && (!d.mandato_fim || d.mandato_fim >= hoje))
  const historicoEncerrado = diretoria.filter(d => !d.ativo || (d.mandato_fim && d.mandato_fim < hoje))

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const s = {
    card: { background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    input: { width: '100%', fontSize: 12, padding: '7px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8, boxSizing: 'border-box' },
    grupo: { display: 'grid', gap: 10, marginBottom: 10 },
    tab: ativo => ({
      padding: '7px 16px', fontSize: 12, borderRadius: 8,
      border: '0.5px solid ' + (ativo ? VERDE : '#D3D1C7'),
      background: ativo ? VERDE : '#fff',
      color: ativo ? '#fff' : '#5F5E5A',
      cursor: 'pointer',
    }),
    th: { textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' },
    td: { padding: '7px 10px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12, verticalAlign: 'middle' },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    btn: (bg, cor='#fff') => ({ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer', whiteSpace: 'nowrap' }),
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Cadastro da Instituição</div>

      {/* Presidente atual em destaque */}
      {presidenteAtual && (
        <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 20 }}>👤</div>
          <div>
            <div style={{ fontSize: 11, color: '#3B6D11', marginBottom: 2 }}>Presidente atual — mandato vigente</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{presidenteAtual.nome}</div>
            <div style={{ fontSize: 11, color: '#5F5E5A' }}>
              CPF: {presidenteAtual.cpf || '—'} · RG: {presidenteAtual.rg || '—'} ·
              Mandato: {fmtData(presidenteAtual.mandato_inicio)} a {fmtData(presidenteAtual.mandato_fim)}
            </div>
          </div>
          {presidenteAtual.ata_url && (
            <a href={presidenteAtual.ata_url} target="_blank" rel="noopener noreferrer"
              style={{ ...s.badge('#fff', AZUL), border: `0.5px solid ${AZUL}`, textDecoration: 'none', marginLeft: 'auto' }}>
              📄 Ata de eleição
            </a>
          )}
        </div>
      )}

      {msg && (
        <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: '1rem', background: msg.includes('✅') ? '#F2FAE8' : '#FEF2F2', color: msg.includes('✅') ? '#3B6D11' : '#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
        <button onClick={() => setAba('instituicao')} style={s.tab(aba==='instituicao')}>Dados da Instituição</button>
        <button onClick={() => setAba('diretoria')} style={s.tab(aba==='diretoria')}>
          Diretoria {diretoríaAtiva.length > 0 ? `(${diretoríaAtiva.length} ativos)` : ''}
        </button>
        <button onClick={() => setAba('historico')} style={s.tab(aba==='historico')}>
          Histórico {historicoEncerrado.length > 0 ? `(${historicoEncerrado.length})` : ''}
        </button>
      </div>

      {/* ABA: Dados da Instituição */}
      {aba === 'instituicao' && (
        <form onSubmit={salvarInstituicao}>
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Identificação</div>
            <div style={{ ...s.grupo, gridTemplateColumns: '2fr 1fr' }}>
              <div>
                <label style={s.label}>Nome completo da instituição *</label>
                <input value={formInst.nome_completo} onChange={e=>setFormInst(f=>({...f,nome_completo:e.target.value}))} style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Nome fantasia</label>
                <input value={formInst.nome_fantasia} onChange={e=>setFormInst(f=>({...f,nome_fantasia:e.target.value}))} style={s.input} />
              </div>
            </div>
            <div style={{ ...s.grupo, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <label style={s.label}>CNPJ</label>
                <input value={formInst.cnpj} onChange={e=>setFormInst(f=>({...f,cnpj:e.target.value}))} placeholder="00.000.000/0001-00" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Ano de fundação</label>
                <input value={formInst.ano_fundacao} onChange={e=>setFormInst(f=>({...f,ano_fundacao:e.target.value}))} placeholder="Ex: 1974" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Inscrição Estadual</label>
                <input value={formInst.inscricao_estadual} onChange={e=>setFormInst(f=>({...f,inscricao_estadual:e.target.value}))} placeholder="Isento" style={s.input} />
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Contato e endereço</div>
            <div style={{ ...s.grupo, gridTemplateColumns: '3fr 1fr' }}>
              <div>
                <label style={s.label}>Endereço completo</label>
                <input value={formInst.endereco} onChange={e=>setFormInst(f=>({...f,endereco:e.target.value}))} placeholder="Rua, número, bairro, cidade — UF" style={s.input} />
              </div>
              <div>
                <label style={s.label}>CEP</label>
                <input value={formInst.cep} onChange={e=>setFormInst(f=>({...f,cep:e.target.value}))} placeholder="00000-000" style={s.input} />
              </div>
            </div>
            <div style={{ ...s.grupo, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <label style={s.label}>Telefone</label>
                <input value={formInst.telefone} onChange={e=>setFormInst(f=>({...f,telefone:e.target.value}))} placeholder="(21) 0000-0000" style={s.input} />
              </div>
              <div>
                <label style={s.label}>E-mail</label>
                <input value={formInst.email} onChange={e=>setFormInst(f=>({...f,email:e.target.value}))} placeholder="contato@capette.org" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Site</label>
                <input value={formInst.site} onChange={e=>setFormInst(f=>({...f,site:e.target.value}))} placeholder="www.capette.org.br" style={s.input} />
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Registros e certificações</div>
            <div style={{ ...s.grupo, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={s.label}>Inscrição Municipal</label>
                <input value={formInst.inscricao_municipal} onChange={e=>setFormInst(f=>({...f,inscricao_municipal:e.target.value}))} placeholder="Nº da inscrição" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Conselho Municipal de Assistência Social</label>
                <input value={formInst.conselho_muni_assist} onChange={e=>setFormInst(f=>({...f,conselho_muni_assist:e.target.value}))} placeholder="Nº e data" style={s.input} />
              </div>
              <div>
                <label style={s.label}>CMDCA</label>
                <input value={formInst.cmdca} onChange={e=>setFormInst(f=>({...f,cmdca:e.target.value}))} placeholder="Nº e data, se houver" style={s.input} />
              </div>
              <div>
                <label style={s.label}>CEBAS</label>
                <input value={formInst.cebas} onChange={e=>setFormInst(f=>({...f,cebas:e.target.value}))} placeholder="Nº e validade, se houver" style={s.input} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Utilidade pública</label>
                <input value={formInst.utilidade_publica} onChange={e=>setFormInst(f=>({...f,utilidade_publica:e.target.value}))} placeholder="Lei municipal/estadual/federal, se houver" style={s.input} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={salvando} style={{ ...s.btn(salvando ? '#D3D1C7' : VERDE), fontWeight: 500, padding: '8px 20px' }}>
            {salvando ? 'Salvando...' : '💾 Salvar dados institucionais'}
          </button>
        </form>
      )}

      {/* ABA: Diretoria */}
      {aba === 'diretoria' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={() => { setMostrarFormDir(!mostrarFormDir); setEditandoDir(null); setFormDir(FORM_DIR_VAZIO) }}
              style={s.btn(mostrarFormDir ? '#F1EFE8' : VERDE)}>
              {mostrarFormDir ? 'Cancelar' : '+ Adicionar membro'}
            </button>
          </div>

          {/* Formulário de diretoria */}
          {mostrarFormDir && (
            <div style={{ ...s.card, borderColor: '#C0DD97', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>
                {editandoDir ? 'Editar membro' : 'Adicionar membro da diretoria'}
              </div>
              <form onSubmit={salvarDiretor}>
                <div style={{ ...s.grupo, gridTemplateColumns: '2fr 1fr' }}>
                  <div>
                    <label style={s.label}>Nome completo *</label>
                    <input value={formDir.nome} onChange={e=>setFormDir(f=>({...f,nome:e.target.value}))} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Cargo *</label>
                    <select value={formDir.cargo} onChange={e=>setFormDir(f=>({...f,cargo:e.target.value}))} style={s.input}>
                      {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ ...s.grupo, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                  <div>
                    <label style={s.label}>CPF</label>
                    <input value={formDir.cpf} onChange={e=>setFormDir(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>RG</label>
                    <input value={formDir.rg} onChange={e=>setFormDir(f=>({...f,rg:e.target.value}))} placeholder="0000000-0" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>E-mail</label>
                    <input value={formDir.email} onChange={e=>setFormDir(f=>({...f,email:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Telefone</label>
                    <input value={formDir.telefone} onChange={e=>setFormDir(f=>({...f,telefone:e.target.value}))} style={s.input} />
                  </div>
                </div>
                <div style={{ ...s.grupo, gridTemplateColumns: '1fr 1fr 2fr' }}>
                  <div>
                    <label style={s.label}>Início do mandato</label>
                    <input type="date" value={formDir.mandato_inicio} onChange={e=>setFormDir(f=>({...f,mandato_inicio:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Fim do mandato</label>
                    <input type="date" value={formDir.mandato_fim} onChange={e=>setFormDir(f=>({...f,mandato_fim:e.target.value}))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Ata de eleição (PDF)</label>
                    <input type="file" accept=".pdf" onChange={e=>setAta(e.target.files[0])}
                      style={{ ...s.input, padding: '5px 9px' }} />
                    {formDir.ata_nome && !ata && (
                      <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
                        Atual: <a href={formDir.ata_url} target="_blank" rel="noopener noreferrer" style={{ color: AZUL }}>{formDir.ata_nome}</a>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={s.label}>Observações</label>
                  <input value={formDir.observacoes} onChange={e=>setFormDir(f=>({...f,observacoes:e.target.value}))} style={s.input} placeholder="Observações sobre o mandato" />
                </div>
                <button type="submit" disabled={salvando} style={{ ...s.btn(salvando ? '#D3D1C7' : VERDE), fontWeight: 500 }}>
                  {salvando ? 'Salvando...' : editandoDir ? '💾 Salvar alterações' : '+ Adicionar'}
                </button>
              </form>
            </div>
          )}

          {/* Lista diretoria ativa */}
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>Diretoria atual</div>
            {diretoríaAtiva.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#888780', fontSize: 12 }}>
                Nenhum membro cadastrado. Clique em "Adicionar membro" para começar.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>
                  {['Cargo','Nome','CPF','RG','Mandato','Ata',''].map(h=><th key={h} style={s.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {diretoríaAtiva
                    .sort((a,b) => CARGOS.indexOf(a.cargo) - CARGOS.indexOf(b.cargo))
                    .map(d => (
                    <tr key={d.id} style={{ background: d.cargo === 'Presidente' ? '#F2FAE8' : '#fff' }}>
                      <td style={s.td}>
                        <span style={s.badge(d.cargo==='Presidente'?'#EAF3DE':d.cargo==='Tesoureiro'?'#FAEEDA':'#E6F1FB', d.cargo==='Presidente'?'#3B6D11':d.cargo==='Tesoureiro'?'#854F0B':'#185FA5')}>
                          {d.cargo}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontWeight: 500 }}>{d.nome}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>{d.cpf || '—'}</td>
                      <td style={{ ...s.td, fontSize: 11 }}>{d.rg || '—'}</td>
                      <td style={{ ...s.td, fontSize: 11, whiteSpace: 'nowrap' }}>
                        {fmtData(d.mandato_inicio)} a {fmtData(d.mandato_fim)}
                      </td>
                      <td style={s.td}>
                        {d.ata_url
                          ? <a href={d.ata_url} target="_blank" rel="noopener noreferrer" style={{ color: AZUL, fontSize: 11 }}>📄 Ver ata</a>
                          : <span style={{ color: '#B4B2A9', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => editarDiretor(d)} style={s.btn(AZUL)}>Editar</button>
                          <button onClick={() => encerrarMandato(d.id)} style={s.btn('#F1EFE8','#5F5E5A')}>Encerrar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ABA: Histórico */}
      {aba === 'historico' && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Histórico de mandatos encerrados</div>
          <div style={{ fontSize: 12, color: '#888780', marginBottom: '.85rem' }}>
            Registros preservados para fins de auditoria e prestação de contas.
          </div>
          {historicoEncerrado.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#888780', fontSize: 12 }}>Nenhum mandato encerrado ainda.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                {['Cargo','Nome','CPF','Período','Ata'].map(h=><th key={h} style={s.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {historicoEncerrado.map(d => (
                  <tr key={d.id} style={{ background: '#FAFAF8' }}>
                    <td style={s.td}><span style={s.badge('#F1EFE8','#888780')}>{d.cargo}</span></td>
                    <td style={{ ...s.td, color: '#5F5E5A' }}>{d.nome}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: '#888780' }}>{d.cpf || '—'}</td>
                    <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{fmtData(d.mandato_inicio)} a {fmtData(d.mandato_fim)}</td>
                    <td style={s.td}>
                      {d.ata_url
                        ? <a href={d.ata_url} target="_blank" rel="noopener noreferrer" style={{ color: AZUL, fontSize: 11 }}>📄 Ver</a>
                        : <span style={{ color: '#B4B2A9', fontSize: 11 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
