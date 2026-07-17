import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ApiScraper, ApiScrapedTender } from '../lib/api';
import { api } from '../lib/api';
import TenderTable from '../components/TenderTable';

// ponytail: scripted demo sequence — each sync click reveals the next count, clamps at last
const SYNC_STEPS = [3, 5, 9, 14, 16, 19];

export default function ScraperTenders() {
  const navigate = useNavigate();
  const { scraperId = '' } = useParams();
  const [scraper, setScraper] = useState<ApiScraper | null>(null);
  const [tenders, setTenders] = useState<ApiScrapedTender[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(true);
  const [syncKey, setSyncKey] = useState(0);
  const [step, setStep] = useState(0);
  const limit = SYNC_STEPS[Math.min(step, SYNC_STEPS.length - 1)];

  useEffect(() => {
    api.scrapers.list()
      .then(list => setScraper(list.find(s => s.scraperId === scraperId) ?? null))
      .catch(() => {});
  }, [scraperId]);

  useEffect(() => {
    setLoadingTenders(true);
    api.scrapedTenders.list(1, limit, scraperId)
      .then(({ items }) => setTenders(items))
      .catch(() => {})
      .finally(() => setLoadingTenders(false));
  }, [scraperId, limit, syncKey]);

  // const totalTenders = tenders.length;

  // const scoredTenders = tenders.filter(t => t.score !== null);
  // const avgScore = scoredTenders.length
  //   ? Math.round(scoredTenders.reduce((acc, t) => acc + (t.score || 0), 0) / scoredTenders.length)
  //   : 0;

  // const pendingReview = tenders.filter(t => t.status === 'new').length;
  // const approvedOrPushed = tenders.filter(t => t.status === 'approved' || t.status === 'pushed').length;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/tender-intel')}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Tender Intelligence
          </button>
          <h1 className="text-lg font-semibold text-gray-900 mt-1">
            {scraper ? scraper.name : scraperId} <span className="font-mono text-sm text-gray-400">{scraperId}</span>
          </h1>
          {scraper && <p className="text-sm text-gray-500 mt-0.5">{scraper.target}</p>}
        </div>
        <button
          onClick={() => {
            setStep(s => s + 1);
            setSyncKey(k => k + 1);
          }}
          className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Sync
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
        {/* Card 1: Total Tenders */}
        <div className="relative bg-white rounded-xl border border-gray-200 p-3 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Active Scraper</p>
              <h3 className="text-base font-extrabold text-gray-900 mt-2 font-mono">
                {loadingTenders ? '...' : scraper?.scraperId}
              </h3>
            </div>
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">Scraped from {scraper?.name || 'source'}</p>
        </div>

        {/* Card 2: Status */}
        <div className="relative bg-white rounded-xl border border-gray-200 p-3 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status</p>
              <h3 className="text-base font-extrabold text-gray-900 mt-2 font-mono tracking-wider uppercase">
                {scraper?.status}
              </h3>
            </div>
            <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            {scraper?.status === 'running' ? 'Live' : 'Stopped'}
          </p>
        </div>

        {/* Card 3: Pending Review */}
        <div className="relative bg-white rounded-xl border border-gray-200 p-3 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Last Run</p>
              <h3 className="text-base font-extrabold text-gray-900 mt-2 font-mono tracking-wider uppercase">
                {scraper?.lastRun}
              </h3>
            </div>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            Runtime: {scraper?.runtime}
          </p>
        </div>

        {/* Card 4: Approved / Pushed */}
        <div className="relative bg-white rounded-xl border border-gray-200 p-3 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tenders Scraped · 24h</p>
              <h3 className="text-base font-extrabold text-gray-900 mt-2 font-mono tracking-wider uppercase">
                {scraper?.leads24h}
              </h3>
            </div>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">Ready for estimation</p>
        </div>
      </div>

      {/* ponytail: key remount = refetch; GET list endpoint does the actual sync server-side */}
      <TenderTable key={syncKey} scraperId={scraperId} limit={limit} />
    </div>
  );
}
