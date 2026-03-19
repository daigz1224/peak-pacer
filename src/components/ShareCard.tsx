import { forwardRef } from 'react';
import type { WeatherSummary } from '../types';
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
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export const ShareCard = forwardRef<HTMLDivElement, Props>(
  ({ raceName, totalDistance, totalGain, totalLoss, predictedTime, cpCount, distanceProfile, weather }, ref) => {
    const itraEffort = Math.round(totalDistance + totalGain / 100);

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: 540,
          height: 675,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 100%)',
          color: '#ffffff',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo + branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <svg viewBox="0 0 28 20" style={{ width: 28, height: 20, color: '#34d399' }} fill="currentColor">
            <path d="M2,20 L7,8 L9,12 L14,2 L19,12 L21,8 L26,20 Z" opacity="0.3" />
            <path d="M6,20 L10,10 L12,14 L14,6 L16,14 L18,10 L22,20 Z" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>Peak Pacer</span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>山野有数</span>
        </div>

        {/* Race name */}
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
          {raceName}
        </div>

        {/* Divider */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, #10b981 0%, transparent 100%)', marginBottom: 24 }} />

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          <StatCard label="总距离" value={`${totalDistance.toFixed(1)}`} unit="km" />
          <StatCard label="累计爬升" value={`+${totalGain}`} unit="m" color="#34d399" />
          <StatCard label="累计下降" value={`-${totalLoss}`} unit="m" color="#38bdf8" />
          <StatCard label="ITRA 努力值" value={`${itraEffort}`} />
          <StatCard label="CP 数量" value={`${cpCount}`} />
          <StatCard label="预计完赛" value={formatTime(predictedTime)} color="#fb923c" large />
        </div>

        {/* Elevation silhouette */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <ElevationSilhouette data={distanceProfile} width={460} height={120} />
        </div>

        {/* Weather row */}
        {weather && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
            <span>{Math.round(weather.avgTemp)}°C</span>
            <span>{Math.round(weather.precipProbability * 100)}% 降水</span>
            <span>{Math.round(weather.avgWindSpeed)} km/h 风速</span>
            <span>{Math.round(weather.avgHumidity)}% 湿度</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
          <span>peakpacer.com</span>
          <span>{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>
    );
  },
);

function StatCard({
  label,
  value,
  unit,
  color,
  large,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  large?: boolean;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 8,
      padding: '10px 12px',
    }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{
        fontSize: large ? 22 : 18,
        fontWeight: 700,
        color: color ?? '#ffffff',
        marginTop: 2,
      }}>
        {value}
        {unit && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2, color: '#94a3b8' }}>{unit}</span>}
      </div>
    </div>
  );
}
