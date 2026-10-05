import { describe, expect, it } from 'vitest';
import { autoEventLocation } from './event-location';

const incidents = [
  { id: 'a', location: { lat: 6.8, lng: 79.9 } },
  { id: 'b', location: { lat: 7.29, lng: 80.63 } },
  { id: 'broken', location: { lat: Number.NaN, lng: 80 } },
];

describe('autoEventLocation', () => {
  it('uses the first ticked incident, in tick order', () => {
    expect(autoEventLocation(['b', 'a'], incidents)).toEqual({ lat: 7.29, lng: 80.63 });
    expect(autoEventLocation(['a', 'b'], incidents)).toEqual({ lat: 6.8, lng: 79.9 });
  });

  it('returns null for an empty selection', () => {
    expect(autoEventLocation([], incidents)).toBeNull();
  });

  it('skips ids that are not eligible or have no usable location', () => {
    expect(autoEventLocation(['gone', 'broken', 'b'], incidents)).toEqual({ lat: 7.29, lng: 80.63 });
    expect(autoEventLocation(['gone', 'broken'], incidents)).toBeNull();
  });
});
