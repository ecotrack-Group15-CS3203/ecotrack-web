'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, Card, Chip, EmptyState, ErrorBanner, FilterBar, FilterPill, Modal, PageHeader, Spinner } from '@/components/ui';
import type { Incident, Task, TaskPriority, TaskStatus } from '@/lib/types';
import { ApiError } from '@/lib/api';

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
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedIncidentId = searchParams.get('incidentId');
  const api = useAuthedFetch();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(() => Boolean(preselectedIncidentId));

  const listPath = activeOrgId
    ? `/organisations/${activeOrgId}/tasks${statusFilter === 'all' ? '' : `?status=${statusFilter}`}`
    : null;
  const { data: tasks, error, mutate } = useApiGet<Task[]>(listPath);
  const approvedIncidentsPath = activeOrgId ? `/organisations/${activeOrgId}/incidents?status=approved` : null;
  const { data: approvedIncidents } = useApiGet<Incident[]>(approvedIncidentsPath);

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

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load tasks'} />}
      {!tasks && !error && <Spinner />}

      {tasks && tasks.length === 0 && (
        <Card>
          <EmptyState>
            <p>No tasks in this category yet.</p>
          </EmptyState>
        </Card>
      )}

      {tasks && tasks.length > 0 && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Linked incident</th>
                <th>Priority</th>
                <th>Scheduled</th>
                <th>Volunteers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/tasks/${task.id}`)}>
                  <td>{task.description}</td>
                  <td>{task.incident.title}</td>
                  <td>
                    <Chip tone={task.priority}>{task.priority}</Chip>
                  </td>
                  <td>{task.scheduledAt ? new Date(task.scheduledAt).toLocaleString() : '—'}</td>
                  <td>
                    {task.assignments.length} assigned
                  </td>
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
  initialIncidentId,
  onCreated,
  api,
}: {
  open: boolean;
  onClose: () => void;
  organisationId: string;
  approvedIncidents: Incident[];
  initialIncidentId?: string | null;
  onCreated: (taskId: string) => void;
  api: ReturnType<typeof useAuthedFetch>;
}) {
  const [incidentId, setIncidentId] = useState(initialIncidentId ?? '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!incidentId || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const task = await api.post<{ id: string }>(`/organisations/${organisationId}/tasks`, {
        incidentId,
        description,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      setDescription('');
      setIncidentId('');
      setScheduledAt('');
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
          <Button disabled={submitting || !incidentId || !description.trim()} onClick={handleSubmit}>
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
        <select value={incidentId} onChange={(e) => setIncidentId(e.target.value)}>
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
        <label>Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="field">
        <label>Scheduled date &amp; time</label>
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </div>
    </Modal>
  );
}
