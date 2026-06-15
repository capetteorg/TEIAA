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
import Sociedade from './pages/Sociedade'
import Instituicao from './pages/Instituicao'
import Categorias from './pages/Categorias'
import Contas from './pages/Contas'
import Usuarios from './pages/Usuarios'
import Classificacoes from './pages/Classificacoes'
import Configuracoes from './pages/Configuracoes'
import ControleDividas from './pages/ControleDividas'
import Equipe from './pages/Equipe'
import Projetos from './pages/Projetos'
import Atendimentos from './pages/Atendimentos'
import UsuariosAtendidos from './pages/UsuariosAtendidos'
import Doacoes from './pages/Doacoes'
import PlanosExecucao from './pages/PlanosExecucao'
import PainelOperacional from './pages/PainelOperacional'
import RelatoriosCentral from './pages/RelatoriosCentral'
import EventosCampanhas from './pages/EventosCampanhas'
import Cobrancas from './pages/Cobrancas'
import PrestacaoContas from './pages/PrestacaoContas'
import Backup from './pages/Backup'
import MinhaConta from './pages/MinhaConta'
import MensagensDesenvolvedor from './pages/MensagensDesenvolvedor'
import PainelDiretoria from './pages/PainelDiretoria'
import PainelAdmin from './pages/PainelAdmin'
import Parcerias from './pages/Parcerias'
import ParceriaDetalhe from './pages/ParceriaDetalhe'
import Fechamento from './pages/Fechamento'
import Fornecedores from './pages/Fornecedores'
import FornecedorHistorico from './pages/FornecedorHistorico'
import LancamentosLista from './pages/LancamentosLista'
import Pendencias from './pages/Pendencias'
import DocumentosFiscais from './pages/DocumentosFiscais'
import Patrimonio from './pages/Patrimonio'
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
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return null

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/painel" replace />} />
      <Route path="/transparencia" element={<Sociedade />} />
      <Route path="/nova-senha" element={<NovaSenha />} />

      <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<Navigate to="/painel-admin" replace />} />
        <Route path="painel" element={<Painel />} />
        <Route path="painel-admin" element={<RotaProtegida perfisPermitidos={['admin']}><PainelAdmin /></RotaProtegida>} />
        <Route path="painel-operacional" element={<RotaProtegida perfisPermitidos={['operacional']}><PainelOperacional /></RotaProtegida>} />
        <Route path="painel-diretoria" element={<RotaProtegida perfisPermitidos={['diretoria']}><PainelDiretoria /></RotaProtegida>} />
        <Route path="parcerias" element={<RotaProtegida perfisPermitidos={['admin']}><Parcerias /></RotaProtegida>} />
        <Route path="parcerias/:id" element={<RotaProtegida perfisPermitidos={['admin']}><ParceriaDetalhe /></RotaProtegida>} />
        <Route path="despesas" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><Lancamentos tipo="despesa" /></RotaProtegida>} />
        <Route path="entradas" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><Entradas /></RotaProtegida>} />
        <Route path="importar" element={<RotaProtegida perfisPermitidos={['admin']}><Importar /></RotaProtegida>} />
        <Route path="conciliacao" element={<RotaProtegida perfisPermitidos={['admin']}><Conciliacao /></RotaProtegida>} />
        <Route path="aplicacoes" element={<RotaProtegida perfisPermitidos={['admin']}><Aplicacoes /></RotaProtegida>} />
        <Route path="relatorios" element={<RotaProtegida perfisPermitidos={['admin','diretoria']}><RelatoriosCentral /></RotaProtegida>} />
        <Route path="prestacao-contas" element={<RotaProtegida perfisPermitidos={['admin']}><PrestacaoContas /></RotaProtegida>} />
        <Route path="instituicao" element={<RotaProtegida perfisPermitidos={['admin']}><Instituicao /></RotaProtegida>} />
        {/* /documentos redireciona para documentos-fiscais (aba arquivos) */}
        <Route path="documentos" element={<Navigate to="/documentos-fiscais" replace />} />
        <Route path="documentos-fiscais" element={<RotaProtegida perfisPermitidos={['admin']}><DocumentosFiscais /></RotaProtegida>} />
        <Route path="patrimonio" element={<RotaProtegida perfisPermitidos={['admin']}><Patrimonio /></RotaProtegida>} />
        <Route path="pendencias" element={<RotaProtegida perfisPermitidos={['admin']}><Pendencias /></RotaProtegida>} />
        <Route path="lancamentos" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><LancamentosLista /></RotaProtegida>} />
        <Route path="fornecedores" element={<RotaProtegida perfisPermitidos={['admin']}><Fornecedores /></RotaProtegida>} />
        <Route path="historico-fornecedor" element={<RotaProtegida perfisPermitidos={['admin']}><FornecedorHistorico /></RotaProtegida>} />
        <Route path="projetos" element={<RotaProtegida perfisPermitidos={['admin']}><Projetos /></RotaProtegida>} />
        <Route path="planos-execucao" element={<RotaProtegida perfisPermitidos={['admin']}><PlanosExecucao /></RotaProtegida>} />
        <Route path="eventos-campanhas" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><EventosCampanhas /></RotaProtegida>} />
        <Route path="doacoes" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><Doacoes /></RotaProtegida>} />
        <Route path="usuarios-atendidos" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><UsuariosAtendidos /></RotaProtegida>} />
        <Route path="atendimentos" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><Atendimentos /></RotaProtegida>} />
        <Route path="equipe" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><Equipe /></RotaProtegida>} />
        <Route path="controle-dividas" element={<RotaProtegida perfisPermitidos={['admin','diretoria']}><ControleDividas /></RotaProtegida>} />
        <Route path="cobrancas" element={<RotaProtegida perfisPermitidos={['admin','operacional']}><Cobrancas /></RotaProtegida>} />
        <Route path="categorias" element={<RotaProtegida perfisPermitidos={['admin']}><Categorias /></RotaProtegida>} />
        <Route path="contas" element={<RotaProtegida perfisPermitidos={['admin']}><Contas /></RotaProtegida>} />
        <Route path="usuarios" element={<RotaProtegida perfisPermitidos={['admin']}><Usuarios /></RotaProtegida>} />
        <Route path="classificacoes" element={<RotaProtegida perfisPermitidos={['admin']}><Classificacoes /></RotaProtegida>} />
        <Route path="configuracoes" element={<RotaProtegida perfisPermitidos={['admin']}><Configuracoes /></RotaProtegida>} />
        <Route path="fechamento" element={<RotaProtegida perfisPermitidos={['admin']}><Fechamento /></RotaProtegida>} />
        <Route path="backup" element={<RotaProtegida perfisPermitidos={['admin']}><Backup /></RotaProtegida>} />
        <Route path="minha-conta" element={<RotaProtegida><MinhaConta /></RotaProtegida>} />
        <Route path="mensagens-dev" element={<RotaProtegida perfisPermitidos={['admin']}><MensagensDesenvolvedor /></RotaProtegida>} />
      </Route>

      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
  )
}
