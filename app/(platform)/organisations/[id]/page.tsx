'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, Chip, ErrorBanner, KpiCard, KpiRow, Modal, SectionTitle, Spinner } from '@/components/ui';
import type { DashboardStats, Invitation, Organisation, OrganisationMember } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function OrganisationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { refreshProfile } = useAuth();
  const api = useAuthedFetch();
  const router = useRouter();

  const { data: org, error, mutate } = useApiGet<Organisation>(`/organisations/${id}`);
  const { data: members } = useApiGet<OrganisationMember[]>(`/organisations/${id}/members`);
  const { data: stats } = useApiGet<DashboardStats>(`/organisations/${id}/dashboard/stats`);
  const {
    data: adminInvitations,
    error: adminInvitationsError,
    mutate: mutateInvitations,
  } = useApiGet<Invitation[]>(`/organisations/${id}/admin-invitations`);

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load organisation'} />;
  if (!org) return <Spinner />;

  function inviteLink(invitation: Invitation): string {
    return `${window.location.origin}/accept-invite?token=${invitation.token}`;
  }

  async function copyInviteLink(invitation: Invitation) {
    try {
      await navigator.clipboard.writeText(inviteLink(invitation));
      setCopiedId(invitation.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setActionError('Could not copy the invitation link. Please copy it from the browser address bar.');
    }
  }

  async function resendInvitation(invitation: Invitation) {
    setResendingId(invitation.id);
    setActionError(null);
    try {
      await api.post(`/organisations/${id}/admin-invitations/${invitation.id}/resend`);
      await mutateInvitations();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not resend invitation');
    } finally {
      setResendingId(null);
    }
  }

  async function toggleActive() {
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/organisations/${id}/${org!.isActive ? 'deactivate' : 'activate'}`);
      await mutate();
      await refreshProfile();
      setShowDeactivate(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Button variant="text" onClick={() => router.push('/organisations')} style={{ marginBottom: 10 }}>
        ← Back to organisations
      </Button>

      {actionError && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={actionError} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 19 }}>{org.name}</h1>
          <div style={{ marginTop: 8 }}>
            <Chip tone={org.isActive ? 'active' : 'inactive'}>{org.isActive ? 'active' : 'inactive'}</Chip>
          </div>
        </div>
        <Button variant="destructive" onClick={() => setShowDeactivate(true)} disabled={busy}>
          {org.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>

      <div style={{ marginTop: 20 }}>
        <KpiRow>
          <KpiCard label="Members" value={members?.length ?? '—'} />
          <KpiCard label="Incidents" value={stats?.totalIncidents ?? '—'} />
          <KpiCard label="Active volunteers" value={stats?.activeVolunteers ?? '—'} />
        </KpiRow>
      </div>

      <SectionTitle>Members</SectionTitle>
      <Card>
        <table>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.id}>
                <td>
                  <div className="row-flex">
                    <Avatar name={m.user.fullName} />
                    {m.user.fullName}
                  </div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{m.role.replace(/_/g, ' ')}</td>
              </tr>
            ))}
            {members?.length === 0 && (
              <tr>
                <td style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0' }}>No members yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <SectionTitle>Admin invitations</SectionTitle>
      <Card>
        {adminInvitationsError && (
          <div style={{ marginBottom: 12 }}>
            <ErrorBanner
              message={
                adminInvitationsError instanceof ApiError
                  ? adminInvitationsError.message
                  : 'Failed to load admin invitations'
              }
            />
          </div>
        )}
        <table>
          <tbody>
            {(adminInvitations ?? []).map((inv) => {
              const isAccepted = !!inv.acceptedAt;
              const isExpired = !isAccepted && new Date(inv.expiresAt) < new Date();
              const status = isAccepted ? 'accepted' : isExpired ? 'expired' : 'pending';
              return (
                <tr key={inv.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.email}</div>
                  </td>
                  <td>
                    <Chip tone={isAccepted ? 'active' : isExpired ? 'rejected' : 'pending'}>{status}</Chip>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!isAccepted && (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => copyInviteLink(inv)} style={{ marginRight: 8 }}>
                          {copiedId === inv.id ? 'Copied!' : 'Copy invite link'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={resendingId === inv.id}
                          onClick={() => resendInvitation(inv)}
                        >
                          {resendingId === inv.id ? 'Resending…' : 'Resend'}
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {adminInvitations?.length === 0 && (
              <tr>
                <td style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0' }}>
                  No admin invitations for this organisation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        title={org.isActive ? 'Deactivate this organisation?' : 'Activate this organisation?'}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowDeactivate(false)}>
              Cancel
            </Button>
            <Button variant={org.isActive ? 'destructive' : 'primary'} disabled={busy} onClick={toggleActive}>
              {busy ? 'Saving…' : org.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>
          {org.isActive
            ? "This will immediately block all of this organisation's users from accessing their data. This can be reversed later."
            : "This will restore access for all of this organisation's users."}
        </p>
      </Modal>
    </div>
  );
}
/* When the page opens, it gets the organisation id from the URL using use(params), then uses useApiGet() to 
fetch the organisation details, members, dashboard statistics, and admin invitations from the backend. 
The page displays the organisation name and active/inactive status, followed by KPIs for the number of members, 
incidents, and active volunteers. It then displays all organisation members and any admin invitations, showing 
whether each invitation is pending, accepted, or expired. For an invitation that has not been accepted, the admin 
can copy the invitation link or resend the invitation, where the resend action sends a POST request to the backend 
and refreshes the invitation list. The platform administrator can also activate or deactivate the organisation. 
Clicking the button first opens a confirmation modal, and confirming calls a PATCH request to either /activate 
or /deactivate; after that, the organisation data and user profile are refreshed. 
Finally, the Back to organisations button navigates back to the organisations list.*/