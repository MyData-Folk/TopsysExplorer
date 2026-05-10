import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Guard: ensure setLoading(false) is called exactly once at init
  const initializedRef = useRef(false)

  useEffect(() => {
    // If Supabase is not configured, unlock the UI immediately
    if (!supabase) {
      setLoading(false)
      return
    }

    // Use onAuthStateChange as the SINGLE source of truth.
    // It fires INITIAL_SESSION synchronously on mount with the current session,
    // which replaces the need for a separate getSession() call that would
    // cause a double state-update and a render loop on page reload.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      // Mark as initialized on the first event (INITIAL_SESSION or SIGNED_OUT)
      if (!initializedRef.current) {
        initializedRef.current = true
        setLoading(false)
      }
    })

    // Safety net: if Supabase never fires (network down, misconfigured),
    // unlock the UI after 3s so the user isn't stuck on a spinner.
    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        initializedRef.current = true
        setLoading(false)
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase non configuré — ajoutez les variables dans .env.local')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase non configuré — ajoutez les variables dans .env.local')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
  }

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase non configuré — ajoutez les variables dans .env.local')
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  return { user, loading, signIn, signUp, signOut }
}
