'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, Chip, ErrorBanner, PageHeader, SectionTitle, Spinner } from '@/components/ui';
import type { Organisation, OrganisationMember } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function SettingsPage() {
  const { activeOrgId, refreshProfile } = useAuth();
  const api = useAuthedFetch();

  const orgPath = activeOrgId ? `/organisations/${activeOrgId}` : null;
  const { data: org, error, mutate } = useApiGet<Organisation>(orgPath);
  const membersPath = activeOrgId ? `/organisations/${activeOrgId}/members` : null;
  const { data: members } = useApiGet<OrganisationMember[]>(membersPath);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Populate the editable form once the org loads from SWR — not a
    // subscription, so the setState-in-effect rule doesn't apply here.
    if (org) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(org.name);
      setDescription(org.description ?? '');
    }
  }, [org]);

  async function save() {
    if (!activeOrgId) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.patch(`/organisations/${activeOrgId}`, { name, description });
      await mutate();
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load organisation'} />;
  if (!org) return <Spinner />;

  return (
    <div style={{ maxWidth: 560 }}>
      <PageHeader title="Organisation settings" description={org.name} />

      {saveError && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={saveError} />
        </div>
      )}
      {saved && <p style={{ fontSize: 13, color: 'var(--primary)', marginBottom: 12 }}>Saved.</p>}

      <div className="field">
        <label>Organisation name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>Status</label>
        <div>
          <Chip tone={org.isActive ? 'active' : 'inactive'}>{org.isActive ? 'active' : 'inactive'}</Chip>
        </div>
        <div className="hint">Only a platform administrator can change organisation status.</div>
      </div>
      <Button disabled={saving || !name.trim()} onClick={save}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>

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
          </tbody>
        </table>
      </Card>
    </div>
  );
}
