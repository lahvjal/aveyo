import { useEffect, useState } from 'react'
import { Navigate } from '../../lib/router-shim'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { getPlatformAppUrl } from '../../lib/auth/config'
import { Button } from '../ui/button'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id, { enabled: !!user })

  const needsOnboarding = !!user && profile?.onboarding_completed === false
  const isTerminated = (profile?.employment_status ?? 'active') === 'terminated'
  const terminationDate = profile?.termination_effective_at || profile?.terminated_at

  useEffect(() => {
    if (!needsOnboarding || typeof window === 'undefined') {
      return
    }

    const onboardingUrl = new URL('/onboarding', getPlatformAppUrl())
    onboardingUrl.searchParams.set(
      'returnTo',
      `${window.location.origin}${window.location.pathname}${window.location.search}`,
    )
    window.location.replace(onboardingUrl.toString())
  }, [needsOnboarding])

  if (loading || (!!user && profileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    const returnTo =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/dashboard'
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  if (needsOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting to onboarding...</p>
        </div>
      </div>
    )
  }

  if (isTerminated) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Account Archived</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Your employment record is marked as terminated, so this account no longer has access to the internal app.
          </p>
          {terminationDate && (
            <p className="text-xs text-muted-foreground mb-4">
              Effective date: {new Date(terminationDate).toLocaleString()}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={isSigningOut}
            onClick={async () => {
              setIsSigningOut(true)
              await signOut()
              setIsSigningOut(false)
            }}
          >
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
