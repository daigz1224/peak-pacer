import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
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
import { WeatherPanel } from './components/WeatherPanel';

const RouteMap = lazy(() => import('./components/RouteMap').then(m => ({ default: m.RouteMap })));

function App() {
  const [gpx, setGpx] = useState<ParsedGpx | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [profile, setProfile] = useState<RunnerProfile>(DEFAULT_PROFILE);
  const [raceDate, setRaceDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    return d.toISOString().slice(0, 10);
  });

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 sticky top-0 z-[1000] print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <svg viewBox="0 0 28 20" className="w-7 h-5 text-emerald-400 shrink-0" fill="currentColor">
            <path d="M2,20 L7,8 L9,12 L14,2 L19,12 L21,8 L26,20 Z" opacity="0.3" />
            <path d="M6,20 L10,10 L12,14 L14,6 L16,14 L18,10 L22,20 Z" />
          </svg>
          <span className="text-xl font-bold text-white">Peak Pacer</span>
          <span className="text-sm text-slate-400 hidden sm:inline">智能越野配速，征服每一座山</span>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-6 print:hidden">
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-6">
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
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <svg viewBox="0 0 120 80" className="w-32 h-20 mx-auto mb-4 text-slate-200" fill="currentColor">
                  <path d="M10,75 L30,35 L40,50 L60,15 L80,50 L90,30 L110,75 Z" opacity="0.5" />
                  <path d="M20,75 L40,40 L48,52 L60,25 L72,52 L80,40 L100,75 Z" />
                  <circle cx="90" cy="18" r="8" className="text-amber-200" fill="currentColor" opacity="0.6" />
                </svg>
                <p className="text-lg text-slate-500">加载 GPX 轨迹文件开始分析</p>
                <p className="text-sm mt-2 text-slate-400">
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
                <Suspense fallback={
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 3l5 2v10l-5-2V3zM6 5l4-2v10l-4 2V5zM10 3l5-2v10l-5 2V3z" />
                      </svg>
                      赛道地图
                    </div>
                    <div className="rounded-lg bg-slate-100 animate-pulse" style={{ height: 360 }} />
                  </div>
                }>
                  <RouteMap
                    trackPoints={gpx!.trackPoints}
                    cpMarkers={analysis.cpMarkers}
                  />
                </Suspense>
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

      <footer className="max-w-6xl mx-auto px-4 py-6 text-center print:hidden">
        <p className="text-xs text-slate-400 italic">
          "跑得不好有时是一种意外，但如果你确实跑出了一场精彩的比赛，那是因为你有能力跑出这样的比赛。"
          <span className="not-italic ml-1">—— 杰克·丹尼尔斯</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
