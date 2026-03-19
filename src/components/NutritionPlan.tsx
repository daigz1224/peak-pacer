import { useMemo } from 'react';
import type { CpSplit, WeatherSummary } from '../types';
import { computeNutritionPlan } from '../lib/nutrition';

interface Props {
  splits: CpSplit[];
  weather: WeatherSummary | null;
  bodyWeightKg?: number;
  raceName: string;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function calColor(cal: number): string {
  if (cal < 350) return 'text-emerald-600';
  if (cal <= 450) return 'text-amber-600';
  return 'text-red-600';
}

function fluidColor(ml: number): string {
  if (ml < 500) return 'text-emerald-600';
  if (ml <= 700) return 'text-amber-600';
  return 'text-red-600';
}

export function NutritionPlan({ splits, weather, bodyWeightKg, raceName }: Props) {
  const plan = useMemo(
    () => computeNutritionPlan(splits, weather, bodyWeightKg),
    [splits, weather, bodyWeightKg],
  );

  if (plan.length === 0) return null;

  // Average targets across all segments
  const avgCal = Math.round(plan.reduce((s, p) => s + p.targets.caloriesPerHour, 0) / plan.length);
  const avgFluid = Math.round(plan.reduce((s, p) => s + p.targets.fluidPerHour, 0) / plan.length);
  const avgSodium = Math.round(plan.reduce((s, p) => s + p.targets.sodiumPerHour, 0) / plan.length);
  const totalCal = plan[plan.length - 1].cumulativeCalories;
  const totalFluid = plan[plan.length - 1].cumulativeFluid;

  const handlePrint = () => {
    document.body.classList.add('print-crew-sheet');
    window.print();
    document.body.classList.remove('print-crew-sheet');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1v4M6 5h4l-1 7H7L6 5zM5 14h6" />
          </svg>
          补给计划
        </h3>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors print:hidden"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="1" width="8" height="4" rx="0.5" />
            <rect x="1" y="5" width="14" height="6" rx="1" />
            <rect x="4" y="9" width="8" height="5" rx="0.5" />
          </svg>
          打印补给单
        </button>
      </div>

      {/* Summary bar */}
      <div className="mx-5 mb-3 flex flex-wrap gap-3 text-xs">
        <span className="bg-slate-100 rounded-full px-3 py-1">
          <span className="text-slate-500">平均</span>{' '}
          <span className="font-semibold text-slate-700">{avgCal} kcal/h</span>
        </span>
        <span className="bg-slate-100 rounded-full px-3 py-1">
          <span className="text-slate-500">饮水</span>{' '}
          <span className="font-semibold text-slate-700">{avgFluid} ml/h</span>
        </span>
        <span className="bg-slate-100 rounded-full px-3 py-1">
          <span className="text-slate-500">钠盐</span>{' '}
          <span className="font-semibold text-slate-700">{avgSodium} mg/h</span>
        </span>
        <span className="bg-orange-50 rounded-full px-3 py-1">
          <span className="text-slate-500">全程</span>{' '}
          <span className="font-semibold text-orange-600">{totalCal} kcal / {(totalFluid / 1000).toFixed(1)}L</span>
        </span>
      </div>

      {/* Crew sheet (printable) */}
      <div className="crew-sheet">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-xs uppercase">
                <th className="px-4 py-2 text-left">CP</th>
                <th className="px-3 py-2 text-right">用时</th>
                <th className="px-3 py-2 text-right">kcal/h</th>
                <th className="px-3 py-2 text-right">ml/h</th>
                <th className="px-3 py-2 text-right">Na mg/h</th>
                <th className="px-3 py-2 text-right border-l-2 border-emerald-200">需补热量</th>
                <th className="px-3 py-2 text-right">需补饮水</th>
                <th className="px-3 py-2 text-right border-l-2 border-orange-200">累计热量</th>
                <th className="px-3 py-2 text-right">累计饮水</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((cp, i) => (
                <tr
                  key={i}
                  className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900">{cp.cpName}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{formatTime(cp.segmentTime)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${calColor(cp.targets.caloriesPerHour)}`}>
                    {cp.targets.caloriesPerHour}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${fluidColor(cp.targets.fluidPerHour)}`}>
                    {cp.targets.fluidPerHour}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{cp.targets.sodiumPerHour}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-900 border-l-2 border-emerald-200">
                    {cp.segmentCalories} kcal
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {cp.segmentFluid} ml
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-orange-600 border-l-2 border-orange-200">
                    {cp.cumulativeCalories}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-orange-600">
                    {(cp.cumulativeFluid / 1000).toFixed(1)}L
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Printable header (only visible in print) */}
        <div className="hidden print:block text-center text-xs text-slate-500 mt-2 pb-2">
          {raceName} — 补给计划 {bodyWeightKg ? `(${bodyWeightKg}kg)` : '(默认70kg)'}
        </div>
      </div>
    </div>
  );
}
