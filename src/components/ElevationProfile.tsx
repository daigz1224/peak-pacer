import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { distance: number; elevation: number }[];
  cpPositions: { distance: number; name: string }[];
}

export function ElevationProfile({ data, cpPositions }: Props) {
  if (data.length === 0) return null;

  const minEle = Math.min(...data.map((d) => d.elevation));
  const maxEle = Math.max(...data.map((d) => d.elevation));
  const padding = (maxEle - minEle) * 0.1;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 14l4-8 3 4 4-8 3 6" />
        </svg>
        海拔剖面
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
  );
}
