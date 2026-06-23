import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import jsPDF from 'jspdf';
import type { Inquiry } from '../types';
import type { Stage } from '../data/stages';
import { CLUSTER_COLORS, STAGES } from '../data/stages';
import type {
  ApiDocument,
  ApiInquiry,
  ApiSection,
  ApiSectionsByDoc,
  ApiStage3,
  ApiStage4,
  ApiStage6,
  ApiStage7,
  ApiStage8,
  BomItem,
  GapItem,
  Stage3EmailDraft,
  Stage3GapAnalysis,
  TechQuery,
} from '../lib/api';
import { api } from '../lib/api';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function formatINR(n: number): string {
  return '₹' + new Intl.NumberFormat('en-IN').format(Math.round(n));
}

async function markStageComplete(
  inquiryId: string,
  stageNum: number,
  onRefresh: () => void,
): Promise<void> {
  const nextNum = stageNum + 1;
  const nextName = STAGES.find(s => s.num === nextNum)?.name ?? '';
  await api.inquiries.advance(
    inquiryId,
    stageNum,
    Math.min(nextNum, 14),
    nextName,
  );
  onRefresh();
}

// ─── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  read: 'text-green-700',
  open: 'text-amber-600',
  queued: 'text-gray-400',
};

// ─── Stage Header ──────────────────────────────────────────────────────────────
interface StageHeaderProps {
  stage: Stage;
  isCompleted: boolean;
  isCurrent: boolean;
  clusterColor: string;
}

function StageHeader({ stage, isCompleted, isCurrent, clusterColor }: StageHeaderProps) {
  return (
    <>
      <div className="flex items-start gap-3 mb-1">
        <span
          className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={isCompleted ? { background: '#16a34a' } : { background: clusterColor }}
        >
          {isCompleted ? (
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="text-xs font-bold text-white">{stage.num}</span>
          )}
        </span>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">{stage.name}</h2>
            <span className="text-sm text-gray-400">Owner: {stage.owner}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{stage.description}</p>
        </div>
      </div>

      {isCompleted && (
        <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
          Complete · read-only
        </span>
      )}
      {isCurrent && (
        <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          In progress
        </span>
      )}
      {!isCompleted && !isCurrent && (
        <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
          Pending
        </span>
      )}
    </>
  );
}

// ─── Metadata grid (Stage 1) ───────────────────────────────────────────────────
function MetadataGrid({ inquiry, apiData }: { inquiry: Inquiry; apiData: ApiInquiry }) {
  const fields = [
    { label: 'CLIENT', value: `${inquiry.client} · ${inquiry.project}` },
    { label: 'PACKAGE', value: inquiry.scope },
    { label: 'OSWAL REF.', value: inquiry.id },
    {
      label: 'VALUE',
      value: `${inquiry.currency === 'USD' ? '$ ' : '₹'}${inquiry.value.toFixed(2)} ${inquiry.valueUnit}`,
    },
    { label: 'PRIORITY', value: inquiry.priority },
    { label: 'RECEIVED', value: apiData.receivedDate },
    { label: 'BID DUE', value: apiData.bidDue },
    { label: 'SOURCE', value: apiData.source },
  ];
  return (
    <div className="grid grid-cols-3 gap-x-8 gap-y-5 mt-5">
      {fields.map(f => (
        <div key={f.label}>
          <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">
            {f.label}
          </p>
          <p className="text-sm text-gray-900">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Upload form ───────────────────────────────────────────────────────────────
interface UploadFormProps {
  inquiryId: string;
  onUploaded: (doc: ApiDocument) => void;
}

function UploadForm({ inquiryId, onUploaded }: UploadFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [docType, setDocType] = useState('');
  const [title, setTitle] = useState('');
  const [rev, setRev] = useState('');
  const [status, setStatus] = useState<'read' | 'open' | 'queued'>('open');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr('Select a file.'); return; }
    if (!docType.trim() || !title.trim()) { setErr('Doc type and title are required.'); return; }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('docType', docType.trim().toUpperCase());
    fd.append('title', title.trim());
    fd.append('rev', rev.trim() || '–');
    fd.append('status', status);

    setUploading(true);
    setErr(null);
    try {
      const doc = await api.documents.upload(inquiryId, fd);
      onUploaded(doc);
      setDocType(''); setTitle(''); setRev(''); setStatus('open');
      if (fileRef.current) fileRef.current.value = '';
      setOpen(false);
    } catch (e) {
      setErr(String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-8 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Upload project documents</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">RFQ · datasheets · specifications · drawings</span>
          <button
            type="button"
            onClick={() => { setOpen(o => !o); setErr(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {open ? '✕ Cancel' : '↑ Upload Document'}
          </button>
        </div>
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4"
        >
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                Doc Type *
              </label>
              <input
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="RFQ, MR, BDS…"
                value={docType}
                onChange={e => setDocType(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                Title *
              </label>
              <input
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Document title"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                Rev
              </label>
              <input
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="A, B, 0…"
                value={rev}
                onChange={e => setRev(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                Status
              </label>
              <select
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                value={status}
                onChange={e => setStatus(e.target.value as 'read' | 'open' | 'queued')}
              >
                <option value="open">open</option>
                <option value="read">read</option>
                <option value="queued">queued</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                File *
              </label>
              <input
                ref={fileRef}
                type="file"
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>

          {err && <p className="text-xs text-red-500 mb-2">{err}</p>}

          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Uploaded documents table ─────────────────────────────────────────────────
function UploadedDocsTable({
  docs,
  onDocumentsChange,
}: {
  docs: ApiDocument[];
  onDocumentsChange: (docs: ApiDocument[]) => void;
}) {
  async function handleDelete(docId: string) {
    if (!confirm('Remove this document?')) return;
    await api.documents.delete(docId);
    onDocumentsChange(docs.filter(d => d._id !== docId));
  }

  if (docs.length === 0) return null;

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          {['DOC', 'TITLE', 'REV', 'STATUS', 'ACTIONS'].map(h => (
            <th key={h} className="text-[10px] font-bold tracking-widest text-gray-400 text-left pb-2 pr-4">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {docs.map(d => (
          <tr key={d._id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-3 pr-4 font-mono text-xs text-indigo-600 font-semibold">{d.docType}</td>
            <td className="py-3 pr-4 text-sm text-gray-800">{d.title}</td>
            <td className="py-3 pr-4 text-sm text-gray-500">{d.rev}</td>
            <td className={`py-3 pr-4 text-sm font-medium ${STATUS_STYLES[d.status]}`}>{d.status}</td>
            <td className="py-3">
              <div className="flex items-center gap-2">
                {d.hasFile && d.presignedUrl ? (
                  <a
                    href={d.presignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-50"
                  >
                    View
                  </a>
                ) : (
                  <span className="px-3 py-1 text-xs text-gray-300 border border-gray-100 rounded-md">View</span>
                )}
                <button
                  onClick={() => handleDelete(d._id)}
                  className="px-3 py-1 text-xs font-medium text-red-500 border border-red-100 rounded-md hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Section view modal ────────────────────────────────────────────────────────
function SectionViewModal({
  section,
  onClose,
  onSaved,
}: {
  section: ApiSection;
  onClose: () => void;
  onSaved: (updated: ApiSection) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [summary, setSummary] = useState(section.summary);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    setSummary(section.summary);
    setEditMode(false);
  }, [section._id, section.summary]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    setSaveErr(null);
    try {
      const updated = await api.sections.update(section._id, { summary });
      onSaved(updated);
      setEditMode(false);
    } catch (e) {
      setSaveErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[11px] font-bold text-white bg-slate-800 px-2 py-0.5 rounded shrink-0">
                  {section.docType}
                </span>
                <span className="text-xs text-gray-400 truncate">{section.documentTitle}</span>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-snug">{section.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">Section {section.sectionIndex + 1}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Summary — editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Summary</p>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {editMode ? (
              <div>
                <textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  rows={5}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none leading-relaxed"
                />
                {saveErr && <p className="text-xs text-red-500 mt-1.5">{saveErr}</p>}
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setSummary(section.summary); setSaveErr(null); }}
                    className="px-4 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">
                {summary || <span className="italic text-gray-400">No summary.</span>}
              </p>
            )}
          </div>

          {/* Full content — read-only */}
          {section.content && (
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">Full Content</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sections list (content of "Attached RFQ Documents") ──────────────────────
function SectionsList({
  sectionsByDoc,
  onView,
}: {
  sectionsByDoc: ApiSectionsByDoc[];
  onView: (s: ApiSection) => void;
}) {
  return (
    <div className="space-y-5">
      {sectionsByDoc.map(group => (
        <div key={group.documentId}>
          {sectionsByDoc.length > 1 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[11px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded">
                {group.docType}
              </span>
              <span className="text-xs font-medium text-gray-700">{group.documentTitle}</span>
              <span className="text-[11px] text-gray-400">
                {group.sections.length} section{group.sections.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {group.sections.map((sec, i) => (
              <div
                key={sec._id}
                className={`flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                  i < group.sections.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {sec.sectionIndex + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{sec.title}</p>
                  {sec.summary && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{sec.summary}</p>
                  )}
                </div>
                <button
                  onClick={() => onView(sec)}
                  className="shrink-0 px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stage 1: RFQ Received ─────────────────────────────────────────────────────
interface Stage1ContentProps {
  inquiry: Inquiry;
  apiData: ApiInquiry;
  documents: ApiDocument[];
  onDocumentsChange: (docs: ApiDocument[]) => void;
}

function Stage1Content({ inquiry, apiData, documents, onDocumentsChange }: Stage1ContentProps) {
  const [extracting, setExtracting] = useState(false);
  const [extractErr, setExtractErr] = useState<string | null>(null);
  const [sectionsByDoc, setSectionsByDoc] = useState<ApiSectionsByDoc[]>([]);
  const [viewSection, setViewSection] = useState<ApiSection | null>(null);

  const totalSections = sectionsByDoc.reduce((n, g) => n + g.sections.length, 0);

  // Load already-extracted sections on mount
  useEffect(() => {
    api.sections.listForInquiry(inquiry.id)
      .then(res => setSectionsByDoc(res.documents))
      .catch(() => {});
  }, [inquiry.id]);

  async function refreshSections() {
    const res = await api.sections.listForInquiry(inquiry.id);
    setSectionsByDoc(res.documents);
  }

  function handleUploaded(doc: ApiDocument) {
    onDocumentsChange([...documents, doc]);
  }

  async function handleExtract(force = false) {
    setExtracting(true);
    setExtractErr(null);
    try {
      const res = await api.extract.triggerInquiry(inquiry.id, force);

      // Merge AI fields back into documents list so processingStatus updates
      const aiMap = new Map(res.documents.map(r => [r._id, r]));
      onDocumentsChange(documents.map(doc => {
        const ai = aiMap.get(doc._id);
        if (!ai) return doc;
        return { ...doc, processingStatus: ai.processingStatus, processingError: ai.processingError ?? '', aiSummary: ai.aiSummary, keyItems: ai.keyItems, extractedSections: ai.extractedSections };
      }));

      // Surface any per-document errors
      const failed = res.documents.filter(d => d.processingStatus === 'failed');
      if (failed.length > 0) {
        setExtractErr(
          failed.map(d => `${d.docType} — ${d.processingError || 'unknown error'}`).join('\n'),
        );
      }

      await refreshSections();
    } catch (e) {
      setExtractErr(String(e));
    } finally {
      setExtracting(false);
    }
  }

  function handleSectionSaved(updated: ApiSection) {
    setSectionsByDoc(prev =>
      prev.map(group => ({
        ...group,
        sections: group.sections.map(s => s._id === updated._id ? { ...s, ...updated } : s),
      })),
    );
    setViewSection(prev => prev?._id === updated._id ? { ...prev, ...updated } : prev);
  }

  const hasUploadedDocs = documents.some(d => d.hasFile);
  const anyExtracted    = documents.some(d => d.processingStatus !== 'pending');

  return (
    <>
      <MetadataGrid inquiry={inquiry} apiData={apiData} />

      {/* ── Uploaded documents ────────────────────────────────────────────── */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Uploaded documents</h3>
        <UploadedDocsTable docs={documents} onDocumentsChange={onDocumentsChange} />
        <UploadForm inquiryId={inquiry.id} onUploaded={handleUploaded} />
      </div>

      {/* ── Attached RFQ documents (extracted sections) ───────────────────── */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Attached RFQ documents</h3>
            {totalSections > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                {totalSections}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {anyExtracted && !extracting && (
              <button
                onClick={() => handleExtract(true)}
                className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2"
              >
                Re-extract
              </button>
            )}
            <button
              onClick={() => handleExtract(false)}
              disabled={extracting || !hasUploadedDocs}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
            >
              {extracting ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" />
                  </svg>
                  Extracting…
                </>
              ) : '✦ AI Extract from RFQ'}
            </button>
          </div>
        </div>

        {extractErr && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 whitespace-pre-wrap font-mono">
            {extractErr}
          </div>
        )}

        {totalSections > 0 ? (
          <SectionsList sectionsByDoc={sectionsByDoc} onView={sec => setViewSection(sec)} />
        ) : (
          <div className="py-10 text-center rounded-lg border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">
              {hasUploadedDocs
                ? 'Click "AI Extract from RFQ" to extract sections from your uploaded document.'
                : 'Upload an RFQ document above, then click "AI Extract from RFQ".'}
            </p>
          </div>
        )}
      </div>

      {viewSection && (
        <SectionViewModal
          section={viewSection}
          onClose={() => setViewSection(null)}
          onSaved={handleSectionSaved}
        />
      )}
    </>
  );
}

// ─── Stage 2 helpers ──────────────────────────────────────────────────────────

const DECISION_CONFIG = {
  ok:      { label: 'OK',     bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  flagged: { label: 'Flag',   bg: 'bg-amber-100',  text: 'text-amber-700', border: 'border-amber-300' },
  issue:   { label: 'Issue',  bg: 'bg-red-100',    text: 'text-red-700',   border: 'border-red-300'   },
} as const;

function DecisionBadge({ decision }: { decision: ApiSection['reviewDecision'] }) {
  if (!decision || decision === 'pending') return null;
  const c = DECISION_CONFIG[decision as keyof typeof DECISION_CONFIG];
  if (!c) return null;
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}

interface SectionReviewRowProps {
  sec: ApiSection;
  onUpdate: (updated: ApiSection) => void;
  onView: (sec: ApiSection) => void;
}

function SectionReviewRow({ sec, onUpdate, onView }: SectionReviewRowProps) {
  const [noteText, setNoteText] = useState(sec.reviewNote ?? '');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { setNoteText(sec.reviewNote ?? ''); }, [sec._id, sec.reviewNote]);

  async function handleDecision(d: ApiSection['reviewDecision']) {
    if (d === sec.reviewDecision) return;
    try {
      const updated = await api.sections.update(sec._id, { reviewDecision: d });
      onUpdate(updated);
    } catch { /* silent */ }
  }

  async function handleNoteBlur() {
    if (noteText === (sec.reviewNote ?? '')) return;
    setSavingNote(true);
    try {
      const updated = await api.sections.update(sec._id, { reviewNote: noteText });
      onUpdate(updated);
    } catch { /* silent */ } finally {
      setSavingNote(false);
    }
  }

  const decision  = sec.reviewDecision ?? 'pending';
  const showNote  = decision === 'flagged' || decision === 'issue';

  return (
    <div className="px-4 py-3.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors">
      <div className="flex items-start gap-3">
        {/* Index badge */}
        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          {sec.sectionIndex + 1}
        </span>

        {/* Title + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{sec.title}</p>
            <DecisionBadge decision={sec.reviewDecision} />
          </div>
          {sec.summary && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{sec.summary}</p>
          )}
        </div>

        {/* Decision buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {(['ok', 'flagged', 'issue'] as const).map(d => {
            const c = DECISION_CONFIG[d];
            const active = decision === d;
            return (
              <button
                key={d}
                onClick={() => handleDecision(active ? 'pending' : d)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                  active
                    ? `${c.bg} ${c.text} ${c.border}`
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* View/Edit */}
        <button
          onClick={() => onView(sec)}
          className="shrink-0 px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
        >
          View
        </button>
      </div>

      {/* Inline note — shown when flagged or issue */}
      {showNote && (
        <div className="mt-2 ml-8">
          <textarea
            rows={2}
            placeholder="Add a note…"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onBlur={handleNoteBlur}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none bg-white placeholder-gray-300"
          />
          {savingNote && <p className="text-[10px] text-gray-400 mt-0.5">Saving…</p>}
        </div>
      )}
    </div>
  );
}

// ─── Stage 2: Go/No-Go Review ──────────────────────────────────────────────────
interface Stage2ContentProps {
  inquiry: Inquiry;
  apiData: ApiInquiry;
  onRefresh: () => void;
}

function Stage2Content({ inquiry, apiData, onRefresh }: Stage2ContentProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sectionsByDoc, setSectionsByDoc] = useState<ApiSectionsByDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewSection, setViewSection] = useState<ApiSection | null>(null);

  useEffect(() => {
    setLoading(true);
    api.sections.listForInquiry(inquiry.id)
      .then(res => setSectionsByDoc(res.documents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [inquiry.id]);

  const allSections = sectionsByDoc.flatMap(g => g.sections);
  const reviewed    = allSections.filter(s => s.reviewDecision !== 'pending').length;
  const issues      = allSections.filter(s => s.reviewDecision === 'issue').length;
  const flagged     = allSections.filter(s => s.reviewDecision === 'flagged').length;
  const isPursued   = apiData.completedUpTo >= 2;

  function handleSectionUpdate(updated: ApiSection) {
    setSectionsByDoc(prev =>
      prev.map(g => ({
        ...g,
        sections: g.sections.map(s => s._id === updated._id ? { ...s, ...updated } : s),
      })),
    );
    setViewSection(prev => prev?._id === updated._id ? { ...prev, ...updated } : prev);
  }

  async function handlePursue() {
    setBusy(true);
    setErr(null);
    try {
      await markStageComplete(inquiry.id, 2, onRefresh);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ── Header row: description + progress ─────────────────────────────── */}
      <div className="mt-2 mb-5 flex items-center justify-between gap-4">
        {isPursued ? (
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-green-700">Decision: Pursue</span>
            {allSections.length > 0 && (
              <span className="text-xs text-gray-400 ml-1">
                · {allSections.filter(s => s.reviewDecision === 'ok').length} OK
                {flagged > 0 && <span className="text-amber-600"> · {flagged} Flagged</span>}
                {issues  > 0 && <span className="text-red-600"> · {issues} Issues</span>}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Review each extracted section and mark it OK, Flag, or Issue before pursuing.
          </p>
        )}
        {allSections.length > 0 && (
          <span className="text-xs font-semibold text-gray-500 shrink-0">
            {reviewed} / {allSections.length} reviewed
          </span>
        )}
      </div>

      {/* ── Section list ─────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse">Loading sections…</p>
      ) : allSections.length === 0 ? (
        <div className="py-8 text-center rounded-lg border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">No sections extracted yet. Complete Stage 1 first.</p>
        </div>
      ) : (
        <div className="space-y-5 mb-6">
          {sectionsByDoc.map(group => (
            <div key={group.documentId}>
              {sectionsByDoc.length > 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded">
                    {group.docType}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{group.documentTitle}</span>
                  <span className="text-[11px] text-gray-400">
                    {group.sections.length} section{group.sections.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {group.sections.map(sec => (
                  <SectionReviewRow
                    key={sec._id}
                    sec={sec}
                    onUpdate={handleSectionUpdate}
                    onView={s => setViewSection(s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pursue button (hidden once pursued) ─────────────────────────────── */}
      {!isPursued && (
        <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={handlePursue}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            ✓ Pursue Inquiry
          </button>
          {issues > 0 && (
            <span className="text-xs text-red-600 font-medium">
              {issues} section{issues !== 1 ? 's' : ''} marked as Issue
            </span>
          )}
        </div>
      )}
      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}

      {/* ── Section detail modal ─────────────────────────────────────────────── */}
      {viewSection && (
        <SectionViewModal
          section={viewSection}
          onClose={() => setViewSection(null)}
          onSaved={handleSectionUpdate}
        />
      )}
    </>
  );
}

// ─── Stage 3: Document Check & Acknowledgment ──────────────────────────────────

function GapAnalysisSection({
  inquiryId,
  gapAnalysis,
  onUpdate,
}: {
  inquiryId: string;
  gapAnalysis: Stage3GapAnalysis | null;
  onUpdate: (ga: Stage3GapAnalysis) => void;
}) {
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleRunAnalysis() {
    setRunning(true);
    setErr(null);
    try {
      const result = await api.stage3.analyse(inquiryId);
      onUpdate(result);
    } catch (e) {
      setErr(String(e));
    } finally {
      setRunning(false);
    }
  }

  const status = gapAnalysis?.status ?? 'pending';

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Document Gap Analysis</h3>

      {(status === 'pending' || gapAnalysis === null) && (
        <button
          onClick={handleRunAnalysis}
          disabled={running}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          ✦ Run Analysis
        </button>
      )}

      {status === 'processing' && (
        <p className="text-sm text-indigo-600 animate-pulse">Analysing…</p>
      )}

      {status === 'failed' && (
        <div>
          <p className="text-red-500 text-sm mb-2">
            {gapAnalysis?.error ?? 'Analysis failed.'}
          </p>
          <button
            onClick={handleRunAnalysis}
            disabled={running}
            className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            ✦ Retry
          </button>
        </div>
      )}

      {status === 'done' && gapAnalysis && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">
                Required Sections
              </p>
              <ul className="space-y-1">
                {gapAnalysis.requiredSections.map(s => (
                  <li key={s} className="text-sm text-gray-700">• {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">
                Received Sections
              </p>
              <ul className="space-y-1">
                {gapAnalysis.receivedSections.map(s => (
                  <li key={s} className="text-sm text-green-700">• {s}</li>
                ))}
              </ul>
            </div>
          </div>

          {gapAnalysis.gaps.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">
                Gaps
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['SECTION', 'SEVERITY', 'REASON'].map(h => (
                      <th
                        key={h}
                        className="text-[10px] font-bold tracking-widest text-gray-400 text-left pb-2 pr-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gapAnalysis.gaps.map((g: GapItem, i: number) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 text-sm text-gray-800">{g.section}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            g.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {g.severity}
                        </span>
                      </td>
                      <td className="py-2 text-sm text-gray-600">{g.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gapAnalysis.recommendation && (
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm italic text-gray-600">{gapAnalysis.recommendation}</p>
            </div>
          )}
        </div>
      )}

      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
    </div>
  );
}

function EmailDraftSection({
  inquiryId,
  emailDraft,
  onUpdate,
}: {
  inquiryId: string;
  emailDraft: Stage3EmailDraft | null;
  onUpdate: (ed: Stage3EmailDraft) => void;
}) {
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleDraftEmail() {
    setRunning(true);
    setErr(null);
    try {
      const result = await api.stage3.draftEmail(inquiryId);
      onUpdate(result);
    } catch (e) {
      setErr(String(e));
    } finally {
      setRunning(false);
    }
  }

  async function handleCopy() {
    if (!emailDraft) return;
    await navigator.clipboard.writeText(
      `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const status = emailDraft?.status ?? 'pending';

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Acknowledgment Email Draft</h3>

      {(status === 'pending' || emailDraft === null) && (
        <button
          onClick={handleDraftEmail}
          disabled={running}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          ✦ Draft Email
        </button>
      )}

      {status === 'processing' && (
        <p className="text-sm text-indigo-600 animate-pulse">Drafting email…</p>
      )}

      {status === 'failed' && (
        <div>
          <p className="text-red-500 text-sm mb-2">
            {emailDraft?.error ?? 'Email drafting failed.'}
          </p>
          <button
            onClick={handleDraftEmail}
            disabled={running}
            className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            ✦ Retry
          </button>
        </div>
      )}

      {status === 'done' && emailDraft && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Subject: {emailDraft.subject}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs px-2.5 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
            >
              {copied ? '✓ Copied' : 'Copy to clipboard'}
            </button>
          </div>
          <textarea
            readOnly
            className="w-full text-sm text-gray-700 p-4 bg-white resize-none focus:outline-none font-mono"
            rows={12}
            value={emailDraft.body}
          />
        </div>
      )}

      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
    </div>
  );
}

interface Stage3ContentProps {
  inquiry: Inquiry;
  completedUpTo: number;
  onRefresh: () => void;
}

function Stage3Content({ inquiry, completedUpTo, onRefresh }: Stage3ContentProps) {
  const [stage3, setStage3] = useState<ApiStage3 | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.stage3
      .get(inquiry.id)
      .then(data => { if (!cancelled) setStage3(data); })
      .catch(e => { if (!cancelled) setErr(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inquiry.id]);

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;
  if (err) return <p className="text-red-500 text-sm">{err}</p>;

  const emailDone = stage3?.emailDraft?.status === 'done';

  return (
    <div>
      <GapAnalysisSection
        inquiryId={inquiry.id}
        gapAnalysis={stage3?.gapAnalysis ?? null}
        onUpdate={ga => setStage3(prev => prev ? { ...prev, gapAnalysis: ga } : { inquiryId: inquiry.id, gapAnalysis: ga, emailDraft: null })}
      />
      <hr className="my-5 border-gray-200" />
      <EmailDraftSection
        inquiryId={inquiry.id}
        emailDraft={stage3?.emailDraft ?? null}
        onUpdate={ed => setStage3(prev => prev ? { ...prev, emailDraft: ed } : { inquiryId: inquiry.id, gapAnalysis: null, emailDraft: ed })}
      />
      {emailDone && completedUpTo < 3 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={async () => { setAdvancing(true); await markStageComplete(inquiry.id, 3, onRefresh); setAdvancing(false); }}
            disabled={advancing}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {advancing ? 'Saving…' : '✓ Mark Stage 3 Complete'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Stage 4: Tag List & Datasheet Extraction ──────────────────────────────────
interface Stage4ContentProps {
  inquiry: Inquiry;
  documents: ApiDocument[];
  completedUpTo: number;
  onRefresh: () => void;
}

function Stage4Content({ inquiry, documents, completedUpTo, onRefresh }: Stage4ContentProps) {
  const [stage4, setStage4] = useState<ApiStage4 | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const uploadedDocs = documents.filter(d => d.hasFile);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.stage4
      .get(inquiry.id)
      .then(data => { if (!cancelled) setStage4(data); })
      .catch(e => { if (!cancelled) setErr(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inquiry.id]);

  async function handleExtract() {
    setExtracting(true);
    setErr(null);
    try {
      const result = await api.stage4.extract(inquiry.id, selectedDocId || undefined);
      setStage4(result);
    } catch (e) {
      setErr(String(e));
    } finally {
      setExtracting(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  const status = stage4?.status ?? 'pending';

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={selectedDocId}
          onChange={e => setSelectedDocId(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
        >
          <option value="">Auto-select document</option>
          {uploadedDocs.map(d => (
            <option key={d._id} value={d._id}>{d.title}</option>
          ))}
        </select>

        <button
          onClick={handleExtract}
          disabled={extracting}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {extracting ? 'Extracting…' : '✦ Extract Tag List'}
        </button>

        {stage4 && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              status === 'done'
                ? 'bg-green-100 text-green-700'
                : status === 'failed'
                ? 'bg-red-100 text-red-700'
                : status === 'extracting'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {status === 'extracting' && (
        <p className="text-sm text-indigo-600 animate-pulse">Extracting tags…</p>
      )}

      {status === 'failed' && (
        <p className="text-red-500 text-sm">{stage4?.error ?? 'Extraction failed.'}</p>
      )}

      {status === 'done' && stage4 && stage4.tags.length > 0 && (
        <div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {['#', 'TAG No.', 'Product Name', 'Dimensions', 'Wt/Unit', 'Qty', 'Missing Fields'].map(h => (
                  <th
                    key={h}
                    className="text-[10px] font-bold tracking-widest text-gray-400 text-left pb-2 pr-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stage4.tags.map((t, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-3 text-sm text-gray-400">{i + 1}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-700 font-medium">
                    {t.tagNumber}
                  </td>
                  <td className="py-2 pr-3 text-sm text-gray-800">{t.productName}</td>
                  <td className="py-2 pr-3 text-sm text-gray-600">{t.dimensions || '—'}</td>
                  <td className="py-2 pr-3 text-sm text-gray-600">{t.weightPerUnit || '—'}</td>
                  <td className="py-2 pr-3 text-sm text-gray-700">{t.quantity}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {t.missingFields.map(f => (
                        <span
                          key={f}
                          className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {stage4.extractionNotes && (
            <p className="text-sm italic text-gray-500 mt-3">{stage4.extractionNotes}</p>
          )}
        </div>
      )}

      {stage4?.status === 'done' && completedUpTo < 4 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={async () => { setAdvancing(true); await markStageComplete(inquiry.id, 4, onRefresh); setAdvancing(false); }}
            disabled={advancing}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {advancing ? 'Saving…' : '✓ Mark Stage 4 Complete'}
          </button>
        </div>
      )}

      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
    </div>
  );
}

// ─── Stage 5: Tech Compliance Review ──────────────────────────────────────────
interface Stage5ContentProps {
  inquiry: Inquiry;
  onRefresh: () => void;
}

const TECH_CHECKLIST = [
  'Design pressure verified',
  'Material specifications reviewed',
  'Applicable codes confirmed',
  'GA drawings reviewed',
  'Nozzle schedule verified',
];

function Stage5Content({ inquiry, onRefresh }: Stage5ContentProps) {
  const [checked, setChecked] = useState<boolean[]>(new Array(TECH_CHECKLIST.length).fill(false));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.stage5.get(inquiry.id)
      .then(data => {
        const loaded = new Array(TECH_CHECKLIST.length).fill(false);
        data.checkedItems.forEach((v, i) => { if (i < loaded.length) loaded[i] = v; });
        setChecked(loaded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [inquiry.id]);

  async function toggleItem(idx: number) {
    const next = checked.map((v, i) => (i === idx ? !v : v));
    setChecked(next);
    try {
      await api.stage5.update(inquiry.id, next);
    } catch { /* silent — local state already updated */ }
  }

  async function handleMarkComplete() {
    setBusy(true);
    setErr(null);
    try {
      await markStageComplete(inquiry.id, 5, onRefresh);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  const allChecked = checked.every(Boolean);

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">{STAGES[4].description}</p>
      <div className="space-y-2 mb-5">
        {TECH_CHECKLIST.map((item, idx) => (
          <label key={item} className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked[idx]}
              onChange={() => toggleItem(idx)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
            />
            <span className={`text-sm ${checked[idx] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {item}
            </span>
          </label>
        ))}
      </div>

      {allChecked && (
        <button
          onClick={handleMarkComplete}
          disabled={busy}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : '✓ Mark Complete'}
        </button>
      )}
      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
    </div>
  );
}

// ─── Stage 6: Technical Queries ────────────────────────────────────────────────
interface Stage6ContentProps {
  inquiry: Inquiry;
  completedUpTo: number;
  onRefresh: () => void;
}

function TQStatusPill({ status }: { status: TechQuery['status'] }) {
  const styles: Record<TechQuery['status'], string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-amber-100 text-amber-700',
    answered: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

function Stage6Content({ inquiry, completedUpTo, onRefresh }: Stage6ContentProps) {
  const [data, setData] = useState<ApiStage6 | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [fTagClause, setFTagClause] = useState('');
  const [fClauseRef, setFClauseRef] = useState('');
  const [fQuestion, setFQuestion] = useState('');
  const [fSendTo, setFSendTo] = useState('');
  const [fRaisedBy, setFRaisedBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // Per-TQ answer editing
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.stage6
      .get(inquiry.id)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setErr(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inquiry.id]);

  async function handleCreateTQ(e: React.FormEvent) {
    e.preventDefault();
    if (!fTagClause.trim() || !fQuestion.trim() || !fSendTo.trim() || !fRaisedBy.trim()) {
      setFormErr('Tag/Clause Ref, Question, Send To, and Raised By are required.');
      return;
    }
    setSaving(true);
    setFormErr(null);
    try {
      const tq = await api.stage6.createTQ(inquiry.id, {
        tagClause: fTagClause.trim(),
        clauseRef: fClauseRef.trim() || undefined,
        question: fQuestion.trim(),
        sendTo: fSendTo.trim(),
        raisedBy: fRaisedBy.trim(),
      });
      setData(prev =>
        prev
          ? { ...prev, tqs: [...prev.tqs, tq], summary: { ...prev.summary, total: prev.summary.total + 1, draft: prev.summary.draft + 1 } }
          : null,
      );
      setFTagClause(''); setFClauseRef(''); setFQuestion(''); setFSendTo(''); setFRaisedBy('');
      setShowForm(false);
    } catch (e) {
      setFormErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAdvanceStatus(tqId: string, newStatus: 'sent' | 'answered') {
    try {
      const answer = newStatus === 'answered' ? (answerDraft[tqId] ?? '') : undefined;
      if (newStatus === 'answered' && !answer?.trim()) return;
      const updated = await api.stage6.updateTQ(
        inquiry.id,
        tqId,
        newStatus === 'answered' ? { status: newStatus, answer } : { status: newStatus },
      );
      setData(prev =>
        prev
          ? { ...prev, tqs: prev.tqs.map(t => (t._id === tqId ? updated : t)) }
          : null,
      );
      if (newStatus === 'answered') {
        setAnswerDraft(prev => { const n = { ...prev }; delete n[tqId]; return n; });
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleDeleteTQ(tqId: string) {
    if (!confirm('Delete this TQ?')) return;
    try {
      await api.stage6.deleteTQ(inquiry.id, tqId);
      setData(prev =>
        prev
          ? { ...prev, tqs: prev.tqs.filter(t => t._id !== tqId) }
          : null,
      );
    } catch (e) {
      setErr(String(e));
    }
  }

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;
  if (err) return <p className="text-red-500 text-sm">{err}</p>;

  const summary = data?.summary;

  return (
    <div>
      {/* Summary pills */}
      {summary && (
        <div className="flex items-center gap-2 mb-4">
          {(
            [
              ['Total Questions', summary.total, 'bg-gray-100 text-gray-700'],
              ['Draft', summary.draft, 'bg-gray-100 text-gray-600'],
              ['Sent', summary.sent, 'bg-amber-100 text-amber-700'],
              ['Answered', summary.answered, 'bg-green-100 text-green-700'],
            ] as const
          ).map(([label, count, cls]) => (
            <span key={label} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
              {label}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Add TQ toggle */}
      <div className="mb-4">
        <button
          onClick={() => { setShowForm(f => !f); setFormErr(null); }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
        >
          {showForm ? '✕ Cancel' : '+ Add Technical Query'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateTQ}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5"
        >
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                Tag / Clause Ref *
              </label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={fTagClause}
                onChange={e => setFTagClause(e.target.value)}
                placeholder="e.g. TAG-101 / Cl. 5.2"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                Clause Ref
              </label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={fClauseRef}
                onChange={e => setFClauseRef(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
              Question *
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
              rows={3}
              value={fQuestion}
              onChange={e => setFQuestion(e.target.value)}
              placeholder="Enter technical query…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                Send To *
              </label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={fSendTo}
                onChange={e => setFSendTo(e.target.value)}
                placeholder="Client / Engineering"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                Raised By *
              </label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={fRaisedBy}
                onChange={e => setFRaisedBy(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>
          {formErr && <p className="text-red-500 text-sm mb-2">{formErr}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add TQ'}
          </button>
        </form>
      )}

      {/* TQ Table */}
      {data && data.tqs.length > 0 ? (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              {['TQ#', 'TAG / Clause', 'Question', 'Send To', 'Raised By', 'Status', 'Actions'].map(
                h => (
                  <th
                    key={h}
                    className="text-[10px] font-bold tracking-widest text-gray-400 text-left pb-2 pr-3"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.tqs.map(tq => (
              <tr key={tq._id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                <td className="py-3 pr-3 font-mono text-xs text-gray-500 font-medium whitespace-nowrap">
                  {tq.tqNumber}
                </td>
                <td className="py-3 pr-3 text-sm text-gray-700">{tq.tagClause}</td>
                <td className="py-3 pr-3 text-sm text-gray-700 max-w-xs">
                  {tq.question.length > 80 ? tq.question.slice(0, 80) + '…' : tq.question}
                </td>
                <td className="py-3 pr-3 text-sm text-gray-600">{tq.sendTo}</td>
                <td className="py-3 pr-3 text-sm text-gray-600">{tq.raisedBy}</td>
                <td className="py-3 pr-3">
                  <TQStatusPill status={tq.status} />
                </td>
                <td className="py-3">
                  <div className="flex flex-col gap-1.5">
                    {tq.status === 'draft' && (
                      <button
                        onClick={() => handleAdvanceStatus(tq._id, 'sent')}
                        className="px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200 rounded hover:bg-amber-50 whitespace-nowrap"
                      >
                        → Answer
                      </button>
                    )}
                    {tq.status === 'sent' && (
                      <div className="flex flex-col gap-1">
                        <textarea
                          className="w-40 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                          rows={2}
                          placeholder="Enter answer…"
                          value={answerDraft[tq._id] ?? ''}
                          onChange={e =>
                            setAnswerDraft(prev => ({ ...prev, [tq._id]: e.target.value }))
                          }
                        />
                        <button
                          onClick={() => handleAdvanceStatus(tq._id, 'answered')}
                          disabled={!(answerDraft[tq._id] ?? '').trim()}
                          className="px-2 py-1 text-xs font-medium text-green-700 border border-green-200 rounded hover:bg-green-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          → Answered
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteTQ(tq._id)}
                      className="px-2 py-1 text-xs font-medium text-red-500 border border-red-100 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-400 italic">No technical queries yet.</p>
      )}

      {data && data.tqs.length > 0 && completedUpTo < 6 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={async () => { await markStageComplete(inquiry.id, 6, onRefresh); }}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-green-600 hover:bg-green-700"
          >
            ✓ Mark Stage 6 Complete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Stage 7: Cost Estimate / BOM ──────────────────────────────────────────────
interface Stage7ContentProps {
  inquiry: Inquiry;
  completedUpTo: number;
  onRefresh: () => void;
}

function Stage7Content({ inquiry, completedUpTo, onRefresh }: Stage7ContentProps) {
  const [data, setData] = useState<ApiStage7 | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editTag, setEditTag]           = useState('');
  const [editName, setEditName]         = useState('');
  const [editQty, setEditQty]           = useState('');
  const [editUnit, setEditUnit]         = useState('');
  const [editMoc, setEditMoc]           = useState('');
  const [editRate, setEditRate]         = useState('');
  const [editNotes, setEditNotes]       = useState('');
  const [editRemarks, setEditRemarks]   = useState('');
  const [savingEdit, setSavingEdit]     = useState(false);

  // Add item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTag, setAddTag] = useState('');
  const [addName, setAddName] = useState('');
  const [addQty, setAddQty] = useState('');
  const [addUnit, setAddUnit] = useState('');
  const [addRate, setAddRate] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.stage7
      .get(inquiry.id)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setErr(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inquiry.id]);

  async function handleEstimate() {
    setEstimating(true);
    setErr(null);
    try {
      const result = await api.stage7.estimate(inquiry.id);
      setData(result);
    } catch (e) {
      const msg = String(e);
      if (msg.toLowerCase().includes('stage 4')) {
        setErr('Stage 4 extraction must be completed before generating an AI estimate.');
      } else {
        setErr(msg);
      }
    } finally {
      setEstimating(false);
    }
  }

  function startEdit(item: BomItem) {
    setEditingId(item._id);
    setEditTag(item.tagNumber);
    setEditName(item.productName);
    setEditQty(String(item.quantity));
    setEditUnit(item.quantityUnit);
    setEditMoc(item.mocType);
    setEditRate(String(item.rateInr));
    setEditNotes(item.notes);
    setEditRemarks(item.remarks);
  }

  async function handleSaveEdit(itemId: string) {
    setSavingEdit(true);
    try {
      const result = await api.stage7.updateItem(inquiry.id, itemId, {
        tagNumber:    editTag.trim(),
        productName:  editName.trim(),
        quantity:     parseFloat(editQty),
        quantityUnit: editUnit.trim(),
        mocType:      editMoc.trim(),
        rateInr:      parseFloat(editRate),
        notes:        editNotes.trim(),
        remarks:      editRemarks.trim(),
      });
      setData(result);
      setEditingId(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Remove this item from the BOM?')) return;
    try {
      await api.stage7.deleteItem(inquiry.id, itemId);
      setData(prev =>
        prev
          ? {
              ...prev,
              items: prev.items.filter(i => i._id !== itemId),
              grandTotalInr: prev.items
                .filter(i => i._id !== itemId)
                .reduce((sum, i) => sum + i.totalInr, 0),
            }
          : null,
      );
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addQty || !addRate) {
      setAddErr('Product Name, Qty, and Rate are required.');
      return;
    }
    setAddingItem(true);
    setAddErr(null);
    try {
      const result = await api.stage7.addItem(inquiry.id, {
        tagNumber: addTag.trim() || undefined,
        productName: addName.trim(),
        quantity: parseFloat(addQty),
        quantityUnit: addUnit.trim() || undefined,
        rateInr: parseFloat(addRate),
      });
      setData(result);
      setAddTag(''); setAddName(''); setAddQty(''); setAddUnit(''); setAddRate('');
      setShowAddForm(false);
    } catch (e) {
      setAddErr(String(e));
    } finally {
      setAddingItem(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  const status = data?.status ?? 'pending';

  const confidencePill = (conf: string) => {
    const styles: Record<string, string> = {
      high: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-red-100 text-red-700',
    };
    return styles[conf.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleEstimate}
          disabled={estimating}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {estimating ? 'Estimating…' : '✦ Estimate with AI'}
        </button>
        {estimating && (
          <span className="text-sm text-indigo-600 animate-pulse">
            Running AI cost estimate…
          </span>
        )}
        {status === 'done' && data && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            done
          </span>
        )}
      </div>

      {err && <p className="text-red-500 text-sm mb-4">{err}</p>}

      {data && data.items.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {['#', 'TAG', 'Item Description', 'Qty', 'Unit', 'MOC/Type', 'Unit Rate (INR)', 'Total (INR)', 'Notes', 'Remarks', 'AI Est.', 'Actions'].map(
                  h => (
                    <th
                      key={h}
                      className="text-[10px] font-bold tracking-widest text-gray-400 text-left pb-2 pr-3"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => {
                const isEditing = editingId === item._id;
                return (
                  <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                    <td className="py-2.5 pr-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-gray-600">
                      {isEditing ? (
                        <input
                          className="w-20 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editTag}
                          onChange={e => setEditTag(e.target.value)}
                          placeholder="TAG"
                        />
                      ) : (
                        item.tagNumber || '—'
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-800">
                      {isEditing ? (
                        <input
                          className="w-40 border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Item description"
                        />
                      ) : (
                        item.productName
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-700">
                      {isEditing ? (
                        <input
                          className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          type="number"
                          min="0"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-600">
                      {isEditing ? (
                        <input
                          className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editUnit}
                          onChange={e => setEditUnit(e.target.value)}
                          placeholder="nos"
                        />
                      ) : (
                        item.quantityUnit
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-600">
                      {isEditing ? (
                        <input
                          className="w-24 border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editMoc}
                          onChange={e => setEditMoc(e.target.value)}
                          placeholder="e.g. SS 316L"
                        />
                      ) : (
                        item.mocType
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-700">
                      {isEditing ? (
                        <input
                          className="w-24 border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editRate}
                          onChange={e => setEditRate(e.target.value)}
                          type="number"
                          min="0"
                        />
                      ) : (
                        formatINR(item.rateInr)
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm font-medium text-gray-900">
                      {formatINR(item.totalInr)}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-600 max-w-[140px]">
                      {isEditing ? (
                        <input
                          className="w-32 border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Notes"
                        />
                      ) : (
                        <span className="line-clamp-2">{item.notes || '—'}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-600 max-w-[140px]">
                      {isEditing ? (
                        <input
                          className="w-32 border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editRemarks}
                          onChange={e => setEditRemarks(e.target.value)}
                          placeholder="Remarks"
                        />
                      ) : (
                        <span className="line-clamp-2">{item.remarks || '—'}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-col gap-1">
                        {item.aiEstimated && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">
                            AI
                          </span>
                        )}
                        {item.confidence && (
                          <span
                            className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${confidencePill(item.confidence)}`}
                          >
                            {item.confidence}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleSaveEdit(item._id)}
                            disabled={savingEdit}
                            className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {savingEdit ? '…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => startEdit(item)}
                            className="px-2 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="px-2 py-1 text-xs font-medium text-red-500 border border-red-100 rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Grand total row */}
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={6} className="py-3 pr-3 text-sm font-bold text-gray-900 text-right">
                  Grand Total
                </td>
                <td className="py-3 pr-3 text-sm font-bold text-gray-900">
                  {formatINR(data.grandTotalInr)}
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Add item form */}
      <div className="mt-4">
        <button
          onClick={() => { setShowAddForm(f => !f); setAddErr(null); }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          {showAddForm ? '✕ Cancel' : '+ Add BOM Item'}
        </button>

        {showAddForm && (
          <form
            onSubmit={handleAddItem}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3"
          >
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  TAG
                </label>
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={addTag}
                  onChange={e => setAddTag(e.target.value)}
                  placeholder="TAG-101"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Product Name *
                </label>
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Item description"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Qty *
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={addQty}
                  onChange={e => setAddQty(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Unit
                </label>
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={addUnit}
                  onChange={e => setAddUnit(e.target.value)}
                  placeholder="nos, set…"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widests text-gray-400 uppercase block mb-1">
                  Rate (INR) *
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={addRate}
                  onChange={e => setAddRate(e.target.value)}
                />
              </div>
            </div>
            {addErr && <p className="text-red-500 text-sm mb-2">{addErr}</p>}
            <button
              type="submit"
              disabled={addingItem}
              className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {addingItem ? 'Adding…' : 'Add Item'}
            </button>
          </form>
        )}
      </div>

      {data?.status === 'done' && completedUpTo < 7 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={async () => { await markStageComplete(inquiry.id, 7, onRefresh); }}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-green-600 hover:bg-green-700"
          >
            ✓ Mark Stage 7 Complete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Stage 8: Techno-Commercial Proposal ───────────────────────────────────────
interface Stage8ContentProps {
  inquiry: Inquiry;
  completedUpTo: number;
  onRefresh: () => void;
}

function Stage8Content({ inquiry, completedUpTo, onRefresh }: Stage8ContentProps) {
  const [data, setData] = useState<ApiStage8 | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [draftProgress, setDraftProgress] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.stage8
      .get(inquiry.id)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setErr(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inquiry.id]);

  async function handleDraft() {
    if (data?.status === 'done') {
      if (!confirm('This will replace the existing draft. Continue?')) return;
    }
    setDrafting(true);
    setDraftProgress(0);
    setErr(null);
    // Fake progress while waiting for long API call
    progressRef.current = setInterval(() => {
      setDraftProgress(p => Math.min(p + 2, 90));
    }, 600);
    try {
      const result = await api.stage8.draft(inquiry.id);
      setDraftProgress(100);
      setData(result);
    } catch (e) {
      setErr(String(e));
    } finally {
      if (progressRef.current) clearInterval(progressRef.current);
      setDrafting(false);
    }
  }

  function handleExportPDF() {
    if (!data) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W   = doc.internal.pageSize.getWidth();   // 210 mm
      const H   = doc.internal.pageSize.getHeight();  // 297 mm
      const ML  = 18; // margin left
      const MR  = 18; // margin right
      const MT  = 18; // margin top
      const MB  = 18; // margin bottom
      const CW  = W - ML - MR;
      let y = MT;

      // ── helpers ────────────────────────────────────────────────────────────

      function newPageIfNeeded(need: number) {
        if (y + need > H - MB) { doc.addPage(); y = MT; }
      }

      // Strip inline markdown markers, replace ₹ with Rs. (standard fonts only cover Latin)
      function clean(t: string) {
        return t
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/₹/g, 'Rs.');
      }

      function addWrappedText(
        text: string, fontSize: number,
        bold = false, color = [17, 24, 39] as [number, number, number],
        extraGap = 1,
      ) {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        const lh   = fontSize * 0.3528 * 1.45;          // pt→mm × line-height
        const wrapped = doc.splitTextToSize(clean(text), CW);
        newPageIfNeeded(wrapped.length * lh + extraGap);
        doc.text(wrapped, ML, y);
        y += wrapped.length * lh + extraGap;
      }

      function hRule(color = [229, 231, 235] as [number, number, number], gap = 3) {
        newPageIfNeeded(gap * 2);
        doc.setDrawColor(...color);
        doc.setLineWidth(0.25);
        doc.line(ML, y, W - MR, y);
        y += gap;
      }

      // ── document title ─────────────────────────────────────────────────────
      addWrappedText(data.title, 15, true, [15, 23, 42], 3);
      hRule([30, 41, 59], 5);

      // ── parse body line by line ─────────────────────────────────────────────
      const lines = data.body.split('\n');
      let i = 0;
      const listBuf: { text: string; ordered: boolean; num: number }[] = [];
      let orderedCounter = 0;

      function flushList() {
        if (!listBuf.length) return;
        const lh = 9.5 * 0.3528 * 1.4;
        for (const item of listBuf) {
          const bullet = item.ordered ? `${item.num}.` : '•';
          const wrapped = doc.splitTextToSize(clean(item.text), CW - 6);
          newPageIfNeeded(wrapped.length * lh + 1);
          doc.setFontSize(9.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(17, 24, 39);
          doc.text(bullet, ML + 1, y);
          doc.text(wrapped, ML + 5, y);
          y += wrapped.length * lh + 0.8;
        }
        listBuf.length = 0;
        orderedCounter = 0;
        y += 1.5;
      }

      while (i < lines.length) {
        const line = lines[i];

        // ── headings ──────────────────────────────────────────────────────────
        if (line.startsWith('### ')) {
          flushList();
          y += 1;
          addWrappedText(line.slice(4), 10.5, true, [55, 65, 81], 2);
          i++; continue;
        }
        if (line.startsWith('## ')) {
          flushList();
          y += 3;
          addWrappedText(line.slice(3), 12, true, [30, 41, 59], 1);
          hRule([229, 231, 235], 3);
          i++; continue;
        }
        if (line.startsWith('# ')) {
          flushList();
          y += 3;
          addWrappedText(line.slice(2), 13.5, true, [15, 23, 42], 2);
          i++; continue;
        }

        // ── horizontal rule ───────────────────────────────────────────────────
        if (/^---+$/.test(line.trim())) {
          flushList();
          y += 1;
          hRule([209, 213, 219], 4);
          i++; continue;
        }

        // ── table (collect all consecutive pipe lines) ────────────────────────
        if (line.trimStart().startsWith('|')) {
          flushList();
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].trimStart().startsWith('|')) {
            tableLines.push(lines[i]);
            i++;
          }
          // skip separator rows like |---|---|
          const rows = tableLines
            .filter(l => !/^\|[\s\-:|]+\|$/.test(l.trim()))
            .map(l =>
              l.replace(/^\|/, '').replace(/\|$/, '')
               .split('|').map(c => clean(c.trim())),
            );
          if (rows.length) {
            const cols   = Math.max(...rows.map(r => r.length));
            const cw     = CW / cols;
            const rh     = 7;
            const fSize  = Math.max(7, Math.min(9, Math.floor(120 / cols)));
            for (let r = 0; r < rows.length; r++) {
              newPageIfNeeded(rh + 1);
              const isHdr = r === 0;
              if (isHdr) {
                doc.setFillColor(241, 245, 249);
                doc.rect(ML, y - 5.2, CW, rh, 'F');
              }
              doc.setFontSize(fSize);
              doc.setFont('helvetica', isHdr ? 'bold' : 'normal');
              doc.setTextColor(17, 24, 39);
              doc.setDrawColor(203, 213, 225);
              doc.setLineWidth(0.2);
              for (let c = 0; c < cols; c++) {
                const cx = ML + c * cw;
                doc.rect(cx, y - 5.2, cw, rh);
                const cell = (rows[r][c] ?? '').slice(0, 60);
                doc.text(cell, cx + 1.5, y - 0.5);
              }
              y += rh;
            }
            y += 3;
          }
          continue;
        }

        // ── ordered list ──────────────────────────────────────────────────────
        const olMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (olMatch) {
          orderedCounter++;
          listBuf.push({ text: olMatch[2], ordered: true, num: orderedCounter });
          i++; continue;
        }

        // ── unordered list ────────────────────────────────────────────────────
        if (/^[-*]\s/.test(line)) {
          listBuf.push({ text: line.slice(2), ordered: false, num: 0 });
          i++; continue;
        }

        // ── blank line ────────────────────────────────────────────────────────
        if (!line.trim()) {
          flushList();
          y += 2;
          i++; continue;
        }

        // ── paragraph ─────────────────────────────────────────────────────────
        flushList();
        addWrappedText(line, 10, false, [17, 24, 39], 2);
        i++;
      }

      flushList();

      doc.save(`OEL_Proposal_${inquiry.id.replace(/\//g, '-')}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  function startEdit() {
    if (!data) return;
    setEditTitle(data.title);
    setEditBody(data.body);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      const result = await api.stage8.update(inquiry.id, {
        title: editTitle,
        body: editBody,
      });
      setData(result);
      setEditing(false);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  const wordCount = data?.body
    ? data.body.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleDraft}
          disabled={drafting}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {drafting ? 'Generating proposal…' : '✦ Draft Proposal with AI'}
        </button>
        {data?.status === 'done' && !drafting && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            done
          </span>
        )}
      </div>

      {drafting && (
        <div className="mb-4">
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${draftProgress}%` }}
            />
          </div>
          <p className="text-xs text-indigo-600 mt-1">
            Generating proposal… this may take 30–60 seconds.
          </p>
        </div>
      )}

      {err && <p className="text-red-500 text-sm mb-4">{err}</p>}

      {data?.status === 'done' && data && (
        <div>
          {/* Metadata row */}
          <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
            {data.draftedAt && (
              <span>Drafted: {new Date(data.draftedAt).toLocaleDateString()}</span>
            )}
            {data.editedAt && (
              <span>Edited: {new Date(data.editedAt).toLocaleDateString()}</span>
            )}
            <span>{wordCount} words</span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Title
                </label>
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Body
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y font-mono"
                  rows={20}
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-1.5 text-sm font-semibold text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 leading-snug">{data.title}</h2>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    {exporting ? (
                      <>
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" />
                        </svg>
                        Generating…
                      </>
                    ) : '↓ Export PDF'}
                  </button>
                  <button
                    onClick={startEdit}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-300 rounded hover:bg-indigo-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="proposal-body border border-gray-200 rounded-lg px-6 py-5 bg-white">
                <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #1e293b' }}>
                  {data.title}
                </h1>
                <div dangerouslySetInnerHTML={{ __html: marked.parse(data.body) as string }} />
              </div>
            </div>
          )}
        </div>
      )}

      {data?.status === 'done' && completedUpTo < 8 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={async () => { await markStageComplete(inquiry.id, 8, onRefresh); }}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-green-600 hover:bg-green-700"
          >
            ✓ Mark Stage 8 Complete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Stages 9-14: Simple stages ────────────────────────────────────────────────
interface SimpleStageContentProps {
  stage: Stage;
  inquiry: Inquiry;
  apiData: ApiInquiry;
  onRefresh: () => void;
}

function SimpleStageContent({ stage, inquiry, onRefresh }: SimpleStageContentProps) {
  const [notes, setNotes] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [outcome, setOutcome] = useState<'win' | 'loss' | ''>('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleAdvance() {
    setBusy(true);
    setErr(null);
    try {
      await markStageComplete(inquiry.id, stage.num, onRefresh);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-5">{stage.description}</p>

      {/* Stage 9: Internal Review */}
      {stage.num === 9 && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold tracking-widests text-gray-400 uppercase block mb-1">
              Notes
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal review notes…"
            />
          </div>
          <button
            onClick={handleAdvance}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Sign Off & Advance'}
          </button>
        </div>
      )}

      {/* Stage 10: Bid Submitted */}
      {stage.num === 10 && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
              Submission Date
            </label>
            <input
              type="date"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
            />
          </div>
          <button
            onClick={handleAdvance}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Confirm Bid Submitted'}
          </button>
        </div>
      )}

      {/* Stage 11: Post-bid Clarifications */}
      {stage.num === 11 && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
              Notes
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Clarification notes…"
            />
          </div>
          <button
            onClick={handleAdvance}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Mark Complete'}
          </button>
        </div>
      )}

      {/* Stage 12: Order Outcome */}
      {stage.num === 12 && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
              Outcome
            </label>
            <div className="flex items-center gap-4">
              {(['win', 'loss'] as const).map(o => (
                <label key={o} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={o}
                    checked={outcome === o}
                    onChange={() => setOutcome(o)}
                    className="text-indigo-600 focus:ring-indigo-400"
                  />
                  <span className={`text-sm font-medium ${o === 'win' ? 'text-green-700' : 'text-red-600'}`}>
                    {o === 'win' ? 'Win' : 'Loss'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
              Notes
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Outcome reasoning…"
            />
          </div>
          <button
            onClick={handleAdvance}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Record Outcome'}
          </button>
        </div>
      )}

      {/* Stage 13: Contract Review Meeting */}
      {stage.num === 13 && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
              Meeting Date
            </label>
            <input
              type="date"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
              Notes
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Meeting notes…"
            />
          </div>
          <button
            onClick={handleAdvance}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Record Meeting'}
          </button>
        </div>
      )}

      {/* Stage 14: Handover to Projects */}
      {stage.num === 14 && (
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
            />
            <span className="text-sm text-gray-700">
              I confirm the formal handover package has been prepared and shared with the
              Projects team.
            </span>
          </label>
          <button
            onClick={handleAdvance}
            disabled={busy || !confirmed}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Complete Handover'}
          </button>
        </div>
      )}

      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
    </div>
  );
}

// ─── Props & main export ───────────────────────────────────────────────────────

interface Props {
  stage: Stage;
  inquiry: Inquiry;
  apiData: ApiInquiry;
  documents: ApiDocument[];
  onDocumentsChange: (docs: ApiDocument[]) => void;
  onRefresh: () => void;
}

export default function StageContent({
  stage,
  inquiry,
  apiData,
  documents,
  onDocumentsChange,
  onRefresh,
}: Props) {
  const isCompleted = stage.num <= apiData.completedUpTo;
  const isCurrent = stage.num === apiData.completedUpTo + 1;
  const clusterColor = CLUSTER_COLORS[stage.cluster];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl">
        <StageHeader
          stage={stage}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
          clusterColor={clusterColor}
        />

        <hr className="my-5 border-gray-200" />

        {stage.num === 1 && (
          <Stage1Content
            inquiry={inquiry}
            apiData={apiData}
            documents={documents}
            onDocumentsChange={onDocumentsChange}
          />
        )}

        {stage.num === 2 && (
          <Stage2Content
            inquiry={inquiry}
            apiData={apiData}
            onRefresh={onRefresh}
          />
        )}

        {stage.num === 3 && (
          <Stage3Content inquiry={inquiry} completedUpTo={apiData.completedUpTo} onRefresh={onRefresh} />
        )}

        {stage.num === 4 && (
          <Stage4Content inquiry={inquiry} documents={documents} completedUpTo={apiData.completedUpTo} onRefresh={onRefresh} />
        )}

        {stage.num === 5 && (
          <Stage5Content inquiry={inquiry} onRefresh={onRefresh} />
        )}

        {stage.num === 6 && (
          <Stage6Content inquiry={inquiry} completedUpTo={apiData.completedUpTo} onRefresh={onRefresh} />
        )}

        {stage.num === 7 && (
          <Stage7Content inquiry={inquiry} completedUpTo={apiData.completedUpTo} onRefresh={onRefresh} />
        )}

        {stage.num === 8 && (
          <Stage8Content inquiry={inquiry} completedUpTo={apiData.completedUpTo} onRefresh={onRefresh} />
        )}

        {stage.num >= 9 && (
          <SimpleStageContent
            stage={stage}
            inquiry={inquiry}
            apiData={apiData}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </div>
  );
}