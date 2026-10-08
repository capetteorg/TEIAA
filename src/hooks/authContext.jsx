import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// =============================================
// AUTENTICAÇÃO — Context único.
// Antes, useAuth era um hook comum: CADA tela que o chamava repetia getSession(),
// a consulta do perfil na tabela "usuarios" e uma assinatura própria de
// onAuthStateChange. Com 24 telas usando, isso pesava (principalmente no celular).
// Agora um único AuthProvider carrega sessão + perfil UMA vez e todos leem daqui.
// =============================================

const AuthContext = createContext({
  user: null,
  perfil: null,
  loading: true,
  login: async () => ({ error: new Error('AuthProvider ausente') }),
  logout: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const perfilCarregado = useRef(null) // guarda o userId já carregado

  useEffect(() => {
    let mounted = true

    async function carregarPerfil(userId) {
      if (perfilCarregado.current === userId) return // já carregado ou carregando
      // Marca ANTES do await: init() e o evento inicial do onAuthStateChange
      // disparam quase juntos; sem isso os dois consultavam o perfil (2 idas).
      perfilCarregado.current = userId
      const { data, error } = await supabase
        .from('usuarios')
        .select('perfil, nome, bio, cor_avatar, avatar_url, foto_position, equipe_id')
        .eq('id', userId)
        .single()
      if (!mounted) return
      if (error || !data) {
        // Falhou: libera o ref pra tentar de novo num próximo evento.
        perfilCarregado.current = null
        setPerfil(null)
        setLoading(false)
        return
      }
      setPerfil(data)
      setLoading(false)
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        await carregarPerfil(session.user.id)
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
          carregarPerfil(session.user.id)
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

  async function login(email, senha) {
    perfilCarregado.current = null // resetar ao fazer login
    return supabase.auth.signInWithPassword({ email, password: senha })
  }

  async function logout() {
    perfilCarregado.current = null
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
