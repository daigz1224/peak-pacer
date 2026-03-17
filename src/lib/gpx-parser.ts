import { XMLParser } from 'fast-xml-parser';
import type { ParsedGpx, GpxPoint, GpxWaypoint } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export function parseGpx(xmlString: string): ParsedGpx {
  const parsed = parser.parse(xmlString);
  const gpx = parsed.gpx;

  // Track name
  const trk = gpx.trk;
  const name = trk?.name || 'Unknown Route';

  // Waypoints
  const rawWpts = gpx.wpt ? (Array.isArray(gpx.wpt) ? gpx.wpt : [gpx.wpt]) : [];
  const waypoints: GpxWaypoint[] = rawWpts.map((w: Record<string, unknown>) => ({
    lat: parseFloat(w['@_lat'] as string),
    lon: parseFloat(w['@_lon'] as string),
    ele: parseFloat((w.ele as string) || '0'),
    name: (w.name as string) || 'CP',
  }));

  // Track points
  const segs = trk?.trkseg;
  const rawSeg = Array.isArray(segs) ? segs[0] : segs;
  const rawPts = rawSeg?.trkpt || [];
  const pts = Array.isArray(rawPts) ? rawPts : [rawPts];

  const trackPoints: GpxPoint[] = pts.map((p: Record<string, unknown>) => ({
    lat: parseFloat(p['@_lat'] as string),
    lon: parseFloat(p['@_lon'] as string),
    ele: parseFloat((p.ele as string) || '0'),
  }));

  return { name, waypoints, trackPoints };
}
