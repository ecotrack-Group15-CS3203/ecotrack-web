'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, Chip, Drawer, ErrorBanner, Modal, SectionTitle, Spinner, TableThumb } from '@/components/ui';
import type { OrganisationMember, Task, TaskPriority } from '@/lib/types';
import { ApiError, absoluteUrl } from '@/lib/api';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const api = useAuthedFetch();

  const detailPath = activeOrgId ? `/organisations/${activeOrgId}/tasks/${id}` : null;
  const { data: task, error, mutate } = useApiGet<Task>(detailPath);
  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer` : null;
  const { data: volunteers } = useApiGet<OrganisationMember[]>(volunteersPath);

  const [showAssign, setShowAssign] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load task'} />;
  if (!task || !activeOrgId) return <Spinner />;

  // Assign a volunteer to this task
  async function assign(volunteerUserId: string) {
    setActionError(null);
    setBusy(true);
    try {
      // Send POST request to create a new task assignment
      await api.post(`/organisations/${activeOrgId}/tasks/${task!.id}/assignments`, {
        volunteerUserIds: [volunteerUserId],
      });
      // Refresh task data after successful assignment
      await mutate();
    } catch (err) {
      // Handle errors with specific backend messages or fallback message
      const errorMsg = err instanceof ApiError 
        ? err.message 
        : 'Could not assign volunteer. Please check your connection and try again.';
      console.error('Failed to assign volunteer:', err);
      setActionError(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  // Remove a volunteer from the task by deleting their assignment
  async function unassign(assignmentId: string) {
    setActionError(null);
    setBusy(true);
    try {
      // Send DELETE request to remove the volunteer assignment
      await api.del(`/organisations/${activeOrgId}/tasks/${task!.id}/assignments/${assignmentId}`);
      // Refresh task data after successful removal
      await mutate();
    } catch (err) {
      // Handle errors with specific backend messages or fallback message
      const errorMsg = err instanceof ApiError 
        ? err.message 
        : 'Could not remove volunteer. Please check your connection and try again.';
      console.error('Failed to unassign volunteer:', err);
      setActionError(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  // Cancel the task by changing its status to 'cancelled'
  async function cancelTask() {
    setActionError(null);
    setBusy(true);
    try {
      // Send PATCH request to update task status to cancelled
      await api.patch(`/organisations/${activeOrgId}/tasks/${task!.id}`, { status: 'cancelled' });
      // Refresh task data after successful cancellation
      await mutate();
    } catch (err) {
      // Handle errors with specific backend messages or fallback message
      const errorMsg = err instanceof ApiError 
        ? err.message 
        : 'Could not cancel task. Please check your connection and try again.';
      console.error('Failed to cancel task:', err);
      setActionError(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  const unassigned = (volunteers ?? []).filter(
    (v) => !task.assignments.some((a) => a.volunteerUserId === v.userId),
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, alignItems: 'start' }}>
      <div>
        <Button variant="text" onClick={() => router.push('/tasks')} style={{ marginBottom: 10 }}>
          ← Back to tasks
        </Button>
        <h1 style={{ fontSize: 19 }}>{task.incident.title}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '4px 0 10px' }}>{task.description}</p>
        <div style={{ display: 'flex', gap: 6, margin: '10px 0 16px' }}>
          <Chip tone={task.priority}>{`${task.priority} priority`}</Chip>
          <Chip tone={task.status}>{task.status === 'pending' ? 'scheduled' : task.status}</Chip>
        </div>
        {task.scheduledAt && (
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>
            Due: {new Date(task.scheduledAt).toLocaleString()}
          </p>
        )}

        <SectionTitle>Linked incident</SectionTitle>
        <Card
          style={{ padding: 12, display: 'flex', gap: 10, cursor: 'pointer' }}
          onClick={() => router.push(`/incidents/${task.incident.id}`)}
        >
          <TableThumb gradient="linear-gradient(135deg,#F0997B,#D85A30)" />
          <div>
            <b style={{ fontSize: 13 }}>{task.incident.title}</b>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              {task.incident.verificationStatus === 'approved' ? 'Verified' : task.incident.verificationStatus}
            </div>
          </div>
        </Card>

        <SectionTitle>Progress &amp; completion evidence</SectionTitle>
        {task.notes.length === 0 && task.photos.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No progress notes yet — task has not started.</p>
        ) : (
          <>
            {task.notes.map((n) => (
              <Card key={n.id} style={{ padding: 10, marginBottom: 8 }}>
                <p style={{ fontSize: 13 }}>{n.note}</p>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(n.createdAt).toLocaleString()}</span>
              </Card>
            ))}
            {task.photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {task.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={absoluteUrl(p.url)}
                    alt=""
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Card style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Assigned volunteers</h3>

        {actionError && (
          <div style={{ marginBottom: 12 }}>
            <ErrorBanner message={actionError} />
          </div>
        )}

        {task.assignments.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginBottom: 16 }}>No volunteers assigned yet.</p>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {task.assignments.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar name={a.volunteer.fullName} />
                <span style={{ fontSize: 13.5, flex: 1 }}>{a.volunteer.fullName}</span>
                <Chip tone={a.status}>{a.status}</Chip>
                <Button variant="text" onClick={() => unassign(a.id)} disabled={busy}>
                  Remove
                </Button>
              </div>
            ))}
            <p className="hint">Remove a volunteer, then assign a different one to reassign this task.</p>
          </div>
        )}

        <Button variant="secondary" className="btn-block" onClick={() => setShowAssign(true)} disabled={busy}>
          + Assign volunteers
        </Button>
        <div style={{ borderTop: '1px solid var(--border)', margin: '18px 0' }} />
        <Button variant="secondary" className="btn-block" onClick={() => setShowEdit(true)} style={{ marginBottom: 10 }}>
          Edit priority &amp; date
        </Button>
        <Button
          variant="destructive"
          className="btn-block"
          disabled={busy || task.status === 'completed' || task.status === 'cancelled'}
          onClick={cancelTask}
        >
          Cancel task
        </Button>
      </Card>

      <Drawer open={showAssign} onClose={() => setShowAssign(false)} title="Assign volunteers">
        {unassigned.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>All active volunteers are already assigned.</p>
        ) : (
          unassigned.map((v) => (
            <label
              key={v.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <input type="checkbox" onChange={() => assign(v.userId)} disabled={busy} />
              <Avatar name={v.user.fullName} />
              {v.user.fullName}
            </label>
          ))
        )}
      </Drawer>

      <EditTaskModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        task={task}
        organisationId={activeOrgId}
        onSaved={async () => {
          setShowEdit(false);
          await mutate();
        }}
        api={api}
      />
    </div>
  );
}

function EditTaskModal({
  open,
  onClose,
  task,
  organisationId,
  onSaved,
  api,
}: {
  open: boolean;
  onClose: () => void;
  task: Task;
  organisationId: string;
  onSaved: () => void;
  api: ReturnType<typeof useAuthedFetch>;
}) {
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [scheduledAt, setScheduledAt] = useState(task.scheduledAt ? task.scheduledAt.slice(0, 16) : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/organisations/${organisationId}/tasks/${task.id}`, {
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit priority & date"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
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
