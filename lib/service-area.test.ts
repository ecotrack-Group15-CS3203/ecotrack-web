import { describe, expect, it } from 'vitest';
import { distanceKm } from './geo';
import {
  RADIUS_OPTIONS,
  circleBounds,
  createCircle,
  parseCoordinate,
  roundCoordinate,
  wrapLongitude,
} from './service-area';

const COLOMBO = { lat: 6.9271, lng: 79.8612 };

describe('createCircle', () => {
  it('returns a closed 65-point ring', () => {
    const ring = createCircle(COLOMBO.lng, COLOMBO.lat, 5).geometry.coordinates[0];
    expect(ring).toHaveLength(65);
    expect(ring[64]).toEqual(ring[0]);
  });

  it.each(RADIUS_OPTIONS)('puts every vertex ~%i km from the centre', (km) => {
    const ring = createCircle(COLOMBO.lng, COLOMBO.lat, km).geometry.coordinates[0];
    for (const [lng, lat] of ring) {
      expect(distanceKm(COLOMBO.lat, COLOMBO.lng, lat, lng)).toBeCloseTo(km, 0);
    }
  });

  it('stays round at high latitudes', () => {
    const ring = createCircle(10, 60, 10).geometry.coordinates[0];
    for (const [lng, lat] of ring) {
      expect(Math.abs(distanceKm(60, 10, lat, lng) - 10)).toBeLessThan(0.2);
    }
  });
});

describe('circleBounds', () => {
  it('is centred on the point and contains the whole circle', () => {
    const [[west, south], [east, north]] = circleBounds(COLOMBO.lng, COLOMBO.lat, 10);
    expect((west + east) / 2).toBeCloseTo(COLOMBO.lng, 6);
    expect((south + north) / 2).toBeCloseTo(COLOMBO.lat, 6);
    for (const [lng, lat] of createCircle(COLOMBO.lng, COLOMBO.lat, 10).geometry.coordinates[0]) {
      expect(lng).toBeGreaterThanOrEqual(west - 1e-9);
      expect(lng).toBeLessThanOrEqual(east + 1e-9);
      expect(lat).toBeGreaterThanOrEqual(south - 1e-9);
      expect(lat).toBeLessThanOrEqual(north + 1e-9);
    }
  });

  it('stays finite at the poles', () => {
    const [[west], [east]] = circleBounds(0, 90, 5);
    expect(Number.isFinite(west)).toBe(true);
    expect(Number.isFinite(east)).toBe(true);
  });
});

describe('parseCoordinate', () => {
  it('accepts valid values', () => {
    expect(parseCoordinate('6.9271', 'lat')).toBe(6.9271);
    expect(parseCoordinate('-180', 'lng')).toBe(-180);
    expect(parseCoordinate('90', 'lat')).toBe(90);
  });

  it('rejects blank, partial, non-numeric and out-of-range input', () => {
    expect(parseCoordinate('', 'lat')).toBeNull();
    expect(parseCoordinate('  ', 'lat')).toBeNull();
    expect(parseCoordinate('-', 'lng')).toBeNull();
    expect(parseCoordinate('abc', 'lng')).toBeNull();
    expect(parseCoordinate('90.1', 'lat')).toBeNull();
    expect(parseCoordinate('181', 'lng')).toBeNull();
  });
});

describe('wrapLongitude / roundCoordinate', () => {
  it('wraps longitudes past the antimeridian', () => {
    expect(wrapLongitude(79.8612 + 360)).toBeCloseTo(79.8612, 9);
    expect(wrapLongitude(-190)).toBeCloseTo(170, 9);
    expect(wrapLongitude(45)).toBe(45);
  });

  it('rounds to 6 decimal places', () => {
    expect(roundCoordinate(6.92710049)).toBe(6.9271);
    expect(roundCoordinate(79.86123456)).toBe(79.861235);
  });
});
