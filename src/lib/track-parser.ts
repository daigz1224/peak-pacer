import type { ParsedGpx } from '../types';
import { parseGpx } from './gpx-parser';
import { parseKml } from './kml-parser';
import { parseTcx } from './tcx-parser';

export type TrackFormat = 'gpx' | 'kml' | 'tcx';

const EXT_MAP: Record<string, TrackFormat> = {
  '.gpx': 'gpx',
  '.kml': 'kml',
  '.tcx': 'tcx',
};

/**
 * Detect track file format from file name extension,
 * falling back to XML content sniffing.
 */
export function detectFormat(fileName: string, content?: string): TrackFormat {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (EXT_MAP[ext]) return EXT_MAP[ext];

  // Content sniffing: check XML root element
  if (content) {
    const head = content.slice(0, 500).toLowerCase();
    if (head.includes('<gpx')) return 'gpx';
    if (head.includes('<kml')) return 'kml';
    if (head.includes('<trainingcenterdatabase')) return 'tcx';
  }

  // Default to GPX if we can't determine
  return 'gpx';
}

/**
 * Parse a track file string into the unified ParsedGpx structure.
 */
export function parseTrackFile(content: string, format: TrackFormat): ParsedGpx {
  switch (format) {
    case 'gpx':
      return parseGpx(content);
    case 'kml':
      return parseKml(content);
    case 'tcx':
      return parseTcx(content);
  }
}

/** All supported file extensions for the upload input (include uppercase for Windows) */
export const SUPPORTED_EXTENSIONS = Object.keys(EXT_MAP)
  .flatMap((e) => [e, e.toUpperCase()])
  .join(',');
