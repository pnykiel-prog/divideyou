import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  id: string;
  name: string;
  city?: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
  to?: string;
}

// Teardrop pin as a divIcon (no external image assets → bundler-safe).
const PIN = (color: string) =>
  L.divIcon({
    className: 'dy-pin',
    html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.4 13 21 13 21s13-11.6 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
      <circle cx="13" cy="13" r="5" fill="#fff"/></svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });

export default function LocationsMap({
  points,
  height = 320,
  className,
  style,
}: {
  points: MapPoint[];
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const nav = useNavigate();

  // init once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: false, zoomControl: true }).setView([52.1, 19.4], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // container may size after mount
    setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  // update markers when points change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const icon = PIN('#0E3A33');
    const valid = points.filter(
      (p): p is MapPoint & { lat: number; lng: number } => typeof p.lat === 'number' && typeof p.lng === 'number',
    );
    valid.forEach((p) => {
      const m = L.marker([p.lat, p.lng], { icon }).addTo(layer);
      m.bindTooltip(`<b>${escapeHtml(p.name)}</b>${p.city ? `<br>${escapeHtml(p.city)}` : ''}`, { direction: 'top', offset: [0, -28] });
      if (p.to) m.on('click', () => nav(p.to!));
    });
    if (valid.length) {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 13 });
    }
    setTimeout(() => map.invalidateSize(), 0);
  }, [points, nav]);

  return <div ref={elRef} className={className} style={{ height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', zIndex: 0, ...style }} />;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
