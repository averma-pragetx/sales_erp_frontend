import { useState } from 'react';
import type { ApiInquiry } from '../lib/api';

interface Props {
  onClose: () => void;
  onCreated: (inquiry: ApiInquiry) => void;
}

function formatBidDue(isoDate: string): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [, monthStr, dayStr] = isoDate.split('-');
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  return `${day}-${MONTHS[month - 1]}`;
}

function calcDaysToBid(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(isoDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const autoId = 'OEL/EST/2026/' + String(Date.now()).slice(-4);
const today = new Date().toISOString().slice(0, 10);

export default function NewInquiryModal({ onClose, onCreated }: Props) {
  const [inquiryId, setInquiryId] = useState(autoId);
  const [client, setClient] = useState('');
  const [project, setProject] = useState('');
  const [scope, setScope] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [valueUnit, setValueUnit] = useState<'Mn' | 'Cr'>('Mn');
  const [priority, setPriority] = useState<'P1' | 'P2' | 'P3'>('P2');
  const [source, setSource] = useState('Direct intake');
  const [estimator, setEstimator] = useState('');
  const [bidDue, setBidDue] = useState('');
  const [receivedDate, setReceivedDate] = useState(today);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inquiryId || !client || !project || !scope || !value || !bidDue || !receivedDate) {
      setError('Please fill in all required fields.');
      return;
    }

    const daysToBid = calcDaysToBid(bidDue);
    const bidDueFormatted = formatBidDue(bidDue);

    const payload: Omit<ApiInquiry, '_id' | 'createdAt'> = {
      inquiryId,
      client,
      project,
      scope,
      value: parseFloat(value),
      currency,
      valueUnit,
      priority,
      source,
      estimator,
      bidDue: bidDueFormatted,
      receivedDate,
      daysToBid,
      cluster: 'intake',
      currentStage: 1,
      currentStageName: 'RFQ Received',
      completedUpTo: 0,
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: ApiInquiry = await res.json();
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">New Inquiry</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Row 1: Inquiry ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Inquiry ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={inquiryId}
                onChange={(e) => setInquiryId(e.target.value)}
                placeholder="OEL/EST/2026/0420"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-mono"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Row 2: Client + Project */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Client <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="e.g. TCE, L&T"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Project / End Customer <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. IOCL Paradip"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Row 3: Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Scope / Package <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="e.g. Chemical Dosing Skid"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Row 4: Value + Currency + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Value <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'USD' | 'INR')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                <select
                  value={valueUnit}
                  onChange={(e) => setValueUnit(e.target.value as 'Mn' | 'Cr')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
                >
                  <option value="Mn">Mn</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 5: Priority + Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'P1' | 'P2' | 'P3')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                <option value="P1">P1 — High</option>
                <option value="P2">P2 — Medium</option>
                <option value="P3">P3 — Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                <option value="Direct intake">Direct intake</option>
                <option value="EPC Tender">EPC Tender</option>
                <option value="Client Portal">Client Portal</option>
                <option value="Agent referral">Agent referral</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Row 6: Estimator + Bid Due */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Estimator</label>
              <input
                type="text"
                value={estimator}
                onChange={(e) => setEstimator(e.target.value)}
                placeholder="Name or initials"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Bid Due <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={bidDue}
                onChange={(e) => setBidDue(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Row 7: Received Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Received Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-2.5 px-4 rounded-lg text-white text-sm font-semibold transition-colors ${
                submitting
                  ? 'bg-indigo-400 opacity-50 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {submitting ? 'Creating…' : 'Create Inquiry'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 rounded-lg text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
