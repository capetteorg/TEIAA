import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#4A8FD4', LARANJA = '#F4821F'

export default function PainelOperacional() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [resumo, setResumo] = useState({ atendimentos:0, usuarios:0, equipeAtiva:0, cobrancas:0 })
  const [atendimentosRecentes, setAtendimentosRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const hoje = new Date()
    const inicioMes = hoje.toISOString().slice(0,7) + '-01'
    const fimMes = hoje.toISOString().slice(0,7) + '-30'

    const [atends, usuarios, equipe, cobrancas, atRecentes] = await Promise.all([
      supabase.from('atendimentos').select('id', { count:'exact' }).gte('data_atend', inicioMes).lte('data_atend', fimMes),
      supabase.from('usuarios_atendidos').select('id', { count:'exact' }).eq('situacao', 'ativo'),
      supabase.from('equipe').select('id', { count:'exact' }).eq('situacao', 'ativo'),
      supabase.from('cobrancas').select('id', { count:'exact' }).eq('situacao', 'pendente'),
      supabase.from('atendimentos').select('*, projeto:projetos(nome), profissional:equipe(nome)').order('data_atend', { ascending:false }).limit(5),
    ])

    setResumo({
      atendimentos: atends.count || 0,
      usuarios: usuarios.count || 0,
      equipeAtiva: equipe.count || 0,
      cobrancas: cobrancas.count || 0,
    })
    setAtendimentosRecentes(atRecentes.data || [])
    setLoading(false)
  }

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' })

  const ACOES = [
    { label:'Registrar atendimento', icon:'📋', cor:AZUL, link:'/atendimentos', desc:'Registre atividades e atendimentos' },
    { label:'Lançar despesa', icon:'💸', cor:VERMELHO, link:'/despesas', desc:'Com foto de nota fiscal' },
    { label:'Lançar entrada', icon:'💰', cor:VERDE, link:'/entradas', desc:'Registre receitas recebidas' },
    { label:'Cadastrar usuário', icon:'👤', cor:LARANJA, link:'/usuarios-atendidos', desc:'Novo usuário atendido' },
    { label:'Equipe', icon:'👥', cor:'#8B2FC9', link:'/equipe', desc:'Gerenciar equipe' },
    { label:'Cobranças', icon:'📄', cor:'#5F5E5A', link:'/cobrancas', desc:`${resumo.cobrancas} pendente${resumo.cobrancas!==1?'s':''}` },
  ]

  return (
    <div style={{ padding: isMobile ? '.75rem' : '1.25rem 1.5rem', maxWidth: 600, margin:'0 auto' }}>

      {/* Saudação */}
      <div style={{ marginBottom:'1.25rem' }}>
        <div style={{ fontSize:16, fontWeight:600, color:'#2C2C2A' }}>
          {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'} 👋
        </div>
        <div style={{ fontSize:12, color:'#888780' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>

      {/* Métricas rápidas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:'1.25rem' }}>
        {[
          { label:`Atendimentos em ${mesAtual}`, val:resumo.atendimentos, cor:AZUL },
          { label:'Usuários ativos', val:resumo.usuarios, cor:VERDE },
          { label:'Equipe ativa', val:resumo.equipeAtiva, cor:LARANJA },
          { label:'Cobranças pendentes', val:resumo.cobrancas, cor:resumo.cobrancas>0?VERMELHO:'#888780' },
        ].map(m => (
          <div key={m.label} style={{ background:'#fff', borderRadius:12, padding:'.85rem 1rem', border:'0.5px solid #E0DDD5' }}>
            <div style={{ fontSize:10, color:'#888780', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:24, fontWeight:700, color:m.cor }}>{loading?'...':m.val}</div>
          </div>
        ))}
      </div>

      {/* Ações rápidas */}
      <div style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Ações rápidas</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {ACOES.map(a => (
            <button key={a.label} onClick={() => navigate(a.link)}
              style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'12px 14px', borderRadius:10, border:`0.5px solid ${a.cor}20`, background:`${a.cor}08`, cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{a.icon}</div>
              <div style={{ fontSize:12, fontWeight:600, color:a.cor, marginBottom:2 }}>{a.label}</div>
              <div style={{ fontSize:10, color:'#888780' }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Atendimentos recentes */}
      {atendimentosRecentes.length > 0 && (
        <div style={{ background:'#fff', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'1rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Atendimentos recentes</div>
            <button onClick={() => navigate('/atendimentos')}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>
              Ver todos
            </button>
          </div>
          {atendimentosRecentes.map((a,i) => (
            <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < atendimentosRecentes.length-1 ? '0.5px solid #F1EFE8' : 'none' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{a.tipo_atend}</div>
                <div style={{ fontSize:11, color:'#888780' }}>{a.projeto?.nome||'—'} · {a.profissional?.nome?.split(' ')[0]||'—'}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, color:'#888780' }}>{fmtData(a.data_atend)}</div>
                {a.qtd_participantes > 0 && <div style={{ fontSize:11, fontWeight:500, color:AZUL }}>{a.qtd_participantes} part.</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
