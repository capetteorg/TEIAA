import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const AG_BLUE  = '#0E7EA8'
const AG_GREEN = '#96C11F'
const AG_RED   = '#E63214'

function NavItem({ to, icon, label, visivel = true, onClick, badge }) {
  if (!visivel) return null
  return (
    <NavLink to={to} onClick={onClick} className="nav-item" style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '9px 1.1rem',
      fontSize: 12.5,
      color: isActive ? '#1A1F1C' : '#888780',
      background: isActive ? 'rgba(150,193,31,0.10)' : 'transparent',
      borderRight: isActive ? `2px solid ${AG_GREEN}` : '2px solid transparent',
      textDecoration: 'none',
      transition: 'background .15s ease, color .15s ease',
      fontWeight: isActive ? 500 : 400,
    })}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 15, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{ background: AG_RED, color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 99, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

function NavSecao({ label }) {
  return (
    <div style={{ fontSize: 9.5, color: '#C8C6BC', padding: '10px 1.1rem 2px', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 500 }}>
      {label}
    </div>
  )
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
  const [badgePendencias, setBadgePendencias] = useState(0)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => { setMenuAberto(false) }, [location.pathname])

  useEffect(() => {
    if (p === 'admin' || p === 'operacional') {
      supabase.from('cobrancas').select('id', { count:'exact', head:true }).eq('pago_confirmado', false)
        .then(({ count }) => setBadgeCobrancas(count || 0))
    }
    if (p === 'admin' || p === 'diretoria') {
      supabase.from('dividas').select('id', { count:'exact', head:true }).eq('status', 'aberta')
        .then(({ count }) => setBadgeDividas(count || 0))
    }
    if (p === 'admin') {
      supabase.from('pendencias').select('id', { count:'exact', head:true }).eq('resolvida', false)
        .then(({ count }) => setBadgePendencias(count || 0))
    }
  }, [p])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const fecharMenu = () => isMobile && setMenuAberto(false)
  const perfilLabel = p === 'admin' ? 'Admin' : p === 'diretoria' ? 'Diretoria' : 'Operacional'
  const perfilCor   = p === 'admin' ? AG_BLUE : p === 'diretoria' ? AG_GREEN : '#E67814'

  const sidebar = (
    <div style={{
      width: 228,
      background: 'rgba(255,255,255,0.92)',
      borderRight: '0.5px solid #E8E6DE',
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%',
      boxShadow: '2px 0 16px rgba(0,0,0,0.04)',
    }}>

      {/* Logo da OSC */}
      <div style={{ padding: '1.15rem 1.1rem', borderBottom: '0.5px solid #E8E6DE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 70 }}>
        <img
          src="/logo.png" alt="Logo"
          style={{ height: 40, width: 'auto', objectFit: 'contain', maxWidth: 168, display: 'block' }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
        />
        <div style={{ display:'none', gap:2, alignItems:'center' }}>
          {[['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']].map(([l,c])=>(
            <span key={l+c} style={{ fontSize:16, fontWeight:700, color:c }}>{l}</span>
          ))}
        </div>
        {isMobile && (
          <button onClick={() => setMenuAberto(false)} style={{ border:'none', background:'none', fontSize:18, cursor:'pointer', color:'#888780', padding:'4px', lineHeight:1 }}>✕</button>
        )}
      </div>

      {/* Menu */}
      <div className="sidebar-scroll" style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>

        <NavSecao label="Principal" />
        <NavItem to="/painel-admin"       icon="layout-dashboard"  label="Painel"              visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/painel-operacional" icon="layout-dashboard"  label="Painel"              visivel={p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/painel-diretoria"   icon="layout-dashboard"  label="Acompanhamento"      visivel={p==='diretoria'} onClick={fecharMenu} />

        <NavSecao label="Operação diária" />
        <NavItem to="/importar"           icon="file-upload"       label="Importar extrato"    visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/conciliacao"        icon="checks"            label="Conciliação"         visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/lancamentos"        icon="list-details"      label="Lançamentos"         visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/cobrancas"          icon="receipt-2"         label="Cobranças"           visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} badge={badgeCobrancas} />
        <NavItem to="/pendencias"         icon="alert-triangle"    label="Pendências"          visivel={p==='admin'} onClick={fecharMenu} badge={badgePendencias} />

        <NavSecao label="Gestão financeira" />
        <NavItem to="/fornecedores"       icon="building-store"    label="Fornecedores"        visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/historico-fornecedor" icon="history"         label="Histórico Fornecedor" visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/controle-dividas"   icon="credit-card-off"   label="Controle de Dívidas" visivel={p==='admin'||p==='diretoria'} onClick={fecharMenu} badge={badgeDividas} />
        <NavItem to="/aplicacoes"         icon="chart-line"        label="Aplicações"          visivel={p==='admin'} onClick={fecharMenu} />

        <NavSecao label="Programas e projetos" />
        <NavItem to="/planos-execucao"    icon="clipboard-check"   label="Plano de Ação"       visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/projetos"           icon="folder"            label="Projetos"            visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/atendimentos"       icon="clipboard-list"    label="Atendimentos"        visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/usuarios-atendidos" icon="users"             label="Usuários Atendidos"  visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/equipe"             icon="users-group"       label="Equipe"              visivel={p==='admin'||p==='operacional'} onClick={fecharMenu} />
        <NavItem to="/doacoes"            icon="gift"              label="Doações"             visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/eventos-campanhas"  icon="calendar-event"    label="Eventos e Campanhas" visivel={p==='admin'} onClick={fecharMenu} />

        <NavSecao label="Relatórios" />
        <NavItem to="/relatorios"         icon="report-analytics"  label="Central de Relatórios"  visivel={p==='admin'||p==='diretoria'} onClick={fecharMenu} />
        <NavItem to="/fechamento"         icon="checkup-list"      label="Fechamento / Conselho"  visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/prestacao-contas"   icon="file-certificate"  label="Prestação de Contas"    visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/transparencia"      icon="world"             label="Transparência Pública"  visivel={p==='admin'} onClick={fecharMenu} />

        <NavSecao label="Institucional" />
        <NavItem to="/instituicao"        icon="building"           label="Instituição"         visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/parcerias"          icon="file-invoice"       label="Instrumentos"        visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/documentos-fiscais" icon="files"              label="Documentos"          visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/patrimonio"         icon="building-warehouse" label="Patrimônio"          visivel={p==='admin'} onClick={fecharMenu} />

        <NavSecao label="Configurações" />
        <NavItem to="/contas"             icon="building-bank"     label="Contas bancárias"    visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/categorias"         icon="tag"               label="Categorias"          visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/classificacoes"     icon="list-tree"         label="Classificações"      visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/usuarios"           icon="user-cog"          label="Usuários"            visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/backup"             icon="database-export"   label="Backup"              visivel={p==='admin'} onClick={fecharMenu} />
        <NavItem to="/configuracoes"      icon="alert-octagon"     label="Zona de perigo"      visivel={p==='admin'} onClick={fecharMenu} />

      </div>

      {/* Rodapé usuário */}
      <div style={{ padding: '.7rem 1.1rem', borderTop: '0.5px solid #E8E6DE', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${perfilCor}18`, border: `1px solid ${perfilCor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: perfilCor }}>
            {(perfil?.nome || 'U').slice(0,2).toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#2C2C2A', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {perfil?.nome || 'Usuário'}
          </div>
          <div style={{ fontSize: 10, color: perfilCor }}>{perfilLabel}</div>
        </div>
        <button onClick={handleLogout} title="Sair"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B4B2A9', padding: 4, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
          <i className="ti ti-logout" style={{ fontSize: 15 }} />
        </button>
      </div>

    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #F8F7F2 0%, #EEF4E8 100%)', overflow: 'hidden' }}>
      <style>{`
        .nav-item:hover { background: rgba(0,0,0,0.035) !important; color: #2C2C2A !important; }
        .sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #DDDBD2; border-radius: 99px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #C8C6BC; }
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: #DDDBD2 transparent; }
        @keyframes drawerIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .drawer-mobile { animation: drawerIn .22s cubic-bezier(.2,.8,.3,1); }
        .drawer-overlay { animation: fadeIn .18s ease; }
      `}</style>

      {!isMobile && sidebar}

      {isMobile && menuAberto && (
        <>
          <div onClick={() => setMenuAberto(false)} className="drawer-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 99 }} />
          <div className="drawer-mobile" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, width: 240, overflowY: 'auto' }}>
            {sidebar}
          </div>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {isMobile && (
          <div style={{ background: 'rgba(255,255,255,0.92)', borderBottom: '0.5px solid #E8E6DE', padding: '.6rem 1rem', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button onClick={() => setMenuAberto(true)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888780', padding: '2px 4px', lineHeight: 1 }}>
              <i className="ti ti-menu-2" style={{ fontSize: 20 }} />
            </button>
            <img src="/logo.png" alt="Logo" style={{ height: 28, width: 'auto', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none' }} />
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500, color: '#fff', background: perfilCor }}>
              {perfilLabel}
            </span>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>

        <div style={{ padding: '5px 1.25rem', borderTop: '0.5px solid #E8E6DE', background: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#C8C6BC' }}>AGENDO Integra</span>
          <span style={{ fontSize: 10, color: '#D3D1C7' }}>Agendo · CNPJ 56.059.476/0001-52</span>
        </div>

      </div>
    </div>
  )
}
