import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseGpx } from '../gpx-parser';
import { computeSegments } from '../cp-splitter';
import { predictFinishTime } from '../pace-model';
import { computeEquivalentFlatKm } from '../geo';
import type { RunnerProfile } from '../../types';

/**
 * Alignment test: verify model predictions against known ITRA-500 finish times.
 */
interface AlignmentPoint {
  gpxFile: string;
  label: string;
  targetMinutes: number;
}

const ITRA_500: RunnerProfile = { targetTime: null, itraPoints: 500 };

const DATA: AlignmentPoint[] = [
  { gpxFile: '2024-04-13 徽州古城百公里.gpx', label: '徽州100K', targetMinutes: 20 * 60 },
  { gpxFile: '2025-03-09 黄岩九峰越野大师赛.gpx', label: '黄岩九峰', targetMinutes: 5 * 60 + 15 },
  { gpxFile: '2025-12-21 杭州青芝坞30公里.gpx', label: '青芝坞30K', targetMinutes: 4 * 60 + 45 },
  { gpxFile: '2026-03-15 浙里昌硕大师之路40K.gpx', label: '昌硕40K', targetMinutes: 6 * 60 + 30 },
];

function loadGpx(filename: string) {
  const filepath = path.resolve(__dirname, '../../../public/files', filename);
  return parseGpx(fs.readFileSync(filepath, 'utf-8'));
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

describe('ITRA 500 alignment', () => {
  const results: string[] = [];

  afterAll(() => {
    console.log('\n=== ITRA 500 Alignment Results ===');
    results.forEach((r) => console.log(r));
    console.log('=================================');
  });

  for (const pt of DATA) {
    it(`${pt.label}: ±15% of ${fmt(pt.targetMinutes)}`, () => {
      const gpx = loadGpx(pt.gpxFile);
      const segments = computeSegments(gpx.trackPoints, gpx.waypoints);
      const predicted = predictFinishTime(segments, ITRA_500);

      const dist = segments[segments.length - 1].cumulativeDistance;
      const gain = segments.reduce((s, seg) => s + seg.elevationGain, 0);
      const eqFlat = segments.reduce((s, seg) => s + seg.equivalentFlatKm, 0);
      const kmEffort = dist + gain / 100;
      const dev = ((predicted - pt.targetMinutes) / pt.targetMinutes) * 100;

      console.log(
        [
          pt.label.padEnd(10),
          `dist=${dist.toFixed(1)}km`,
          `gain=+${Math.round(gain)}m`,
          `kmEff=${kmEffort.toFixed(1)}`,
          `eqFlat=${eqFlat.toFixed(1)}`,
          `ratio=${(eqFlat / dist).toFixed(2)}`,
          `target=${fmt(pt.targetMinutes)}`,
          `pred=${fmt(predicted)}`,
          `dev=${dev > 0 ? '+' : ''}${dev.toFixed(1)}%`,
        ].join('  '),
      );

      results.push(
        `${pt.label.padEnd(10)} target=${fmt(pt.targetMinutes).padStart(5)}  pred=${fmt(predicted).padStart(5)}  dev=${(dev > 0 ? '+' : '') + dev.toFixed(1) + '%'}`,
      );
      expect(Math.abs(dev), `${pt.label}: pred=${fmt(predicted)} vs target=${fmt(pt.targetMinutes)}, dev=${dev.toFixed(1)}%`).toBeLessThan(15);
    });
  }
});
