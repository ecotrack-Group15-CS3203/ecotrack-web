'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Incident } from '@/lib/types';

import 'mapbox-gl/dist/mapbox-gl.css';

export interface MapPoint {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  color?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#E9B44C',
  approved: '#2563EB',
  rejected: '#C0392B',
  duplicate: '#64748B',
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// IncidentMap() - Displays a Mapbox map with incident locations and color-coded markers by status
export function IncidentMap({ incidents }: { incidents: Incident[] }) {
  return (
    <MapView
      points={incidents.map((incident) => ({
        id: incident.id,
        title: incident.title,
        latitude: incident.latitude,
        longitude: incident.longitude,
        address: incident.address,
        color: STATUS_COLORS[incident.verificationStatus],
      }))}
    />
  );
}

// LocationMap() - Displays a Mapbox map with a single location and optional service area radius circle
export function LocationMap({
  id,
  title,
  latitude,
  longitude,
  address,
  radiusKm,
}: MapPoint & { radiusKm?: number }) {
  return <MapView points={[{ id, title, latitude, longitude, address }]} radiusKm={radiusKm} />;
}

// MapView() - Core map rendering function that initializes Mapbox, adds markers, and handles zoom/bounds
function MapView({ points, radiusKm }: { points: MapPoint[]; radiusKm?: number }) {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const validPoints = points.filter((point) => Number.isFinite(point.longitude) && Number.isFinite(point.latitude));
    const initial = validPoints[0] ?? { longitude: 0, latitude: 0 };
    const instance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initial.longitude, initial.latitude],
      zoom: validPoints.length ? 11 : 1,
      attributionControl: true,
    });
    instance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const markers = validPoints.map((point) => {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = 'incident-map-marker';
      markerElement.setAttribute('aria-label', point.title);
      markerElement.style.backgroundColor = point.color ?? '#0F6E56';
      const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
        `<strong>${escapeHtml(point.title)}</strong><br><span>${escapeHtml(point.address ?? 'Location reported')}</span>`,
      );
      return new mapboxgl.Marker({ element: markerElement })
        .setLngLat([point.longitude, point.latitude])
        .setPopup(popup)
        .addTo(instance);
    });

    if (validPoints.length > 1) {
      const bounds = validPoints.reduce(
        (result, point) => result.extend([point.longitude, point.latitude]),
        new mapboxgl.LngLatBounds([initial.longitude, initial.latitude], [initial.longitude, initial.latitude]),
      );
      instance.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
    }

    if (radiusKm && validPoints.length === 1) {
      const [longitude, latitude] = [validPoints[0].longitude, validPoints[0].latitude];
      const addServiceArea = () => {
        instance.addSource('service-area', { type: 'geojson', data: createCircle(longitude, latitude, radiusKm) });
        instance.addLayer({ id: 'service-area-fill', type: 'fill', source: 'service-area', paint: { 'fill-color': '#0F6E56', 'fill-opacity': 0.12 } });
        instance.addLayer({ id: 'service-area-line', type: 'line', source: 'service-area', paint: { 'line-color': '#0F6E56', 'line-width': 2 } });
        instance.fitBounds(new mapboxgl.LngLatBounds([longitude, latitude], [longitude, latitude]).extend([longitude + radiusKm / 80, latitude + radiusKm / 111]), { padding: 48, maxZoom: 12, duration: 0 });
      };
      if (instance.isStyleLoaded()) addServiceArea();
      else instance.once('load', addServiceArea);
    }

    return () => {
      markers.forEach((marker) => marker.remove());
      instance.remove();
    };
  }, [points, radiusKm]);

  if (!MAPBOX_TOKEN) {
    return <div className="map-placeholder map-token-missing">Add NEXT_PUBLIC_MAPBOX_TOKEN to view the incident map.</div>;
  }

  return <div ref={mapContainer} className="incident-map" aria-label="Map" />;
}

function createCircle(longitude: number, latitude: number, radiusKm: number) {
  const coordinates = Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    const latitudeOffset = (radiusKm / 111) * Math.sin(angle);
    const longitudeOffset = (radiusKm / (111 * Math.cos((latitude * Math.PI) / 180))) * Math.cos(angle);
    return [longitude + longitudeOffset, latitude + latitudeOffset];
  });
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordinates] } };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}
/* The map flow starts when IncidentMap or LocationMap receives location data. IncidentMap converts each Incident into a simpler MapPoint and assigns a marker color based on its verification status, while LocationMap displays a single location and can optionally show a service-area radius. Both components pass their points to the reusable MapView. Inside MapView, useEffect() checks for the Mapbox token and then creates a Mapbox map using NEXT_PUBLIC_MAPBOX_TOKEN. It filters out invalid latitude/longitude values, sets the initial map center, and creates a marker for each valid incident. Each marker gets a popup containing the incident title and address. If there are multiple incidents, fitBounds() automatically adjusts the map so all markers are visible. If a radiusKm is provided, createCircle() generates a GeoJSON circle around the location and the map displays it as a service-area boundary. When the component is removed or updated, the cleanup function removes the markers and destroys the Mapbox instance to prevent memory leaks.*/