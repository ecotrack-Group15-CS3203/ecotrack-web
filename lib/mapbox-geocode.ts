/**
 * Thin wrappers over the Mapbox Geocoding v6 API, used by the service-area picker.
 * Both reuse NEXT_PUBLIC_MAPBOX_TOKEN (the same public token the maps already load
 * tiles with) and never throw: a network or API failure yields an empty result so
 * the picker silently falls back to raw coordinates.
 */

const GEOCODE_BASE = 'https://api.mapbox.com/search/geocode/v6';

export interface GeocodeResult {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface GeocodeFeature {
  id?: string;
  geometry?: { coordinates?: [number, number] };
  properties?: { mapbox_id?: string; name?: string; full_address?: string; place_formatted?: string };
}

export function parseFeatures(body: unknown): GeocodeResult[] {
  const features = (body as { features?: GeocodeFeature[] } | null)?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature, index) => {
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const props = feature.properties ?? {};
    const label =
      props.full_address ?? [props.name, props.place_formatted].filter(Boolean).join(', ');
    if (!label) return [];
    return [{ id: props.mapbox_id ?? feature.id ?? `${index}`, label, lat: lat as number, lng: lng as number }];
  });
}

async function request(path: string, params: Record<string, string>, token: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ ...params, access_token: token });
  try {
    const response = await fetch(`${GEOCODE_BASE}/${path}?${query}`, { signal });
    if (!response.ok) return [];
    return parseFeatures(await response.json());
  } catch {
    return [];
  }
}

export function forwardGeocode(
  text: string,
  options: { token: string; proximity?: { lat: number; lng: number }; language?: string; signal?: AbortSignal },
): Promise<GeocodeResult[]> {
  const q = text.trim();
  if (!q) return Promise.resolve([]);
  const params: Record<string, string> = { q, limit: '5', autocomplete: 'true' };
  if (options.proximity) params.proximity = `${options.proximity.lng},${options.proximity.lat}`;
  if (options.language) params.language = options.language;
  return request('forward', params, options.token, options.signal);
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  options: { token: string; language?: string; signal?: AbortSignal },
): Promise<string | null> {
  // No `limit`: reverse defaults to 1, and v6 rejects any other limit without a single `types`.
  const params: Record<string, string> = { latitude: `${lat}`, longitude: `${lng}` };
  if (options.language) params.language = options.language;
  const [first] = await request('reverse', params, options.token, options.signal);
  return first?.label ?? null;
}
