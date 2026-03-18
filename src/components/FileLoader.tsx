import { useCallback } from 'react';
import gpxFiles from 'virtual:gpx-files';

interface FileLoaderProps {
  onLoad: (xml: string, fileName: string) => void;
  currentFile: string | null;
}

export function FileLoader({ onLoad, currentFile }: FileLoaderProps) {
  const loadDefault = useCallback(
    async (name: string) => {
      const res = await fetch(`/files/${name}`);
      if (!res.ok) throw new Error('Failed to load GPX file');
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
            className={`px-3 py-1.5 text-sm text-left rounded-lg transition-colors whitespace-nowrap ${
              currentFile === name
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {name.replace('.gpx', '')}
          </button>
        ))}
      </div>

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
        上传 GPX 文件
        <input
          type="file"
          accept=".gpx"
          onChange={handleUpload}
          className="hidden"
        />
      </label>
    </div>
  );
}
