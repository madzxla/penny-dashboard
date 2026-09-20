import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(undefined)

const ROLE_STORAGE_KEY = 'penny_device_role'

// Device role is a client-side UI mode only — nothing stored server-side.
// It controls which nav items and pages are reachable on this device,
// so a restaurant owner can hand a phone to staff without exposing
// settings, financials, or deal editing.
function readStoredRole() {
  try {
    const stored = sessionStorage.getItem(ROLE_STORAGE_KEY)
    return stored === 'staff' || stored === 'manager' ? stored : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [role, setRole] = useState(readStoredRole)
  const [loading, setLoading] = useState(true)

  const loadRestaurant = useCallback(async (userId) => {
    if (!userId) {
      setRestaurant(null)
      return
    }
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load restaurant record:', error.message)
      setRestaurant(null)
      return
    }
    setRestaurant(data)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setSession(session)
      loadRestaurant(session?.user?.id).finally(() => {
        if (active) setLoading(false)
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user?.id) {
        loadRestaurant(session.user.id)
      } else {
        setRestaurant(null)
        setRole(null)
        try { sessionStorage.removeItem(ROLE_STORAGE_KEY) } catch {}
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadRestaurant])

  const signIn = useCallback(async ({ email, password, deviceRole }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    setRole(deviceRole)
    try { sessionStorage.setItem(ROLE_STORAGE_KEY, deviceRole) } catch {}

    await loadRestaurant(data.user.id)
    return data
  }, [loadRestaurant])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setRole(null)
    try { sessionStorage.removeItem(ROLE_STORAGE_KEY) } catch {}
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    restaurant,
    role,               // 'manager' | 'staff' | null
    isManager: role === 'manager',
    isStaff: role === 'staff',
    loading,
    signIn,
    signOut,
    refreshRestaurant: () => loadRestaurant(session?.user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
