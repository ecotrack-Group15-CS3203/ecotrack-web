'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button, Card, ErrorBanner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuthedFetch } from '@/lib/use-org-api';

interface InviteInfo {
  organisationName: string;
  expired: boolean;
  revoked: boolean;
  exhausted: boolean;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not available in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10_000 });
  });
}

export function InviteAcceptClient({
  token,
  info,
  authenticated,
}: {
  token: string;
  info: InviteInfo;
  authenticated: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const api = useAuthedFetch();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const invalidReason = info.revoked
    ? t('invite.revoked')
    : info.expired
      ? t('invite.expired')
      : info.exhausted
        ? t('invite.exhausted')
        : null;

  if (invalidReason) {
    return (
      <Card style={{ padding: 28 }}>
        <h1 style={{ fontSize: 20, marginBottom: 10 }}>{t('invite.invalidTitle')}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>{invalidReason}</p>
        <Link href="/" className="btn btn-secondary">
          {t('invite.backToHome')}
        </Link>
      </Card>
    );
  }

  if (!authenticated) {
    return (
      <Card style={{ padding: 28 }}>
        <h1 style={{ fontSize: 20, marginBottom: 10 }}>{t('invite.joinTitle', { organisationName: info.organisationName })}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>{t('invite.signInBody')}</p>
        <a href={`/api/auth/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`} className="btn btn-primary">
          {t('invite.signInToAccept')}
        </a>
      </Card>
    );
  }

  async function accept() {
    setSubmitting(true);
    setError(null);
    try {
      const position = await getCurrentPosition();
      await api.post('/organisations/invites/accept', {
        token,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      router.push('/app');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        // Anything else here is the geolocation promise rejecting -- a denied
        // permission, an unavailable position, or a timeout.
        setError(t('invite.locationError'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={{ padding: 28 }}>
      <h1 style={{ fontSize: 20, marginBottom: 10 }}>{t('invite.joinTitle', { organisationName: info.organisationName })}</h1>
      <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
        {t('invite.consentBody', { organisationName: info.organisationName })}
      </p>
      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBanner message={error} />
        </div>
      )}
      <Button className="btn-block" disabled={submitting} onClick={accept}>
        {submitting ? t('invite.confirming') : t('invite.confirmAndJoin')}
      </Button>
    </Card>
  );
}
