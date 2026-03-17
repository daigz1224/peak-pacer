import { useState, useCallback, useEffect } from 'react';
import type { ParsedGpx, RunnerProfile } from './types';
import { DEFAULT_PROFILE } from './types';
import { parseGpx } from './lib/gpx-parser';
import gpxFiles from 'virtual:gpx-files';
import { useRouteAnalysis } from './hooks/useRouteAnalysis';
import { useWeatherForecast } from './hooks/useWeatherForecast';
import { FileLoader } from './components/FileLoader';
import { RunnerInputForm } from './components/RunnerInputForm';
import { RaceSummary } from './components/RaceSummary';
import { ElevationProfile } from './components/ElevationProfile';
import { SplitTable } from './components/SplitTable';
import { PaceBand } from './components/PaceBand';
import { RouteMap } from './components/RouteMap';
import { WeatherPanel } from './components/WeatherPanel';

function App() {
  const [gpx, setGpx] = useState<ParsedGpx | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [profile, setProfile] = useState<RunnerProfile>(DEFAULT_PROFILE);
  const [raceDate, setRaceDate] = useState<string>('');

  const handleGpxLoad = useCallback((xml: string, fileName: string) => {
    try {
      const parsed = parseGpx(xml);
      setGpx(parsed);
      setCurrentFile(fileName);
    } catch {
      alert('GPX 文件解析失败，请检查文件格式');
    }
  }, []);

  // Auto-load first GPX on mount
  useEffect(() => {
    const first = gpxFiles[0];
    if (!first) return;
    fetch(`/files/${first}`)
      .then((r) => {
        if (r.ok) return r.text();
        return null;
      })
      .then((xml) => {
        if (xml) handleGpxLoad(xml, first);
      })
      .catch(() => {});
  }, [handleGpxLoad]);

  const analysis = useRouteAnalysis(gpx, profile);
  const { weather, loading: weatherLoading, error: weatherError } =
    useWeatherForecast(gpx?.trackPoints ?? null, raceDate || null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900">Peak Pacer</span>
          <span className="text-sm text-gray-400">动态越野配速手环</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-6 print:hidden">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6">
              <FileLoader onLoad={handleGpxLoad} currentFile={currentFile} />
              <RunnerInputForm
                profile={profile}
                predictedTime={analysis?.predictedTime ?? null}
                onChange={setProfile}
              />
            </div>
            <WeatherPanel
              raceDate={raceDate}
              onDateChange={setRaceDate}
              weather={weather}
              loading={weatherLoading}
              error={weatherError}
            />
          </aside>

          {/* Main content */}
          <div className="space-y-6">
            {!analysis ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <p className="text-lg">加载 GPX 轨迹文件开始分析</p>
                <p className="text-sm mt-2">
                  选择左侧预设赛事或上传自己的 GPX 文件
                </p>
              </div>
            ) : (
              <>
                <RaceSummary
                  name={currentFile?.replace('.gpx', '') ?? gpx!.name}
                  totalDistance={analysis.totalDistance}
                  totalGain={analysis.totalGain}
                  totalLoss={analysis.totalLoss}
                  predictedTime={
                    profile.targetTime ?? analysis.predictedTime
                  }
                  cpCount={analysis.splits.length}
                />
                <RouteMap
                  trackPoints={gpx!.trackPoints}
                  cpMarkers={analysis.cpMarkers}
                />
                <ElevationProfile
                  data={analysis.distanceProfile}
                  cpPositions={analysis.cpPositions}
                />
                <SplitTable splits={analysis.splits} />
                <PaceBand splits={analysis.splits} raceName={currentFile?.replace('.gpx', '') ?? gpx!.name} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
