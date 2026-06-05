import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

export default function PainelOperacional() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [resumo, setResumo] = useState({ atendimentos: 0, usuarios: 0, equipeAtiva: 0, cobrancas: 0 })
  const [atendimentosRecentes, setAtendimentosRecentes] = useState([])
  const [equipeAtiva, setEquipeAtiva] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const hoje = new Date()
    const inicioMes = hoje.toISOString().slice(0,7) + '-01'
    const fimMes = hoje.toISOString().slice(0,7) + '-31'

    const [atends, usuarios, equipe, cobrancas, atRecentes] = await Promise.all([
      supabase.from('atendimentos').select('id', { count:'exact' }).gte('data_atend', inicioMes).lte('data_atend', fimMes),
      supabase.from('usuarios_atendidos').select('id', { count:'exact' }).eq('situacao', 'ativo'),
      supabase.from('equipe').select('id', { count:'exact' }).eq('situacao', 'ativo'),
      supabase.from('cobrancas').select('id', { count:'exact' }).eq('situacao', 'pendente'),
      supabase.from('atendimentos').select('*, projeto:projetos(nome), profissional:equipe(nome)').order('data_atend', { ascending:false }).limit(8),
    ])

    setResumo({
      atendimentos: atends.count || 0,
      usuarios: usuarios.count || 0,
      equipeAtiva: equipe.count || 0,
      cobrancas: cobrancas.count || 0,
    })
    setAtendimentosRecentes(atRecentes.data || [])

    const { data: eq } = await supabase.from('equipe').select('nome,funcao,tipo_vinculo,projetos').eq('situacao','ativo').order('nome').limit(20)
    setEquipeAtiva(eq || [])
    setLoading(false)
  }

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' })

  const s = {
    card: { background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
    btn: (bg, cor='#fff') => ({ padding:'8px 16px', fontSize:12, borderRadius:8, border:'none', background:bg, color:cor, cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }),
    th: { textAlign:'left', padding:'6px 10px', fontSize:11, color:'#888780', borderBottom:'0.5px solid #E0DDD5', background:'#FAFAF8' },
    td: { padding:'7px 10px', borderBottom:'0.5px solid #E0DDD5', fontSize:12, verticalAlign:'middle' },
    badge: (bg,cor) => ({ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:bg, color:cor }),
  }

  return (
    <div style={{ padding:'1.25rem 1.5rem' }}>
      <div style={{ marginBottom:'1.25rem' }}>
        <div style={{ fontSize:15, fontWeight:500 }}>Painel Operacional</div>
        <div style={{ fontSize:12, color:'#888780' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>

      {/* Métricas do mês */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:'1.25rem' }}>
        {[
          { label:`Atendimentos em ${mesAtual}`, val:resumo.atendimentos, cor:AZUL, link:'/atendimentos' },
          { label:'Usuários ativos', val:resumo.usuarios, cor:VERDE, link:'/usuarios-atendidos' },
          { label:'Equipe ativa', val:resumo.equipeAtiva, cor:LARANJA, link:'/equipe' },
          { label:'Cobranças pendentes', val:resumo.cobrancas, cor:resumo.cobrancas>0?VERMELHO:'#888780', link:'/cobrancas' },
        ].map(m => (
          <div key={m.label} onClick={() => navigate(m.link)}
            style={{ background:'#fff', borderRadius:10, padding:'.85rem 1rem', border:'0.5px solid #E0DDD5', cursor:'pointer' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:m.cor }}>{loading ? '...' : m.val}</div>
          </div>
        ))}
      </div>

      {/* Atalhos rápidos */}
      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Ações rápidas</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          <button onClick={() => navigate('/atendimentos')} style={s.btn(AZUL)}>+ Registrar atendimento</button>
          <button onClick={() => navigate('/usuarios-atendidos')} style={s.btn(VERDE)}>+ Cadastrar usuário</button>
          <button onClick={() => navigate('/equipe')} style={s.btn(LARANJA)}>+ Cadastrar equipe</button>
          <button onClick={() => navigate('/despesas')} style={s.btn('#5F5E5A')}>+ Lançar despesa</button>
          <button onClick={() => navigate('/entradas')} style={s.btn('#5F5E5A')}>+ Lançar entrada</button>
          <button onClick={() => navigate('/cobrancas')} style={s.btn('#F1EFE8','#5F5E5A')}>Ver cobranças</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {/* Atendimentos recentes */}
        <div style={s.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Atendimentos recentes</div>
            <button onClick={() => navigate('/atendimentos')} style={s.btn('#F1EFE8','#5F5E5A')}>Ver todos</button>
          </div>
          {atendimentosRecentes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>
              Nenhum atendimento registrado ainda.
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr>{['Data','Tipo','Projeto','Part.'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {atendimentosRecentes.map((a,i) => (
                  <tr key={a.id} style={{ background:i%2===0?'#fff':'#FAFAF8' }}>
                    <td style={{ ...s.td, whiteSpace:'nowrap' }}>{fmtData(a.data_atend)}</td>
                    <td style={{ ...s.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.tipo_atend}</td>
                    <td style={{ ...s.td, fontSize:11, color:'#888780' }}>{a.projeto?.nome?.split(' ').slice(0,2).join(' ')||'—'}</td>
                    <td style={{ ...s.td, textAlign:'center', fontWeight:500, color:AZUL }}>{a.qtd_participantes||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Equipe ativa */}
        <div style={s.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Equipe ativa ({resumo.equipeAtiva})</div>
            <button onClick={() => navigate('/equipe')} style={s.btn('#F1EFE8','#5F5E5A')}>Gerenciar</button>
          </div>
          {equipeAtiva.length === 0 ? (
            <div style={{ textAlign:'center', padding:'1.5rem', color:'#888780', fontSize:12 }}>
              Nenhuma pessoa na equipe cadastrada.
            </div>
          ) : (
            <div style={{ maxHeight:280, overflowY:'auto',overflowX:'auto' }}>
              {equipeAtiva.map((e,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'0.5px solid #F1EFE8' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{e.nome}</div>
                    <div style={{ fontSize:10, color:'#888780' }}>{e.funcao||'—'}</div>
                  </div>
                  <span style={s.badge('#EAF3DE','#3B6D11')}>{e.tipo_vinculo?.split(' ').slice(0,2).join(' ')||'ativo'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
