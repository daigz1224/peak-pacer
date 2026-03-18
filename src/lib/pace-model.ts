import type { Segment, RunnerProfile, CpSplit, HistoricalRace } from '../types';

/** Compute trail factor from iTRA points.
 * Higher iTRA = more efficient on technical terrain = lower multiplier.
 *   iTRA 200 → 1.14 (trail newbie, 9% slower vs PI 531)
 *   iTRA 450 → 1.07 (mid-level, 2% slower)
 *   iTRA 531 → 1.05 (solid trail runner, baseline)
 *   iTRA 700 → 1.00 (strong, 5% faster)
 *   iTRA 900 → 0.94 (elite, 10% faster)
 */
function trailFactor(itraPoints: number): number {
  return 1.20 - itraPoints / 3500;
}

/**
 * Estimate equivalent flat km from distance and elevation gain.
 * Simplified version of the full point-by-point computation in geo.ts,
 * used when we only have summary stats (no GPX track points).
 * Rule of thumb: every 100m climb ≈ 1km flat equivalent.
 */
function estimateEqFlatKm(distance: number, elevationGain: number): number {
  return distance + elevationGain * 0.01;
}

/**
 * Average fatigue factor over a race distance.
 * Integrates the fatigue curve from 0 to totalDistance.
 * Beyond 42.195km: fatigue = 1 + 0.02x + 0.0003x² where x = dist - 42.195
 */
function avgFatigueFactor(totalDistance: number): number {
  if (totalDistance <= 42.195) return 1.0;
  // Numerical integration over 1km steps
  const steps = Math.ceil(totalDistance);
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const mid = i + 0.5;
    const x = Math.max(0, mid - 42.195);
    sum += 1 + x * 0.02 + x * x * 0.0003;
  }
  return sum / steps;
}

/**
 * Calibrate trail factor from historical race results.
 * For each race, reverse-engineer the trail factor:
 *   factor = actualPace / basePace / avgFatigue
 * Returns median of all computed factors, or null if no valid data.
 */
export function calibratedTrailFactor(
  races: HistoricalRace[],
  marathonTime: number,
): number | null {
  const basePace = marathonTime / 42.195;
  const factors: number[] = [];

  for (const race of races) {
    if (race.distance <= 0 || race.finishTime <= 0) continue;
    const eqFlat = estimateEqFlatKm(race.distance, race.elevationGain);
    const actualPace = race.finishTime / eqFlat;
    const fatigue = avgFatigueFactor(race.distance);
    const factor = actualPace / basePace / fatigue;
    // Sanity check: factor should be in reasonable range (0.7 - 1.8)
    if (factor >= 0.7 && factor <= 1.8) {
      factors.push(factor);
    }
  }

  if (factors.length === 0) return null;

  // Return median
  factors.sort((a, b) => a - b);
  const mid = Math.floor(factors.length / 2);
  return factors.length % 2 === 1
    ? factors[mid]
    : (factors[mid - 1] + factors[mid]) / 2;
}

/** Resolve the effective trail factor for a profile */
function resolveTrailFactor(profile: RunnerProfile): number {
  if (profile.historicalRaces && profile.historicalRaces.length > 0) {
    const calibrated = calibratedTrailFactor(
      profile.historicalRaces,
      profile.marathonTime,
    );
    if (calibrated !== null) return calibrated;
  }
  return trailFactor(profile.itraPoints);
}

/**
 * Ultra fatigue factor: beyond marathon distance, pace degrades progressively.
 * Uses segment midpoint distance. Quadratic term makes fatigue accelerate
 * at longer distances, matching real-world ultra performance data.
 *   42km → 1.00, 50km → 1.05, 60km → 1.15, 80km → 1.43, 100km → 1.82
 */
function fatigueFactor(seg: Segment): number {
  const midpoint = seg.cumulativeDistance - seg.distance / 2;
  const x = Math.max(0, midpoint - 42.195);
  return 1 + x * 0.02 + x * x * 0.0003;
}

/**
 * Compute pace splits for all segments.
 * Uses gradient-weighted equivalent flat distance (pre-computed per segment).
 * If profile.targetTime is null, the predicted time from the model is used.
 */
export function computeSplits(
  segments: Segment[],
  profile: RunnerProfile,
): CpSplit[] {
  const basePace = profile.marathonTime / 42.195; // min/km
  const factor = resolveTrailFactor(profile);

  // First pass: compute raw segment times (with ultra fatigue)
  const rawTimes = segments.map(
    (seg) => seg.equivalentFlatKm * basePace * factor * fatigueFactor(seg),
  );

  const predictedTotal = rawTimes.reduce((a, b) => a + b, 0);

  // Scale to target time if provided
  const targetTime = profile.targetTime ?? predictedTotal;
  const scale = targetTime / predictedTotal;

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
  const basePace = profile.marathonTime / 42.195;
  const factor = resolveTrailFactor(profile);
  return segments.reduce(
    (total, seg) => total + seg.equivalentFlatKm * basePace * factor * fatigueFactor(seg),
    0,
  );
}
