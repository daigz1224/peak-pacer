import { useCallback, useState } from 'react';
import gpxFiles from 'virtual:gpx-files';
import { SUPPORTED_EXTENSIONS } from '../lib/track-parser';

interface FileLoaderProps {
  onLoad: (xml: string, fileName: string) => void;
  currentFile: string | null;
}

export function FileLoader({ onLoad, currentFile }: FileLoaderProps) {
  const [showUrl, setShowUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const loadDefault = useCallback(
    async (name: string) => {
      const res = await fetch(`/files/${name}`);
      if (!res.ok) throw new Error('Failed to load file');
      const xml = await res.text();
      onLoad(xml, name);
    },
    [onLoad],
  );

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        onLoad(reader.result as string, file.name);
      };
      reader.readAsText(file);
    },
    [onLoad],
  );

  const handleUrlImport = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;

    setUrlLoading(true);
    setUrlError(null);

    // Extract file name from URL path
    const fileName = extractFileName(url);

    try {
      let text: string | null = null;

      // Try direct fetch first
      try {
        const res = await fetch(url);
        if (res.ok) text = await res.text();
      } catch {
        // CORS or network error — try proxy
      }

      // Fallback: CORS proxy
      if (text === null) {
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) text = await res.text();
        } catch {
          // proxy also failed
        }
      }

      if (text === null) {
        setUrlError('无法加载链接，请下载文件后上传');
        return;
      }

      onLoad(text, fileName);
      setUrlInput('');
      setShowUrl(false);
    } catch {
      setUrlError('链接加载失败');
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, onLoad]);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 6l4-4h4l4 4v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          <path d="M6 8l2 2 2-2" />
        </svg>
        赛事轨迹
      </h3>

      <div className="flex flex-col gap-1.5">
        {gpxFiles.map((name) => (
          <button
            key={name}
            onClick={() => loadDefault(name)}
            className={`px-3 py-1.5 text-sm text-left rounded-lg transition-colors truncate ${
              currentFile === name
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {name.replace(/\.(gpx|kml|tcx)$/i, '')}
          </button>
        ))}
      </div>

      {/* File upload */}
      <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span>
          上传轨迹文件
          <span className="text-xs text-slate-400 ml-1.5">GPX / KML / TCX</span>
        </span>
        <input
          type="file"
          accept={SUPPORTED_EXTENSIONS}
          onChange={handleUpload}
          className="hidden"
        />
      </label>

      {/* URL import */}
      {!showUrl ? (
        <button
          onClick={() => setShowUrl(true)}
          className="text-xs text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 10l4-4M5 7L3 9a2.83 2.83 0 004 4l2-2M11 9l2-2a2.83 2.83 0 00-4-4L7 5" />
          </svg>
          或从链接导入
        </button>
      ) : (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
              placeholder="粘贴轨迹文件链接"
              className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              disabled={urlLoading}
            />
            <button
              onClick={handleUrlImport}
              disabled={urlLoading || !urlInput.trim()}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
            >
              {urlLoading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : '加载'}
            </button>
          </div>
          {urlError && (
            <p className="text-xs text-red-500">{urlError}</p>
          )}
          <button
            onClick={() => { setShowUrl(false); setUrlError(null); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            收起
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Extract a usable file name from a URL.
 * e.g. "https://example.com/path/my-route.gpx?token=abc" → "my-route.gpx"
 */
function extractFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /\.(gpx|kml|tcx)$/i.test(last)) {
      return decodeURIComponent(last);
    }
    return last ? decodeURIComponent(last) : 'imported-track.gpx';
  } catch {
    return 'imported-track.gpx';
  }
}
