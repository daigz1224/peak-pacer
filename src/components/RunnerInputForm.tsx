import { useState } from 'react';
import type { RunnerProfile, HistoricalRace, RaceStrategy, TimeRange } from '../types';

interface Props {
  profile: RunnerProfile;
  predictedTime: number | null;
  timeRange: TimeRange | null;
  onChange: (profile: RunnerProfile) => void;
}

const EMPTY_RACE: HistoricalRace = { distance: 0, elevationGain: 0, finishTime: 0 };

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function parseTimeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

const inputClass = 'w-16 px-2 py-1.5 text-center border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors';

const STRATEGIES: { key: RaceStrategy; label: string; icon: string }[] = [
  { key: 'conservative', label: '保守', icon: '🛡' },
  { key: 'moderate', label: '稳健', icon: '🎯' },
  { key: 'aggressive', label: '激进', icon: '🔥' },
];

export function RunnerInputForm({ profile, predictedTime, timeRange, onChange }: Props) {
  const tH = profile.targetTime != null ? Math.floor(profile.targetTime / 60) : 0;
  const tM = profile.targetTime != null ? Math.floor(profile.targetTime % 60) : 0;
  const activeStrategy = profile.strategy ?? 'moderate';

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="4" r="2.5" />
          <path d="M4 14c0-2.2 1.8-4 4-4s4 1.8 4 4" />
        </svg>
        跑者参数
      </h3>

      {/* ITRA — primary input */}
      <div>
        <label className="block text-sm text-slate-600 mb-1">
          ITRA 积分
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
          className={`${inputClass} w-24 ${profile.itraPoints < 200 || profile.itraPoints > 900 ? 'border-amber-400' : ''}`}
        />
        {(profile.itraPoints < 200 || profile.itraPoints > 900) && (
          <p className="text-[11px] text-amber-600 mt-1">
            建议范围 200-900，当前值将被修正为 {Math.max(200, Math.min(900, profile.itraPoints))}
          </p>
        )}
      </div>

      {/* Historical races */}
      <HistoricalRacesSection
        races={profile.historicalRaces ?? []}
        onChange={(races) =>
          onChange({ ...profile, historicalRaces: races.length > 0 ? races : undefined })
        }
      />

      {/* Body weight (optional) */}
      <div>
        <label className="flex items-center gap-1 text-sm text-slate-600 mb-1">
          体重
          <span className="text-xs text-slate-400">(可选，默认 70kg)</span>
          <AlgoTipCustom text="仅用于计算补给计划(热量/饮水)，不影响配速预测" />
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={30}
            max={150}
            step={1}
            value={profile.bodyWeightKg ?? ''}
            placeholder="70"
            onChange={(e) => {
              const val = e.target.value;
              onChange({ ...profile, bodyWeightKg: val ? +val : undefined });
            }}
            className={`${inputClass} w-20`}
          />
          <span className="text-slate-400 text-sm">kg</span>
        </div>
      </div>

      {/* Race strategy + time range */}
      <div>
        <label className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <span>比赛策略</span>
          <AlgoTip />
        </label>

        {/* Strategy buttons */}
        <div className="flex gap-1.5 mb-3">
          {STRATEGIES.map(({ key, label, icon }) => {
            const isActive = profile.targetTime == null && activeStrategy === key;
            const isDisabled = profile.targetTime != null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ ...profile, strategy: key, targetTime: null })}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-all ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium shadow-sm'
                    : isDisabled
                      ? 'border-slate-100 text-slate-300 cursor-default'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <span className="mr-1">{icon}</span>{label}
              </button>
            );
          })}
        </div>

        {/* Time range bar */}
        {timeRange && profile.targetTime == null && (
          <div className="mb-3 px-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>激进</span>
              <span>稳健</span>
              <span>保守</span>
            </div>
            <div className="relative h-1.5 bg-slate-100 rounded-full">
              <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-emerald-300 via-emerald-200 to-amber-200 rounded-full" />
              {/* Active strategy indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm transition-all"
                style={{
                  left: activeStrategy === 'aggressive' ? '0%' : activeStrategy === 'moderate' ? '50%' : '100%',
                  transform: `translate(-50%, -50%)`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 mt-1">
              <span>{formatTime(timeRange.optimistic)}</span>
              <span className="text-emerald-600">{formatTime(timeRange.target)}</span>
              <span>{formatTime(timeRange.conservative)}</span>
            </div>
            {!(profile.historicalRaces && profile.historicalRaces.length > 0) && (
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                添加历史赛事可收窄预测区间
              </p>
            )}
          </div>
        )}

        {/* Manual target time override */}
        <div>
          <label className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>或手动指定完赛时间</span>
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
                className="text-xs text-emerald-600 hover:text-emerald-700 ml-1"
                title="重置为策略推算"
              >
                重置
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Historical Races Collapsible Section ── */

function HistoricalRacesSection({
  races,
  onChange,
}: {
  races: HistoricalRace[];
  onChange: (races: HistoricalRace[]) => void;
}) {
  const [open, setOpen] = useState(races.length > 0);

  const updateRace = (idx: number, patch: Partial<HistoricalRace>) => {
    const next = races.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const removeRace = (idx: number) => {
    onChange(races.filter((_, i) => i !== idx));
  };

  const addRace = () => {
    if (races.length < 3) onChange([...races, { ...EMPTY_RACE }]);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 transition-colors"
      >
        <svg
          viewBox="0 0 12 12"
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="currentColor"
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
        历史赛事成绩
        <span className="text-xs text-slate-400 ml-1">
          {races.length > 0 ? `(${races.length})` : '(可选)'}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-slate-400">
            输入越野赛成绩可校准 ITRA 预测
          </p>

          {races.map((race, idx) => (
            <RaceRow
              key={idx}
              race={race}
              onChange={(patch) => updateRace(idx, patch)}
              onRemove={() => removeRace(idx)}
            />
          ))}

          {races.length < 3 && (
            <button
              type="button"
              onClick={addRace}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2v8M2 6h8" />
              </svg>
              添加赛事
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Algorithm Tooltip ── */

const ALGO_DESC =
  '基于 ITRA 积分推算平路基速，逐 GPS 点计算梯度调整（上坡减速、缓下坡加速、陡下坡制动），42km 后叠加超马疲劳因子，累加得出总时间';

function AlgoTipCustom({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-0.5">
      <button
        type="button"
        className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-slate-200/60 text-slate-500 text-[10px] font-bold leading-none hover:bg-slate-300/60 cursor-help"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        ?
      </button>
      {show && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg shadow-lg w-52 whitespace-normal leading-relaxed">
          {text}
        </div>
      )}
    </span>
  );
}

function AlgoTip() {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-0.5">
      <button
        type="button"
        className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-emerald-200/60 text-emerald-700 text-[10px] font-bold leading-none hover:bg-emerald-300/60 cursor-help"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        ?
      </button>
      {show && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg shadow-lg w-64 whitespace-normal leading-relaxed">
          {ALGO_DESC}
        </div>
      )}
    </span>
  );
}

/* ── Single Race Row ── */

const smallInputClass =
  'w-14 px-1.5 py-1 text-center border border-slate-200 rounded text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors';

function RaceRow({
  race,
  onChange,
  onRemove,
}: {
  race: HistoricalRace;
  onChange: (patch: Partial<HistoricalRace>) => void;
  onRemove: () => void;
}) {
  const h = race.finishTime > 0 ? Math.floor(race.finishTime / 60) : 0;
  const m = race.finishTime > 0 ? Math.floor(race.finishTime % 60) : 0;

  return (
    <div className="flex items-center gap-1.5 flex-nowrap">
      <input
        type="number"
        min={1}
        max={400}
        placeholder="km"
        value={race.distance || ''}
        onChange={(e) => onChange({ distance: +e.target.value })}
        className={smallInputClass}
        title="距离 (km)"
      />
      <span className="text-xs text-slate-400">km</span>

      <input
        type="number"
        min={0}
        max={20000}
        step={100}
        placeholder="爬升"
        value={race.elevationGain || ''}
        onChange={(e) => onChange({ elevationGain: +e.target.value })}
        className={smallInputClass}
        title="累计爬升 (m)"
      />
      <span className="text-xs text-slate-400">m↑</span>

      <input
        type="number"
        min={1}
        max={72}
        placeholder="时"
        value={h || ''}
        onChange={(e) =>
          onChange({ finishTime: parseTimeToMinutes(+e.target.value, m) })
        }
        className={`${smallInputClass} w-10`}
        title="完赛时间 (时)"
      />
      <span className="text-xs text-slate-400">:</span>
      <input
        type="number"
        min={0}
        max={59}
        placeholder="分"
        value={race.finishTime > 0 ? m : ''}
        onChange={(e) =>
          onChange({ finishTime: parseTimeToMinutes(h, +e.target.value) })
        }
        className={`${smallInputClass} w-10`}
        title="完赛时间 (分)"
      />

      <button
        type="button"
        onClick={onRemove}
        className="text-slate-300 hover:text-red-400 transition-colors ml-0.5"
        title="删除"
      >
        <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </button>
    </div>
  );
}
