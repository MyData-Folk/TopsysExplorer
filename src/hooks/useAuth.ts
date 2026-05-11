import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { UserProfile } from '../lib/adminStorage'
import { logger } from '../utils/logger'

export interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isApproved: boolean
  isAdmin: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)
  const fetchIdRef = useRef(0)

  const loadProfile = async (userId: string, isLogin: boolean) => {
    const currentFetchId = ++fetchIdRef.current
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (currentFetchId !== fetchIdRef.current) return

      if (error) {
        logger.warn('Auth', `Échec récupération profil pour ${userId}`, error);
        return null
      }
      logger.info('Auth', `Profil récupéré pour ${userId}`, data);
      setProfile(data as UserProfile)
    } catch (err) {
      logger.error('Auth', 'Erreur lors de la récupération du profil', err)
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      logger.info('Auth', `Changement d'état: ${event}`, { userId: u?.id, email: u?.email });
      setUser(u)

      if (u) {
        logger.debug('Auth', 'Démarrage chargement profil...');
        loadProfile(u.id, event === 'SIGNED_IN')
      } else {
        logger.debug('Auth', 'Session vide, nettoyage profil');
        fetchIdRef.current++
        setProfile(null)
      }

      if (!initializedRef.current) {
        logger.info('Auth', 'Initialisation terminée');
        initializedRef.current = true
        setLoading(false)
      }
    })

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

  const role = (profile as any)?.role ?? null
  const isApproved = role === 'user' || role === 'admin'
  const isAdmin = role === 'admin'

  return { user, profile, loading, signIn, signUp, signOut, isApproved, isAdmin }
}
