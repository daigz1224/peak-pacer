import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseGpx } from '../gpx-parser';
import { computeSegments } from '../cp-splitter';
import { predictFinishTime } from '../pace-model';
import type { RunnerProfile } from '../../types';

/**
 * Calibration data from real race results.
 * Used to validate that the pace model produces reasonable predictions.
 *
 * To add a new data point:
 * 1. Place the GPX file in public/files/
 * 2. Add an entry below with the runner's profile and actual finish time
 */
interface CalibrationPoint {
  gpxFile: string;
  description: string;
  runner: RunnerProfile;
  actualMinutes: number; // real finish time in minutes
  tolerancePercent: number; // acceptable deviation (e.g. 15 = ±15%)
}

const CALIBRATION_DATA: CalibrationPoint[] = [
  {
    gpxFile: '2026-03-15 浙里昌硕大师之路40K.gpx',
    description: '昌硕40K 女子第三 (高技术性赛道)',
    runner: { marathonTime: 207, targetTime: null, itraPoints: 531 },
    actualMinutes: 371, // 6:11
    tolerancePercent: 10,
  },
  {
    gpxFile: '2025-12-21 杭州青芝坞30公里.gpx',
    description: '青芝坞30K (低技术性赛道)',
    runner: { marathonTime: 209, targetTime: null, itraPoints: 502 },
    actualMinutes: 285, // 4:45
    tolerancePercent: 20,
  },
];

function loadGpx(filename: string) {
  const filepath = path.resolve(__dirname, '../../../public/files', filename);
  const xml = fs.readFileSync(filepath, 'utf-8');
  return parseGpx(xml);
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

describe('Pace model calibration', () => {
  for (const point of CALIBRATION_DATA) {
    it(`${point.description}: predicted within ±${point.tolerancePercent}% of ${formatTime(point.actualMinutes)}`, () => {
      const gpx = loadGpx(point.gpxFile);
      const segments = computeSegments(gpx.trackPoints, gpx.waypoints);
      const predicted = predictFinishTime(segments, point.runner);

      const deviation = ((predicted - point.actualMinutes) / point.actualMinutes) * 100;
      const absDev = Math.abs(deviation);

      // Log details for debugging
      console.log(
        `  ${point.gpxFile}: actual=${formatTime(point.actualMinutes)}, predicted=${formatTime(predicted)}, deviation=${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`,
      );

      expect(absDev).toBeLessThan(point.tolerancePercent);
    });
  }
});
