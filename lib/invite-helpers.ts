import type { InviteLink } from './types';

export type InviteStatusTone = 'inactive' | 'rejected' | 'active';

export interface InviteStatus {
  labelKey: 'revoked' | 'expired' | 'exhausted' | 'active';
  tone: InviteStatusTone;
}

/**
 * Extracted from app/(org)/settings/page.tsx so this logic is unit-testable
 * without rendering the page. Returns a translation key rather than a
 * resolved string — the page still owns i18n via useTranslation(); this
 * function is pure precisely so it doesn't need a translation context to
 * test.
 *
 * Order matters: a link can be simultaneously expired AND exhausted, but
 * "revoked" (an admin actively pulled it) is the most specific, actionable
 * thing to tell an admin reviewing their own link list, ahead of the two
 * passive-expiry reasons.
 */
export function inviteStatus(invite: InviteLink, now: Date = new Date()): InviteStatus {
  if (invite.revokedAt) return { labelKey: 'revoked', tone: 'inactive' };
  if (new Date(invite.expiresAt) < now) return { labelKey: 'expired', tone: 'rejected' };
  if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
    return { labelKey: 'exhausted', tone: 'rejected' };
  }
  return { labelKey: 'active', tone: 'active' };
}
