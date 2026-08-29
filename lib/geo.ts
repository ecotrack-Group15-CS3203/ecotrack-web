/** Great-circle distance between two coordinates, in kilometers (haversine formula). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
/* The geo.ts file provides geographic utility functions for the application. 
The distanceKm() function calculates the great-circle distance between two sets of latitude and longitude coordinates using the haversine formula. 
This is useful for determining the distance between incidents, locations, or any other geographic points within the EcoTrack application. */