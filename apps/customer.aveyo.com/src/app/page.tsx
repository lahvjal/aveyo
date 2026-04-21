'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { buildAuthLoginUrl, getEmployeeAppUrl } from '@/lib/platform-auth/config';

export default function Home() {
  const router = useRouter();
  const { user, loading, role, userType } = useAuth();

  useEffect(() => {
    if (loading || typeof window === 'undefined') {
      return;
    }

    if (!user) {
      window.location.replace(buildAuthLoginUrl(`${window.location.origin}/dashboard`));
      return;
    }

    if (role !== 'customer' && userType !== 'customer') {
      window.location.replace(getEmployeeAppUrl());
      return;
    }

    router.replace('/dashboard');
  }, [loading, role, router, user, userType]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="large" />
    </div>
  );
}
