import type { GeoPoint } from './types';

interface Locatable {
  id: string;
  location: GeoPoint;
}

/**
 * Where Create Event should auto-place the pin for a set of ticked incidents: the
 * first ticked one (in tick order) that is in the eligible list and has a usable
 * location. Null when there is nothing to move to, leaving the pin where it is.
 */
export function autoEventLocation(selectedIds: string[], incidents: Locatable[]): GeoPoint | null {
  for (const id of selectedIds) {
    const location = incidents.find((incident) => incident.id === id)?.location;
    if (location && Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
      return { lat: location.lat, lng: location.lng };
    }
  }
  return null;
}
