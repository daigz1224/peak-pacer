import type { Segment, RunnerProfile, CpSplit, HistoricalRace, RaceStrategy, TimeRange } from '../types';
import { haversineDistance, smoothElevations, gradientEffortFactor } from './geo';

/**
 * Convert ITRA Performance Index to flat-trail base speed (m/s).
 *
 * Empirically calibrated against 4 real trail races (28-92km, 2100-5000m gain)
 * for ITRA-500 runners. An ITRA-1000 elite runs flat trail at ~4.8 m/s (3:28/km).
 * Speed scales linearly with PI.
 *
 * Examples: PI=500 → 2.40 m/s (6:56/km), PI=700 → 3.36 m/s (4:58/km),
 *           PI=900 → 4.32 m/s (3:51/km)
 */
function itraToBaseSpeed(itraPI: number): number {
  return (itraPI / 1000) * 4.8;
}

/**
 * Calibrate ITRA PI from historical race results.
 * For each race, reverse-engineer the implied ITRA PI:
 *   impliedPI = kmEffort / finishHours * 100
 * Returns median of all computed PIs, or null if no valid data.
 */
export function calibratedITRA(races: HistoricalRace[]): number | null {
  const pis: number[] = [];

  for (const race of races) {
    if (race.distance <= 0 || race.finishTime <= 0) continue;
    const kmEffort = race.distance + race.elevationGain / 100;
    const finishHours = race.finishTime / 60;
    const impliedPI = (kmEffort / finishHours) * 100;
    // Sanity check: PI should be in reasonable range (200 - 900)
    if (impliedPI >= 200 && impliedPI <= 900) {
      pis.push(impliedPI);
    }
  }

  if (pis.length === 0) return null;

  // Return median
  pis.sort((a, b) => a - b);
  const mid = Math.floor(pis.length / 2);
  return pis.length % 2 === 1
    ? pis[mid]
    : (pis[mid - 1] + pis[mid]) / 2;
}

/**
 * Compute strategy scaling factor based on race difficulty.
 *
 * Harder/longer races have wider spread because:
 * - Ultra fatigue is nonlinear → going faster is disproportionately harder
 * - More variables (GI, weather, navigation) increase variance
 * - Short races are more predictable
 *
 * The spread is also asymmetric for hard races: aggressive is closer to
 * moderate than conservative, reflecting the convex fatigue curve.
 *
 * Effort value = distance(km) + gain(m)/100 (same as ITRA effort)
 * Easy (effort ≤ 30):  aggressive 0.93, conservative 1.08
 * Medium (effort ~60):  aggressive 0.94, conservative 1.12
 * Hard (effort ≥ 120):  aggressive 0.95, conservative 1.18
 */
function strategyFactor(
  strategy: RaceStrategy,
  segments: Segment[],
): number {
  if (strategy === 'moderate') return 1.0;

  const totalDist = segments[segments.length - 1]?.cumulativeDistance ?? 0;
  const totalGain = segments.reduce((s, seg) => s + seg.elevationGain, 0);
  const effort = totalDist + totalGain / 100;

  // Difficulty ratio: 0 at effort=20, 1 at effort=120, clamped
  const difficulty = Math.max(0, Math.min(1, (effort - 20) / 100));

  if (strategy === 'aggressive') {
    // Aggressive spread: 7% (easy) → 5% (hard)
    // Short races allow more upside; ultras are capped by fatigue
    const spread = 0.07 - difficulty * 0.02;
    return 1 - spread;
  } else {
    // Conservative spread: 8% (easy) → 18% (hard), wider than aggressive
    const spread = 0.08 + difficulty * 0.10;
    return 1 + spread;
  }
}

/** Resolve the effective ITRA PI for a profile, clamped to 200-900 */
function resolveITRA(profile: RunnerProfile): number {
  let pi: number;
  if (profile.historicalRaces && profile.historicalRaces.length > 0) {
    const calibrated = calibratedITRA(profile.historicalRaces);
    pi = calibrated ?? profile.itraPoints;
  } else {
    pi = profile.itraPoints;
  }
  return Math.max(200, Math.min(900, pi));
}

/**
 * Ultra fatigue factor: beyond marathon distance, pace degrades progressively.
 * Uses segment midpoint distance. Calibrated against real ITRA-500 race data:
 * short races (<42km) have no fatigue, ultra races see significant slowdown.
 *   42km → 1.00, 50km → 1.14, 60km → 1.32, 80km → 1.72, 100km → 2.18
 */
function fatigueFactor(seg: Segment): number {
  const midpoint = seg.cumulativeDistance - seg.distance / 2;
  const x = Math.max(0, midpoint - 42.195);
  return 1 + x * 0.022 + x * x * 0.00018;
}

/**
 * Compute segment time bottom-up from track points.
 * ITRA base speed is applied to each micro-segment, adjusted by
 * gradient effort factor and ultra fatigue.
 *
 * This makes ITRA directly drive the pace at every point on the course,
 * rather than only controlling the total time envelope.
 */
function computeSegmentTime(seg: Segment, baseSpeedMs: number): number {
  const points = seg.trackPoints;
  if (points.length < 2) return 0;

  const eles = smoothElevations(points);
  let totalSec = 0;

  for (let i = 1; i < points.length; i++) {
    const horizDist = haversineDistance(points[i - 1], points[i]);
    if (horizDist < 0.1) continue;

    const gradient = (eles[i] - eles[i - 1]) / horizDist;
    const factor = gradientEffortFactor(gradient);
    totalSec += (horizDist * factor) / baseSpeedMs;
  }

  // Apply ultra fatigue (now affects total time, not just distribution)
  return (totalSec / 60) * fatigueFactor(seg);
}

/**
 * Compute pace splits for all segments.
 * Uses bottom-up ITRA-driven model: base speed × gradient × fatigue
 * produces each segment's time naturally. Target time override scales
 * all segments proportionally.
 */
export function computeSplits(
  segments: Segment[],
  profile: RunnerProfile,
): CpSplit[] {
  const effectivePI = resolveITRA(profile);
  const baseSpeed = itraToBaseSpeed(effectivePI);

  // Bottom-up: compute each segment's raw time
  const rawTimes = segments.map((seg) => computeSegmentTime(seg, baseSpeed));
  const rawTotal = rawTimes.reduce((a, b) => a + b, 0);

  // Scale to target time if provided, otherwise apply strategy factor
  const factor = strategyFactor(profile.strategy ?? 'moderate', segments);
  const targetTime = profile.targetTime ?? rawTotal * factor;
  const scale = targetTime / rawTotal;

  // Build splits
  let cumulativeTime = 0;
  return segments.map((seg, i) => {
    const segmentTime = rawTimes[i] * scale;
    cumulativeTime += segmentTime;

    return {
      cpName: seg.endCp,
      segmentDistance: seg.distance,
      cumulativeDistance: seg.cumulativeDistance,
      elevationGain: seg.elevationGain,
      elevationLoss: seg.elevationLoss,
      equivalentFlatKm: seg.equivalentFlatKm,
      estimatedPace: segmentTime / seg.distance,
      segmentTime,
      cumulativeTime,
    };
  });
}

/** Get predicted total time without target scaling */
export function predictFinishTime(
  segments: Segment[],
  profile: RunnerProfile,
): number {
  const effectivePI = resolveITRA(profile);
  const baseSpeed = itraToBaseSpeed(effectivePI);
  return segments.reduce(
    (sum, seg) => sum + computeSegmentTime(seg, baseSpeed),
    0,
  );
}

/**
 * Predict a time range (optimistic / target / conservative).
 * The spread is difficulty-aware and asymmetric (via strategyFactor).
 * With historical races, PI variance narrows the spread (up to 50% tighter).
 */
export function predictTimeRange(
  segments: Segment[],
  profile: RunnerProfile,
): TimeRange {
  const rawTotal = predictFinishTime(segments, profile);

  // Compute spread from historical race PI variance
  const races = profile.historicalRaces ?? [];
  const validPIs: number[] = [];
  for (const race of races) {
    if (race.distance <= 0 || race.finishTime <= 0) continue;
    const kmEffort = race.distance + race.elevationGain / 100;
    const finishHours = race.finishTime / 60;
    const impliedPI = (kmEffort / finishHours) * 100;
    if (impliedPI >= 200 && impliedPI <= 900) validPIs.push(impliedPI);
  }

  // Compute difficulty-aware, asymmetric spread
  const aggressiveFactor = strategyFactor('aggressive', segments);
  const conservativeFactor = strategyFactor('conservative', segments);

  // Historical data narrows the spread (lerp toward tighter bounds)
  let dataConfidence: number; // 0 = no data, 1 = high confidence
  if (validPIs.length >= 2) {
    const mean = validPIs.reduce((a, b) => a + b, 0) / validPIs.length;
    const variance = validPIs.reduce((s, v) => s + (v - mean) ** 2, 0) / validPIs.length;
    const cv = Math.sqrt(variance) / mean;
    // Low CV → high confidence; CV of 0.15+ → low confidence
    dataConfidence = Math.max(0, Math.min(1, 1 - cv / 0.15));
  } else if (validPIs.length === 1) {
    dataConfidence = 0.4;
  } else {
    dataConfidence = 0;
  }

  // Narrow the spread with data confidence (up to 50% tighter)
  const narrowing = 1 - dataConfidence * 0.5;
  const optSpread = (1 - aggressiveFactor) * narrowing;
  const consSpread = (conservativeFactor - 1) * narrowing;

  return {
    optimistic: rawTotal * (1 - optSpread),
    target: rawTotal,
    conservative: rawTotal * (1 + consSpread),
  };
}
