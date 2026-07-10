import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiLead } from '../lib/api';
import { api } from '../lib/api';
import AddLeadModal from '../components/AddLeadModal';
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

const AVL_STYLES: Record<ApiLead['avlStatus'], { label: string; className: string }> = {
  approved:       { label: 'APPROVED',       className: 'bg-green-50 text-green-700 border border-green-200' },
  review:         { label: 'REVIEW',         className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  not_registered: { label: 'NOT REGISTERED', className: 'bg-red-50 text-red-700 border border-red-200' },
};

const STATUS_STYLES: Record<ApiLead['status'], { label: string; className: string }> = {
  new:      { label: 'New',            className: 'bg-gray-100 text-gray-600' },
  approved: { label: 'Approved',       className: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Rejected',       className: 'bg-red-100 text-red-700' },
  pushed:   { label: 'Pushed to Sales', className: 'bg-green-100 text-green-700' },
};

export default function LeadEngine() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.leads.list()
      .then(setLeads)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(lead: ApiLead) {
    setLeads(prev => [lead, ...prev]);
    setShowAddModal(false);
  }

  function updateLead(updated: ApiLead) {
    setLeads(prev => prev.map(l => (l.leadId === updated.leadId ? updated : l)));
  }

  async function handleApprove(lead: ApiLead) {
    setBusyId(lead.leadId);
    try {
      updateLead(await api.leads.approve(lead.leadId));
    } catch (e) {
      alert(`Failed to approve lead: ${e}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(lead: ApiLead) {
    setBusyId(lead.leadId);
    try {
      updateLead(await api.leads.reject(lead.leadId));
    } catch (e) {
      alert(`Failed to reject lead: ${e}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePushToSales(lead: ApiLead) {
    setBusyId(lead.leadId);
    try {
      const { lead: updated } = await api.leads.pushToSales(lead.leadId);
      updateLead(updated);
    } catch (e) {
      alert(`Failed to push lead to sales: ${e}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Lead Engine</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Leads registered for screening. Push approved leads to the Sales Pipeline once ready.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 shrink-0"
        >
          + Add Lead
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading leads…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="text-left font-semibold px-4 py-2.5">Lead</th>
                  <th className="text-left font-semibold px-4 py-2.5">Client</th>
                  <th className="text-left font-semibold px-4 py-2.5">Tender / Title</th>
                  <th className="text-left font-semibold px-4 py-2.5">Source</th>
                  <th className="text-left font-semibold px-4 py-2.5">Value</th>
                  <th className="text-left font-semibold px-4 py-2.5">Due</th>
                  <th className="text-left font-semibold px-4 py-2.5">Score</th>
                  <th className="text-left font-semibold px-4 py-2.5">AVL Status</th>
                  <th className="text-left font-semibold px-4 py-2.5">Status</th>
                  <th className="text-right font-semibold px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center text-gray-400 text-sm py-10">
                      No leads yet. Click “Add Lead” to register one.
                    </td>
                  </tr>
                )}
                {leads.map(lead => {
                  const avl = AVL_STYLES[lead.avlStatus];
                  const status = STATUS_STYLES[lead.status];
                  return (
                    <tr key={lead.leadId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{lead.leadId}</p>
                        <p className="text-xs text-gray-400">{formatCreatedAt(lead.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.client}</p>
                        {lead.clientType && <p className="text-xs text-gray-400">{lead.clientType}</p>}
                      </td>
                      <td className="px-4 py-3 max-w-60">
                        {lead.tenderRef && (
                          <p className="text-xs font-mono text-blue-600 truncate">{lead.tenderRef}</p>
                        )}
                        <p className="text-gray-800">{lead.title}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.source}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {formatValue(lead.value, lead.currency, lead.valueUnit)}
                      </td>
                      <td className="px-4 py-3"><DueCell dueDate={lead.dueDate} /></td>
                      <td className="px-4 py-3"><ScoreRing score={lead.score} /></td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${avl.className}`}>
                          {avl.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                        {lead.status === 'pushed' && lead.pushedInquiryId && (
                          <button
                            onClick={() => navigate(`/inquiry/${encodeURIComponent(lead.pushedInquiryId!)}`)}
                            className="block mt-1 text-[11px] text-blue-600 hover:underline"
                          >
                            View inquiry →
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <LeadActionMenu
                          lead={lead}
                          busy={busyId === lead.leadId}
                          onApprove={() => handleApprove(lead)}
                          onReject={() => handleReject(lead)}
                          onPushToSales={() => handlePushToSales(lead)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddLeadModal
          existingLeads={leads}
          onSaved={handleSaved}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
