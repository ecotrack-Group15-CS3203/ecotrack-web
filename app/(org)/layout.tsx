'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import type { JoinRequest } from '@/lib/types';
import { AdminShell } from '@/components/admin-shell';
import { Spinner } from '@/components/ui';
import {
  IconDashboard,
  IconIncidents,
  IconTasks,
  IconVolunteers,
  IconWorkflow,
  IconEvents,
  IconReports,
  IconSettings,
} from '@/components/icons';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/incident-pool', label: 'Incident Pool', icon: IconIncidents },
  { href: '/incidents', label: 'Incidents', icon: IconIncidents },
  { href: '/tasks', label: 'Tasks', icon: IconTasks },
  { href: '/events', label: 'Events', icon: IconEvents },
  { href: '/volunteers', label: 'Volunteers', icon: IconVolunteers },
  { href: '/join-requests', label: 'Join Requests', icon: IconVolunteers },
  { href: '/workflow', label: 'Workflow', icon: IconWorkflow },
  { href: '/reports', label: 'Reports', icon: IconReports },
  { href: '/settings', label: 'Settings', icon: IconSettings },
];

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, activeOrgId } = useAuth();
  const router = useRouter();
  const joinRequestsPath = activeOrgId ? `/organisations/${activeOrgId}/join-requests` : null;
  const { data: joinRequests } = useApiGet<JoinRequest[]>(joinRequestsPath);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    // The web dashboard is org-admin only (SRS scope: volunteers/citizens use the
    // mobile app). Anyone else signed in lands on the "get the app" page instead
    // of a dashboard they have no access to.
    if (profile.role !== 'org_admin') {
      router.replace('/app');
    }
  }, [loading, profile, router]);

  if (loading || !profile || profile.role !== 'org_admin' || !profile.organisation) {
    return <Spinner />;
  }

  const pendingJoinRequests = joinRequests?.filter((request) => request.status === 'pending').length;
  const navItems = NAV_ITEMS.map((item) =>
    item.href === '/join-requests' ? { ...item, badgeCount: pendingJoinRequests } : item,
  );

  return (
    <AdminShell navItems={navItems} sidebarFoot={profile.organisation.name}>
      {children}
    </AdminShell>
  );
}
