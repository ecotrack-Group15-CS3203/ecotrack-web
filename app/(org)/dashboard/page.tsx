'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import {
  Card,
  KpiRow,
  KpiCard,
  PageHeader,
  ErrorBanner,
  HelpHint,
  SectionTitle,
  Skeleton,
  Avatar,
  DataTable,
  ProgressBar,
} from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';
import { BarChart } from '@/components/charts';
import { toStageSeries } from '@/lib/chart-data';
import { buildNeedsAttention, type AttentionItem, type AttentionKind } from '@/lib/needs-attention';
import { earliestPostClaimPosition } from '@/lib/board';
import { useThemeMode } from '@/lib/use-theme-mode';
import { statusMarkerColor } from '@/lib/map-theme';
import {
  IconEvents,
  IconIncidents,
  IconReports,
  IconSearch,
  IconTasks,
  IconVolunteers,
  IconWorkflow,
} from '@/components/icons';
import type {
  AuditLogEntry,
  DashboardMapIncident,
  DashboardStats,
  EventSummary,
  IncidentSummary,
  Organisation,
  OrganisationMember,
  Paginated,
  PoolIncident,
  Task,
  WorkflowStage,
} from '@/lib/types';
import { ApiError } from '@/lib/api';
import { IncidentMap } from '@/components/incident-map';

const RECENT_ACTIVITY_LIMIT = 20;
const VOLUNTEER_ACTIVITY_LIMIT = 8;

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

const ATTENTION_ICON: Record<AttentionKind, typeof IconIncidents> = {
  unclaimed: IconIncidents,
  joinRequests: IconVolunteers,
  taskOverdue: IconTasks,
  eventSoon: IconEvents,
  incidentStalled: IconWorkflow,
};

const MAP_LEGEND_STATUSES = ['approved', 'rejected', 'duplicate'] as const;

export default function DashboardPage() {
  const { t } = useTranslation();
  const { activeOrgId } = useAuth();
  const mode = useThemeMode();
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
  const orgPath = activeOrgId ? `/organisations/${activeOrgId}` : null;
  const poolPath = activeOrgId ? '/incidents/pool' : null;
  const eventsPath = activeOrgId ? `/organisations/${activeOrgId}/events?limit=100` : null;
  // Same key org-guard.tsx's nav badge already fetches, so SWR dedupes this
  // rather than issuing a second request.
  const joinRequestsPath = activeOrgId ? `/organisations/${activeOrgId}/join-requests?status=pending&limit=1` : null;

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
  const { data: organisation, error: orgError } = useApiGet<Organisation>(orgPath);
  const { data: pool, error: poolError } = useApiGet<PoolIncident[]>(poolPath);
  const { data: eventsPage, error: eventsError } = useApiGet<Paginated<EventSummary>>(eventsPath);
  const events = eventsPage?.items;
  const { data: joinRequestsPage, error: joinRequestsError } = useApiGet<Paginated<unknown>>(joinRequestsPath);
  const pendingJoinRequests = joinRequestsPage?.total;

  const error =
    statsError ||
    mapError ||
    incidentsError ||
    stagesError ||
    auditError ||
    volunteersError ||
    tasksError ||
    orgError ||
    poolError ||
    eventsError ||
    joinRequestsError;

  const stagesById = useMemo(() => new Map((stages ?? []).map((s) => [s.id, s])), [stages]);
  const volunteersById = useMemo(() => new Map((volunteers ?? []).map((v) => [v.id, v])), [volunteers]);

  // SRS 3.1.17's three-way cleanup-progress split: resolved / claimed-but-stalled
  // (still at the org's earliest post-claim stage) / everything in between. The
  // stats endpoint only exposes a flat resolvedIncidents count, so the "claimed
  // but not yet advanced" and "in progress" buckets are derived here from the
  // claimed-incidents list plus stage metadata rather than the API.
  const earliestPostClaimStage = useMemo(() => earliestPostClaimPosition(stages ?? []), [stages]);

  const cleanupProgress = useMemo(() => {
    if (!incidents || !stages || stages.length === 0) return null;
    const total = incidents.length;
    if (total === 0) return { resolvedPct: 0, stalledPct: 0, inProgressPct: 0 };
    let resolved = 0;
    let stalled = 0;
    for (const incident of incidents) {
      const stage = incident.currentStageId ? stagesById.get(incident.currentStageId) : undefined;
      if (!stage) continue;
      if (stage.isFinal) resolved += 1;
      else if (earliestPostClaimStage !== null && stage.position === earliestPostClaimStage) stalled += 1;
    }
    const inProgress = Math.max(0, total - resolved - stalled);
    return {
      resolvedPct: (resolved / total) * 100,
      stalledPct: (stalled / total) * 100,
      inProgressPct: (inProgress / total) * 100,
    };
  }, [incidents, stages, stagesById, earliestPostClaimStage]);

  const stageSeries = useMemo(() => (incidents && stages ? toStageSeries(incidents, stages) : []), [incidents, stages]);

  const attentionReady = Boolean(pool && tasks && events && incidents && stages);
  const needsAttention: AttentionItem[] = useMemo(
    () =>
      attentionReady
        ? buildNeedsAttention({
            pool: pool ?? [],
            pendingJoinRequests: pendingJoinRequests ?? 0,
            tasks: tasks ?? [],
            events: events ?? [],
            incidents: incidents ?? [],
            stages: stages ?? [],
          })
        : [],
    [attentionReady, pool, pendingJoinRequests, tasks, events, incidents, stages],
  );

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

  function resolveActorName(actingUserId: string | null): string {
    if (!actingUserId) return t('dashboard.recentActivity.unknownActor');
    return volunteersById.get(actingUserId)?.fullName ?? t('dashboard.recentActivity.unknownActor');
  }

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

  const currentMonthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const radiusKm = organisation?.serviceAreaRadiusKm;

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
          <KpiCard label={t('dashboard.kpi.totalIncidents')} value={stats.totalIncidents} icon={<IconIncidents />} accent />
          <KpiCard
            label={t('dashboard.kpi.claimedThisMonth')}
            value={stats.claimedThisMonth}
            icon={<IconWorkflow />}
            sub={currentMonthLabel}
          />
          <KpiCard
            label={t('dashboard.kpi.awaitingClaim')}
            value={stats.awaitingClaimInServiceArea}
            icon={<IconSearch />}
            tone="pending"
            sub={radiusKm ? t('dashboard.kpi.awaitingClaimSub', { km: radiusKm }) : undefined}
          />
          <KpiCard
            label={<>{t('dashboard.kpi.closed')} <HelpHint text={t('dashboard.kpi.closedHint')} /></>}
            value={stats.resolvedIncidents}
            icon={<IconReports />}
            tone="resolved"
          />
          <KpiCard label={t('dashboard.kpi.activeVolunteers')} value={stats.activeVolunteers} icon={<IconVolunteers />} />
          <KpiCard label={t('dashboard.kpi.completedTasks')} value={stats.completedCleanupTasks} icon={<IconTasks />} tone="resolved" />
        </KpiRow>
      )}

      <div className="two-col-grid">
        <Card style={{ padding: 20 }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>{t('dashboard.needsAttention.title')}</h3>
          {!attentionReady ? (
            <Skeleton height={160} />
          ) : needsAttention.length === 0 ? (
            <p className="chart-empty">{t('dashboard.needsAttention.empty')}</p>
          ) : (
            <ul className="attention-list">
              {needsAttention.map((item) => {
                const Glyph = ATTENTION_ICON[item.kind];
                return (
                  <li key={item.id}>
                    <Link href={item.href} className="attention-row">
                      <span className={`attention-icon attention-icon--${item.severity}`} aria-hidden="true">
                        <Glyph />
                      </span>
                      <span className="attention-body">
                        <span className="attention-title">{item.title}</span>
                        <span className="attention-detail">{item.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>{t('dashboard.stagesChart.title')}</h3>
          {!incidents || !stages ? (
            <Skeleton height={120} />
          ) : (
            <BarChart data={stageSeries} emptyLabel={t('dashboard.stagesChart.empty')} />
          )}
          <div className="card-footer-divider" />
          {!cleanupProgress ? (
            <Skeleton height={16} />
          ) : (
            <ProgressBar
              segments={[
                {
                  value: cleanupProgress.resolvedPct,
                  color: 'var(--resolved)',
                  label: t('dashboard.progress.resolved', { pct: cleanupProgress.resolvedPct.toFixed(0) }),
                },
                {
                  value: cleanupProgress.inProgressPct,
                  color: 'var(--progress)',
                  label: t('dashboard.progress.inProgress', { pct: cleanupProgress.inProgressPct.toFixed(0) }),
                },
                {
                  value: cleanupProgress.stalledPct,
                  color: 'var(--pending)',
                  label: t('dashboard.progress.stalled', { pct: cleanupProgress.stalledPct.toFixed(0) }),
                },
              ]}
              max={100}
            />
          )}
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>{t('dashboard.map.title')}</SectionTitle>
        <Card style={{ padding: 20 }}>
          {!mapIncidents ? (
            <Skeleton height={260} />
          ) : (
            <>
              <IncidentMap incidents={mapIncidents} />
              <ul className="donut-legend map-legend">
                {MAP_LEGEND_STATUSES.map((status) => (
                  <li key={status}>
                    <span className="donut-legend-dot" style={{ background: statusMarkerColor(status, mode) }} aria-hidden="true" />
                    {t(`dashboard.map.legend.${status}`)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>{t('dashboard.volunteerActivity.title')}</SectionTitle>
        <DataTable
          caption={t('dashboard.volunteerActivity.title')}
          columns={volunteerActivityColumns}
          rows={volunteerActivity.slice(0, VOLUNTEER_ACTIVITY_LIMIT)}
          getRowKey={({ member }) => member.id}
          loading={!volunteers || !tasks}
          empty={t('dashboard.volunteerActivity.empty')}
        />
        {volunteerActivity.length > VOLUNTEER_ACTIVITY_LIMIT && (
          <Link href="/volunteers" className="view-all-link">
            {t('dashboard.volunteerActivity.viewAll')}
          </Link>
        )}
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
                  <div className="t-label">{`${resolveActorName(entry.actingUserId)} · ${humanizeAction(entry.action)}`}</div>
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
