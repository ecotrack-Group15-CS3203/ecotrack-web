'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, Chip, ErrorBanner, Modal, SectionTitle, Spinner, TableThumb } from '@/components/ui';
import type { IncidentSummary, OrganisationMember, Task, TaskPriority } from '@/lib/types';
import { ApiError, absoluteUrl } from '@/lib/api';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const api = useAuthedFetch();

  const detailPath = activeOrgId ? `/organisations/${activeOrgId}/tasks/${id}` : null;
  const { data: task, error, mutate } = useApiGet<Task>(detailPath);
  const incidentPath = activeOrgId && task ? `/organisations/${activeOrgId}/incidents/${task.incidentId}` : null;
  const { data: incident } = useApiGet<IncidentSummary>(incidentPath);
  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer` : null;
  const { data: volunteers } = useApiGet<OrganisationMember[]>(volunteersPath);

  const [showReassign, setShowReassign] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load task'} />;
  if (!task || !activeOrgId) return <Spinner />;

  const currentAssignment = task.assignments.find((a) => a.status === 'assigned' || a.status === 'accepted');

  async function reassign(volunteerUserId: string) {
    setActionError(null);
    setBusy(true);
    try {
      await api.patch(`/organisations/${activeOrgId}/tasks/${task!.id}`, { assignedTo: volunteerUserId });
      setShowReassign(false);
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not reassign this task');
    } finally {
      setBusy(false);
    }
  }

  const otherVolunteers = (volunteers ?? []).filter((v) => v.id !== currentAssignment?.volunteerUserId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, alignItems: 'start' }}>
      <div>
        <Button variant="text" onClick={() => router.push('/tasks')} style={{ marginBottom: 10 }}>
          ← Back to tasks
        </Button>
        <h1 style={{ fontSize: 19 }}>{task.title}</h1>
        {task.description && (
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '4px 0 10px' }}>{task.description}</p>
        )}
        <div style={{ display: 'flex', gap: 6, margin: '10px 0 16px' }}>
          <Chip tone={task.priority}>{`${task.priority} priority`}</Chip>
          <Chip tone={task.status}>{task.status === 'pending' ? 'scheduled' : task.status}</Chip>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>
          Due: {new Date(task.dueDate).toLocaleString()}
        </p>

        <SectionTitle>Linked incident</SectionTitle>
        {incident ? (
          <Card
            style={{ padding: 12, display: 'flex', gap: 10, cursor: 'pointer' }}
            onClick={() => router.push(`/incidents/${incident.id}`)}
          >
            <TableThumb gradient="linear-gradient(135deg,#F0997B,#D85A30)" />
            <div>
              <b style={{ fontSize: 13 }}>{incident.title}</b>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {incident.verificationStatus === 'approved' ? 'Verified' : incident.verificationStatus}
              </div>
            </div>
          </Card>
        ) : (
          <Spinner />
        )}

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
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Assigned volunteer</h3>

        {actionError && (
          <div style={{ marginBottom: 12 }}>
            <ErrorBanner message={actionError} />
          </div>
        )}

        {!currentAssignment || !currentAssignment.volunteer ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginBottom: 16 }}>No volunteer currently assigned.</p>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Avatar name={currentAssignment.volunteer.fullName} />
              <span style={{ fontSize: 13.5, flex: 1 }}>{currentAssignment.volunteer.fullName}</span>
              <Chip tone={currentAssignment.status}>{currentAssignment.status}</Chip>
            </div>
          </div>
        )}

        <Button
          variant="secondary"
          className="btn-block"
          onClick={() => setShowReassign(true)}
          disabled={busy || task.status === 'completed'}
        >
          Reassign volunteer
        </Button>
        <div style={{ borderTop: '1px solid var(--border)', margin: '18px 0' }} />
        <Button variant="secondary" className="btn-block" onClick={() => setShowEdit(true)}>
          Edit priority &amp; due date
        </Button>
      </Card>

      <Modal open={showReassign} onClose={() => setShowReassign(false)} title="Reassign volunteer">
        {otherVolunteers.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>No other volunteers available.</p>
        ) : (
          otherVolunteers.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => reassign(v.id)}
              disabled={busy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                width: '100%',
                borderBottom: '1px solid var(--border)',
                background: 'none',
                textAlign: 'left',
              }}
            >
              <Avatar name={v.fullName} />
              {v.fullName}
            </button>
          ))
        )}
      </Modal>

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
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 16) : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/organisations/${organisationId}/tasks/${task.id}`, {
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
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
      title="Edit priority & due date"
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
        <label>Due date &amp; time</label>
        <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
    </Modal>
  );
}
