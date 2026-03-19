import { forwardRef } from 'react';
import type { WeatherSummary, CpSplit, Climb } from '../types';
import { ElevationSilhouette } from './ElevationSilhouette';

interface Props {
  raceName: string;
  totalDistance: number;
  totalGain: number;
  totalLoss: number;
  predictedTime: number;
  cpCount: number;
  distanceProfile: { distance: number; elevation: number }[];
  weather: WeatherSummary | null;
  splits: CpSplit[];
  climbs: Climb[];
  itraPoints: number;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function formatPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}'${s.toString().padStart(2, '0')}"`;
}

export const ShareCard = forwardRef<HTMLDivElement, Props>(
  ({ raceName, totalDistance, totalGain, totalLoss, predictedTime, cpCount, distanceProfile, weather, splits, climbs, itraPoints }, ref) => {
    const itraEffort = Math.round(totalDistance + totalGain / 100);
    const minEle = Math.min(...distanceProfile.map(d => d.elevation));
    const maxEle = Math.max(...distanceProfile.map(d => d.elevation));
    const avgPace = totalDistance > 0 ? predictedTime / totalDistance : 0;

    const sortedByPace = [...splits].sort((a, b) => b.estimatedPace - a.estimatedPace);
    const hardestSeg = sortedByPace[0];
    const easiestSeg = sortedByPace[sortedByPace.length - 1];

    const biggestClimb = climbs.length > 0
      ? climbs.reduce((max, c) => c.gain > max.gain ? c : max, climbs[0])
      : null;

    const miniSplits = splits.length <= 5
      ? splits
      : [...splits.slice(0, 4), splits[splits.length - 1]];

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: 540,
          height: 960,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: 'linear-gradient(170deg, #ffffff 0%, #f1f5f9 50%, #ecfdf5 100%)',
          color: '#0f172a',
          padding: '32px 36px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <svg viewBox="0 0 28 20" style={{ width: 24, height: 17 }} fill="#059669">
            <path d="M2,20 L7,8 L9,12 L14,2 L19,12 L21,8 L26,20 Z" opacity="0.3" />
            <path d="M6,20 L10,10 L12,14 L14,6 L16,14 L18,10 L22,20 Z" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Peak Pacer</span>
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>山野有数</span>
        </div>

        {/* Race name */}
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3, marginBottom: 6, color: '#0f172a' }}>
          {raceName}
        </div>

        {/* Divider */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, #10b981 0%, transparent 100%)', marginBottom: 16 }} />

        {/* Primary stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <BigStat value={totalDistance.toFixed(1)} unit="km" label="总距离" />
          <BigStat value={`+${totalGain}`} unit="m" label="累计爬升" color="#059669" />
          <BigStat value={formatTime(predictedTime)} label="预计完赛" color="#ea580c" />
        </div>

        {/* Secondary stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <MiniStat label="下降" value={`-${totalLoss}m`} />
          <MiniStat label="ITRA 努力" value={`${itraEffort}`} />
          <MiniStat label="CP" value={`${cpCount} 个`} />
          <MiniStat label="均配" value={formatPace(avgPace)} />
          <MiniStat label="海拔" value={`${Math.round(minEle)}-${Math.round(maxEle)}m`} />
          <MiniStat label="ITRA" value={`${itraPoints}`} />
        </div>

        {/* Elevation profile */}
        <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', padding: '8px 0', border: '1px solid #e2e8f0' }}>
          <ElevationSilhouette data={distanceProfile} width={466} height={100} theme="light" />
        </div>

        {/* Splits table */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            分段配速
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', padding: '5px 10px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ flex: 2 }}>CP</span>
              <span style={{ flex: 1, textAlign: 'right' }}>距离</span>
              <span style={{ flex: 1, textAlign: 'right' }}>爬升</span>
              <span style={{ flex: 1, textAlign: 'right' }}>配速</span>
              <span style={{ flex: 1, textAlign: 'right' }}>到达</span>
            </div>
            {miniSplits.map((s, i) => {
              const isLast = i === miniSplits.length - 1 && splits.length > 5;
              const isHard = s.estimatedPace > 10;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    padding: '4px 10px',
                    fontSize: 11,
                    color: isHard ? '#ea580c' : '#334155',
                    borderBottom: i < miniSplits.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: isLast ? '#fff7ed' : i % 2 === 1 ? '#ffffff' : 'transparent',
                  }}
                >
                  <span style={{ flex: 2, fontWeight: 600 }}>
                    {isLast && splits.length > 5 ? '···  ' : ''}{s.cpName}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#64748b' }}>{s.cumulativeDistance.toFixed(1)}</span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#059669' }}>+{s.elevationGain}</span>
                  <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{formatPace(s.estimatedPace)}</span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#ea580c', fontWeight: 700 }}>{formatTime(s.cumulativeTime)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highlights */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {hardestSeg && (
            <HighlightCard
              icon="🔴"
              label="最难赛段"
              value={hardestSeg.cpName}
              detail={`${formatPace(hardestSeg.estimatedPace)} · +${hardestSeg.elevationGain}m`}
            />
          )}
          {easiestSeg && (
            <HighlightCard
              icon="🟢"
              label="最快赛段"
              value={easiestSeg.cpName}
              detail={`${formatPace(easiestSeg.estimatedPace)} · ${easiestSeg.segmentDistance.toFixed(1)}km`}
            />
          )}
          {biggestClimb && (
            <HighlightCard
              icon="⛰"
              label="最大爬升"
              value={`+${biggestClimb.gain}m`}
              detail={`${Math.round(biggestClimb.startEle)}→${Math.round(biggestClimb.peakEle)}m`}
            />
          )}
        </div>

        {/* Weather */}
        {weather && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <WeatherChip icon="🌡" value={`${Math.round(weather.avgTemp)}°C`} sub={`${Math.round(weather.minTemp)}~${Math.round(weather.maxTemp)}°`} />
            <WeatherChip icon="💧" value={`${Math.round(weather.precipProbability * 100)}%`} sub="降水" />
            <WeatherChip icon="💨" value={`${Math.round(weather.avgWindSpeed)}`} sub="km/h" />
            <WeatherChip icon="🌫" value={`${Math.round(weather.avgHumidity)}%`} sub="湿度" />
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#94a3b8' }}>
          <span>peakpacer.com</span>
          <span>{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>
    );
  },
);

/* ── Sub-components (light theme) ── */

function BigStat({ value, unit, label, color }: { value: string; unit?: string; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? '#0f172a', marginTop: 2, lineHeight: 1.2 }}>
        {value}
        {unit && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2, color: '#94a3b8' }}>{unit}</span>}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '4px 0' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{value}</div>
      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{label}</div>
    </div>
  );
}

function HighlightCard({ icon, label, value, detail }: { icon: string; label: string; value: string; detail: string }) {
  return (
    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '6px 8px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 9, color: '#94a3b8' }}>{icon} {label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{detail}</div>
    </div>
  );
}

function WeatherChip({ icon, value, sub }: { icon: string; value: string; sub: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', borderRadius: 6, padding: '4px 8px', border: '1px solid #e2e8f0' }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{value}</div>
        <div style={{ fontSize: 8, color: '#94a3b8' }}>{sub}</div>
      </div>
    </div>
  );
}
