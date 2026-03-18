import type { CpSplit } from '../types';

interface Props {
  splits: CpSplit[];
}

function formatPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}'${s.toString().padStart(2, '0')}"`;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.round((minutes % 1) * 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function difficultyColor(pace: number): string {
  if (pace < 7) return 'bg-emerald-500';
  if (pace <= 10) return 'bg-amber-500';
  return 'bg-red-500';
}

export function SplitTable({ splits }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 pt-5 pb-2 flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="2" width="14" height="12" rx="1" />
          <path d="M1 6h14M5 6v8M11 6v8" />
        </svg>
        CP 分段配速
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-500 text-xs uppercase">
              <th className="w-6 px-2 py-2" />
              <th className="px-4 py-2 text-left">CP</th>
              <th className="px-3 py-2 text-right">距离</th>
              <th className="px-3 py-2 text-right">累计</th>
              <th className="px-3 py-2 text-right">爬升</th>
              <th className="px-3 py-2 text-right">下降</th>
              <th className="px-3 py-2 text-right">配速</th>
              <th className="px-3 py-2 text-right">用时</th>
              <th className="px-3 py-2 text-right border-l-2 border-orange-200">累计时间</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((split, i) => {
              const isHard = split.estimatedPace > 10;
              const rowBg = isHard
                ? 'bg-orange-50/70'
                : i % 2 === 1
                  ? 'bg-slate-50/50'
                  : '';
              return (
                <tr
                  key={i}
                  className={`border-t border-slate-100 ${rowBg}`}
                >
                  <td className="px-2 py-2.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${difficultyColor(split.estimatedPace)}`} />
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {split.cpName}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {split.segmentDistance.toFixed(1)} km
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {split.cumulativeDistance.toFixed(1)} km
                  </td>
                  <td className="px-3 py-2.5 text-right text-emerald-600 font-medium">
                    +{split.elevationGain}m
                  </td>
                  <td className="px-3 py-2.5 text-right text-sky-600">
                    -{split.elevationLoss}m
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-900">
                    {formatPace(split.estimatedPace)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {formatTime(split.segmentTime)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-orange-600 border-l-2 border-orange-200">
                    {formatTime(split.cumulativeTime)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
