import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isLbsEmail } from '../lib/constants'

const AuthContext = createContext(null)

function isTransientLockError(error) {
  const message = `${error?.name || ''} ${error?.message || ''}`.toLowerCase()
  return message.includes('lock broken by another request') || message.includes('aborterror')
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function ensureProfileRow(user) {
  const metadata = user.user_metadata || {}
  const upsertPayload = {
    id: user.id,
    email: user.email,
    full_name: metadata.full_name || user.email,
    role: metadata.role === 'driver' ? 'driver' : 'student',
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error } = await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id' })

    if (!error) {
      return
    }

    if (isTransientLockError(error) && attempt < 2) {
      await sleep(150 * (attempt + 1))
      continue
    }

    throw new Error(`Profil non créé: ${error.message}`)
  }
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
        await ensureProfileRow(currentSession.user)
        await fetchProfile(currentSession.user.id)
      }

      setLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user || null)

      if (nextSession?.user) {
        await ensureProfileRow(nextSession.user)
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
      try {
        await ensureProfileRow(data.user)
      } catch (profileError) {
        if (!isTransientLockError(profileError)) {
          throw profileError
        }
      }
    }

    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const requestPasswordReset = async (email) => {
    if (!isLbsEmail(email)) {
      throw new Error('Utilise une adresse email LBS valide.')
    }

    const redirectTo = `${window.location.origin}/update-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      throw error
    }
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      throw error
    }
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
      requestPasswordReset,
      updatePassword,
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
