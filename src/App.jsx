import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Painel from './pages/Painel'
import Sociedade from './pages/Sociedade'
import Instituicao from './pages/Instituicao'
import Usuarios from './pages/Usuarios'
import Configuracoes from './pages/Configuracoes'
import Equipe from './pages/Equipe'
import Projetos from './pages/Projetos'
import Atendimentos from './pages/Atendimentos'
import UsuariosAtendidos from './pages/UsuariosAtendidos'
import PlanosExecucao from './pages/PlanosExecucao'
import PainelOperacional from './pages/PainelOperacional'
import PainelTecnico from './pages/PainelTecnico'
import RelatoriosCentral from './pages/RelatoriosCentral'
import PrestacaoContas from './pages/PrestacaoContas'
import Backup from './pages/Backup'
import MinhaConta from './pages/MinhaConta'
import MensagensDesenvolvedor from './pages/MensagensDesenvolvedor'
import PainelDiretoria from './pages/PainelDiretoria'
import PainelAdmin from './pages/PainelAdmin'
import Pendencias from './pages/Pendencias'
import NovaSenha from './pages/NovaSenha'

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
  )
}
