import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiScrapedTender } from '../lib/api';
import { api } from '../lib/api';
import LeadActionMenu from '../components/LeadActionMenu';

function formatValue(value: number, currency: 'USD' | 'INR', unit: 'Mn' | 'Cr'): string {
  const symbol = currency === 'USD' ? '$' : '₹';
  return `${symbol} ${value.toFixed(2)} ${unit}`;
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function daysUntil(dueDate: string): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function DueCell({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate);
  if (days === null) return <span className="text-gray-400">—</span>;
  const color = days <= 7 ? 'text-red-600' : days <= 21 ? 'text-amber-600' : 'text-gray-600';
  return <span className={`text-sm font-medium ${color}`}>{days}d</span>;
}

function ScoreRing({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300 text-xs">—</span>;
  const color = score >= 85 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ border: `2px solid ${color}`, color }}
    >
      {score}
    </div>
  );
}

const STATUS_STYLES: Record<ApiScrapedTender['status'], { label: string; className: string }> = {
  new:      { label: 'New',            className: 'bg-gray-100 text-gray-600' },
  approved: { label: 'Approved',       className: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Rejected',       className: 'bg-red-100 text-red-700' },
  pushed:   { label: 'Pushed to Sales', className: 'bg-green-100 text-green-700' },
};

const PAGE_SIZE = 10;

export default function LeadEngine() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<ApiScrapedTender[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.scrapedTenders.list(page, PAGE_SIZE)
      .then(({ items, total }) => { setTenders(items); setTotal(total); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function updateTender(updated: ApiScrapedTender) {
    setTenders(prev => prev.map(t => (t.tenderName === updated.tenderName ? updated : t)));
  }

  async function handleAnalyse(tender: ApiScrapedTender) {
    setBusyId(tender.tenderName);
    try {
      updateTender(await api.scrapedTenders.analyse(tender.tenderName));
    } catch (e) {
      alert(`Failed to analyse tender: ${e}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(tender: ApiScrapedTender) {
    setBusyId(tender.tenderName);
    try {
      updateTender(await api.scrapedTenders.approve(tender.tenderName));
    } catch (e) {
      alert(`Failed to approve tender: ${e}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(tender: ApiScrapedTender) {
    setBusyId(tender.tenderName);
    try {
      updateTender(await api.scrapedTenders.reject(tender.tenderName));
    } catch (e) {
      alert(`Failed to reject tender: ${e}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePushToSales(tender: ApiScrapedTender) {
    setBusyId(tender.tenderName);
    try {
      const { tender: updated } = await api.scrapedTenders.pushToSales(tender.tenderName);
      updateTender(updated);
    } catch (e) {
      alert(`Failed to push tender to sales: ${e}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Tender Intelligence</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Analyse, approve/reject and push them to the Sales Pipeline once ready.
          </p>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading tenders…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="text-left font-semibold px-4 py-2.5">Tender ID</th>
                  <th className="text-left font-semibold px-4 py-2.5">Client</th>
                  <th className="text-left font-semibold px-4 py-2.5">Tender Title</th>
                  <th className="text-left font-semibold px-4 py-2.5">Source</th>
                  <th className="text-left font-semibold px-4 py-2.5">Value</th>
                  <th className="text-left font-semibold px-4 py-2.5">Due</th>
                  <th className="text-left font-semibold px-4 py-2.5">Score</th>
                  <th className="text-left font-semibold px-4 py-2.5">Status</th>
                  <th className="text-right font-semibold px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {tenders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-gray-400 text-sm py-10">
                      No scraped tenders yet.
                    </td>
                  </tr>
                )}
                {tenders.map(tender => {
                  const status = STATUS_STYLES[tender.status];
                  return (
                    <tr key={tender.tenderName} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{tender.tenderId}</p>
                        <p className="text-xs text-gray-400">{formatCreatedAt(tender.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{tender.client || '—'}</p>
                      </td>
                      <td className="px-4 py-3 max-w-60">
                        <p className="text-gray-800">{tender.title}</p>
                        {tender.zipUrl && (
                          <a
                            href={tender.zipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Download docs (.zip)
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{tender.source || '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {formatValue(tender.value, tender.currency, tender.valueUnit)}
                      </td>
                      <td className="px-4 py-3"><DueCell dueDate={tender.dueDate} /></td>
                      <td className="px-4 py-3"><ScoreRing score={tender.score} /></td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                        {tender.status === 'pushed' && tender.pushedInquiryId && (
                          <button
                            onClick={() => navigate(`/inquiry/${encodeURIComponent(tender.pushedInquiryId!)}`)}
                            className="block mt-1 text-[11px] text-blue-600 hover:underline"
                          >
                            View inquiry →
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAnalyse(tender)}
                            disabled={busyId === tender.tenderName}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md disabled:opacity-40 ${
                              tender.analysed
                                ? 'text-gray-600 border border-gray-200 hover:bg-gray-50'
                                : 'text-white bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {busyId === tender.tenderName ? '…' : tender.analysed ? 'Re-analyse' : 'Analyse'}
                          </button>
                          <LeadActionMenu
                            tender={tender}
                            busy={busyId === tender.tenderName}
                            onApprove={() => handleApprove(tender)}
                            onReject={() => handleReject(tender)}
                            onPushToSales={() => handlePushToSales(tender)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 text-sm text-gray-500">
            <span>{total === 0 ? '0 tenders' : `Page ${page} of ${totalPages} · ${total} tenders`}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
