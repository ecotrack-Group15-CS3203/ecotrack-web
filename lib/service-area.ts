/** Fixed radius options — must match SERVICE_AREA_RADIUS_OPTIONS_KM in the API's service-area.dto.ts. */
export const RADIUS_OPTIONS = [1, 5, 10, 25, 50] as const;

const KM_PER_DEGREE_LAT = 111.32;

function kmPerDegreeLng(latitude: number): number {
  // Clamped away from zero so a pin at a pole doesn't divide by zero.
  return KM_PER_DEGREE_LAT * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
}

/** A closed 64-segment polygon approximating a circle of `radiusKm` around the point. */
export function createCircle(longitude: number, latitude: number, radiusKm: number) {
  const coordinates = Array.from({ length: 65 }, (_, index) => {
    const angle = ((index % 64) / 64) * Math.PI * 2;
    const latitudeOffset = (radiusKm / KM_PER_DEGREE_LAT) * Math.sin(angle);
    const longitudeOffset = (radiusKm / kmPerDegreeLng(latitude)) * Math.cos(angle);
    return [longitude + longitudeOffset, latitude + latitudeOffset];
  });
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [coordinates] },
  };
}

/** [[west, south], [east, north]] bounding the circle — fed straight to map.fitBounds. */
export function circleBounds(longitude: number, latitude: number, radiusKm: number): [[number, number], [number, number]] {
  const dLat = radiusKm / KM_PER_DEGREE_LAT;
  const dLng = radiusKm / kmPerDegreeLng(latitude);
  return [
    [longitude - dLng, latitude - dLat],
    [longitude + dLng, latitude + dLat],
  ];
}

/**
 * Parses a manually typed coordinate. Returns null for blank/NaN input or a value
 * outside the valid range, so a half-typed "-" never moves the pin.
 */
export function parseCoordinate(value: string, axis: 'lat' | 'lng'): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const limit = axis === 'lat' ? 90 : 180;
  return Math.abs(parsed) <= limit ? parsed : null;
}

/** Wraps a longitude into [-180, 180] — Mapbox reports unwrapped values after panning across the antimeridian. */
export function wrapLongitude(longitude: number): number {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

/** Rounds to 6 decimal places (~0.1 m) so the readout and payload stay tidy. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
