import { useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GpxPoint } from '../types';

type TrackStyle = 'gradient' | 'solid';
const TRACK_STYLES: { key: TrackStyle; name: string }[] = [
  { key: 'gradient', name: '坡度' },
  { key: 'solid', name: '单色' },
];

const SOLID_COLOR = '#e63946';

const TILE_STYLES = [
  { name: '街道', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
  { name: '地形', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>' },
  { name: '卫星', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
] as const;

/** Re-fit map bounds when track changes */
function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useMemo(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

/** Reset view to fit bounds */
function ResetButton({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  const handleReset = useCallback(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return (
    <button
      type="button"
      onClick={handleReset}
      className="absolute top-2 right-2 z-[1000] bg-white border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 shadow-sm cursor-pointer"
      title="重置视图"
    >
      ⟲ 重置
    </button>
  );
}

interface CpMarker {
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  trackPoints: GpxPoint[];
  cpMarkers: CpMarker[];
}

// Circle dot + label as a single divIcon
function makeCpIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.4)"></div>
      <span class="cp-label">${label}</span>
    </div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

/** Map gradient (%) to a color: uphill → red, downhill → blue, flat → gray */
function gradientColor(gradient: number): string {
  // Clamp to ±30% for color mapping
  const clamped = Math.max(-30, Math.min(30, gradient));
  const intensity = Math.abs(clamped) / 30; // 0..1
  if (clamped > 0.5) {
    // Uphill: light orange → deep red
    const r = 220 + Math.round(35 * intensity);
    const g = Math.round(160 * (1 - intensity));
    const b = Math.round(60 * (1 - intensity));
    return `rgb(${r},${g},${b})`;
  } else if (clamped < -0.5) {
    // Downhill: light teal → deep blue
    const r = Math.round(80 * (1 - intensity));
    const g = Math.round(180 * (1 - intensity));
    const b = 180 + Math.round(75 * intensity);
    return `rgb(${r},${g},${b})`;
  }
  return '#888'; // flat
}

interface SampledPoint {
  lat: number;
  lon: number;
  ele: number;
}

export function RouteMap({ trackPoints, cpMarkers }: Props) {
  const [tileIdx, setTileIdx] = useState(0);
  const [trackStyle, setTrackStyle] = useState<TrackStyle>('gradient');

  // Sample track for performance (max 1000 points), keeping elevation
  const sampled = useMemo(() => {
    const step = Math.max(1, Math.floor(trackPoints.length / 1000));
    const pts: SampledPoint[] = [];
    for (let i = 0; i < trackPoints.length; i += step) {
      const p = trackPoints[i];
      pts.push({ lat: p.lat, lon: p.lon, ele: p.ele });
    }
    const last = trackPoints[trackPoints.length - 1];
    const end = pts[pts.length - 1];
    if (end.lat !== last.lat || end.lon !== last.lon) {
      pts.push({ lat: last.lat, lon: last.lon, ele: last.ele });
    }
    return pts;
  }, [trackPoints]);

  // Build colored segments from elevation gradient
  const segments = useMemo(() => {
    if (sampled.length < 2) return [];
    const segs: { positions: [number, number][]; color: string }[] = [];
    for (let i = 0; i < sampled.length - 1; i++) {
      const a = sampled[i];
      const b = sampled[i + 1];
      // Approximate horizontal distance in meters (quick estimate)
      const dlat = (b.lat - a.lat) * 111320;
      const dlon = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180);
      const hDist = Math.sqrt(dlat * dlat + dlon * dlon);
      const gradient = hDist > 1 ? ((b.ele - a.ele) / hDist) * 100 : 0;
      segs.push({
        positions: [[a.lat, a.lon], [b.lat, b.lon]],
        color: gradientColor(gradient),
      });
    }
    return segs;
  }, [sampled]);

  const bounds = useMemo(() => {
    if (sampled.length === 0) return undefined;
    return L.latLngBounds(sampled.map((p) => [p.lat, p.lon]));
  }, [sampled]);

  const icons = useMemo(() => {
    return cpMarkers.map((cp, i) => {
      const color = i === 0 ? '#22c55e' : i === cpMarkers.length - 1 ? '#ef4444' : '#f59e0b';
      return makeCpIcon(color, cp.name);
    });
  }, [cpMarkers]);

  if (sampled.length === 0 || !bounds) return null;

  const tile = TILE_STYLES[tileIdx];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          赛道地图
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {TRACK_STYLES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setTrackStyle(s.key)}
                className={`px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
                  s.key === trackStyle
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex gap-1">
            {TILE_STYLES.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setTileIdx(i)}
                className={`px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
                  i === tileIdx
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="relative rounded-lg overflow-hidden" style={{ height: 360 }}>
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [20, 20] }}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <FitBounds bounds={bounds} />
          <ResetButton bounds={bounds} />
          <TileLayer
            key={tile.name}
            attribution={tile.attr}
            url={tile.url}
          />
          {trackStyle === 'gradient' ? (
            segments.map((seg, i) => (
              <Polyline
                key={i}
                positions={seg.positions}
                pathOptions={{ color: seg.color, weight: 4, opacity: 0.9 }}
              />
            ))
          ) : (
            <Polyline
              positions={sampled.map((p) => [p.lat, p.lon] as [number, number])}
              pathOptions={{ color: SOLID_COLOR, weight: 4, opacity: 0.9 }}
            />
          )}
          {cpMarkers.map((cp, i) => (
            <Marker
              key={cp.name}
              position={[cp.lat, cp.lon]}
              icon={icons[i]}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
