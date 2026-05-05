import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    supabase.auth.getSession()
      .then(({ data }) => { setUser(data.session?.user ?? null) })
      .catch(() => { /* treat as logged out */ })
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
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
