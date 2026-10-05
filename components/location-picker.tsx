'use client';

import { useEffect, useId, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import { useTranslation } from 'react-i18next';
import { mapThemeFor } from '@/lib/map-theme';
import { useThemeMode } from '@/lib/use-theme-mode';
import { forwardGeocode, reverseGeocode, type GeocodeResult } from '@/lib/mapbox-geocode';
import {
  RADIUS_OPTIONS,
  circleBounds,
  createCircle,
  parseCoordinate,
  roundCoordinate,
  wrapLongitude,
} from '@/lib/service-area';

import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const SOURCE_ID = 'service-area';
const FILL_LAYER = 'service-area-fill';
const LINE_LAYER = 'service-area-line';
/** Street-level zoom for picking a single point (no radius to fit). */
const POINT_ZOOM = 13;

export interface LatLng {
  lat: number;
  lng: number;
}

/** A fixed, clickable marker shown for context, e.g. an incident an event will address. */
export interface ReferencePoint extends LatLng {
  id: string;
  title: string;
}

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (point: LatLng) => void;
  /** With a radius the picker edits an area: it draws the circle and shows radius chips. */
  radiusKm?: number;
  onRadiusChange?: (km: number) => void;
  referencePoints?: ReferencePoint[];
  /** Accessible name for the draggable pin, e.g. the organisation's or event's name. */
  title?: string;
}

/**
 * Interactive location editor: search a place, click the map or drag the pin, use
 * the browser's location, or type coordinates. Pass `radiusKm` to edit a service
 * area instead of a single point. Unlike LocationMap, the Mapbox instance is
 * created once and updated in place, so dragging doesn't rebuild the map.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
  radiusKm,
  onRadiusChange,
  referencePoints,
  title,
}: LocationPickerProps) {
  const { t, i18n } = useTranslation();
  const mode = useThemeMode();
  const theme = mapThemeFor(mode);
  const baseId = useId();
  const hasRadius = radiusKm !== undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // What the camera is framed on. Set when the map is created, so the sync effect
  // moves the camera only for a genuinely new point/radius.
  const framedRef = useRef<{ lat: number; lng: number; km: number | undefined } | null>(null);
  // Latest values for the long-lived Mapbox handlers, which are bound once at mount.
  const latest = useRef({ latitude, longitude, radiusKm, accentColor: theme.accentColor, onChange });
  useEffect(() => {
    latest.current = { latitude, longitude, radiusKm, accentColor: theme.accentColor, onChange };
  });

  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ---- Map lifecycle: create once, after the theme resolves ----
  // useThemeMode() is null on the first client render; waiting avoids loading the
  // light basemap only to swap it out mid-load for dark.
  const themeKnown = mode !== null;
  useEffect(() => {
    const container = containerRef.current;
    if (!MAPBOX_TOKEN || !container || !themeKnown) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const start = latest.current;

    const map = new mapboxgl.Map({
      container,
      style: mapThemeFor(mode).mapStyle,
      ...(start.radiusKm !== undefined
        ? { bounds: circleBounds(start.longitude, start.latitude, start.radiusKm), fitBoundsOptions: { padding: 32 } }
        : { center: [start.longitude, start.latitude] as [number, number], zoom: POINT_ZOOM }),
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const pin = document.createElement('div');
    pin.className = 'loc-picker-pin';
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', title ?? t('locationPicker.pinLabel'));
    // The shape lives on a child: Mapbox owns the marker element's inline transform.
    pin.appendChild(document.createElement('span')).className = 'loc-picker-pin-head';
    const marker = new mapboxgl.Marker({ element: pin, draggable: true, anchor: 'bottom' })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map);

    const emit = (lngLat: mapboxgl.LngLat) =>
      latest.current.onChange({ lat: roundCoordinate(lngLat.lat), lng: roundCoordinate(wrapLongitude(lngLat.lng)) });

    marker.on('dragend', () => emit(marker.getLngLat()));
    map.on('click', (event) => {
      // A click on a reference marker is handled by the marker itself.
      if ((event.originalEvent.target as Element | null)?.closest?.('.loc-picker-ref')) return;
      marker.setLngLat(event.lngLat);
      emit(event.lngLat);
    });

    // style.load fires on first load and again after every setStyle (theme switch).
    // A style swap may drop the custom source/layers or diff them through, so add
    // what's missing and re-apply the current accent either way.
    map.on('style.load', () => {
      const { longitude: lng, latitude: lat, radiusKm: km, accentColor } = latest.current;
      if (km === undefined) return;
      const data = createCircle(lng, lat, km);
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (source) source.setData(data);
      else map.addSource(SOURCE_ID, { type: 'geojson', data });
      if (!map.getLayer(FILL_LAYER)) map.addLayer({ id: FILL_LAYER, type: 'fill', source: SOURCE_ID, paint: { 'fill-opacity': 0.14 } });
      if (!map.getLayer(LINE_LAYER)) map.addLayer({ id: LINE_LAYER, type: 'line', source: SOURCE_ID, paint: { 'line-width': 2 } });
      map.setPaintProperty(FILL_LAYER, 'fill-color', accentColor);
      map.setPaintProperty(LINE_LAYER, 'line-color', accentColor);
    });

    // A modal's open animation or a late layout pass can resize the container after
    // the map measured it; without this the canvas stays at the stale size.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    mapRef.current = map;
    markerRef.current = marker;
    framedRef.current = { lat: start.latitude, lng: start.longitude, km: start.radiusKm };
    return () => {
      resizeObserver.disconnect();
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Created once: later changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKnown]);

  // ---- Theme switch: swap the basemap in place ----
  const appliedStyle = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (appliedStyle.current === null) {
      appliedStyle.current = theme.mapStyle;
      return;
    }
    if (appliedStyle.current === theme.mapStyle) return;
    appliedStyle.current = theme.mapStyle;
    map.setStyle(theme.mapStyle);
  }, [theme.mapStyle]);

  // ---- Centre / radius changes: move the pin, redraw the circle, reframe ----
  // Also runs once the map exists (themeKnown), in case values changed before that.
  useEffect(() => {
    const map = mapRef.current;
    const framed = framedRef.current;
    if (!map || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (framed && framed.lat === latitude && framed.lng === longitude && framed.km === radiusKm) return;
    framedRef.current = { lat: latitude, lng: longitude, km: radiusKm };
    markerRef.current?.setLngLat([longitude, latitude]);
    if (radiusKm !== undefined) {
      (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(createCircle(longitude, latitude, radiusKm));
    }
    if (radiusKm !== undefined) {
      map.fitBounds(circleBounds(longitude, latitude, radiusKm), { padding: 32, duration: 500 });
    } else if (!map.getBounds()?.contains([longitude, latitude])) {
      // A point picked by clicking or dragging is already in view, so the map stays
      // still; one from search, geolocation, typing or the parent may not be.
      map.easeTo({ center: [longitude, latitude], duration: 500 });
    }
  }, [latitude, longitude, radiusKm, themeKnown]);

  // ---- Reference markers (e.g. the incidents an event addresses) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !referencePoints?.length) return;
    const markers = referencePoints.map((point) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'loc-picker-ref';
      const label = t('locationPicker.referenceMarker', { title: point.title });
      element.title = label;
      element.setAttribute('aria-label', label);
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        latest.current.onChange({ lat: roundCoordinate(point.lat), lng: roundCoordinate(point.lng) });
      });
      return new mapboxgl.Marker({ element }).setLngLat([point.lng, point.lat]).addTo(map);
    });
    // Keep the pin above the reference dots so it stays draggable where they overlap.
    markerRef.current?.getElement().parentElement?.appendChild(markerRef.current.getElement());
    // Bring every reference point into view alongside the pin, without zooming in past
    // street level when they're all close together.
    const { latitude: lat, longitude: lng } = latest.current;
    const view = map.getBounds();
    if (view && referencePoints.some((point) => !view.contains([point.lng, point.lat]))) {
      const bounds = referencePoints.reduce(
        (result, point) => result.extend([point.lng, point.lat]),
        new mapboxgl.LngLatBounds([lng, lat], [lng, lat]),
      );
      map.fitBounds(bounds, { padding: 40, maxZoom: POINT_ZOOM, duration: 500 });
    }
    return () => markers.forEach((marker) => marker.remove());
  }, [referencePoints, themeKnown, t]);

  // ---- Readable place name under the map ----
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const label = await reverseGeocode(latitude, longitude, {
        token: MAPBOX_TOKEN,
        language: i18n.language,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setPlaceLabel(label);
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [latitude, longitude, i18n.language]);

  function locateMe() {
    if (!('geolocation' in navigator)) {
      setLocationError(t('locationPicker.locationUnavailable'));
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChange({ lat: roundCoordinate(position.coords.latitude), lng: roundCoordinate(position.coords.longitude) });
      },
      () => {
        setLocating(false);
        setLocationError(t('locationPicker.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const coordsText = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return (
    <div className="loc-picker">
      {MAPBOX_TOKEN && (
        <div className="loc-picker-toolbar">
          <PlaceSearch
            proximity={{ lat: latitude, lng: longitude }}
            language={i18n.language}
            onPick={(result) => onChange({ lat: roundCoordinate(result.lat), lng: roundCoordinate(result.lng) })}
          />
          <button type="button" className="loc-picker-locate" onClick={locateMe} disabled={locating}>
            {locating ? t('locationPicker.locating') : t('locationPicker.useMyLocation')}
          </button>
        </div>
      )}
      {locationError && (
        <div className="loc-picker-error" role="alert">
          {locationError}
        </div>
      )}

      {MAPBOX_TOKEN ? (
        <div ref={containerRef} className="loc-picker-map" aria-label={t('locationPicker.mapLabel')} />
      ) : (
        <div className="map-placeholder map-token-missing loc-picker-map--empty">{t('locationPicker.mapTokenMissing')}</div>
      )}

      <div className="loc-picker-readout" aria-live="polite">
        <span className="loc-picker-coords">{coordsText}</span>
        {placeLabel && <span className="loc-picker-place"> · {placeLabel}</span>}
      </div>
      {MAPBOX_TOKEN && (
        <div className="hint">
          {t(hasRadius ? 'locationPicker.clickToPlaceArea' : 'locationPicker.clickToPlacePoint')}
          {referencePoints?.length ? ` ${t('locationPicker.referenceHint')}` : ''}
        </div>
      )}

      {hasRadius && (
        <div className="loc-picker-radius" role="radiogroup" aria-label={t('locationPicker.radiusLabel')}>
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              type="button"
              role="radio"
              aria-checked={radiusKm === km}
              className={`loc-picker-chip${radiusKm === km ? ' is-active' : ''}`}
              onClick={() => onRadiusChange?.(km)}
            >
              {t('locationPicker.radiusOption', { km })}
            </button>
          ))}
        </div>
      )}

      <details className="loc-picker-manual" open={!MAPBOX_TOKEN}>
        <summary>{t('locationPicker.manualCoords')}</summary>
        <div className="loc-picker-manual-row">
          <CoordinateInput
            id={`${baseId}-lat`}
            axis="lat"
            label={t('locationPicker.latitude')}
            value={latitude}
            onCommit={(lat) => onChange({ lat, lng: longitude })}
          />
          <CoordinateInput
            id={`${baseId}-lng`}
            axis="lng"
            label={t('locationPicker.longitude')}
            value={longitude}
            onCommit={(lng) => onChange({ lat: latitude, lng })}
          />
        </div>
      </details>
    </div>
  );
}

/**
 * A number field that only reports valid coordinates. It keeps its own draft text
 * so a half-typed value ("6." or "-") isn't overwritten by the parent's number.
 */
function CoordinateInput({
  id,
  axis,
  label,
  value,
  onCommit,
}: {
  id: string;
  axis: 'lat' | 'lng';
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);
  // Adopt outside changes (map click, search) unless the draft already means the same number.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (parseCoordinate(draft, axis) !== value) setDraft(String(value));
  }
  const invalid = parseCoordinate(draft, axis) === null;

  return (
    <label htmlFor={id} className="loc-picker-coord">
      <span>{label}</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.0001"
        min={axis === 'lat' ? -90 : -180}
        max={axis === 'lat' ? 90 : 180}
        value={draft}
        aria-invalid={invalid}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = parseCoordinate(event.target.value, axis);
          if (parsed !== null) onCommit(parsed);
        }}
      />
    </label>
  );
}

function PlaceSearch({
  proximity,
  language,
  onPick,
}: {
  proximity: LatLng;
  language: string;
  onPick: (result: GeocodeResult) => void;
}) {
  const { t } = useTranslation();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const proximityRef = useRef(proximity);
  useEffect(() => {
    proximityRef.current = proximity;
  });

  useEffect(() => {
    if (!MAPBOX_TOKEN || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const found = await forwardGeocode(query, {
        token: MAPBOX_TOKEN,
        proximity: proximityRef.current,
        language,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setResults(found);
      setSearched(true);
      setActive(-1);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, language]);

  function pick(result: GeocodeResult) {
    onPick(result);
    setQuery(result.label);
    setOpen(false);
    setResults([]);
    setSearched(false);
  }

  const showList = open && query.trim().length >= 2 && (results.length > 0 || searched);

  return (
    <div className="loc-picker-search">
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={t('locationPicker.searchLabel')}
        placeholder={t('locationPicker.searchPlaceholder')}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (event.target.value.trim().length < 2) {
            setResults([]);
            setSearched(false);
          }
        }}
        onFocus={() => setOpen(true)}
        // Delay so a click on a result lands before the list unmounts.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (!showList || results.length === 0) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => (index + 1) % results.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            pick(results[active >= 0 ? active : 0]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul id={listId} role="listbox" className="loc-picker-results">
          {results.length === 0 ? (
            <li className="loc-picker-empty">{t('locationPicker.noResults')}</li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={index === active ? 'is-active' : undefined}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(result);
                }}
              >
                {result.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
