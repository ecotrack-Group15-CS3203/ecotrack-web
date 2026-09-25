'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import type { Paginated } from '@/lib/types';
import { AdminShell } from '@/components/admin-shell';
import { Spinner } from '@/components/ui';
import {
  IconDashboard,
  IconIncidentPool,
  IconIncidents,
  IconJoinRequests,
  IconTasks,
  IconVolunteers,
  IconWorkflow,
  IconEvents,
  IconReports,
  IconSettings,
} from '@/components/icons';

const NAV_ITEMS = [
  { href: '/dashboard', key: 'dashboard', icon: IconDashboard, group: 'overview' },
  { href: '/incident-pool', key: 'incidentPool', icon: IconIncidentPool, group: 'incidents' },
  { href: '/incidents', key: 'incidents', icon: IconIncidents, group: 'incidents' },
  { href: '/tasks', key: 'tasks', icon: IconTasks, group: 'incidents' },
  { href: '/events', key: 'events', icon: IconEvents, group: 'community' },
  { href: '/volunteers', key: 'volunteers', icon: IconVolunteers, group: 'community' },
  { href: '/join-requests', key: 'joinRequests', icon: IconJoinRequests, group: 'community' },
  { href: '/workflow', key: 'workflow', icon: IconWorkflow, group: 'operations' },
  { href: '/reports', key: 'reports', icon: IconReports, group: 'operations' },
  { href: '/settings', key: 'settings', icon: IconSettings, group: 'settings' },
] as const;

export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { profile, loading, activeOrgId } = useAuth();
  const router = useRouter();
  // limit=1 + status=pending: only `total` is read here, so there's no reason to
  // fetch every pending request just to count them (page 1 would also
  // undercount past 20 without the server-side status filter).
  const joinRequestsPath = activeOrgId
    ? `/organisations/${activeOrgId}/join-requests?status=pending&limit=1`
    : null;
  const { data: joinRequestsPage } = useApiGet<Paginated<unknown>>(joinRequestsPath);

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

  const pendingJoinRequests = joinRequestsPage?.total;
  const navItems = NAV_ITEMS.map((item) => ({
    href: item.href,
    icon: item.icon,
    group: item.group,
    label: t(`nav.${item.key}`),
    badgeCount: item.href === '/join-requests' ? pendingJoinRequests : undefined,
  }));

  return (
    <AdminShell navItems={navItems} orgName={profile.organisation.name}>
      {children}
    </AdminShell>
  );
}
