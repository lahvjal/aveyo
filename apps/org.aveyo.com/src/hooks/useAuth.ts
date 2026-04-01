import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { buildAuthLoginUrl, getPostLoginRedirectUrl } from '../lib/auth/config'
import { fetchAuthSession, logoutAuthSession } from '../lib/auth/session'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let initialLoadComplete = false

    const hydrateSupabaseSessionFromSharedAuth = async () => {
      const toFallbackUser = (id: string | undefined, email: string | null | undefined) =>
        ({
          id: id ?? '',
          email: email ?? undefined,
        } as User)

      const sharedSession = await fetchAuthSession().catch(() => null)
      if (!sharedSession?.ok || !sharedSession.payload?.authenticated) {
        return null
      }

      const tokenResponse = await fetch('/api/auth/supabase-session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null)

      if (!tokenResponse?.ok) {
        return toFallbackUser(sharedSession.payload.user?.id, sharedSession.payload.user?.email)
      }

      const tokenPayload = (await tokenResponse.json().catch(() => null)) as
        | { accessToken?: string; refreshToken?: string | null }
        | null

      if (!tokenPayload?.accessToken || !tokenPayload.refreshToken) {
        return toFallbackUser(sharedSession.payload.user?.id, sharedSession.payload.user?.email)
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: tokenPayload.accessToken,
        refresh_token: tokenPayload.refreshToken,
      })

      if (error) {
        console.warn('Failed to hydrate Supabase browser session from shared auth cookies', error)
        return toFallbackUser(sharedSession.payload.user?.id, sharedSession.payload.user?.email)
      }

      return data.session?.user ?? null
    }

    const loadInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()

        if (cancelled) return

        if (initialSession?.user) {
          initialLoadComplete = true
          setSession(initialSession)
          setUser(initialSession.user)
          setLoading(false)
          return
        }

        const fallbackUser = await hydrateSupabaseSessionFromSharedAuth()
        if (cancelled) return

        const { data: { session: hydratedSession } } = await supabase.auth.getSession()
        if (cancelled) return

        initialLoadComplete = true
        setSession(hydratedSession ?? null)
        setUser(hydratedSession?.user ?? fallbackUser ?? null)
        setLoading(false)
      } catch {
        if (cancelled) return
        initialLoadComplete = true
        setSession(null)
        setUser(null)
        setLoading(false)
      }
    }

    void loadInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      // Prevent bootstrap/login redirect loops: shared-cookie hydration may still
      // be running when Supabase emits INITIAL_SESSION with a null local session.
      if (!initialLoadComplete && !session) {
        return
      }
      // Keep shared-auth fallback user until a real auth transition occurs.
      if (event === 'INITIAL_SESSION' && !session) {
        return
      }
      initialLoadComplete = true
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    void email
    void password
    if (typeof window !== 'undefined') {
      const returnTo = getPostLoginRedirectUrl()
      window.location.replace(buildAuthLoginUrl(returnTo))
    }
    return {
      data: null,
      error: new Error('Sign in moved to the shared auth app.'),
    }
  }

  const signUp = async (email: string, password: string, fullName: string, jobTitle: string) => {
    void email
    void password
    void fullName
    void jobTitle
    if (typeof window !== 'undefined') {
      const returnTo = getPostLoginRedirectUrl()
      window.location.replace(buildAuthLoginUrl(returnTo))
    }
    return {
      data: null,
      error: new Error('Sign up moved to the shared auth app.'),
    }
  }

  const signOut = async () => {
    await logoutAuthSession().catch(() => null)
    const { error } = await supabase.auth.signOut().catch(() => ({ error: null }))
    if (typeof window !== 'undefined') {
      const returnTo = getPostLoginRedirectUrl()
      window.location.replace(buildAuthLoginUrl(returnTo, { logout: true }))
    }
    return { error }
  }

  const resetPassword = async (email: string) => {
    void email
    if (typeof window !== 'undefined') {
      const returnTo = getPostLoginRedirectUrl()
      window.location.replace(buildAuthLoginUrl(returnTo))
    }
    return {
      data: null,
      error: new Error('Password reset moved to the shared auth app.'),
    }
  }

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }
}
