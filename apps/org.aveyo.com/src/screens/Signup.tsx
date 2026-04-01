import { useEffect } from 'react'
import { buildAuthLoginUrl, getPostLoginRedirectUrl } from '../lib/auth/config'

export default function Signup() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const returnTo = getPostLoginRedirectUrl()
    window.location.replace(buildAuthLoginUrl(returnTo))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
    </div>
  )
}
