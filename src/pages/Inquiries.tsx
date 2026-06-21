import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { ApiInquiry } from '../lib/api';
import NewInquiryModal from '../components/NewInquiryModal';

const CLUSTER_COLORS: Record<string, string> = {
  intake: '#334155',
  estimation: '#b45309',
  proposal: '#1d4ed8',
  bid_active: '#15803d',
  outcome: '#b91c1c',
};

const PRIORITY_STYLES: Record<string, string> = {
  P1: 'bg-orange-100 text-orange-800 border border-orange-200',
  P2: 'bg-amber-100 text-amber-800 border border-amber-200',
  P3: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
};

function formatValue(value: number, currency: 'USD' | 'INR', unit: 'Mn' | 'Cr'): string {
  const symbol = currency === 'USD' ? '$' : '₹';
  return `${symbol} ${value.toFixed(2)} ${unit}`;
}

export default function Inquiries() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<ApiInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.inquiries
      .list()
      .then((data) => setInquiries(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (inquiry: ApiInquiry) => {
    setInquiries((prev) => [...prev, inquiry]);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inquiries</h1>
          <p className="text-sm text-gray-500 mt-0.5">All sales inquiries across clusters</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Inquiry
        </button>
      </div>

      {/* States */}
      {loading && (
        <p className="text-sm text-gray-400">Loading inquiries…</p>
      )}
      {error && (
        <p className="text-sm text-red-500">Failed to load inquiries: {error}</p>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Client · Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Scope</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bid Due</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Estimator</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Cluster</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inquiries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                      No inquiries yet. Click "New Inquiry" to add one.
                    </td>
                  </tr>
                )}
                {inquiries.map((inq) => (
                  <tr
                    key={inq._id}
                    onClick={() => navigate(`/inquiry/${encodeURIComponent(inq.inquiryId)}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-500">{inq.inquiryId}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{inq.client}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-600">{inq.project}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="text-gray-700 truncate block">{inq.scope}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-medium">
                      {formatValue(inq.value, inq.currency, inq.valueUnit)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          PRIORITY_STYLES[inq.priority] ?? ''
                        }`}
                      >
                        {inq.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      <span className="text-gray-400 text-xs">{inq.currentStage}/14</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-xs">{inq.currentStageName}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                      {inq.bidDue}
                      {inq.daysToBid !== undefined && (
                        <span
                          className={`ml-1.5 ${
                            inq.daysToBid < 0
                              ? 'text-red-500'
                              : inq.daysToBid <= 7
                              ? 'text-orange-500'
                              : 'text-gray-400'
                          }`}
                        >
                          ({inq.daysToBid}d)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                      {inq.estimator || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="text-xs font-medium capitalize"
                        style={{ color: CLUSTER_COLORS[inq.cluster] ?? '#334155' }}
                      >
                        {inq.cluster.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NewInquiryModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
