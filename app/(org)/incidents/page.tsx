'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import { Card, Chip, EmptyState, ErrorBanner, FilterBar, FilterPill, PageHeader, Spinner, TableThumb } from '@/components/ui';
import type { Incident, IncidentSeverity, VerificationStatus, WorkflowStage } from '@/lib/types';
import { ApiError } from '@/lib/api';

const STATUS_TABS: { label: string; value: VerificationStatus | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Duplicate', value: 'duplicate' },
];

const SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#F0997B,#D85A30)',
  'linear-gradient(135deg,#85B7EB,#378ADD)',
  'linear-gradient(135deg,#97C459,#639922)',
  'linear-gradient(135deg,#9FE1CB,#5DCAA5)',
  'linear-gradient(135deg,#F5C4B3,#D85A30)',
];

export default function IncidentsPage() {
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const listPath = activeOrgId
    ? `/organisations/${activeOrgId}/incidents${statusFilter === 'all' ? '' : `?status=${statusFilter}`}`
    : null;
  const { data: incidents, error } = useApiGet<Incident[]>(listPath);
  const stagesPath = activeOrgId ? `/organisations/${activeOrgId}/workflow-stages` : null;
  const { data: stages } = useApiGet<WorkflowStage[]>(stagesPath);

  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 86_400_000 : null;
    return incidents
      .filter((i) => stageFilter === 'all' || i.currentStageId === stageFilter)
      .filter((i) => severityFilter === 'all' || i.severity === severityFilter)
      .filter((i) => {
        const createdAt = new Date(i.createdAt).getTime();
        if (from !== null && createdAt < from) return false;
        if (to !== null && createdAt > to) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return sortOrder === 'newest' ? diff : -diff;
      });
  }, [incidents, stageFilter, severityFilter, dateFrom, dateTo, sortOrder]);

  return (
    <div>
      <PageHeader title="My organisation's incidents" description="Reports submitted to your organisation" />

      <FilterBar>
        {STATUS_TABS.map((tab) => (
          <FilterPill key={tab.value} active={statusFilter === tab.value} onClick={() => setStatusFilter(tab.value)}>
            {tab.label}
          </FilterPill>
        ))}
      </FilterBar>

      <FilterBar>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">All workflow stages</option>
          {(stages ?? [])
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | 'all')}>
          <option value="all">All urgency levels</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </FilterBar>

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load incidents'} />}
      {!incidents && !error && <Spinner />}

      {incidents && filteredIncidents.length === 0 && (
        <Card>
          <EmptyState>
            <p>No incidents match these filters.</p>
          </EmptyState>
        </Card>
      )}

      {incidents && filteredIncidents.length > 0 && (
        <Card>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((incident, i) => (
                <tr key={incident.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/incidents/${incident.id}`)}>
                  <td>
                    <TableThumb gradient={THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]} />
                  </td>
                  <td>{incident.title}</td>
                  <td style={{ textTransform: 'capitalize' }}>{incident.category.replace(/_/g, ' ')}</td>
                  <td>
                    <Chip tone={incident.severity}>{incident.severity}</Chip>
                  </td>
                  <td>{incident.currentStage?.name ?? '—'}</td>
                  <td>
                    <Chip tone={incident.verificationStatus}>{incident.verificationStatus}</Chip>
                  </td>
                  <td>{new Date(incident.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

