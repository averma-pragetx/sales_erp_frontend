import { STAGES, CLUSTER_COLORS, CLUSTER_OWNER_COLORS } from '../data/stages';

interface Props {
  completedUpTo: number;
  selectedStage: number;
  onSelectStage: (num: number) => void;
}

export default function StagesSidebar({ completedUpTo, selectedStage, onSelectStage }: Props) {
  return (
    <aside className="w-[300px] shrink-0 border-r border-gray-200 overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
          Journey · 14 Stages
        </p>
      </div>

      <ul className="relative">
        {STAGES.map((stage, idx) => {
          const isCompleted = stage.num <= completedUpTo;
          const isCurrent = stage.num === completedUpTo + 1;
          const isSelected = stage.num === selectedStage;
          const clusterColor = CLUSTER_COLORS[stage.cluster];
          const ownerColor = CLUSTER_OWNER_COLORS[stage.cluster];

          // vertical connector line color = this stage's cluster color
          const showLine = idx < STAGES.length - 1;
          const lineColor = CLUSTER_COLORS[stage.cluster];

          return (
            <li key={stage.num} className="relative">
              {/* Vertical connector line */}
              {showLine && (
                <span
                  className="absolute left-[27px] top-[36px] w-[2px] h-[calc(100%-4px)]"
                  style={{ background: lineColor, opacity: 0.35 }}
                />
              )}

              <button
                type="button"
                onClick={() => onSelectStage(stage.num)}
                className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                }`}
              >
                {/* Stage circle */}
                <span
                  className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all"
                  style={
                    isCompleted
                      ? { background: '#16a34a', color: '#fff' }
                      : isCurrent
                      ? { background: clusterColor, color: '#fff' }
                      : { background: '#fff', color: '#9ca3af', border: `2px solid #d1d5db` }
                  }
                >
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    stage.num
                  )}
                </span>

                <div className="min-w-0">
                  <p
                    className={`text-sm leading-snug ${
                      isSelected || isCurrent ? 'font-semibold text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {stage.name}
                  </p>
                  <p
                    className="text-xs mt-0.5 font-medium"
                    style={{ color: isCompleted || isCurrent ? ownerColor : '#9ca3af' }}
                  >
                    {stage.owner}
                    {isCompleted && stage.num === 1 && (
                      <span className="font-normal text-gray-400 ml-1">· 2026-05-24</span>
                    )}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
