'use client';

import { useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { buildAuthLoginUrl } from '@/lib/platform-auth/config';

export default function LoginPage() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const logout = params.get('logout') === '1';
    const returnTo = `${window.location.origin}/dashboard`;
    window.location.replace(buildAuthLoginUrl(returnTo, { logout }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4 text-center">
        <LoadingSpinner size="large" />
        <div>
          <p className="text-sm font-medium text-[var(--customer-color-text-primary)]">
            Redirecting to secure sign in...
          </p>
          <p className="mt-1 text-sm text-[var(--customer-color-text-subtle)]">
            Aveyo account authentication is handled on `auth.aveyo.com`.
          </p>
        </div>
      </div>
    </div>
  );
}
