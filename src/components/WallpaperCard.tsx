import { forwardRef } from 'react';
import type { CpSplit } from '../types';
import { ElevationSilhouette } from './ElevationSilhouette';
import { RouteMapCanvas } from './RouteMapCanvas';
import { formatClockTime } from '../lib/time-utils';
import { difficultyColors } from '../lib/difficulty';

interface Props {
  raceName: string;
  totalDistance: number;
  totalGain: number;
  predictedTime: number;
  splits: CpSplit[];
  startTime: string;
  distanceProfile: { distance: number; elevation: number }[];
  trackPoints: { lat: number; lon: number }[];
  cpMarkers: { name: string; lat: number; lon: number }[];
  nickname?: string;
  cardWidth?: number;
  cardHeight?: number;
  safeAreaTop?: number;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function adaptiveNameSize(name: string): number {
  const len = name.length;
  if (len <= 14) return 26;
  if (len <= 20) return 22;
  if (len <= 28) return 18;
  return 15;
}

export const WallpaperCard = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const { raceName, totalDistance, totalGain, predictedTime, splits, startTime, distanceProfile, trackPoints, cpMarkers, nickname, cardWidth, cardHeight, safeAreaTop } = props;

    const CARD_W = cardWidth ?? 402;
    const CARD_H = cardHeight ?? 874;
    const heightScale = Math.min(1, CARD_H / 874);
    const PAD_X = 24;
    const PAD_TOP = (safeAreaTop ?? 59) + 6; // safe area + 6px breathing room
    const PAD_BOTTOM = Math.round(24 * heightScale);
    const CONTENT_W = CARD_W - PAD_X * 2;

    // Adaptive font size for CP table based on count
    const cpCount = splits.length;
    const tableFontSize = cpCount > 20 ? 10 : cpCount > 15 ? 11 : cpCount > 10 ? 12 : 14;
    const rowPadY = cpCount > 20 ? 3 : cpCount > 15 ? 4 : cpCount > 10 ? 5 : 7;

    const finishClockTime = formatClockTime(startTime, predictedTime);
    const nameFontSize = adaptiveNameSize(raceName);
    const dotColors = difficultyColors(splits);

    // Background contour lines SVG (subtle mountain texture) — uses viewBox so it scales to any card size
    const contourSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 402 874' fill='none'%3E%3Cpath d='M0 760 Q80 720 160 740 T320 730 T402 750' stroke='%231e293b' stroke-width='0.8'/%3E%3Cpath d='M0 780 Q100 750 200 770 T402 760' stroke='%231e293b' stroke-width='0.6'/%3E%3Cpath d='M0 800 Q120 775 240 790 T402 785' stroke='%231e293b' stroke-width='0.5'/%3E%3Cpath d='M0 820 Q90 800 180 815 T360 808 T402 810' stroke='%231e293b' stroke-width='0.4'/%3E%3Cpath d='M0 840 Q130 825 260 835 T402 830' stroke='%231e293b' stroke-width='0.3'/%3E%3C/svg%3E")`;

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: CARD_W,
          height: CARD_H,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: 'linear-gradient(170deg, #0f172a 0%, #1e293b 50%, #0f2922 100%)',
          color: '#f8fafc',
          padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column' as const,
        }}
      >
        {/* Background contour texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: contourSvg,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom',
          backgroundSize: '100% auto',
          opacity: 0.6,
          pointerEvents: 'none' as const,
        }} />

        {/* Decorative glow */}
        <div style={{
          position: 'absolute',
          top: -60,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          pointerEvents: 'none' as const,
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 28 20" style={{ width: 22, height: 16 }} fill="#10b981">
              <path d="M2,20 L7,8 L9,12 L14,2 L19,12 L21,8 L26,20 Z" opacity="0.3" />
              <path d="M6,20 L10,10 L12,14 L14,6 L16,14 L18,10 L22,20 Z" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.5 }}>Peak Pacer</span>
          </div>
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: nickname ? '#e2e8f0' : '#64748b',
            letterSpacing: 0.5,
            maxWidth: CONTENT_W * 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}>
            {nickname || '山野有数'}
          </span>
        </div>

        {/* Race name — single line, adaptive size */}
        <div style={{
          fontSize: nameFontSize,
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: 10,
          color: '#f8fafc',
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          position: 'relative' as const,
        }}>
          {raceName}
        </div>

        {/* Emerald divider with glow */}
        <div style={{ position: 'relative' as const, marginBottom: 14 }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #10b981 0%, #10b98160 60%, transparent 100%)' }} />
          <div style={{ position: 'absolute', top: -2, left: 0, height: 6, width: 120, background: 'linear-gradient(90deg, rgba(16,185,129,0.3) 0%, transparent 100%)', filter: 'blur(3px)' }} />
        </div>

        {/* Primary stats row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, position: 'relative' as const }}>
          <StatCard label="距离" value={totalDistance.toFixed(1)} unit="km" />
          <StatCard label="爬升" value={`+${totalGain}`} unit="m" color="#10b981" />
          <StatCard label="完赛" value={formatTime(predictedTime)} color="#ea580c" />
        </div>

        {/* Start → Finish timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, position: 'relative' as const }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>{startTime}</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #334155 0%, #334155 90%, transparent 100%)', position: 'relative' as const }}>
            <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, rgba(251,191,36,0.15) 0%, transparent 100%)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>{finishClockTime}</span>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
        </div>

        {/* CP splits table — fills remaining space, with route map background */}
        <div style={{ flex: 1, marginBottom: 8, display: 'flex', flexDirection: 'column' as const, position: 'relative' as const }}>
          {/* Route map as background */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none' as const }}>
            <RouteMapCanvas trackPoints={trackPoints} cpMarkers={cpMarkers} width={CONTENT_W} height={500} trackOnly />
          </div>
          {/* Table header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '5px 10px',
            fontSize: 9,
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase' as const,
            letterSpacing: 1.5,
            borderBottom: '1px solid rgba(71,85,105,0.5)',
          }}>
            <span style={{ width: 14 }} />
            <span style={{ flex: 2.2 }}>CP</span>
            <span style={{ flex: 1, textAlign: 'right' }}>km</span>
            <span style={{ flex: 1, textAlign: 'right' }}>爬升</span>
            <span style={{ flex: 1, textAlign: 'right' }}>下降</span>
            <span style={{ flex: 1.3, textAlign: 'right' }}>到达</span>
          </div>

          {/* Table rows */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', gap: rowPadY * 2 }}>
            {splits.map((s, i) => {
              const clockTime = formatClockTime(startTime, s.cumulativeTime);
              const dotColor = dotColors[i];
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    fontSize: tableFontSize,
                    borderBottom: i < splits.length - 1 ? '1px solid rgba(51,65,85,0.3)' : 'none',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'transparent',
                  }}
                >
                  {/* Difficulty dot */}
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                    marginRight: 7,
                    boxShadow: `0 0 4px ${dotColor}40`,
                  }} />
                  <span style={{
                    flex: 2.2,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                  }}>
                    {s.cpName}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                    {s.cumulativeDistance.toFixed(1)}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#34d399', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    +{s.elevationGain}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#7dd3fc', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    -{s.elevationLoss}
                  </span>
                  <span style={{
                    flex: 1.3,
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#fbbf24',
                    fontSize: tableFontSize + 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {clockTime}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Elevation silhouette — pinned to bottom */}
        <div style={{
          borderRadius: 8,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          padding: '6px 0',
          marginBottom: 10,
          position: 'relative' as const,
        }}>
          <ElevationSilhouette
            data={distanceProfile}
            width={CONTENT_W}
            height={Math.round(80 * heightScale)}
            theme="dark"
            cpMarkers={splits.map(s => ({ distance: s.cumulativeDistance, name: s.cpName }))}
          />
        </div>

        {/* Quote */}
        <div style={{
          fontSize: 10,
          color: '#64748b',
          fontStyle: 'italic',
          textAlign: 'center' as const,
          lineHeight: 1.5,
          marginBottom: 8,
          position: 'relative' as const,
        }}>
          "有时候，跑得不好是一种意外，但如果你确实跑出了一场精彩的比赛，那就是因为你有能力跑出这样的比赛。"
          <span style={{ fontStyle: 'normal', marginLeft: 4, color: '#475569' }}>—— 杰克·丹尼尔斯</span>
        </div>

        {/* Footer branding */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          position: 'relative' as const,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <svg viewBox="0 0 28 20" style={{ width: 16, height: 12, alignSelf: 'center' }} fill="#10b981">
              <path d="M2,20 L7,8 L9,12 L14,2 L19,12 L21,8 L26,20 Z" opacity="0.3" />
              <path d="M6,20 L10,10 L12,14 L14,6 L16,14 L18,10 L22,20 Z" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5 }}>
              peak-pacer.top
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#475569' }}>{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>
    );
  },
);

/* ── Sub-components ── */

function StatCard({ label, value, unit, sub, color }: {
  label: string; value: string; unit?: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      flex: 1,
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      padding: '10px 12px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? '#f8fafc', marginTop: 3, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2, color: '#64748b' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{sub}</div>}
    </div>
  );
}
