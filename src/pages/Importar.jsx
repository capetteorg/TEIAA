import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import { parsearExtratoSicredi } from '../lib/db'

export default function Importar() {
  const [step, setStep] = useState(1)
  const [extrato, setExtrato] = useState(null)
  const [loading, setLoading] = useState(false)

  function lerArquivo(e) {
    const file = e.target.files[0]; if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target.result)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })
        const resultado = parsearExtratoSicredi(rows)
        setExtrato(resultado)
        setStep(2)
      } catch(err) { alert('Erro ao ler o arquivo. Verifique se é o extrato XLS do Sicredi.') }
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const verde = '#6BBF2B', vermelho = '#E8212A'

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1.25rem' }}>Importar extrato</div>

      {step === 1 && (
        <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ background: '#F8F7F2', borderLeft: '3px solid #4A8FD4', borderRadius: '0 8px 8px 0', padding: '.55rem .9rem', fontSize: 12, color: '#5F5E5A', marginBottom: '1rem' }}>
            <strong>Formato suportado: Sicredi · XLS</strong> — exporte normalmente pelo internet banking e selecione abaixo.
          </div>
          <label style={{ display: 'block', border: '1.5px dashed #D3D1C7', borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer', color: '#888780', fontSize: 13 }}>
            <i className="ti ti-file-spreadsheet" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: verde }} />
            <div style={{ fontWeight: 500, marginBottom: 4, color: '#2C2C2A' }}>Clique para selecionar o XLS do Sicredi</div>
            <div style={{ fontSize: 11 }}>.xls · .xlsx</div>
            <input type="file" accept=".xls,.xlsx" onChange={lerArquivo} style={{ display: 'none' }} />
          </label>
          {loading && <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#888780' }}>Lendo arquivo...</div>}
        </div>
      )}

      {step === 2 && extrato && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
            {[
              { label: 'Associado', val: extrato.associado, cor: '#4A8FD4' },
              { label: 'Conta', val: 'Sicredi · ' + extrato.conta, cor: '#8B2FC9' },
              { label: 'Entradas', val: extrato.movs.filter(m=>m.tipo==='entrada').length + ' mov.', cor: verde },
              { label: 'Saídas',   val: extrato.movs.filter(m=>m.tipo==='saida').length + ' mov.',   cor: vermelho },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '.85rem 1rem', border: '0.5px solid #E0DDD5' }}>
                <div style={{ height: 3, borderRadius: 99, background: m.cor, marginBottom: '.7rem' }} />
                <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m.val}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #E0DDD5', borderRadius: 12, padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Movimentações identificadas ({extrato.movs.length})</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setStep(1); setExtrato(null) }} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, border: '0.5px solid #D3D1C7', background: 'transparent', cursor: 'pointer' }}>Voltar</button>
                <button onClick={() => setStep(3)} style={{ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: verde, color: '#fff', cursor: 'pointer' }}>Processar conciliação →</button>
              </div>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                  <tr>{['Data','Descrição','Doc','Tipo','Classificação automática','Valor'].map(h=>(
                    <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontSize: 11, color: '#888780', borderBottom: '0.5px solid #E0DDD5' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {extrato.movs.map((m, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #E0DDD5' }}>{m.data}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #E0DDD5', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.desc}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #E0DDD5' }}><span style={{ fontSize: 10, background: '#F1EFE8', color: '#5F5E5A', padding: '1px 6px', borderRadius: 4 }}>{m.doc}</span></td>
                      <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #E0DDD5' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500, background: m.tipo==='entrada'?'#EAF3DE':'#FCEBEB', color: m.tipo==='entrada'?'#3B6D11':'#A32D2D' }}>{m.tipo==='entrada'?'Entrada':'Saída'}</span></td>
                      <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #E0DDD5', fontSize: 11 }}>{m.classif}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #E0DDD5', fontWeight: 500, color: m.tipo==='entrada'?verde:vermelho }}>
                        {m.tipo==='entrada'?'+':'-'}R$ {m.valorAbs.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 3 && extrato && (
        <div>
          <div style={{ background: '#F2FAE8', border: '0.5px solid #C0DD97', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>✓ Conciliação processada — acesse a página de Conciliação para ver o resultado completo e resolver itens pendentes.</div>
          </div>
          <button onClick={() => { setStep(1); setExtrato(null) }} style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, border: 'none', background: verde, color: '#fff', cursor: 'pointer' }}>
            + Nova importação
          </button>
        </div>
      )}
    </div>
  )
}
