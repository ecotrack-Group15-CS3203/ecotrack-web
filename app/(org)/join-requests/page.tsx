'use client';

import { useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import type { JoinRequest, JoinRequestStatus } from '@/lib/types';
import { Button, Card, Chip, ErrorBanner, FilterBar, FilterPill, PageHeader, Spinner, Toast } from '@/components/ui';

type StatusFilter = 'all' | JoinRequestStatus;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function JoinRequestsPage() {
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const path = activeOrgId ? `/v1/organizations/${activeOrgId}/join-requests` : null;
  const { data: requests, error, mutate } = useApiGet<JoinRequest[]>(path);

  const filteredRequests = useMemo(
    () => (requests ?? []).filter((request) => statusFilter === 'all' || request.status === statusFilter),
    [requests, statusFilter],
  );

  async function updateRequest(request: JoinRequest, status: Extract<JoinRequestStatus, 'approved' | 'rejected'>) {
    if (!activeOrgId) return;
    setUpdatingId(request.id);
    setActionError(null);
    try {
      await api.patch(`/v1/organizations/${activeOrgId}/join-requests/${request.id}`, { status });
      setToast(`${request.requester.fullName}'s request was ${status}.`);
      await mutate();
    } catch (caught) {
      // Keep the local list unchanged: a blocked approval remains pending until the backend accepts it.
      setActionError(caught instanceof ApiError ? caught.message : 'Unable to update this join request.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Join Requests" description="Review people asking to join your organisation." />

      <FilterBar>
        {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map((status) => (
          <FilterPill key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
            {status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)}
          </FilterPill>
        ))}
      </FilterBar>

      {actionError && <div style={{ marginBottom: 16 }}><ErrorBanner message={actionError} /></div>}
      {error && (
        <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load join requests.'} />
      )}
      {!requests && !error && <Spinner />}

      {requests && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Requester</th>
                <th>Email</th>
                <th>Submitted</th>
                <th>Message</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const isUpdating = updatingId === request.id;
                return (
                  <tr key={request.id}>
                    <td style={{ fontWeight: 600 }}>{request.requester.fullName}</td>
                    <td>{request.requester.email}</td>
                    <td>{formatDate(request.createdAt)}</td>
                    <td style={{ maxWidth: 300, whiteSpace: 'normal' }}>{request.message ?? '—'}</td>
                    <td><Chip tone={request.status}>{request.status}</Chip></td>
                    <td>
                      {request.status === 'pending' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <Button size="sm" disabled={isUpdating} onClick={() => updateRequest(request, 'approved')}>
                            {isUpdating ? 'Updating…' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" disabled={isUpdating} onClick={() => updateRequest(request, 'rejected')}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>No {statusFilter === 'all' ? '' : statusFilter} join requests found.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
