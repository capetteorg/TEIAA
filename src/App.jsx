import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'

// Cada página vira um pedaço separado do app (lazy): quem entra baixa só as
// telas do próprio perfil — o primeiro acesso fica leve mesmo no celular.
const Sociedade = lazy(() => import('./pages/Sociedade'))
const Instituicao = lazy(() => import('./pages/Instituicao'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const Equipe = lazy(() => import('./pages/Equipe'))
const Projetos = lazy(() => import('./pages/Projetos'))
const Atendimentos = lazy(() => import('./pages/Atendimentos'))
const UsuariosAtendidos = lazy(() => import('./pages/UsuariosAtendidos'))
const PlanosExecucao = lazy(() => import('./pages/PlanosExecucao'))
const PainelOperacional = lazy(() => import('./pages/PainelOperacional'))
const PainelTecnico = lazy(() => import('./pages/PainelTecnico'))
const RelatoriosCentral = lazy(() => import('./pages/RelatoriosCentral'))
const CensoSuas = lazy(() => import('./pages/CensoSuas'))
const PrestacaoContas = lazy(() => import('./pages/PrestacaoContas'))
const Backup = lazy(() => import('./pages/Backup'))
const MinhaConta = lazy(() => import('./pages/MinhaConta'))
const MensagensDesenvolvedor = lazy(() => import('./pages/MensagensDesenvolvedor'))
const PainelDiretoria = lazy(() => import('./pages/PainelDiretoria'))
const PainelAdmin = lazy(() => import('./pages/PainelAdmin'))
const Pendencias = lazy(() => import('./pages/Pendencias'))
const NovaSenha = lazy(() => import('./pages/NovaSenha'))

function CarregandoTela() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh', color:'#B4B2A9', fontSize:13, gap:8 }}>
      <span className="spin" style={{ width:14, height:14, border:'2px solid #D3D1C7', borderTopColor:'#0E7EA8', borderRadius:'50%', display:'inline-block', animation:'girar .7s linear infinite' }} />
      Carregando...
      <style>{`@keyframes girar { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function RotaProtegida({ children, perfisPermitidos }) {
  const { user, perfil, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (perfisPermitidos && !perfisPermitidos.includes(perfil?.perfil)) {
    const p = perfil?.perfil
    if (p === 'admin') return <Navigate to="/painel-admin" replace />
    if (p === 'diretoria') return <Navigate to="/painel-diretoria" replace />
    if (p === 'operacional') return <Navigate to="/painel-operacional" replace />
    if (p === 'tecnico') return <Navigate to="/painel-tecnico" replace />
    return <Navigate to="/login" replace />
  }
  return children
}

// Quem entra mas não tem perfil na tabela "usuarios" ficava preso: /login
// mandava pra cá e daqui voltava pra /login, em loop, sem nenhuma mensagem.
function SemPerfil() {
  const { logout } = useAuth()
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem 1rem', background:'linear-gradient(135deg, #F8F7F2 0%, #EEF4E8 100%)' }}>
      <div style={{ background:'rgba(255,255,255,0.95)', border:'0.5px solid #E8E6DE', borderRadius:16, boxShadow:'0 2px 24px rgba(0,0,0,0.08)', padding:'1.75rem', maxWidth:420, textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:600, color:'#2C2C2A', marginBottom:8 }}>Acesso sem perfil definido</div>
        <div style={{ fontSize:12.5, color:'#5F5E5A', lineHeight:1.7, marginBottom:'1.25rem' }}>
          Seu login funcionou, mas esta conta ainda não tem um perfil liberado no sistema.
          Peça ao administrador para cadastrá-la em Usuários.
        </div>
        <button onClick={logout} style={{ padding:'9px 20px', background:'#0E7EA8', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Sair e tentar outra conta
        </button>
      </div>
    </div>
  )
}

function RedirecionarPerfil() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  if (p === 'admin') return <Navigate to="/painel-admin" replace />
  if (p === 'diretoria') return <Navigate to="/painel-diretoria" replace />
  if (p === 'operacional') return <Navigate to="/painel-operacional" replace />
  if (p === 'tecnico') return <Navigate to="/painel-tecnico" replace />
  return <SemPerfil />
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return null

  return (
    <Suspense fallback={<CarregandoTela />}>
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <RedirecionarPerfil />} />
      <Route path="transparencia" element={<Sociedade />} />
      <Route path="/nova-senha" element={<NovaSenha />} />

      <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<RedirecionarPerfil />} />
        <Route path="painel" element={<RedirecionarPerfil />} />
        <Route path="painel-admin" element={<RotaProtegida perfisPermitidos={['admin']}><PainelAdmin /></RotaProtegida>} />
        <Route path="painel-operacional" element={<RotaProtegida perfisPermitidos={['operacional']}><PainelOperacional /></RotaProtegida>} />
        <Route path="painel-tecnico" element={<RotaProtegida perfisPermitidos={['tecnico']}><PainelTecnico /></RotaProtegida>} />
        <Route path="painel-diretoria" element={<RotaProtegida perfisPermitidos={['diretoria']}><PainelDiretoria /></RotaProtegida>} />
        <Route path="relatorios" element={<RotaProtegida perfisPermitidos={['admin','diretoria']}><RelatoriosCentral /></RotaProtegida>} />
        <Route path="censo-suas" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><CensoSuas /></RotaProtegida>} />
        <Route path="prestacao-contas" element={<RotaProtegida perfisPermitidos={['admin']}><PrestacaoContas /></RotaProtegida>} />
        <Route path="instituicao" element={<RotaProtegida perfisPermitidos={['admin']}><Instituicao /></RotaProtegida>} />
        <Route path="pendencias" element={<RotaProtegida perfisPermitidos={['admin']}><Pendencias /></RotaProtegida>} />
        <Route path="projetos" element={<RotaProtegida perfisPermitidos={['admin']}><Projetos /></RotaProtegida>} />
        <Route path="planos-execucao" element={<RotaProtegida perfisPermitidos={['admin']}><PlanosExecucao /></RotaProtegida>} />
        <Route path="usuarios-atendidos" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><UsuariosAtendidos /></RotaProtegida>} />
        <Route path="atendimentos" element={<RotaProtegida perfisPermitidos={['admin','operacional','tecnico']}><Atendimentos /></RotaProtegida>} />
        <Route path="equipe" element={<RotaProtegida perfisPermitidos={['admin']}><Equipe /></RotaProtegida>} />
        <Route path="usuarios" element={<RotaProtegida perfisPermitidos={['admin']}><Usuarios /></RotaProtegida>} />
        <Route path="configuracoes" element={<RotaProtegida perfisPermitidos={['admin']}><Configuracoes /></RotaProtegida>} />
        <Route path="backup" element={<RotaProtegida perfisPermitidos={['admin']}><Backup /></RotaProtegida>} />
        <Route path="minha-conta" element={<RotaProtegida><MinhaConta /></RotaProtegida>} />
        <Route path="mensagens-dev" element={<RotaProtegida perfisPermitidos={['admin']}><MensagensDesenvolvedor /></RotaProtegida>} />
      </Route>

      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
    </Suspense>
  )
}
