'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, Chip, ErrorBanner, Modal, PageHeader, SectionTitle, Spinner, Toast } from '@/components/ui';
import { IconPlus } from '@/components/icons';
import type { Invitation, Organisation, OrganisationMember } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { LocationMap } from '@/components/incident-map';

const RADIUS_OPTIONS = [1, 5, 10, 25, 50];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SettingsPage() {
  const { activeOrgId, refreshProfile } = useAuth();
  const api = useAuthedFetch();

  const orgPath = activeOrgId ? `/organisations/${activeOrgId}` : null;
  const { data: org, error, mutate } = useApiGet<Organisation>(orgPath);
  const membersPath = activeOrgId ? `/organisations/${activeOrgId}/members` : null;
  const { data: members } = useApiGet<OrganisationMember[]>(membersPath);
  const invitesPath = activeOrgId ? `/organisations/${activeOrgId}/invitations` : null;
  const { data: invites, error: invitesError, mutate: mutateInvites } = useApiGet<Invitation[]>(invitesPath);

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
  const [inviteEmail, setInviteEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<Invitation | null>(null);

  useEffect(() => {
    // Populate the editable form once the org loads from SWR — not a
    // subscription, so the setState-in-effect rule doesn't apply here.
    if (org) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(org.name);
      setDescription(org.description ?? '');
      setContactEmail(org.contactEmail ?? '');
      setLatitude(org.serviceArea?.latitude ?? 0);
      setLongitude(org.serviceArea?.longitude ?? 0);
      setRadiusKm(org.serviceArea?.radiusKm ?? 5);
    }
  }, [org]);

  async function save() {
    if (!activeOrgId) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.patch(`/organisations/${activeOrgId}`, { // Update organisation details
        name,
        description,
        contactEmail,
        serviceArea: { latitude, longitude, radiusKm },
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
      const link = await api.post<Invitation>(`/organisations/${activeOrgId}/invitations`, { email: inviteEmail }); // Generate an invitation link
      setGeneratedLink(link);
      await mutateInvites();
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : 'Could not generate an invite link.');
    } finally {
      setGenerating(false);
    }
  }
  // Copy invite link to clipboard
  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setToast('Invite link copied to clipboard.');
    } catch {
      setToast('Could not copy the link — copy it manually.');
    }
  }

  // Close the generate invite modal
  function closeGenerateModal() {
    setGenerateOpen(false);
    setGeneratedLink(null);
    setInviteEmail('');
    setGenerateError(null);
  }

  // Determine the status of an invitation (accepted, expired, or active)
  function inviteStatus(invite: Invitation): { label: string; tone: string } {
    const expired = new Date(invite.expiresAt) < new Date();
    if (invite.acceptedAt) return { label: 'Accepted', tone: 'verified' };
    return expired ? { label: 'Expired', tone: 'rejected' } : { label: 'Active', tone: 'active' };
  }

  // Generate the full URL for an invitation using its token
  function inviteUrl(token: string) {
    return `${typeof window === 'undefined' ? '' : window.location.origin}/accept-invite?token=${token}`;
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
                <th>Email</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const status = inviteStatus(invite);
                return (
                  <tr key={invite.id}>
                    <td>{formatDate(invite.createdAt)}</td>
                    <td>{formatDate(invite.expiresAt)}</td>
                    <td>{invite.email}</td>
                    <td><Chip tone={status.tone}>{status.label}</Chip></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="secondary" onClick={() => copyLink(inviteUrl(invite.token))}>
                          Copy link
                        </Button>
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
            <p className="hint" style={{ marginBottom: 8 }}>Share this link with the people you want to invite:</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={inviteUrl(generatedLink.token)} readOnly style={{ flex: 1 }} />
              <Button variant="secondary" onClick={() => copyLink(inviteUrl(generatedLink.token))}>Copy</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="field">
              <label htmlFor="invite-email">Volunteer email</label>
              <input id="invite-email" type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="volunteer@example.com" />
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button variant="secondary" onClick={closeGenerateModal}>{generatedLink ? 'Close' : 'Cancel'}</Button>
          {!generatedLink && (
            <Button onClick={generateInvite} disabled={generating || !/^\S+@\S+\.\S+$/.test(inviteEmail)}>
              {generating ? 'Generating…' : 'Generate link'}
            </Button>
          )}
        </div>
      </Modal>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

/*When the user opens the Organisation Settings page, it first gets the active organisation ID using useAuth(). 
Using this ID, the page fetches the organisation details, organisation members, and existing invitation links 
through useApiGet(). 
Once the organisation data is loaded, a useEffect() populates the editable form fields such as the organisation name, 
description, contact email, latitude, longitude, and service-area radius. 
The admin can modify these details and click Save changes, which sends a PATCH request to /organisations/{orgId} 
with the updated organisation information. 
After saving, mutate() refreshes the organisation data and refreshProfile() updates the user's profile information. 
The page also displays the organisation's members and their roles. 
For invitations, the admin can click Generate invite link, enter a volunteer's email, and send a POST request to
/organisations/{orgId}/invitations. 
The returned invitation token is converted into an /accept-invite?token=... URL, which the admin can copy and share. 
Existing invitations are displayed with their creation date, expiry date, email, and status such as Active, Accepted, or Expired.*/