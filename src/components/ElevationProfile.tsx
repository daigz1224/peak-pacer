import { useRef, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Label,
} from 'recharts';
import type { Climb } from '../types';
import type { HoverStore } from '../hooks/useHoverSync';

interface Props {
  data: { distance: number; elevation: number }[];
  cpPositions: { distance: number; name: string }[];
  climbs: Climb[];
  hoverStore?: HoverStore;
}

export function ElevationProfile({ data, cpPositions, climbs, hoverStore }: Props) {
  const crosshairRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  if (data.length === 0) return null;

  const minEle = Math.min(...data.map((d) => d.elevation));
  const maxEle = Math.max(...data.map((d) => d.elevation));
  const padding = (maxEle - minEle) * 0.1;
  const maxDist = data[data.length - 1].distance;

  const maxGain = climbs.length > 0 ? Math.max(...climbs.map((c) => c.gain)) : 1;
  const minGain = climbs.length > 0 ? Math.min(...climbs.map((c) => c.gain)) : 0;

  // Chart margins matching Recharts config
  const marginLeft = 45; // YAxis width
  const marginRight = 10;

  // Subscribe to hover store for map → chart crosshair
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!hoverStore) return;
    return hoverStore.subscribe(() => {
      const dist = hoverStore.getDistance();
      const el = crosshairRef.current;
      const container = containerRef.current;
      if (!el || !container) return;

      if (dist == null) {
        el.style.opacity = '0';
        return;
      }

      const chartWidth = container.clientWidth - marginLeft - marginRight;
      const x = marginLeft + (dist / maxDist) * chartWidth;
      el.style.left = `${x}px`;
      el.style.opacity = '1';
    });
  }, [hoverStore, maxDist]);

  // Chart hover → write to store
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleMouseMove = useCallback(
    (state: { activePayload?: { payload: { distance: number } }[] }) => {
      if (!hoverStore || !state.activePayload?.[0]) return;
      const dist = state.activePayload[0].payload.distance;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => hoverStore.setDistance(dist));
    },
    [hoverStore],
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleMouseLeave = useCallback(() => {
    if (!hoverStore) return;
    cancelAnimationFrame(rafId.current);
    hoverStore.setDistance(null);
  }, [hoverStore]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 14l4-8 3 4 4-8 3 6" />
        </svg>
        海拔剖面
      </h3>
      <div ref={containerRef} className="relative">
        {/* Crosshair for map → chart hover */}
        <div
          ref={crosshairRef}
          className="absolute top-0 w-px bg-blue-500/70 pointer-events-none opacity-0 z-10 transition-opacity duration-75"
          style={{ height: 220 }}
        />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#047857" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distance"
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
              tick={{ fontSize: 11 }}
              label={{ value: 'km', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
            />
            <YAxis
              domain={[Math.floor(minEle - padding), Math.ceil(maxEle + padding)]}
              tickFormatter={(v: number) => `${v}`}
              tick={{ fontSize: 11 }}
              width={45}
              label={{ value: 'm', position: 'insideTopLeft', offset: -5, fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [`${value} m`, '海拔']}
              labelFormatter={(label) => `${Number(label).toFixed(1)} km`}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            />
            {climbs.map((climb, i) => {
              const t = maxGain === minGain ? 1 : (climb.gain - minGain) / (maxGain - minGain);
              const fillOpacity = 0.08 + t * 0.17;
              const strokeOpacity = 0.15 + t * 0.35;
              const r = Math.round(249 - t * 30);
              const g = Math.round(115 - t * 55);
              const b = Math.round(22 - t * 10);
              const labelColor = `rgb(${r},${g},${b})`;
              return (
                <ReferenceArea
                  key={`climb-${i}`}
                  x1={climb.startDist}
                  x2={climb.endDist}
                  fill="#f97316"
                  fillOpacity={fillOpacity}
                  stroke="#f97316"
                  strokeOpacity={strokeOpacity}
                >
                  <Label
                    value={`↑${climb.gain}m`}
                    position="insideTop"
                    fontSize={10}
                    fontWeight={600}
                    fill={labelColor}
                    offset={2}
                  />
                </ReferenceArea>
              );
            })}
            {cpPositions.map((cp) => (
              <ReferenceLine
                key={cp.name}
                x={Math.round(cp.distance * 100) / 100}
                stroke="#94a3b8"
                strokeDasharray="4 3"
                label={{
                  value: cp.name,
                  position: 'top',
                  fontSize: 10,
                  fill: '#64748b',
                }}
              />
            ))}
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#065f46"
              strokeWidth={1.5}
              fill="url(#eleGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
