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
  const { token, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!profile?.isPlatformAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, token, profile, router]);

  if (loading || !token || !profile?.isPlatformAdmin) return <Spinner />;

  return (
    <AdminShell mode="platform" navItems={NAV_ITEMS} sidebarFoot="Platform-wide access">
      {children}
    </AdminShell>
  );
}

/* When a user enters any page under the platform-admin section, PlatformLayout first gets the user's 
token, profile, and loading state from useAuth(). While authentication information is loading, it displays a Spinner. 
Once loading finishes, it checks whether the user has a valid token; if not, the user is redirected to /login. 
If the user is logged in but profile?.isPlatformAdmin is false, they are redirected to /dashboard, preventing normal 
organisation users from accessing platform-admin pages. 
Only when the user is authenticated and has the isPlatformAdmin permission does the layout render AdminShell, which p
rovides the platform navigation containing Platform dashboard and Organisations. 
The {children} represents the actual platform page being displayed inside this common layout.*/