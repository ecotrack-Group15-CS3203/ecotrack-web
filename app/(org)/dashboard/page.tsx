'use client';

import { useMemo } from 'react';
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
} from '@/components/ui';
import type { AuditLogEntry, DashboardStats, Incident, OrganisationMember, Task } from '@/lib/types';
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
  const { activeOrgId } = useAuth();
  const statsPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/stats` : null;
  const mapPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/map` : null;
  const incidentsPath = activeOrgId ? `/organisations/${activeOrgId}/incidents` : null;
  const auditPath = activeOrgId ? `/organisations/${activeOrgId}/audit-logs` : null;
  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer` : null;
  const tasksPath = activeOrgId ? `/organisations/${activeOrgId}/tasks` : null;

  const { data: stats, error: statsError } = useApiGet<DashboardStats>(statsPath);
  const { data: incidents, error: incidentsError } = useApiGet<Incident[]>(mapPath);
  const { data: workflowIncidents, error: workflowIncidentsError } = useApiGet<Incident[]>(incidentsPath);
  const { data: auditLog, error: auditError } = useApiGet<AuditLogEntry[]>(auditPath);
  const { data: volunteers, error: volunteersError } = useApiGet<OrganisationMember[]>(volunteersPath);
  const { data: tasks, error: tasksError } = useApiGet<Task[]>(tasksPath);

  const error = statsError || incidentsError || workflowIncidentsError || auditError || volunteersError || tasksError;

  const stageDistribution = useMemo(() => {
    if (!workflowIncidents) return [];
    const counts = new Map<string, number>();
    for (const incident of workflowIncidents) {
      const label = incident.currentStage?.name ?? 'Unstaged';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([stage, count]) => ({ stage, count }));
  }, [workflowIncidents]);

  const volunteerActivity = useMemo(() => {
    if (!volunteers || !tasks) return [];
    return volunteers.map((member) => {
      const own = tasks.filter((t) => t.assignments.some((a) => a.volunteerUserId === member.userId));
      const completed = own.filter((t) => t.status === 'completed').length;
      const pending = own.filter((t) => t.status !== 'completed').length;
      const lastActive =
        own
          .flatMap((t) =>
            t.assignments.filter((a) => a.volunteerUserId === member.userId).map((a) => a.respondedAt ?? t.createdAt),
          )
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

  if (!activeOrgId) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview for your organisation" />
        <Skeleton height={96} style={{ marginBottom: 20 }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview for your organisation" />

      {error && (
        <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load some dashboard data'} />
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
          <KpiCard label="Total incidents" value={stats.totalIncidents} />
          <KpiCard label="Pending verification" value={stats.pendingIncidents} tone="pending" />
          <KpiCard label="Verified" value={stats.verifiedIncidents} tone="verified" />
          <KpiCard label="Resolved" value={stats.resolvedIncidents} tone="resolved" />
          <KpiCard label="Active volunteers" value={stats.activeVolunteers} />
          <KpiCard label="Completed cleanup tasks" value={stats.completedCleanupTasks} tone="resolved" />
        </KpiRow>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Incidents by workflow stage</h3>
          {!workflowIncidents ? (
            <Skeleton height={120} />
          ) : stageDistribution.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>No incidents recorded yet.</p>
          ) : (
            <>
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
            </>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Cleanup progress</h3>
          {!stats ? <Skeleton height={16} /> : <ProgressBar stats={stats} />}
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>Incident map</SectionTitle>
        <Card style={{ padding: 20 }}>
          {!incidents ? (
            <Skeleton height={260} />
          ) : (
            <IncidentMap incidents={incidents} />
          )}
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>Volunteer activity</SectionTitle>
        <Card>
          {!volunteers || !tasks ? (
            <div style={{ padding: 20 }}>
              <Skeleton height={14} style={{ marginBottom: 12 }} />
              <Skeleton height={14} style={{ marginBottom: 12 }} />
              <Skeleton height={14} />
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tasks completed</th>
                  <th>Tasks pending</th>
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {volunteerActivity.map(({ member, completed, pending, lastActive }) => (
                  <tr key={member.id}>
                    <td>
                      <div className="row-flex">
                        <Avatar name={member.user.fullName} />
                        {member.user.fullName}
                      </div>
                    </td>
                    <td>{completed}</td>
                    <td>{pending}</td>
                    <td>{formatDate(lastActive)}</td>
                  </tr>
                ))}
                {volunteerActivity.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>
                      No volunteers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>Recent activity</SectionTitle>
        <Card style={{ padding: 20 }}>
          {!auditLog ? (
            <>
              <Skeleton height={14} style={{ marginBottom: 12 }} />
              <Skeleton height={14} style={{ marginBottom: 12 }} />
              <Skeleton height={14} />
            </>
          ) : recentActivity.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>No activity recorded yet.</p>
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

function ProgressBar({ stats }: { stats: DashboardStats }) {
  const total = Math.max(1, stats.totalIncidents);
  const resolvedPct = (stats.resolvedIncidents / total) * 100;
  const inProgressPct = (Math.max(0, stats.verifiedIncidents - stats.resolvedIncidents) / total) * 100;
  const pendingPct = (stats.pendingIncidents / total) * 100;

  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: '#F0EFE9' }}>
        <div style={{ width: `${resolvedPct}%`, background: 'var(--resolved)' }} title={`Resolved: ${resolvedPct.toFixed(0)}%`} />
        <div style={{ width: `${inProgressPct}%`, background: 'var(--progress)' }} title={`In progress: ${inProgressPct.toFixed(0)}%`} />
        <div style={{ width: `${pendingPct}%`, background: 'var(--pending)' }} title={`Pending: ${pendingPct.toFixed(0)}%`} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>
        <Legend color="var(--resolved)" label={`Resolved ${resolvedPct.toFixed(0)}%`} />
        <Legend color="var(--progress)" label={`In progress ${inProgressPct.toFixed(0)}%`} />
        <Legend color="var(--pending)" label={`Pending ${pendingPct.toFixed(0)}%`} />
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

