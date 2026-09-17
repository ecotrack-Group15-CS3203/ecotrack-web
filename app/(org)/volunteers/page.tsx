'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import {
  Avatar,
  Button,
  DataTable,
  Drawer,
  EmptyState,
  ErrorBanner,
  FilterPanel,
  MetaList,
  PageHeader,
  SearchInput,
  SectionTitle,
  Spinner,
  StatusChip,
} from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';
import type { OrganisationMember, Paginated, Task } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function VolunteersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const [selectedVolunteer, setSelectedVolunteer] = useState<OrganisationMember | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('desc');
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
      setRemoveError(caught instanceof ApiError ? caught.message : 'Unable to remove this volunteer.');
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

  const handleSortCompleted = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc'));
  };

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
    if (!query) return sortedVolunteers;
    return sortedVolunteers.filter(
      (volunteer) =>
        volunteer.fullName.toLowerCase().includes(query) || volunteer.email.toLowerCase().includes(query),
    );
  }, [sortedVolunteers, searchQuery]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'N/A';
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

  const volunteerColumns: DataTableColumn<OrganisationMember>[] = [
    {
      key: 'name',
      header: t('volunteers.table.name'),
      render: (volunteer) => (
        <div className="row-flex">
          <Avatar name={volunteer.fullName} />
          {volunteer.fullName}
        </div>
      ),
    },
    { key: 'email', header: t('volunteers.table.email'), render: (volunteer) => volunteer.email },
    { key: 'joined', header: t('volunteers.table.joinedAt'), render: (volunteer) => formatDate(volunteer.createdAt) },
    {
      key: 'completed',
      header: t('volunteers.table.tasksCompleted'),
      sort: { active: sortOrder, onToggle: handleSortCompleted },
      render: (volunteer) => completedTasksCountByUser.get(volunteer.id) ?? 0,
    },
    {
      key: 'active',
      header: t('volunteers.table.activeTasks'),
      render: (volunteer) => activeTaskCountByUser.get(volunteer.id) ?? 0,
    },
    {
      key: 'status',
      header: t('volunteers.table.status'),
      render: (volunteer) => (
        <StatusChip status={volunteer.isActive ? 'active' : 'inactive'} />
      ),
    },
  ];

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
      {!volunteers && !volunteersError && <Spinner />}

      {volunteers && (
        <>
          <FilterPanel>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              label={t('volunteers.searchLabel')}
              placeholder={t('volunteers.searchPlaceholder')}
              hint={t('volunteers.searchHint')}
            />
          </FilterPanel>
          <DataTable
            caption={t('volunteers.title')}
            columns={volunteerColumns}
            rows={visibleVolunteers}
            getRowKey={(volunteer) => volunteer.id}
            rowLabel={(volunteer) => volunteer.fullName}
            onRowActivate={(volunteer) => {
              setSelectedVolunteer(volunteer);
              setConfirmingRemove(false);
              setRemoveError(null);
            }}
            empty={t('volunteers.table.empty')}
          />
        </>
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
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('volunteers.profile.joined', { date: formatDate(selectedVolunteer.createdAt) })}</span>
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
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                {t('volunteers.profile.taskHistory')} ({completedTasksCountByUser.get(selectedVolunteer.id) ?? 0} completed,{' '}
                {activeTaskCountByUser.get(selectedVolunteer.id) ?? 0} active)
              </h4>
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
                        <span>Priority: {task.priority}</span>
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
                              alt="Evidence thumbnail"
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
