import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiScraper } from '../lib/api';
import { api } from '../lib/api';
// import TenderTable from '../components/TenderTable';

const SCRAPER_STATUS_STYLES: Record<ApiScraper['status'], { badge: string; bar: string }> = {
  running: { badge: 'bg-green-100 text-green-700', bar: 'bg-gradient-to-r from-green-400 to-green-700 animate-scroll-bar' },
  idle: { badge: 'bg-gray-100 text-gray-500', bar: 'bg-gray-200' },
  error: { badge: 'bg-red-100 text-red-600', bar: 'bg-red-500' },
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function ScheduleDialog({ scraper, onClose }: { scraper: ApiScraper; onClose: () => void }) {
  const [startTime, setStartTime] = useState('09:00');
  const [interval, setInterval] = useState('Every 1 hour (between active days)');
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  // const [holidays, setHolidays] = useState("Don't run on Indian gazetted holidays");/8 
  const [msg, setMsg] = useState('');

  const toggleDay = (d: string) =>
    setDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : DAYS.filter(x => prev.includes(x) || x === d)));

  const flash = (text: string, close?: boolean) => {
    setMsg(text);
    setTimeout(() => (close ? onClose() : setMsg('')), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-900">Scrape Frequency · {scraper.name}</h2>
            <p className="font-mono text-xs text-gray-500 mt-0.5">{scraper.scraperId} · {scraper.actor}</p>
          </div>
          <button className="text-gray-400 hover:text-gray-600 text-lg leading-none" onClick={onClose}>✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-1.5">Current Schedule</p>
            <p className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-sm text-gray-700 font-mono">{scraper.cron}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-1.5">Start Time</p>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-1.5">Interval</p>
              <select
                value={interval}
                onChange={e => setInterval(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option>Every 1 hour (between active days)</option>
                <option>Every 2 hours (between active days)</option>
                <option>Every 4 hours (between active days)</option>
                <option>Every 6 hours (between active days)</option>
                <option>Once daily</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-1.5">Days of the Week</p>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`py-2 rounded-md text-sm font-semibold border transition ${
                    days.includes(d)
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">Selected: {days.length ? days.join(', ') : 'none'}</p>
          </div>

          {/* <div>
            <p className="text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-1.5">Skip on Holidays</p>
            <select
              value={holidays}
              onChange={e => setHolidays(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option>Don't run on Indian gazetted holidays</option>
              <option>Run on all days including holidays</option>
              <option>Skip only national holidays</option>
            </select>
          </div> */}

          {msg && (
            <p className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2.5">✓ {msg}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
          >
            Cancel
          </button>
          {/* <button
            onClick={() => flash(`Immediate sync triggered for ${scraper.name}. Results will appear shortly.`)}
            className="px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
          >
            ⟳ Run Immediate Sync
          </button> */}
          <button
            onClick={() => flash(`Schedule saved for ${scraper.name}.`, true)}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-800 text-white hover:bg-blue-900"
          >
            Save schedule
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScraperCard({ scraper, onClick, onSchedule }: { scraper: ApiScraper; onClick?: () => void; onSchedule?: () => void }) {
  const styles = SCRAPER_STATUS_STYLES[scraper.status] ?? SCRAPER_STATUS_STYLES.idle;
  const conv = scraper.leads24h > 0 ? Math.round((scraper.qualified24h / scraper.leads24h) * 100) : 0;
  return (
    <div
      // onClick={onClick}
      // title={onClick ? `View ${scraper.name} tenders` : undefined}
      className={`relative bg-white rounded-lg border border-gray-200 px-3.5 py-3 overflow-hidden ${onClick ? 'cursor-default transition hover:-translate-y-px hover:shadow-md' : ''
        }`}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${styles.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-bold text-gray-900 whitespace-nowrap">{scraper.name}</p>
          <p className="font-mono text-[10px] text-gray-400 mt-0.5">{scraper.scraperId}</p>
        </div>
        <span className={`text-[10px] font-bold tracking-wide capitalize px-1.5 py-px rounded ${styles.badge}`}>
          {scraper.status}
        </span>
      </div>
      <p className="text-[11.5px] text-gray-500 mt-2 leading-snug">{scraper.target}</p>
      <span className="inline-block font-mono text-[10.5px] text-blue-800 bg-blue-50 px-1.5 py-px rounded mt-1.5">
        {scraper.actor}
      </span>
      <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 text-[11px]">
        <span className="text-gray-500">Schedule</span><span className="font-mono text-gray-900">{scraper.cron}</span>
        <span className="text-gray-500">Last run</span><span className="font-mono text-gray-900">{scraper.lastRun}</span>
        <span className="text-gray-500">Next run</span><span className="font-mono text-gray-900">{scraper.nextRun}</span>
        <span className="text-gray-500">Runtime</span><span className="font-mono text-gray-900">{scraper.runtime}</span>
      </div>
      {scraper.errorMsg && (
        <p className="bg-red-50 text-red-600 px-2 py-1.5 text-[11px] rounded mt-1.5 uppercase">⚠ {scraper.errorMsg}</p>
      )}
      <div className="flex gap-2.5 mt-2.5">
        <div className="flex-1 px-2 py-1.5 bg-gray-100 rounded">
          <p className="font-mono text-base font-bold text-gray-900 leading-none">{scraper.leads24h}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">tenders</p>
        </div>
        <div className="flex-1 px-2 py-1.5 bg-gray-100 rounded">
          <p className="font-mono text-base font-bold text-gray-900 leading-none">{scraper.qualified24h}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">qualified</p>
        </div>
        <div className="flex-1 px-2 py-1.5 bg-gray-100 rounded">
          <p className="font-mono text-base font-bold text-gray-900 leading-none">{conv}%</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">conv.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        {/* <div className="flex-1 h-1 bg-gray-100 rounded-sm overflow-hidden">
          <span className="block h-full bg-blue-600" style={{ width: `${scraper.quotaPct}%` }} />
        </div>
        <span className="font-mono text-[10px] text-gray-500 min-w-8 text-right">{scraper.quotaPct}% quota</span> */}
      </div>
      <div className="flex gap-1.5 mt-2.5">
        {/* <span className="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 cursor-default select-none">Logs</span> */}
        <span
          onClick={onClick}
          title={onClick ? `View ${scraper.name} tenders` : undefined}
          className="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 cursor-pointer select-none">View</span>
        <span
          onClick={e => { e.stopPropagation(); onSchedule?.(); }}
          className="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 cursor-pointer select-none hover:bg-gray-50"
        >
          Schedule
        </span>
        <span className="text-[11px] px-2 py-1 rounded bg-gray-900 text-white cursor-pointer select-none">
          {scraper.status === 'running' ? 'Pause' : 'Run now'}
        </span>
      </div>
    </div>
  );
}

export default function LeadEngine() {
  const navigate = useNavigate();
  const [scrapers, setScrapers] = useState<ApiScraper[]>([]);
  const [scheduleFor, setScheduleFor] = useState<ApiScraper | null>(null);

  useEffect(() => {
    api.scrapers.list().then(setScrapers).catch(() => { });
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Tender Intelligence - Scraping and AI Screening</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Analyse, approve/reject and push them to the Sales Pipeline once ready.
          </p>
        </div>
        <span className="px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-blue-700 hover:bg-blue-800 cursor-pointer">
          + Add Scraper
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 mb-4">
        {scrapers.map(scraper => (
          <ScraperCard
            key={scraper.scraperId}
            scraper={scraper}
            onClick={() => navigate(`/tender-intel/scraper/${encodeURIComponent(scraper.scraperId)}`)}
            onSchedule={() => setScheduleFor(scraper)}
          />
        ))}
      </div>

      {scheduleFor && <ScheduleDialog scraper={scheduleFor} onClose={() => setScheduleFor(null)} />}

      {/* <TenderTable /> */}
    </div>
  );
}
