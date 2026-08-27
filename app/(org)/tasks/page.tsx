'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, Card, Chip, EmptyState, ErrorBanner, FilterBar, FilterPill, Modal, PageHeader, Spinner } from '@/components/ui';
import type { Incident, OrganisationMember, Task, TaskPriority, TaskStatus } from '@/lib/types';
import { ApiError } from '@/lib/api';

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
        title="Cleanup tasks"
        description="Tasks created from verified incidents"
        action={<Button onClick={() => setShowCreate(true)}>+ Create task</Button>}
      />

      <FilterBar>
        {STATUS_TABS.map((tab) => (
          <FilterPill key={tab.value} active={statusFilter === tab.value} onClick={() => setStatusFilter(tab.value)}>
            {tab.label}
          </FilterPill>
        ))}
      </FilterBar>

      <FilterBar>
        <select value={volunteerFilter} onChange={(e) => setVolunteerFilter(e.target.value)}>
          <option value="all">All volunteers</option>
          {(volunteers ?? []).map((v) => (
            <option key={v.userId} value={v.userId}>
              {v.user.fullName}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Due from
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Due to
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </FilterBar>

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load tasks'} />}
      {!tasks && !error && <Spinner />}

      {tasks && filteredTasks.length === 0 && (
        <Card>
          <EmptyState>
            <p>No tasks match these filters.</p>
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
  const initialIncident = approvedIncidents.find((i) => i.id === initialIncidentId);
  const [incidentId, setIncidentId] = useState(initialIncidentId ?? '');
  const [title, setTitle] = useState(initialIncident?.title ?? '');
  const [description, setDescription] = useState(initialIncident?.description ?? '');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      title="Create cleanup task"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={submitting || !incidentId || !title.trim() || !description.trim()} onClick={handleSubmit}>
            {submitting ? 'Creating…' : 'Create task'}
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
        <label>Linked incident</label>
        <select value={incidentId} onChange={(e) => selectIncident(e.target.value)}>
          <option value="">Select an approved incident…</option>
          {approvedIncidents.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
        {approvedIncidents.length === 0 && (
          <p className="hint">No approved incidents available yet — verify an incident first.</p>
        )}
        {selectedIncident && (
          <p className="hint">
            Location: {selectedIncident.latitude.toFixed(5)}, {selectedIncident.longitude.toFixed(5)}
            {selectedIncident.address && ` — ${selectedIncident.address}`}
          </p>
        )}
      </div>
      <div className="field">
        <label>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What needs to happen during this cleanup?"
        />
      </div>
      <div className="field">
        <label>Assign to</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">Unassigned</option>
          {volunteers.map((v) => (
            <option key={v.userId} value={v.userId}>
              {v.user.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="field">
        <label>Due date &amp; time</label>
        <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
    </Modal>
  );
}

