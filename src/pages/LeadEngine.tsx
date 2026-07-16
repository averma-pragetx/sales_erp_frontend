import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiScraper } from '../lib/api';
import { api } from '../lib/api';
import TenderTable from '../components/TenderTable';

const SCRAPER_STATUS_STYLES: Record<ApiScraper['status'], { badge: string; bar: string }> = {
  running: { badge: 'bg-green-100 text-green-700', bar: 'bg-gradient-to-r from-green-400 to-green-700 animate-scroll-bar' },
  idle: { badge: 'bg-gray-100 text-gray-500', bar: 'bg-gray-200' },
  error: { badge: 'bg-red-100 text-red-600', bar: 'bg-red-500' },
};

export function ScraperCard({ scraper, onClick }: { scraper: ApiScraper; onClick?: () => void }) {
  const styles = SCRAPER_STATUS_STYLES[scraper.status] ?? SCRAPER_STATUS_STYLES.idle;
  const conv = scraper.leads24h > 0 ? Math.round((scraper.qualified24h / scraper.leads24h) * 100) : 0;
  return (
    <div
      onClick={onClick}
      title={onClick ? `View ${scraper.name} tenders` : undefined}
      className={`relative bg-white rounded-lg border border-gray-200 px-3.5 py-3 overflow-hidden ${onClick ? 'cursor-pointer transition hover:-translate-y-px hover:shadow-md' : ''
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
        <div className="flex-1 px-2 py-1.5 bg-gray-50 rounded">
          <p className="font-mono text-base font-bold text-gray-900 leading-none">{scraper.leads24h}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">leads · 24h</p>
        </div>
        <div className="flex-1 px-2 py-1.5 bg-gray-50 rounded">
          <p className="font-mono text-base font-bold text-gray-900 leading-none">{scraper.qualified24h}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">qualified</p>
        </div>
        <div className="flex-1 px-2 py-1.5 bg-gray-50 rounded">
          <p className="font-mono text-base font-bold text-gray-900 leading-none">{conv}%</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">conv.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <div className="flex-1 h-1 bg-gray-100 rounded-sm overflow-hidden">
          <span className="block h-full bg-blue-600" style={{ width: `${scraper.quotaPct}%` }} />
        </div>
        <span className="font-mono text-[10px] text-gray-500 min-w-8 text-right">{scraper.quotaPct}% quota</span>
      </div>
      <div className="flex gap-1.5 mt-2.5">
        <span className="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 cursor-default select-none">Logs</span>
        <span className="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 cursor-default select-none">Schedule</span>
        <span className="text-[11px] px-2 py-1 rounded bg-gray-900 text-white cursor-default select-none">
          {scraper.status === 'running' ? 'Pause' : 'Run now'}
        </span>
      </div>
    </div>
  );
}

export default function LeadEngine() {
  const navigate = useNavigate();
  const [scrapers, setScrapers] = useState<ApiScraper[]>([]);

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
          />
        ))}
      </div>

      <TenderTable />
    </div>
  );
}
