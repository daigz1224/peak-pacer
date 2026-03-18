import type { GpxPoint, WeatherSummary, YearlyTemperature } from '../types';

const API_BASE = 'https://archive-api.open-meteo.com/v1/archive';
const FETCH_TIMEOUT = 15_000;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DAILY_FIELDS = 'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_mean';

/** Get center coordinate of a track */
export function getTrackCenter(points: GpxPoint[]): { lat: number; lon: number } {
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lon: acc.lon + p.lon }),
    { lat: 0, lon: 0 },
  );
  return {
    lat: sum.lat / points.length,
    lon: sum.lon / points.length,
  };
}

/** Format date as YYYY-MM-DD */
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface DailyData {
  time: string[];
  temperature_2m_mean: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  wind_direction_10m_dominant: number[];
  relative_humidity_2m_mean: number[];
}

/** Fetch with timeout */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Cache key for localStorage */
function cacheKey(lat: number, lon: number, date: string): string {
  return `weather_${lat.toFixed(2)}_${lon.toFixed(2)}_${date}`;
}

/** Read from cache, returns null if expired or missing */
export function readCache(lat: number, lon: number, date: string): WeatherSummary | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lon, date));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(cacheKey(lat, lon, date));
      return null;
    }
    return data as WeatherSummary;
  } catch {
    return null;
  }
}

/** Write to cache */
function writeCache(lat: number, lon: number, date: string, data: WeatherSummary): void {
  try {
    localStorage.setItem(cacheKey(lat, lon, date), JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage full or unavailable, ignore
  }
}

function aggregate(allDaily: DailyData[]): WeatherSummary {
  const temps: number[] = [];
  const maxTemps: number[] = [];
  const minTemps: number[] = [];
  const precips: number[] = [];
  const winds: number[] = [];
  const windDirs: number[] = [];
  const humidities: number[] = [];
  const yearlyTemps: YearlyTemperature[] = [];

  for (const daily of allDaily) {
    let year = 0;
    let dayHigh = -Infinity;
    let dayLow = Infinity;

    for (let i = 0; i < daily.time.length; i++) {
      if (daily.temperature_2m_mean[i] != null) temps.push(daily.temperature_2m_mean[i]);
      if (daily.temperature_2m_max[i] != null) maxTemps.push(daily.temperature_2m_max[i]);
      if (daily.temperature_2m_min[i] != null) minTemps.push(daily.temperature_2m_min[i]);
      if (daily.precipitation_sum[i] != null) precips.push(daily.precipitation_sum[i]);
      if (daily.wind_speed_10m_max[i] != null) winds.push(daily.wind_speed_10m_max[i]);
      if (daily.wind_direction_10m_dominant[i] != null) windDirs.push(daily.wind_direction_10m_dominant[i]);
      if (daily.relative_humidity_2m_mean[i] != null) humidities.push(daily.relative_humidity_2m_mean[i]);

      if (daily.time[i]) {
        if (!year) year = parseInt(daily.time[i].slice(0, 4), 10);
        if (daily.temperature_2m_max[i] != null) dayHigh = Math.max(dayHigh, daily.temperature_2m_max[i]);
        if (daily.temperature_2m_min[i] != null) dayLow = Math.min(dayLow, daily.temperature_2m_min[i]);
      }
    }

    if (year && dayHigh !== -Infinity) {
      yearlyTemps.push({ year, high: dayHigh, low: dayLow });
    }
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return {
    avgTemp: Math.round(avg(temps) * 10) / 10,
    minTemp: minTemps.length ? Math.round(Math.min(...minTemps) * 10) / 10 : 0,
    maxTemp: maxTemps.length ? Math.round(Math.max(...maxTemps) * 10) / 10 : 0,
    precipProbability: precips.length ? precips.filter((p) => p > 0.5).length / precips.length : 0,
    avgWindSpeed: Math.round(avg(winds) * 10) / 10,
    avgHumidity: Math.round(avg(humidities)),
    dominantWindDirection: Math.round(avg(windDirs)),
    yearlyTemps,
  };
}

/**
 * Fetch historical weather for race day, for the most recent 3 years.
 * - Only fetches the exact race date per year (1 day each, minimal payload)
 * - All 3 years fetched in parallel
 * - 15s timeout, failed years silently skipped
 */
export async function fetchWeatherHistory(
  lat: number,
  lon: number,
  raceDate: Date,
): Promise<WeatherSummary> {
  const month = raceDate.getMonth();
  const day = raceDate.getDate();

  // Determine most recent 3 years with available data
  const now = new Date();
  const thisYear = now.getFullYear();
  const raceDatePassed =
    now.getMonth() > month || (now.getMonth() === month && now.getDate() >= day);
  const latestYear = raceDatePassed ? thisYear : thisYear - 1;

  // Build exact date for each of the 3 years
  const dates: string[] = [];
  for (let y = latestYear - 2; y <= latestYear; y++) {
    dates.push(fmt(new Date(y, month, day)));
  }

  // Fetch all 3 years in parallel (each request = 1 day, tiny payload)
  const results = await Promise.allSettled(
    dates.map(async (date) => {
      const url = `${API_BASE}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&start_date=${date}&end_date=${date}&daily=${DAILY_FIELDS}&timezone=auto`;
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.daily as DailyData;
    }),
  );

  const allDaily = results
    .filter((r): r is PromiseFulfilledResult<DailyData> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (allDaily.length === 0) {
    throw new Error('天气数据获取失败，请稍后重试');
  }

  const summary = aggregate(allDaily);

  // Cache result
  writeCache(lat, lon, fmt(raceDate), summary);

  return summary;
}
