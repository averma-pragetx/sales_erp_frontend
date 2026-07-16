import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ApiScraper } from '../lib/api';
import { api } from '../lib/api';
import TenderTable from '../components/TenderTable';

export default function ScraperTenders() {
  const navigate = useNavigate();
  const { scraperId = '' } = useParams();
  const [scraper, setScraper] = useState<ApiScraper | null>(null);

  useEffect(() => {
    api.scrapers.list()
      .then(list => setScraper(list.find(s => s.scraperId === scraperId) ?? null))
      .catch(() => {});
  }, [scraperId]);

  return (
    <div className="p-6">
      <div className="mb-4">
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

      <TenderTable scraperId={scraperId} />
    </div>
  );
}
