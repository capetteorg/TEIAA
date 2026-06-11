// =============================================
// UTILITÁRIOS DE INTERFACE — AGENDO Integra
// Modal de confirmação elegante (substitui confirm() nativo)
// =============================================

export function confirmar(mensagem, opcoes = {}) {
  const {
    titulo = 'Confirmar ação',
    confirmarLabel = 'Confirmar',
    cancelarLabel = 'Cancelar',
    perigo = true,
  } = opcoes

  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,31,28,0.4);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(2px)'

    const box = document.createElement('div')
    box.style.cssText = 'background:rgba(255,255,255,0.98);border:0.5px solid #E8E6DE;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,0.18);padding:1.5rem;max-width:420px;width:100%;font-family:inherit'

    const h = document.createElement('div')
    h.textContent = titulo
    h.style.cssText = 'font-size:14px;font-weight:600;color:#1A1F1C;margin-bottom:8px'

    const p = document.createElement('div')
    p.textContent = mensagem
    p.style.cssText = 'font-size:12.5px;color:#5F5E5A;line-height:1.7;margin-bottom:1.25rem;white-space:pre-line'

    const btns = document.createElement('div')
    btns.style.cssText = 'display:flex;gap:8px;justify-content:flex-end'

    const btnCancelar = document.createElement('button')
    btnCancelar.textContent = cancelarLabel
    btnCancelar.style.cssText = 'padding:7px 16px;font-size:12px;border-radius:8px;border:0.5px solid #D3D1C7;background:transparent;color:#5F5E5A;cursor:pointer;font-family:inherit'

    const btnConfirmar = document.createElement('button')
    btnConfirmar.textContent = confirmarLabel
    btnConfirmar.style.cssText = `padding:7px 16px;font-size:12px;font-weight:600;border-radius:8px;border:none;background:${perigo ? '#E63214' : '#96C11F'};color:#fff;cursor:pointer;font-family:inherit`

    function fechar(resultado) {
      document.removeEventListener('keydown', onKey)
      overlay.remove()
      resolve(resultado)
    }
    function onKey(e) {
      if (e.key === 'Escape') fechar(false)
      if (e.key === 'Enter') fechar(true)
    }

    btnCancelar.onclick = () => fechar(false)
    btnConfirmar.onclick = () => fechar(true)
    overlay.onclick = e => { if (e.target === overlay) fechar(false) }
    document.addEventListener('keydown', onKey)

    btns.append(btnCancelar, btnConfirmar)
    box.append(h, p, btns)
    overlay.append(box)
    document.body.append(overlay)
    btnConfirmar.focus()
  })
}


// =============================================
// EXPORTAÇÃO CSV (compatível com Excel pt-BR: separador ; e BOM)
// =============================================
export function exportarCSV(nomeArquivo, linhas, colunas) {
  if (!linhas || linhas.length === 0) return
  const cols = colunas || Object.keys(linhas[0])
  const esc = v => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = cols.map(c => esc(c.label || c)).join(';')
  const rows = linhas.map(l => cols.map(c => esc(typeof c === 'object' ? c.get(l) : l[c])).join(';'))
  const csv = '\uFEFF' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : nomeArquivo + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}
