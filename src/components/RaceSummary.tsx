import { useState } from 'react';

interface Props {
  name: string;
  totalDistance: number;
  totalGain: number;
  totalLoss: number;
  predictedTime: number;
  cpCount: number;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function HelpTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold leading-none hover:bg-gray-300 cursor-help"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        ?
      </button>
      {show && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
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
}: Props) {
  // ITRA effort: distance(km) + gain(m)/100
  const itraEffort = Math.round(totalDistance + totalGain / 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{name}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">总距离</div>
          <div className="text-xl font-bold text-gray-900">
            {totalDistance.toFixed(1)} <span className="text-sm font-normal">km</span>
          </div>
        </div>
        <div>
          <div className="text-gray-500">累计爬升</div>
          <div className="text-xl font-bold text-emerald-600">
            +{totalGain} <span className="text-sm font-normal">m</span>
          </div>
        </div>
        <div>
          <div className="text-gray-500">累计下降</div>
          <div className="text-xl font-bold text-blue-600">
            -{totalLoss} <span className="text-sm font-normal">m</span>
          </div>
        </div>
        <div>
          <div className="text-gray-500">
            ITRA 努力值
            <HelpTip text="距离(km) + 爬升(m)/100，用于衡量赛道难度" />
          </div>
          <div className="text-xl font-bold text-gray-900">{itraEffort}</div>
        </div>
        <div>
          <div className="text-gray-500">
            CP 数量
            <HelpTip text="检查点/补给站数量" />
          </div>
          <div className="text-xl font-bold text-gray-900">{cpCount}</div>
        </div>
        <div>
          <div className="text-gray-500">
            预计完赛
            <HelpTip text="基于全马成绩、iTRA 积分和赛道数据的自动推算" />
          </div>
          <div className="text-xl font-bold text-orange-600">
            {formatTime(predictedTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
