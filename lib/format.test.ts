import { describe, expect, it } from 'vitest';
import { relativeAge } from './format';

const NOW = new Date('2026-03-10T12:00:00.000Z').getTime();

describe('relativeAge', () => {
  it('says "just now" under a minute', () => {
    expect(relativeAge(new Date(NOW - 59_000).toISOString(), NOW)).toBe('just now');
  });

  it('shows minutes once a full minute has passed', () => {
    expect(relativeAge(new Date(NOW - 60_000).toISOString(), NOW)).toBe('1m');
    expect(relativeAge(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe('5m');
  });

  it('shows hours once a full hour has passed', () => {
    expect(relativeAge(new Date(NOW - 3_600_000).toISOString(), NOW)).toBe('1h');
    expect(relativeAge(new Date(NOW - 23 * 3_600_000).toISOString(), NOW)).toBe('23h');
  });

  it('shows days once a full 24 hours has passed', () => {
    expect(relativeAge(new Date(NOW - 24 * 3_600_000).toISOString(), NOW)).toBe('1d');
    expect(relativeAge(new Date(NOW - 9 * 86_400_000).toISOString(), NOW)).toBe('9d');
  });

  it('never goes negative for a future timestamp', () => {
    expect(relativeAge(new Date(NOW + 60_000).toISOString(), NOW)).toBe('just now');
  });
});
