import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const LOGO = [['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']]

function NavItem({ to, icon, label, visivel = true, externo = false, onClick, badge }) {
  if (!visivel) return null
  if (externo) return (
    <a href={to} target="_blank" rel="noopener noreferrer" onClick={onClick}
      style={{ display:'flex',alignItems:'center',gap:9,padding:'10px 1.25rem',fontSize:13,color:'#5F5E5A',background:'transparent',borderRight:'2px solid transparent',textDecoration:'none' }}>
      <i className={`ti ti-${icon}`} style={{fontSize:15}} />
      {label}
    </a>
  )
  return (
    <NavLink to={to} onClick={onClick} style={({isActive})=>({
      display:'flex',alignItems:'center',gap:9,padding:'10px 1.25rem',
      fontSize:13,color:isActive?'#2C2C2A':'#5F5E5A',
      background:isActive?'#F8F7F2':'transparent',
      fontWeight:isActive?500:'normal',
      borderRight:isActive?'2px solid #6BBF2B':'2px solid transparent',
      textDecoration:'none',transition:'background .15s',
      position:'relative',
    })}>
      <i className={`ti ti-${icon}`} style={{fontSize:15}} />
      <span style={{flex:1}}>{label}</span>
      {badge > 0 && (
        <span style={{background:'#E8212A',color:'#fff',fontSize:9,fontWeight:700,borderRadius:99,minWidth:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

function NavSecao({ label }) {
  return <div style={{fontSize:10,color:'#B4B2A9',padding:'12px 1.25rem 3px',textTransform:'uppercase',letterSpacing:'.08em'}}>{label}</div>
}

export default function Layout() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const p = perfil?.perfil
  const [menuAberto, setMenuAberto] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [badgeCobrancas, setBadgeCobrancas] = useState(0)
  const [badgeDividas, setBadgeDividas] = useState(0)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => { setMenuAberto(false) }, [location.pathname])

  useEffect(() => {
    if (p === 'admin' || p === 'operacional') {
      supabase.from('cobrancas').select('id', { count:'exact' }).eq('pago_confirmado', false)
        .then(({ count }) => setBadgeCobrancas(count || 0))
    }
    if (p === 'admin' || p === 'diretoria') {
      supabase.from('dividas').select('id', { count:'exact' }).eq('status', 'aberta')
        .then(({ count }) => setBadgeDividas(count || 0))
    }
  }, [p])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const fecharMenu = () => isMobile && setMenuAberto(false)

  const sidebar = (
    <div style={{ width:220, background:'#fff', borderRight:'0.5px solid #E0DDD5', display:'flex', flexDirection:'column', flexShrink:0, height:'100%' }}>
      {/* Logo */}
      <div style={{padding:'.85rem 1.25rem',borderBottom:'0.5px solid #E0DDD5',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <img src="/logo.png" alt="CAPETTE" style={{height:38,width:'auto',objectFit:'contain',maxWidth:150}}
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
          <div style={{display:'none',flexDirection:'column',gap:2}}>
            <div style={{display:'flex',gap:2,alignItems:'center'}}>
              {LOGO.map(([l,c])=><span key={l+c} style={{fontSize:16,fontWeight:500,color:c,lineHeight:1}}>{l}</span>)}
            </div>
          </div>
        </div>
        {isMobile && (
          <button onClick={() => setMenuAberto(false)} style={{border:'none',background:'none',fontSize:20,cursor:'pointer',color:'#888780',padding:'4px'}}>✕</button>
        )}
      </div>

      <div style={{overflowY:'auto',flex:1}}>

        {/* Principal */}
        <NavSecao label="Principal" />
        <NavItem to="/painel-admin"       icon="layout-dashboard"  label="Painel"           visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/painel-operacional" icon="layout-dashboard"  label="Painel"           visivel={p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/painel-diretoria"   icon="layout-dashboard"  label="Acompanhamento"   visivel={p==='diretoria'} onClick={fecharMenu} />

        {/* Financeiro */}
        <NavSecao label="Financeiro" />
        <NavItem to="/lancamentos"        icon="list-details"      label="Lançamentos"      visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/pendencias"          icon="alert-triangle"    label="Pendências"       visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/despesas"           icon="receipt"           label="Lançar despesa"   visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/entradas"           icon="arrow-bar-to-down" label="Lançar entrada"   visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/importar"           icon="upload"            label="Importar extrato" visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/conciliacao"        icon="checks"            label="Conciliação"      visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/aplicacoes"         icon="chart-line"        label="Aplicações"       visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/controle-dividas"   icon="alert-triangle"    label="Controle de Dívidas" visivel={p==='admin'||p==='diretoria'} onClick={fecharMenu} badge={badgeDividas} />
        <NavItem to="/cobrancas"          icon="receipt-2"         label="Cobranças"        visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} badge={badgeCobrancas} />
        <NavItem to="/fornecedores"       icon="building-store"    label="Fornecedores"     visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/historico-fornecedor" icon="chart-bar"        label="Hist. fornecedor" visivel={p==='admin'} onClick={fecharMenu} />

        {/* Programas e Projetos */}
        <NavSecao label="Programas e Projetos" />
        <NavItem to="/projetos"           icon="folder"            label="Projetos"         visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/planos-execucao"    icon="clipboard-check"   label="Planos de Ação"   visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/atendimentos"       icon="clipboard-list"    label="Atendimentos"     visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/usuarios-atendidos" icon="users"             label="Usuários Atendidos" visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/equipe"             icon="users-group"       label="Equipe"           visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/doacoes"            icon="gift"              label="Doações"          visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/eventos-campanhas"  icon="calendar-event"    label="Eventos e Campanhas" visivel={p==='admin'} onClick={fecharMenu} />

        {/* Relatórios */}
        <NavSecao label="Relatórios" />
        <NavItem to="/relatorios"         icon="report-analytics"  label="Central de Relatórios" visivel={p==='admin'||p==='diretoria'} onClick={fecharMenu} />
        <NavItem to="/prestacao-contas"   icon="file-certificate"  label="Prestação de Contas"   visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/transparencia"      icon="world"             label="Transparência Pública" visivel={p==='admin'} externo={true} onClick={fecharMenu} />

        {/* Institucional */}
        <NavSecao label="Institucional" />
        <NavItem to="/instituicao"        icon="building"          label="Instituição"      visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/parcerias"          icon="file-certificate"  label="Parcerias / Emendas" visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/documentos"         icon="files"             label="Documentos"       visivel={p==='admin'} onClick={fecharMenu} />

        {/* Configurações */}
        <NavSecao label="Configurações" />
        <NavItem to="/contas"             icon="building-bank"     label="Contas bancárias" visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/categorias"         icon="tag"               label="Categorias"       visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/classificacoes"     icon="list-tree"         label="Classificações"   visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/usuarios"           icon="user-cog"          label="Usuários do sistema" visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/fechamento"         icon="lock"              label="Fechamento"       visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/backup"             icon="database-export"   label="Backup"           visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/configuracoes"      icon="settings"          label="Configurações"    visivel={p==='admin'} onClick={fecharMenu} />

      </div>

      {/* Rodapé */}
      <div style={{padding:'.75rem 1.25rem',borderTop:'0.5px solid #E0DDD5'}}>
        <div style={{fontSize:11,color:'#888780',marginBottom:4}}>{perfil?.nome || 'Usuário'}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:10,padding:'2px 8px',borderRadius:99,fontWeight:500,color:'#fff',background:p==='admin'?'#8B2FC9':p==='diretoria'?'#4A8FD4':'#6BBF2B'}}>
            {p==='admin'?'Admin':p==='diretoria'?'Diretoria':'Operacional'}
          </span>
          <button onClick={handleLogout} style={{fontSize:11,border:'none',background:'none',color:'#E8212A',cursor:'pointer'}}>Sair</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',height:'100vh',background:'#F8F7F2',overflow:'hidden'}}>
      {!isMobile && sidebar}
      {isMobile && menuAberto && (
        <>
          <div onClick={() => setMenuAberto(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:99}} />
          <div style={{position:'fixed',left:0,top:0,bottom:0,zIndex:100,width:260,overflowY:'auto',boxShadow:'4px 0 20px rgba(0,0,0,0.15)'}}>
            {sidebar}
          </div>
        </>
      )}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {isMobile && (
          <div style={{background:'#fff',borderBottom:'0.5px solid #E0DDD5',padding:'.6rem 1rem',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <button onClick={() => setMenuAberto(true)} style={{border:'none',background:'none',fontSize:22,cursor:'pointer',color:'#5F5E5A',padding:'2px 4px',lineHeight:1}}>☰</button>
            <img src="/logo.png" alt="CAPETTE" style={{height:30,width:'auto',objectFit:'contain'}} onError={e => { e.target.style.display='none' }} />
            <div style={{flex:1}} />
            <span style={{fontSize:10,padding:'2px 8px',borderRadius:99,fontWeight:500,color:'#fff',background:p==='admin'?'#8B2FC9':p==='diretoria'?'#4A8FD4':'#6BBF2B'}}>
              {p==='admin'?'Admin':p==='diretoria'?'Diretoria':'Operacional'}
            </span>
          </div>
        )}
        <div style={{flex:1,overflowY:'auto'}}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
