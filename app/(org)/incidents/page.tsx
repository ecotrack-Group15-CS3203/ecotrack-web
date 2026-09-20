'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import {
  Chip, DataTable, ErrorBanner, FilterBar, FilterPanel, FilterPill, PageHeader, SearchInput,
  Spinner, StatusChip, TableThumb,
} from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';
import type { Incident, IncidentSeverity, Paginated, VerificationStatus, WorkflowStage } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { thumbGradient } from '@/lib/thumb-gradients';
import { buildBoard } from '@/lib/board';
import { PipelineBoard, ViewToggle } from './pipeline-board';

const STATUS_TABS: (VerificationStatus | 'all')[] = ['all', 'approved', 'rejected', 'duplicate'];

const SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
const VIEW_STORAGE_KEY = 'ecotrack.incidents.view';

type View = 'list' | 'board';

export default function IncidentsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <IncidentsPageInner />
    </Suspense>
  );
}

function IncidentsPageInner() {
  const { t } = useTranslation();
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useAuthedFetch();

  const view: View = searchParams.get('view') === 'board' ? 'board' : 'list';

  // A bare /incidents visit (no explicit ?view=) follows the last choice
  // remembered for this browser. This is a navigation, not a setState, so it
  // doesn't trip react-hooks/set-state-in-effect, and it avoids the
  // hydration mismatch a localStorage-seeded useState would cause.
  useEffect(() => {
    if (searchParams.get('view')) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(VIEW_STORAGE_KEY);
    } catch {
      // Storage blocked: just keep the default view for this page view.
    }
    if (stored === 'board') {
      const next = new URLSearchParams(searchParams.toString());
      next.set('view', 'board');
      router.replace(`/incidents?${next.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setView(next: View) {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the switch still applies for this page view.
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'list') params.delete('view');
    else params.set('view', next);
    const query = params.toString();
    router.replace(query ? `/incidents?${query}` : '/incidents');
  }

  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [query, setQuery] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  // limit=100 (the API's cap): this page's filters and sort all run
  // client-side over whatever this fetch returns, so it needs the fullest
  // page available rather than the default 20 -- see Decision 2 in the
  // completion plan (a bounded page beats building pagination UI here).
  const listPath = activeOrgId
    ? `/organisations/${activeOrgId}/incidents?limit=100${statusFilter === 'all' ? '' : `&status=${statusFilter}`}`
    : null;
  const { data: incidentsPage, error, mutate } = useApiGet<Paginated<Incident>>(listPath);
  const incidents = incidentsPage?.items;
  const stagesPath = activeOrgId ? `/organisations/${activeOrgId}/workflow-stages` : null;
  const { data: stages } = useApiGet<WorkflowStage[]>(stagesPath);
  const stagesById = useMemo(() => new Map((stages ?? []).map((s) => [s.id, s])), [stages]);

  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 86_400_000 : null;
    const q = query.trim().toLowerCase();
    return incidents
      .filter((i) => stageFilter === 'all' || i.currentStageId === stageFilter)
      .filter((i) => severityFilter === 'all' || i.severity === severityFilter)
      .filter((i) => !q || i.title.toLowerCase().includes(q))
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
  }, [incidents, stageFilter, severityFilter, dateFrom, dateTo, sortOrder, query]);

  // Board view ignores stage (redundant -- filtering to one stage leaves one
  // populated column) and sort (fixed to oldest-first by design), but still
  // respects status/severity/date/search.
  const board = useMemo(
    () => buildBoard(view === 'board' ? filteredIncidents : [], stages ?? []),
    [view, filteredIncidents, stages],
  );

  async function moveIncident(incident: Incident, targetStage: WorkflowStage) {
    if (!activeOrgId) return;
    setMoveError(null);
    setMovingId(incident.id);
    const snapshot = incidentsPage;
    if (incidentsPage) {
      const optimistic: Paginated<Incident> = {
        ...incidentsPage,
        items: incidentsPage.items.map((i) =>
          i.id === incident.id ? { ...i, currentStageId: targetStage.id } : i,
        ),
      };
      await mutate(optimistic, { revalidate: false });
    }
    try {
      await api.patch(`/organisations/${activeOrgId}/incidents/${incident.id}/stage`, {
        stageId: targetStage.id,
        expectedVersion: incident.version,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMoveError(t('incidentsList.moveConflict'));
      } else {
        setMoveError(err instanceof ApiError ? err.message : t('incidentsList.moveError'));
        if (snapshot) await mutate(snapshot, { revalidate: false });
      }
    } finally {
      // Mandatory, not a nicety: a successful PATCH increments the server's
      // `version`, so a second move using the stale cached expectedVersion
      // would 409. This also confirms the 409 case lands on the server's
      // actual current state rather than wherever the user dropped it.
      await mutate();
      setMovingId(null);
    }
  }

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
      render: (incident) => <StatusChip status={incident.verificationStatus ?? 'pending'} />,
    },
    {
      key: 'submitted',
      header: t('incidentsList.table.submitted'),
      render: (incident) => new Date(incident.createdAt).toLocaleDateString(),
    },
  ];

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (stageFilter !== 'all' ? 1 : 0) +
    (severityFilter !== 'all' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (query.trim() ? 1 : 0);

  function resetFilters() {
    setStatusFilter('all');
    setStageFilter('all');
    setSeverityFilter('all');
    setDateFrom('');
    setDateTo('');
    setQuery('');
  }

  return (
    <div>
      <PageHeader
        title={t('incidentsList.title')}
        description={t('incidentsList.description')}
        action={<ViewToggle view={view} onChange={setView} />}
      />

      <FilterBar>
        {STATUS_TABS.map((status) => (
          <FilterPill key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
            {t(`incidentsList.statusTabs.${status}`)}
          </FilterPill>
        ))}
      </FilterBar>

      <FilterPanel activeCount={activeFilterCount} onReset={resetFilters}>
        <SearchInput
          value={query}
          onChange={setQuery}
          label={t('incidentsList.filters.searchLabel')}
          placeholder={t('incidentsList.filters.searchPlaceholder')}
          hint={t('incidentsList.filters.searchHint')}
        />
        {view === 'list' && (
          <>
            <label htmlFor="incident-stage-filter" className="sr-only">{t('incidentsList.filters.allStages')}</label>
            <select id="incident-stage-filter" aria-label={t('incidentsList.filters.allStages')} className="filter-control" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
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
          </>
        )}
        <label htmlFor="incident-severity-filter" className="sr-only">{t('incidentsList.filters.allUrgency')}</label>
        <select id="incident-severity-filter" aria-label={t('incidentsList.filters.allUrgency')} className="filter-control" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | 'all')}>
          <option value="all">{t('incidentsList.filters.allUrgency')}</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 14, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('incidentsList.filters.from')}
          <input id="incident-date-from" aria-label={t('incidentsList.filters.dateFromLabel')} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label style={{ fontSize: 14, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('incidentsList.filters.to')}
          <input id="incident-date-to" aria-label={t('incidentsList.filters.dateToLabel')} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        {view === 'list' && (
          <>
            <label htmlFor="incident-sort" className="sr-only">{t('incidentsList.filters.sortLabel')}</label>
            <select id="incident-sort" aria-label={t('incidentsList.filters.sortLabel')} className="filter-control" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}>
              <option value="newest">{t('incidentsList.filters.newestFirst')}</option>
              <option value="oldest">{t('incidentsList.filters.oldestFirst')}</option>
            </select>
          </>
        )}
      </FilterPanel>

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : t('incidentsList.loadError')} />}
      {moveError && <div style={{ marginBottom: 16 }}><ErrorBanner message={moveError} /></div>}
      {!incidents && !error && <Spinner />}

      {incidentsPage && incidentsPage.total > incidentsPage.items.length && (
        <div className="cap-warning">{t('incidentsList.capWarning', { total: incidentsPage.total })}</div>
      )}

      {incidents && view === 'list' && (
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

      {incidents && view === 'board' && (
        <PipelineBoard board={board} stages={stages ?? []} onMove={moveIncident} movingId={movingId} />
      )}
    </div>
  );
}
