'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, Chip, ErrorBanner, Modal, PageHeader, SectionTitle, Spinner, Toast } from '@/components/ui';
import { IconPlus } from '@/components/icons';
import type { CreateInviteLinkResult, InviteLink, Organisation, OrganisationMember } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { LocationMap } from '@/components/incident-map';

const RADIUS_OPTIONS = [1, 5, 10, 25, 50];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function inviteUrl(token: string) {
  return `${typeof window === 'undefined' ? '' : window.location.origin}/invite/${token}`;
}

function inviteStatus(invite: InviteLink): { label: string; tone: string } {
  if (invite.revokedAt) return { label: 'Revoked', tone: 'inactive' };
  if (new Date(invite.expiresAt) < new Date()) return { label: 'Expired', tone: 'rejected' };
  if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) return { label: 'Exhausted', tone: 'rejected' };
  return { label: 'Active', tone: 'active' };
}

export default function SettingsPage() {
  const { activeOrgId, refreshProfile } = useAuth();
  const api = useAuthedFetch();

  const orgPath = activeOrgId ? `/organisations/${activeOrgId}` : null;
  const { data: org, error, mutate } = useApiGet<Organisation>(orgPath);
  const membersPath = activeOrgId ? `/organisations/${activeOrgId}/members` : null;
  const { data: members } = useApiGet<OrganisationMember[]>(membersPath);
  const invitesPath = activeOrgId ? `/organisations/${activeOrgId}/invites` : null;
  const { data: invites, error: invitesError, mutate: mutateInvites } = useApiGet<InviteLink[]>(invitesPath);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [radiusKm, setRadiusKm] = useState(5);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<CreateInviteLinkResult | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    // Populate the editable form once the org loads from SWR — not a
    // subscription, so the setState-in-effect rule doesn't apply here.
    if (org) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(org.name);
      setDescription(org.description ?? '');
      setContactEmail(org.contactEmail ?? '');
      setLatitude(org.serviceAreaCenter?.lat ?? 0);
      setLongitude(org.serviceAreaCenter?.lng ?? 0);
      setRadiusKm(org.serviceAreaRadiusKm ?? 5);
    }
  }, [org]);

  async function save() {
    if (!activeOrgId) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.patch(`/organisations/${activeOrgId}`, {
        name,
        description,
        contactEmail,
        serviceAreaCenter: { lat: latitude, lng: longitude },
        serviceAreaRadiusKm: radiusKm,
      });
      await mutate();
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  async function generateInvite() {
    if (!activeOrgId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await api.post<CreateInviteLinkResult>(`/organisations/${activeOrgId}/invites`, {
        maxUses: maxUses.trim() ? Number(maxUses) : undefined,
        expiresInDays,
      });
      setGeneratedLink(result);
      await mutateInvites();
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : 'Could not generate an invite link.');
    } finally {
      setGenerating(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    if (!activeOrgId) return;
    setRevokingId(inviteId);
    try {
      await api.del(`/organisations/${activeOrgId}/invites/${inviteId}`);
      await mutateInvites();
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Could not revoke the invite link.');
    } finally {
      setRevokingId(null);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setToast('Invite link copied to clipboard.');
    } catch {
      setToast('Could not copy the link — copy it manually.');
    }
  }

  function closeGenerateModal() {
    setGenerateOpen(false);
    setGeneratedLink(null);
    setMaxUses('');
    setExpiresInDays(7);
    setGenerateError(null);
  }

  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load organisation'} />;
  if (!org) return <Spinner />;

  return (
    <div style={{ maxWidth: 640 }}>
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
        <label>Contact email</label>
        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@yourorg.example" />
      </div>

      <div className="field">
        <label>Service area</label>
        <LocationMap
          id={activeOrgId ?? 'service-area'}
          title={org.name}
          latitude={latitude}
          longitude={longitude}
          radiusKm={radiusKm}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} placeholder="Latitude" />
          <input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(Number(e.target.value))} placeholder="Longitude" />
        </div>
        <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
          {RADIUS_OPTIONS.map((km) => (
            <option key={km} value={km}>{km} km radius</option>
          ))}
        </select>
        <div className="hint">Changing the service area only affects future incident-pool matching — incidents your organisation has already claimed are not affected.</div>
      </div>

      <div className="field">
        <label>Status</label>
        <div>
          <Chip tone={org.isActive ? 'active' : 'inactive'}>{org.isActive ? 'active' : 'inactive'}</Chip>
        </div>
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
                    <Avatar name={m.fullName} />
                    {m.fullName}
                  </div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{m.role.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SectionTitle>Invite links</SectionTitle>
      <div style={{ marginBottom: 12 }}>
        <Button onClick={() => { closeGenerateModal(); setGenerateOpen(true); }}>
          <IconPlus style={{ width: 16, height: 16 }} /> Generate invite link
        </Button>
      </div>

      {invitesError && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={invitesError instanceof ApiError ? invitesError.message : 'Failed to load invite links.'} />
        </div>
      )}
      {!invites && !invitesError && <Spinner />}
      {invites && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Expires</th>
                <th>Uses</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const status = inviteStatus(invite);
                const revocable = status.label === 'Active';
                return (
                  <tr key={invite.id}>
                    <td>{formatDate(invite.createdAt)}</td>
                    <td>{formatDate(invite.expiresAt)}</td>
                    <td>{invite.usesCount} / {invite.maxUses ?? 'unlimited'}</td>
                    <td><Chip tone={status.tone}>{status.label}</Chip></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {revocable && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={revokingId === invite.id}
                            onClick={() => revokeInvite(invite.id)}
                          >
                            {revokingId === invite.id ? 'Revoking…' : 'Revoke'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invites.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>No invite links yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={generateOpen} onClose={closeGenerateModal} title="Generate invite link">
        {generateError && (
          <div style={{ marginBottom: 14 }}>
            <ErrorBanner message={generateError} />
          </div>
        )}

        {generatedLink ? (
          <div>
            <p className="hint" style={{ marginBottom: 8 }}>
              This link is shown only once — share it with the volunteers you want to invite:
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={inviteUrl(generatedLink.token)} readOnly style={{ flex: 1 }} />
              <Button variant="secondary" onClick={() => copyLink(inviteUrl(generatedLink.token))}>Copy</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="field">
              <label htmlFor="invite-max-uses">Max uses (leave blank for unlimited)</label>
              <input id="invite-max-uses" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
            </div>
            <div className="field">
              <label htmlFor="invite-expires">Expires in (days)</label>
              <input id="invite-expires" type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} />
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button variant="secondary" onClick={closeGenerateModal}>{generatedLink ? 'Close' : 'Cancel'}</Button>
          {!generatedLink && (
            <Button onClick={generateInvite} disabled={generating}>
              {generating ? 'Generating…' : 'Generate link'}
            </Button>
          )}
        </div>
      </Modal>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
