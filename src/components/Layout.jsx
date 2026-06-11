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
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [badgeCobrancas, setBadgeCobrancas] = useState(0)
  const [badgeDividas, setBadgeDividas] = useState(0)
  const [badgePendencias, setBadgePendencias] = useState(0)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Busca global: Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscaAberta(v => !v)
        setTermoBusca('')
      }
      if (e.key === 'Escape') setBuscaAberta(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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

  // Itens buscáveis (espelha o menu, respeitando o perfil)
  const itensBusca = [
    { to:'/painel-admin', label:'Painel', icon:'layout-dashboard', ok:p==='admin' },
    { to:'/painel-operacional', label:'Painel', icon:'layout-dashboard', ok:p==='operacional' },
    { to:'/painel-diretoria', label:'Acompanhamento', icon:'layout-dashboard', ok:p==='diretoria' },
    { to:'/importar', label:'Importar extrato', icon:'file-upload', ok:p==='admin' },
    { to:'/conciliacao', label:'Conciliação', icon:'checks', ok:p==='admin' },
    { to:'/lancamentos', label:'Lançamentos', icon:'list-details', ok:p==='admin'||p==='operacional' },
    { to:'/cobrancas', label:'Cobranças', icon:'receipt-2', ok:p==='admin'||p==='operacional' },
    { to:'/pendencias', label:'Pendências', icon:'alert-triangle', ok:p==='admin' },
    { to:'/fornecedores', label:'Fornecedores', icon:'building-store', ok:p==='admin' },
    { to:'/historico-fornecedor', label:'Histórico Fornecedor', icon:'history', ok:p==='admin' },
    { to:'/controle-dividas', label:'Controle de Dívidas', icon:'credit-card-off', ok:p==='admin'||p==='diretoria' },
    { to:'/aplicacoes', label:'Aplicações', icon:'chart-line', ok:p==='admin' },
    { to:'/planos-execucao', label:'Plano de Ação', icon:'clipboard-check', ok:p==='admin' },
    { to:'/projetos', label:'Projetos', icon:'folder', ok:p==='admin' },
    { to:'/atendimentos', label:'Atendimentos', icon:'clipboard-list', ok:p==='admin'||p==='operacional' },
    { to:'/usuarios-atendidos', label:'Usuários Atendidos', icon:'users', ok:p==='admin'||p==='operacional' },
    { to:'/equipe', label:'Equipe', icon:'users-group', ok:p==='admin'||p==='operacional' },
    { to:'/doacoes', label:'Doações', icon:'gift', ok:p==='admin' },
    { to:'/eventos-campanhas', label:'Eventos e Campanhas', icon:'calendar-event', ok:p==='admin' },
    { to:'/relatorios', label:'Central de Relatórios', icon:'report-analytics', ok:p==='admin'||p==='diretoria' },
    { to:'/fechamento', label:'Fechamento / Conselho Fiscal', icon:'checkup-list', ok:p==='admin' },
    { to:'/prestacao-contas', label:'Prestação de Contas', icon:'file-certificate', ok:p==='admin' },
    { to:'/transparencia', label:'Transparência Pública', icon:'world', ok:p==='admin' },
    { to:'/instituicao', label:'Instituição', icon:'building', ok:p==='admin' },
    { to:'/parcerias', label:'Instrumentos', icon:'file-invoice', ok:p==='admin' },
    { to:'/documentos-fiscais', label:'Documentos', icon:'files', ok:p==='admin' },
    { to:'/patrimonio', label:'Patrimônio', icon:'building-warehouse', ok:p==='admin' },
    { to:'/contas', label:'Contas bancárias', icon:'building-bank', ok:p==='admin' },
    { to:'/categorias', label:'Categorias', icon:'tag', ok:p==='admin' },
    { to:'/classificacoes', label:'Classificações', icon:'list-tree', ok:p==='admin' },
    { to:'/usuarios', label:'Usuários do sistema', icon:'user-cog', ok:p==='admin' },
    { to:'/backup', label:'Backup', icon:'database-export', ok:p==='admin' },
    { to:'/configuracoes', label:'Zona de perigo', icon:'alert-octagon', ok:p==='admin' },
  ].filter(i => i.ok)

  const resultadosBusca = termoBusca
    ? itensBusca.filter(i => i.label.toLowerCase().includes(termoBusca.toLowerCase()))
    : itensBusca.slice(0, 8)

  function irPara(to) {
    setBuscaAberta(false)
    setTermoBusca('')
    navigate(to)
  }

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
        .busca-item:hover { background: rgba(150,193,31,0.10) !important; }
      `}</style>

      {/* Busca global — Ctrl+K */}
      {buscaAberta && (
        <div onClick={e => { if (e.target === e.currentTarget) setBuscaAberta(false) }}
          style={{ position:'fixed', inset:0, background:'rgba(26,31,28,0.4)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'12vh', backdropFilter:'blur(2px)' }}>
          <div style={{ background:'rgba(255,255,255,0.98)', border:'0.5px solid #E8E6DE', borderRadius:14, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', width:'100%', maxWidth:480, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'0.5px solid #E8E6DE' }}>
              <i className="ti ti-search" style={{ fontSize:16, color:'#888780' }} />
              <input autoFocus value={termoBusca} onChange={e => setTermoBusca(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && resultadosBusca[0]) irPara(resultadosBusca[0].to) }}
                placeholder="Ir para... (digite o nome da tela)"
                style={{ flex:1, border:'none', outline:'none', fontSize:14, background:'transparent', color:'#1A1F1C' }} />
              <span style={{ fontSize:10, color:'#C8C6BC', border:'0.5px solid #E8E6DE', borderRadius:5, padding:'2px 6px' }}>Esc</span>
            </div>
            <div style={{ maxHeight:320, overflowY:'auto', padding:'6px 0' }}>
              {resultadosBusca.length === 0 ? (
                <div style={{ padding:'1.5rem', textAlign:'center', fontSize:12, color:'#888780' }}>Nenhuma tela encontrada.</div>
              ) : resultadosBusca.map(item => (
                <div key={item.to} className="busca-item" onClick={() => irPara(item.to)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', fontSize:13, color:'#2C2C2A', cursor:'pointer' }}>
                  <i className={`ti ti-${item.icon}`} style={{ fontSize:15, color:'#888780' }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
          <span style={{ fontSize: 10, color: '#C8C6BC' }}>AGENDO Integra · <span style={{ cursor:'pointer' }} onClick={() => setBuscaAberta(true)}>busca rápida Ctrl+K</span></span>
          <span style={{ fontSize: 10, color: '#D3D1C7' }}>Agendo · CNPJ 56.059.476/0001-52</span>
        </div>

      </div>
    </div>
  )
}
