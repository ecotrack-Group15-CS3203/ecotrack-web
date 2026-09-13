'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
  { href: '/dashboard', key: 'dashboard', icon: IconDashboard },
  { href: '/incident-pool', key: 'incidentPool', icon: IconIncidents },
  { href: '/incidents', key: 'incidents', icon: IconIncidents },
  { href: '/tasks', key: 'tasks', icon: IconTasks },
  { href: '/events', key: 'events', icon: IconEvents },
  { href: '/volunteers', key: 'volunteers', icon: IconVolunteers },
  { href: '/join-requests', key: 'joinRequests', icon: IconVolunteers },
  { href: '/workflow', key: 'workflow', icon: IconWorkflow },
  { href: '/reports', key: 'reports', icon: IconReports },
  { href: '/settings', key: 'settings', icon: IconSettings },
] as const;

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
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
  const navItems = NAV_ITEMS.map((item) => ({
    href: item.href,
    icon: item.icon,
    label: t(`nav.${item.key}`),
    badgeCount: item.href === '/join-requests' ? pendingJoinRequests : undefined,
  }));

  return (
    <AdminShell navItems={navItems} sidebarFoot={profile.organisation.name}>
      {children}
    </AdminShell>
  );
}
