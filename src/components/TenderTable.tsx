import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiScrapedTender, ApiTenderFile } from '../lib/api';
import { api } from '../lib/api';
import LeadActionMenu from './LeadActionMenu';

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

function formatSize(bytes: number): string {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-6 py-2 border-b border-dotted border-gray-200 last:border-0">
      <span className="w-32 shrink-0 font-mono text-xs text-gray-400">{label}</span>
      <span className="font-mono text-sm text-gray-800">{value || '—'}</span>
    </div>
  );
}

function DocsDialog({
  tender,
  // busy,
  // onPushToSales,
  onClose,
}: {
  tender: ApiScrapedTender;
  busy: boolean;
  onPushToSales: () => void;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<ApiTenderFile[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    api.scrapedTenders.files(tender.tenderName)
      .then(({ files }) => setFiles(files))
      .catch(e => setError(String(e)));
  }, [tender.tenderName]);

  const file = files?.[selected] ?? null;

  useEffect(() => {
    if (!file || file.meta || file.mimeType !== 'application/pdf') return;
    const fileName = file.fileName;
    setAnalysing(true);
    setMetaError(null);
    api.scrapedTenders.analyseFile(tender.tenderName, fileName)
      .then(({ meta }) =>
        setFiles(prev => prev?.map(f => (f.fileName === fileName ? { ...f, meta } : f)) ?? prev)
      )
      .catch(e => setMetaError(String(e)))
      .finally(() => setAnalysing(false));
  }, [tender.tenderName, file]);

  const meta = file?.meta ?? null;
  const dueDays = meta?.dueDate ? daysUntil(meta.dueDate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Attached Documents · {tender.client || tender.title}
            </h2>
            <p className="font-mono text-xs text-gray-400 mt-0.5">
              {tender.tenderId} · {files ? `${files.length} files` : '…'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="flex-1 flex gap-4 p-5 min-h-0">
          <div className="w-72 shrink-0 bg-gray-50 rounded-lg border border-gray-200 p-3 overflow-y-auto">
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!error && files === null && <p className="text-sm text-gray-400">Loading documents…</p>}
            {files?.length === 0 && <p className="text-sm text-gray-400">No documents found.</p>}
            {files?.map((f, i) => (
              <button
                key={f.fileName}
                onClick={() => setSelected(i)}
                className={`w-full flex items-center gap-3 text-left rounded-lg border px-3 py-3 mb-2 bg-white ${
                  i === selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="shrink-0 w-9 h-9 rounded-md bg-red-50 text-red-600 text-[10px] font-bold flex items-center justify-center">
                  PDF
                </span>
                <span className="text-sm text-gray-800 break-all">{f.fileName}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 rounded-lg border border-gray-200 p-5 overflow-y-auto">
            {!file && <p className="text-sm text-gray-400">Select a document.</p>}
            {file && (
              <>
                <a
                  href={api.scrapedTenders.fileUrl(tender.tenderName, file.fileName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-bold text-gray-900 hover:underline"
                >
                  {file.fileName}
                </a>
                <p className="font-mono text-xs text-gray-500 mt-1">
                  {[meta?.docType, formatSize(file.fileSize), meta ? `${meta.pages} pages` : null,
                    `uploaded ${new Date(tender.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`]
                    .filter(Boolean).join(' · ')}
                </p>

                {analysing && <p className="text-sm text-gray-400 mt-6">Analysing with Gemini…</p>}
                {metaError && <p className="text-sm text-red-500 mt-6">{metaError}</p>}
                {!analysing && !metaError && meta && (
                  <>
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mt-6 mb-1">
                      Cover Sheet — Extract
                    </h3>
                    <MetaRow label="Tender No." value={meta.tenderNo} />
                    <MetaRow label="Client" value={meta.client} />
                    <MetaRow label="Package" value={meta.package} />
                    <MetaRow label="Due in" value={dueDays !== null ? `${dueDays} days` : ''} />
                    <MetaRow label="Est. value" value={meta.estValue} />

                    {meta.sections.length > 0 && (
                      <>
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mt-6 mb-2">
                          Auto-Extracted Contents
                        </h3>
                        <ul className="list-disc pl-5 space-y-1.5">
                          {meta.sections.map(s => (
                            <li key={s} className="text-sm text-gray-700">{s}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-100"
          >
            Close
          </button>
          {tender.hasZip && (
            <a
              href={api.scrapedTenders.zipUrl(tender.tenderName)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-100"
            >
              ⭳ Download all (.zip)
            </a>
          )}
          {/* <button
            onClick={onPushToSales}
            disabled={busy || tender.status === 'pushed'}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40"
          >
            → Send to Estimation Vault
          </button> */}
        </div>
      </div>
    </div>
  );
}

export default function TenderTable({ scraperId, limit }: { scraperId?: string; limit?: number }) {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<ApiScrapedTender[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [docsFor, setDocsFor] = useState<ApiScrapedTender | null>(null);

  useEffect(() => {
    // ponytail: fetch once, paginate client-side; 1000 cap fine at demo scale
    api.scrapedTenders.list(1, limit ?? 1000, scraperId)
      .then(({ items }) => setTenders(items))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [limit, scraperId]);

  const total = tenders.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible = tenders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateTender(updated: ApiScrapedTender) {
    setTenders(prev => prev.map(t => (t.tenderName === updated.tenderName ? updated : t)));
    setDocsFor(prev => (prev && prev.tenderName === updated.tenderName ? updated : prev));
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

  if (loading) return <p className="text-sm text-gray-400">Loading tenders…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
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
              <th className="text-left font-semibold px-4 py-2.5">Docs</th>
              <th className="text-left font-semibold px-4 py-2.5">Status</th>
              <th className="text-left font-semibold px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-gray-400 text-sm py-10">
                  No scraped tenders yet.
                </td>
              </tr>
            )}
            {visible.map(tender => {
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
                    {tender.hasZip && (
                      <a
                        href={api.scrapedTenders.zipUrl(tender.tenderName)}
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
                    <button
                      onClick={() => setDocsFor(tender)}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      View docs
                    </button>
                  </td>
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

      {docsFor && (
        <DocsDialog
          tender={docsFor}
          busy={busyId === docsFor.tenderName}
          onPushToSales={() => handlePushToSales(docsFor)}
          onClose={() => setDocsFor(null)}
        />
      )}
    </div>
  );
}
