import { XMLParser } from 'fast-xml-parser';
import type { ParsedGpx, GpxPoint } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function asArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export function parseTcx(xmlString: string): ParsedGpx {
  const parsed = parser.parse(xmlString);
  const db = parsed.TrainingCenterDatabase;
  const activities = asArray(db?.Activities?.Activity);
  const activity = activities[0];

  // Name: use Activity Id (typically an ISO date), or fall back
  const name = activity?.Id || 'Unknown Route';

  // Collect track points across all Laps
  const trackPoints: GpxPoint[] = [];
  const laps = asArray(activity?.Lap);

  for (const lap of laps) {
    const tracks = asArray(lap?.Track);
    for (const track of tracks) {
      const tps = asArray(track?.Trackpoint);
      for (const tp of tps) {
        const pos = tp?.Position;
        if (!pos) continue; // skip trackpoints without position data

        const lat = parseFloat(pos.LatitudeDegrees);
        const lon = parseFloat(pos.LongitudeDegrees);
        if (isNaN(lat) || isNaN(lon)) continue;

        const ele = parseFloat(tp.AltitudeMeters) || 0;
        trackPoints.push({ lat, lon, ele });
      }
    }
  }

  // Also check for Courses (some TCX files are route plans, not activities)
  if (trackPoints.length === 0) {
    const courses = asArray(db?.Courses?.Course);
    const course = courses[0];
    if (course) {
      const tracks = asArray(course?.Track);
      for (const track of tracks) {
        const tps = asArray(track?.Trackpoint);
        for (const tp of tps) {
          const pos = tp?.Position;
          if (!pos) continue;

          const lat = parseFloat(pos.LatitudeDegrees);
          const lon = parseFloat(pos.LongitudeDegrees);
          if (isNaN(lat) || isNaN(lon)) continue;

          const ele = parseFloat(tp.AltitudeMeters) || 0;
          trackPoints.push({ lat, lon, ele });
        }
      }
      // Prefer course name if available
      if (course.Name) {
        return { name: course.Name, waypoints: [], trackPoints };
      }
    }
  }

  // TCX has no waypoint concept — auto-CP will kick in downstream
  return { name, waypoints: [], trackPoints };
}
