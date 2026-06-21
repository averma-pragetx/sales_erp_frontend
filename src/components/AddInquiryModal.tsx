import { useEffect, useRef, useState } from 'react';
import type { ClusterKey } from '../types';
import type { ApiInquiry, NewInquiryPayload } from '../lib/api';
import { api } from '../lib/api';
import { CLUSTERS } from '../data';
import { STAGES } from '../data/stages';

// First stage of each cluster
const CLUSTER_ENTRY_STAGE: Record<ClusterKey, number> = {
  intake:     1,
  estimation: 3,
  proposal:   8,
  bid_active: 10,
  outcome:    12,
};

function suggestId(existing: ApiInquiry[]): string {
  const year = new Date().getFullYear();
  const prefix = `OEL/EST/${year}/`;
  const nums = existing
    .map(i => i.inquiryId)
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.slice(prefix.length), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 401;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function daysToBidFromDate(bidDue: string): number {
  if (!bidDue) return 0;
  const due = new Date(bidDue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function formatBidDue(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(' ', '-');
}

interface Props {
  clusterKey: ClusterKey;
  existingInquiries: ApiInquiry[];
  onSaved: (inq: ApiInquiry) => void;
  onClose: () => void;
}

export default function AddInquiryModal({ clusterKey, existingInquiries, onSaved, onClose }: Props) {
  const cluster = CLUSTERS.find(c => c.key === clusterKey)!;
  const entryStageNum = CLUSTER_ENTRY_STAGE[clusterKey];
  const entryStage = STAGES.find(s => s.num === entryStageNum)!;

  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    inquiryId:    suggestId(existingInquiries),
    client:       '',
    project:      '',
    scope:        '',
    value:        '',
    currency:     'USD' as 'USD' | 'INR',
    valueUnit:    'Mn' as 'Mn' | 'Cr',
    priority:     'P2' as 'P1' | 'P2' | 'P3',
    bidDue:       '',
    receivedDate: new Date().toISOString().slice(0, 10),
    source:       '',
    estimator:    '',
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { inquiryId, client, project, scope, value, bidDue, estimator } = form;
    if (!inquiryId || !client || !project || !scope || !value || !bidDue || !estimator) {
      setErr('Please fill in all required fields.');
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setErr('Value must be a positive number.');
      return;
    }

    const payload: NewInquiryPayload = {
      inquiryId,
      client,
      project,
      scope,
      value: numValue,
      currency: form.currency,
      valueUnit: form.valueUnit,
      priority: form.priority,
      currentStage: entryStageNum,
      currentStageName: entryStage.name,
      cluster: clusterKey,
      daysToBid: daysToBidFromDate(bidDue),
      bidDue: formatBidDue(bidDue),
      receivedDate: form.receivedDate,
      source: form.source || 'Direct intake',
      estimator,
      completedUpTo: 0,
    };

    setSaving(true);
    setErr(null);
    try {
      const saved = await api.inquiries.create(payload);
      onSaved(saved);
    } catch (e) {
      setErr(String(e));
      setSaving(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Modal header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderLeft: `4px solid ${cluster.borderColor}`, borderBottom: '1px solid #e5e7eb' }}
        >
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Inquiry — {cluster.label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Starts at Stage {entryStageNum} · {entryStage.name} · Owner: {entryStage.owner}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Inquiry ID */}
          <div>
            <label className="field-label">Inquiry ID *</label>
            <input className="field-input font-mono"
              value={form.inquiryId}
              onChange={e => set('inquiryId', e.target.value)}
              placeholder="OEL/EST/2026/0420"
            />
          </div>

          {/* Client + Project */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Client *</label>
              <input className="field-input" value={form.client}
                onChange={e => set('client', e.target.value)} placeholder="EIL, L&T, Wood…" />
            </div>
            <div>
              <label className="field-label">Project *</label>
              <input className="field-input" value={form.project}
                onChange={e => set('project', e.target.value)} placeholder="Dangote Phase III" />
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="field-label">Package / Scope *</label>
            <input className="field-input" value={form.scope}
              onChange={e => set('scope', e.target.value)} placeholder="Chemical Dosing Skid — 4 packages" />
          </div>

          {/* Value + Currency + Unit */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">Value *</label>
              <input className="field-input" type="number" min="0" step="0.01"
                value={form.value} onChange={e => set('value', e.target.value)} placeholder="2.07" />
            </div>
            <div>
              <label className="field-label">Currency</label>
              <select className="field-input" value={form.currency}
                onChange={e => set('currency', e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Unit</label>
              <select className="field-input" value={form.valueUnit}
                onChange={e => set('valueUnit', e.target.value)}>
                <option value="Mn">Mn</option>
                <option value="Cr">Cr</option>
              </select>
            </div>
          </div>

          {/* Priority + Bid Due + Received */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">Priority</label>
              <select className="field-input" value={form.priority}
                onChange={e => set('priority', e.target.value)}>
                <option value="P1">P1 — Critical</option>
                <option value="P2">P2 — High</option>
                <option value="P3">P3 — Normal</option>
              </select>
            </div>
            <div>
              <label className="field-label">Bid Due</label>
              <input className="field-input" type="date"
                value={form.bidDue} onChange={e => set('bidDue', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Received Date</label>
              <input className="field-input" type="date"
                value={form.receivedDate} onChange={e => set('receivedDate', e.target.value)} />
            </div>
          </div>

          {/* Estimator + Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Estimator *</label>
              <input className="field-input" value={form.estimator}
                onChange={e => set('estimator', e.target.value)} placeholder="Sneha Bharti" />
            </div>
            <div>
              <label className="field-label">Source</label>
              <input className="field-input" value={form.source}
                onChange={e => set('source', e.target.value)} placeholder="Direct intake, EPC Tender…" />
            </div>
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ background: cluster.borderColor }}
          >
            {saving ? 'Saving…' : 'Add Inquiry'}
          </button>
        </div>
      </div>
    </div>
  );
}
