import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Painel() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const p = perfil?.perfil
    if (p === 'admin') navigate('/painel-admin', { replace: true })
    else if (p === 'operacional') navigate('/painel-operacional', { replace: true })
    else if (p === 'diretoria') navigate('/painel-diretoria', { replace: true })
  }, [perfil])

  return null
}
