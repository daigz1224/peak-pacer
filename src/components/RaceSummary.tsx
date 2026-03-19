import { useState } from 'react';

interface Props {
  name: string;
  totalDistance: number;
  totalGain: number;
  totalLoss: number;
  predictedTime: number;
  cpCount: number;
  onShare?: () => void;
  linkCopied?: boolean;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function HelpTip({ text, wide }: { text: string; wide?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-0.5">
      <button
        type="button"
        className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold leading-none hover:bg-slate-300 cursor-help"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        ?
      </button>
      {show && (
        <div className={`absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg shadow-lg ${wide ? 'w-64 whitespace-normal leading-relaxed' : 'whitespace-nowrap'}`}>
          {text}
        </div>
      )}
    </span>
  );
}

export function RaceSummary({
  name,
  totalDistance,
  totalGain,
  totalLoss,
  predictedTime,
  cpCount,
  onShare,
  linkCopied,
}: Props) {
  const itraEffort = Math.round(totalDistance + totalGain / 100);

  return (
    <div className="bg-white rounded-xl shadow-sm px-3 sm:px-5 py-3 sm:py-4">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-3">
        <svg viewBox="0 0 20 16" className="w-5 h-4 text-emerald-500 shrink-0" fill="currentColor">
          <path d="M1,15 L5,5 L7,9 L10,2 L13,9 L15,5 L19,15 Z" />
        </svg>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex-1 truncate">{name}</h2>
        <div className="flex items-center gap-1 print:hidden">
          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              title="分享赛道链接"
            >
              {linkCopied ? (
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l3 3 7-7" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 10l4-4M5 7L3 9a2.83 2.83 0 004 4l2-2M11 9l2-2a2.83 2.83 0 00-4-4L7 5" />
                </svg>
              )}
              {linkCopied ? '已复制' : '分享'}
            </button>
          )}
        </div>
      </div>

      {/* Compact stats row */}
      <div className="grid grid-cols-3 sm:flex sm:items-stretch gap-y-2 text-sm">
        <StatItem
          value={<>{totalDistance.toFixed(1)} <span className="text-xs font-normal text-slate-400">km</span></>}
          label="距离"
          color="text-slate-900"
          divider
        />
        <StatItem
          value={<>+{totalGain} <span className="text-xs font-normal text-slate-400">m</span></>}
          label="爬升"
          color="text-emerald-600"
          divider
        />
        <StatItem
          value={<>-{totalLoss} <span className="text-xs font-normal text-slate-400">m</span></>}
          label="下降"
          color="text-sky-600"
          divider
        />
        <StatItem
          value={itraEffort}
          label={<>努力值 <HelpTip text="距离(km) + 爬升(m)/100，用于衡量赛道难度" /></>}
          color="text-slate-900"
          divider
        />
        <StatItem
          value={cpCount}
          label={<>CP <HelpTip text="检查点/补给站数量" /></>}
          color="text-slate-900"
          divider
        />
        <StatItem
          value={formatTime(predictedTime)}
          label={<>完赛 <HelpTip wide text="基于 ITRA 积分推算平路基速，逐 GPS 点计算梯度调整（上坡减速、缓下坡加速、陡下坡制动），42km 后叠加超马疲劳因子，累加得出总时间" /></>}
          color="text-orange-600"
          large
        />
      </div>
    </div>
  );
}

function StatItem({
  value,
  label,
  color,
  divider,
  large,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  color: string;
  divider?: boolean;
  large?: boolean;
}) {
  return (
    <div className={`sm:flex-1 text-center sm:text-left sm:px-3 first:sm:pl-0 last:sm:pr-0 ${divider ? 'sm:border-r sm:border-slate-200' : ''}`}>
      <div className={`${large ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'} font-bold ${color} leading-tight whitespace-nowrap`}>
        {value}
      </div>
      <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 flex items-center justify-center sm:justify-start gap-0.5 whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}
