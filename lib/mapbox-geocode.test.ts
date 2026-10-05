import { afterEach, describe, expect, it, vi } from 'vitest';
import { forwardGeocode, parseFeatures, reverseGeocode } from './mapbox-geocode';

const feature = (overrides: Record<string, unknown> = {}) => ({
  id: 'f1',
  geometry: { type: 'Point', coordinates: [79.9, 6.75] },
  properties: { mapbox_id: 'm1', name: 'Bolgoda Lake', place_formatted: 'Moratuwa, Sri Lanka' },
  ...overrides,
});

function mockFetch(body: unknown, ok = true) {
  const fn = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('parseFeatures', () => {
  it('maps features to label + lat/lng', () => {
    expect(parseFeatures({ features: [feature()] })).toEqual([
      { id: 'm1', label: 'Bolgoda Lake, Moratuwa, Sri Lanka', lat: 6.75, lng: 79.9 },
    ]);
  });

  it('prefers full_address when present', () => {
    const [result] = parseFeatures({ features: [feature({ properties: { full_address: '12 Galle Rd, Colombo' } })] });
    expect(result.label).toBe('12 Galle Rd, Colombo');
  });

  it('drops features without coordinates or a label, and tolerates junk bodies', () => {
    expect(parseFeatures({ features: [feature({ geometry: {} }), feature({ properties: {} })] })).toEqual([]);
    expect(parseFeatures(null)).toEqual([]);
    expect(parseFeatures({ message: 'Not Authorized' })).toEqual([]);
  });
});

describe('forwardGeocode', () => {
  it('skips the request for blank input', async () => {
    const fetchMock = mockFetch({ features: [] });
    expect(await forwardGeocode('   ', { token: 't' })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the query, proximity and token', async () => {
    const fetchMock = mockFetch({ features: [feature()] });
    const results = await forwardGeocode('bolgoda', { token: 'pk.test', proximity: { lat: 6.9, lng: 79.8 }, language: 'en' });
    expect(results).toHaveLength(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/search/geocode/v6/forward');
    expect(url.searchParams.get('q')).toBe('bolgoda');
    expect(url.searchParams.get('proximity')).toBe('79.8,6.9');
    expect(url.searchParams.get('access_token')).toBe('pk.test');
  });

  it('returns [] on an HTTP error or a network failure', async () => {
    mockFetch({}, false);
    expect(await forwardGeocode('x y', { token: 't' })).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await forwardGeocode('x y', { token: 't' })).toEqual([]);
  });
});

describe('reverseGeocode', () => {
  it('returns the first label, or null when nothing matches', async () => {
    const fetchMock = mockFetch({ features: [feature()] });
    expect(await reverseGeocode(6.75, 79.9, { token: 't' })).toBe('Bolgoda Lake, Moratuwa, Sri Lanka');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/search/geocode/v6/reverse');
    expect(url.searchParams.has('limit')).toBe(false);

    mockFetch({ features: [] });
    expect(await reverseGeocode(0, 0, { token: 't' })).toBeNull();
  });
});
