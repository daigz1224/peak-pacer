import { useEffect } from 'react';
import { PHONE_PRESETS, DEFAULT_PHONE_INDEX } from '../lib/phone-presets';
import type { PhoneSizePreset } from '../lib/phone-presets';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  generating: boolean;
  phoneSize: PhoneSizePreset;
  onPhoneSizeChange: (preset: PhoneSizePreset) => void;
  nickname: string;
  onNicknameChange: (value: string) => void;
  startTime: string;
  onStartTimeChange: (time: string) => void;
}

const inputClass =
  'w-16 px-2 py-1.5 text-center border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors';

const iphonePresets = PHONE_PRESETS.filter((p) => p.group === 'iPhone');
const androidPresets = PHONE_PRESETS.filter((p) => p.group === 'Android');

export function WallpaperSettingsDialog({
  open,
  onClose,
  onConfirm,
  generating,
  phoneSize,
  onPhoneSizeChange,
  nickname,
  onNicknameChange,
  startTime,
  onStartTimeChange,
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const selectedIndex = PHONE_PRESETS.findIndex(
    (p) => p.width === phoneSize.width && p.height === phoneSize.height,
  );

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="1" width="8" height="14" rx="1.5" />
            <path d="M7 12h2" />
          </svg>
          壁纸设置
        </h3>

        {/* Phone size */}
        <div>
          <label className="block text-sm text-slate-600 mb-1">手机尺寸</label>
          <select
            value={selectedIndex >= 0 ? selectedIndex : DEFAULT_PHONE_INDEX}
            onChange={(e) => onPhoneSizeChange(PHONE_PRESETS[+e.target.value])}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors bg-white"
          >
            <optgroup label="iPhone">
              {iphonePresets.map((p) => {
                const idx = PHONE_PRESETS.indexOf(p);
                return (
                  <option key={idx} value={idx}>
                    {p.label}　{p.width * 3}×{p.height * 3}
                  </option>
                );
              })}
            </optgroup>
            <optgroup label="Android">
              {androidPresets.map((p) => {
                const idx = PHONE_PRESETS.indexOf(p);
                return (
                  <option key={idx} value={idx}>
                    {p.label}　{p.width * 3}×{p.height * 3}
                  </option>
                );
              })}
            </optgroup>
          </select>
        </div>

        {/* Nickname */}
        <div>
          <label className="block text-sm text-slate-600 mb-1">昵称</label>
          <input
            type="text"
            maxLength={20}
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            placeholder="显示在壁纸右上角（可选）"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
          />
        </div>

        {/* Start time */}
        <div>
          <label className="flex items-center gap-1 text-sm text-slate-600 mb-1">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4v4l2.5 2.5" />
            </svg>
            起跑时间
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={23}
              value={parseInt(startTime.split(':')[0], 10)}
              onChange={(e) => {
                const h = Math.max(0, Math.min(23, +e.target.value));
                const m = startTime.split(':')[1];
                onStartTimeChange(`${h.toString().padStart(2, '0')}:${m}`);
              }}
              className={inputClass}
            />
            <span className="text-slate-400">:</span>
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              value={parseInt(startTime.split(':')[1], 10)}
              onChange={(e) => {
                const h = startTime.split(':')[0];
                const m = Math.max(0, Math.min(59, +e.target.value));
                onStartTimeChange(`${h}:${m.toString().padStart(2, '0')}`);
              }}
              className={inputClass}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            {generating && (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            确认生成
          </button>
        </div>
      </div>
    </div>
  );
}
