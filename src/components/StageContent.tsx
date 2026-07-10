import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import jsPDF from 'jspdf';
import { Pencil, Trash2, Bot, ArrowUp } from 'lucide-react';

import type { Inquiry } from '../types';
import type { Stage } from '../data/stages';
import { CLUSTER_COLORS, STAGES } from '../data/stages';
import type {
  ApiDocument,
  ApiInquiry,
  ApiPageIndex,
  ApiPageIndexVersion,
  ApiSection,
  LlmProvider,
  ApiSectionsByDoc,
  ApiStage3,
  ApiStage4,
  ApiStage5,
  ApiStage6,
  ApiStage7,
  ApiStage8,
  BomComponent,
  ComplianceItem,
  EquipmentBom,
  NozzleEntry,
  GapItem,
  Stage3EmailDraft,
  Stage3GapAnalysis,
  TechQuery,
} from '../lib/api';
import { api } from '../lib/api';

// ─── Shared helpers ────────────────────────────────────────────────────────────


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
    clearStoredMessages(docId); // don't leave an orphaned chat thread behind
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

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
};

// ─── Chat history — localStorage only, keyed per document ────────────────────
// Deliberately client-side and per-browser, not a backend feature: this is a
// convenience so closing the chat / reloading the page doesn't lose the
// thread, not a shared team record (that's what PageIndexTree's version
// history is for). Capped per-document so a long-lived conversation can't
// grow the stored payload — and the per-request LLM history — without bound.

interface StoredChatMessage {
  role: 'user' | 'model';
  text: string;
  pagesUsed?: number[];
  provider?: LlmProvider;
}

const CHAT_STORAGE_PREFIX = 'pageindex-chat:';
const MAX_STORED_MESSAGES = 40;

function chatStorageKey(documentId: string): string {
  return `${CHAT_STORAGE_PREFIX}${documentId}`;
}

function loadStoredMessages(documentId: string): StoredChatMessage[] {
  if (!documentId) return [];
  try {
    const raw = localStorage.getItem(chatStorageKey(documentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // corrupted or inaccessible storage — start fresh rather than crash
  }
}

function saveStoredMessages(documentId: string, messages: StoredChatMessage[]): void {
  try {
    if (messages.length === 0) {
      localStorage.removeItem(chatStorageKey(documentId));
      return;
    }
    localStorage.setItem(chatStorageKey(documentId), JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  } catch {
    // Quota exceeded or storage disabled (private mode, etc.) — chat still
    // works for this session, it just won't survive a reload.
  }
}

// Cleanup hook: call this wherever a document is deleted so its chat thread
// doesn't linger in localStorage as an orphaned entry.
function clearStoredMessages(documentId: string): void {
  try {
    localStorage.removeItem(chatStorageKey(documentId));
  } catch { /* ignore */ }
}

// True when this message is a model answer whose provider differs from the
// most recent prior model answer's provider — i.e. the user switched LLMs
// between these two turns. The full conversation history is still sent to
// whichever provider answers next (see handleSend), this is purely a UI cue.
function providerSwitchedAt(
  messages: StoredChatMessage[],
  index: number,
): boolean {
  const current = messages[index];
  if (current.role !== 'model' || !current.provider) return false;
  for (let j = index - 1; j >= 0; j--) {
    const prev = messages[j];
    if (prev.role === 'model' && prev.provider) {
      return prev.provider !== current.provider;
    }
  }
  return false;
}

function ProviderDropdown({ provider, onChange }: { provider: LlmProvider; onChange: (p: LlmProvider) => void }) {
  return (
    <select
      value={provider}
      onChange={e => onChange(e.target.value as LlmProvider)}
      className="text-[11px] h-10 font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
    >
      {(['gemini', 'openai'] as const).map(p => (
        <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
      ))}
    </select>
  );
}

const VERSION_ACTION_LABELS: Record<ApiPageIndexVersion['action'], string> = {
  build:  'Built',
  repair: 'Repaired',
};

function countSections(tree: ApiPageIndex['tree']): number {
  return tree.reduce((n, s) => n + 1 + s.nodes.length, 0);
}

// ─── Audit trail — every build/repair is an immutable version row, original included ──
function VersionHistoryPanel({ versions, loading, error }: { versions: ApiPageIndexVersion[]; loading: boolean; error: string | null }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (loading) return <p className="text-xs text-gray-400 px-1">Loading history…</p>;
  if (error) return <p className="text-xs text-red-500 px-1">{error}</p>;
  if (versions.length === 0) return <p className="text-xs text-gray-400 px-1">No history yet.</p>;

  return (
    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
      {versions.map(v => {
        const isOpen = expanded === v.versionNumber;
        return (
          <div key={v.versionNumber}>
            <button
              onClick={() => setExpanded(isOpen ? null : v.versionNumber)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-xs">
                <span className="font-mono font-semibold text-gray-700">v{v.versionNumber}</span>
                <span className="text-gray-600">{VERSION_ACTION_LABELS[v.action]}</span>
                <span className="text-gray-400">· {PROVIDER_LABELS[v.provider]}</span>
                {v.qualityFlags.length > 0 && (
                  <span className="text-amber-600">· {v.qualityFlags.length} warning{v.qualityFlags.length === 1 ? '' : 's'}</span>
                )}
              </span>
              <span className="text-[10px] text-gray-400 shrink-0">
                {new Date(v.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 text-xs text-gray-600 space-y-2">
                <p className="leading-relaxed">{v.docSummary || <span className="italic text-gray-400">No summary.</span>}</p>
                <p className="text-gray-400">{countSections(v.tree)} section(s) · {v.pageCount} pages</p>
                {v.qualityFlags.length > 0 && (
                  <ul className="list-disc pl-4 text-amber-700 space-y-0.5">
                    {v.qualityFlags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Chat with a document (PageIndex — reasoning over a page-range tree, no vectors) ──
function DocChatModal({ documents, onClose }: { documents: ApiDocument[]; onClose: () => void }) {
  const chatDocs = documents.filter(d => d.hasFile);

  const overlayRef  = useRef<HTMLDivElement>(null);
  const bodyRef     = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedDocId, setSelectedDocId] = useState<string>(chatDocs[0]?._id ?? '');
  const doc = chatDocs.find(d => d._id === selectedDocId) ?? chatDocs[0] ?? null;

  const [pageIndex, setPageIndex]       = useState<ApiPageIndex | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [building, setBuilding]         = useState(false);
  const [buildErr, setBuildErr]         = useState<string | null>(null);
  const [repairing, setRepairing]       = useState(false);
  const [repairErr, setRepairErr]       = useState<string | null>(null);
  const [provider, setProvider]         = useState<LlmProvider>('gemini');

  const [messages, setMessages] = useState<StoredChatMessage[]>(() => loadStoredMessages(chatDocs[0]?._id ?? ''));
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [chatErr, setChatErr]   = useState<string | null>(null);

  const [showHistory, setShowHistory]     = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(true);
  const [versions, setVersions]           = useState<ApiPageIndexVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionsErr, setVersionsErr]     = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    api.pageIndex.get(doc._id)
      .then(res => {
        if (cancelled) return;
        setPageIndex(res);
        if (res.status === 'done') setProvider(res.provider);
      })
      .catch(e => { if (!cancelled) setBuildErr(String(e)); })
      .finally(() => { if (!cancelled) setLoadingStatus(false); });
    return () => { cancelled = true; };
  }, [doc]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // Persist to localStorage whenever the thread changes, for whichever
  // document is currently selected.
  useEffect(() => {
    if (!doc) return;
    saveStoredMessages(doc._id, messages);
  }, [doc, messages]);

  // Switching documents resets everything scoped to the previous one — done
  // here (a plain event handler), not in an effect, so it's a single
  // synchronous batch instead of a cascade of effect-triggered renders.
  // Messages are loaded from storage rather than cleared, so re-selecting a
  // document you've already chatted with picks the thread back up.
  function handleSelectDoc(newId: string) {
    setSelectedDocId(newId);
    setPageIndex(null);
    setLoadingStatus(true);
    setBuildErr(null);
    setRepairErr(null);
    setMessages(loadStoredMessages(newId));
    setChatErr(null);
    setShowHistory(false);
    setVersions([]);
    setVersionsErr(null);
    setSummaryCollapsed(true);
  }

  async function loadVersions() {
    if (!doc) return;
    setLoadingVersions(true);
    setVersionsErr(null);
    try {
      setVersions(await api.pageIndex.versions(doc._id));
    } catch (e) {
      setVersionsErr(String(e));
    } finally {
      setLoadingVersions(false);
    }
  }

  function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadVersions();
  }

  async function handleBuild() {
    if (!doc) return;
    setBuilding(true);
    setBuildErr(null);
    try {
      const res = await api.pageIndex.build(doc._id, provider);
      setPageIndex(res);
      if (showHistory) loadVersions();
    } catch (e) {
      setBuildErr(String(e));
    } finally {
      setBuilding(false);
    }
  }

  async function handleRepair() {
    if (!doc) return;
    setRepairing(true);
    setRepairErr(null);
    try {
      const res = await api.pageIndex.repair(doc._id, provider);
      setPageIndex(res);
      if (showHistory) loadVersions();
    } catch (e) {
      setRepairErr(String(e));
    } finally {
      setRepairing(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!doc || !text || sending) return;
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setChatErr(null);
    setSending(true);
    try {
      const res = await api.pageIndex.chat(doc._id, text, history, provider);
      setMessages(prev => [...prev, { role: 'model', text: res.answer, pagesUsed: res.pagesUsed, provider }]);
    } catch (e) {
      setChatErr(String(e));
    } finally {
      setSending(false);
    }
  }

  const ready = doc !== null && pageIndex?.status === 'done';
  const fixableFlags = pageIndex?.qualityFlags.filter(f => !f.startsWith('Document exceeded')) ?? [];

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
                {doc ? (
                  <>
                    <span className="font-mono text-[11px] font-bold text-white bg-slate-800 px-2 py-0.5 rounded shrink-0">
                      {doc.docType}
                    </span>
                    <select
                      value={doc._id}
                      onChange={e => handleSelectDoc(e.target.value)}
                      className="text-xs text-gray-600 bg-transparent border border-gray-200 rounded px-1.5 py-0.5 max-w-[220px] focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    >
                      {chatDocs.map(d => (
                        <option key={d._id} value={d._id}>{d.docType} — {d.title}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <span className="font-mono text-[11px] font-bold text-white bg-slate-800 px-2 py-0.5 rounded shrink-0">
                    CHAT
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-gray-900 leading-snug">Chat with a document</p>
              {ready && pageIndex && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {pageIndex.pageCount} pages indexed
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {ready && pageIndex && pageIndex.currentVersion > 0 && (
                <button
                  onClick={toggleHistory}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-md ${
                    showHistory ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  History ({pageIndex.currentVersion})
                </button>
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {!doc ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-600">
                No documents uploaded in this inquiry yet.
              </p>
            </div>
          ) : loadingStatus ? (
            <p className="text-sm text-gray-400">Checking index status…</p>
          ) : !ready ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-600 mb-4">
                {pageIndex?.status === 'failed'
                  ? `Last index build failed${pageIndex.error ? `: ${pageIndex.error}` : '.'} Try again.`
                  : 'No chat index yet for this document. Build one to start asking questions.'}
              </p>
              <button
                onClick={handleBuild}
                disabled={building}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {building ? 'Building index… this can take a minute' : 'Build chat index'}
              </button>
              {buildErr && <p className="text-xs text-red-500 mt-3">{buildErr}</p>}
            </div>
          ) : (
            <>
              {showHistory && (
                <VersionHistoryPanel versions={versions} loading={loadingVersions} error={versionsErr} />
              )}
              {pageIndex.docSummary && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 leading-relaxed overflow-hidden">
                  <button
                    onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                    className={`w-full flex items-center justify-between p-3 font-bold uppercase tracking-wide text-black hover:bg-gray-100 transition-colors sticky top-0 bg-gray-50 z-10 text-left ${
                      !summaryCollapsed ? 'border-b border-gray-200/50' : ''
                    }`}
                  >
                    <span>Document Summary</span>
                    <span className="text-gray-400 text-[10px] normal-case font-normal shrink-0">
                      {summaryCollapsed ? 'Expand ▼' : 'Collapse ▲'}
                    </span>
                  </button>
                  {!summaryCollapsed && (
                    <div className="chat-markdown p-3" dangerouslySetInnerHTML={{ __html: marked.parse(pageIndex.docSummary) as string }} />
                  )}
                </div>
              )}
              {pageIndex.qualityFlags.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="font-semibold">Index quality warnings</p>
                    {fixableFlags.length > 0 && (
                      <button
                        onClick={handleRepair}
                        disabled={repairing}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 disabled:opacity-50"
                      >
                        {repairing ? 'Fixing…' : 'Fix warnings'}
                      </button>
                    )}
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {pageIndex.qualityFlags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  {repairErr && <p className="text-red-600 mt-1.5">{repairErr}</p>}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i}>
                  {providerSwitchedAt(messages, i) && (
                    <p className="text-center text-[10px] text-gray-400 my-2">
                      — switched to {PROVIDER_LABELS[m.provider!]} —
                    </p>
                  )}
                  <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={
                        m.role === 'user'
                          ? 'max-w-[85%] bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5'
                          : 'max-w-[85%] bg-gray-100 text-gray-800 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5'
                      }
                    >
                      {m.role === 'model' && m.provider && (
                        <p className="text-[10px] font-semibold text-gray-400 mb-1">{PROVIDER_LABELS[m.provider]}</p>
                      )}
                      {m.role === 'model' ? (
                        <div className="chat-markdown" dangerouslySetInnerHTML={{ __html: marked.parse(m.text) as string }} />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                      )}
                      {m.pagesUsed && m.pagesUsed.length > 0 && (
                        <p className={`text-[10px] mt-1.5 ${m.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                          Pages consulted: {m.pagesUsed.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sending && <p className="text-xs text-gray-400 italic">Thinking…</p>}
              {chatErr && <p className="text-xs text-red-500">{chatErr}</p>}
            </>
          )}
        </div>

        {/* Input */}
        {ready && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask about this document…"
                disabled={sending}
                rows={1}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none overflow-y-auto leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
              />
              <ProviderDropdown provider={provider} onChange={setProvider} />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                title="Send"
                className="shrink-0 w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
  const [editSummary, setEditSummary]   = useState(false);
  const [editContent, setEditContent]   = useState(false);
  const [summary, setSummary]           = useState(section.summary);
  const [content, setContent]           = useState(section.content);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [saveErr, setSaveErr]           = useState<string | null>(null);

  useEffect(() => {
    setSummary(section.summary);
    setContent(section.content);
    setEditSummary(false);
    setEditContent(false);
  }, [section._id, section.summary, section.content]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSaveSummary() {
    setSavingSummary(true);
    setSaveErr(null);
    try {
      const updated = await api.sections.update(section._id, { summary });
      onSaved(updated);
      setEditSummary(false);
    } catch (e) {
      setSaveErr(String(e));
    } finally {
      setSavingSummary(false);
    }
  }

  async function handleSaveContent() {
    setSavingContent(true);
    setSaveErr(null);
    try {
      const updated = await api.sections.update(section._id, { content });
      onSaved(updated);
      setEditContent(false);
    } catch (e) {
      setSaveErr(String(e));
    } finally {
      setSavingContent(false);
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

        {/* Metadata */}
        <div className="shrink-0 border-b border-gray-100 px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <dt className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Document Type</dt>
              <dd className="text-sm font-semibold text-gray-900">{section.docType}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Document</dt>
              <dd className="text-sm font-semibold text-gray-900 truncate">{section.documentTitle}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Section Index</dt>
              <dd className="text-sm font-semibold text-gray-900">#{section.sectionIndex + 1}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Inquiry</dt>
              <dd className="text-sm font-semibold text-gray-900 font-mono truncate">{section.inquiryId}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Extracted</dt>
              <dd className="text-sm font-semibold text-gray-900">{new Date(section.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Last Edited</dt>
              <dd className="text-sm font-semibold text-gray-900">{new Date(section.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</dd>
            </div>
          </dl>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Summary — editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Summary</p>
              {!editSummary && (
                <button onClick={() => setEditSummary(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  Edit
                </button>
              )}
            </div>
            {editSummary ? (
              <div>
                <textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none leading-relaxed font-mono"
                />
                {saveErr && <p className="text-xs text-red-500 mt-1.5">{saveErr}</p>}
                <div className="flex items-center gap-2 mt-2.5">
                  <button onClick={handleSaveSummary} disabled={savingSummary} className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {savingSummary ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditSummary(false); setSummary(section.summary); setSaveErr(null); }} className="px-4 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
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

          {/* Full content — editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Full Content</p>
              {!editContent && (
                <button onClick={() => setEditContent(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  Edit
                </button>
              )}
            </div>
            {editContent ? (
              <div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={10}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y leading-relaxed font-mono"
                />
                {saveErr && <p className="text-xs text-red-500 mt-1.5">{saveErr}</p>}
                <div className="flex items-center gap-2 mt-2.5">
                  <button onClick={handleSaveContent} disabled={savingContent} className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {savingContent ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditContent(false); setContent(section.content); setSaveErr(null); }} className="px-4 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                {content || <span className="italic text-gray-400">No content.</span>}
              </div>
            )}
          </div>
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
      <h3 className="text-m font-semibold text-gray-900 mb-2">Document Gap Analysis</h3>

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
              <p className="text-sm font-semibold text-gray-900 mb-2">
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

  const fmtSide = (s: { fluid?: string; operatingPressureBarg?: number; operatingTempC?: number; material?: string } | undefined) => {
    if (!s) return '—';
    const parts = [
      s.fluid || '',
      s.operatingPressureBarg ? `${s.operatingPressureBarg} barg` : '',
      s.operatingTempC ? `${s.operatingTempC}°C` : '',
      s.material || '',
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  };

  const fmtDim = (odMm: number, lMm: number) => {
    if (!odMm && !lMm) return '—';
    return [odMm ? `⌀${odMm}` : '', lMm ? `L${lMm}` : ''].filter(Boolean).join(' × ') + ' mm';
  };

  const meta = stage4?.extractionMeta;

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

      {status === 'done' && meta && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <span className="text-gray-500">Tags: <strong className="text-gray-800">{meta.totalTagsFound}</strong></span>
          <span className="text-gray-500">Units: <strong className="text-gray-800">{meta.totalUnits}</strong></span>
          <span className="text-gray-500">Total wt: <strong className="text-gray-800">{meta.totalFabricationWeightT ? `${meta.totalFabricationWeightT} t` : '—'}</strong></span>
          {meta.sourceDocuments.length > 0 && (
            <span className="text-gray-400 text-xs">{meta.sourceDocuments.join(', ')}</span>
          )}
        </div>
      )}

      {status === 'done' && stage4 && stage4.tags.length > 0 && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {['#', 'Tag', 'Service', 'TEMA', 'Shell ⌀ × L', 'Shell-side', 'Tube-side', 'Wt/unit (t)', 'Nos', 'DS Ref'].map(h => (
                    <th key={h} className="text-[10px] font-bold tracking-widest text-gray-400 text-left pb-2 pr-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stage4.tags.map((t, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                    <td className="py-2.5 pr-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">
                      {t.tagNumber || '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-800 max-w-[180px]">
                      {t.service || '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-mono font-semibold text-indigo-700 whitespace-nowrap">
                      {t.temaType || '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {fmtDim(t.shellOdMm, t.tubeLengthMm)}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-600 max-w-[160px]">
                      {fmtSide(t.shellSide)}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-600 max-w-[160px]">
                      {fmtSide(t.tubeSide)}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-700 whitespace-nowrap">
                      {t.weightPerUnitT ? `${t.weightPerUnitT} t` : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-700 text-center">
                      {t.nos || '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-mono text-gray-600 whitespace-nowrap">
                      {t.datasheetRef ? (
                        <span>
                          {t.datasheetRef}
                          {t.datasheetRev && <span className="text-gray-400 ml-1">{t.datasheetRev}</span>}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  completedUpTo: number;
  onRefresh: () => void;
}

const COMPLIANCE_STATUS_STYLES: Record<string, string> = {
  Compliant:      'bg-green-100 text-green-700 border-green-200',
  Deviation:      'bg-amber-100 text-amber-700 border-amber-200',
  Blocker:        'bg-red-100 text-red-700 border-red-200',
  'Under review': 'bg-gray-100 text-gray-600 border-gray-200',
};

const OWNER_OPTIONS = ['Logistics', 'Commercial', 'Estimation', 'VP-Sales', 'Engineering'];
const STATUS_OPTIONS = ['Compliant', 'Deviation', 'Blocker', 'Under review'];

function StatusPill({ status, override }: { status: string; override?: string | null }) {
  const display = override ?? status;
  const base = COMPLIANCE_STATUS_STYLES[display] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${base}`}>
      {override && <span className="opacity-60 text-[8px]">★</span>}
      {display}
    </span>
  );
}

function ComplianceRow({
  item, index, onUpdate, onDelete,
}: {
  item: ComplianceItem;
  index: number;
  onUpdate: (index: number, data: { topic?: string; category?: string; sourceRef?: string; rfqBuyerRequirement?: string; oswalStandOffer?: string; impact?: string; status?: string; owner?: string; statusOverride?: string | null; ownerOverride?: string | null; remarks?: string }) => void;
  onDelete: (index: number) => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [eTopic,     setETopic]     = useState('');
  const [eCategory,  setECategory]  = useState('');
  const [eSourceRef, setESourceRef] = useState('');
  const [eRfq,       setERfq]       = useState('');
  const [eOswal,     setEOswal]     = useState('');
  const [eImpact,    setEImpact]    = useState('');
  const [eStatus,    setEStatus]    = useState('');
  const [eOwner,     setEOwner]     = useState('');
  const [eRemarks,   setERemarks]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saveErr,    setSaveErr]    = useState<string | null>(null);

  function openEdit() {
    setETopic(item.topic);
    setECategory(item.category);
    setESourceRef(item.sourceRef || '');
    setERfq(item.rfqBuyerRequirement);
    setEOswal(item.oswalStandOffer || '');
    setEImpact(item.impact || '');
    setEStatus(item.statusOverride ?? item.status);
    setEOwner(item.ownerOverride ?? item.owner ?? '');
    setERemarks(item.remarks || '');
    setSaveErr(null);
    setShowEdit(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!eTopic.trim() || !eRfq.trim()) { setSaveErr('Topic and RFQ Requirement are required.'); return; }
    setSaving(true);
    setSaveErr(null);
    await onUpdate(index, {
      topic: eTopic.trim(), category: eCategory, sourceRef: eSourceRef.trim(),
      rfqBuyerRequirement: eRfq.trim(), oswalStandOffer: eOswal.trim(),
      impact: eImpact.trim(), status: eStatus, owner: eOwner,
      statusOverride: null, ownerOverride: null, remarks: eRemarks.trim(),
    });
    setSaving(false);
    setShowEdit(false);
  }

  const effectiveStatus = item.statusOverride ?? item.status;
  const effectiveOwner  = item.ownerOverride  ?? item.owner;
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <>
      <tr className={`border-b border-gray-100 align-top ${effectiveStatus === 'Blocker' ? 'bg-red-50/40' : effectiveStatus === 'Deviation' ? 'bg-amber-50/30' : ''}`}>
        <td className="py-2.5 pr-2 text-[11px] font-mono text-gray-400 whitespace-nowrap">{item.clauseId}</td>
        <td className="py-2.5 pr-2 text-[11px] text-gray-500 whitespace-nowrap">{item.sourceRef || '—'}</td>
        <td className="py-2.5 pr-3 text-sm font-medium text-gray-800">{item.topic}</td>
        <td className="py-2.5 pr-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.category === 'Commercial' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
            {item.category}
          </span>
        </td>
        <td className="py-2.5 pr-3 text-xs text-gray-600 max-w-[200px]"><span className="line-clamp-3">{item.rfqBuyerRequirement}</span></td>
        <td className="py-2.5 pr-3 text-xs text-gray-600 max-w-[180px]"><span className="line-clamp-3">{item.oswalStandOffer}</span></td>
        <td className="py-2.5 pr-3 text-xs text-gray-500 max-w-[160px]"><span className="line-clamp-2 italic">{item.impact}</span></td>
        <td className="py-2.5 pr-2 whitespace-nowrap"><StatusPill status={item.status} override={item.statusOverride} /></td>
        <td className="py-2.5 pr-2 text-xs text-gray-600 whitespace-nowrap">{effectiveOwner || '—'}</td>
        <td className="py-2.5 pr-3 text-xs text-gray-500 max-w-[160px]">
          {item.remarks ? <span className="line-clamp-2">{item.remarks}</span> : <span className="text-gray-300">—</span>}
        </td>
        <td className="py-2.5">
          <div className="flex items-center gap-1">
            <button
              onClick={openEdit}
              className="text-xs p-1 rounded border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Delete "${item.topic}"? This cannot be undone.`)) return;
                setDeleting(true);
                await onDelete(index);
                setDeleting(false);
              }}
              disabled={deleting}
              className="text-xs p-1 rounded border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
              title="Delete"
            >
              {deleting ? '…' : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {showEdit && (
        <tr><td colSpan={11} className="p-0">
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={e => { if (e.target === e.currentTarget) setShowEdit(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <h2 className="text-base font-bold text-gray-900">Edit Compliance Item</h2>
                <button onClick={() => setShowEdit(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleSave} className="overflow-y-auto px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Topic *</label>
                    <input className={inputCls} value={eTopic} onChange={e => setETopic(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Category</label>
                    <select className={inputCls} value={eCategory} onChange={e => setECategory(e.target.value)}>
                      <option>Technical</option>
                      <option>Commercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Source Ref</label>
                    <input className={inputCls} value={eSourceRef} onChange={e => setESourceRef(e.target.value)} placeholder="e.g. Cl. 4.2" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">RFQ Buyer Requirement *</label>
                  <textarea className={`${inputCls} resize-none`} rows={3} value={eRfq} onChange={e => setERfq(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Oswal Stand / Offer</label>
                  <textarea className={`${inputCls} resize-none`} rows={3} value={eOswal} onChange={e => setEOswal(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Status</label>
                    <select className={inputCls} value={eStatus} onChange={e => setEStatus(e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Owner</label>
                    <select className={inputCls} value={eOwner} onChange={e => setEOwner(e.target.value)}>
                      <option value="">— select —</option>
                      {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Impact</label>
                    <input className={inputCls} value={eImpact} onChange={e => setEImpact(e.target.value)} placeholder="e.g. Cost / Schedule" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Remarks</label>
                    <input className={inputCls} value={eRemarks} onChange={e => setERemarks(e.target.value)} placeholder="Optional notes" />
                  </div>
                </div>
                {saveErr && <p className="text-red-500 text-xs">{saveErr}</p>}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
}

function Stage5Content({ inquiry, completedUpTo, onRefresh }: Stage5ContentProps) {
  const [data, setData]           = useState<ApiStage5 | null>(null);
  const [loading, setLoading]     = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [catFilter, setCatFilter]     = useState<'All' | 'Commercial' | 'Technical'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Add-item form state
  const [showAddForm, setShowAddForm]   = useState(false);
  const [addTopic, setAddTopic]         = useState('');
  const [addCategory, setAddCategory]   = useState<'Technical' | 'Commercial'>('Technical');
  const [addSourceRef, setAddSourceRef] = useState('');
  const [addRfq, setAddRfq]             = useState('');
  const [addOswal, setAddOswal]         = useState('');
  const [addImpact, setAddImpact]       = useState('');
  const [addStatus, setAddStatus]       = useState('Under review');
  const [addOwner, setAddOwner]         = useState('');
  const [addRemarks, setAddRemarks]     = useState('');
  const [addSaving, setAddSaving]       = useState(false);
  const [addErr, setAddErr]             = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.stage5.get(inquiry.id)
      .then(d => { if (!cancelled) setData(d as ApiStage5); })
      .catch(e => { if (!cancelled) setErr(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inquiry.id]);

  async function handleAnalyse() {
    setAnalysing(true);
    setErr(null);
    try {
      const result = await api.stage5.analyse(inquiry.id);
      setData(result);
    } catch (e) {
      const msg = String(e);
      if (msg.includes('Stage 2') || msg.includes('sections')) {
        setErr('No extracted sections found. Run Stage 2 document review first to extract RFQ content.');
      } else {
        setErr(msg);
      }
    } finally {
      setAnalysing(false);
    }
  }

  async function handleUpdateItem(index: number, patch: { topic?: string; category?: string; sourceRef?: string; rfqBuyerRequirement?: string; oswalStandOffer?: string; impact?: string; status?: string; owner?: string; statusOverride?: string | null; ownerOverride?: string | null; remarks?: string }) {
    try {
      const result = await api.stage5.updateItem(inquiry.id, index, patch);
      setData(result);
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleDeleteItem(index: number) {
    try {
      const result = await api.stage5.deleteItem(inquiry.id, index);
      setData(result);
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!addTopic.trim() || !addRfq.trim()) {
      setAddErr('Topic and RFQ Requirement are required.');
      return;
    }
    setAddSaving(true);
    setAddErr(null);
    try {
      const result = await api.stage5.addItem(inquiry.id, {
        topic: addTopic.trim(),
        category: addCategory,
        sourceRef: addSourceRef.trim() || undefined,
        rfqBuyerRequirement: addRfq.trim(),
        oswalStandOffer: addOswal.trim() || undefined,
        impact: addImpact.trim() || undefined,
        status: addStatus,
        owner: addOwner.trim() || undefined,
        remarks: addRemarks.trim() || undefined,
      });
      setData(result);
      setAddTopic(''); setAddCategory('Technical'); setAddSourceRef('');
      setAddRfq(''); setAddOswal(''); setAddImpact('');
      setAddStatus('Under review'); setAddOwner(''); setAddRemarks('');
      setShowAddForm(false);
    } catch (e) {
      setAddErr(String(e));
    } finally {
      setAddSaving(false);
    }
  }

  function exportCSV() {
    const headers = ['Clause ID', 'Source Ref', 'Topic', 'Category', 'RFQ Buyer Requirement', 'Oswal Stand/Offer', 'Impact', 'Status', 'Owner', 'Remarks'];
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = (data?.complianceMatrix ?? []).map(item => [
      item.clauseId,
      item.sourceRef,
      item.topic,
      item.category,
      item.rfqBuyerRequirement,
      item.oswalStandOffer,
      item.impact,
      item.statusOverride ?? item.status,
      item.ownerOverride ?? item.owner,
      item.remarks ?? '',
    ].map(escape).join(','));
    const csv = [headers.map(escape).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_matrix_${inquiry.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  const status   = data?.status ?? 'pending';
  const meta     = data?.complianceMeta;
  const matrix   = data?.complianceMatrix ?? [];

  const filtered = matrix.filter(item => {
    const eff = item.statusOverride ?? item.status;
    const catOk    = catFilter === 'All' || item.category === catFilter;
    const statusOk = statusFilter === 'All' || eff === statusFilter;
    return catOk && statusOk;
  });

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={handleAnalyse}
          disabled={analysing}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {analysing ? 'Analysing…' : status === 'done' ? '↺ Re-analyse' : '✦ Analyse Compliance'}
        </button>
        {analysing && (
          <span className="text-sm text-indigo-600 animate-pulse">Reading all RFQ sections...</span>
        )}
        {status === 'done' && meta && (
          <>
            <span className="text-xs text-gray-500">
              {meta.totalComplianceItems} clauses extracted
            </span>
            {matrix.length > 0 && (
              <button
                onClick={exportCSV}
                className="ml-auto px-3 py-1.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
              >
                ↓ Export CSV
              </button>
            )}
          </>
        )}
        {status === 'failed' && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">failed</span>
        )}
      </div>

      {err && <p className="text-red-500 text-sm mb-4">{err}</p>}
      {data?.error && status === 'failed' && (
        <p className="text-red-400 text-xs mb-4 font-mono">{data.error}</p>
      )}

      {/* Summary stats */}
      {meta && meta.totalComplianceItems > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Compliant',     count: meta.compliantCount,       style: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Deviation',     count: meta.deviationCount,       style: 'bg-amber-50 border-amber-200 text-amber-700' },
            { label: 'Blocker',       count: meta.blockerCount,         style: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'Under review',  count: meta.openUnderReviewCount, style: 'bg-gray-50 border-gray-200 text-gray-600' },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setStatusFilter(prev => prev === s.label ? 'All' : s.label)}
              className={`rounded-lg border p-3 text-left transition-all ${s.style} ${statusFilter === s.label ? 'ring-2 ring-offset-1 ring-indigo-400' : 'hover:opacity-80'}`}
            >
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs font-semibold mt-0.5">{s.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      {matrix.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              {(['All', 'Commercial', 'Technical'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${catFilter === c ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  {c}
                </button>    
              ))}
            </div>

            {/* Add item */}
            {(status === 'done' || status === 'pending') && (
              <button
                onClick={() => { setShowAddForm(true); setAddErr(null); }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                + Add Records Manually
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) { setShowAddForm(false); setAddErr(null); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
            {/* Dialog header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Compliance Item</h2>
              <button onClick={() => { setShowAddForm(false); setAddErr(null); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {/* Dialog body */}
            <form onSubmit={handleAddItem} className="overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Topic *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={addTopic} onChange={e => setAddTopic(e.target.value)} placeholder="e.g. IBR Compliance" />
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Category</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={addCategory} onChange={e => setAddCategory(e.target.value as 'Technical' | 'Commercial')}>
                    <option>Technical</option>
                    <option>Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Source Ref</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={addSourceRef} onChange={e => setAddSourceRef(e.target.value)} placeholder="e.g. Cl. 4.2" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">RFQ Buyer Requirement *</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" rows={3} value={addRfq} onChange={e => setAddRfq(e.target.value)} placeholder="What the buyer requires…" />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Oswal Stand / Offer</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" rows={3} value={addOswal} onChange={e => setAddOswal(e.target.value)} placeholder="Our position…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Status</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={addStatus} onChange={e => setAddStatus(e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Owner</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={addOwner} onChange={e => setAddOwner(e.target.value)}>
                    <option value="">— select —</option>
                    {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Impact</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={addImpact} onChange={e => setAddImpact(e.target.value)} placeholder="e.g. Cost / Schedule" />
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">Remarks</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={addRemarks} onChange={e => setAddRemarks(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>
              {addErr && <p className="text-red-500 text-xs">{addErr}</p>}
              {/* Dialog footer */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setShowAddForm(false); setAddErr(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={addSaving} className="px-5 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {addSaving ? 'Saving…' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="w-5/4 max-h-[500px] overflow-auto mb-4 px-2 relative">
          <table className="w-full text-sm border-collapse min-w-[700px]">
            <thead>
              <tr>
                {['Clause ID', 'Source', 'Topic', 'Category', 'RFQ Requirement', 'Oswal Stand', 'Impact', 'Status', 'Owner', 'Remarks', 'Actions'].map(h => (
                  <th key={h} className="sticky top-0 bg-white z-10 text-[10px] font-bold uppercase text-gray-400 text-left pb-2 px-3 whitespace-nowrap border-b-2 border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <ComplianceRow
                  key={item.clauseId || i}
                  item={item}
                  index={matrix.indexOf(item)}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'done' && filtered.length === 0 && (
        <p className="text-sm text-gray-400">No items match the current filter.</p>
      )}

      

      {status === 'done' && completedUpTo < 5 && matrix.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
          <button
            disabled={advancing}
            onClick={async () => {
              setAdvancing(true);
              try { await markStageComplete(inquiry.id, 5, onRefresh); }
              catch (e) { setErr(String(e)); }
              finally { setAdvancing(false); }
            }}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {advancing ? 'Saving…' : '✓ Mark Stage 5 Complete'}
          </button>
          {advancing && <span className="text-sm text-gray-400 animate-pulse">Saving compliance review to database…</span>}
        </div>
      )}
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
                  <div className="relative group inline-block">
                    <TQStatusPill status={tq.status} />
                    <div className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {tq.answer ? (
                        <>
                          <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Answer</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{tq.answer}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No answer yet.</p>
                      )}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200" />
                    </div>
                  </div>
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

// ─── Stage 7: BOM Extraction + Cost Estimation ─────────────────────────────────
interface Stage7ContentProps {
  inquiry: Inquiry;
  completedUpTo: number;
  onRefresh: () => void;
}

function inr(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return '₹' + amount.toLocaleString('en-IN');
}

function EquipmentCard({ eq, index }: { eq: EquipmentBom; index: number }) {
  const [showBom, setShowBom]         = useState(true);
  const [showNozzles, setShowNozzles] = useState(false);

  const flags = [
    eq.ibrApplicable   && <span key="ibr" className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">IBR</span>,
    eq.hydrogenService && <span key="h2"  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">H₂</span>,
    eq.deletedFromScope && <span key="del" className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">DELETED</span>,
  ].filter(Boolean);

  const warnCount    = eq.bom.filter(c => c.mocFlag && c.applicable !== 'No').length;
  const hasCostData  = eq.totalEquipCost != null && eq.totalEquipCost > 0;

  return (
    <div className={`border rounded-lg mb-4 ${eq.deletedFromScope ? 'border-red-200 bg-red-50/30 opacity-60' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-sm font-bold text-gray-900">{eq.tagNo || '—'}</span>
            {eq.temaClass     && <span className="text-xs text-gray-500 font-medium">{eq.temaClass}</span>}
            {eq.exchangerType && <span className="text-xs text-gray-500">{eq.exchangerType}</span>}
            {flags}
          </div>
          <p className="text-sm text-gray-700 mb-2">{eq.service || '—'}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
            {eq.sizeIdMm > 0          && <span>⌀{eq.sizeIdMm} mm ID</span>}
            {eq.sizeSlMm > 0          && <span>L {eq.sizeSlMm} mm</span>}
            {eq.noOfShells > 1        && <span>{eq.noOfShells} shells</span>}
            {eq.designPressureShell   && <span>Shell DP {eq.designPressureShell}</span>}
            {eq.designPressureTube    && <span>Tube DP {eq.designPressureTube}</span>}
            {eq.designTempShellC > 0  && <span>Shell T {eq.designTempShellC}°C</span>}
            {eq.designTempTubeC  > 0  && <span>Tube T {eq.designTempTubeC}°C</span>}
            {eq.fluidShell            && <span>Shell: {eq.fluidShell}</span>}
            {eq.fluidTube             && <span>Tube: {eq.fluidTube}</span>}
            {eq.emptyWeightKg != null && <span>Empty wt: {eq.emptyWeightKg} kg</span>}
          </div>
          {warnCount > 0 && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              {warnCount} component{warnCount > 1 ? 's' : ''} with MOC warnings
            </div>
          )}
        </div>
        {hasCostData && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Estimated Cost</p>
            <p className="text-base font-bold text-emerald-700">{inr(eq.totalEquipCost)}</p>
          </div>
        )}
      </div>

      {/* Cost breakdown strip */}
      {hasCostData && (
        <div className="flex flex-wrap gap-x-5 gap-y-0.5 px-4 py-2 bg-emerald-50/60 border-b border-emerald-100 text-[11px]">
          <span className="text-gray-500">Material <span className="font-semibold text-gray-700">{inr(eq.totalMaterialCost)}</span></span>
          <span className="text-gray-400">+</span>
          <span className="text-gray-500">Fabrication <span className="font-semibold text-gray-700">{inr(eq.totalFabricationCost)}</span></span>
          {(eq.totalNozzleCost ?? 0) > 0 && <>
            <span className="text-gray-400">+</span>
            <span className="text-gray-500">Nozzles <span className="font-semibold text-gray-700">{inr(eq.totalNozzleCost)}</span></span>
          </>}
          {(eq.specialCost ?? 0) > 0 && <>
            <span className="text-gray-400">+</span>
            <span className="text-gray-500">Special reqs <span className="font-semibold text-gray-700">{inr(eq.specialCost)}</span></span>
          </>}
          {(eq.inspectionCost ?? 0) > 0 && <>
            <span className="text-gray-400">+</span>
            <span className="text-gray-500">Inspection/testing <span className="font-semibold text-gray-700">{inr(eq.inspectionCost)}</span></span>
          </>}
          <span className="text-gray-400 mx-1">═</span>
          <span className="font-bold text-emerald-700">{inr(eq.totalEquipCost)}</span>
        </div>
      )}

      <div className="px-4 py-2">
        <button onClick={() => setShowBom(v => !v)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-2">
          {showBom ? '▾ Hide BOM' : '▸ Show BOM'} ({eq.bom.length} components)
        </button>
        {showBom && eq.bom.length > 0 && (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {['S No.', 'Component', 'MOC', 'Wt (kg)', 'Qty', 'Rate (₹/kg)', 'Est. Cost (₹)', 'Type / Remarks'].map(h => (
                    <th key={h} className="text-[10px] font-bold tracking-widest text-gray-400 text-left pb-1.5 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eq.bom.map((comp: BomComponent, ci: number) => (
                  <tr key={ci} className={`border-b border-gray-50 align-top ${comp.applicable === 'No' ? 'opacity-40' : ''}`}>
                    <td className="py-1.5 pr-3 text-gray-400 font-mono">{comp.srNo || ci + 1}</td>
                    <td className="py-1.5 pr-3 text-gray-800 font-medium">{comp.component}</td>
                    <td className="py-1.5 pr-3 text-gray-700">{comp.moc ?? <span className="text-red-500 font-semibold">—</span>}</td>
                    <td className="py-1.5 pr-3 text-gray-600 font-mono">{comp.weightKg ?? '—'}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{comp.quantity} {comp.unit}</td>
                    <td className="py-1.5 pr-3 font-mono text-gray-500">
                      {comp.unitCostPerKg != null ? `₹${comp.unitCostPerKg.toLocaleString('en-IN')}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span className={`font-mono font-semibold ${comp.totalCost != null ? 'text-emerald-700' : 'text-gray-300'}`}>
                        {comp.totalCost != null ? inr(comp.totalCost) : '—'}
                      </span>
                      {comp.costBasis && <p className="text-[9px] text-gray-400 leading-tight mt-0.5 max-w-[160px] whitespace-normal">{comp.costBasis}</p>}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-500 max-w-[200px]">
                      {comp.typeDetail && <span className="text-gray-700 mr-2">{comp.typeDetail}</span>}
                      {comp.mocFlag    && <span className="text-amber-700 text-[10px]">⚠ {comp.mocFlag}</span>}
                      {comp.remarks && !comp.mocFlag && <span>{comp.remarks}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {eq.nozzleSchedule.length > 0 && (
          <>
            <button onClick={() => setShowNozzles(v => !v)} className="text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2">
              {showNozzles ? '▾ Hide Nozzles' : '▸ Show Nozzles'} ({eq.nozzleSchedule.length})
            </button>
            {showNozzles && (
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['Nozzle Mark', 'Size', 'ASME Class', 'Schedule', 'Designation', 'MOC Neck', 'MOC Flange', 'Est. Cost (₹)'].map(h => (
                        <th key={h} className="text-[10px] font-bold tracking-widest text-gray-400 text-left pb-1.5 pr-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eq.nozzleSchedule.map((n: NozzleEntry, ni: number) => (
                      <tr key={ni} className="border-b border-gray-50">
                        <td className="py-1.5 pr-3 font-mono font-bold text-gray-700">{n.mark}</td>
                        <td className="py-1.5 pr-3 text-gray-700">{n.sizeNps}</td>
                        <td className="py-1.5 pr-3 text-gray-600">{n.asmeClass}</td>
                        <td className="py-1.5 pr-3 text-gray-600">{n.schedule}</td>
                        <td className="py-1.5 pr-3 text-gray-700">{n.designation}</td>
                        <td className="py-1.5 pr-3 text-gray-600">{n.mocNeck ?? <span className="text-red-400">—</span>}{n.mocFlag && <span className="text-amber-600 ml-1 text-[10px]">⚠</span>}</td>
                        <td className="py-1.5 pr-3 text-gray-600">{n.mocFlange ?? <span className="text-red-400">—</span>}</td>
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          <span className={`font-mono font-semibold ${n.totalCost != null ? 'text-emerald-700' : 'text-gray-300'}`}>
                            {n.totalCost != null ? inr(n.totalCost) : '—'}
                          </span>
                          {n.costBasis && <p className="text-[9px] text-gray-400 leading-tight mt-0.5 max-w-[160px] whitespace-normal">{n.costBasis}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stage7Content({ inquiry, completedUpTo, onRefresh }: Stage7ContentProps) {
  const [data, setData]             = useState<ApiStage7 | null>(null);
  const [loading, setLoading]       = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [err, setErr]               = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.stage7.get(inquiry.id)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setErr(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inquiry.id]);

  async function handleExtract() {
    setExtracting(true);
    setErr(null);
    try {
      const result = await api.stage7.extract(inquiry.id);
      setData(result);
    } catch (e) {
      const msg = String(e);
      setErr(msg.toLowerCase().includes('stage 4')
        ? 'Stage 4 extraction must be completed first — Stage 7 uses the same document.'
        : msg);
    } finally {
      setExtracting(false);
    }
  }

  async function handleEstimateCost() {
    setEstimating(true);
    setErr(null);
    try {
      const result = await api.stage7.estimateCost(inquiry.id);
      setData(result);
    } catch (e) {
      setErr(String(e));
    } finally {
      setEstimating(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  const status    = data?.status ?? 'pending';
  const proj      = data?.projectInfo;
  const equipment = data?.equipment ?? [];

  const activeEquip      = equipment.filter(e => !e.deletedFromScope);
  const projectTotal     = activeEquip.reduce((s, e) => s + (e.totalEquipCost ?? 0), 0);
  const hasCosts         = activeEquip.some(e => e.totalEquipCost != null && e.totalEquipCost > 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={handleExtract} disabled={extracting || estimating} className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
          {extracting ? 'Extracting BOM…' : status === 'done' ? '↺ Re-extract BOM' : '✦ Extract BOM'}
        </button>
        {status === 'done' && (
          <button onClick={handleEstimateCost} disabled={extracting || estimating} className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
            {estimating ? 'Estimating…' : '₹ Re-estimate Costs'}
          </button>
        )}
        {(extracting || estimating) && (
          <span className="text-sm text-indigo-600 animate-pulse">
            {extracting ? 'Reading datasheets…' : 'Applying market rates…'}
          </span>
        )}
        {status === 'done' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">done · {equipment.length} tag{equipment.length !== 1 ? 's' : ''}</span>}
        {status === 'failed' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">failed</span>}
      </div>
      {err && <p className="text-red-500 text-sm mb-4">{err}</p>}
      {data?.error && status === 'failed' && <p className="text-red-400 text-xs mb-4 font-mono">{data.error}</p>}

      {proj && (proj.client || proj.jobNo || proj.prNumber) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 mb-4 px-1">
          {proj.client     && <span><span className="font-semibold text-gray-700">Client:</span> {proj.client}</span>}
          {proj.jobNo      && <span><span className="font-semibold text-gray-700">Job No:</span> {proj.jobNo}</span>}
          {proj.prNumber   && <span><span className="font-semibold text-gray-700">PR No:</span> {proj.prNumber}</span>}
          {proj.revision   && <span><span className="font-semibold text-gray-700">Rev:</span> {proj.revision}</span>}
          {proj.consultant && <span><span className="font-semibold text-gray-700">Consultant:</span> {proj.consultant}</span>}
          {proj.date       && <span><span className="font-semibold text-gray-700">Date:</span> {proj.date}</span>}
        </div>
      )}

      {/* Project-level cost summary */}
      {hasCosts && projectTotal > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 mb-5">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase mb-0.5">Project Cost Estimate</p>
            <p className="text-xs text-gray-500">{activeEquip.filter(e => e.totalEquipCost).length} of {activeEquip.length} tag{activeEquip.length !== 1 ? 's' : ''} costed · includes material, fabrication &amp; testing</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{inr(projectTotal)}</p>
        </div>
      )}

      {equipment.map((eq, i) => <EquipmentCard key={eq.tagNo || i} eq={eq} index={i} />)}
      {status === 'done' && equipment.length === 0 && <p className="text-sm text-gray-400">No equipment found.</p>}

      {status === 'done' && completedUpTo < 7 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button onClick={async () => { await markStageComplete(inquiry.id, 7, onRefresh); }} className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-green-600 hover:bg-green-700">
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

  const [showChat, setShowChat] = useState(false);

  return (
    <>
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
          <Stage5Content inquiry={inquiry} completedUpTo={apiData.completedUpTo} onRefresh={onRefresh} />
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

    <button
      onClick={() => setShowChat(true)}
      title="Chat with an uploaded document"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center justify-center"
    >
      <Bot size={24} />
    </button>
    {showChat && <DocChatModal documents={documents} onClose={() => setShowChat(false)} />}
    </>
  );
}