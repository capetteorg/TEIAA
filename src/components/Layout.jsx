import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const LOGO = [['C','#F5C800'],['A','#F4821F'],['P','#8B2FC9'],['E','#E8212A'],['T','#6BBF2B'],['T','#4A8FD4'],['E','#E8207A']]

function NavItem({ to, icon, label, visivel = true }) {
  if (!visivel) return null
  return (
    <NavLink to={to} style={({isActive})=>({
      display:'flex',alignItems:'center',gap:9,padding:'7px 1.25rem',
      fontSize:12.5,color:isActive?'#2C2C2A':'#5F5E5A',
      background:isActive?'#F8F7F2':'transparent',
      fontWeight:isActive?500:'normal',
      borderRight:isActive?'2px solid #6BBF2B':'2px solid transparent',
      textDecoration:'none',transition:'background .15s',
    })}>
      <i className={`ti ti-${icon}`} style={{fontSize:14}} />
      {label}
    </NavLink>
  )
}

function NavSecao({ label }) {
  return <div style={{fontSize:9.5,color:'#B4B2A9',padding:'10px 1.25rem 3px',textTransform:'uppercase',letterSpacing:'.08em'}}>{label}</div>
}

export default function Layout() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const p = perfil?.perfil

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{display:'flex',height:'100vh',background:'#F8F7F2'}}>
      <div style={{width:215,background:'#fff',borderRight:'0.5px solid #E0DDD5',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'1rem 1.25rem .75rem',borderBottom:'0.5px solid #E0DDD5',display:'flex',alignItems:'center',gap:8}}>
          <div style={{display:'flex',gap:2,alignItems:'center'}}>
            {LOGO.map(([l,c])=><span key={l+c} style={{fontSize:17,fontWeight:500,color:c,lineHeight:1}}>{l}</span>)}
          </div>
          <div style={{fontSize:10,color:'#888780',marginLeft:2}}>desde 1974</div>
        </div>

        <div style={{overflowY:'auto',flex:1}}>
          <NavSecao label="Principal" />
          <NavItem to="/painel"            icon="layout-dashboard"   label="Painel" />
          <NavItem to="/despesas"          icon="receipt"            label="Lançar despesa"          visivel={p==='admin'||p==='operacional'} />
          <NavItem to="/entradas"          icon="arrow-bar-to-down"  label="Lançar entrada"          visivel={p==='admin'||p==='operacional'} />
          <NavItem to="/importar"          icon="upload"             label="Importar extrato"        visivel={p==='admin'} />
          <NavItem to="/conciliacao"       icon="checks"             label="Conciliação"             visivel={p==='admin'} />
          <NavItem to="/aplicacoes"        icon="chart-line"         label="Aplicações"              visivel={p==='admin'} />
          <NavItem to="/relatorios"        icon="file-text"          label="Relatórios"              visivel={p==='admin'||p==='diretoria'} />
          <NavItem to="/prestacao-contas"  icon="file-certificate"   label="Prestação Emenda/Edital" visivel={p==='admin'} />

          <NavSecao label="Gestão" />
          <NavItem to="/eventos"           icon="calendar-event"     label="Eventos"                 visivel={p==='admin'} />
          <NavItem to="/campanhas"         icon="target"             label="Campanhas"               visivel={p==='admin'} />
          <NavItem to="/funcionarios"      icon="id-badge-2"         label="Funcionários"            visivel={p==='admin'||p==='diretoria'} />
          <NavItem to="/cobrancas"         icon="receipt-2"          label="Cobranças"               visivel={p==='admin'||p==='operacional'} />

          <NavSecao label="Configurações" />
          <NavItem to="/contas"            icon="building-bank"      label="Contas"                  visivel={p==='admin'} />
          <NavItem to="/categorias"        icon="tag"                label="Categorias"              visivel={p==='admin'} />
          <NavItem to="/plano-trabalho"    icon="list-details"       label="Plano de trabalho"       visivel={p==='admin'} />
          <NavItem to="/classificacoes"    icon="list-check"         label="Classificações"          visivel={p==='admin'} />
          <NavItem to="/usuarios"          icon="users"              label="Usuários"                visivel={p==='admin'} />
          <NavItem to="/backup"            icon="database-export"    label="Backup"                  visivel={p==='admin'} />
          <NavItem to="/configuracoes"     icon="settings"           label="Dados de teste"          visivel={p==='admin'} />
        </div>

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

      <div style={{flex:1,overflowY:'auto'}}>
        <Outlet />
      </div>
    </div>
  )
}
