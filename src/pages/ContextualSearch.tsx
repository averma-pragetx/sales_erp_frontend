import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import jsPDF from 'jspdf';
import { api } from '../lib/api';
import type { ApiCorpusDoc, ApiScraper, ApiScrapedTender, ApiSearchChatSummary, ApiSearchSource, LlmProvider } from '../lib/api';

interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: ApiSearchSource[];
}

interface ChartSpec {
  type: 'bar' | 'line' | 'stat';
  title?: string;
  unit?: string;
  labels?: string[];
  values?: number[];
  value?: number;
}

type Segment = { kind: 'text'; text: string } | { kind: 'chart'; spec: ChartSpec } | { kind: 'raw'; text: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /```chart\s*([\s\S]*?)```/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) segments.push({ kind: 'text', text: text.slice(last, m.index).trim() });
    try {
      const spec = JSON.parse(m[1]) as ChartSpec;
      const seriesOk = Array.isArray(spec.labels) && Array.isArray(spec.values) &&
        spec.labels.length === spec.values.length && spec.values.every(v => Number.isFinite(v));
      if ((spec.type === 'bar' || spec.type === 'line') && seriesOk && spec.labels!.length > 0) {
        segments.push({ kind: 'chart', spec });
      } else if (spec.type === 'stat' && Number.isFinite(spec.value)) {
        segments.push({ kind: 'chart', spec });
      } else {
        segments.push({ kind: 'raw', text: m[1].trim() });
      }
    } catch {
      segments.push({ kind: 'raw', text: m[1].trim() });
    }
    last = re.lastIndex;
  }
  if (last < text.length) {
    const tail = text.slice(last).trim();
    if (tail) segments.push({ kind: 'text', text: tail });
  }
  return segments;
}

interface TableBlock { header: string[]; rows: string[][]; raw: string }
type TextPart = { kind: 'text'; text: string } | { kind: 'table'; table: TableBlock };

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(l) && l.includes('-');
const tableCells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

// ponytail: hand-rolled markdown-table splitter (a few regex lines) instead of a
// markdown-table parser dependency — only need header+rows+raw, not a full AST.
function splitTables(text: string): TextPart[] {
  const lines = text.split('\n');
  const out: TextPart[] = [];
  let buf: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isTableRow(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      if (buf.length) { out.push({ kind: 'text', text: buf.join('\n') }); buf = []; }
      const header = tableCells(lines[i]);
      const raw = [lines[i], lines[i + 1]];
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        raw.push(lines[j]);
        rows.push(tableCells(lines[j]));
        j++;
      }
      out.push({ kind: 'table', table: { header, rows, raw: raw.join('\n') } });
      i = j;
    } else {
      buf.push(lines[i]);
      i++;
    }
  }
  if (buf.length) out.push({ kind: 'text', text: buf.join('\n') });
  return out;
}

function downloadBlob(content: string, mimeType: string, fileName: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function tableToCsv(table: TableBlock): string {
  return [table.header, ...table.rows].map(r => r.map(csvCell).join(',')).join('\n');
}

const safeFileName = (s: string) => s.replace(/[^\w -]/g, '_').slice(0, 60) || 'chat';

const fmt = (n: number) => n.toLocaleString('en-IN');

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const SUGGESTIONS = [
  'Which documents mention SS316L, and where?',
  'List the equipment items and their quantities. Include a chart.',
  'What design codes and inspection requirements are specified?',
  'Summarize the scope of supply across all documents.',
];

const BAR_COLOR = '#2563eb';

function BarChart({ spec }: { spec: ChartSpec }) {
  const labels = spec.labels!.slice(0, 12);
  const values = spec.values!.slice(0, 12);
  const max = Math.max(...values.map(Math.abs), 1e-9);
  return (
    <figure className="my-2 rounded-md border border-gray-200 bg-gray-50/50 p-3">
      {spec.title && <figcaption className="text-xs font-semibold text-gray-700 mb-2">{spec.title}{spec.unit ? ` (${spec.unit})` : ''}</figcaption>}
      <div className="space-y-1.5">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-2" title={`${label}: ${fmt(values[i])}${spec.unit ? ' ' + spec.unit : ''}`}>
            <span className="w-32 shrink-0 truncate text-xs text-gray-600 text-right">{label}</span>
            <div className="flex-1 flex items-center gap-1.5">
              <div
                className="h-3 rounded-r-full min-w-[2px]"
                style={{ width: `${(Math.abs(values[i]) / max) * 100}%`, backgroundColor: BAR_COLOR }}
              />
              <span className="text-xs text-gray-700 whitespace-nowrap">{fmt(values[i])}</span>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

function LineChart({ spec }: { spec: ChartSpec }) {
  const labels = spec.labels!.slice(0, 50);
  const values = spec.values!.slice(0, 50);
  const W = 320, H = 120, PAD = 10;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / Math.max(values.length - 1, 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <figure className="my-2 rounded-md border border-gray-200 bg-gray-50/50 p-3">
      {spec.title && <figcaption className="text-xs font-semibold text-gray-700 mb-2">{spec.title}{spec.unit ? ` (${spec.unit})` : ''}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#e5e7eb" strokeWidth="1" />
        <line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke="#f3f4f6" strokeWidth="1" />
        <polyline points={points} fill="none" stroke={BAR_COLOR} strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={BAR_COLOR} stroke="#fff" strokeWidth="1.5">
            <title>{`${labels[i]}: ${fmt(v)}${spec.unit ? ' ' + spec.unit : ''}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span className="truncate max-w-[45%]">{labels[0]}</span>
        <span className="truncate max-w-[45%] text-right">{labels[labels.length - 1]}</span>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>min {fmt(min)}</span>
        <span>max {fmt(max)}</span>
      </div>
    </figure>
  );
}

function StatTile({ spec }: { spec: ChartSpec }) {
  return (
    <figure className="my-2 rounded-md border border-gray-200 bg-gray-50/50 px-4 py-3 inline-block">
      {spec.title && <figcaption className="text-xs text-gray-500">{spec.title}</figcaption>}
      <p className="text-2xl font-bold text-gray-900">
        {fmt(spec.value!)}
        {spec.unit && <span className="text-sm font-medium text-gray-500 ml-1">{spec.unit}</span>}
      </p>
    </figure>
  );
}

function PillSelect({ label, value, onChange, children, className }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={['inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white pl-3 pr-2 py-1 hover:border-gray-300 transition-colors', className ?? ''].join(' ')}>
      <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">{label}</span>
      <span className="relative flex items-center min-w-0">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none bg-transparent pr-4 text-xs font-medium text-gray-700 cursor-pointer focus:outline-none truncate max-w-[180px]"
        >
          {children}
        </select>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="absolute right-0 pointer-events-none text-gray-400">
          <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

function ScraperScopePicker({ scrapers, tenders, selected, onToggle }: {
  scrapers: ApiScraper[];
  tenders: ApiScrapedTender[];
  selected: string[];
  onToggle: (tenderName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewScraper, setViewScraper] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const label = selected.length === 0
    ? 'All documents'
    : selected.length === 1
      ? tenders.find(t => t.tenderName === selected[0])?.title ?? selected[0]
      : `${selected.length} tenders`;
  const viewTenders = tenders.filter(t => t.scraperId === viewScraper);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); }}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white pl-3 pr-2.5 py-1 hover:border-gray-300 transition-colors"
      >
        <span className="text-[11px] font-medium text-gray-400">Scope:</span>
        <span className="text-xs font-medium text-gray-700 truncate max-w-[220px]">{label}</span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-gray-400 shrink-0">
          <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 z-10 w-80 rounded-lg border border-gray-200 bg-white shadow-lg py-1 max-h-64 overflow-y-auto">
          {!viewScraper ? (
            <>
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Scrapers</p>
              <div className="border-t border-gray-100 my-1" />
              {scrapers.map(s => (
                <button
                  key={s.scraperId}
                  onClick={() => setViewScraper(s.scraperId)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-gray-700">{s.name}</span>
                    <span className="block font-mono text-[11px] text-gray-400">{s.scraperId}</span>
                  </span>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-gray-400 shrink-0">
                    <path d="M3 1.5L5.5 4L3 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                onClick={() => setViewScraper('')}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-50"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0">
                  <path d="M5 1.5L2.5 4L5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {scrapers.find(s => s.scraperId === viewScraper)?.name ?? viewScraper} · tenders
              </button>
              <div className="border-t border-gray-100 my-1" />
              <p className="px-3 py-1 text-[10px] text-gray-400">Select any number to compare across them.</p>
              {viewTenders.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No tenders for this scraper yet.</p>}
              {viewTenders.map(t => {
                const checked = selected.includes(t.tenderName);
                return (
                  <button
                    key={t.tenderName}
                    onClick={() => onToggle(t.tenderName)}
                    className={['w-full flex items-start gap-2 text-left px-3 py-2 hover:bg-gray-50', checked ? 'bg-blue-50' : ''].join(' ')}
                  >
                    <span className={[
                      'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                      checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300',
                    ].join(' ')}>
                      {checked && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={['block truncate text-sm', checked ? 'text-blue-800 font-medium' : 'text-gray-700'].join(' ')}>
                        {t.title}
                      </span>
                      <span className="block truncate text-[11px] text-gray-400">
                        {t.client || t.tenderId}{t.status === 'pushed' ? ` · ${t.pushedInquiryId}` : ' · not pushed'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChartBlock({ spec }: { spec: ChartSpec }) {
  if (spec.type === 'bar') return <BarChart spec={spec} />;
  if (spec.type === 'line') return <LineChart spec={spec} />;
  return <StatTile spec={spec} />;
}

function ModelAnswer({ text }: { text: string }) {
  return (
    <>
      {parseSegments(text).map((seg, j) =>
        seg.kind === 'chart' ? (
          <ChartBlock key={j} spec={seg.spec} />
        ) : seg.kind === 'raw' ? (
          <pre key={j} className="my-1 rounded bg-gray-100 p-2 text-xs text-gray-600 overflow-x-auto">{seg.text}</pre>
        ) : (
          splitTables(seg.text).map((part, k) =>
            part.kind === 'table' ? (
              <div key={`${j}-${k}`} className="my-1">
                <div className="flex justify-end">
                  <button
                    onClick={() => downloadBlob(tableToCsv(part.table), 'text/csv', 'table.csv')}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="chat-markdown" dangerouslySetInnerHTML={{ __html: marked.parse(part.table.raw) as string }} />
              </div>
            ) : (
              <div key={`${j}-${k}`} className="chat-markdown" dangerouslySetInnerHTML={{ __html: marked.parse(part.text) as string }} />
            ),
          )
        ),
      )}
    </>
  );
}

export default function ContextualSearch() {
  const [corpus, setCorpus] = useState<ApiCorpusDoc[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<LlmProvider>('gemini');
  const [scrapers, setScrapers] = useState<ApiScraper[]>([]);
  const [tenders, setTenders] = useState<ApiScrapedTender[]>([]);
  const [selectedTenders, setSelectedTenders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [chats, setChats] = useState<ApiSearchChatSummary[]>([]);
  const [chatId, setChatId] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [editingId, setEditingId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [railOpen, setRailOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    api.search.corpus().then(setCorpus).catch(() => setCorpus([]));
    api.search.chats().then(setChats).catch(() => { });
    api.scrapers.list().then(setScrapers).catch(() => { });
    api.scrapedTenders.list(1, 100).then(res => setTenders(res.items)).catch(() => { });
  }, []);

  const docIds = useMemo(() => {
    if (selectedTenders.length === 0 || !corpus) return [];
    const inquiryIds = new Set(
      tenders.filter(t => selectedTenders.includes(t.tenderName) && t.pushedInquiryId).map(t => t.pushedInquiryId!),
    );
    if (inquiryIds.size === 0) return [];
    return corpus.filter(c => inquiryIds.has(c.inquiryId)).map(c => c.docId);
  }, [selectedTenders, tenders, corpus]);
  const tenderHasNoDocs = selectedTenders.length > 0 && docIds.length === 0;

  const openChat = async (id: string) => {
    if (busy) return;
    try {
      const chat = await api.search.chat(id);
      setChatId(chat.chatId);
      setMessages(chat.messages.map(m => ({ role: m.role, text: m.text, sources: m.sources })));
      setSelectedTenders(chat.scopeTenderNames ?? []);
      setError('');
    } catch {
      setError('Failed to load chat.');
    }
  };

  const newChat = () => {
    if (busy) return;
    setChatId('');
    setMessages([]);
    setError('');
  };

  const saveRename = async (id: string) => {
    const title = editTitle.trim();
    setEditingId('');
    const current = chats.find(c => c.chatId === id);
    if (!title || !current || title === current.title) return;
    if (!window.confirm(`Rename "${current.title}" to "${title}"?`)) return;
    try {
      await api.search.renameChat(id, title);
      setChats(prev => prev.map(c => (c.chatId === id ? { ...c, title } : c)));
    } catch {
      setError('Failed to rename chat.');
    }
  };

  const removeChat = async (id: string) => {
    const current = chats.find(c => c.chatId === id);
    if (!window.confirm(`Delete "${current?.title ?? 'this chat'}"? This can't be undone.`)) return;
    try {
      await api.search.deleteChat(id);
      setChats(prev => prev.filter(c => c.chatId !== id));
      if (id === chatId) newChat();
    } catch {
      setError('Failed to delete chat.');
    }
  };

  // Autoscroll only when already near the bottom — never yank the view while
  // the user is scrolled up reading an earlier answer.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom || busy) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const copyAnswer = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(-1), 1500);
    }).catch(() => { });
  };

  const ask = async (preset?: string) => {
    const question = (preset ?? input).trim();
    if (!question || busy) return;
    setError('');
    setInput('');
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setBusy(true);
    setStreaming('');
    try {
      const result = await api.search.ask(question, history, provider, docIds, chatId, delta => {
        setStreaming(prev => (prev ?? '') + delta);
      }, selectedTenders);
      setMessages(prev => [...prev, { role: 'model', text: result.answer, sources: result.sources }]);
      setChatId(result.chatId);
      api.search.chats().then(setChats).catch(() => { });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
      setMessages(prev => prev.slice(0, -1));
      setInput(question);
    } finally {
      setBusy(false);
      setStreaming(null);
    }
  };

  const openSourceDoc = async (docId: string, page: number) => {
    try {
      const doc = await api.documents.get(docId);
      if (doc.presignedUrl) window.open(`${doc.presignedUrl}#page=${page}`, '_blank', 'noopener');
    } catch {
      setError('Could not open that document.');
    }
  };

  const exportMarkdown = () => {
    const title = chats.find(c => c.chatId === chatId)?.title || 'Contextual Search chat';
    const md = messages.map(m => {
      const who = m.role === 'user' ? '**You**' : '**Assistant**';
      const sourceLine = m.sources?.length
        ? `\n\nSources: ${m.sources.map(s => `${s.title} (p. ${s.pages.join(', ')})`).join('; ')}`
        : '';
      return `${who}:\n\n${m.text}${sourceLine}`;
    }).join('\n\n---\n\n');
    downloadBlob(`# ${title}\n\n${md}`, 'text/markdown', `${safeFileName(title)}.md`);
  };

  const exportPdf = () => {
    const title = chats.find(c => c.chatId === chatId)?.title || 'Contextual Search chat';
    const doc = new jsPDF();
    const marginX = 14;
    const maxWidth = 180;
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 18;
    doc.setFontSize(14);
    doc.text(title, marginX, y);
    y += 10;
    doc.setFontSize(10);
    for (const m of messages) {
      const who = m.role === 'user' ? 'You: ' : 'Assistant: ';
      const body = m.text.replace(/```chart[\s\S]*?```/g, '[chart omitted]');
      const lines = doc.splitTextToSize(who + body, maxWidth);
      for (const line of lines) {
        if (y > pageHeight - 16) { doc.addPage(); y = 18; }
        doc.text(line, marginX, y);
        y += 6;
      }
      y += 4;
    }
    doc.save(`${safeFileName(title)}.pdf`);
  };

  return (
    <div className="flex h-full">
      <aside className={[
        'shrink-0 border-r border-gray-200 bg-white flex flex-col transition-all duration-200',
        railOpen ? 'w-60' : 'w-11',
      ].join(' ')}>
        <div className={['border-b border-gray-100 flex items-center gap-1.5', railOpen ? 'p-3' : 'p-2 flex-col'].join(' ')}>
          {railOpen && (
            <button
              onClick={newChat}
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + New chat
            </button>
          )}
          {!railOpen && (
            <button
              onClick={newChat}
              className="rounded-md border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50"
              title="New chat"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setRailOpen(o => !o)}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            title={railOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={railOpen ? '' : 'rotate-180'}>
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {!railOpen && chats.length > 0 && (
          <p className="mt-2 text-center text-[10px] text-gray-400" title={`${chats.length} chats`}>{chats.length}</p>
        )}
        {railOpen && (
          <div className="flex-1 overflow-y-auto py-1">
            {chats.length > 0 && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Recent</p>
            )}
            {chats.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No past chats yet.</p>}
            {chats.map(c => (
              <div
                key={c.chatId}
                className={[
                  'group flex items-start gap-1 px-3 py-2 cursor-pointer border-l-2',
                  c.chatId === chatId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent hover:bg-gray-50',
                ].join(' ')}
                onClick={() => openChat(c.chatId)}
              >
                <div className="flex-1 min-w-0">
                  {editingId === c.chatId ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveRename(c.chatId);
                        if (e.key === 'Escape') setEditingId('');
                      }}
                      onBlur={() => saveRename(c.chatId)}
                      className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  ) : (
                    <p className={['truncate text-sm', c.chatId === chatId ? 'text-blue-800 font-medium' : 'text-gray-700'].join(' ')} title={c.title}>
                      {c.title}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400">{timeAgo(c.updatedAt)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setEditingId(c.chatId); setEditTitle(c.title); }}
                  className="hidden group-hover:block text-gray-400 hover:text-blue-600 px-0.5 pt-0.5"
                  title="Rename chat"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M11.3 2.2a1.5 1.5 0 0 1 2.1 2.1l-8 8-2.9.8.8-2.9 8-8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); removeChat(c.chatId); }}
                  className="hidden group-hover:block text-gray-400 hover:text-red-600 text-xs px-1 pt-0.5"
                  title="Delete chat"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      <div className="flex flex-col h-full flex-1 max-w-4xl mx-auto px-6 py-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Contextual Search</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {corpus === null
                ? 'Loading corpus…'
                : `Ask questions across ${corpus.length} indexed document${corpus.length === 1 ? '' : 's'}. Answers cite document and page.`}
            </p>
          </div>
          {messages.length > 0 && (
            <div ref={exportRef} className="relative shrink-0 pt-1">
              <button
                onClick={() => setExportOpen(o => !o)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:text-blue-600 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150"
                title="Export options"
              >
                <span>Export Chat</span>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={`text-gray-400 transition-transform duration-150 ${exportOpen ? 'rotate-180' : ''}`}>
                  <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 z-20 w-32 rounded-md border border-gray-200 bg-white shadow-md py-1">
                  <button
                    onClick={() => {
                      exportMarkdown();
                      setExportOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                  >
                    <span>Export as .md</span>
                    {/* <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">MD</span> */}
                  </button>
                  <button
                    onClick={() => {
                      exportPdf();
                      setExportOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                  >
                    <span>Export as .pdf</span>
                    {/* <span className="text-[9px] font-mono text-red-500 bg-red-50 px-1 py-0.5 rounded">PDF</span> */}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {corpus !== null && corpus.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No documents indexed yet. Open an inquiry document and build its page index to make it searchable.
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 py-2">
          {messages.length === 0 && corpus !== null && corpus.length > 0 && (
            <div className="pt-12 px-4 max-w-lg mx-auto text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100">
                <svg width="36" height="36" viewBox="0 0 16 16" fill="none" className="text-blue-600">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800">Ask your documents</h2>
              <p className="text-xs text-gray-400 mt-1 mb-4">Answers are grounded in indexed document pages, with charts and tables where numbers allow.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={[
                  'max-w-[85%] rounded-lg px-4 py-2.5 text-sm',
                  m.role === 'user'
                    ? 'bg-blue-600 text-white whitespace-pre-wrap rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 shadow-sm rounded-bl-sm',
                ].join(' ')}
              >
                {m.role === 'user' ? m.text : <ModelAnswer text={m.text} />}
                {m.role === 'model' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                    {m.sources && m.sources.length > 0 && (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Sources</span>
                        {m.sources.map(s => (
                          <span
                            key={s.docId}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 hover:bg-gray-200 px-2.5 py-0.5 text-xs text-gray-600"
                          >
                            <button
                              onClick={() => openSourceDoc(s.docId, s.pages[0])}
                              className="hover:underline"
                              title={`Open ${s.title} at page ${s.pages[0]}`}
                            >
                              {s.title}
                              <span className="text-gray-400"> p. {s.pages.join(', ')}</span>
                            </button>
                            <Link
                              to={`/inquiry/${encodeURIComponent(s.inquiryId)}`}
                              className="text-gray-400 hover:text-blue-600"
                              title={`Inquiry ${s.inquiryId}`}
                            >
                              ↗
                            </Link>
                          </span>
                        ))}
                      </>
                    )}
                    <button
                      onClick={() => copyAnswer(i, m.text)}
                      className="ml-auto text-[11px] text-gray-400 hover:text-gray-600"
                      title="Copy answer"
                    >
                      {copiedIdx === i ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {streaming !== null && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-4 py-2.5 text-sm bg-white border border-gray-200 text-gray-800 shadow-sm rounded-bl-sm">
                {streaming === '' ? (
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:300ms]" />
                    </span>
                    <span className="text-xs text-gray-400">Searching documents…</span>
                  </div>
                ) : (
                  <ModelAnswer text={streaming} />
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200">
          <ScraperScopePicker
            scrapers={scrapers}
            tenders={tenders}
            selected={selectedTenders}
            onToggle={t => setSelectedTenders(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
          />
          <PillSelect label="Model" value={provider} onChange={v => setProvider(v as LlmProvider)}>
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
          </PillSelect>
          {selectedTenders.map(t => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 pl-2.5 pr-1.5 py-0.5 text-[11px]">
              {tenders.find(x => x.tenderName === t)?.title ?? t}
              <button onClick={() => setSelectedTenders(prev => prev.filter(x => x !== t))} className="text-blue-400 hover:text-blue-700" title="Remove from scope">
                ✕
              </button>
            </span>
          ))}
          {selectedTenders.length > 0 && (
            <button
              onClick={() => setSelectedTenders([])}
              className="text-[11px] text-blue-600 hover:underline shrink-0"
              title="Search all documents again"
            >
              clear all
            </button>
          )}
          {tenderHasNoDocs && (
            <span className="text-[11px] text-amber-600">
              No indexed documents for the selected tender(s) yet — push to sales and build page indexes first.
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={e => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask();
                if (inputRef.current) inputRef.current.style.height = 'auto';
              }
            }}
            placeholder={selectedTenders.length === 1
              ? `Ask about "${tenders.find(t => t.tenderName === selectedTenders[0])?.title ?? selectedTenders[0]}"…`
              : selectedTenders.length > 1
                ? `Ask across ${selectedTenders.length} selected tenders…`
                : 'Ask across all indexed documents…'}
            disabled={(corpus !== null && corpus.length === 0) || tenderHasNoDocs}
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={() => ask()}
            disabled={busy || !input.trim() || tenderHasNoDocs}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
            title="Ask"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
