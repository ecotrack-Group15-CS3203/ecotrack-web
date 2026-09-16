'use client';

import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import { Card, ErrorBanner, KpiCard, KpiRow, PageHeader, Spinner } from '@/components/ui';
import { IncidentMap } from '@/components/incident-map';
import type { DashboardMapIncident, DashboardStats } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function ReportsPage() {
  const { activeOrgId } = useAuth();
  const statsPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/stats` : null;
  const mapPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/map` : null;
  const { data: stats, error: statsError } = useApiGet<DashboardStats>(statsPath);
  const { data: mapData, error: mapError } = useApiGet<DashboardMapIncident[]>(mapPath);

  const error = statsError || mapError;
  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load reports'} />;
  if (!stats || !mapData) return <Spinner />;

  const resolutionRate = stats.totalIncidents === 0 ? 0 : Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100);
  const maxCategory = Math.max(1, ...stats.incidentsByCategory.map((c) => c.count));

  function exportCsv() {
    const rows = [
      ['Metric', 'Value'],
      ['Total incidents', String(stats!.totalIncidents)],
      ['Claimed this month', String(stats!.claimedThisMonth)],
      ['Awaiting claim nearby', String(stats!.awaitingClaimInServiceArea)],
      ['Resolved incidents', String(stats!.resolvedIncidents)],
      ['Active volunteers', String(stats!.activeVolunteers)],
      ['Completed cleanup tasks', String(stats!.completedCleanupTasks)],
      ['Resolution rate', `${resolutionRate}%`],
      [],
      ['Category', 'Count'],
      ...stats!.incidentsByCategory.map((c) => [c.category, String(c.count)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ecotrack-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PageHeader title="Reports" description="Organisation impact and activity summary" />
        <button className="btn btn-secondary btn-sm" onClick={exportCsv}>Export</button>
      </div>

      <KpiRow>
        <KpiCard label="Total incidents" value={stats.totalIncidents} accent />
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
