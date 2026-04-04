import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { ProfileEditor } from '../components/profile/ProfileEditor'
import { usePageTitle } from '../hooks/usePageTitle'
import { Button } from '../components/ui/button'

export default function Profile() {
  usePageTitle('My Profile')
  const { signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { data: profile, isLoading, error } = useProfile()

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          Failed to load profile. Please try again.
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-muted p-4 rounded-md">
          Profile not found.
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button type="button" variant="link" onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? 'Signing out...' : 'Logout'}
        </Button>
      </div>
      <ProfileEditor profile={profile} />
    </div>
  )
}
