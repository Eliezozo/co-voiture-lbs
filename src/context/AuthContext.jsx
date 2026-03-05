import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isLbsEmail } from '../lib/constants'

const AuthContext = createContext(null)

async function ensureProfile(user) {
  const metadata = user.user_metadata || {}
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) return

  const role = metadata.role === 'conducteur' ? 'conducteur' : 'passager'

  await supabase.from('profiles').insert({
    id: user.id,
    full_name: metadata.full_name || user.email,
    email: user.email,
    role,
    mot_de_passe: null,
  })
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }

    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data || null)
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return

        const currentSession = data.session || null
        setSession(currentSession)
        setUser(currentSession?.user || null)

        if (currentSession?.user) {
          await ensureProfile(currentSession.user)
          await loadProfile(currentSession.user.id)
        }
      } catch (error) {
        console.error('Auth init error:', error)
        setAuthError(error?.message || 'Erreur de chargement de session')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        setSession(nextSession)
        setUser(nextSession?.user || null)

        if (nextSession?.user) {
          await ensureProfile(nextSession.user)
          await loadProfile(nextSession.user.id)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        setAuthError(error?.message || 'Erreur de synchronisation utilisateur')
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    if (!isLbsEmail(email)) {
      throw new Error('Email LBS requis: prenom.nom@lomebs.com')
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async ({ fullName, email, password, role }) => {
    if (!isLbsEmail(email)) {
      throw new Error('Inscription réservée aux emails LBS.')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    })

    if (error) throw error
    if (data.user) {
      await ensureProfile(data.user)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      authError,
      signIn,
      signUp,
      signOut,
      refreshProfile: () => loadProfile(user?.id),
    }),
    [session, user, profile, loading, authError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
