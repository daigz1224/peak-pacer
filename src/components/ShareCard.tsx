import { forwardRef } from 'react';
import type { WeatherSummary, CpSplit, Climb } from '../types';
import { ElevationSilhouette } from './ElevationSilhouette';
import { RouteMapCanvas } from './RouteMapCanvas';

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
  trackPoints: { lat: number; lon: number }[];
  cpMarkers: { name: string; lat: number; lon: number }[];
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
  (props, ref) => {
    const { raceName, totalDistance, totalGain, totalLoss, predictedTime, distanceProfile, weather, splits, climbs, itraPoints, trackPoints, cpMarkers } = props;

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

    const CARD_W = 720;
    const PAD_X = 36;
    const PAD_TOP = 32;
    const PAD_BOTTOM = 28;
    const CONTENT_W = CARD_W - PAD_X * 2;

    /* ── Shared sections ── */

    const headerEl = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <svg viewBox="0 0 28 20" style={{ width: 32, height: 23 }} fill="#059669">
          <path d="M2,20 L7,8 L9,12 L14,2 L19,12 L21,8 L26,20 Z" opacity="0.3" />
          <path d="M6,20 L10,10 L12,14 L14,6 L16,14 L18,10 L22,20 Z" />
        </svg>
        <span style={{ fontSize: 21, fontWeight: 700, color: '#0f172a' }}>Peak Pacer</span>
        <span style={{ fontSize: 15, color: '#94a3b8', marginLeft: 2 }}>山野有数</span>
      </div>
    );

    const raceNameEl = (fontSize: number) => (
      <div style={{ fontSize, fontWeight: 800, lineHeight: 1.35, marginBottom: 6, color: '#0f172a' }}>
        {raceName}
      </div>
    );

    const dividerEl = (
      <div style={{ height: 3, background: 'linear-gradient(90deg, #10b981 0%, #10b98140 70%, transparent 100%)', marginBottom: 18 }} />
    );

    const primaryStatsEl = (valueFontSize: number, unitFontSize: number) => (
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <BigStat value={totalDistance.toFixed(1)} unit="km" label="总距离" valueFontSize={valueFontSize} unitFontSize={unitFontSize} />
        <BigStat value={`+${totalGain}`} unit="m" label="累计爬升" color="#059669" valueFontSize={valueFontSize} unitFontSize={unitFontSize} />
        <BigStat value={formatTime(predictedTime)} label="预计完赛" color="#ea580c" valueFontSize={valueFontSize} unitFontSize={unitFontSize} />
      </div>
    );

    const miniStatsEl = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
        <MiniStat label="下降" value={`-${totalLoss}m`} />
        <MiniStat label="ITRA 努力" value={`${itraEffort}`} />
        <MiniStat label="CP" value={`${splits.length} 个`} />
        <MiniStat label="均配" value={formatPace(avgPace)} />
        <MiniStat label="海拔" value={`${Math.round(minEle)}-${Math.round(maxEle)}m`} />
        <MiniStat label="ITRA" value={`${itraPoints}`} />
      </div>
    );

    const highlightsEl = (valueFontSize: number) => (
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {hardestSeg && (
          <HighlightCard
            icon="🔴"
            label="最难赛段"
            value={hardestSeg.cpName}
            detail={`${formatPace(hardestSeg.estimatedPace)} · +${hardestSeg.elevationGain}m`}
            valueFontSize={valueFontSize}
          />
        )}
        {easiestSeg && (
          <HighlightCard
            icon="🟢"
            label="最快赛段"
            value={easiestSeg.cpName}
            detail={`${formatPace(easiestSeg.estimatedPace)} · ${easiestSeg.segmentDistance.toFixed(1)}km`}
            valueFontSize={valueFontSize}
          />
        )}
        {biggestClimb && (
          <HighlightCard
            icon="⛰"
            label="最大爬升"
            value={`+${biggestClimb.gain}m`}
            detail={`${Math.round(biggestClimb.startEle)}→${Math.round(biggestClimb.peakEle)}m`}
            valueFontSize={valueFontSize}
          />
        )}
      </div>
    );

    const weatherEl = weather && (
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <WeatherChip icon="🌡" value={`${Math.round(weather.avgTemp)}°C`} sub={`${Math.round(weather.minTemp)}~${Math.round(weather.maxTemp)}°`} />
        <WeatherChip icon="💧" value={`${Math.round(weather.precipProbability * 100)}%`} sub="降水" />
        <WeatherChip icon="💨" value={`${Math.round(weather.avgWindSpeed)}`} sub="km/h" />
        <WeatherChip icon="🌫" value={`${Math.round(weather.avgHumidity)}%`} sub="湿度" />
      </div>
    );

    const footerEl = (
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: '#b0b8c4', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5, marginBottom: 10 }}>
          "有时候，跑得不好是一种意外，但如果你确实跑出了一场精彩的比赛，那就是因为你有能力跑出这样的比赛。"
          <span style={{ fontStyle: 'normal', marginLeft: 4 }}>—— 杰克·丹尼尔斯</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#94a3b8' }}>
          <span>peak-pacer.top</span>
          <span>{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>
    );

    const splitsTableEl = (fontSize: number, headerFontSize: number, rowPadY: number) => (
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>
          分段配速
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', padding: `5px 14px`, fontSize: headerFontSize, color: '#94a3b8', textTransform: 'uppercase' as const, borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ flex: 2 }}>CP</span>
            <span style={{ flex: 1, textAlign: 'right' }}>累计</span>
            <span style={{ flex: 1, textAlign: 'right' }}>爬升</span>
            <span style={{ flex: 1, textAlign: 'right' }}>配速</span>
            <span style={{ flex: 1, textAlign: 'right' }}>到达</span>
          </div>
          {splits.map((s, i) => {
            const isHard = s.estimatedPace > 10;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  padding: `${rowPadY}px 14px`,
                  fontSize,
                  color: isHard ? '#ea580c' : '#334155',
                  borderBottom: i < splits.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: i % 2 === 1 ? '#ffffff' : 'transparent',
                }}
              >
                <span style={{ flex: 2, fontWeight: 600 }}>{s.cpName}</span>
                <span style={{ flex: 1, textAlign: 'right', color: '#64748b' }}>{s.cumulativeDistance.toFixed(1)}</span>
                <span style={{ flex: 1, textAlign: 'right', color: '#059669' }}>+{s.elevationGain}</span>
                <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{formatPace(s.estimatedPace)}</span>
                <span style={{ flex: 1, textAlign: 'right', color: '#ea580c', fontWeight: 700 }}>{formatTime(s.cumulativeTime)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );

    /* ── Outer container (shared) ── */
    const outerStyle: React.CSSProperties = {
      position: 'fixed',
      left: '-9999px',
      top: 0,
      width: CARD_W,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(170deg, #ffffff 0%, #f1f5f9 50%, #ecfdf5 100%)',
      color: '#0f172a',
      padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
      boxSizing: 'border-box',
    };

    return (
      <div ref={ref} style={outerStyle}>
        {headerEl}
        {raceNameEl(34)}
        {dividerEl}
        {primaryStatsEl(40, 18)}

        {/* Route map */}
        <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <RouteMapCanvas trackPoints={trackPoints} cpMarkers={cpMarkers} width={CONTENT_W} height={170} />
        </div>

        {/* Elevation profile */}
        <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', background: '#f8fafc', padding: '8px 0', border: '1px solid #e2e8f0' }}>
          <ElevationSilhouette data={distanceProfile} width={CONTENT_W} height={120} theme="light" />
        </div>

        {splitsTableEl(14, 12, 6)}

        <div style={{ height: 16 }} />
        {miniStatsEl}
        {highlightsEl(17)}
        {weatherEl}
        {footerEl}
      </div>
    );
  },
);

/* ── Sub-components ── */

function BigStat({ value, unit, label, color, valueFontSize, unitFontSize }: {
  value: string; unit?: string; label: string; color?: string;
  valueFontSize: number; unitFontSize: number;
}) {
  return (
    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: valueFontSize, fontWeight: 800, color: color ?? '#0f172a', marginTop: 3, lineHeight: 1.2 }}>
        {value}
        {unit && <span style={{ fontSize: unitFontSize, fontWeight: 400, marginLeft: 3, color: '#94a3b8' }}>{unit}</span>}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '5px 0' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#334155' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function HighlightCard({ icon, label, value, detail, valueFontSize }: {
  icon: string; label: string; value: string; detail: string; valueFontSize: number;
}) {
  return (
    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>{icon} {label}</div>
      <div style={{ fontSize: valueFontSize, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{detail}</div>
    </div>
  );
}

function WeatherChip({ icon, value, sub }: { icon: string; value: string; sub: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', borderRadius: 8, padding: '6px 10px', border: '1px solid #e2e8f0' }}>
      <span style={{ fontSize: 17 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>{value}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>
      </div>
    </div>
  );
}
