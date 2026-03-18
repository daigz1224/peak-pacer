import type { RunnerProfile } from '../types';

interface Props {
  profile: RunnerProfile;
  predictedTime: number | null;
  onChange: (profile: RunnerProfile) => void;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function parseTimeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

const inputClass = 'w-16 px-2 py-1.5 text-center border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors';

export function RunnerInputForm({ profile, predictedTime, onChange }: Props) {
  const mH = Math.floor(profile.marathonTime / 60);
  const mM = Math.floor(profile.marathonTime % 60);
  const tH = profile.targetTime != null ? Math.floor(profile.targetTime / 60) : 0;
  const tM = profile.targetTime != null ? Math.floor(profile.targetTime % 60) : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="4" r="2.5" />
          <path d="M4 14c0-2.2 1.8-4 4-4s4 1.8 4 4" />
        </svg>
        跑者参数
      </h3>

      {/* Marathon time */}
      <div>
        <label className="block text-sm text-slate-600 mb-1">
          全马成绩
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={2}
            max={7}
            value={mH}
            onChange={(e) =>
              onChange({
                ...profile,
                marathonTime: parseTimeToMinutes(+e.target.value, mM),
              })
            }
            className={inputClass}
          />
          <span className="text-slate-400">时</span>
          <input
            type="number"
            min={0}
            max={59}
            value={mM}
            onChange={(e) =>
              onChange({
                ...profile,
                marathonTime: parseTimeToMinutes(mH, +e.target.value),
              })
            }
            className={inputClass}
          />
          <span className="text-slate-400">分</span>
        </div>
      </div>

      {/* iTRA */}
      <div>
        <label className="block text-sm text-slate-600 mb-1">
          iTRA 积分
          <span className="ml-1 text-xs text-slate-400">(200-900)</span>
        </label>
        <input
          type="number"
          min={100}
          max={1000}
          step={10}
          value={profile.itraPoints}
          onChange={(e) =>
            onChange({ ...profile, itraPoints: +e.target.value })
          }
          className={`${inputClass} w-24`}
        />
      </div>

      {/* Target time */}
      <div>
        <label className="flex items-center gap-2 text-sm text-slate-600 mb-1">
          <span>目标完赛时间</span>
          {profile.targetTime == null && predictedTime && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              自动推算: {formatTime(predictedTime)}
            </span>
          )}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={30}
            value={profile.targetTime != null ? tH : ''}
            placeholder={predictedTime ? String(Math.floor(predictedTime / 60)) : '-'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                onChange({ ...profile, targetTime: null });
              } else {
                onChange({
                  ...profile,
                  targetTime: parseTimeToMinutes(+val, tM),
                });
              }
            }}
            className={inputClass}
          />
          <span className="text-slate-400">时</span>
          <input
            type="number"
            min={0}
            max={59}
            value={profile.targetTime != null ? tM : ''}
            placeholder={predictedTime ? String(Math.floor(predictedTime % 60)).padStart(2, '0') : '-'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' && !tH) {
                onChange({ ...profile, targetTime: null });
              } else {
                onChange({
                  ...profile,
                  targetTime: parseTimeToMinutes(tH, +val),
                });
              }
            }}
            className={inputClass}
          />
          <span className="text-slate-400">分</span>
          {profile.targetTime != null && (
            <button
              onClick={() => onChange({ ...profile, targetTime: null })}
              className="text-xs text-slate-400 hover:text-slate-600 ml-1"
              title="重置为自动推算"
            >
              重置
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
