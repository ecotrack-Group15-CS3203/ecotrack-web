'use client';

import { useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import type { JoinRequest, JoinRequestStatus, Paginated } from '@/lib/types';
import { Button, Chip, DataTable, ErrorBanner, FilterBar, FilterPill, PageHeader, Spinner, Toast } from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';

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
  const path = activeOrgId ? `/organisations/${activeOrgId}/join-requests` : null;
  const { data, error, mutate } = useApiGet<Paginated<JoinRequest>>(path);
  const requests = data?.items;

  const filteredRequests = useMemo(
    () => (requests ?? []).filter((request) => statusFilter === 'all' || request.status === statusFilter),
    [requests, statusFilter],
  );

  async function updateRequest(request: JoinRequest, status: Extract<JoinRequestStatus, 'approved' | 'rejected'>) {
    if (!activeOrgId) return;
    setUpdatingId(request.id);
    setActionError(null);
    try {
      await api.patch(`/organisations/${activeOrgId}/join-requests/${request.id}`, { status });
      setToast(`${request.requester?.fullName ?? 'This user'}'s request was ${status}.`);
      await mutate();
    } catch (caught) {
      // Keep the local list unchanged: a blocked approval remains pending until the backend accepts it.
      setActionError(caught instanceof ApiError ? caught.message : 'Unable to update this join request.');
    } finally {
      setUpdatingId(null);
    }
  }

  const columns: DataTableColumn<JoinRequest>[] = [
    {
      key: 'requester',
      header: 'Requester',
      render: (request) => <strong>{request.requester?.fullName ?? 'Unknown user'}</strong>,
    },
    { key: 'email', header: 'Email', render: (request) => request.requester?.email ?? '—' },
    { key: 'submitted', header: 'Submitted', render: (request) => formatDate(request.createdAt) },
    {
      key: 'message',
      header: 'Message',
      width: 320,
      render: (request) => (
        <span className="clamp-2" title={request.message ?? undefined}>
          {request.message ?? '—'}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (request) => <Chip tone={request.status}>{request.status}</Chip> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (request) => {
        if (request.status !== 'pending') return null;
        const isUpdating = updatingId === request.id;
        const who = request.requester?.fullName ?? 'this user';
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button size="sm" disabled={isUpdating} aria-label={`Approve ${who}`} onClick={() => updateRequest(request, 'approved')}>
              {isUpdating ? 'Updating…' : 'Approve'}
            </Button>
            <Button size="sm" variant="destructive" disabled={isUpdating} aria-label={`Reject ${who}`} onClick={() => updateRequest(request, 'rejected')}>
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

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
        <DataTable
          caption="Join requests"
          columns={columns}
          rows={filteredRequests}
          getRowKey={(request) => request.id}
          empty={`No ${statusFilter === 'all' ? '' : statusFilter} join requests found.`}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
