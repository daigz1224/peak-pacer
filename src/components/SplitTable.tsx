import type { CpSplit } from '../types';
import { difficultyColors, isHardSegment } from '../lib/difficulty';

interface Props {
  splits: CpSplit[];
  onWallpaper?: () => void;
  generatingWallpaper?: boolean;
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

export function SplitTable({ splits, onWallpaper, generatingWallpaper }: Props) {
  const dotColors = difficultyColors(splits, 'tailwind');
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="2" width="14" height="12" rx="1" />
            <path d="M1 6h14M5 6v8M11 6v8" />
          </svg>
          CP 分段配速
        </h3>
        {onWallpaper && (
          <button
            onClick={onWallpaper}
            disabled={generatingWallpaper}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 print:hidden"
            title="生成手机壁纸"
          >
            {generatingWallpaper ? (
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="1" width="8" height="14" rx="1.5" />
                <path d="M7 12h2" />
              </svg>
            )}
            生成壁纸
          </button>
        )}
      </div>
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
              const hard = isHardSegment(splits, i);
              const rowBg = hard
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
                    <span className={`inline-block w-2 h-2 rounded-full ${dotColors[i]}`} />
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
