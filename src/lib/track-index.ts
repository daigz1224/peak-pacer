import type { GpxPoint } from '../types';
import { haversineDistance, cumulativeDistances } from './geo';

export interface TrackIndex {
  points: { lat: number; lon: number }[];
  cumDists: number[]; // km
}

/** Build a sampled track index (~1000 points) with cumulative distances */
export function buildTrackIndex(trackPoints: GpxPoint[]): TrackIndex {
  const fullCumDists = cumulativeDistances(trackPoints);
  const step = Math.max(1, Math.floor(trackPoints.length / 1000));
  const points: { lat: number; lon: number }[] = [];
  const cumDists: number[] = [];

  for (let i = 0; i < trackPoints.length; i += step) {
    points.push({ lat: trackPoints[i].lat, lon: trackPoints[i].lon });
    cumDists.push(fullCumDists[i]);
  }

  const last = trackPoints.length - 1;
  if (last % step !== 0) {
    points.push({ lat: trackPoints[last].lat, lon: trackPoints[last].lon });
    cumDists.push(fullCumDists[last]);
  }

  return { points, cumDists };
}

/** Binary search + linear interpolation: distance (km) → lat/lon */
export function distanceToLatLng(
  distance: number,
  index: TrackIndex,
): { lat: number; lon: number } | null {
  const { points, cumDists } = index;
  if (points.length === 0) return null;

  if (distance <= cumDists[0]) return points[0];
  if (distance >= cumDists[cumDists.length - 1]) return points[points.length - 1];

  // Binary search for the bracketing interval
  let lo = 0;
  let hi = cumDists.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumDists[mid] <= distance) lo = mid;
    else hi = mid;
  }

  const d0 = cumDists[lo];
  const d1 = cumDists[hi];
  const t = d1 > d0 ? (distance - d0) / (d1 - d0) : 0;

  return {
    lat: points[lo].lat + t * (points[hi].lat - points[lo].lat),
    lon: points[lo].lon + t * (points[hi].lon - points[lo].lon),
  };
}

/** Nearest-point brute force: lat/lon → distance (km) along track */
export function latLngToDistance(
  lat: number,
  lon: number,
  index: TrackIndex,
): number {
  const { points, cumDists } = index;
  if (points.length === 0) return 0;

  const target = { lat, lon, ele: 0 } as GpxPoint;
  let minDist = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < points.length; i++) {
    const d = haversineDistance(target, { ...points[i], ele: 0 } as GpxPoint);
    if (d < minDist) {
      minDist = d;
      bestIdx = i;
    }
  }

  return cumDists[bestIdx];
}
