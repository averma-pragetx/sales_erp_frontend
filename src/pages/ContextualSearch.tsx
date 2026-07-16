import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { ApiCorpusDoc, ApiSearchChatSummary, ApiSearchSource, LlmProvider } from '../lib/api';

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

const fmt = (n: number) => n.toLocaleString('en-IN');

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

function ChartBlock({ spec }: { spec: ChartSpec }) {
  if (spec.type === 'bar') return <BarChart spec={spec} />;
  if (spec.type === 'line') return <LineChart spec={spec} />;
  return <StatTile spec={spec} />;
}

export default function ContextualSearch() {
  const [corpus, setCorpus] = useState<ApiCorpusDoc[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<LlmProvider>('gemini');
  const [docId, setDocId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [chats, setChats] = useState<ApiSearchChatSummary[]>([]);
  const [chatId, setChatId] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.search.corpus().then(setCorpus).catch(() => setCorpus([]));
    api.search.chats().then(setChats).catch(() => {});
  }, []);

  const openChat = async (id: string) => {
    if (busy) return;
    try {
      const chat = await api.search.chat(id);
      setChatId(chat.chatId);
      setMessages(chat.messages.map(m => ({ role: m.role, text: m.text, sources: m.sources })));
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

  const removeChat = async (id: string) => {
    try {
      await api.search.deleteChat(id);
      setChats(prev => prev.filter(c => c.chatId !== id));
      if (id === chatId) newChat();
    } catch {
      setError('Failed to delete chat.');
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const ask = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setError('');
    setInput('');
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const result = await api.search.ask(question, history, provider, docId, chatId);
      setMessages(prev => [...prev, { role: 'model', text: result.answer, sources: result.sources }]);
      setChatId(result.chatId);
      api.search.chats().then(setChats).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
      setMessages(prev => prev.slice(0, -1));
      setInput(question);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={newChat}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {chats.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No past chats.</p>}
          {chats.map(c => (
            <div
              key={c.chatId}
              className={[
                'group flex items-center gap-1 px-3 py-2 cursor-pointer text-sm',
                c.chatId === chatId ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50',
              ].join(' ')}
              onClick={() => openChat(c.chatId)}
            >
              <span className="flex-1 truncate" title={c.title}>{c.title}</span>
              <button
                onClick={e => { e.stopPropagation(); removeChat(c.chatId); }}
                className="hidden group-hover:block text-gray-400 hover:text-red-600 text-xs px-1"
                title="Delete chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex flex-col h-full flex-1 max-w-4xl mx-auto px-6 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Contextual Search</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {corpus === null
            ? 'Loading corpus…'
            : `Ask questions across ${corpus.length} indexed document${corpus.length === 1 ? '' : 's'}. Answers cite document and page.`}
        </p>
      </div>

      {corpus !== null && corpus.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No documents indexed yet. Open an inquiry document and build its page index to make it searchable.
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 py-2">
        {messages.length === 0 && corpus !== null && corpus.length > 0 && (
          <div className="text-sm text-gray-400 text-center pt-16">
            e.g. "Which tenders require SS316L?" or "What is the design pressure in the GAIL inquiry?"
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={[
                'max-w-[85%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap',
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800',
              ].join(' ')}
            >
              {m.role === 'user'
                ? m.text
                : parseSegments(m.text).map((seg, j) =>
                    seg.kind === 'chart' ? (
                      <ChartBlock key={j} spec={seg.spec} />
                    ) : seg.kind === 'raw' ? (
                      <pre key={j} className="my-1 rounded bg-gray-100 p-2 text-xs text-gray-600 overflow-x-auto">{seg.text}</pre>
                    ) : (
                      <span key={j}>{seg.text}</span>
                    ),
                  )}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                  {m.sources.map(s => (
                    <Link
                      key={s.docId}
                      to={`/inquiry/${encodeURIComponent(s.inquiryId)}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 hover:bg-gray-200 px-2.5 py-0.5 text-xs text-gray-600"
                      title={`Inquiry ${s.inquiryId}`}
                    >
                      {s.title}
                      <span className="text-gray-400">p. {s.pages.join(', ')}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-white border border-gray-200 px-4 py-2.5 text-sm text-gray-400 animate-pulse">
              Searching documents…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <select
          value={provider}
          onChange={e => setProvider(e.target.value as LlmProvider)}
          className="rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-600"
        >
          <option value="gemini">Gemini</option>
          <option value="openai">OpenAI</option>
        </select>
        <select
          value={docId}
          onChange={e => setDocId(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-600 max-w-[220px]"
        >
          <option value="">All documents ({corpus?.length ?? 0})</option>
          {(corpus ?? []).map(d => (
            <option key={d.docId} value={d.docId}>
              {d.title} — {d.inquiryId}
            </option>
          ))}
        </select>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask(); }}
          placeholder="Ask across all indexed documents…"
          disabled={corpus !== null && corpus.length === 0}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={ask}
          disabled={busy || !input.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Ask
        </button>
      </div>
      </div>
    </div>
  );
}
