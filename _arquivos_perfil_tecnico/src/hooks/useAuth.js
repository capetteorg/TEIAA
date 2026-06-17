import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const perfilCarregado = useRef(null) // guarda o userId já carregado

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        await carregarPerfil(session.user.id, mounted)
      } else {
        setUser(null)
        setPerfil(null)
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      const novoUserId = session?.user?.id || null

      // Só atualiza se o usuário mudou
      if (novoUserId !== perfilCarregado.current) {
        setUser(session?.user ?? null)
        if (session?.user) {
          carregarPerfil(session.user.id, mounted)
        } else {
          setPerfil(null)
          perfilCarregado.current = null
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function carregarPerfil(userId, mounted = true) {
    if (perfilCarregado.current === userId) return // já carregado
    const { data } = await supabase
      .from('usuarios')
      .select('perfil, nome, bio, cor_avatar, avatar_url, foto_position')
      .eq('id', userId)
      .single()
    if (!mounted) return
    perfilCarregado.current = userId
    setPerfil(data)
    setLoading(false)
  }

  async function login(email, senha) {
    perfilCarregado.current = null // resetar ao fazer login
    return supabase.auth.signInWithPassword({ email, password: senha })
  }

  async function logout() {
    perfilCarregado.current = null
    return supabase.auth.signOut()
  }

  return { user, perfil, loading, login, logout }
}
