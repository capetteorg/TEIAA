import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const VERDE = '#6BBF2B', VERMELHO = '#E8212A', AZUL = '#0E7EA8', LARANJA = '#F4821F'

export default function PainelOperacional() {
  const navigate = useNavigate()
  const [resumo, setResumo] = useState({ atendimentos:0, usuarios:0, equipeAtiva:0, cobrancas:0 })
  const [atendimentosRecentes, setAtendimentosRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function carregar() {
      const hoje = new Date()
      const ym = hoje.toISOString().slice(0,7)
      const inicioMes = ym + '-01'
      const [yy, mm] = ym.split('-')
      const fimMes = `${ym}-${new Date(+yy, +mm, 0).getDate()}`

      const [atends, usuarios, equipe, cobrancas, atRecentes] = await Promise.all([
        supabase.from('atendimentos').select('id', { count:'exact', head:true }).gte('data_atend', inicioMes).lte('data_atend', fimMes),
        supabase.from('usuarios_atendidos').select('id', { count:'exact', head:true }).eq('situacao', 'ativo'),
        supabase.from('equipe').select('id', { count:'exact', head:true }).eq('situacao', 'ativo'),
        supabase.from('cobrancas').select('id', { count:'exact', head:true }).eq('situacao', 'pendente'),
        supabase.from('atendimentos').select('data_atend, tipo_atend, qtd_participantes, projeto:projetos(nome)').order('data_atend', { ascending:false }).limit(5),
      ])

      if (!mounted) return
      setResumo({
        atendimentos: atends.count || 0,
        usuarios: usuarios.count || 0,
        equipeAtiva: equipe.count || 0,
        cobrancas: cobrancas.count || 0,
      })
      setAtendimentosRecentes(atRecentes.data || [])
      setLoading(false)
    }
    carregar()
    return () => { mounted = false }
  }, [])

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month:'long' })

  const s = {
    card: { background:'rgba(255,255,255,0.92)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 2px 16px rgba(0,0,0,0.05)', padding:'1rem', marginBottom:10 },
  }

  return (
    <div style={{ padding:'1rem', maxWidth:560, margin:'0 auto', position:'relative' }}>

      {/* Marca d'água Agendo */}
      <div style={{ position:'fixed', right:'-6vw', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0, opacity:0.04, filter:'grayscale(100%)' }}>
        <img src="/agendo-logo.png" alt="" style={{ width:'30vw', maxWidth:360 }} />
      </div>

      <div style={{ position:'relative', zIndex:1 }}>

      {/* Saudação */}
      <div style={{ marginBottom:'1.25rem' }}>
        <div style={{ fontSize:16, fontWeight:600 }}>{saudacao} <i className="ti ti-hand-stop" style={{fontSize:14}} /></div>
        <div style={{ fontSize:12, color:'#888780' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:'1.25rem' }}>
        <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:14, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#888780', marginBottom:4 }}>Atendimentos em {mesAtual}</div>
          <div style={{ fontSize:24, fontWeight:700, color:'#2C2C2A' }}>{loading?'...':resumo.atendimentos}</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:14, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#888780', marginBottom:4 }}>Usuários ativos</div>
          <div style={{ fontSize:24, fontWeight:700, color:'#2C2C2A' }}>{loading?'...':resumo.usuarios}</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:14, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#888780', marginBottom:4 }}>Equipe ativa</div>
          <div style={{ fontSize:24, fontWeight:700, color:'#2C2C2A' }}>{loading?'...':resumo.equipeAtiva}</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:14, padding:'.85rem 1rem', border:'0.5px solid #E8E6DE', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#888780', marginBottom:4 }}>Cobranças pendentes</div>
          <div style={{ fontSize:24, fontWeight:700, color:resumo.cobrancas>0?VERMELHO:'#2C2C2A' }}>{loading?'...':resumo.cobrancas}</div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div style={s.card}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:'1rem' }}>Ações rápidas</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { label:'Registrar atendimento', icon:'ti-clipboard-list', link:'/atendimentos' },
            { label:'Lançar despesa', icon:'ti-circle-arrow-down', link:'/despesas' },
            { label:'Lançar entrada', icon:'ti-circle-arrow-up', link:'/entradas' },
            { label:'Cadastrar usuário', icon:'ti-user-plus', link:'/usuarios-atendidos' },
            { label:'Equipe', icon:'ti-users', link:'/equipe' },
            { label:'Cobranças', icon:'ti-receipt-2', link:'/cobrancas' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.link)}
              style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'12px', borderRadius:10, border:'0.5px solid #E8E6DE', background:'rgba(255,255,255,0.75)', cursor:'pointer', textAlign:'left', boxShadow:'0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ marginBottom:4 }}><i className={`ti ${a.icon}`} style={{fontSize:22, color:AZUL}} /></div>
              <div style={{ fontSize:12, fontWeight:600, color:'#2C2C2A' }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Atendimentos recentes */}
      {atendimentosRecentes.length > 0 && (
        <div style={s.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.85rem' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Atendimentos recentes</div>
            <button onClick={() => navigate('/atendimentos')}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>
              Ver todos
            </button>
          </div>
          {atendimentosRecentes.map((a,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i < atendimentosRecentes.length-1 ? '0.5px solid #F1EFE8':'none' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500 }}>{a.tipo_atend}</div>
                <div style={{ fontSize:11, color:'#888780' }}>{a.projeto?.nome||'—'}</div>
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
      </div>
  )
}
