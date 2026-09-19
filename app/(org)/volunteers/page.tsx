'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import {
  Avatar,
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorBanner,
  FilterBar,
  FilterPanel,
  FilterPill,
  HelpHint,
  MetaList,
  PageHeader,
  ProgressBar,
  SearchInput,
  SectionTitle,
  Skeleton,
  StatusChip,
} from '@/components/ui';
import type { OrganisationMember, Paginated, Task } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function VolunteersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const [selectedVolunteer, setSelectedVolunteer] = useState<OrganisationMember | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('desc');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // limit=100 on both: the completed/active task counts and the sort below
  // aggregate over the complete set, not just the first page.
  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer&limit=100` : null;
  const { data: volunteersPage, error: volunteersError, mutate: mutateVolunteers } =
    useApiGet<Paginated<OrganisationMember>>(volunteersPath);
  const volunteers = volunteersPage?.items;

  const tasksPath = activeOrgId ? `/organisations/${activeOrgId}/tasks?limit=100` : null;
  const { data: tasksPage } = useApiGet<Paginated<Task>>(tasksPath);
  const tasks = tasksPage?.items;

  async function handleRemove(volunteer: OrganisationMember) {
    if (!activeOrgId) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await api.del(`/organisations/${activeOrgId}/volunteers/${volunteer.id}`);
      setSelectedVolunteer(null);
      await mutateVolunteers();
    } catch (caught) {
      setRemoveError(caught instanceof ApiError ? caught.message : t('volunteers.profile.removeError'));
    } finally {
      setRemoving(false);
    }
  }

  const completedTasksCountByUser = useMemo(() => {
    const counts = new Map<string, number>();
    (tasks ?? [])
      .filter((t) => t.status === 'completed')
      .forEach((t) =>
        t.assignments.forEach((a) => counts.set(a.volunteerUserId, (counts.get(a.volunteerUserId) ?? 0) + 1)),
      );
    return counts;
  }, [tasks]);

  const activeTaskCountByUser = useMemo(() => {
    const counts = new Map<string, number>();
    (tasks ?? [])
      .filter((t) => t.status !== 'completed')
      .forEach((t) =>
        t.assignments.forEach((a) => counts.set(a.volunteerUserId, (counts.get(a.volunteerUserId) ?? 0) + 1)),
      );
    return counts;
  }, [tasks]);

  const sortedVolunteers = useMemo(() => {
    if (!volunteers) return [];
    const list = [...volunteers];
    if (sortOrder) {
      list.sort((a, b) => {
        const countA = completedTasksCountByUser.get(a.id) ?? 0;
        const countB = completedTasksCountByUser.get(b.id) ?? 0;
        return sortOrder === 'desc' ? countB - countA : countA - countB;
      });
    }
    return list;
  }, [volunteers, sortOrder, completedTasksCountByUser]);

  const visibleVolunteers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortedVolunteers
      .filter((volunteer) => activeFilter === 'all' || (activeFilter === 'active') === volunteer.isActive)
      .filter(
        (volunteer) =>
          !query || volunteer.fullName.toLowerCase().includes(query) || volunteer.email.toLowerCase().includes(query),
      );
  }, [sortedVolunteers, searchQuery, activeFilter]);

  const activeFilterCount = (activeFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0) + (sortOrder !== 'desc' ? 1 : 0);

  function resetFilters() {
    setActiveFilter('all');
    setSearchQuery('');
    setSortOrder('desc');
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return t('common.notAvailable');
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Tasks and events for the currently selected volunteer
  const selectedVolunteerTasks = useMemo(() => {
    if (!tasks || !selectedVolunteer) return [];
    return tasks
      .filter((t) => t.assignments.some((a) => a.volunteerUserId === selectedVolunteer.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks, selectedVolunteer]);

  return (
    <div>
      <PageHeader
        title={t('volunteers.title')}
        description={t('volunteers.description')}
        action={<Button variant="secondary" onClick={() => router.push('/settings')}>{t('volunteers.manageInviteLinks')}</Button>}
      />

      {volunteersError && (
        <ErrorBanner
          message={volunteersError instanceof ApiError ? volunteersError.message : t('volunteers.loadError')}
        />
      )}

      <FilterPanel activeCount={activeFilterCount} onReset={resetFilters}>
        <FilterBar>
          <FilterPill active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>
            {t('volunteers.filters.all')}
          </FilterPill>
          <FilterPill active={activeFilter === 'active'} onClick={() => setActiveFilter('active')}>
            {t('common.status.active')}
          </FilterPill>
          <FilterPill active={activeFilter === 'inactive'} onClick={() => setActiveFilter('inactive')}>
            {t('common.status.inactive')}
          </FilterPill>
        </FilterBar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          label={t('volunteers.searchLabel')}
          placeholder={t('volunteers.searchPlaceholder')}
          hint={t('volunteers.searchHint')}
        />
        <div className="field" style={{ minWidth: 220 }}>
          <label htmlFor="volunteer-sort">{t('volunteers.filters.sortLabel')}</label>
          <select
            id="volunteer-sort"
            value={sortOrder ?? ''}
            onChange={(e) => setSortOrder(e.target.value === '' ? null : (e.target.value as 'asc' | 'desc'))}
          >
            <option value="">{t('volunteers.filters.sortNone')}</option>
            <option value="desc">{t('volunteers.filters.sortMostCompleted')}</option>
            <option value="asc">{t('volunteers.filters.sortFewestCompleted')}</option>
          </select>
        </div>
      </FilterPanel>

      {!volunteers && !volunteersError && (
        <div className="pool-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton height={120} />
            </Card>
          ))}
        </div>
      )}

      {volunteers && visibleVolunteers.length === 0 && (
        <Card>
          <EmptyState>
            <p>{t('volunteers.table.empty')}</p>
          </EmptyState>
        </Card>
      )}

      {visibleVolunteers.length > 0 && (
        <div className="pool-grid">
          {visibleVolunteers.map((volunteer) => {
            const completed = completedTasksCountByUser.get(volunteer.id) ?? 0;
            const active = activeTaskCountByUser.get(volunteer.id) ?? 0;
            return (
              <Card
                key={volunteer.id}
                className="volunteer-card"
                onClick={() => {
                  setSelectedVolunteer(volunteer);
                  setConfirmingRemove(false);
                  setRemoveError(null);
                }}
              >
                <div className="volunteer-card-head">
                  <Avatar name={volunteer.fullName} size={44} />
                  <div className="volunteer-card-identity">
                    <span className="volunteer-card-name">{volunteer.fullName}</span>
                    <span className="volunteer-card-email">{volunteer.email}</span>
                  </div>
                  <StatusChip status={volunteer.isActive ? 'active' : 'inactive'} />
                </div>
                <div className="volunteer-card-stats">
                  <div>
                    <strong>{completed}</strong>
                    <span>{t('volunteers.table.tasksCompleted')}</span>
                  </div>
                  <div>
                    <strong>{active}</strong>
                    <span>{t('volunteers.table.activeTasks')}</span>
                  </div>
                </div>
                {completed + active > 0 && (
                  <ProgressBar
                    segments={[
                      { value: completed, color: 'var(--resolved)', label: t('volunteers.table.tasksCompleted') },
                      { value: active, color: 'var(--progress)', label: t('volunteers.table.activeTasks') },
                    ]}
                    showLegend={false}
                    height={6}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Volunteer Profile Drawer */}
      <Drawer
        open={!!selectedVolunteer}
        onClose={() => setSelectedVolunteer(null)}
        title={t('volunteers.profile.title')}
      >
        {selectedVolunteer && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
            {/* Profile Overview */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <Avatar name={selectedVolunteer.fullName} size={50} />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selectedVolunteer.fullName}</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <StatusChip status={selectedVolunteer.isActive ? 'active' : 'inactive'} />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {t('volunteers.profile.memberSince', { date: formatDate(selectedVolunteer.createdAt) })}
                  </span>
                  <HelpHint text={t('volunteers.profile.memberSinceHint')} />
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div>
              <SectionTitle>{t('volunteers.profile.personalDetails')}</SectionTitle>
              <MetaList
                items={[
                  { label: t('volunteers.profile.email'), value: selectedVolunteer.email },
                  {
                    label: t('volunteers.profile.role'),
                    value: <span style={{ textTransform: 'capitalize' }}>{selectedVolunteer.role.replace('_', ' ')}</span>,
                  },
                ]}
              />
            </div>

            {/* Task History */}
            <div>
              <SectionTitle>
                {t('volunteers.profile.taskHistoryCount', {
                  completed: completedTasksCountByUser.get(selectedVolunteer.id) ?? 0,
                  active: activeTaskCountByUser.get(selectedVolunteer.id) ?? 0,
                })}
              </SectionTitle>
              {selectedVolunteerTasks.length === 0 ? (
                <EmptyState>
                  <p style={{ fontSize: 13, margin: 0 }}>{t('volunteers.profile.noTaskHistory')}</p>
                </EmptyState>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                  {selectedVolunteerTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: 10,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: 'var(--surface-3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </span>
                        <StatusChip status={task.status} domain="task" />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('volunteers.profile.priority', { priority: task.priority })}</span>
                        <span>
                          {task.status === 'completed'
                            ? `${t('volunteers.profile.completed')}: ${formatDate(task.completedAt ?? task.dueDate)}`
                            : `${t('volunteers.profile.due')}: ${formatDate(task.dueDate)}`}
                        </span>
                      </div>
                      {/* Evidence Thumbnails */}
                      {task.photos && task.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {task.photos.map((photo) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={photo.id}
                              className="media-thumb"
                              src={photo.url}
                              alt={t('volunteers.profile.evidenceThumbnail')}
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 4,
                                objectFit: 'cover',
                                border: '1px solid var(--border)',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Remove volunteer (SRS 3.1.10) */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 'auto' }}>
              {removeError && <div style={{ marginBottom: 8 }}><ErrorBanner message={removeError} /></div>}
              {confirmingRemove ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                    {t('volunteers.profile.removeConfirm', { name: selectedVolunteer.fullName })}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" disabled={removing} onClick={() => setConfirmingRemove(false)}>
                      {t('volunteers.profile.cancel')}
                    </Button>
                    <Button variant="destructive" disabled={removing} onClick={() => handleRemove(selectedVolunteer)}>
                      {removing ? t('volunteers.profile.removing') : t('volunteers.profile.confirmRemove')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="destructive" onClick={() => setConfirmingRemove(true)}>
                  {t('volunteers.profile.removeVolunteer')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
