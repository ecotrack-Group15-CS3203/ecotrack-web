import { describe, expect, it } from 'vitest';
import { THUMB_GRADIENTS, thumbGradient } from './thumb-gradients';

describe('thumbGradient', () => {
  it('returns one of the defined gradients', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      expect(THUMB_GRADIENTS).toContain(thumbGradient(seed));
    }
  });

  it('is deterministic for the same seed', () => {
    expect(thumbGradient(3)).toBe(thumbGradient(3));
  });

  it('wraps past the end of the list rather than running out', () => {
    expect(thumbGradient(THUMB_GRADIENTS.length)).toBe(thumbGradient(0));
    expect(thumbGradient(THUMB_GRADIENTS.length * 2 + 1)).toBe(thumbGradient(1));
  });

  it('handles a negative index', () => {
    expect(THUMB_GRADIENTS).toContain(thumbGradient(-1));
  });

  it('always returns a usable CSS value', () => {
    for (let seed = 0; seed < 10; seed += 1) {
      expect(thumbGradient(seed)).toMatch(/^linear-gradient\(/);
    }
  });
});
