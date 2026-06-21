import { Link } from 'react-router-dom';
import type { Inquiry } from '../types';
import { CLUSTERS } from '../data';

const PRIORITY_STYLES: Record<string, string> = {
  P1: 'bg-orange-500 text-white',
  P2: 'bg-amber-400 text-white',
  P3: 'bg-yellow-200 text-yellow-800',
};

function formatValue(inquiry: Inquiry): string {
  const sym = inquiry.currency === 'USD' ? '$ ' : '₹';
  return `${sym}${inquiry.value.toFixed(2)} ${inquiry.valueUnit}`;
}

interface Props {
  inquiry: Inquiry;
}

export default function InquiryCard({ inquiry }: Props) {
  const cluster = CLUSTERS.find(c => c.key === inquiry.cluster)!;
  const daysLabel = `${inquiry.daysToBid}d to bid`;

  return (
    <Link
      to={`/inquiry/${encodeURIComponent(inquiry.id)}`}
      className="block bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer no-underline"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-mono tracking-wide">{inquiry.id}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${PRIORITY_STYLES[inquiry.priority]}`}>
          {inquiry.priority}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-900 leading-snug">
        {inquiry.client} · {inquiry.project}
      </p>

      {/* Scope */}
      <p className="text-xs text-gray-500 mt-0.5 mb-2">{inquiry.scope}</p>

      {/* Value + Days to bid */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">{formatValue(inquiry)}</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: '#fee2e2', color: '#b91c1c' }}
        >
          {daysLabel}
        </span>
      </div>

      {/* Stage */}
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: cluster.color }}
        >
          {inquiry.currentStage}
        </span>
        <span className="text-xs text-gray-600 leading-tight">{inquiry.currentStageName}</span>
      </div>
    </Link>
  );
}
