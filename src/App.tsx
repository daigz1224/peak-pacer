import { useState, useCallback, useEffect, useDeferredValue, useRef, lazy, Suspense } from 'react';
import type { ParsedGpx, RunnerProfile } from './types';
import { DEFAULT_PROFILE } from './types';
import { parseTrackFile, detectFormat } from './lib/track-parser';
import gpxFiles from 'virtual:gpx-files';
import { useRouteAnalysis } from './hooks/useRouteAnalysis';
import { useWeatherForecast } from './hooks/useWeatherForecast';
import { useHoverStore } from './hooks/useHoverSync';
import { captureShareCard, shareImage, encodeShareUrl, decodeShareUrl } from './lib/share';
import { track } from './lib/analytics';
import { PHONE_PRESETS, DEFAULT_PHONE_INDEX } from './lib/phone-presets';
import { FileLoader } from './components/FileLoader';
import { RunnerInputForm } from './components/RunnerInputForm';
import { RaceSummary } from './components/RaceSummary';
import { ElevationProfile } from './components/ElevationProfile';
import { SplitTable } from './components/SplitTable';
import { WallpaperCard } from './components/WallpaperCard';
import { WallpaperSettingsDialog } from './components/WallpaperSettingsDialog';
import { WeatherPanel } from './components/WeatherPanel';

const RouteMap = lazy(() => import('./components/RouteMap').then(m => ({ default: m.RouteMap })));

function App() {
  const [gpx, setGpx] = useState<ParsedGpx | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [profile, setProfile] = useState<RunnerProfile>(DEFAULT_PROFILE);
  const [generatingWallpaper, setGeneratingWallpaper] = useState(false);
  const [wallpaperDialogOpen, setWallpaperDialogOpen] = useState(false);
  const [startTime, setStartTime] = useState('06:00');
  const [nickname, setNickname] = useState('');
  const [phoneSize, setPhoneSize] = useState(PHONE_PRESETS[DEFAULT_PHONE_INDEX]);
  const [linkCopied, setLinkCopied] = useState(false);
  const hoverStore = useHoverStore();
  const wallpaperCardRef = useRef<HTMLDivElement>(null);
  const [raceDate, setRaceDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    return d.toISOString().slice(0, 10);
  });

  const handleTrackLoad = useCallback((xml: string, fileName: string) => {
    try {
      const format = detectFormat(fileName, xml);
      const parsed = parseTrackFile(xml, format);
      setGpx(parsed);
      setCurrentFile(fileName);
    } catch {
      alert('轨迹文件解析失败，请检查文件格式');
    }
  }, []);

  // Auto-load from share URL or first GPX on mount
  useEffect(() => {
    const shared = decodeShareUrl(window.location.hash);
    const target = shared?.file && gpxFiles.includes(shared.file) ? shared.file : gpxFiles[0];
    if (!target) return;
    fetch(`/files/${target}`)
      .then((r) => {
        if (r.ok) return r.text();
        return null;
      })
      .then((xml) => {
        if (xml) {
          handleTrackLoad(xml, target);
          if (shared?.itra) setProfile((p) => ({ ...p, itraPoints: shared.itra }));
        }
      })
      .catch(() => {});
    // Clear hash after loading so URL stays clean
    if (shared) history.replaceState(null, '', window.location.pathname);
  }, [handleTrackLoad]);

  // Defer heavy computation so UI updates immediately on track switch
  const deferredGpx = useDeferredValue(gpx);
  const deferredProfile = useDeferredValue(profile);
  const analysis = useRouteAnalysis(deferredGpx, deferredProfile);
  const isAnalyzing = deferredGpx !== gpx;

  const { weather, loading: weatherLoading, error: weatherError } =
    useWeatherForecast(gpx?.trackPoints ?? null, raceDate || null);

  const raceName = currentFile?.replace(/\.(gpx|kml|tcx)$/i, '') ?? gpx?.name ?? '';
  // Use the last split's cumulative time — it already accounts for strategy factor
  const predictedTime = analysis?.splits.length
    ? analysis.splits[analysis.splits.length - 1].cumulativeTime
    : 0;

  // Track prediction completion when a new track is analyzed
  const prevTrackedFile = useRef<string | null>(null);
  useEffect(() => {
    if (analysis && currentFile && currentFile !== prevTrackedFile.current) {
      prevTrackedFile.current = currentFile;
      track('generate-prediction', {
        race: raceName,
        itra: profile.itraPoints,
        strategy: profile.strategy ?? 'moderate',
      });
    }
  }, [analysis, currentFile, raceName, profile.itraPoints, profile.strategy]);

  // Whether current file is a built-in race (shareable)
  const isBuiltIn = currentFile != null && gpxFiles.includes(currentFile);

  const handleShare = useCallback(async () => {
    if (!currentFile) return;
    track('share-card', { race: raceName });
    const url = encodeShareUrl({ file: currentFile, itra: profile.itraPoints });
    // Try Web Share API first (mobile), fallback to clipboard
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: raceName, url });
        return;
      } catch { /* user cancelled or share failed */ }
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [currentFile, raceName, profile.itraPoints]);

  const openWallpaperDialog = useCallback(() => {
    setWallpaperDialogOpen(true);
  }, []);

  const handleWallpaperConfirm = useCallback(async () => {
    if (!wallpaperCardRef.current || generatingWallpaper) return;
    track('export-paceband', { race: raceName, phone: phoneSize.label, nickname: nickname || 'none' });
    setGeneratingWallpaper(true);
    try {
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await captureShareCard(wallpaperCardRef.current);
      await shareImage(blob, raceName + '_wallpaper');
    } catch (e) {
      console.error('Wallpaper generation failed:', e);
    } finally {
      setGeneratingWallpaper(false);
      setWallpaperDialogOpen(false);
    }
  }, [raceName, generatingWallpaper, phoneSize, nickname]);


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
          <span className="text-sm text-slate-400 hidden sm:inline">山野有数</span>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 sm:gap-6">
          {/* Sidebar */}
          <aside className="space-y-4 sm:space-y-6 print:hidden">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 space-y-5 sm:space-y-6">
              <FileLoader onLoad={handleTrackLoad} currentFile={currentFile} />
              <RunnerInputForm
                profile={profile}
                predictedTime={analysis?.predictedTime ?? null}
                timeRange={analysis?.timeRange ?? null}
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
          <div className="space-y-4 sm:space-y-6">
            {isAnalyzing && analysis && (
              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 text-sm text-slate-500">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                正在分析赛道数据...
              </div>
            )}
            {!analysis ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <svg viewBox="0 0 120 80" className="w-32 h-20 mx-auto mb-4 text-slate-200" fill="currentColor">
                  <path d="M10,75 L30,35 L40,50 L60,15 L80,50 L90,30 L110,75 Z" opacity="0.5" />
                  <path d="M20,75 L40,40 L48,52 L60,25 L72,52 L80,40 L100,75 Z" />
                  <circle cx="90" cy="18" r="8" className="text-amber-200" fill="currentColor" opacity="0.6" />
                </svg>
                <p className="text-lg text-slate-500">加载轨迹文件开始分析</p>
                <p className="text-sm mt-2 text-slate-400">
                  选择左侧预设赛事或上传轨迹文件
                </p>
              </div>
            ) : (
              <>
                <RaceSummary
                  name={raceName}
                  totalDistance={analysis.totalDistance}
                  totalGain={analysis.totalGain}
                  totalLoss={analysis.totalLoss}
                  predictedTime={predictedTime}
                  cpCount={analysis.splits.length}
                  onShare={isBuiltIn ? handleShare : undefined}
                  linkCopied={linkCopied}
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
                    hoverStore={hoverStore}
                    trackIndex={analysis.trackIndex}
                  />
                </Suspense>
                <ElevationProfile
                  data={analysis.distanceProfile}
                  cpPositions={analysis.cpPositions}
                  climbs={analysis.climbs}
                  hoverStore={hoverStore}
                />
                <SplitTable
                  splits={analysis.splits}
                  onWallpaper={openWallpaperDialog}
                  generatingWallpaper={generatingWallpaper}
                  autoCp={analysis.autoCp}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Hidden wallpaper card for image capture */}
      {analysis && (
        <WallpaperCard
          ref={wallpaperCardRef}
          raceName={raceName}
          totalDistance={analysis.totalDistance}
          totalGain={analysis.totalGain}
          predictedTime={predictedTime}
          splits={analysis.splits}
          startTime={startTime}
          distanceProfile={analysis.distanceProfile}
          trackPoints={gpx!.trackPoints}
          cpMarkers={analysis.cpMarkers}
          nickname={nickname}
          cardWidth={phoneSize.width}
          cardHeight={phoneSize.height}
          safeAreaTop={phoneSize.safeAreaTop}
        />
      )}

      {/* Wallpaper settings dialog */}
      <WallpaperSettingsDialog
        open={wallpaperDialogOpen}
        onClose={() => setWallpaperDialogOpen(false)}
        onConfirm={handleWallpaperConfirm}
        generating={generatingWallpaper}
        phoneSize={phoneSize}
        onPhoneSizeChange={setPhoneSize}
        nickname={nickname}
        onNicknameChange={setNickname}
        startTime={startTime}
        onStartTimeChange={setStartTime}
      />

      <footer className="max-w-6xl mx-auto px-4 py-6 text-center print:hidden">
        <p className="text-xs text-slate-400 italic">
          "有时候，跑得不好是一种意外，但如果你确实跑出了一场精彩的比赛，那就是因为你有能力跑出这样的比赛。"
          <span className="not-italic ml-1">—— 杰克·丹尼尔斯</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
