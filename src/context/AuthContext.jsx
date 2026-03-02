import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isLbsEmail } from '../lib/constants'

const AuthContext = createContext(null)

async function ensureProfileRow(user) {
  const metadata = user.user_metadata || {}
  const upsertPayload = {
    id: user.id,
    email: user.email,
    full_name: metadata.full_name || user.email,
    role: metadata.role === 'driver' ? 'driver' : 'student',
  }

  await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id' })
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data || null)
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const currentSession = data.session || null
      setSession(currentSession)
      setUser(currentSession?.user || null)

      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id)
      }

      setLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user || null)

      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    if (!isLbsEmail(email)) {
      throw new Error('Utilise une adresse email LBS valide.')
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }
  }

  const signUp = async ({ email, password, fullName, role }) => {
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

    if (error) {
      throw error
    }

    if (data.user) {
      await ensureProfileRow(data.user)
    }

    return data
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
      signIn,
      signUp,
      signOut,
      refreshProfile: () => fetchProfile(user?.id),
    }),
    [session, user, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
