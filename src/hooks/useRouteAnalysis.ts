import { useMemo } from 'react';
import type { ParsedGpx, RunnerProfile, Segment, CpSplit, Climb, TimeRange } from '../types';
import { computeSegments } from '../lib/cp-splitter';
import { computeSplits, predictFinishTime, predictTimeRange } from '../lib/pace-model';
import { cumulativeDistances, detectClimbs } from '../lib/geo';
import { buildTrackIndex, type TrackIndex } from '../lib/track-index';

export interface RouteAnalysis {
  segments: Segment[];
  splits: CpSplit[];
  predictedTime: number;
  timeRange: TimeRange;
  totalDistance: number;
  totalGain: number;
  totalLoss: number;
  distanceProfile: { distance: number; elevation: number }[];
  cpPositions: { distance: number; name: string }[];
  climbs: Climb[];
  cpMarkers: { name: string; lat: number; lon: number }[];
  trackIndex: TrackIndex;
}

export function useRouteAnalysis(
  gpx: ParsedGpx | null,
  profile: RunnerProfile,
): RouteAnalysis | null {
  return useMemo(() => {
    if (!gpx || gpx.trackPoints.length < 2) return null;

    const segments = computeSegments(gpx.trackPoints, gpx.waypoints);
    if (segments.length === 0) return null;

    const predictedTime = predictFinishTime(segments, profile);
    const timeRange = predictTimeRange(segments, profile);
    const splits = computeSplits(segments, profile);

    const totalDistance = segments[segments.length - 1].cumulativeDistance;
    const totalGain = segments.reduce((s, seg) => s + seg.elevationGain, 0);
    const totalLoss = segments.reduce((s, seg) => s + seg.elevationLoss, 0);

    // Elevation profile data (sampled for chart performance)
    const cumDists = cumulativeDistances(gpx.trackPoints);
    const step = Math.max(1, Math.floor(gpx.trackPoints.length / 500));
    const distanceProfile: { distance: number; elevation: number }[] = [];
    for (let i = 0; i < gpx.trackPoints.length; i += step) {
      distanceProfile.push({
        distance: Math.round(cumDists[i] * 100) / 100,
        elevation: Math.round(gpx.trackPoints[i].ele),
      });
    }
    // Always include last point
    const last = gpx.trackPoints.length - 1;
    if ((last % step) !== 0) {
      distanceProfile.push({
        distance: Math.round(cumDists[last] * 100) / 100,
        elevation: Math.round(gpx.trackPoints[last].ele),
      });
    }

    // Detect major climbs
    const climbs = detectClimbs(distanceProfile);

    // CP positions on the distance axis
    const cpPositions = segments.map((seg) => ({
      distance: seg.cumulativeDistance,
      name: seg.endCp,
    }));

    // CP markers with lat/lon for map
    const startPt = segments[0].trackPoints[0];
    const cpMarkers = [
      { name: segments[0].startCp, lat: startPt.lat, lon: startPt.lon },
      ...segments.map((seg) => {
        const lastPt = seg.trackPoints[seg.trackPoints.length - 1];
        return { name: seg.endCp, lat: lastPt.lat, lon: lastPt.lon };
      }),
    ];

    const trackIndex = buildTrackIndex(gpx.trackPoints);

    return {
      segments,
      splits,
      predictedTime,
      timeRange,
      totalDistance,
      totalGain,
      totalLoss,
      distanceProfile,
      cpPositions,
      climbs,
      cpMarkers,
      trackIndex,
    };
  }, [gpx, profile]);
}
