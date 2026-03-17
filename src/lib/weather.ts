import type { GpxPoint, WeatherSummary } from '../types';

const API_BASE = 'https://archive-api.open-meteo.com/v1/archive';

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

/**
 * Fetch historical weather for ±3 days around raceDate, for the past 3 years.
 */
export async function fetchWeatherHistory(
  lat: number,
  lon: number,
  raceDate: Date,
): Promise<WeatherSummary> {
  const month = raceDate.getMonth();
  const day = raceDate.getDate();
  const currentYear = raceDate.getFullYear();

  // Collect date ranges for past 3 years
  const ranges: { start: string; end: string }[] = [];
  for (let y = currentYear - 3; y < currentYear; y++) {
    const center = new Date(y, month, day);
    const start = new Date(center);
    start.setDate(start.getDate() - 3);
    const end = new Date(center);
    end.setDate(end.getDate() + 3);
    ranges.push({ start: fmt(start), end: fmt(end) });
  }

  // Fetch all years in parallel
  const allDaily: DailyData[] = await Promise.all(
    ranges.map(async ({ start, end }) => {
      const url = `${API_BASE}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&start_date=${start}&end_date=${end}&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_mean&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
      const data = await res.json();
      return data.daily as DailyData;
    }),
  );

  // Aggregate all days
  const temps: number[] = [];
  const maxTemps: number[] = [];
  const minTemps: number[] = [];
  const precips: number[] = [];
  const winds: number[] = [];
  const windDirs: number[] = [];
  const humidities: number[] = [];

  for (const daily of allDaily) {
    for (let i = 0; i < daily.time.length; i++) {
      if (daily.temperature_2m_mean[i] != null) temps.push(daily.temperature_2m_mean[i]);
      if (daily.temperature_2m_max[i] != null) maxTemps.push(daily.temperature_2m_max[i]);
      if (daily.temperature_2m_min[i] != null) minTemps.push(daily.temperature_2m_min[i]);
      if (daily.precipitation_sum[i] != null) precips.push(daily.precipitation_sum[i]);
      if (daily.wind_speed_10m_max[i] != null) winds.push(daily.wind_speed_10m_max[i]);
      if (daily.wind_direction_10m_dominant[i] != null) windDirs.push(daily.wind_direction_10m_dominant[i]);
      if (daily.relative_humidity_2m_mean[i] != null) humidities.push(daily.relative_humidity_2m_mean[i]);
    }
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return {
    avgTemp: Math.round(avg(temps) * 10) / 10,
    minTemp: Math.round(Math.min(...minTemps) * 10) / 10,
    maxTemp: Math.round(Math.max(...maxTemps) * 10) / 10,
    precipProbability: precips.length ? precips.filter((p) => p > 0.5).length / precips.length : 0,
    avgWindSpeed: Math.round(avg(winds) * 10) / 10,
    avgHumidity: Math.round(avg(humidities)),
    dominantWindDirection: Math.round(avg(windDirs)),
  };
}
