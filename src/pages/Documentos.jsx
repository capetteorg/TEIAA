import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A'

const CATEGORIAS = [
  'Documentos institucionais',
  'Relatórios anuais',
  'Prestações de contas',
  'Planos de trabalho',
  'Balanços financeiros',
  'Certidões e registros',
  'Outros documentos',
]

export default function Documentos() {
  const { user } = useAuth()
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ titulo: '', descricao: '', categoria: CATEGORIAS[0], publico: true })
  const [arquivo, setArquivo] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .order('criado_em', { ascending: false })
    setDocumentos(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!arquivo) { setMsg('Selecione um arquivo.'); return }
    if (!form.titulo.trim()) { setMsg('Informe o título.'); return }

    setUploading(true)
    try {
      // Upload para o Supabase Storage
      const ext = arquivo.name.split('.').pop()
      const nomeArq = `${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(nomeArq, arquivo, { contentType: arquivo.type, upsert: false })

      if (uploadError) throw uploadError

      // URL pública
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(nomeArq)

      // Salva no banco
      const { error: dbError } = await supabase.from('documentos').insert({
        titulo: form.titulo,
        descricao: form.descricao || null,
        categoria: form.categoria,
        arquivo_url: urlData.publicUrl,
        arquivo_nome: arquivo.name,
        tamanho_kb: Math.round(arquivo.size / 1024),
        publico: form.publico,
        criado_por: user.id,
      })

      if (dbError) throw dbError

      setMsg('Documento publicado com sucesso!')
      setForm({ titulo: '', descricao: '', categoria: CATEGORIAS[0], publico: true })
      setArquivo(null)
      setMostrarForm(false)
      carregar()
    } catch (err) {
      setMsg('Erro: ' + err.message)
    }
    setUploading(false)
    setTimeout(() => setMsg(''), 5000)
  }

  async function excluir(doc) {
    if (!confirm(`Excluir "${doc.titulo}"?`)) return
    // Remove do storage
    const nomeArq = doc.arquivo_url.split('/').pop()
    await supabase.storage.from('documentos').remove([nomeArq])
    // Remove do banco
    await supabase.from('documentos').delete().eq('id', doc.id)
    carregar()
  }

  async function alternarPublico(doc) {
    await supabase.from('documentos').update({ publico: !doc.publico }).eq('id', doc.id)
    carregar()
  }

  const fmt = n => n >= 1024 ? (n/1024).toFixed(1) + ' MB' : n + ' KB'

  const s = {
    card: { background: 'rgba(255,255,255,0.92)', border: '0.5px solid #E8E6DE', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: 10 },
    label: { fontSize: 12, color: '#5F5E5A', display: 'block', marginBottom: 3 },
    input: { width: '100%', fontSize: 13, padding: '7px 9px', border: '0.5px solid #D3D1C7', borderRadius: 8, boxSizing: 'border-box' },
    th: { textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' },
    td: { padding: '8px 10px', borderBottom: '0.5px solid #E0DDD5', fontSize: 12, verticalAlign: 'middle' },
    badge: (bg, cor) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: bg, color: cor }),
    btn: (bg, cor='#fff') => ({ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: bg, color: cor, cursor: 'pointer' }),
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>Documentos Institucionais</div>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          style={{ ...s.btn(mostrarForm ? '#F1EFE8' : VERDE), fontWeight: 500 }}>
          {mostrarForm ? 'Cancelar' : '+ Publicar documento'}
        </button>
      </div>

      <div style={{ background: '#E6F1FB', border: '0.5px solid #B3D1F0', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1.25rem', fontSize: 12, color: '#185FA5' }}>
        <strong>ℹ Os documentos marcados como públicos aparecerão na página de Transparência Pública.</strong> PDFs, balanços, relatórios e certidões podem ser publicados aqui.
      </div>

      {msg && (
        <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: '1rem', background: !msg.includes('Erro') ? '#F2FAE8' : '#FEF2F2', color: !msg.includes('Erro') ? '#3B6D11' : '#A32D2D' }}>
          {msg}
        </div>
      )}

      {/* Formulário de upload */}
      {mostrarForm && (
        <div style={{ ...s.card, borderColor: '#C0DD97' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Publicar novo documento</div>
          <form onSubmit={handleUpload}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={s.label}>Título do documento *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({...f, titulo: e.target.value}))}
                  placeholder="Ex: Relatório Anual 2025" style={s.input} required />
              </div>
              <div>
                <label style={s.label}>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({...f, categoria: e.target.value}))} style={s.input}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Descrição (opcional)</label>
              <input value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))}
                placeholder="Breve descrição do documento" style={s.input} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Arquivo (PDF, DOCX, XLSX, imagem) *</label>
                <input type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={e => setArquivo(e.target.files[0])}
                  style={{ ...s.input, padding: '5px 9px' }} required />
                {arquivo && (
                  <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>
                    {arquivo.name} · {fmt(Math.round(arquivo.size/1024))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.publico}
                    onChange={e => setForm(f => ({...f, publico: e.target.checked}))} />
                  <span>Visível na transparência pública</span>
                </label>
              </div>
            </div>
            <button type="submit" disabled={uploading}
              style={{ ...s.btn(uploading ? '#D3D1C7' : VERDE), fontWeight: 500 }}>
              {uploading ? 'Publicando...' : '⬆ Publicar documento'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de documentos */}
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '.85rem' }}>
          Documentos publicados ({documentos.length})
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#888780', fontSize: 12 }}>Carregando...</div>
        ) : documentos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#888780', fontSize: 12 }}>
            Nenhum documento publicado ainda. Clique em "Publicar documento" para começar.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              {['Título','Categoria','Arquivo','Tamanho','Visibilidade','Publicado em',''].map(h =>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {documentos.map(doc => (
                <tr key={doc.id}>
                  <td style={{ ...s.td, fontWeight: 500 }}>
                    <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#4A8FD4', textDecoration: 'none' }}>
                      <i className="ti ti-file" style={{marginRight:4}} /> {doc.titulo}
                    </a>
                  </td>
                  <td style={s.td}><span style={s.badge('#E6F1FB','#185FA5')}>{doc.categoria}</span></td>
                  <td style={{ ...s.td, fontSize: 11, color: '#888780' }}>{doc.arquivo_nome}</td>
                  <td style={{ ...s.td, color: '#888780' }}>{doc.tamanho_kb ? fmt(doc.tamanho_kb) : '—'}</td>
                  <td style={s.td}>
                    <button onClick={() => alternarPublico(doc)}
                      style={{ ...s.badge(doc.publico ? '#EAF3DE' : '#F1EFE8', doc.publico ? '#3B6D11' : '#5F5E5A'), border: 'none', cursor: 'pointer' }}>
                      {doc.publico ? 'Público' : 'Privado'}
                    </button>
                  </td>
                  <td style={{ ...s.td, color: '#888780', fontSize: 11 }}>
                    {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={s.td}>
                    <button onClick={() => excluir(doc)} style={s.btn('#FEF2F2', VERMELHO)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
