'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, Card, Chip, ErrorBanner, Modal, PageHeader, Spinner } from '@/components/ui';
import type { CreateOrganisationResult, Organisation } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function OrganisationsPage() {
  const { refreshProfile } = useAuth();
  const api = useAuthedFetch();
  const router = useRouter();
  const { data: organisations, error, mutate } = useApiGet<Organisation[]>('/organisations');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleActive(org: Organisation, e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/organisations/${org.id}/${org.isActive ? 'deactivate' : 'activate'}`);
      await mutate();
      await refreshProfile();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Organisations"
        description="Tenant organisations on the platform"
        action={<Button onClick={() => setShowCreate(true)}>+ Create organisation</Button>}
      />

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load organisations'} />}
      {actionError && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={actionError} />
        </div>
      )}
      {!organisations && !error && <Spinner />}

      {organisations && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {organisations.map((org) => (
                <tr key={org.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/organisations/${org.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{org.name}</div>
                    {org.description && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{org.description}</div>}
                  </td>
                  <td>{new Date(org.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Chip tone={org.isActive ? 'active' : 'inactive'}>{org.isActive ? 'active' : 'inactive'}</Chip>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={(e) => toggleActive(org, e)}>
                      {org.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateOrgModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={async (organisationId) => {
          setShowCreate(false);
          await mutate();
          router.push(`/organisations/${organisationId}`);
        }}
        api={api}
      />
    </div>
  );
}

function CreateOrgModal({
  open,
  onClose,
  onCreated,
  api,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (organisationId: string) => void;
  api: ReturnType<typeof useAuthedFetch>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialAdminEmail, setInitialAdminEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim() || !initialAdminEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<CreateOrganisationResult>('/organisations', {
        name,
        description: description || undefined,
        initialAdminEmail,
      });
      setName('');
      setDescription('');
      setInitialAdminEmail('');
      onCreated(result.organisation.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create organisation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create organisation"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={submitting || !name.trim() || !initialAdminEmail.trim()} onClick={submit}>
            {submitting ? 'Creating…' : 'Create organisation'}
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
        <label>
          Organisation name <span className="req">*</span>
        </label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kelani River Watch" />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>
          Initial administrator email <span className="req">*</span>
        </label>
        <input
          type="email"
          value={initialAdminEmail}
          onChange={(e) => setInitialAdminEmail(e.target.value)}
          placeholder="admin@example.org"
        />
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          They&apos;ll be sent an invite link to set up organisation-admin access. No email service is
          connected yet, so you&apos;ll get a copyable link on the next screen.
        </div>
      </div>
    </Modal>
  );
}
/* When the user opens the Organisations page, the page uses useApiGet('/organisations') to retrieve all 
organisations from the backend and displays them in a table with their name, description, creation date, 
and active/inactive status. The user can click an organisation row to navigate to /organisations/{organisationId}. 
Each organisation also has an Activate/Deactivate button; clicking it calls toggleActive(), which sends a
 PATCH request to either /organisations/{id}/activate or /organisations/{id}/deactivate depending on the current status. 
 After the status is changed, mutate() refreshes the organisation list and refreshProfile() updates the 
 user's profile information. The page also has a Create organisation button that opens CreateOrgModal. 
 In the modal, the user enters the organisation name, description, and initial administrator email. 
 When submitted, the submit() function sends a POST request to /organisations with these details. 
 After the backend successfully creates the organisation, the form is cleared, the organisation list is 
 refreshed, and the user is redirected to the newly created organisation's page.*/