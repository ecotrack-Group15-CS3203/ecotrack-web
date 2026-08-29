'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Drawer,
  EmptyState,
  ErrorBanner,
  FilterBar,
  FilterPill,
  Modal,
  PageHeader,
  Spinner,
  Toast,
} from '@/components/ui';
import type { Event, Invitation, OrganisationMember, Task } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function VolunteersPage() {
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const [showInvite, setShowInvite] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<OrganisationMember | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('desc');
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer` : null;
  const { data: volunteers, error: volunteersError, mutate } = useApiGet<OrganisationMember[]>(volunteersPath);

  const tasksPath = activeOrgId ? `/organisations/${activeOrgId}/tasks` : null;
  const { data: tasks } = useApiGet<Task[]>(tasksPath);

  const eventsPath = activeOrgId ? `/organisations/${activeOrgId}/events` : null;
  const { data: events } = useApiGet<Event[]>(eventsPath);

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
      .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
      .forEach((t) =>
        t.assignments.forEach((a) => counts.set(a.volunteerUserId, (counts.get(a.volunteerUserId) ?? 0) + 1)),
      );
    return counts;
  }, [tasks]);

  const handleSortCompleted = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc'));
  };

  const filteredVolunteers = useMemo(() => {
    if (!volunteers) return [];
    let list = [...volunteers];

    if (statusFilter === 'active') {
      list = list.filter((v) => v.isActive);
    } else if (statusFilter === 'suspended') {
      list = list.filter((v) => !v.isActive);
    }

    if (sortOrder) {
      list.sort((a, b) => {
        const countA = completedTasksCountByUser.get(a.userId) ?? 0;
        const countB = completedTasksCountByUser.get(b.userId) ?? 0;
        return sortOrder === 'desc' ? countB - countA : countA - countB;
      });
    }

    return list;
  }, [volunteers, statusFilter, sortOrder, completedTasksCountByUser]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Filter tasks and events for the currently selected volunteer
  const selectedVolunteerTasks = useMemo(() => {
    if (!tasks || !selectedVolunteer) return [];
    return tasks
      .filter((t) => t.assignments.some((a) => a.volunteerUserId === selectedVolunteer.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks, selectedVolunteer]);

  const selectedVolunteerEvents = useMemo(() => {
    if (!events || !selectedVolunteer) return [];
    return events
      .filter((e) => e.rsvps.some((r) => r.volunteerUserId === selectedVolunteer.userId))
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [events, selectedVolunteer]);

  const handleSuspend = async () => {
    if (!selectedVolunteer || !activeOrgId) return;
    setIsSuspending(true);
    setSuspendError(null);
    try {
      await api.patch(`/organisations/${activeOrgId}/members/${selectedVolunteer.id}/deactivate`);
      setToast(`${selectedVolunteer.user.fullName} has been suspended.`);
      setShowSuspendConfirm(false);
      setSelectedVolunteer(null);
      await mutate();
    } catch (err) {
      setSuspendError(err instanceof ApiError ? err.message : 'Failed to suspend volunteer');
    } finally {
      setIsSuspending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Volunteers"
        description="Registered volunteers for your organisation"
        action={<Button onClick={() => setShowInvite(true)}>+ Invite volunteer</Button>}
      />

      <FilterBar>
        <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          All
        </FilterPill>
        <FilterPill active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
          Active
        </FilterPill>
        <FilterPill active={statusFilter === 'suspended'} onClick={() => setStatusFilter('suspended')}>
          Suspended
        </FilterPill>
      </FilterBar>

      {volunteersError && (
        <ErrorBanner
          message={volunteersError instanceof ApiError ? volunteersError.message : 'Failed to load volunteers'}
        />
      )}
      {!volunteers && !volunteersError && <Spinner />}

      {volunteers && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined At</th>
                <th
                  onClick={handleSortCompleted}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by tasks completed"
                >
                  Tasks Completed{' '}
                  {sortOrder === 'desc' ? '▼' : sortOrder === 'asc' ? '▲' : '↕'}
                </th>
                <th>Active Tasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredVolunteers.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedVolunteer(v)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="row-flex">
                      <Avatar name={v.user.fullName} />
                      {v.user.fullName}
                    </div>
                  </td>
                  <td>{v.user.email}</td>
                  <td>{formatDate(v.joinedAt)}</td>
                  <td>{completedTasksCountByUser.get(v.userId) ?? 0}</td>
                  <td>{activeTaskCountByUser.get(v.userId) ?? 0}</td>
                  <td>
                    <Chip tone={v.isActive ? 'active' : 'inactive'}>
                      {v.isActive ? 'active' : 'suspended'}
                    </Chip>
                  </td>
                </tr>
              ))}
              {filteredVolunteers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>
                    No volunteers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Volunteer Profile Drawer */}
      <Drawer
        open={!!selectedVolunteer}
        onClose={() => setSelectedVolunteer(null)}
        title="Volunteer Profile"
      >
        {selectedVolunteer && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
            {/* Profile Overview */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <Avatar name={selectedVolunteer.user.fullName} size={50} />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selectedVolunteer.user.fullName}</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <Chip tone={selectedVolunteer.isActive ? 'active' : 'inactive'}>
                    {selectedVolunteer.isActive ? 'active' : 'suspended'}
                  </Chip>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Joined {formatDate(selectedVolunteer.joinedAt)}</span>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
                Personal Details
              </h4>
              <div style={{ fontSize: 13.5, display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
                <span style={{ color: 'var(--text-2)' }}>Email:</span>
                <span style={{ wordBreak: 'break-all' }}>{selectedVolunteer.user.email}</span>
                <span style={{ color: 'var(--text-2)' }}>Role:</span>
                <span style={{ textTransform: 'capitalize' }}>{selectedVolunteer.role.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Task History */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                Task History ({completedTasksCountByUser.get(selectedVolunteer.userId) ?? 0} completed,{' '}
                {activeTaskCountByUser.get(selectedVolunteer.userId) ?? 0} active)
              </h4>
              {selectedVolunteerTasks.length === 0 ? (
                <EmptyState>
                  <p style={{ fontSize: 13, margin: 0 }}>No task history found.</p>
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
                        background: '#FAF9F5',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.incident.title}
                        </span>
                        <Chip tone={task.status}>{task.status}</Chip>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Priority: {task.priority}</span>
                        <span>
                          {task.status === 'completed'
                            ? `Completed: ${formatDate(task.scheduledAt || task.createdAt)}`
                            : `Due: ${formatDate(task.scheduledAt || task.createdAt)}`}
                        </span>
                      </div>
                      {/* Evidence Thumbnails */}
                      {task.photos && task.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {task.photos.map((photo) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={photo.id}
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

            {/* RSVP History */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                RSVP History
              </h4>
              {selectedVolunteerEvents.length === 0 ? (
                <EmptyState>
                  <p style={{ fontSize: 13, margin: 0 }}>No RSVP history found.</p>
                </EmptyState>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto', paddingRight: 4 }}>
                  {selectedVolunteerEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{evt.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(evt.scheduledAt)}</span>
                      </div>
                      <Chip tone={evt.status}>{evt.status}</Chip>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone Actions */}
            {selectedVolunteer.isActive && (
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <Button
                  variant="destructive"
                  className="btn-block"
                  onClick={() => {
                    setSuspendError(null);
                    setShowSuspendConfirm(true);
                  }}
                >
                  Remove / Suspend Volunteer
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Suspend Confirmation Dialog */}
      <Modal
        open={showSuspendConfirm}
        onClose={() => setShowSuspendConfirm(false)}
        title="Suspend Volunteer Membership?"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowSuspendConfirm(false)}
              disabled={isSuspending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={isSuspending}
            >
              {isSuspending ? 'Suspending…' : 'Suspend Volunteer'}
            </Button>
          </>
        }
      >
        {suspendError && (
          <div style={{ marginBottom: 12 }}>
            <ErrorBanner message={suspendError} />
          </div>
        )}
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
          Are you sure you want to suspend/remove{' '}
          <strong>{selectedVolunteer?.user.fullName}</strong>? This will deactivate their membership and exclude them from new cleanup tasks or events.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.4 }}>
          <strong>Note:</strong> This action only suspends their organisation membership. It does not delete their underlying user account.
        </p>
      </Modal>

      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        organisationId={activeOrgId ?? ''}
        onInvited={async () => {
          setShowInvite(false);
          await mutate();
        }}
        api={api}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function InviteModal({
  open,
  onClose,
  organisationId,
  onInvited,
  api,
}: {
  open: boolean;
  onClose: () => void;
  organisationId: string;
  onInvited: () => void;
  api: ReturnType<typeof useAuthedFetch>;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail('');
    setError(null);
    setCreatedInvitation(null);
    setCopied(false);
  }

  async function submit() {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const invitation = await api.post<Invitation>(`/organisations/${organisationId}/invitations`, {
        email,
      });
      setCreatedInvitation(invitation);
      onInvited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send invitation');
    } finally {
      setSubmitting(false);
    }
  }

  const inviteLink = createdInvitation
    ? `${window.location.origin}/accept-invite?token=${createdInvitation.token}`
    : null;

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Invite a volunteer"
      actions={
        createdInvitation ? (
          <Button
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={submitting || !email.trim()} onClick={submit}>
              {submitting ? 'Sending…' : 'Send invitation'}
            </Button>
          </>
        )
      }
    >
      {error && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={error} />
        </div>
      )}

      {createdInvitation ? (
        <div>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 12 }}>
            Invitation created for <strong>{createdInvitation.email}</strong>. No email service is connected yet —
            share this link with them directly (expires in 7 days):
          </p>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--bg)',
            }}
          >
            <code style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inviteLink}
            </code>
            <Button variant="secondary" size="sm" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label>
              Email <span className="req">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="volunteer@email.com"
            />
          </div>
        </>
      )}
    </Modal>
  );
}
