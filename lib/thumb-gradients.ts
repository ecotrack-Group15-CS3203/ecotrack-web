/**
 * Placeholder fills for incident thumbnails, used until a real photo is
 * available. Identical in both themes -- dark mode dims them through the
 * `--thumb-dim` filter rather than by swapping the palette, so uploaded photos
 * get the same treatment.
 */
export const THUMB_GRADIENTS: readonly string[] = [
  'linear-gradient(135deg,#F0997B,#D85A30)',
  'linear-gradient(135deg,#85B7EB,#378ADD)',
  'linear-gradient(135deg,#97C459,#639922)',
  'linear-gradient(135deg,#9FE1CB,#5DCAA5)',
  'linear-gradient(135deg,#F5C4B3,#D85A30)',
];

/** Deterministic: the same seed always picks the same gradient. */
export function thumbGradient(seed: number): string {
  const index = Math.abs(Math.trunc(seed)) % THUMB_GRADIENTS.length;
  return THUMB_GRADIENTS[index];
}
