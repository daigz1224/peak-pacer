import type { GpxPoint, GpxWaypoint, Segment } from '../types';
import { haversineDistance, computeSegmentStats, computeEquivalentFlatKm } from './geo';

interface CpAnchor {
  name: string;
  trackIndex: number;
}

/** Find the track point index closest to a given waypoint */
function projectToTrack(wpt: GpxWaypoint, trackPoints: GpxPoint[]): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < trackPoints.length; i++) {
    const d = haversineDistance(wpt, trackPoints[i]);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

/** Check if a waypoint name indicates the finish line */
function isFinishWaypoint(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('终点') ||
    lower.includes('finish') ||
    lower.includes('end')
  );
}

/** Generate auto CP anchors every N km along the track */
function generateAutoKmAnchors(trackPoints: GpxPoint[], intervalKm: number): CpAnchor[] {
  const anchors: CpAnchor[] = [];
  let cumDist = 0;
  let nextKm = intervalKm;

  for (let i = 1; i < trackPoints.length; i++) {
    cumDist += haversineDistance(trackPoints[i - 1], trackPoints[i]) / 1000;
    if (cumDist >= nextKm) {
      anchors.push({ name: `${nextKm}km`, trackIndex: i });
      nextKm += intervalKm;
    }
  }

  return anchors;
}

/**
 * Split a track into segments using waypoints as checkpoints.
 * Handles loop routes where start ≈ finish.
 * Falls back to auto-generated 10km CPs when no waypoints exist.
 */
export function computeSegments(
  trackPoints: GpxPoint[],
  waypoints: GpxWaypoint[],
): Segment[] {
  if (trackPoints.length < 2) return [];

  // Build CP anchors
  const anchors: CpAnchor[] = [
    { name: '起点', trackIndex: 0 },
  ];

  for (const wpt of waypoints) {
    if (isFinishWaypoint(wpt.name)) {
      // Force finish to last track point
      anchors.push({ name: wpt.name, trackIndex: trackPoints.length - 1 });
    } else {
      const idx = projectToTrack(wpt, trackPoints);
      anchors.push({ name: wpt.name, trackIndex: idx });
    }
  }

  // If no finish waypoint was found, add one at the end
  const hasFinish = waypoints.some((w) => isFinishWaypoint(w.name));
  if (!hasFinish) {
    anchors.push({ name: '终点', trackIndex: trackPoints.length - 1 });
  }

  // If no intermediate waypoints, auto-generate CPs every 10km
  const hasIntermediateCps = anchors.length > 2; // more than just start + finish
  if (!hasIntermediateCps) {
    const autoCps = generateAutoKmAnchors(trackPoints, 10);
    anchors.splice(1, 0, ...autoCps); // insert between start and finish
  }

  // Sort by track index (preserve order along track)
  anchors.sort((a, b) => a.trackIndex - b.trackIndex);

  // Remove duplicates (same trackIndex)
  const uniqueAnchors: CpAnchor[] = [anchors[0]];
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].trackIndex !== anchors[i - 1].trackIndex) {
      uniqueAnchors.push(anchors[i]);
    }
  }

  // Build segments between consecutive CPs
  let cumulativeDist = 0;
  const segments: Segment[] = [];

  for (let i = 0; i < uniqueAnchors.length - 1; i++) {
    const startIdx = uniqueAnchors[i].trackIndex;
    const endIdx = uniqueAnchors[i + 1].trackIndex;
    const slice = trackPoints.slice(startIdx, endIdx + 1);
    const stats = computeSegmentStats(slice);
    const eqFlat = computeEquivalentFlatKm(slice);

    cumulativeDist += stats.distance;

    segments.push({
      startCp: uniqueAnchors[i].name,
      endCp: uniqueAnchors[i + 1].name,
      distance: stats.distance,
      elevationGain: stats.elevationGain,
      elevationLoss: stats.elevationLoss,
      equivalentFlatKm: eqFlat,
      cumulativeDistance: cumulativeDist,
      trackPoints: slice,
    });
  }

  return segments;
}
