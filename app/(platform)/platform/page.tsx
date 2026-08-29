'use client';

import { useApiGet } from '@/lib/use-org-api';
import { Card, Chip, ErrorBanner, KpiCard, KpiRow, PageHeader, Spinner } from '@/components/ui';
import type { Organisation, PlatformStats } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function PlatformDashboardPage() {
  const { data: stats, error: statsError } = useApiGet<PlatformStats>('/platform/stats');
  const { data: organisations, error: orgsError } = useApiGet<Organisation[]>('/organisations');

  const error = statsError || orgsError;
  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load'} />;
  if (!stats || !organisations) return <Spinner />;

  return (
    <div>
      <PageHeader title="Platform dashboard" description="Cross-tenant usage and activity" />

      <KpiRow>
        <KpiCard label="Organisations" value={stats.totalOrganisations} />
        <KpiCard label="Active organisations" value={stats.activeOrganisations} tone="resolved" />
        <KpiCard label="Total users" value={stats.totalUsers} />
        <KpiCard label="Inactive organisations" value={stats.totalOrganisations - stats.activeOrganisations} />
      </KpiRow>

      <Card style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Organisation activity</h3>
        <table>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {organisations.map((org) => (
              <tr key={org.id}>
                <td>{org.name}</td>
                <td>{new Date(org.createdAt).toLocaleDateString()}</td>
                <td>
                  <Chip tone={org.isActive ? 'active' : 'inactive'}>{org.isActive ? 'active' : 'inactive'}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
/* When the platform dashboard loads, it makes two API requests at the same time: useApiGet<PlatformStats>('/platform/stats') 
gets overall platform statistics such as the total number of organisations, active organisations, and total users, while 
useApiGet<Organisation[]>('/organisations') gets the list of all organisations. If either request returns an error, 
an ErrorBanner is displayed.
If the data is still loading, a Spinner is shown. Once both requests succeed, the page displays 
four KPI cards showing total organisations, active organisations, total users, and inactive organisations. 
Below that, it displays a table containing every organisation, its creation date, and whether it is currently active or inactive.
*/