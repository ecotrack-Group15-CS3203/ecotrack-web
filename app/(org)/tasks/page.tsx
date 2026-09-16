'use client';

import { Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import {
  Button,
  Chip,
  DataTable,
  ErrorBanner,
  FieldError,
  FilterBar,
  FilterPill,
  Modal,
  PageHeader,
  Spinner,
} from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';
import type {
  IncidentSummary,
  OrganisationMember,
  Paginated,
  Task,
  TaskPriority,
  TaskStatus,
} from '@/lib/types';
import { ApiError } from '@/lib/api';
import { useFieldValidation, required } from '@/lib/use-field-validation';

const STATUS_TABS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Scheduled', value: 'pending' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
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
  const [showCreate, setShowCreate] = useState(() =>
    Boolean(preselectedIncidentId)
  );

  // limit=100 throughout: this page's status/volunteer/date filters run
  // client-side over the full fetch, and the incident/volunteer pickers in
  // "Create task" need the complete lists, not just page 1.
  const listPath = activeOrgId
    ? `/organisations/${activeOrgId}/tasks?limit=100${
        statusFilter === 'all' ? '' : `&status=${statusFilter}`
      }`
    : null;

  const { data: tasksPage, error, mutate } = useApiGet<Paginated<Task>>(listPath);
  const tasks = tasksPage?.items;

  const approvedIncidentsPath = activeOrgId
    ? `/organisations/${activeOrgId}/incidents?status=approved&limit=100`
    : null;

  const { data: approvedIncidentsPage } =
    useApiGet<Paginated<IncidentSummary>>(approvedIncidentsPath);
  const approvedIncidents = approvedIncidentsPage?.items;

  const volunteersPath = activeOrgId
    ? `/organisations/${activeOrgId}/members?role=volunteer&limit=100`
    : null;

  const { data: volunteersPage } =
    useApiGet<Paginated<OrganisationMember>>(volunteersPath);
  const volunteers = volunteersPage?.items;

  const incidentTitleById = useMemo(
    () => new Map((approvedIncidents ?? []).map((i) => [i.id, i.title])),
    [approvedIncidents],
  );

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 86_400_000 : null;

    return tasks.filter((task) => {
      if (
        volunteerFilter !== 'all' &&
        !task.assignments.some(
          (a) => a.volunteerUserId === volunteerFilter
        )
      ) {
        return false;
      }

      const due = new Date(task.dueDate).getTime();
      if (from !== null && due < from) return false;
      if (to !== null && due > to) return false;

      return true;
    });
  }, [tasks, volunteerFilter, dateFrom, dateTo]);

  const taskColumns: DataTableColumn<Task>[] = [
    { key: 'task', header: t('tasksList.table.task'), render: (task) => task.title },
    {
      key: 'incident',
      header: t('tasksList.table.linkedIncident'),
      render: (task) => incidentTitleById.get(task.incidentId) ?? '—',
    },
    {
      key: 'volunteer',
      header: t('tasksList.table.assignedVolunteer'),
      render: (task) =>
        task.assignments.length === 0
          ? '—'
          : task.assignments.map((assignment) => assignment.volunteer?.fullName ?? 'Unknown').join(', '),
    },
    {
      key: 'priority',
      header: t('tasksList.table.priority'),
      render: (task) => <Chip tone={task.priority}>{task.priority}</Chip>,
    },
    {
      key: 'due',
      header: t('tasksList.table.dueDate'),
      render: (task) => new Date(task.dueDate).toLocaleString(),
    },
    {
      key: 'status',
      header: t('tasksList.table.status'),
      render: (task) => (
        <Chip tone={task.status}>{task.status === 'pending' ? 'scheduled' : task.status}</Chip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('tasksList.title')}
        description={t('tasksList.description')}
        action={
          <Button onClick={() => setShowCreate(true)}>
            {t('tasksList.createTask')}
          </Button>
        }
      />

      <FilterBar>
        {STATUS_TABS.map((tab) => (
          <FilterPill
            key={tab.value}
            active={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
          >
            {t(`tasksList.statusTabs.${tab.value}`)}
          </FilterPill>
        ))}
      </FilterBar>

      <FilterBar>
        <label
          className="filter-control"
          htmlFor="task-volunteer-filter"
        >
          <span className="sr-only">
            {t('tasksList.filters.allVolunteers')}
          </span>

          <select
            id="task-volunteer-filter"
            aria-label={t('tasksList.filters.allVolunteers')}
            value={volunteerFilter}
            onChange={(e) => setVolunteerFilter(e.target.value)}
          >
            <option value="all">
              {t('tasksList.filters.allVolunteers')}
            </option>

            {(volunteers ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.fullName}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            fontSize: 13,
            color: 'var(--text-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {t('tasksList.filters.dueFrom')}

          <input
            id="task-due-from"
            aria-label={t('tasksList.filters.dueFrom')}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>

        <label
          style={{
            fontSize: 13,
            color: 'var(--text-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {t('tasksList.filters.dueTo')}

          <input
            id="task-due-to"
            aria-label={t('tasksList.filters.dueTo')}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
      </FilterBar>

      {error && (
        <ErrorBanner
          message={
            error instanceof ApiError
              ? error.message
              : t('tasksList.loadError')
          }
        />
      )}

      {!tasks && !error && <Spinner />}

      {tasks && (
        <DataTable
          caption={t('tasksList.title')}
          columns={taskColumns}
          rows={filteredTasks}
          getRowKey={(task) => task.id}
          rowLabel={(task) => t('tasksList.table.rowLabel', { title: task.title })}
          onRowActivate={(task) => router.push(`/tasks/${task.id}`)}
          empty={t('tasksList.empty')}
        />
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
  approvedIncidents: IncidentSummary[];
  volunteers: OrganisationMember[];
  initialIncidentId?: string | null;
  onCreated: (taskId: string) => void;
  api: ReturnType<typeof useAuthedFetch>;
}) {
  const { t } = useTranslation();

  const [incidentId, setIncidentId] = useState(
    initialIncidentId ?? ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const incidentValidation = useFieldValidation(
    required(t('tasksList.createModal.incidentRequired'))
  );

  const titleValidation = useFieldValidation(
    required(t('tasksList.createModal.descriptionRequired'))
  );

  const assignedToValidation = useFieldValidation(
    required('A volunteer is required')
  );

  const dueDateValidation = useFieldValidation(
    required('A due date is required')
  );

  const selectedIncident = approvedIncidents.find(
    (i) => i.id === incidentId
  );

  async function handleSubmit() {
    if (!incidentId || !title.trim() || !assignedTo || !dueDate) return;

    setSubmitting(true);
    setError(null);

    try {
      const task = await api.post<{ id: string }>(
        `/organisations/${organisationId}/tasks`,
        {
          incidentId,
          title,
          description: description || undefined,
          assignedTo,
          priority,
          dueDate: new Date(dueDate).toISOString(),
        }
      );

      setTitle('');
      setDescription('');
      setIncidentId('');
      setAssignedTo('');
      setDueDate('');

      onCreated(task.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not create task'
      );
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

          <Button
            disabled={
              submitting ||
              !incidentId ||
              !title.trim() ||
              !assignedTo ||
              !dueDate
            }
            onClick={handleSubmit}
          >
            {submitting
              ? t('tasksList.createModal.creating')
              : t('tasksList.createModal.submit')}
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
        <label htmlFor="create-task-incident">
          {t('tasksList.createModal.linkedIncident')}
        </label>

        <select
          id="create-task-incident"
          aria-invalid={Boolean(incidentValidation.error)}
          aria-describedby={
            incidentValidation.error
              ? 'create-task-incident-error'
              : undefined
          }
          value={incidentId}
          onChange={(e) => {
            setIncidentId(e.target.value);
            incidentValidation.revalidate(e.target.value);
          }}
          onBlur={(e) =>
            incidentValidation.onBlur(e.target.value)
          }
        >
          <option value="">
            {t('tasksList.createModal.selectIncident')}
          </option>

          {approvedIncidents.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>

        {approvedIncidents.length === 0 && (
          <p className="hint">
            {t('tasksList.createModal.noIncidents')}
          </p>
        )}

        {selectedIncident && (
          <p className="hint">
            {t('tasksList.createModal.location', {
              lat: selectedIncident.location.lat.toFixed(5),
              lng: selectedIncident.location.lng.toFixed(5),
            })}
            {selectedIncident.address &&
              ` — ${selectedIncident.address}`}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="create-task-title">Task title</label>
        <input
          id="create-task-title"
          type="text"
          aria-invalid={Boolean(titleValidation.error)}
          aria-describedby={
            titleValidation.error
              ? 'create-task-title-error'
              : undefined
          }
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            titleValidation.revalidate(e.target.value);
          }}
          onBlur={(e) => titleValidation.onBlur(e.target.value)}
          placeholder="e.g. Clear debris from riverbank"
        />
        <FieldError
          id="create-task-title-error"
          message={titleValidation.error}
        />
      </div>

      <div className="field">
        <label htmlFor="create-task-description">
          {t('tasksList.createModal.descriptionLabel')}
        </label>

        <textarea
          id="create-task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t(
            'tasksList.createModal.descriptionPlaceholder'
          )}
        />
      </div>

      <div className="field">
        <label htmlFor="create-task-volunteer">Assigned volunteer</label>
        <select
          id="create-task-volunteer"
          aria-invalid={Boolean(assignedToValidation.error)}
          aria-describedby={
            assignedToValidation.error
              ? 'create-task-volunteer-error'
              : undefined
          }
          value={assignedTo}
          onChange={(e) => {
            setAssignedTo(e.target.value);
            assignedToValidation.revalidate(e.target.value);
          }}
          onBlur={(e) => assignedToValidation.onBlur(e.target.value)}
        >
          <option value="">Select a volunteer…</option>
          {volunteers.map((v) => (
            <option key={v.id} value={v.id}>
              {v.fullName}
            </option>
          ))}
        </select>
        <FieldError
          id="create-task-volunteer-error"
          message={assignedToValidation.error}
        />
      </div>

      <div className="field">
        <label htmlFor="create-task-priority">
          {t('tasksList.createModal.priority')}
        </label>

        <select
          id="create-task-priority"
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as TaskPriority)
          }
        >
          <option value="low">
            {t('tasksList.createModal.priorityLow')}
          </option>
          <option value="medium">
            {t('tasksList.createModal.priorityMedium')}
          </option>
          <option value="high">
            {t('tasksList.createModal.priorityHigh')}
          </option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="create-task-due">
          {t('tasksList.createModal.dueDate')}
        </label>

        <input
          id="create-task-due"
          type="datetime-local"
          aria-invalid={Boolean(dueDateValidation.error)}
          aria-describedby={
            dueDateValidation.error
              ? 'create-task-due-error'
              : undefined
          }
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            dueDateValidation.revalidate(e.target.value);
          }}
          onBlur={(e) => dueDateValidation.onBlur(e.target.value)}
        />
        <FieldError
          id="create-task-due-error"
          message={dueDateValidation.error}
        />
      </div>
    </Modal>
  );
}
