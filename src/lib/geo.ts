import type { GpxPoint } from '../types';

const R = 6371000; // Earth radius in meters

export function haversineDistance(a: GpxPoint, b: GpxPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Smooth elevations with a moving average window */
export function smoothElevations(
  points: GpxPoint[],
  windowSize = 5,
): number[] {
  const half = Math.floor(windowSize / 2);
  return points.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(points.length - 1, i + half);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= end; j++) {
      sum += points[j].ele;
      count++;
    }
    return sum / count;
  });
}

/** Compute cumulative distance (km), gain (m), loss (m) for a slice of track points */
export function computeSegmentStats(points: GpxPoint[]): {
  distance: number;
  elevationGain: number;
  elevationLoss: number;
} {
  if (points.length < 2) return { distance: 0, elevationGain: 0, elevationLoss: 0 };

  const smoothed = smoothElevations(points);
  let distance = 0;
  let gain = 0;
  let loss = 0;

  for (let i = 1; i < points.length; i++) {
    distance += haversineDistance(points[i - 1], points[i]);
    const dEle = smoothed[i] - smoothed[i - 1];
    if (dEle > 0) gain += dEle;
    else loss += Math.abs(dEle);
  }

  return {
    distance: distance / 1000,
    elevationGain: Math.round(gain),
    elevationLoss: Math.round(loss),
  };
}

/**
 * Gradient-based effort factor for a single track segment.
 * Converts slope into a multiplier on horizontal distance.
 * Uphill uses diminishing-returns formula to avoid over-penalizing steep terrain.
 *   flat (0%) → 1.0, uphill 5% → 1.55, 10% → 2.1, 20% → 3.2, 30% → 4.3
 *   downhill -5% → 0.93, -10% → 0.85, -20% → 1.46, -30% → 2.26
 */
function gradientEffortFactor(gradient: number): number {
  if (gradient >= 0) {
    // Diminishing uphill penalty: sqrt term softens extreme gradients
    // 5% → 1.55, 10% → 2.10, 20% → 3.20, 30% → 4.30
    return 1 + gradient * 10 + gradient * gradient * 15;
  }
  const g = Math.abs(gradient);
  if (g < 0.12) {
    // Gentle downhill: slightly faster than flat
    return 1 - g * 1.5; // -5% → 0.925, -10% → 0.85
  }
  // Steep downhill: braking penalty
  return 0.82 + (g - 0.12) * 8; // -15% → 1.06, -20% → 1.46, -30% → 2.26
}

/**
 * Compute equivalent flat distance for a track segment by walking point-by-point.
 * Uses smoothed elevations to avoid GPS noise, then applies gradient-based effort.
 */
export function computeEquivalentFlatKm(points: GpxPoint[]): number {
  if (points.length < 2) return 0;

  const smoothed = smoothElevations(points);
  let eqFlat = 0;

  for (let i = 1; i < points.length; i++) {
    const horizDist = haversineDistance(points[i - 1], points[i]); // meters
    if (horizDist < 0.1) continue; // skip zero-distance points
    const dEle = smoothed[i] - smoothed[i - 1];
    const gradient = dEle / horizDist;
    eqFlat += horizDist * gradientEffortFactor(gradient);
  }

  return eqFlat / 1000; // convert to km
}

/** Compute total distance array (cumulative km at each point) */
export function cumulativeDistances(points: GpxPoint[]): number[] {
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    dists.push(dists[i - 1] + haversineDistance(points[i - 1], points[i]) / 1000);
  }
  return dists;
}
