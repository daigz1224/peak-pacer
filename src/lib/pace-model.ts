import type { Segment, RunnerProfile, CpSplit } from '../types';

/** Compute trail factor from iTRA points */
function trailFactor(itraPoints: number): number {
  // iTRA 200 → 1.07 (trail newbie, 7% slower than model)
  // iTRA 450 → 1.04 (mid-level)
  // iTRA 531 → 1.02 (solid trail runner)
  // iTRA 800 → 0.99 (elite, slightly faster due to technical efficiency)
  return 1.10 - itraPoints / 7000;
}

/**
 * Ultra fatigue factor: beyond marathon distance, pace degrades linearly.
 * Uses segment midpoint distance to estimate fatigue.
 *   42km → 1.0, 60km → 1.18, 80km → 1.38, 92km → 1.50
 */
function fatigueFactor(seg: Segment): number {
  const midpoint = seg.cumulativeDistance - seg.distance / 2;
  return 1 + Math.max(0, midpoint - 42.195) * 0.025;
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
