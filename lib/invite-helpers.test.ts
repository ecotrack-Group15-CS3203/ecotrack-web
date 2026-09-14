import { describe, expect, it } from 'vitest';
import { inviteStatus } from './invite-helpers';
import type { InviteLink } from './types';

const NOW = new Date('2026-06-01T00:00:00.000Z');

function invite(overrides: Partial<InviteLink>): InviteLink {
  return {
    id: 'invite-id',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    organisationId: 'org-id',
    tokenHash: 'hash',
    maxUses: null,
    usesCount: 0,
    expiresAt: '2026-12-01T00:00:00.000Z',
    createdByUserId: 'user-id',
    revokedAt: null,
    ...overrides,
  };
}

describe('inviteStatus', () => {
  it('is active when unexpired, unrevoked, and under any use limit', () => {
    expect(inviteStatus(invite({ maxUses: 10, usesCount: 3 }), NOW).labelKey).toBe('active');
  });

  it('is active with unlimited uses (maxUses null) no matter the count', () => {
    expect(inviteStatus(invite({ maxUses: null, usesCount: 500 }), NOW).labelKey).toBe('active');
  });

  it('is revoked when revokedAt is set, even if also expired and exhausted', () => {
    // Revoked takes priority — it is the most specific, actionable reason.
    const result = inviteStatus(
      invite({
        revokedAt: '2026-02-01T00:00:00.000Z',
        expiresAt: '2026-01-01T00:00:00.000Z',
        maxUses: 1,
        usesCount: 1,
      }),
      NOW,
    );
    expect(result.labelKey).toBe('revoked');
    expect(result.tone).toBe('inactive');
  });

  it('is expired when expiresAt is in the past and not revoked', () => {
    const result = inviteStatus(invite({ expiresAt: '2026-01-01T00:00:00.000Z' }), NOW);
    expect(result.labelKey).toBe('expired');
    expect(result.tone).toBe('rejected');
  });

  it('is exhausted when usesCount reaches maxUses and it is not expired or revoked', () => {
    const result = inviteStatus(invite({ maxUses: 5, usesCount: 5 }), NOW);
    expect(result.labelKey).toBe('exhausted');
    expect(result.tone).toBe('rejected');
  });

  it('prefers expired over exhausted when both are true', () => {
    const result = inviteStatus(
      invite({ expiresAt: '2026-01-01T00:00:00.000Z', maxUses: 5, usesCount: 5 }),
      NOW,
    );
    expect(result.labelKey).toBe('expired');
  });

  it('is not exhausted merely for exceeding a null maxUses check boundary (usesCount < maxUses)', () => {
    expect(inviteStatus(invite({ maxUses: 5, usesCount: 4 }), NOW).labelKey).toBe('active');
  });
});
