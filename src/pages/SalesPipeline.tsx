import { useEffect, useState } from 'react';
import { CLUSTERS } from '../data';
import type { Inquiry, ClusterKey } from '../types';
import type { ApiInquiry } from '../lib/api';
import { api } from '../lib/api';
import PipelineColumn from '../components/PipelineColumn';
import AddInquiryModal from '../components/AddInquiryModal';

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
    cluster: a.cluster as ClusterKey,
  };
}

export default function SalesPipeline() {
  const [apiInquiries, setApiInquiries] = useState<ApiInquiry[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state: null = closed, ClusterKey = open for that cluster
  const [addingTo, setAddingTo] = useState<ClusterKey | null>(null);

  useEffect(() => {
    api.inquiries.list()
      .then(data => {
        setApiInquiries(data);
        setInquiries(data.map(mapApiToInquiry));
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(saved: ApiInquiry) {
    setApiInquiries(prev => [saved, ...prev]);
    setInquiries(prev => [mapApiToInquiry(saved), ...prev]);
    setAddingTo(null);
  }

  async function handleDelete(id: string) {
    // Optimistic removal
    setApiInquiries(prev => prev.filter(i => i.inquiryId !== id));
    setInquiries(prev => prev.filter(i => i.id !== id));
    try {
      await api.inquiries.delete(id);
    } catch (e) {
      // Re-fetch to restore state if delete failed
      const data = await api.inquiries.list().catch(() => null);
      if (data) {
        setApiInquiries(data);
        setInquiries(data.map(mapApiToInquiry));
      }
      console.error('Delete failed:', e);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-gray-900">Sales Pipeline</h1>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
            SALES · 01
          </span>
        </div>
        <p className="text-sm text-gray-500 max-w-2xl">
          Active inquiries grouped by stage cluster. Stage progression happens inside each inquiry's journey — no drag here, ensures correct sequencing.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading inquiries…</p>}
      {error && <p className="text-sm text-red-500">Failed to load: {error}</p>}

      {!loading && !error && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {CLUSTERS.map(cluster => (
            <PipelineColumn
              key={cluster.key}
              cluster={cluster}
              inquiries={inquiries.filter(i => i.cluster === cluster.key)}
              onAdd={() => setAddingTo(cluster.key)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {addingTo && (
        <AddInquiryModal
          clusterKey={addingTo}
          existingInquiries={apiInquiries}
          onSaved={handleSaved}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  );
}
