import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ApiInquiry, ApiDocument } from '../lib/api';
import { api } from '../lib/api';
import type { Inquiry } from '../types';
import { STAGES } from '../data/stages';
import StagesSidebar from '../components/StagesSidebar';
import StageContent from '../components/StageContent';

function mapApiToInquiry(a: ApiInquiry): Inquiry {
  return {
    id: a.inquiryId,
    client: a.client,
    project: a.project,
    scope: a.scope,
    value: a.value,
    currency: a.currency,
    valueUnit: a.valueUnit,
    daysToBid: a.daysToBid,
    currentStage: a.currentStage,
    currentStageName: a.currentStageName,
    priority: a.priority,
    cluster: a.cluster as Inquiry['cluster'],
  };
}

export default function InquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const inquiryId = decodeURIComponent(id ?? '');

  const [apiData, setApiData] = useState<ApiInquiry | null>(null);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageNum, setSelectedStageNum] = useState(1);
  const [autoSelected, setAutoSelected] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [inq, docs] = await Promise.all([
        api.inquiries.get(inquiryId),
        api.documents.list(inquiryId),
      ]);
      setApiData(inq);
      setDocuments(docs);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-select the active stage on first load
  useEffect(() => {
    if (apiData && !autoSelected) {
      const activeStage = Math.max(1, Math.min(apiData.completedUpTo + 1, 14));
      setSelectedStageNum(activeStage);
      setAutoSelected(true);
    }
  }, [apiData, autoSelected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  if (error || !apiData) {
    return (
      <div className="p-8 text-gray-500">
        {error ?? 'Inquiry not found.'}{' '}
        <Link to="/" className="text-blue-600 underline">Back to pipeline</Link>
      </div>
    );
  }

  const inquiry = mapApiToInquiry(apiData);
  const selectedStage = STAGES.find(s => s.num === selectedStageNum)!;
  const valueStr = `${inquiry.currency === 'USD' ? '$ ' : '₹'}${inquiry.value.toFixed(2)} ${inquiry.valueUnit}`;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Top header */}
      <header className="border-b border-gray-200 px-6 pt-3 pb-4 shrink-0">
        <Link
          to="/sales-pipeline"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Inquiries
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-2xl font-bold text-gray-900 leading-none">
                {inquiry.client} · {inquiry.project}
              </h1>
              <span className="text-xs font-mono px-2 py-1 rounded border border-blue-300 text-blue-700 bg-blue-50">
                {inquiry.id}
              </span>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                inquiry.priority === 'P1' ? 'bg-orange-500 text-white' :
                inquiry.priority === 'P2' ? 'bg-amber-400 text-white' :
                'bg-yellow-200 text-yellow-800'
              }`}>
                {inquiry.priority}
              </span>
            </div>
            <p className="text-sm text-gray-500">{inquiry.scope}</p>
          </div>

          <div className="flex items-start gap-8 text-right shrink-0 ml-8">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Stage</p>
              <p className="text-sm font-medium text-gray-900">
                {inquiry.currentStage}/14 · {inquiry.currentStageName}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Value</p>
              <p className="text-sm font-medium text-gray-900">{valueStr}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Bid Due</p>
              <p className="text-sm font-medium text-gray-900">{apiData.bidDue}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Estimator</p>
              <p className="text-sm font-medium text-gray-900">{apiData.estimator}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <StagesSidebar
          completedUpTo={apiData.completedUpTo}
          selectedStage={selectedStageNum}
          onSelectStage={setSelectedStageNum}
        />
        <StageContent
          stage={selectedStage}
          inquiry={inquiry}
          apiData={apiData}
          documents={documents}
          onDocumentsChange={setDocuments}
          onRefresh={fetchData}
        />
      </div>
    </div>
  );
}
