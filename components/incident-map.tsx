'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Incident } from '@/lib/types';

import 'mapbox-gl/dist/mapbox-gl.css';

const STATUS_COLORS: Record<string, string> = {
  pending: '#E9B44C',
  approved: '#2563EB',
  rejected: '#C0392B',
  duplicate: '#64748B',
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function IncidentMap({ incidents }: { incidents: Incident[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const validIncidents = incidents.filter((incident) => Number.isFinite(incident.longitude) && Number.isFinite(incident.latitude));
    const initial = validIncidents[0] ?? { longitude: 0, latitude: 0 };
    const instance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initial.longitude, initial.latitude],
      zoom: validIncidents.length ? 11 : 1,
      attributionControl: true,
    });
    map.current = instance;
    instance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const markers = validIncidents.map((incident) => {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = 'incident-map-marker';
      markerElement.setAttribute('aria-label', incident.title);
      markerElement.style.backgroundColor = STATUS_COLORS[incident.verificationStatus] ?? '#64748B';
      const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
        `<strong>${escapeHtml(incident.title)}</strong><br><span>${escapeHtml(incident.address ?? 'Location reported')}</span>`,
      );
      return new mapboxgl.Marker({ element: markerElement })
        .setLngLat([incident.longitude, incident.latitude])
        .setPopup(popup)
        .addTo(instance);
    });

    if (validIncidents.length > 1) {
      const bounds = validIncidents.reduce(
        (result, incident) => result.extend([incident.longitude, incident.latitude]),
        new mapboxgl.LngLatBounds([initial.longitude, initial.latitude], [initial.longitude, initial.latitude]),
      );
      instance.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
    }

    return () => {
      markers.forEach((marker) => marker.remove());
      instance.remove();
      map.current = null;
    };
  }, [incidents]);

  if (!MAPBOX_TOKEN) {
    return <div className="map-placeholder map-token-missing">Add NEXT_PUBLIC_MAPBOX_TOKEN to view the incident map.</div>;
  }

  return <div ref={mapContainer} className="incident-map" aria-label="Incident map" />;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}