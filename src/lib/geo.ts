import type { GpxPoint, Climb } from '../types';

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
 * Calibrated against real trail race data (ITRA PI-500 runners).
 *   flat (0%) → 1.0, uphill 5% → 1.22, 10% → 1.50, 20% → 2.24, 30% → 3.22
 *   downhill -5% → 0.90, -10% → 0.80, -20% → 1.20, -30% → 1.70
 */
export function gradientEffortFactor(gradient: number): number {
  if (gradient >= 0) {
    // Uphill: linear + quadratic, calibrated to match real race data
    // Lighter than naive gain/100 model for moderate slopes
    return 1 + gradient * 4 + gradient * gradient * 6;
  }
  const g = Math.abs(gradient);
  if (g < 0.15) {
    // Gentle downhill: faster than flat (up to 20% bonus at -10%)
    return 1 - g * 2; // -5% → 0.90, -10% → 0.80, -15% → 0.70
  }
  // Steep downhill: braking penalty kicks in
  return 0.70 + (g - 0.15) * 5; // -20% → 0.95, -25% → 1.20, -30% → 1.45
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

/**
 * Detect major climbs from the elevation profile.
 * A climb is a sustained uphill section with total gain ≥ threshold.
 * Small dips (≤ dipTolerance) within an uphill are tolerated as noise.
 */
export function detectClimbs(
  data: { distance: number; elevation: number }[],
  threshold = 100,
  dipTolerance = 15,
): Climb[] {
  if (data.length < 2) return [];

  const climbs: Climb[] = [];
  let lowestEle = data[0].elevation;
  let lowestIdx = 0;
  let peakEle = data[0].elevation;
  let inClimb = false;
  let dropFromPeak = 0;

  for (let i = 1; i < data.length; i++) {
    const ele = data[i].elevation;

    if (!inClimb) {
      if (ele > lowestEle + dipTolerance) {
        inClimb = true;
        peakEle = ele;
        dropFromPeak = 0;
      } else if (ele < lowestEle) {
        lowestEle = ele;
        lowestIdx = i;
      }
    } else {
      if (ele > peakEle) {
        peakEle = ele;
        dropFromPeak = 0;
      } else {
        dropFromPeak = peakEle - ele;
      }

      // End climb when we've dropped significantly from peak
      if (dropFromPeak > dipTolerance) {
        const startIdx = refineClimbStart(data, lowestIdx, peakEle);
        const gain = peakEle - data[startIdx].elevation;
        if (gain >= threshold) {
          let peakIdx = i;
          for (let j = startIdx; j <= i; j++) {
            if (data[j].elevation === peakEle) { peakIdx = j; break; }
          }
          climbs.push({
            startDist: data[startIdx].distance,
            endDist: data[peakIdx].distance,
            startEle: data[startIdx].elevation,
            peakEle,
            gain: Math.round(gain),
          });
        }
        inClimb = false;
        lowestEle = ele;
        lowestIdx = i;
      }
    }
  }

  // Handle climb that extends to end of data
  if (inClimb) {
    const startIdx = refineClimbStart(data, lowestIdx, peakEle);
    const gain = peakEle - data[startIdx].elevation;
    if (gain >= threshold) {
      let peakIdx = data.length - 1;
      for (let j = startIdx; j < data.length; j++) {
        if (data[j].elevation === peakEle) { peakIdx = j; break; }
      }
      climbs.push({
        startDist: data[startIdx].distance,
        endDist: data[peakIdx].distance,
        startEle: data[startIdx].elevation,
        peakEle,
        gain: Math.round(gain),
      });
    }
  }

  return mergeNearbyClimbs(climbs);
}

/**
 * Merge adjacent climbs when the gap between them is small.
 * Two climbs are merged when EITHER:
 * - The dip between them is ≤ 50% of the smaller climb's gain, OR
 * - The horizontal gap is < 1 km and the dip is ≤ the smaller gain
 * This treats closely-spaced uphills with minor dips as one continuous ascent.
 */
function mergeNearbyClimbs(climbs: Climb[]): Climb[] {
  if (climbs.length < 2) return climbs;

  const merged: Climb[] = [climbs[0]];
  for (let i = 1; i < climbs.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = climbs[i];
    const dipBetween = prev.peakEle - curr.startEle;
    const gapDist = curr.startDist - prev.endDist; // km between end and start
    const smallerGain = Math.min(prev.gain, curr.gain);

    const shouldMerge = dipBetween >= 0 && (
      dipBetween <= smallerGain * 0.5 ||
      (gapDist < 1 && dipBetween <= smallerGain)
    );

    if (shouldMerge) {
      const newPeakEle = Math.max(prev.peakEle, curr.peakEle);
      merged[merged.length - 1] = {
        startDist: prev.startDist,
        endDist: curr.endDist,
        startEle: prev.startEle,
        peakEle: newPeakEle,
        gain: Math.round(newPeakEle - prev.startEle),
      };
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

/**
 * Refine the climb start from the raw lowest-point index.
 * Walk forward from the lowest point to skip flat sections,
 * finding the last point still near the base elevation before
 * the sustained rise begins.
 */
function refineClimbStart(
  data: { distance: number; elevation: number }[],
  lowestIdx: number,
  peakEle: number,
): number {
  const baseEle = data[lowestIdx].elevation;
  const totalGain = peakEle - baseEle;
  // Allow skipping flat approach up to 10% of the total climb gain
  const flatMargin = Math.min(10, totalGain * 0.1);
  let refined = lowestIdx;
  for (let j = lowestIdx + 1; j < data.length; j++) {
    if (data[j].elevation <= baseEle + flatMargin) {
      refined = j;
    } else {
      break;
    }
  }
  return refined;
}

/** Compute total distance array (cumulative km at each point) */
export function cumulativeDistances(points: GpxPoint[]): number[] {
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    dists.push(dists[i - 1] + haversineDistance(points[i - 1], points[i]) / 1000);
  }
  return dists;
}
