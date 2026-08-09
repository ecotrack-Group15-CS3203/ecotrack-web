'use client';

import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import { Card, KpiRow, KpiCard, PageHeader, Spinner, ErrorBanner, SectionTitle } from '@/components/ui';
import { IconPin } from '@/components/icons';
import type { AuditLogEntry, DashboardStats, Incident } from '@/lib/types';
import { ApiError } from '@/lib/api';

const PIN_TONE: Record<string, string> = {
  pending: 'var(--pending)',
  approved: 'var(--verified)',
  rejected: 'var(--rejected)',
  duplicate: 'var(--text-3)',
};

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

export default function DashboardPage() {
  const { activeOrgId } = useAuth();
  const statsPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/stats` : null;
  const mapPath = activeOrgId ? `/organisations/${activeOrgId}/dashboard/map` : null;
  const auditPath = activeOrgId ? `/organisations/${activeOrgId}/audit-logs` : null;

  const { data: stats, error: statsError } = useApiGet<DashboardStats>(statsPath);
  const { data: mapData, error: mapError } = useApiGet<Incident[]>(mapPath);
  const { data: auditLog } = useApiGet<AuditLogEntry[]>(auditPath);

  if (!activeOrgId) return <Spinner />;

  const error = statsError || mapError;
  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load dashboard'} />;
  }

  if (!stats || !mapData) return <Spinner />;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview for your organisation" />

      <KpiRow>
        <KpiCard label="Total incidents" value={stats.totalIncidents} />
        <KpiCard label="Pending verification" value={stats.pendingIncidents} tone="pending" />
        <KpiCard label="Verified" value={stats.verifiedIncidents} tone="verified" />
        <KpiCard label="Resolved" value={stats.resolvedIncidents} tone="resolved" />
      </KpiRow>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Incident map</h3>
          <div className="map-placeholder" style={{ height: 260 }}>
            {mapData.map((incident, i) => (
              <IconPin
                key={incident.id}
                style={{
                  top: 20 + ((i * 47) % 200),
                  left: 20 + ((i * 83) % 380),
                  color: PIN_TONE[incident.verificationStatus] ?? 'var(--text-3)',
                }}
              />
            ))}
          </div>
        </Card>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Recent activity</h3>
          {!auditLog || auditLog.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>No activity recorded yet.</p>
          ) : (
            <div className="timeline">
              {auditLog.slice(0, 6).map((entry) => (
                <div className="timeline-item" key={entry.id}>
                  <div className="t-label">{humanizeAction(entry.action)}</div>
                  <div className="t-date">{timeAgo(entry.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {stats.incidentsByCategory.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionTitle>Incidents by category</SectionTitle>
          <Card style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 120 }}>
              {stats.incidentsByCategory.map((c) => {
                const max = Math.max(1, ...stats.incidentsByCategory.map((x) => x.count));
                return (
                  <div
                    key={c.category}
                    title={`${c.category}: ${c.count}`}
                    style={{
                      width: 32,
                      height: `${Math.max(6, (c.count / max) * 100)}%`,
                      background: 'var(--primary)',
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
              {stats.incidentsByCategory.map((c) => (
                <span key={c.category} style={{ width: 32, textAlign: 'center' }}>
                  {c.category.split('_')[0]}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
