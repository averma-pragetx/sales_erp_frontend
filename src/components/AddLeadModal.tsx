import { useEffect, useRef, useState } from 'react';
import type { ApiLead, NewLeadPayload } from '../lib/api';
import { api } from '../lib/api';

function suggestLeadId(existing: ApiLead[]): string {
  const nums = existing
    .map(l => l.leadId)
    .filter(id => id.startsWith('L-'))
    .map(id => parseInt(id.slice(2), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 2850;
  return `L-${next}`;
}

interface Props {
  existingLeads: ApiLead[];
  onSaved: (lead: ApiLead) => void;
  onClose: () => void;
}

export default function AddLeadModal({ existingLeads, onSaved, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    leadId:     suggestLeadId(existingLeads),
    client:     '',
    clientType: '',
    tenderRef:  '',
    title:      '',
    source:     '',
    value:      '',
    currency:   'USD' as 'USD' | 'INR',
    valueUnit:  'Mn' as 'Mn' | 'Cr',
    dueDate:    '',
    avlStatus:  'not_registered' as 'approved' | 'not_registered' | 'review',
    score:      '',
    assignedTo: '',
    notes:      '',
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    const { leadId, client, title, source, value, dueDate } = form;
    if (!leadId || !client || !title || !source || !value || !dueDate) {
      setErr('Please fill in all required fields.');
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setErr('Value must be a positive number.');
      return;
    }
    let score: number | null = null;
    if (form.score.trim() !== '') {
      const n = parseFloat(form.score);
      if (isNaN(n) || n < 0 || n > 100) {
        setErr('Score must be a number between 0 and 100.');
        return;
      }
      score = n;
    }

    const payload: NewLeadPayload = {
      leadId,
      client,
      clientType: form.clientType,
      tenderRef: form.tenderRef,
      title,
      source,
      value: numValue,
      currency: form.currency,
      valueUnit: form.valueUnit,
      dueDate,
      avlStatus: form.avlStatus,
      score,
      assignedTo: form.assignedTo,
      notes: form.notes,
    };

    setSaving(true);
    setErr(null);
    try {
      const saved = await api.leads.create(payload);
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
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100" style={{ borderLeft: '4px solid #2563eb' }}>
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Lead</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manually register a new lead for screening.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Lead ID */}
          <div>
            <label className="field-label">Lead ID *</label>
            <input className="field-input font-mono"
              value={form.leadId}
              onChange={e => set('leadId', e.target.value)}
              placeholder="L-2850"
            />
          </div>

          {/* Client + Client type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Client *</label>
              <input className="field-input" value={form.client}
                onChange={e => set('client', e.target.value)} placeholder="BPCL Bina Petchem" />
            </div>
            <div>
              <label className="field-label">Client Type</label>
              <input className="field-input" value={form.clientType}
                onChange={e => set('clientType', e.target.value)} placeholder="PSU · End User" />
            </div>
          </div>

          {/* Tender ref + Title */}
          <div>
            <label className="field-label">Tender Ref</label>
            <input className="field-input" value={form.tenderRef}
              onChange={e => set('tenderRef', e.target.value)} placeholder="B957-300-EE-MR-6340/139" />
          </div>
          <div>
            <label className="field-label">Title / Scope *</label>
            <input className="field-input" value={form.title}
              onChange={e => set('title', e.target.value)} placeholder="Heat Exchangers — CS/LTCS (12 tags)" />
          </div>

          {/* Source */}
          <div>
            <label className="field-label">Source *</label>
            <input className="field-input" value={form.source}
              onChange={e => set('source', e.target.value)} placeholder="EIL Tender Portal, GeM, LinkedIn…" />
          </div>

          {/* Value + Currency + Unit */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">Value *</label>
              <input className="field-input" type="number" min="0" step="0.01"
                value={form.value} onChange={e => set('value', e.target.value)} placeholder="15.86" />
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

          {/* Due date + AVL status + Score */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">Due Date *</label>
              <input className="field-input" type="date"
                value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
            <div>
              <label className="field-label">AVL Status</label>
              <select className="field-input" value={form.avlStatus}
                onChange={e => set('avlStatus', e.target.value)}>
                <option value="approved">Approved</option>
                <option value="review">Review</option>
                <option value="not_registered">Not Registered</option>
              </select>
            </div>
            <div>
              <label className="field-label">Score (0-100)</label>
              <input className="field-input" type="number" min="0" max="100"
                value={form.score} onChange={e => set('score', e.target.value)} placeholder="94" />
            </div>
          </div>

          {/* Assigned to + notes */}
          <div>
            <label className="field-label">Assign To</label>
            <input className="field-input" value={form.assignedTo}
              onChange={e => set('assignedTo', e.target.value)} placeholder="Sneha B." />
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea className="field-input" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Optional context for the reviewer…" />
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
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving…' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
