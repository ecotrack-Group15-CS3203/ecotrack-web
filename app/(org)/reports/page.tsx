'use client';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import { Button, Card, ErrorBanner, HelpHint, KpiCard, KpiRow, PageHeader, Skeleton } from '@/components/ui';
import { BarChart, DonutChart } from '@/components/charts';
import { IncidentMap } from '@/components/incident-map';
import { toCategorySeries, toClosureSeries, toSeveritySeries, toTaskStatusSeries } from '@/lib/chart-data';
import { IconIncidents, IconReports, IconTasks, IconVolunteers } from '@/components/icons';
import type { DashboardMapIncident, DashboardStats, Incident, Paginated, Task } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function ReportsPage() {
  const { t } = useTranslation();
  const { activeOrgId } = useAuth();
  const statsPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/stats` : null;
  const mapPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/map` : null;
  // limit=100: both feed client-side chart aggregation (severity, task
  // status), same cap and rationale as the dashboard's own fetches.
  const incidentsPath = activeOrgId ? `/organisations/${activeOrgId}/incidents?limit=100` : null;
  const tasksPath = activeOrgId ? `/organisations/${activeOrgId}/tasks?limit=100` : null;

  const { data: stats, error: statsError } = useApiGet<DashboardStats>(statsPath);
  const { data: mapData, error: mapError } = useApiGet<DashboardMapIncident[]>(mapPath);
  const { data: incidentsPage, error: incidentsError } = useApiGet<Paginated<Incident>>(incidentsPath);
  const { data: tasksPage, error: tasksError } = useApiGet<Paginated<Task>>(tasksPath);

  const error = statsError || mapError || incidentsError || tasksError;

  function exportCsv() {
    if (!stats) return;
    const closureRate = stats.totalIncidents === 0 ? 0 : Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100);
    const rows = [
      ['Metric', 'Value'],
      ['Total incidents', String(stats.totalIncidents)],
      ['Claimed this month', String(stats.claimedThisMonth)],
      ['Awaiting claim nearby', String(stats.awaitingClaimInServiceArea)],
      ['Resolved or dismissed incidents', String(stats.resolvedIncidents)],
      ['Active volunteers', String(stats.activeVolunteers)],
      ['Completed cleanup tasks', String(stats.completedCleanupTasks)],
      ['Closure rate', `${closureRate}%`],
      [],
      ['Category', 'Count'],
      ...stats.incidentsByCategory.map((c) => [c.category, String(c.count)]),
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

  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : t('reports.loadError')} />;

  const closureRate = stats && stats.totalIncidents > 0 ? Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100) : 0;
  const categorySeries = stats ? toCategorySeries(stats.incidentsByCategory) : [];
  const severitySeries = incidentsPage ? toSeveritySeries(incidentsPage.items) : [];
  const closureSeries = stats ? toClosureSeries(stats.totalIncidents, stats.resolvedIncidents) : [];
  const taskStatusSeries = tasksPage ? toTaskStatusSeries(tasksPage.items) : [];

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        description={t('reports.description')}
        action={<Button variant="secondary" onClick={exportCsv} disabled={!stats}>{t('reports.export')}</Button>}
      />

      <KpiRow>
        {stats ? (
          <>
            <KpiCard label={t('reports.kpi.totalIncidents')} value={stats.totalIncidents} icon={<IconIncidents />} accent />
            <KpiCard label={t('reports.kpi.completedCleanups')} value={stats.completedCleanupTasks} icon={<IconTasks />} />
            <KpiCard label={t('reports.kpi.activeVolunteers')} value={stats.activeVolunteers} icon={<IconVolunteers />} />
            <KpiCard
              label={<>{t('reports.kpi.closureRate')} <HelpHint text={t('reports.kpi.closureRateHint')} /></>}
              value={`${closureRate}%`}
              icon={<IconReports />}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Card className="kpi-card" key={i}>
              <Skeleton height={26} width={48} style={{ marginBottom: 8 }} />
              <Skeleton height={12} width={80} />
            </Card>
          ))
        )}
      </KpiRow>

      <div className="chart-grid">
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{t('reports.charts.byCategory')}</h3>
          {!stats ? <Skeleton height={120} /> : <BarChart data={categorySeries} emptyLabel={t('reports.charts.noIncidents')} />}
        </Card>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{t('reports.charts.bySeverity')}</h3>
          {!incidentsPage ? <Skeleton height={120} /> : <BarChart data={severitySeries} emptyLabel={t('reports.charts.noIncidents')} />}
        </Card>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{t('reports.charts.closureMix')}</h3>
          {!stats ? (
            <Skeleton height={140} />
          ) : (
            <DonutChart data={closureSeries} centerValue={`${closureRate}%`} centerLabel={t('reports.kpi.closureRate')} />
          )}
        </Card>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{t('reports.charts.taskStatus')}</h3>
          {!tasksPage ? (
            <Skeleton height={140} />
          ) : taskStatusSeries.length === 0 ? (
            <p className="chart-empty">{t('reports.charts.noTasks')}</p>
          ) : (
            <DonutChart data={taskStatusSeries} centerValue={tasksPage.items.length} centerLabel={t('reports.kpi.totalIncidents')} />
          )}
        </Card>
      </div>

      <Card style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>{t('reports.charts.map')}</h3>
        {!mapData ? <Skeleton height={260} /> : <IncidentMap incidents={mapData} />}
      </Card>
    </div>
  );
}
