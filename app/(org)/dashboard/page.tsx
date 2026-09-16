'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import {
  Card,
  KpiRow,
  KpiCard,
  PageHeader,
  ErrorBanner,
  SectionTitle,
  Skeleton,
  Avatar,
  DataTable,
} from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';
import type {
  AuditLogEntry,
  DashboardMapIncident,
  DashboardStats,
  IncidentSummary,
  OrganisationMember,
  Paginated,
  Task,
  WorkflowStage,
} from '@/lib/types';
import { ApiError } from '@/lib/api';
import { IncidentMap } from '@/components/incident-map';

const RECENT_ACTIVITY_LIMIT = 20;

function humanizeAction(action: string): string {
  const [entity, verb] = action.split('.');
  const entityLabel = entity.replace(/_/g, ' ');
  const verbLabel = (verb ?? '').replace(/_/g, ' ');
  return `${entityLabel[0].toUpperCase()}${entityLabel.slice(1)} ${verbLabel}`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { activeOrgId } = useAuth();
  const statsPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/stats` : null;
  const mapPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/map` : null;
  // limit=100 on incidents/members/tasks: the stage-distribution/cleanup-progress
  // charts and the volunteer leaderboard below all aggregate over the complete
  // set, so a paginated slice would silently under-count them.
  const incidentsPath = activeOrgId ? `/organisations/${activeOrgId}/incidents?limit=100` : null;
  const stagesPath = activeOrgId ? `/organisations/${activeOrgId}/workflow-stages` : null;
  // No limit override here: recentActivity already sorts+slices to
  // RECENT_ACTIVITY_LIMIT (20), which is exactly the API's default page size.
  const auditPath = activeOrgId ? `/organisations/${activeOrgId}/audit-logs` : null;
  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer&limit=100` : null;
  const tasksPath = activeOrgId ? `/organisations/${activeOrgId}/tasks?limit=100` : null;

  const { data: stats, error: statsError } = useApiGet<DashboardStats>(statsPath);
  const { data: mapIncidents, error: mapError } = useApiGet<DashboardMapIncident[]>(mapPath);
  const { data: incidentsPage, error: incidentsError } = useApiGet<Paginated<IncidentSummary>>(incidentsPath);
  const incidents = incidentsPage?.items;
  const { data: stages, error: stagesError } = useApiGet<WorkflowStage[]>(stagesPath);
  const { data: auditLogPage, error: auditError } = useApiGet<Paginated<AuditLogEntry>>(auditPath);
  const auditLog = auditLogPage?.items;
  const { data: volunteersPage, error: volunteersError } = useApiGet<Paginated<OrganisationMember>>(volunteersPath);
  const volunteers = volunteersPage?.items;
  const { data: tasksPage, error: tasksError } = useApiGet<Paginated<Task>>(tasksPath);
  const tasks = tasksPage?.items;

  const error = statsError || mapError || incidentsError || stagesError || auditError || volunteersError || tasksError;

  const stagesById = useMemo(() => new Map((stages ?? []).map((s) => [s.id, s])), [stages]);

  const stageDistribution = useMemo(() => {
    if (!incidents) return [];
    const counts = new Map<string, number>();
    for (const incident of incidents) {
      const label = incident.currentStageId
        ? (stagesById.get(incident.currentStageId)?.name ?? t('dashboard.stagesChart.unknownStage'))
        : t('dashboard.stagesChart.unstaged');
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([stage, count]) => ({ stage, count }));
  }, [incidents, stagesById, t]);

  // SRS 3.1.17's three-way cleanup-progress split: resolved / claimed-but-stalled
  // (still at the org's earliest post-claim stage) / everything in between. The
  // stats endpoint only exposes a flat resolvedIncidents count, so the "claimed
  // but not yet advanced" and "in progress" buckets are derived here from the
  // claimed-incidents list plus stage metadata rather than the API.
  const cleanupProgress = useMemo(() => {
    if (!incidents || !stages || stages.length === 0) return null;
    const total = incidents.length;
    if (total === 0) return { resolvedPct: 0, stalledPct: 0, inProgressPct: 0 };
    const claimedStagePosition = Math.min(...stages.map((s) => s.position).filter((p) => p > 0)) || stages[0]?.position;
    let resolved = 0;
    let stalled = 0;
    for (const incident of incidents) {
      const stage = incident.currentStageId ? stagesById.get(incident.currentStageId) : undefined;
      if (!stage) continue;
      if (stage.isFinal) resolved += 1;
      else if (stage.position === claimedStagePosition) stalled += 1;
    }
    const inProgress = Math.max(0, total - resolved - stalled);
    return {
      resolvedPct: (resolved / total) * 100,
      stalledPct: (stalled / total) * 100,
      inProgressPct: (inProgress / total) * 100,
    };
  }, [incidents, stages, stagesById]);

  const volunteerActivity = useMemo(() => {
    if (!volunteers || !tasks) return [];
    return volunteers.map((member) => {
      const own = tasks.filter((t) => t.assignments.some((a) => a.volunteerUserId === member.id));
      const completed = own.filter((t) => t.status === 'completed').length;
      const pending = own.filter((t) => t.status !== 'completed').length;
      const lastActive =
        own
          .flatMap((t) => t.assignments.filter((a) => a.volunteerUserId === member.id).map((a) => a.respondedAt ?? t.createdAt))
          .sort()
          .at(-1) ?? null;
      return { member, completed, pending, lastActive };
    });
  }, [volunteers, tasks]);

  const recentActivity = useMemo(() => {
    if (!auditLog) return [];
    return [...auditLog]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, RECENT_ACTIVITY_LIMIT);
  }, [auditLog]);

  const volunteerActivityColumns: DataTableColumn<(typeof volunteerActivity)[number]>[] = [
    {
      key: 'name',
      header: t('dashboard.volunteerActivity.name'),
      render: ({ member }) => (
        <div className="row-flex">
          <Avatar name={member.fullName} />
          {member.fullName}
        </div>
      ),
    },
    { key: 'completed', header: t('dashboard.volunteerActivity.tasksCompleted'), render: ({ completed }) => completed },
    { key: 'pending', header: t('dashboard.volunteerActivity.tasksPending'), render: ({ pending }) => pending },
    { key: 'lastActive', header: t('dashboard.volunteerActivity.lastActive'), render: ({ lastActive }) => formatDate(lastActive) },
  ];

  if (!activeOrgId) {
    return (
      <div>
        <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />
        <Skeleton height={96} style={{ marginBottom: 20 }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      {error && (
        <ErrorBanner message={error instanceof ApiError ? error.message : t('dashboard.loadError')} />
      )}

      {!stats ? (
        <KpiRow>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card className="kpi-card" key={i}>
              <Skeleton height={26} width={48} style={{ marginBottom: 8 }} />
              <Skeleton height={12} width={80} />
            </Card>
          ))}
        </KpiRow>
      ) : (
        <KpiRow>
          <KpiCard label={t('dashboard.kpi.totalIncidents')} value={stats.totalIncidents} accent />
          <KpiCard label={t('dashboard.kpi.claimedThisMonth')} value={stats.claimedThisMonth} />
          <KpiCard label={t('dashboard.kpi.awaitingClaim')} value={stats.awaitingClaimInServiceArea} tone="pending" />
          <KpiCard label={t('dashboard.kpi.resolved')} value={stats.resolvedIncidents} tone="resolved" />
          <KpiCard label={t('dashboard.kpi.activeVolunteers')} value={stats.activeVolunteers} />
          <KpiCard label={t('dashboard.kpi.completedTasks')} value={stats.completedCleanupTasks} tone="resolved" />
        </KpiRow>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>{t('dashboard.stagesChart.title')}</h3>
          {!incidents || !stages ? (
            <Skeleton height={120} />
          ) : stageDistribution.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>{t('dashboard.stagesChart.empty')}</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 154, overflowX: 'auto', paddingTop: 18 }}>
              {stageDistribution.map(({ stage, count }) => {
                const max = Math.max(1, ...stageDistribution.map((s) => s.count));
                return (
                  <div key={stage} title={`${stage}: ${count}`} style={{ width: 54, height: '100%', flex: '0 0 54px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <strong style={{ fontSize: 12, color: 'var(--text)' }}>{count}</strong>
                    <div style={{ width: 32, height: `${Math.max(8, (count / max) * 100)}%`, background: 'var(--progress)', borderRadius: '4px 4px 0 0' }} />
                    <span style={{ width: 54, minHeight: 28, fontSize: 10, lineHeight: '13px', color: 'var(--text-3)', textAlign: 'center' }}>{stage}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>{t('dashboard.progress.title')}</h3>
          {!cleanupProgress ? <Skeleton height={16} /> : <ProgressBar progress={cleanupProgress} t={t} />}
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>{t('dashboard.map.title')}</SectionTitle>
        <Card style={{ padding: 20 }}>
          {!mapIncidents ? <Skeleton height={260} /> : <IncidentMap incidents={mapIncidents} />}
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>{t('dashboard.volunteerActivity.title')}</SectionTitle>
        <DataTable
          caption={t('dashboard.volunteerActivity.title')}
          columns={volunteerActivityColumns}
          rows={volunteerActivity}
          getRowKey={({ member }) => member.id}
          loading={!volunteers || !tasks}
          empty={t('dashboard.volunteerActivity.empty')}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>{t('dashboard.recentActivity.title')}</SectionTitle>
        <Card style={{ padding: 20 }}>
          {!auditLog ? (
            <>
              <Skeleton height={14} style={{ marginBottom: 12 }} />
              <Skeleton height={14} style={{ marginBottom: 12 }} />
              <Skeleton height={14} />
            </>
          ) : recentActivity.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>{t('dashboard.recentActivity.empty')}</p>
          ) : (
            <div className="timeline">
              {recentActivity.map((entry) => (
                <div className="timeline-item" key={entry.id}>
                  <div className="t-label">{humanizeAction(entry.action)}</div>
                  <div className="t-date">{timeAgo(entry.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ProgressBar({
  progress,
  t,
}: {
  progress: { resolvedPct: number; stalledPct: number; inProgressPct: number };
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { resolvedPct, stalledPct, inProgressPct } = progress;
  const resolvedLabel = t('dashboard.progress.resolved', { pct: resolvedPct.toFixed(0) });
  const inProgressLabel = t('dashboard.progress.inProgress', { pct: inProgressPct.toFixed(0) });
  const stalledLabel = t('dashboard.progress.stalled', { pct: stalledPct.toFixed(0) });
  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)' }}>
        <div style={{ width: `${resolvedPct}%`, background: 'var(--resolved)' }} title={resolvedLabel} />
        <div style={{ width: `${inProgressPct}%`, background: 'var(--progress)' }} title={inProgressLabel} />
        <div style={{ width: `${stalledPct}%`, background: 'var(--pending)' }} title={stalledLabel} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>
        <Legend color="var(--resolved)" label={resolvedLabel} />
        <Legend color="var(--progress)" label={inProgressLabel} />
        <Legend color="var(--pending)" label={stalledLabel} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}
