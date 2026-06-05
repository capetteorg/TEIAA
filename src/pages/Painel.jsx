import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Painel() {
  const { perfil } = useAuth()
  const p = perfil?.perfil
  const navigate = useNavigate()

  useEffect(() => {
    if (p === 'admin') navigate('/painel-admin', { replace: true })
    else if (p === 'diretoria') navigate('/painel-diretoria', { replace: true })
    else if (p === 'operacional') navigate('/painel-operacional', { replace: true })
  }, [p])

  return null
}
