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

export function SplitTable({ splits }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-5 pt-5 pb-2">
        CP 分段配速
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-2 text-left">CP</th>
              <th className="px-3 py-2 text-right">距离</th>
              <th className="px-3 py-2 text-right">累计</th>
              <th className="px-3 py-2 text-right">爬升</th>
              <th className="px-3 py-2 text-right">下降</th>
              <th className="px-3 py-2 text-right">配速</th>
              <th className="px-3 py-2 text-right">用时</th>
              <th className="px-3 py-2 text-right">累计时间</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((split, i) => {
              const isHard = split.estimatedPace > 10; // steep uphill
              return (
                <tr
                  key={i}
                  className={`border-t border-gray-100 ${
                    isHard ? 'bg-orange-50' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {split.cpName}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {split.segmentDistance.toFixed(1)} km
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {split.cumulativeDistance.toFixed(1)} km
                  </td>
                  <td className="px-3 py-2.5 text-right text-emerald-600 font-medium">
                    +{split.elevationGain}m
                  </td>
                  <td className="px-3 py-2.5 text-right text-blue-600">
                    -{split.elevationLoss}m
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium text-gray-900">
                    {formatPace(split.estimatedPace)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {formatTime(split.segmentTime)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-orange-600">
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
