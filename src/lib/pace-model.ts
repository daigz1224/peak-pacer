import type { Segment, RunnerProfile, CpSplit } from '../types';

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
  const factor = trailFactor(profile.itraPoints);

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
  const factor = trailFactor(profile.itraPoints);
  return segments.reduce(
    (total, seg) => total + seg.equivalentFlatKm * basePace * factor * fatigueFactor(seg),
    0,
  );
}
