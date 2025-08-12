// hooks/useAuth.ts
import { Session, User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { authService } from '../services/auth'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const session = await authService.getCurrentSession()
      setSession(session)
      setUser(session?.user || null)
      setInitializing(false)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChanged((event, session) => {
      console.log('Auth state changed:', event, session?.user ? `User: ${session.user.email}` : 'No user')
      setSession(session)
      setUser(session?.user || null)
      if (initializing) setInitializing(false)
      setLoading(false)
    })

    return unsubscribe // Cleanup subscription on unmount
  }, [initializing])

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    const result = await authService.signUp(email, password)
    setLoading(false)
    return result
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const result = await authService.signIn(email, password)
    setLoading(false)
    return result
  }

  const signOut = async () => {
    setLoading(true)
    console.log('useAuth: Starting sign out process...')
    await authService.signOut()
    console.log('useAuth: Sign out service call completed')
    setLoading(false)
  }

  const resetPassword = async (email: string) => {
    return await authService.resetPassword(email)
  }

  return {
    user,
    session,
    loading,
    initializing,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
  }
}