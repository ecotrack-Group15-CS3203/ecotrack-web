'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import { Card, Chip, EmptyState, ErrorBanner, FilterBar, FilterPill, PageHeader, Spinner, TableThumb } from '@/components/ui';
import type { Incident, VerificationStatus } from '@/lib/types';
import { ApiError } from '@/lib/api';

const STATUS_TABS: { label: string; value: VerificationStatus | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Duplicate', value: 'duplicate' },
];

const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#F0997B,#D85A30)',
  'linear-gradient(135deg,#85B7EB,#378ADD)',
  'linear-gradient(135deg,#97C459,#639922)',
  'linear-gradient(135deg,#9FE1CB,#5DCAA5)',
  'linear-gradient(135deg,#F5C4B3,#D85A30)',
];

export default function IncidentsPage() {
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('all');

  const listPath = activeOrgId
    ? `/organisations/${activeOrgId}/incidents${statusFilter === 'all' ? '' : `?status=${statusFilter}`}`
    : null;
  const { data: incidents, error } = useApiGet<Incident[]>(listPath);

  return (
    <div>
      <PageHeader title="Incidents" description="Reports submitted to your organisation" />

      <FilterBar>
        {STATUS_TABS.map((tab) => (
          <FilterPill key={tab.value} active={statusFilter === tab.value} onClick={() => setStatusFilter(tab.value)}>
            {tab.label}
          </FilterPill>
        ))}
      </FilterBar>

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load incidents'} />}
      {!incidents && !error && <Spinner />}

      {incidents && incidents.length === 0 && (
        <Card>
          <EmptyState>
            <p>No incidents in this category.</p>
          </EmptyState>
        </Card>
      )}

      {incidents && incidents.length > 0 && (
        <Card>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident, i) => (
                <tr key={incident.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/incidents/${incident.id}`)}>
                  <td>
                    <TableThumb gradient={THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]} />
                  </td>
                  <td>{incident.title}</td>
                  <td style={{ textTransform: 'capitalize' }}>{incident.category.replace(/_/g, ' ')}</td>
                  <td>
                    <Chip tone={incident.severity}>{incident.severity}</Chip>
                  </td>
                  <td>
                    <Chip tone={incident.verificationStatus}>{incident.verificationStatus}</Chip>
                  </td>
                  <td>{new Date(incident.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
