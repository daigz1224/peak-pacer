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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        海拔剖面
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
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
          />
          {cpPositions.map((cp) => (
            <ReferenceLine
              key={cp.name}
              x={Math.round(cp.distance * 100) / 100}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{
                value: cp.name,
                position: 'top',
                fontSize: 10,
                fill: '#d97706',
              }}
            />
          ))}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#eleGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
