import type { WeatherSummary } from '../types';

interface Props {
  raceDate: string;
  onDateChange: (date: string) => void;
  weather: WeatherSummary | null;
  loading: boolean;
  error: string | null;
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

export function WeatherPanel({
  raceDate,
  onDateChange,
  weather,
  loading,
  error,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 print:hidden">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        比赛日天气预测
      </h3>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">比赛日期</label>
        <input
          type="date"
          value={raceDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          基于过去 3 年同期历史天气数据
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载天气数据...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {weather && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-orange-600 text-xs font-medium">温度</div>
              <div className="text-lg font-bold text-gray-900">
                {weather.avgTemp}°C
              </div>
              <div className="text-xs text-gray-500">
                {weather.minTemp}° ~ {weather.maxTemp}°
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-blue-600 text-xs font-medium">降水概率</div>
              <div className="text-lg font-bold text-gray-900">
                {Math.round(weather.precipProbability * 100)}%
              </div>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3">
              <div className="text-cyan-600 text-xs font-medium">风速</div>
              <div className="text-lg font-bold text-gray-900">
                {weather.avgWindSpeed} km/h
              </div>
              <div className="text-xs text-gray-500">
                {windDirectionLabel(weather.dominantWindDirection)}风
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-purple-600 text-xs font-medium">湿度</div>
              <div className="text-lg font-bold text-gray-900">
                {weather.avgHumidity}%
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-amber-700 text-xs font-medium mb-1">装备建议</div>
            <ul className="text-sm text-gray-700 space-y-1">
              {getGearAdvice(weather).map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
