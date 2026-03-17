import { useState, useEffect } from 'react';
import type { GpxPoint, WeatherSummary } from '../types';
import { getTrackCenter, fetchWeatherHistory } from '../lib/weather';

export function useWeatherForecast(
  trackPoints: GpxPoint[] | null,
  raceDate: string | null, // YYYY-MM-DD
): { weather: WeatherSummary | null; loading: boolean; error: string | null } {
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackPoints || trackPoints.length === 0 || !raceDate) {
      setWeather(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const center = getTrackCenter(trackPoints);
    const date = new Date(raceDate + 'T00:00:00');

    fetchWeatherHistory(center.lat, center.lon, date)
      .then((result) => {
        if (!cancelled) {
          setWeather(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trackPoints, raceDate]);

  return { weather, loading, error };
}
