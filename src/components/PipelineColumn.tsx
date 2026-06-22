import type { Cluster, Inquiry } from '../types';
import InquiryCard from './InquiryCard';

interface Props {
  cluster: Cluster;
  inquiries: Inquiry[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, clusterKey: string) => void;
}

export default function PipelineColumn({ cluster, inquiries, onAdd, onDelete, isDragOver, onDragOver, onDragLeave, onDrop }: Props) {
  return (
    <div
      className="flex flex-col min-w-0 flex-1"
      style={{ minWidth: 260, maxWidth: 320 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop?.(e, cluster.key)}
    >
      {/* Column header */}
      <div
        className="rounded-lg border border-gray-200 bg-white px-4 py-3 mb-3"
        style={{ borderLeft: `4px solid ${cluster.borderColor}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-none">{cluster.label}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{cluster.stageLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-gray-600"
              style={{ background: cluster.badgeBg }}
            >
              {inquiries.length}
            </span>
            <button
              type="button"
              onClick={onAdd}
              title={`Add inquiry to ${cluster.label}`}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              style={{ '--hover-bg': cluster.borderColor } as React.CSSProperties}
              onMouseEnter={e => (e.currentTarget.style.background = cluster.borderColor)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div
        className={`flex flex-col gap-3 min-h-20 rounded-lg transition-colors ${
          isDragOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''
        }`}
      >
        {inquiries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 italic">No inquiries</p>
        ) : (
          inquiries.map(inq => <InquiryCard key={inq.id} inquiry={inq} onDelete={onDelete} />)
        )}
      </div>
    </div>
  );
}
