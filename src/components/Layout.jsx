import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const AG_BLUE  = '#0E7EA8'
const AG_GREEN = '#96C11F'
const AG_RED   = '#E63214'

function NavItem({ to, icon, label, visivel = true, onClick, badge, colapsado = false }) {
  if (!visivel) return null
  return (
    <NavLink to={to} onClick={onClick} className="nav-item" title={colapsado ? label : undefined} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 9,
      padding: colapsado ? '10px 0' : '9px 1.1rem',
      justifyContent: colapsado ? 'center' : 'flex-start',
      fontSize: 12.5,
      color: isActive ? '#0E7EA8' : '#5F5E5A',
      background: isActive ? 'rgba(14,126,168,0.08)' : 'transparent',
      borderLeft: isActive ? `2px solid ${AG_BLUE}` : '2px solid transparent',
      textDecoration: 'none',
      transition: 'background .15s ease, color .15s ease',
      fontWeight: isActive ? 500 : 400,
      position: 'relative',
    })}>
      <i className={`ti ti-${icon}`} style={{ fontSize: colapsado ? 17 : 15, flexShrink: 0 }} />
      {!colapsado && <span style={{ flex: 1 }}>{label}</span>}
      {!colapsado && badge > 0 && (
        <span style={{ background: AG_RED, color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 99, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {colapsado && badge > 0 && (
        <span style={{ position: 'absolute', top: 6, right: 10, width: 7, height: 7, borderRadius: '50%', background: AG_RED }} />
      )}
    </NavLink>
  )
}

function NavSecao({ label, colapsado = false, aberta = true, onToggle }) {
  if (colapsado) return <div style={{ height: 10, borderBottom: '0.5px solid #F1EFE8', marginBottom: 4 }} />
  return (
    <div onClick={onToggle} style={{ fontSize: 9.5, color: '#B4B2A9', padding: '10px 1.1rem 2px', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 500, cursor: onToggle ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
      {label}
      {onToggle && <i className={`ti ti-chevron-${aberta ? 'down' : 'right'}`} style={{ fontSize: 11 }} />}
    </div>
  )
}

export default function Layout() {
  const { perfil, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const p = perfil?.perfil
  const [menuAberto, setMenuAberto] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('menuColapsado') === '1')
  const [secFechadas, setSecFechadas] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('secFechadas') || '["Institucional","Configurações"]')) }
    catch { return new Set(['Institucional','Configurações']) }
  })
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [feedbackAberto, setFeedbackAberto] = useState(false)
  const [feedbackTipo, setFeedbackTipo] = useState('sugestao')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackEnviando, setFeedbackEnviando] = useState(false)
  const [feedbackOk, setFeedbackOk] = useState('')
  const [termoBusca, setTermoBusca] = useState('')
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
    if (p === 'operacional') {
      const rotasPermitidas = ['/painel-operacional', '/usuarios-atendidos', '/atendimentos', '/minha-conta']
      const rotaLiberada = rotasPermitidas.some(r => location.pathname === r || location.pathname.startsWith(r + '/'))
      if (!rotaLiberada) navigate('/painel-operacional', { replace: true })
      return
    }
    if (p === 'tecnico') {
      const rotasPermitidas = ['/painel-tecnico', '/atendimentos', '/minha-conta']
      const rotaLiberada = rotasPermitidas.some(r => location.pathname === r || location.pathname.startsWith(r + '/'))
      if (!rotaLiberada) navigate('/painel-tecnico', { replace: true })
    }
  }, [p, location.pathname, navigate])

  useEffect(() => {
    // Na TEIAA, deixamos o badge de pendências desativado para evitar erro 400
    // quando a estrutura da tabela pendencias não tiver a coluna resolvida.
    setBadgePendencias(0)
  }, [p])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function enviarFeedback() {
    if (!feedbackMsg.trim()) return
    setFeedbackEnviando(true)
    const { error } = await supabase.from('mensagens_desenvolvedor').insert({
      usuario_id: user?.id,
      usuario_nome: perfil?.nome || 'Desconhecido',
      tipo: feedbackTipo,
      mensagem: feedbackMsg.trim(),
    })
    if (error) {
      setFeedbackOk('erro')
    } else {
      setFeedbackOk('ok')
      setFeedbackMsg('')
      setTimeout(() => { setFeedbackAberto(false); setFeedbackOk('') }, 2000)
    }
    setFeedbackEnviando(false)
  }

  const fecharMenu = () => isMobile && setMenuAberto(false)
  const perfilLabel = p === 'admin' ? 'Admin' : p === 'diretoria' ? 'Diretoria' : p === 'tecnico' ? 'Técnico' : 'Operacional'
  const perfilCor   = p === 'admin' ? AG_BLUE : p === 'diretoria' ? AG_GREEN : p === 'tecnico' ? '#F4821F' : '#E67814'

  function toggleColapsado() {
    setColapsado(v => { localStorage.setItem('menuColapsado', v ? '0' : '1'); return !v })
  }
  function toggleSec(nome) {
    setSecFechadas(prev => {
      const novo = new Set(prev)
      novo.has(nome) ? novo.delete(nome) : novo.add(nome)
      localStorage.setItem('secFechadas', JSON.stringify([...novo]))
      return novo
    })
  }
  const secVisivel = nome => colapsado || !secFechadas.has(nome)

  // Itens buscáveis (espelha o menu, respeitando o perfil)
  const itensBusca = [
    { to:'/painel-admin', label:'Painel', icon:'layout-dashboard', ok:p==='admin' },
    { to:'/painel-operacional', label:'Painel', icon:'layout-dashboard', ok:p==='operacional' },
    { to:'/painel-tecnico', label:'Painel Técnico', icon:'stethoscope', ok:p==='tecnico' },
    { to:'/painel-diretoria', label:'Acompanhamento', icon:'layout-dashboard', ok:p==='diretoria' },
    { to:'/importar', label:'Importar extrato', icon:'file-upload', ok:p==='admin' },
    { to:'/conciliacao', label:'Conciliação', icon:'checks', ok:p==='admin' },
    { to:'/lancamentos', label:'Lançamentos', icon:'list-details', ok:p==='admin' },
    { to:'/pendencias', label:'Pendências', icon:'alert-triangle', ok:p==='admin' },
    { to:'/fornecedores', label:'Fornecedores', icon:'building-store', ok:p==='admin' },
    { to:'/aplicacoes', label:'Aplicações', icon:'chart-line', ok:p==='admin' },
    { to:'/planos-execucao', label:'Plano de Ação', icon:'clipboard-check', ok:p==='admin' },
    { to:'/projetos', label:'Projetos', icon:'folder', ok:p==='admin' },
    { to:'/atendimentos', label:p==='tecnico' ? 'Minha agenda' : p==='operacional' ? 'Agenda TEAcolher' : 'Atendimentos', icon:'clipboard-list', ok:p==='admin'||p==='operacional'||p==='tecnico' },
    { to:'/usuarios-atendidos', label:p==='operacional' ? 'Usuários/famílias' : 'Usuários Atendidos', icon:'users', ok:p==='admin'||p==='operacional' },
    { to:'/equipe', label:'Equipe', icon:'users-group', ok:p==='admin' },
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
    { to:'/mensagens-dev', label:'Mensagens dos usuários', icon:'message-circle', ok:p==='admin' },
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
      width: colapsado && !isMobile ? 64 : 228,
      transition: 'width .2s cubic-bezier(.2,.8,.3,1)',
      background: isMobile ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.52)',
      borderRight: '0.5px solid #E0DDD5',
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%',
    }}>

      {/* AGENDO Integra — topo */}
      <div style={{ padding: colapsado && !isMobile ? '14px 0' : '13px 14px', borderBottom: '0.5px solid #E0DDD5', display: 'flex', alignItems: 'center', justifyContent: colapsado && !isMobile ? 'center' : 'space-between', minHeight: 60 }}>
        {!(colapsado && !isMobile) && (
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <img src="/agendo-logo.png" alt="AGENDO" style={{ height:32, width:'auto', objectFit:'contain', display:'block' }}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
            <div style={{ display:'none', width:30, height:30, borderRadius:8, background:'#0E7EA8', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:900, fontSize:13, color:'#fff' }}>A</div>
            <div>
              <div style={{ fontSize:12.5, fontWeight:700, color:'#06344F', lineHeight:1.2 }}>AGENDO Integra</div>
              <div style={{ fontSize:9.5, color:'#9BBFCE', marginTop:1 }}>Gestão integrada para OSCs</div>
            </div>
          </div>
        )}
        {colapsado && !isMobile && (
          <img src="/agendo-logo.png" alt="AGENDO" style={{ height:32, width:32, objectFit:'contain', display:'block' }} />
        )}
        {!isMobile && (
          <button onClick={toggleColapsado} title={colapsado ? 'Expandir menu' : 'Recolher menu'}
            style={{ border:'none', background:'none', cursor:'pointer', color:'rgba(155,191,206,0.6)', padding:4, lineHeight:1, display:'flex' }}>
            <i className={`ti ti-layout-sidebar-left-${colapsado ? 'expand' : 'collapse'}`} style={{ fontSize: 17 }} />
          </button>
        )}
        {isMobile && (
          <button onClick={() => setMenuAberto(false)} style={{ border:'none', background:'none', fontSize:18, cursor:'pointer', color:'rgba(155,191,206,0.7)', padding:'4px', lineHeight:1 }}><i className="ti ti-x" style={{fontSize:18}} /></button>
        )}
      </div>

      {/* Card OSC — logo TEIAA */}
      {!(colapsado && !isMobile) && (
        <div style={{ margin:'10px 12px', background:'rgba(255,255,255,0.8)', border:'0.5px solid #E0DDD5', borderRadius:12, padding:'10px 12px' }}>
          <div style={{ display:'flex', gap:1.5, alignItems:'center', marginBottom:5 }}>
            <img src="/logo.png" alt="TEIAA" style={{ height:52, width:'auto', objectFit:'contain', maxWidth:160, display:'block' }}
              onError={e => {
                e.target.style.display='none'
                e.target.nextSibling.style.display='flex'
              }}
            />
            <div style={{ display:'none', gap:1, alignItems:'center' }}>
              {[['T','#0E7EA8'],['E','#96C11F'],['I','#06344F'],['A','#0E7EA8'],['A','#96C11F']].map(([l,cor])=>(
                <span key={l+cor} style={{ fontSize:14, fontWeight:900, color:cor }}>{l}</span>
              ))}
            </div>
          </div>
          <div style={{ fontSize:10.5, fontWeight:600, color:'#1A1F1C', lineHeight:1.35 }}>Associação TEIAA</div>
          <div style={{ fontSize:9, color:'#888780', marginTop:3 }}>CNPJ 27.837.768/0001-70</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:7, border:'0.5px solid rgba(14,126,168,.25)', background:'rgba(14,126,168,.07)', color:'#0E7EA8', padding:'3px 9px', borderRadius:99, fontSize:9.5, fontWeight:600 }}>
            <i className="ti ti-shield-check" style={{ fontSize:10 }} />
            {perfilLabel}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="sidebar-scroll" style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>

        {p === 'tecnico' ? (<>
          <NavSecao colapsado={colapsado} label="TEAcolher" />
          <NavItem colapsado={colapsado} to="/painel-tecnico" icon="home" label="Início" visivel onClick={fecharMenu} />
          <NavItem colapsado={colapsado} to="/atendimentos" icon="calendar-event" label="Minha agenda" visivel onClick={fecharMenu} />
          <NavItem colapsado={colapsado} to="/painel-tecnico?aba=meus_usuarios" icon="users" label="Meus usuários" visivel onClick={fecharMenu} />
        </>) : p === 'operacional' ? (<>
          <NavSecao colapsado={colapsado} label="TEAcolher" />
          <NavItem colapsado={colapsado} to="/painel-operacional" icon="home" label="Início" visivel onClick={fecharMenu} />
          <NavItem colapsado={colapsado} to="/usuarios-atendidos" icon="user-plus" label="Cadastrar usuário" visivel onClick={fecharMenu} />
          <NavItem colapsado={colapsado} to="/atendimentos" icon="calendar-plus" label="Agenda" visivel onClick={fecharMenu} />
          <NavItem colapsado={colapsado} to="/painel-operacional?aba=profissionais" icon="users-group" label="Por profissional" visivel onClick={fecharMenu} />
        </>) : (<>
          <NavSecao colapsado={colapsado} label="Principal" />
          <NavItem colapsado={colapsado} to="/painel-admin"       icon="layout-dashboard"  label="Painel"              visivel={p==='admin'} onClick={fecharMenu} />
          <NavItem colapsado={colapsado} to="/painel-diretoria"   icon="layout-dashboard"  label="Acompanhamento"      visivel={p==='diretoria'} onClick={fecharMenu} />

          {p === 'admin' && (<>
            <NavSecao colapsado={colapsado} label="Operação diária" aberta={secVisivel("Operação diária")} onToggle={() => toggleSec("Operação diária")} />
            {secVisivel("Operação diária") && (<>
              <NavItem colapsado={colapsado} to="/importar"           icon="file-upload"       label="Importar extrato"    visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/conciliacao"        icon="checks"            label="Conciliação"         visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/lancamentos"        icon="list-details"      label="Lançamentos"         visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/pendencias"         icon="alert-triangle"    label="Pendências"          visivel={p==='admin'} onClick={fecharMenu} badge={badgePendencias} />
            </>)}

            <NavSecao colapsado={colapsado} label="Gestão financeira" aberta={secVisivel("Gestão financeira")} onToggle={() => toggleSec("Gestão financeira")} />
            {secVisivel("Gestão financeira") && (<>
              <NavItem colapsado={colapsado} to="/fornecedores"       icon="building-store"    label="Fornecedores"        visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/aplicacoes"         icon="chart-line"        label="Aplicações"          visivel={p==='admin'} onClick={fecharMenu} />
            </>)}
          </>)}

          <NavSecao colapsado={colapsado} label="Programas e projetos" aberta={secVisivel("Programas e projetos")} onToggle={() => toggleSec("Programas e projetos")} />
          {secVisivel("Programas e projetos") && (<>
            <NavItem colapsado={colapsado} to="/planos-execucao"    icon="clipboard-check"   label="Plano de Ação"       visivel={p==='admin'} onClick={fecharMenu} />
            <NavItem colapsado={colapsado} to="/projetos"           icon="folder"            label="Projetos"            visivel={p==='admin'} onClick={fecharMenu} />
            <NavItem colapsado={colapsado} to="/atendimentos"       icon="clipboard-list"    label="Atendimentos"        visivel={p==='admin'} onClick={fecharMenu} />
            <NavItem colapsado={colapsado} to="/usuarios-atendidos" icon="users"             label="Usuários Atendidos"  visivel={p==='admin'} onClick={fecharMenu} />
            <NavItem colapsado={colapsado} to="/equipe"             icon="users-group"       label="Equipe"              visivel={p==='admin'} onClick={fecharMenu} />
            <NavItem colapsado={colapsado} to="/doacoes"            icon="gift"              label="Doações"             visivel={p==='admin'} onClick={fecharMenu} />
            <NavItem colapsado={colapsado} to="/eventos-campanhas"  icon="calendar-event"    label="Eventos e Campanhas" visivel={p==='admin'} onClick={fecharMenu} />
          </>)}

          {(p === 'admin' || p === 'diretoria') && (<>
            <NavSecao colapsado={colapsado} label="Relatórios" aberta={secVisivel("Relatórios")} onToggle={() => toggleSec("Relatórios")} />
            {secVisivel("Relatórios") && (<>
              <NavItem colapsado={colapsado} to="/relatorios"         icon="report-analytics"  label="Central de Relatórios"  visivel={p==='admin'||p==='diretoria'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/fechamento"         icon="checkup-list"      label="Fechamento / Conselho"  visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/prestacao-contas"   icon="file-certificate"  label="Prestação de Contas"    visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/transparencia"      icon="world"             label="Transparência Pública"  visivel={p==='admin'} onClick={fecharMenu} />
            </>)}

            <NavSecao colapsado={colapsado} label="Institucional" aberta={secVisivel("Institucional")} onToggle={() => toggleSec("Institucional")} />
            {secVisivel("Institucional") && (<>
              <NavItem colapsado={colapsado} to="/instituicao"        icon="building"           label="Instituição"         visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/parcerias"          icon="file-invoice"       label="Instrumentos"        visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/documentos-fiscais" icon="files"              label="Documentos"          visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/patrimonio"         icon="building-warehouse" label="Patrimônio"          visivel={p==='admin'} onClick={fecharMenu} />
            </>)}

            <NavSecao colapsado={colapsado} label="Configurações" aberta={secVisivel("Configurações")} onToggle={() => toggleSec("Configurações")} />
            {secVisivel("Configurações") && (<>
              <NavItem colapsado={colapsado} to="/contas"             icon="building-bank"     label="Contas bancárias"    visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/categorias"         icon="tag"               label="Categorias"          visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/classificacoes"     icon="list-tree"         label="Classificações"      visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/usuarios"           icon="user-cog"          label="Usuários"            visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/backup"             icon="database-export"   label="Backup"              visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/configuracoes"      icon="alert-octagon"     label="Zona de perigo"      visivel={p==='admin'} onClick={fecharMenu} />
              <NavItem colapsado={colapsado} to="/mensagens-dev"      icon="message-circle"    label="Mensagens"           visivel={p==='admin'} onClick={fecharMenu} />
            </>)}
          </>)}
        </>)}
      </div>

      {/* Rodapé usuário */}
      <div style={{ padding: colapsado && !isMobile ? '.7rem 0' : '.7rem 1.1rem', borderTop: '0.5px solid #E0DDD5', display: 'flex', flexDirection: colapsado && !isMobile ? 'column' : 'row', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
        <div onClick={() => navigate('/minha-conta')} title="Minha conta"
          style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(14,126,168,0.2)', flexShrink: 0, cursor: 'pointer' }}>
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} alt={perfil?.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 28, height: 28, background: 'rgba(14,126,168,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0E7EA8' }}>
                {(perfil?.nome || 'U').slice(0,2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        {!(colapsado && !isMobile) && <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#1A1F1C', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {perfil?.nome || 'Usuário'}
          </div>
          <div style={{ fontSize: 10, color: '#888780' }}>{perfil?.bio || perfilLabel}</div>
        </div>}
        <button onClick={handleLogout} title="Sair"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#C8C6BC', padding: 4, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
          <i className="ti ti-logout" style={{ fontSize: 15 }} />
        </button>
      </div>

    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #F8F7F2 0%, #EEF4E8 100%)', overflow: 'hidden' }}>
      <style>{`
        .nav-item:hover { background: rgba(14,126,168,0.06) !important; color: #0E7EA8 !important; }
        .sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #D3D1C7; border-radius: 99px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #B4B2A9; }
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: #D3D1C7 transparent; }
        @keyframes drawerIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .drawer-mobile { animation: drawerIn .22s cubic-bezier(.2,.8,.3,1); }
        .drawer-overlay { animation: fadeIn .18s ease; }
        .busca-item:hover { background: rgba(14,126,168,0.08) !important; }
      `}</style>

      {/* Marca d'água AGENDO */}
      <img src="/agendo-logo.png" alt="" aria-hidden="true" style={{ position: 'fixed', bottom: 0, left: 0, width: '32vw', maxWidth: 420, opacity: 0.045, pointerEvents: 'none', zIndex: 0, userSelect: 'none' }} />

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
          <div className="drawer-mobile" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, width: 240, overflowY: 'auto', background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(12px)' }}>
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
            <img src="/logo.png" alt="TEIAA" style={{ height: 52, width: 'auto', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none' }} />
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500, color: '#fff', background: perfilCor }}>
              {perfilLabel}
            </span>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div key={location.pathname} className="page-anim" style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
            <Outlet />
          </div>
        </div>

        <div style={{ padding: '5px 1.25rem', borderTop: '0.5px solid #E8E6DE', background: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#B4B2A9' }}>AGENDO Integra · TEIAA · <span style={{ cursor:'pointer', textDecoration:'underline', textUnderlineOffset:2 }} onClick={() => setBuscaAberta(true)}>busca rápida Ctrl+K</span></span>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button onClick={() => setFeedbackAberto(true)}
              style={{ fontSize:10, color:'#B4B2A9', background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:3 }}
              title="Fale com o desenvolvedor">
              <i className="ti ti-message-circle" style={{ fontSize:11 }} /> Fale com o dev
            </button>
            <span style={{ fontSize: 10, color: '#D3D1C7' }}>Agendo · CNPJ 56.059.476/0001-52</span>
          </div>
        </div>

      </div>

      {/* Modal Fale com o Desenvolvedor */}
      {feedbackAberto && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => { if (e.target === e.currentTarget) setFeedbackAberto(false) }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:420, maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#06344F' }}>Fale com o desenvolvedor</div>
                <div style={{ fontSize:11, color:'#888780', marginTop:2 }}>Sua mensagem vai direto para o Rangel</div>
              </div>
              <button onClick={() => setFeedbackAberto(false)}
                style={{ background:'none', border:'none', fontSize:22, color:'#B4B2A9', cursor:'pointer', lineHeight:1, padding:0 }}>×</button>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#5F5E5A', marginBottom:8 }}>Tipo</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {[
                  { val:'sugestao', label:'💡 Sugestão' },
                  { val:'problema', label:'🐛 Problema' },
                  { val:'duvida',   label:'❓ Dúvida' },
                  { val:'elogio',   label:'⭐ Elogio' },
                ].map(t => (
                  <button key={t.val} onClick={() => setFeedbackTipo(t.val)}
                    style={{ fontSize:11, padding:'5px 12px', borderRadius:99, cursor:'pointer',
                      border:'0.5px solid ' + (feedbackTipo===t.val ? '#0E7EA8' : '#D3D1C7'),
                      background: feedbackTipo===t.val ? '#0E7EA8' : 'transparent',
                      color: feedbackTipo===t.val ? '#fff' : '#5F5E5A' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#5F5E5A', marginBottom:6 }}>Mensagem</div>
              <textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)}
                placeholder="Descreva sua sugestão, problema ou dúvida..."
                rows={4} style={{ width:'100%', boxSizing:'border-box', fontSize:13, padding:'8px 10px', border:'0.5px solid #D3D1C7', borderRadius:8, resize:'vertical', fontFamily:'inherit' }} />
            </div>

            {feedbackOk === 'ok' && (
              <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, background:'#EAF3DE', color:'#3B6D11', marginBottom:12 }}>
                ✓ Mensagem enviada! Obrigado.
              </div>
            )}
            {feedbackOk === 'erro' && (
              <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, background:'#FEF2F2', color:'#A32D2D', marginBottom:12 }}>
                Erro ao enviar. Tente novamente.
              </div>
            )}

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setFeedbackAberto(false)}
                style={{ fontSize:12, padding:'7px 16px', borderRadius:8, border:'0.5px solid #D3D1C7', background:'transparent', color:'#5F5E5A', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={enviarFeedback} disabled={feedbackEnviando || !feedbackMsg.trim()}
                style={{ fontSize:12, padding:'7px 18px', borderRadius:8, border:'none', background:'#0E7EA8', color:'#fff', cursor:'pointer', fontWeight:600,
                  opacity: (feedbackEnviando || !feedbackMsg.trim()) ? 0.6 : 1 }}>
                {feedbackEnviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
