import type { CpSplit } from '../types';

interface Props {
  splits: CpSplit[];
  raceName: string;
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

export function PaceBand({ splits, raceName }: Props) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3 print:hidden">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          配速手环
        </h3>
        <button
          onClick={handlePrint}
          className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          打印手环
        </button>
      </div>

      {/* Printable pace band */}
      <div className="pace-band border-2 border-gray-900 rounded-lg overflow-hidden">
        <div className="bg-gray-900 text-white text-center py-1 text-xs font-bold tracking-wide">
          {raceName}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="px-2 py-1 text-left">CP</th>
              <th className="px-2 py-1 text-right">km</th>
              <th className="px-2 py-1 text-right">爬升</th>
              <th className="px-2 py-1 text-right">配速</th>
              <th className="px-2 py-1 text-right">到达</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((split, i) => (
              <tr key={i} className="border-t border-gray-200">
                <td className="px-2 py-1 font-bold">{split.cpName}</td>
                <td className="px-2 py-1 text-right">
                  {split.cumulativeDistance.toFixed(1)}
                </td>
                <td className="px-2 py-1 text-right">+{split.elevationGain}m</td>
                <td className="px-2 py-1 text-right font-mono">
                  {formatPace(split.estimatedPace)}
                </td>
                <td className="px-2 py-1 text-right font-mono font-bold">
                  {formatTime(split.cumulativeTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
