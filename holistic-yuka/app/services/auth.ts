// services/auth.ts
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabaseConfig';

export interface AuthResult {
  user: User | null;
  error?: string;
}

export const authService = {
  // Sign up with email and password
  async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) {
        return { user: null, error: error.message }
      }
      
      return { user: data.user }
    } catch (error: any) {
      return { user: null, error: error.message }
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        return { user: null, error: error.message }
      }
      
      return { user: data.user }
    } catch (error: any) {
      return { user: null, error: error.message }
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error.message)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  },

  // Reset password
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (event: string, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, session?.user ? `User: ${session.user.email}` : 'No user')
        callback(event, session)
      }
    )
    
    // Return unsubscribe function
    return () => subscription.unsubscribe()
  }
}