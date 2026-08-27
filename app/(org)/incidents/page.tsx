'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import { Card, Chip, EmptyState, ErrorBanner, FilterBar, FilterPill, PageHeader, Spinner, TableThumb } from '@/components/ui';
import type { Incident, IncidentSeverity, VerificationStatus, WorkflowStage } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      <PageHeader title={t('incidentsList.title')} description={t('incidentsList.description')} />

      <FilterBar>
        {STATUS_TABS.map((tab) => (
          <FilterPill key={tab.value} active={statusFilter === tab.value} onClick={() => setStatusFilter(tab.value)}>
            {t(`incidentsList.statusTabs.${tab.value}`)}
          </FilterPill>
        ))}
      </FilterBar>

      <FilterBar>
        <label htmlFor="incident-stage-filter" className="sr-only">{t('incidentsList.filters.allStages')}</label>
        <select id="incident-stage-filter" aria-label={t('incidentsList.filters.allStages')} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">{t('incidentsList.filters.allStages')}</option>
          {(stages ?? [])
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
        </select>
        <label htmlFor="incident-severity-filter" className="sr-only">{t('incidentsList.filters.allUrgency')}</label>
        <select id="incident-severity-filter" aria-label={t('incidentsList.filters.allUrgency')} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | 'all')}>
          <option value="all">{t('incidentsList.filters.allUrgency')}</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('incidentsList.filters.from')}
          <input id="incident-date-from" aria-label={t('incidentsList.filters.dateFromLabel')} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('incidentsList.filters.to')}
          <input id="incident-date-to" aria-label={t('incidentsList.filters.dateToLabel')} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label htmlFor="incident-sort" className="sr-only">{t('incidentsList.filters.sortLabel')}</label>
        <select id="incident-sort" aria-label={t('incidentsList.filters.sortLabel')} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}>
          <option value="newest">{t('incidentsList.filters.newestFirst')}</option>
          <option value="oldest">{t('incidentsList.filters.oldestFirst')}</option>
        </select>
      </FilterBar>

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : t('incidentsList.loadError')} />}
      {!incidents && !error && <Spinner />}

      {incidents && filteredIncidents.length === 0 && (
        <Card>
          <EmptyState>
            <p>{t('incidentsList.empty')}</p>
          </EmptyState>
        </Card>
      )}

      {incidents && filteredIncidents.length > 0 && (
        <Card>
          <table>
            <thead>
              <tr>
                <th scope="col">{t('incidentsList.table.thumbnail')}</th>
                <th scope="col">{t('incidentsList.table.title')}</th>
                <th scope="col">{t('incidentsList.table.category')}</th>
                <th scope="col">{t('incidentsList.table.severity')}</th>
                <th scope="col">{t('incidentsList.table.stage')}</th>
                <th scope="col">{t('incidentsList.table.status')}</th>
                <th scope="col">{t('incidentsList.table.submitted')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((incident, i) => (
                <tr key={incident.id} tabIndex={0} aria-label={t('incidentsList.table.rowLabel', { title: incident.title })} style={{ cursor: 'pointer' }} onClick={() => router.push(`/incidents/${incident.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); router.push(`/incidents/${incident.id}`); } }}>
                  <td>
                    <TableThumb alt={t('incidentsList.table.thumbnail')} gradient={THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]} />
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

