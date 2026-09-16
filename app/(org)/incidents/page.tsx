'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import { Chip, DataTable, ErrorBanner, FilterBar, FilterPill, PageHeader, Spinner, TableThumb } from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';
import type { Incident, IncidentSeverity, Paginated, VerificationStatus, WorkflowStage } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { thumbGradient } from '@/lib/thumb-gradients';

const STATUS_TABS: { label: string; value: VerificationStatus | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Duplicate', value: 'duplicate' },
];

const SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

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

  // limit=100 (the API's cap): this page's stage/severity/date filters and
  // sort all run client-side over whatever this fetch returns, so it needs
  // the fullest page available rather than the default 20 — see Decision 2
  // in the completion plan (a bounded page beats building pagination UI here).
  const listPath = activeOrgId
    ? `/organisations/${activeOrgId}/incidents?limit=100${statusFilter === 'all' ? '' : `&status=${statusFilter}`}`
    : null;
  const { data: incidentsPage, error } = useApiGet<Paginated<Incident>>(listPath);
  const incidents = incidentsPage?.items;
  const stagesPath = activeOrgId ? `/organisations/${activeOrgId}/workflow-stages` : null;
  const { data: stages } = useApiGet<WorkflowStage[]>(stagesPath);
  const stagesById = useMemo(() => new Map((stages ?? []).map((s) => [s.id, s])), [stages]);

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

  const incidentColumns: DataTableColumn<Incident>[] = [
    {
      key: 'thumb',
      header: t('incidentsList.table.thumbnail'),
      width: 60,
      render: (_incident, index) => (
        <TableThumb alt={t('incidentsList.table.thumbnail')} gradient={thumbGradient(index)} />
      ),
    },
    { key: 'title', header: t('incidentsList.table.title'), render: (incident) => incident.title },
    {
      key: 'category',
      header: t('incidentsList.table.category'),
      render: (incident) => (
        <span style={{ textTransform: 'capitalize' }}>{incident.category.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'severity',
      header: t('incidentsList.table.severity'),
      render: (incident) => <Chip tone={incident.severity}>{incident.severity}</Chip>,
    },
    {
      key: 'stage',
      header: t('incidentsList.table.stage'),
      render: (incident) => {
        const stage = incident.currentStageId ? stagesById.get(incident.currentStageId) : undefined;
        if (!stage) return '—';
        return (
          <span className="row-flex">
            <span className="stage-dot" style={{ background: stage.color }} aria-hidden="true" />
            {stage.name}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: t('incidentsList.table.status'),
      render: (incident) => (
        <Chip tone={incident.verificationStatus ?? 'pending'}>{incident.verificationStatus ?? 'pending'}</Chip>
      ),
    },
    {
      key: 'submitted',
      header: t('incidentsList.table.submitted'),
      render: (incident) => new Date(incident.createdAt).toLocaleDateString(),
    },
  ];

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

      {incidents && (
        <DataTable
          caption={t('incidentsList.title')}
          columns={incidentColumns}
          rows={filteredIncidents}
          getRowKey={(incident) => incident.id}
          rowLabel={(incident) => t('incidentsList.table.rowLabel', { title: incident.title })}
          onRowActivate={(incident) => router.push(`/incidents/${incident.id}`)}
          empty={t('incidentsList.empty')}
        />
      )}
    </div>
  );
}

