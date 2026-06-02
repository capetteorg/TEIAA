import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) carregarPerfil(session.user.id)
      else setLoading(false)
    })

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) carregarPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function carregarPerfil(userId) {
    const { data } = await supabase
      .from('usuarios')
      .select('perfil, nome')
      .eq('id', userId)
      .single()
    setPerfil(data)
    setLoading(false)
  }

  async function login(email, senha) {
    return supabase.auth.signInWithPassword({ email, password: senha })
  }

  async function logout() {
    return supabase.auth.signOut()
  }

  return { user, perfil, loading, login, logout }
}
