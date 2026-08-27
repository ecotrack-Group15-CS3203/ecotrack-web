'use client';

import { Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, Card, Chip, EmptyState, ErrorBanner, FieldError, FilterBar, FilterPill, Modal, PageHeader, Spinner } from '@/components/ui';
import type { Incident, OrganisationMember, Task, TaskPriority, TaskStatus } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { useFieldValidation, required } from '@/lib/use-field-validation';

const STATUS_TABS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Scheduled', value: 'pending' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function TasksPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TasksPageInner />
    </Suspense>
  );
}

function TasksPageInner() {
  const { t } = useTranslation();
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedIncidentId = searchParams.get('incidentId');
  const api = useAuthedFetch();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [volunteerFilter, setVolunteerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(() => Boolean(preselectedIncidentId));

  const listPath = activeOrgId
    ? `/organisations/${activeOrgId}/tasks${statusFilter === 'all' ? '' : `?status=${statusFilter}`}`
    : null;
  const { data: tasks, error, mutate } = useApiGet<Task[]>(listPath);
  const approvedIncidentsPath = activeOrgId ? `/organisations/${activeOrgId}/incidents?status=approved` : null;
  const { data: approvedIncidents } = useApiGet<Incident[]>(approvedIncidentsPath);
  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer` : null;
  const { data: volunteers } = useApiGet<OrganisationMember[]>(volunteersPath);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 86_400_000 : null;
    return tasks.filter((task) => {
      if (volunteerFilter !== 'all' && !task.assignments.some((a) => a.volunteerUserId === volunteerFilter)) {
        return false;
      }
      if (task.scheduledAt) {
        const due = new Date(task.scheduledAt).getTime();
        if (from !== null && due < from) return false;
        if (to !== null && due > to) return false;
      }
      return true;
    });
  }, [tasks, volunteerFilter, dateFrom, dateTo]);

  return (
    <div>
      <PageHeader
        title={t('tasksList.title')}
        description={t('tasksList.description')}
        action={<Button onClick={() => setShowCreate(true)}>{t('tasksList.createTask')}</Button>}
      />

      <FilterBar>
        {STATUS_TABS.map((tab) => (
          <FilterPill key={tab.value} active={statusFilter === tab.value} onClick={() => setStatusFilter(tab.value)}>
            {t(`tasksList.statusTabs.${tab.value}`)}
          </FilterPill>
        ))}
      </FilterBar>

      <FilterBar>
        <label className="filter-control" htmlFor="task-volunteer-filter"><span className="sr-only">{t('tasksList.filters.allVolunteers')}</span>
        <select id="task-volunteer-filter" aria-label={t('tasksList.filters.allVolunteers')} value={volunteerFilter} onChange={(e) => setVolunteerFilter(e.target.value)}>
          <option value="all">{t('tasksList.filters.allVolunteers')}</option>
          {(volunteers ?? []).map((v) => (
            <option key={v.userId} value={v.userId}>
              {v.user.fullName}
            </option>
          ))}
        </select></label>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('tasksList.filters.dueFrom')}
          <input id="task-due-from" aria-label={t('tasksList.filters.dueFrom')} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('tasksList.filters.dueTo')}
          <input id="task-due-to" aria-label={t('tasksList.filters.dueTo')} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </FilterBar>

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : t('tasksList.loadError')} />}
      {!tasks && !error && <Spinner />}

      {tasks && filteredTasks.length === 0 && (
        <Card>
          <EmptyState>
            <p>{t('tasksList.empty')}</p>
          </EmptyState>
        </Card>
      )}

      {tasks && filteredTasks.length > 0 && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Linked incident</th>
                <th>Assigned volunteer</th>
                <th>Priority</th>
                <th>Due date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/tasks/${task.id}`)}>
                  <td>{task.title}</td>
                  <td>{task.incident.title}</td>
                  <td>
                    {task.assignments.length === 0
                      ? '—'
                      : task.assignments.map((a) => a.volunteer.fullName).join(', ')}
                  </td>
                  <td>
                    <Chip tone={task.priority}>{task.priority}</Chip>
                  </td>
                  <td>{task.scheduledAt ? new Date(task.scheduledAt).toLocaleString() : '—'}</td>
                  <td>
                    <Chip tone={task.status}>{task.status === 'pending' ? 'scheduled' : task.status}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        organisationId={activeOrgId ?? ''}
        approvedIncidents={approvedIncidents ?? []}
        volunteers={volunteers ?? []}
        initialIncidentId={preselectedIncidentId}
        onCreated={async (taskId) => {
          setShowCreate(false);
          await mutate();
          router.push(`/tasks/${taskId}`);
        }}
        api={api}
      />
    </div>
  );
}

function CreateTaskModal({
  open,
  onClose,
  organisationId,
  approvedIncidents,
  volunteers,
  initialIncidentId,
  onCreated,
  api,
}: {
  open: boolean;
  onClose: () => void;
  organisationId: string;
  approvedIncidents: Incident[];
  volunteers: OrganisationMember[];
  initialIncidentId?: string | null;
  onCreated: (taskId: string) => void;
  api: ReturnType<typeof useAuthedFetch>;
}) {
  const { t } = useTranslation();
  const initialIncident = approvedIncidents.find((i) => i.id === initialIncidentId);
  const [incidentId, setIncidentId] = useState(initialIncidentId ?? '');
  const [title, setTitle] = useState(initialIncident?.title ?? '');
  const [description, setDescription] = useState(initialIncident?.description ?? '');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const incidentValidation = useFieldValidation(required(t('tasksList.createModal.incidentRequired')));
  const titleValidation = useFieldValidation(required(t('tasksList.createModal.titleRequired')));
  const descriptionValidation = useFieldValidation(required(t('tasksList.createModal.descriptionRequired')));

  const selectedIncident = approvedIncidents.find((i) => i.id === incidentId);

  function selectIncident(nextIncidentId: string) {
    setIncidentId(nextIncidentId);
    const incident = approvedIncidents.find((i) => i.id === nextIncidentId);
    if (incident) {
      setTitle(incident.title);
      setDescription(incident.description);
    }
  }

  async function handleSubmit() {
    if (!incidentId || !title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const task = await api.post<{ id: string }>(`/organisations/${organisationId}/tasks`, {
        incidentId,
        title,
        description,
        priority,
        assignedTo: assignedTo || undefined,
        scheduledAt: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      setTitle('');
      setDescription('');
      setIncidentId('');
      setAssignedTo('');
      setDueDate('');
      onCreated(task.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('tasksList.createModal.title')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={submitting || !incidentId || !title.trim() || !description.trim()} onClick={handleSubmit}>
            {submitting ? t('tasksList.createModal.creating') : t('tasksList.createModal.submit')}
          </Button>
        </>
      }
    >
      {error && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="field">
        <label htmlFor="create-task-incident">{t('tasksList.createModal.linkedIncident')}</label>
        <select id="create-task-incident" aria-invalid={Boolean(incidentValidation.error)} aria-describedby={incidentValidation.error ? 'create-task-incident-error' : undefined} value={incidentId} onChange={(e) => selectIncident(e.target.value)} onBlur={(e) => incidentValidation.onBlur(e.target.value)}>
          <option value="">{t('tasksList.createModal.selectIncident')}</option>
          {approvedIncidents.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
        {approvedIncidents.length === 0 && (
          <p className="hint">{t('tasksList.createModal.noIncidents')}</p>
        )}
        {selectedIncident && (
          <p className="hint">
            {t('tasksList.createModal.location', { lat: selectedIncident.latitude.toFixed(5), lng: selectedIncident.longitude.toFixed(5) })}
            {selectedIncident.address && ` — ${selectedIncident.address}`}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="create-task-title">{t('tasksList.createModal.titleLabel')}</label>
        <input id="create-task-title" type="text" aria-invalid={Boolean(titleValidation.error)} aria-describedby={titleValidation.error ? 'create-task-title-error' : undefined} value={title} onChange={(e) => { setTitle(e.target.value); titleValidation.revalidate(e.target.value); }} onBlur={(e) => titleValidation.onBlur(e.target.value)} placeholder={t('tasksList.createModal.titlePlaceholder')} />
        <FieldError id="create-task-title-error" message={titleValidation.error} />
      </div>
      <div className="field">
        <label htmlFor="create-task-description">{t('tasksList.createModal.descriptionLabel')}</label>
        <textarea
          id="create-task-description"
          aria-invalid={Boolean(descriptionValidation.error)}
          aria-describedby={descriptionValidation.error ? 'create-task-description-error' : undefined}
          value={description}
          onChange={(e) => { setDescription(e.target.value); descriptionValidation.revalidate(e.target.value); }}
          onBlur={(e) => descriptionValidation.onBlur(e.target.value)}
          placeholder={t('tasksList.createModal.descriptionPlaceholder')}
        />
        <FieldError id="create-task-description-error" message={descriptionValidation.error} />
      </div>
      <div className="field">
        <label htmlFor="create-task-assignee">{t('tasksList.createModal.assignTo')}</label>
        <select id="create-task-assignee" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">{t('common.unassigned')}</option>
          {volunteers.map((v) => (
            <option key={v.userId} value={v.userId}>
              {v.user.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="create-task-priority">{t('tasksList.createModal.priority')}</label>
        <select id="create-task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">{t('tasksList.createModal.priorityLow')}</option>
          <option value="medium">{t('tasksList.createModal.priorityMedium')}</option>
          <option value="high">{t('tasksList.createModal.priorityHigh')}</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="create-task-due">{t('tasksList.createModal.dueDate')}</label>
        <input id="create-task-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
    </Modal>
  );
}

