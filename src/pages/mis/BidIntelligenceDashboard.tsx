import { useMemo, useState } from 'react';
import type { RiskSeverity, ItemStatus } from '../../data/mis/bidIntelligenceMock';
import { BID_INTEL_TENDERS, RISK_SEVERITIES, ANALYSTS } from '../../data/mis/bidIntelligenceMock';
import { ALL_SECTORS, ALL_CLIENTS } from '../../data/mis/tenderPipelineMock';
import { CAT, STATUS_COLOR, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect, Pill, FilterChips, BackLink } from '../../components/mis/MisCharts';

interface Filters {
  sector?: string;
  client?: string;
  analyst?: string;
}

function matchesTender(t: typeof BID_INTEL_TENDERS[number], f: Filters): boolean {
  if (f.sector && t.sector !== f.sector) return false;
  if (f.client && t.client !== f.client) return false;
  if (f.analyst && t.analyst !== f.analyst) return false;
  return true;
}

const SEVERITY_COLOR: Record<RiskSeverity, string> = {
  critical: STATUS_COLOR.critical, high: STATUS_COLOR.serious, medium: STATUS_COLOR.warning, low: STATUS_COLOR.good,
};
const SEVERITY_LABEL: Record<RiskSeverity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

const RISK_STATUS_STYLE: Record<ItemStatus, string> = {
  open: 'bg-red-100 text-red-700', mitigated: 'bg-green-100 text-green-700', accepted: 'bg-gray-100 text-gray-500',
};
const RISK_STATUS_LABEL: Record<ItemStatus, string> = { open: 'Open', mitigated: 'Mitigated', accepted: 'Accepted' };

const OVERDUE_THRESHOLD_DAYS = 10;

export default function BidIntelligenceDashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const [severityFocus, setSeverityFocus] = useState<RiskSeverity | undefined>();

  const filteredTenders = useMemo(() => BID_INTEL_TENDERS.filter(t => matchesTender(t, filters)), [filters]);

  const docTotals = useMemo(() => {
    return filteredTenders.reduce(
      (acc, t) => ({
        total: acc.total + t.documentsTotal,
        processed: acc.processed + t.docStatus.processed,
        processing: acc.processing + t.docStatus.processing,
        pending: acc.pending + t.docStatus.pending,
        failed: acc.failed + t.docStatus.failed,
      }),
      { total: 0, processed: 0, processing: 0, pending: 0, failed: 0 },
    );
  }, [filteredTenders]);

  const docStatusData = [
    { key: 'processed', name: 'Processed', value: docTotals.processed, color: STATUS_COLOR.good },
    { key: 'processing', name: 'Processing', value: docTotals.processing, color: CAT[0] },
    { key: 'pending', name: 'Pending', value: docTotals.pending, color: '#898781' },
    { key: 'failed', name: 'Failed', value: docTotals.failed, color: STATUS_COLOR.critical },
  ];

  const allRisks = useMemo(
    () => filteredTenders.flatMap(t => t.risks.map(r => ({ ...r, tenderId: t.id, client: t.client }))),
    [filteredTenders],
  );

  const severityData = useMemo(() => {
    const counts = countBy(allRisks, r => r.severity);
    return RISK_SEVERITIES.map(s => ({
      key: s, name: SEVERITY_LABEL[s], value: counts.get(s) ?? 0, color: SEVERITY_COLOR[s],
    }));
  }, [allRisks]);

  const openRisks = allRisks.filter(r => r.status === 'open');
  const criticalOpenRisks = openRisks.filter(r => r.severity === 'critical').length;

  const topRiskTenders = useMemo(() => {
    const counts = countBy(openRisks, r => `${r.tenderId} · ${r.client}`);
    return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [openRisks]);

  const effortData = useMemo(
    () => filteredTenders
      .map(t => ({ name: `${t.id} · ${t.client}`, value: t.effortHours }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    [filteredTenders],
  );

  const allContradictions = useMemo(() => filteredTenders.flatMap(t => t.contradictions), [filteredTenders]);
  const contradictionData = useMemo(() => {
    const counts = countBy(allContradictions, c => c.status);
    return [
      { key: 'open', name: 'Open', value: counts.get('open') ?? 0, color: STATUS_COLOR.critical },
      { key: 'resolved', name: 'Resolved', value: counts.get('resolved') ?? 0, color: STATUS_COLOR.good },
    ];
  }, [allContradictions]);

  const allClarifications = useMemo(
    () => filteredTenders.flatMap(t => t.clarifications.map(c => ({ ...c, tenderId: t.id, client: t.client }))),
    [filteredTenders],
  );
  const clarificationData = useMemo(() => {
    const counts = countBy(allClarifications, c => c.status);
    return [
      { key: 'pending', name: 'Pending', value: counts.get('pending') ?? 0, color: STATUS_COLOR.warning },
      { key: 'responded', name: 'Responded', value: counts.get('responded') ?? 0, color: STATUS_COLOR.good },
    ];
  }, [allClarifications]);

  const pendingClarifications = useMemo(
    () => allClarifications.filter(c => c.status === 'pending').sort((a, b) => b.raisedDaysAgo - a.raisedDaysAgo),
    [allClarifications],
  );
  const overdueClarifications = pendingClarifications.filter(c => c.raisedDaysAgo > OVERDUE_THRESHOLD_DAYS).length;

  const avgEffortHours = filteredTenders.length
    ? Math.round(filteredTenders.reduce((s, t) => s + t.effortHours, 0) / filteredTenders.length)
    : 0;

  const riskRegister = useMemo(
    () => (severityFocus ? allRisks.filter(r => r.severity === severityFocus) : allRisks),
    [allRisks, severityFocus],
  );

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [string, string][];

  return (
    <div className="p-6 space-y-4">
      <BackLink />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Bid Intelligence Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            How thoroughly each tender is being analysed by the AI platform, and whether critical risks are surfacing before submission.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Sector" value={filters.sector} options={ALL_SECTORS}
            onChange={v => setFilters(prev => ({ ...prev, sector: v }))} />
          <FilterSelect label="Client" value={filters.client} options={ALL_CLIENTS}
            onChange={v => setFilters(prev => ({ ...prev, client: v }))} />
          <FilterSelect label="Analyst" value={filters.analyst} options={ANALYSTS}
            onChange={v => setFilters(prev => ({ ...prev, analyst: v }))} />
        </div>
        <FilterChips
          entries={activeFilterEntries}
          labelFor={(_, v) => v}
          onRemove={key => setFilters(prev => ({ ...prev, [key]: undefined }))}
          onClear={() => setFilters({})}
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <StatTile label="Tenders Under Review" value={String(filteredTenders.length)} sub="AI document intelligence" />
        <StatTile label="Documents Processed" value={`${docTotals.processed}/${docTotals.total}`}
          sub={docTotals.total ? `${Math.round((docTotals.processed / docTotals.total) * 100)}% processed` : '—'} />
        <StatTile label="Open Risks" value={String(openRisks.length)} sub={`${criticalOpenRisks} critical`} />
        <StatTile label="Contradictions Open" value={String(contradictionData[0].value)} sub={`${contradictionData[1].value} resolved`} />
        <StatTile label="Clarifications Pending" value={String(pendingClarifications.length)} sub={`${overdueClarifications} overdue (>${OVERDUE_THRESHOLD_DAYS}d)`} />
        <StatTile label="Avg. Doc-Study Effort" value={`${avgEffortHours}h`} sub="per tender" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Document Processing Status" subtitle={`${docTotals.total} documents across filtered tenders`}>
          <Donut data={docStatusData} valueLabel="Documents" />
        </ChartCard>
        <ChartCard title="Risks by Severity" subtitle="Click a segment to focus the risk register below">
          <Donut data={severityData} activeKey={severityFocus} valueLabel="Risks"
            onSliceClick={k => setSeverityFocus(prev => (prev === k ? undefined : k as RiskSeverity))} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Top Tenders by Open Risk" subtitle="Open risk count per tender">
          {topRiskTenders.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No open risks in this view.</p>
            : <HBar data={topRiskTenders} height={Math.max(150, topRiskTenders.length * 34)} />}
        </ChartCard>
        <ChartCard title="Bid Team Effort" subtitle="Hours spent on document study, per tender">
          <HBar data={effortData} valueFormatter={v => `${v}h`} height={Math.max(150, effortData.length * 34)} />
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <ChartCard title="Contradiction Resolution" subtitle="Across filtered tenders">
          <Donut data={contradictionData} valueLabel="Contradictions" />
        </ChartCard>
        <ChartCard title="Pre-Bid Clarifications" subtitle="Raised vs responded">
          <Donut data={clarificationData} valueLabel="Clarifications" />
        </ChartCard>
        <ChartCard title="Clarification Ageing" subtitle={`Pending, oldest first · red if over ${OVERDUE_THRESHOLD_DAYS}d`}>
          <div className="space-y-1 max-h-[220px] overflow-y-auto">
            {pendingClarifications.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing pending.</p>}
            {pendingClarifications.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{c.question}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{c.tenderId}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${c.raisedDaysAgo > OVERDUE_THRESHOLD_DAYS ? 'text-red-600' : 'text-amber-600'}`}>
                  {c.raisedDaysAgo}d
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Tender summary table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Tender AI Review Summary</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredTenders.length} of {BID_INTEL_TENDERS.length} tenders under review</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Tender</th>
                <th className="text-left font-semibold px-4 py-2.5">Client</th>
                <th className="text-left font-semibold px-4 py-2.5">Sector</th>
                <th className="text-left font-semibold px-4 py-2.5">Docs Processed</th>
                <th className="text-left font-semibold px-4 py-2.5">Open Risks</th>
                <th className="text-left font-semibold px-4 py-2.5">Contradictions Open</th>
                <th className="text-left font-semibold px-4 py-2.5">Clarifications Pending</th>
                <th className="text-left font-semibold px-4 py-2.5">Effort</th>
                <th className="text-left font-semibold px-4 py-2.5">Analyst</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenders.map(t => {
                const openR = t.risks.filter(r => r.status === 'open').length;
                const openC = t.contradictions.filter(c => c.status === 'open').length;
                const pendingClar = t.clarifications.filter(c => c.status === 'pending').length;
                return (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{t.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{t.client}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.sector}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.docStatus.processed}/{t.documentsTotal}</td>
                    <td className="px-4 py-2.5">
                      <span className={openR > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>{openR}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={openC > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>{openC}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={pendingClar > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>{pendingClar}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{t.effortHours}h</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.analyst}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk register drill-down */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Risk Register</p>
            <p className="text-[11.5px] text-gray-400 mt-0.5">{riskRegister.length} risk items{severityFocus ? ` · ${SEVERITY_LABEL[severityFocus]} only` : ''}</p>
          </div>
          {severityFocus && (
            <button onClick={() => setSeverityFocus(undefined)} className="text-xs font-semibold text-blue-600 hover:underline">
              Clear severity filter
            </button>
          )}
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Tender</th>
                <th className="text-left font-semibold px-4 py-2.5">Category</th>
                <th className="text-left font-semibold px-4 py-2.5">Description</th>
                <th className="text-left font-semibold px-4 py-2.5">Severity</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {riskRegister.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 text-sm py-10">No risks match the current filters.</td></tr>
              )}
              {riskRegister.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-500">{r.tenderId}</p>
                    <p className="text-gray-800">{r.client}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{r.category}</td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-md">{r.description}</td>
                  <td className="px-4 py-2.5"><Pill color={SEVERITY_COLOR[r.severity]} label={SEVERITY_LABEL[r.severity]} /></td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${RISK_STATUS_STYLE[r.status]}`}>
                      {RISK_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
