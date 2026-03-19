import { XMLParser } from 'fast-xml-parser';
import type { ParsedGpx, GpxPoint, GpxWaypoint } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

/**
 * Parse coordinates string from KML.
 * KML format: "lon,lat,ele lon,lat,ele ..." (lon comes first!)
 * Tuples separated by whitespace/newlines.
 */
function parseCoordinates(coordStr: string): GpxPoint[] {
  return coordStr
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .map((tuple) => {
      const parts = tuple.split(',');
      return {
        lon: parseFloat(parts[0]) || 0,
        lat: parseFloat(parts[1]) || 0,
        ele: parseFloat(parts[2]) || 0,
      };
    })
    .filter((p) => p.lat !== 0 || p.lon !== 0);
}

function asArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlacemarks(node: any): any[] {
  const result = asArray(node?.Placemark);

  // Recurse into Folder / Document children
  for (const folder of asArray(node?.Folder)) {
    result.push(...extractPlacemarks(folder));
  }
  for (const doc of asArray(node?.Document)) {
    result.push(...extractPlacemarks(doc));
  }
  return result;
}

export function parseKml(xmlString: string): ParsedGpx {
  const parsed = parser.parse(xmlString);
  const kml = parsed.kml || parsed.Kml;
  const doc = kml?.Document || kml;

  // Name
  const name = doc?.name || kml?.Document?.name || 'Unknown Route';

  // Collect all Placemarks (may be nested inside Folder)
  const placemarks = extractPlacemarks(doc);

  const trackPoints: GpxPoint[] = [];
  const waypoints: GpxWaypoint[] = [];

  for (const pm of placemarks) {
    // LineString → track points
    const lineStrings = [
      ...asArray(pm?.LineString),
      ...asArray(pm?.MultiGeometry?.LineString),
    ];
    for (const ls of lineStrings) {
      if (ls?.coordinates) {
        trackPoints.push(...parseCoordinates(ls.coordinates));
      }
    }

    // MultiTrack / Track (gx:Track or Track) → track points
    const tracks = [
      ...asArray(pm?.['gx:MultiTrack']?.['gx:Track']),
      ...asArray(pm?.['gx:Track']),
    ];
    for (const track of tracks) {
      const coords = asArray(track?.['gx:coord']);
      for (const coord of coords) {
        const parts = String(coord).trim().split(/\s+/);
        if (parts.length >= 2) {
          trackPoints.push({
            lon: parseFloat(parts[0]) || 0,
            lat: parseFloat(parts[1]) || 0,
            ele: parseFloat(parts[2]) || 0,
          });
        }
      }
    }

    // Point → waypoint
    const point = pm?.Point;
    if (point?.coordinates && !lineStrings.length) {
      const pts = parseCoordinates(point.coordinates);
      if (pts.length > 0) {
        waypoints.push({
          ...pts[0],
          name: pm?.name || 'CP',
        });
      }
    }
  }

  return { name, waypoints, trackPoints };
}
