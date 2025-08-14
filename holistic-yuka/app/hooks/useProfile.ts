import { useEffect, useState } from 'react'
import { supabase } from '../supabaseConfig'
import { useAuth } from './useAuth'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  diet: string | null
  allergies: string[] | null
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCompletedPersonalization, setHasCompletedPersonalization] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      setHasCompletedPersonalization(false)
      return
    }

    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    if (!user) {
      console.log('useProfile: No user, skipping profile fetch')
      return
    }

    try {
      setLoading(true)
      console.log('useProfile: Fetching profile for user:', user.id)
      
      // Use .maybeSingle() instead of .single() to handle missing profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('useProfile: Error fetching profile:', error)
        setProfile(null)
        setHasCompletedPersonalization(false)
      } else if (!data) {
        console.log('useProfile: No profile found, creating one...')
        // Profile doesn't exist, create it
        await createProfile()
      } else {
        console.log('useProfile: Profile found:', data)
        setProfile(data)
        // Consider personalization completed if user has explicitly set diet or allergies
        const completed = data?.diet !== undefined || data?.allergies !== undefined
        console.log('useProfile: Has completed personalization:', completed)
        setHasCompletedPersonalization(completed)
      }
    } catch (error) {
      console.error('useProfile: Error in fetchProfile:', error)
      setProfile(null)
      setHasCompletedPersonalization(false)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) return

    try {
      console.log('useProfile: Creating profile for user:', user.id)
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
        })
        .select()
        .single()

      if (error) {
        console.error('useProfile: Error creating profile:', error)
        setProfile(null)
        setHasCompletedPersonalization(false)
      } else {
        console.log('useProfile: Profile created successfully:', data)
        setProfile(data)
        setHasCompletedPersonalization(false) // New profile needs personalization
      }
    } catch (error) {
      console.error('useProfile: Error in createProfile:', error)
      setProfile(null)
      setHasCompletedPersonalization(false)
    }
  }

  return {
    profile,
    loading,
    hasCompletedPersonalization,
    refetchProfile: fetchProfile,
  }
}