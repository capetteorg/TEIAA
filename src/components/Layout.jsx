import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// Cores Agendo oficiais
const AG_BLUE  = '#0E7EA8'
const AG_GREEN = '#96C11F'
const AG_RED   = '#E63214'
const AG_DARK  = '#1A1F1C'

// Sidebar escura — tokens
const S = {
  bg:         AG_DARK,
  border:     'rgba(255,255,255,0.08)',
  text:       'rgba(255,255,255,0.55)',
  textHover:  'rgba(255,255,255,0.80)',
  textActive: '#ffffff',
  secao:      'rgba(255,255,255,0.30)',
  activeBg:   'rgba(14,126,168,0.18)',
  activeBord: AG_BLUE,
}

function NavItem({ to, icon, label, visivel = true, onClick, badge }) {
  if (!visivel) return null
  return (
    <NavLink to={to} onClick={onClick} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '8px 1.1rem',
      fontSize: 12.5,
      color: isActive ? S.textActive : S.text,
      background: isActive ? S.activeBg : 'transparent',
      borderRight: isActive ? `2px solid ${S.activeBord}` : '2px solid transparent',
      textDecoration: 'none',
      transition: 'background .12s, color .12s',
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
    <div style={{ fontSize: 9.5, color: S.secao, padding: '10px 1.1rem 2px', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 500 }}>
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
  const perfilCor   = p === 'admin' ? AG_BLUE : p === 'diretoria' ? AG_GREEN : AG_GREEN

  const sidebar = (
    <div style={{ width: 228, background: S.bg, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%' }}>

      {/* Cabeçalho — logo da OSC em pill branco */}
      <div style={{ padding: '1rem 1.1rem', borderBottom: `0.5px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 160, minHeight: 36 }}>
          <img
            src="/logo.png" alt="Logo"
            style={{ height: 28, width: 'auto', objectFit: 'contain', maxWidth: 140, display: 'block' }}
            onError={e => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'block'
            }}
          />
          <span style={{ display: 'none', fontSize: 13, fontWeight: 500, color: AG_DARK }}>AGENDO Integra</span>
        </div>
        {isMobile && (
          <button onClick={() => setMenuAberto(false)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: S.text, padding: '4px', lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Menu */}
      <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>

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
        <NavItem to="/configuracoes"      icon="settings"          label="Configurações"       visivel={p==='admin'} onClick={fecharMenu} />

      </div>

      {/* Rodapé — usuário */}
      <div style={{ padding: '.7rem 1.1rem', borderTop: `0.5px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: AG_BLUE + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: AG_BLUE }}>
            {(perfil?.nome || 'U').slice(0,2).toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: S.textHover, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {perfil?.nome || 'Usuário'}
          </div>
          <div style={{ fontSize: 10, color: perfilCor }}>{perfilLabel}</div>
        </div>
        <button onClick={handleLogout} title="Sair"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: S.text, padding: 4, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
          <i className="ti ti-logout" style={{ fontSize: 15 }} />
        </button>
      </div>

    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #F8F7F2 0%, #EEF4E8 100%)', overflow: 'hidden' }}>
      {!isMobile && sidebar}

      {isMobile && menuAberto && (
        <>
          <div onClick={() => setMenuAberto(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 99 }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, width: 240, overflowY: 'auto' }}>
            {sidebar}
          </div>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar mobile */}
        {isMobile && (
          <div style={{ background: S.bg, padding: '.6rem 1rem', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button onClick={() => setMenuAberto(true)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: S.text, padding: '2px 4px', lineHeight: 1 }}>
              <i className="ti ti-menu-2" style={{ fontSize: 20, color: S.text }} />
            </button>
            <div style={{ background: '#fff', borderRadius: 7, padding: '3px 8px' }}>
              <img src="/logo.png" alt="Logo" style={{ height: 22, width: 'auto', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none' }} />
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500, color: AG_DARK, background: perfilCor }}>
              {perfilLabel}
            </span>
          </div>
        )}

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>

        {/* Rodapé */}
        <div style={{ padding: '5px 1.25rem', borderTop: '0.5px solid #E0DDD5', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#B4B2A9' }}>AGENDO Integra</span>
          <span style={{ fontSize: 10, color: '#D3D1C7' }}>Agendo · CNPJ 56.059.476/0001-52</span>
        </div>

      </div>
    </div>
  )
}
