import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Painel from './pages/Painel'
import Lancamentos from './pages/Lancamentos'
import Importar from './pages/Importar'
import Conciliacao from './pages/Conciliacao'
import Entradas from './pages/Entradas'
import Aplicacoes from './pages/Aplicacoes'
import Relatorios from './pages/Relatorios'
import Sociedade from './pages/Sociedade'
import Categorias from './pages/Categorias'
import Contas from './pages/Contas'
import Usuarios from './pages/Usuarios'
import Classificacoes from './pages/Classificacoes'
import Configuracoes from './pages/Configuracoes'

function RotaProtegida({ children, perfisPermitidos }) {
  const { user, perfil, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#888'}}>Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (perfisPermitidos && !perfisPermitidos.includes(perfil?.perfil)) return <Navigate to="/painel" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#888'}}>Carregando...</div>

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/painel" replace />} />
      <Route path="/transparencia" element={<Sociedade />} />

      <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<Navigate to="/painel" replace />} />
        <Route path="painel" element={<Painel />} />
        <Route path="despesas" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><Lancamentos tipo="despesa" /></RotaProtegida>} />
        <Route path="entradas" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><Entradas /></RotaProtegida>} />
        <Route path="importar" element={<RotaProtegida perfisPermitidos={['admin']}><Importar /></RotaProtegida>} />
        <Route path="conciliacao" element={<RotaProtegida perfisPermitidos={['admin']}><Conciliacao /></RotaProtegida>} />
        <Route path="aplicacoes" element={<RotaProtegida perfisPermitidos={['admin']}><Aplicacoes /></RotaProtegida>} />
        <Route path="relatorios" element={<RotaProtegida perfisPermitidos={['admin','diretoria']}><Relatorios /></RotaProtegida>} />
        <Route path="categorias" element={<RotaProtegida perfisPermitidos={['admin']}><Categorias /></RotaProtegida>} />
        <Route path="contas" element={<RotaProtegida perfisPermitidos={['admin']}><Contas /></RotaProtegida>} />
        <Route path="usuarios" element={<RotaProtegida perfisPermitidos={['admin']}><Usuarios /></RotaProtegida>} />
        <Route path="classificacoes" element={<RotaProtegida perfisPermitidos={['admin']}><Classificacoes /></RotaProtegida>} />
        <Route path="configuracoes" element={<RotaProtegida perfisPermitidos={['admin']}><Configuracoes /></RotaProtegida>} />
      </Route>

      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
  )
}
