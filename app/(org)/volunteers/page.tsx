'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, Chip, ErrorBanner, Modal, PageHeader, Spinner } from '@/components/ui';
import type { Invitation, OrganisationMember, Task } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function VolunteersPage() {
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const [showInvite, setShowInvite] = useState(false);

  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer` : null;
  const { data: volunteers, error, mutate } = useApiGet<OrganisationMember[]>(volunteersPath);
  const tasksPath = activeOrgId ? `/organisations/${activeOrgId}/tasks` : null;
  const { data: tasks } = useApiGet<Task[]>(tasksPath);

  const activeTaskCountByUser = useMemo(() => {
    const counts = new Map<string, number>();
    (tasks ?? [])
      .filter((t) => t.status !== 'completed')
      .forEach((t) =>
        t.assignments.forEach((a) => counts.set(a.volunteerUserId, (counts.get(a.volunteerUserId) ?? 0) + 1)),
      );
    return counts;
  }, [tasks]);

  return (
    <div>
      <PageHeader
        title="Volunteers"
        description="Registered volunteers for your organisation"
        action={<Button onClick={() => setShowInvite(true)}>+ Invite volunteer</Button>}
      />

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load volunteers'} />}
      {!volunteers && !error && <Spinner />}

      {volunteers && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Active tasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="row-flex">
                      <Avatar name={v.user.fullName} />
                      {v.user.fullName}
                    </div>
                  </td>
                  <td>{v.user.email}</td>
                  <td>{activeTaskCountByUser.get(v.userId) ?? 0}</td>
                  <td>
                    <Chip tone={v.isActive ? 'active' : 'inactive'}>{v.isActive ? 'active' : 'inactive'}</Chip>
                  </td>
                </tr>
              ))}
              {volunteers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>
                    No volunteers yet — invite one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

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
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail('');
    setFullName('');
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
        fullName: fullName || undefined,
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
            }}>
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
            }}>
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
          <div className="field">
            <label>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Optional — pre-fills their name on the accept screen"
            />
          </div>
        </>
      )}
    </Modal>
  );
}
