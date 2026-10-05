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

export interface LatLng {
  lat: number;
  lng: number;
}

interface ServiceAreaPickerProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onChange: (center: LatLng) => void;
  onRadiusChange: (km: number) => void;
  /** Accessible name for the draggable pin, e.g. the organisation's name. */
  title?: string;
}

/**
 * Interactive service-area editor: search a place, click the map or drag the pin
 * to set the centre, pick a radius. Unlike LocationMap, the Mapbox instance is
 * created once and updated in place, so dragging doesn't rebuild the map.
 */
export function ServiceAreaPicker({ latitude, longitude, radiusKm, onChange, onRadiusChange, title }: ServiceAreaPickerProps) {
  const { t, i18n } = useTranslation();
  const mode = useThemeMode();
  const theme = mapThemeFor(mode);
  const baseId = useId();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
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
    if (!MAPBOX_TOKEN || !containerRef.current || !themeKnown) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const start = latest.current;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapThemeFor(mode).mapStyle,
      bounds: circleBounds(start.longitude, start.latitude, start.radiusKm),
      fitBoundsOptions: { padding: 32 },
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const pin = document.createElement('div');
    pin.className = 'sa-picker-pin';
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', title ?? 'Service area centre');
    // The shape lives on a child: Mapbox owns the marker element's inline transform.
    pin.appendChild(document.createElement('span')).className = 'sa-picker-pin-head';
    const marker = new mapboxgl.Marker({ element: pin, draggable: true, anchor: 'bottom' })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map);

    const emit = (lngLat: mapboxgl.LngLat) =>
      latest.current.onChange({ lat: roundCoordinate(lngLat.lat), lng: roundCoordinate(wrapLongitude(lngLat.lng)) });

    marker.on('dragend', () => emit(marker.getLngLat()));
    map.on('click', (event) => {
      marker.setLngLat(event.lngLat);
      emit(event.lngLat);
    });

    // style.load fires on first load and again after every setStyle (theme switch).
    // A style swap may drop the custom source/layers or diff them through, so add
    // what's missing and re-apply the current accent either way.
    map.on('style.load', () => {
      const { longitude: lng, latitude: lat, radiusKm: km, accentColor } = latest.current;
      const data = createCircle(lng, lat, km);
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (source) source.setData(data);
      else map.addSource(SOURCE_ID, { type: 'geojson', data });
      if (!map.getLayer(FILL_LAYER)) map.addLayer({ id: FILL_LAYER, type: 'fill', source: SOURCE_ID, paint: { 'fill-opacity': 0.14 } });
      if (!map.getLayer(LINE_LAYER)) map.addLayer({ id: LINE_LAYER, type: 'line', source: SOURCE_ID, paint: { 'line-width': 2 } });
      map.setPaintProperty(FILL_LAYER, 'fill-color', accentColor);
      map.setPaintProperty(LINE_LAYER, 'line-color', accentColor);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
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

  // ---- Centre / radius changes: move the pin, redraw the circle, refit ----
  const firstSync = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    markerRef.current?.setLngLat([longitude, latitude]);
    (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(createCircle(longitude, latitude, radiusKm));
    if (firstSync.current) {
      firstSync.current = false;
      return;
    }
    map.fitBounds(circleBounds(longitude, latitude, radiusKm), { padding: 32, duration: 500 });
  }, [latitude, longitude, radiusKm]);

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
      setLocationError(t('serviceAreaPicker.locationUnavailable'));
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
        setLocationError(t('serviceAreaPicker.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const coordsText = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return (
    <div className="sa-picker">
      {MAPBOX_TOKEN && (
        <div className="sa-picker-toolbar">
          <PlaceSearch
            proximity={{ lat: latitude, lng: longitude }}
            language={i18n.language}
            onPick={(result) => onChange({ lat: roundCoordinate(result.lat), lng: roundCoordinate(result.lng) })}
          />
          <button type="button" className="sa-picker-locate" onClick={locateMe} disabled={locating}>
            {locating ? t('serviceAreaPicker.locating') : t('serviceAreaPicker.useMyLocation')}
          </button>
        </div>
      )}
      {locationError && (
        <div className="sa-picker-error" role="alert">
          {locationError}
        </div>
      )}

      {MAPBOX_TOKEN ? (
        <div ref={containerRef} className="sa-picker-map" aria-label={t('serviceAreaPicker.mapLabel')} />
      ) : (
        <div className="map-placeholder map-token-missing sa-picker-map--empty">{t('serviceAreaPicker.mapTokenMissing')}</div>
      )}

      <div className="sa-picker-readout" aria-live="polite">
        <span className="sa-picker-coords">{coordsText}</span>
        {placeLabel && <span className="sa-picker-place"> · {placeLabel}</span>}
      </div>
      {MAPBOX_TOKEN && <div className="hint">{t('serviceAreaPicker.clickToPlace')}</div>}

      <div className="sa-picker-radius" role="radiogroup" aria-label={t('serviceAreaPicker.radiusLabel')}>
        {RADIUS_OPTIONS.map((km) => (
          <button
            key={km}
            type="button"
            role="radio"
            aria-checked={radiusKm === km}
            className={`sa-picker-chip${radiusKm === km ? ' is-active' : ''}`}
            onClick={() => onRadiusChange(km)}
          >
            {t('serviceAreaPicker.radiusOption', { km })}
          </button>
        ))}
      </div>

      <details className="sa-picker-manual" open={!MAPBOX_TOKEN}>
        <summary>{t('serviceAreaPicker.manualCoords')}</summary>
        <div className="sa-picker-manual-row">
          <CoordinateInput
            id={`${baseId}-lat`}
            axis="lat"
            label={t('serviceAreaPicker.latitude')}
            value={latitude}
            onCommit={(lat) => onChange({ lat, lng: longitude })}
          />
          <CoordinateInput
            id={`${baseId}-lng`}
            axis="lng"
            label={t('serviceAreaPicker.longitude')}
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
    <label htmlFor={id} className="sa-picker-coord">
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
    <div className="sa-picker-search">
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={t('serviceAreaPicker.searchLabel')}
        placeholder={t('serviceAreaPicker.searchPlaceholder')}
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
        <ul id={listId} role="listbox" className="sa-picker-results">
          {results.length === 0 ? (
            <li className="sa-picker-empty">{t('serviceAreaPicker.noResults')}</li>
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
