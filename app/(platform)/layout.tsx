'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AdminShell } from '@/components/admin-shell';
import { Spinner } from '@/components/ui';
import { IconDashboard, IconOrganisations } from '@/components/icons';

const NAV_ITEMS = [
  { href: '/platform', label: 'Platform dashboard', icon: IconDashboard },
  { href: '/organisations', label: 'Organisations', icon: IconOrganisations },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (!profile?.isPlatformAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, profile, router]);

  if (loading || !profile?.isPlatformAdmin) return <Spinner />;

  return (
    <AdminShell mode="platform" navItems={NAV_ITEMS} sidebarFoot="Platform-wide access">
      {children}
    </AdminShell>
  );
}
