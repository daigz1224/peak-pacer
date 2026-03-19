import type { WeatherSummary } from '../types';

interface Props {
  raceDate: string;
  onDateChange: (date: string) => void;
  weather: WeatherSummary | null;
  loading: boolean;
  error: string | null;
}

/** Map temperature to a color: blue(cold) → green(mild) → amber(warm) → red(hot) */
function tempColor(temp: number): string {
  if (temp <= 0) return '#3b82f6';    // blue
  if (temp <= 10) return '#06b6d4';   // cyan
  if (temp <= 18) return '#10b981';   // emerald
  if (temp <= 25) return '#f59e0b';   // amber
  if (temp <= 32) return '#f97316';   // orange
  return '#ef4444';                   // red
}

function windDirectionLabel(deg: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  return dirs[Math.round(deg / 45) % 8];
}

function getGearAdvice(w: WeatherSummary): string[] {
  const advice: string[] = [];
  if (w.precipProbability > 0.4) advice.push('降水概率较高，建议携带防水外套');
  if (w.minTemp < 5) advice.push('低温可能低于 5°C，建议携带保暖层');
  if (w.maxTemp > 30) advice.push('高温可能超过 30°C，注意防晒补水');
  if (w.avgWindSpeed > 30) advice.push('风力较强，山脊段注意防风');
  if (w.avgHumidity > 80) advice.push('湿度较高，注意防滑');
  if (advice.length === 0) advice.push('天气条件较为温和，适合比赛');
  return advice;
}

function getRaceDayTemps(weather: WeatherSummary) {
  const yearly = weather.yearlyTemps;
  if (!yearly || yearly.length === 0) return null;
  return yearly;
}

function WeatherContent({ weather }: { weather: WeatherSummary }) {
  const raceDayTemps = getRaceDayTemps(weather);

  // Compute scale for temperature range bars
  const allTemps = raceDayTemps?.flatMap((t) => [t.high, t.low]) ?? [];
  const scaleMin = allTemps.length ? Math.floor(Math.min(...allTemps)) - 2 : 0;
  const scaleMax = allTemps.length ? Math.ceil(Math.max(...allTemps)) + 2 : 40;
  const scaleRange = scaleMax - scaleMin || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="text-amber-600 text-xs font-medium">温度</div>
          <div className="text-lg font-bold text-slate-900">
            {weather.avgTemp}°C
          </div>
          <div className="text-xs text-slate-500">
            {weather.minTemp}° ~ {weather.maxTemp}°
          </div>
        </div>
        <div className="bg-sky-50 rounded-lg p-3">
          <div className="text-sky-600 text-xs font-medium">降水概率</div>
          <div className="text-lg font-bold text-slate-900">
            {Math.round(weather.precipProbability * 100)}%
          </div>
        </div>
        <div className="bg-slate-100 rounded-lg p-3">
          <div className="text-slate-600 text-xs font-medium">风速</div>
          <div className="text-lg font-bold text-slate-900">
            {weather.avgWindSpeed} km/h
          </div>
          <div className="text-xs text-slate-500">
            {windDirectionLabel(weather.dominantWindDirection)}风
          </div>
        </div>
        <div className="bg-sky-50/60 rounded-lg p-3">
          <div className="text-sky-500 text-xs font-medium">湿度</div>
          <div className="text-lg font-bold text-slate-900">
            {weather.avgHumidity}%
          </div>
        </div>
      </div>

      {raceDayTemps && raceDayTemps.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">近三年比赛日气温</div>
          <div className="space-y-2">
            {raceDayTemps.map((t) => {
              const leftPct = ((t.low - scaleMin) / scaleRange) * 100;
              const widthPct = ((t.high - t.low) / scaleRange) * 100;
              return (
                <div key={t.year} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-slate-500 text-right shrink-0">{t.year}</span>
                  <div className="flex-1 relative h-5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0.5 bottom-0.5 rounded-full"
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 2)}%`,
                        background: `linear-gradient(to right, ${tempColor(t.low)}, ${tempColor(t.high)})`,
                      }}
                    />
                  </div>
                  <span className="w-20 text-slate-600 shrink-0">
                    {t.low}° ~ {t.high}°
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-12">
            <span>{scaleMin}°C</span>
            <span>{scaleMax}°C</span>
          </div>
        </div>
      )}

      <div className="bg-emerald-50 rounded-lg p-3">
        <div className="text-emerald-700 text-xs font-medium mb-1">装备建议</div>
        <ul className="text-sm text-slate-700 space-y-1">
          {getGearAdvice(weather).map((a, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5">•</span>
              {a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function WeatherPanel({
  raceDate,
  onDateChange,
  weather,
  loading,
  error,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 print:hidden">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6" cy="6" r="3" />
          <path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.8 2.8l.7.7M8.5 8.5l.7.7M2.8 9.2l.7-.7M8.5 3.5l.7-.7" />
          <path d="M10 11a3 3 0 11-6 0 3 3 0 016 0z" fill="currentColor" opacity="0.15" />
        </svg>
        比赛日天气预测
      </h3>

      <div className="mb-4">
        <label className="block text-sm text-slate-600 mb-1">比赛日期</label>
        <input
          type="date"
          value={raceDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
        />
        <p className="text-xs text-slate-400 mt-1">
          基于过去 3 年同期历史天气数据
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载天气数据...
        </div>
      )}

      {error && !loading && (
        <p className="text-xs text-slate-400 py-2">天气数据暂不可用</p>
      )}

      {weather && !loading && (
        <WeatherContent weather={weather} />
      )}
    </div>
  );
}
