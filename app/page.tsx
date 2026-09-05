'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui';

export default function Home() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (profile?.isPlatformAdmin) {
      router.replace('/platform');
    } else {
      router.replace('/dashboard');
    }
  }, [loading, profile, router]);

  return <Spinner />;
}
