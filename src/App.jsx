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

function RedirecionarPerfil() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  if (p === 'admin') return <Navigate to="/painel-admin" replace />
  if (p === 'diretoria') return <Navigate to="/painel-diretoria" replace />
  if (p === 'operacional') return <Navigate to="/painel-operacional" replace />
  if (p === 'tecnico') return <Navigate to="/painel-tecnico" replace />
  return <Navigate to="/login" replace />
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
