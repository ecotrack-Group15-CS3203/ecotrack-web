'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AdminShell } from '@/components/admin-shell';
import { Spinner, EmptyState } from '@/components/ui';
import {
  IconDashboard,
  IconIncidents,
  IconTasks,
  IconVolunteers,
  IconWorkflow,
  IconReports,
  IconSettings,
} from '@/components/icons';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/incidents', label: 'Incidents', icon: IconIncidents },
  { href: '/tasks', label: 'Tasks', icon: IconTasks },
  { href: '/volunteers', label: 'Volunteers', icon: IconVolunteers },
  { href: '/workflow', label: 'Workflow', icon: IconWorkflow },
  { href: '/reports', label: 'Reports', icon: IconReports },
  { href: '/settings', label: 'Settings', icon: IconSettings },
];

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { token, profile, loading, activeOrgId, setActiveOrgId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (profile?.isPlatformAdmin) {
      router.replace('/platform');
    }
  }, [loading, token, profile, router]);

  if (loading || !token || !profile) return <Spinner />;

  const orgAdminMemberships = profile.memberships.filter((m) => m.role === 'org_admin');

  if (orgAdminMemberships.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState>
          This dashboard is for organisation administrators. Your account doesn&apos;t have an
          organisation-administrator role.
        </EmptyState>
      </div>
    );
  }

  const activeOrg = orgAdminMemberships.find((m) => m.organisationId === activeOrgId);

  return (
    <AdminShell
      mode="org"
      navItems={NAV_ITEMS}
      sidebarFoot={activeOrg?.organisationName ?? orgAdminMemberships[0].organisationName}
      orgSwitcher={
        orgAdminMemberships.length > 1 ? (
          <div style={{ padding: '0 20px 12px' }}>
            <select
              value={activeOrgId ?? ''}
              onChange={(e) => setActiveOrgId(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '6px 8px',
                fontSize: 13,
              }}
            >
              {orgAdminMemberships.map((m) => (
                <option key={m.organisationId} value={m.organisationId} style={{ color: '#000' }}>
                  {m.organisationName}
                </option>
              ))}
            </select>
          </div>
        ) : undefined
      }
    >
      {children}
    </AdminShell>
  );
}
