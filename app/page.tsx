'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui';

// Home() - Root page that routes users based on auth status: login page if not authenticated, or dashboard/platform based on role
export default function Home() {
  const { token, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (profile?.isPlatformAdmin) {
      router.replace('/platform');
    } else {
      router.replace('/dashboard');
    }
  }, [loading, token, profile, router]);

  return <Spinner />;
}
