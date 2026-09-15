'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { useAuthedFetch } from '@/lib/use-org-api';
import { ApiError } from '@/lib/api';
import { Button, Card, ErrorBanner, FieldError, Spinner } from '@/components/ui';
import { LocationMap } from '@/components/incident-map';
import { useFieldValidation, required, requiredEmail } from '@/lib/use-field-validation';
import { useThemeMode } from '@/lib/use-theme-mode';
import type { CreateOrganisationResult } from '@/lib/types';

const RADIUS_OPTIONS = [1, 5, 10, 25, 50];
const DEFAULT_LAT = 6.9271;
const DEFAULT_LNG = 79.8612;

export default function RegisterOrganisationPage() {
  const { t } = useTranslation();
  const { profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const api = useAuthedFetch();

  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [radiusKm, setRadiusKm] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  const nameValidation = useFieldValidation(required(t('orgRegistration.orgNameRequired')));
  const emailValidation = useFieldValidation(
    requiredEmail(t('orgRegistration.contactEmailRequired'), t('orgRegistration.contactEmailInvalid')),
  );
  const isDark = useThemeMode() === 'dark';

  if (loading) return <Spinner />;

  if (profile?.organisation) {
    return (
      <div className="kg-narrow">
        <Card style={{ padding: 28 }}>
          <h1 style={{ fontSize: 20, marginBottom: 10 }}>{t('orgRegistration.alreadyMemberTitle')}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
            {profile.organisation.name} — {t('orgRegistration.alreadyMemberBody')}
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            {t('orgRegistration.goToDashboard')}
          </Link>
        </Card>
      </div>
    );
  }

  async function submit() {
    if (!name.trim() || !contactEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    setAlreadyMember(false);
    try {
      await api.post<CreateOrganisationResult>('/organisations', {
        name,
        contactEmail,
        description: description || undefined,
        serviceAreaCenter: { lat: latitude, lng: longitude },
        serviceAreaRadiusKm: radiusKm,
      });
      await refreshProfile();
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyMember(true);
      } else {
        setError(err instanceof ApiError ? err.message : t('orgRegistration.genericError'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="kg-narrow">
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>{t('orgRegistration.title')}</h1>
      <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>
        {t('orgRegistration.description')}
      </p>

      <Card style={{ padding: 24 }}>
        {alreadyMember && (
          <div style={{ marginBottom: 16 }}>
            <ErrorBanner message={t('orgRegistration.alreadyMemberError')} />
          </div>
        )}
        {error && (
          <div style={{ marginBottom: 16 }}>
            <ErrorBanner message={error} />
          </div>
        )}

        <div className="field">
          <label htmlFor="org-name">
            {t('orgRegistration.orgName')} <span className="req">*</span>
          </label>
          <input
            id="org-name"
            type="text"
            aria-invalid={Boolean(nameValidation.error)}
            aria-describedby={nameValidation.error ? 'org-name-error' : undefined}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              nameValidation.revalidate(e.target.value);
            }}
            onBlur={(e) => nameValidation.onBlur(e.target.value)}
            placeholder={t('orgRegistration.orgNamePlaceholder')}
          />
          <FieldError id="org-name-error" message={nameValidation.error} />
        </div>

        <div className="field">
          <label htmlFor="org-contact-email">
            {t('orgRegistration.contactEmail')} <span className="req">*</span>
          </label>
          <input
            id="org-contact-email"
            type="email"
            aria-invalid={Boolean(emailValidation.error)}
            aria-describedby={emailValidation.error ? 'org-contact-email-error' : undefined}
            value={contactEmail}
            onChange={(e) => {
              setContactEmail(e.target.value);
              emailValidation.revalidate(e.target.value);
            }}
            onBlur={(e) => emailValidation.onBlur(e.target.value)}
            placeholder={t('orgRegistration.contactEmailPlaceholder')}
          />
          <FieldError id="org-contact-email-error" message={emailValidation.error} />
        </div>

        <div className="field">
          <label htmlFor="org-description">{t('orgRegistration.descriptionLabel')}</label>
          <textarea
            id="org-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('orgRegistration.descriptionPlaceholder')}
          />
        </div>

        <div className="field">
          <label>
            {t('orgRegistration.serviceArea')} <span className="req">*</span>
          </label>
          <LocationMap
            id="new-organisation"
            title={name || 'Your organisation'}
            latitude={latitude}
            longitude={longitude}
            radiusKm={radiusKm}
            mapStyle={isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'}
            accentColor={isDark ? '#22D3EE' : '#0891B2'}
          />
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <input
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(Number(e.target.value))}
              placeholder="Latitude"
              aria-label={t('orgRegistration.radiusLabel')}
            />
            <input
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(Number(e.target.value))}
              placeholder="Longitude"
              aria-label="Service area longitude"
            />
          </div>
          <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} aria-label={t('orgRegistration.radiusLabel')}>
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>
                {km} km radius
              </option>
            ))}
          </select>
          <div className="hint">
            {t('orgRegistration.serviceAreaHint')}
          </div>
        </div>

        <Button
          className="btn-block"
          disabled={submitting || !name.trim() || !contactEmail.trim()}
          onClick={submit}
        >
          {submitting ? t('orgRegistration.submitting') : t('orgRegistration.submit')}
        </Button>
      </Card>
    </div>
  );
}
