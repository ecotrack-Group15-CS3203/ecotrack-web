'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import type { JoinRequest } from '@/lib/types';
import { AdminShell } from '@/components/admin-shell';
import { Spinner, EmptyState } from '@/components/ui';
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
  const { token, profile, loading, activeOrgId, setActiveOrgId } = useAuth();
  const router = useRouter();
  const joinRequestsPath = activeOrgId ? `/organisations/${activeOrgId}/join-requests` : null;
  const { data: joinRequests } = useApiGet<JoinRequest[]>(joinRequestsPath);

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

  const activeOrg = orgAdminMemberships.find((m) => m.organisationId === activeOrgId);// Get the currently active organisation based on the activeOrgId
  const pendingJoinRequests = joinRequests?.filter((request) => request.status === 'pending').length;
  const navItems = NAV_ITEMS.map((item) =>
    item.href === '/join-requests' ? { ...item, badgeCount: pendingJoinRequests } : item,
  );

  return (
    <AdminShell
      mode="org"
      navItems={navItems}
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
/* This code is the Organisation Layout (OrgLayout), which acts as the common wrapper for all 
organisation-admin pages such as Dashboard, Incidents, Tasks, Volunteers, Settings, and Reports.
 When a user enters any organisation-admin page, it first gets the authentication information 
 (token, profile, loading, and activeOrgId) from useAuth(). 
 It then fetches the organisation's join requests so it can calculate the number of pending requests 
 and display that number as a badge next to Join Requests. The useEffect() checks whether the 
 authentication data has finished loading; if there is no token, the user is redirected to /login, 
 and if the user is a platform administrator, they are redirected to /platform. After authentication, 
 the code checks whether the user has at least one org_admin membership. If not, it displays a message 
 saying that the dashboard is only for organisation administrators. 
 If the user is an organisation admin, the code finds the currently selected organisation using 
 activeOrgId, creates the navigation items, and passes everything to AdminShell. 
 If the user belongs to multiple organisations, an organisation switcher is displayed, allowing 
 them to change activeOrgId. 
 When the active organisation changes, the child pages can fetch data for the newly selected organisation. 
 Finally, {children} renders the actual page inside the common organisation-admin layout. */