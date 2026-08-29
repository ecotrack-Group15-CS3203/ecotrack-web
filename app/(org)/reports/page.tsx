'use client';

import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import { Card, ErrorBanner, KpiCard, KpiRow, PageHeader, Spinner } from '@/components/ui';
import { IncidentMap } from '@/components/incident-map';
import type { DashboardStats, Incident } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function ReportsPage() {
  const { activeOrgId } = useAuth();
  const statsPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/stats` : null; // API endpoint for fetching dashboard statistics
  const mapPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/map` : null; // API endpoint for fetching incident map data
  const { data: stats, error: statsError } = useApiGet<DashboardStats>(statsPath);
  const { data: mapData, error: mapError } = useApiGet<Incident[]>(mapPath);

  const error = statsError || mapError;
  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load reports'} />;
  if (!stats || !mapData) return <Spinner />;

  const resolutionRate = stats.totalIncidents === 0 ? 0 : Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100);
  const maxCategory = Math.max(1, ...stats.incidentsByCategory.map((c) => c.count));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PageHeader title="Reports" description="Organisation impact and activity summary" />
        <button className="btn btn-secondary btn-sm">Export</button>
      </div>

      <KpiRow>
        <KpiCard label="Total incidents" value={stats.totalIncidents} />
        <KpiCard label="Completed cleanups" value={stats.completedCleanupTasks} />
        <KpiCard label="Active volunteers" value={stats.activeVolunteers} />
        <KpiCard label="Resolution rate" value={`${resolutionRate}%`} />
      </KpiRow>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Incidents by category</h3>
          {stats.incidentsByCategory.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>No incidents reported yet.</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 154, overflowX: 'auto', paddingTop: 18 }}>
                {stats.incidentsByCategory.map((c) => (
                  <div key={c.category} title={`${c.category}: ${c.count}`} style={{ width: 54, height: '100%', flex: '0 0 54px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <strong style={{ fontSize: 12, color: 'var(--text)' }}>{c.count}</strong>
                    <div style={{ width: 32, height: `${Math.max(8, (c.count / maxCategory) * 100)}%`, background: 'var(--verified)', borderRadius: '4px 4px 0 0' }} />
                    <span style={{ width: 54, minHeight: 28, fontSize: 10, lineHeight: '13px', color: 'var(--text-3)', textAlign: 'center' }}>{c.category.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Incident map</h3>
          <IncidentMap incidents={mapData} />
        </Card>
      </div>
    </div>
  );
}

/*When the user opens the Reports page, it first gets the active organization ID using useAuth(). 
Using this ID, it makes two API requests through useApiGet(): one to /organisations/{orgId}/dashboard/stats 
to retrieve dashboard statistics and another to /organisations/{orgId}/dashboard/map to retrieve incidents for the map. 
While the data is loading, a Spinner is displayed, and if either API request fails, an ErrorBanner is shown. 
Once the data is available, the page calculates the resolution rate from the total and resolved incident counts. 
It then displays four KPI cards showing total incidents, completed cleanups, active volunteers, and resolution rate. 
Below the KPIs, the page displays a category-based bar chart showing the number of incidents in each category and an 
IncidentMap showing the geographic locations of the incidents. 
There is also an Export button in the UI, although in this code it currently does not have an export action attached to it.*/