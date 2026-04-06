'use client';

import { AvaWidgetEmbedBridge, createSignedOutSnapshot } from '@ava/widget';
import { useAuth } from '@/context/AuthContext';

export default function AvaWidgetEmbed() {
  const { user } = useAuth();

  const hostSessionSnapshot = user
    ? {
        authenticated: true,
        role: 'customer',
        userType: 'customer' as const,
        user: {
          id: user.id,
          email: user.email ?? null,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
          avatarUrl: null
        }
      }
    : createSignedOutSnapshot();

  return <AvaWidgetEmbedBridge hostSessionSnapshot={hostSessionSnapshot} registerGlobalApi />;
}
