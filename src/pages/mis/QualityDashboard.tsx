import { useMemo, useState } from 'react';
import type { Ncr, Inspection, NcrStatus, InspectionStatus } from '../../data/mis/qualityMock';
import { NCRS, INSPECTIONS, PROJECT_QUALITY, NCR_STATUSES, INSPECTION_STATUSES, NCR_CATEGORIES } from '../../data/mis/qualityMock';
import { CAT, STATUS_COLOR, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect, Pill, FilterChips, BackLink } from '../../components/mis/MisCharts';

interface Filters {
  projectId?: string;
  category?: string;
  vendor?: string;
  status?: NcrStatus;
  inspStatus?: InspectionStatus;
}

function matchesNcr(n: Ncr, f: Filters, exclude?: string): boolean {
  if (f.projectId && exclude !== 'projectId' && n.projectId !== f.projectId) return false;
  if (f.category && exclude !== 'category' && n.category !== f.category) return false;
  if (f.vendor && exclude !== 'vendor' && n.vendor !== f.vendor) return false;
  if (f.status && exclude !== 'status' && n.status !== f.status) return false;
  return true;
}

function matchesInsp(i: Inspection, f: Filters, exclude?: string): boolean {
  if (f.projectId && exclude !== 'projectId' && i.projectId !== f.projectId) return false;
  if (f.inspStatus && exclude !== 'inspStatus' && i.status !== f.inspStatus) return false;
  return true;
}

const NCR_STATUS_LABEL: Record<NcrStatus, string> = { open: 'Open', under_investigation: 'Under Investigation', closed: 'Closed' };
const NCR_STATUS_COLOR: Record<NcrStatus, string> = { open: STATUS_COLOR.critical, under_investigation: STATUS_COLOR.warning, closed: STATUS_COLOR.good };

const INSP_STATUS_LABEL: Record<InspectionStatus, string> = { scheduled: 'Scheduled', completed: 'Completed', pending: 'Pending', overdue: 'Overdue' };
const INSP_STATUS_COLOR: Record<InspectionStatus, string> = { scheduled: CAT[0], completed: STATUS_COLOR.good, pending: STATUS_COLOR.warning, overdue: STATUS_COLOR.critical };

const VENDOR_OPTIONS = [...new Set(NCRS.map(n => n.vendor))];
const PROJECT_OPTIONS = [...new Map(NCRS.map(n => [n.projectId, `${n.projectId} · ${n.client}`])).entries()];

export default function QualityDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredNcrs = useMemo(() => NCRS.filter(n => matchesNcr(n, filters)), [filters]);
  const filteredInspections = useMemo(() => INSPECTIONS.filter(i => matchesInsp(i, filters)), [filters]);
  const filteredQuality = useMemo(
    () => (filters.projectId ? PROJECT_QUALITY.filter(q => q.projectId === filters.projectId) : PROJECT_QUALITY),
    [filters.projectId],
  );

  const ncrStatusData = useMemo(() => {
    const list = NCRS.filter(n => matchesNcr(n, filters, 'status'));
    const counts = countBy(list, n => n.status);
    return NCR_STATUSES.map(s => ({ key: s, name: NCR_STATUS_LABEL[s], value: counts.get(s) ?? 0, color: NCR_STATUS_COLOR[s] }));
  }, [filters]);

  const inspStatusData = useMemo(() => {
    const list = INSPECTIONS.filter(i => matchesInsp(i, filters, 'inspStatus'));
    const counts = countBy(list, i => i.status);
    return INSPECTION_STATUSES.map(s => ({ key: s, name: INSP_STATUS_LABEL[s], value: counts.get(s) ?? 0, color: INSP_STATUS_COLOR[s] }));
  }, [filters]);

  const categoryData = useMemo(() => {
    const list = NCRS.filter(n => matchesNcr(n, filters, 'category'));
    const counts = countBy(list, n => n.category);
    return NCR_CATEGORIES
      .map(c => ({ name: c, value: counts.get(c) ?? 0 }))
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filters]);

  const overdueInspections = useMemo(
    () => filteredInspections.filter(i => i.status === 'overdue').sort((a, b) => a.dueDaysFromNow - b.dueDaysFromNow),
    [filteredInspections],
  );

  const traceabilityByProject = useMemo(
    () => filteredQuality
      .map(q => ({ name: q.client, value: Math.round((q.materialsTraceable / q.materialsTotal) * 100) }))
      .sort((a, b) => a.value - b.value),
    [filteredQuality],
  );

  const itpByProject = useMemo(
    () => filteredQuality
      .map(q => ({ name: q.client, value: Math.round((q.itpCompleted / q.itpPlanned) * 100) }))
      .sort((a, b) => a.value - b.value),
    [filteredQuality],
  );

  const docsByProject = useMemo(
    () => filteredQuality
      .map(q => ({ name: q.client, value: Math.round((q.finalDocsComplete / q.finalDocsTotal) * 100) }))
      .sort((a, b) => a.value - b.value),
    [filteredQuality],
  );

  const certTotals = filteredQuality.reduce(
    (acc, q) => ({
      verified: acc.verified + q.certsVerified,
      pending: acc.pending + (q.certsReceived - q.certsVerified),
      outstanding: acc.outstanding + q.certsOutstanding,
    }),
    { verified: 0, pending: 0, outstanding: 0 },
  );
  const certData = [
    { key: 'verified', name: 'Verified', value: certTotals.verified, color: STATUS_COLOR.good },
    { key: 'pending', name: 'Received (Pending Verification)', value: certTotals.pending, color: CAT[0] },
    { key: 'outstanding', name: 'Outstanding', value: certTotals.outstanding, color: STATUS_COLOR.critical },
  ];

  const materialsTotal = filteredQuality.reduce((s, q) => s + q.materialsTotal, 0);
  const materialsTraceable = filteredQuality.reduce((s, q) => s + q.materialsTraceable, 0);
  const traceabilityPct = materialsTotal ? Math.round((materialsTraceable / materialsTotal) * 100) : null;

  const itpPlanned = filteredQuality.reduce((s, q) => s + q.itpPlanned, 0);
  const itpCompleted = filteredQuality.reduce((s, q) => s + q.itpCompleted, 0);
  const itpPct = itpPlanned ? Math.round((itpCompleted / itpPlanned) * 100) : null;

  const openNcrs = filteredNcrs.filter(n => n.status !== 'closed').length;
  const closedNcrs = filteredNcrs.filter(n => n.status === 'closed').length;

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => {
    if (key === 'status') return NCR_STATUS_LABEL[value as NcrStatus];
    if (key === 'inspStatus') return INSP_STATUS_LABEL[value as InspectionStatus];
    if (key === 'projectId') return PROJECT_OPTIONS.find(([id]) => id === value)?.[1] ?? value;
    return value;
  };

  return (
    <div className="p-6 space-y-4">
      <BackLink />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Quality Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            NCR trends across the portfolio, and whether documentation is on track for handover.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Project" value={filters.projectId} options={PROJECT_OPTIONS.map(([id]) => id)} onChange={v => toggle('projectId', v)} />
          <FilterSelect label="Category" value={filters.category} options={NCR_CATEGORIES} onChange={v => toggle('category', v)} />
          <FilterSelect label="Vendor" value={filters.vendor} options={VENDOR_OPTIONS} onChange={v => toggle('vendor', v)} />
        </div>
        <FilterChips
          entries={activeFilterEntries}
          labelFor={filterLabel}
          onRemove={key => setFilters(prev => ({ ...prev, [key]: undefined }))}
          onClear={() => setFilters({})}
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <StatTile label="NCRs Tracked" value={String(filteredNcrs.length)} sub={`${closedNcrs} closed`} />
        <StatTile label="Open / Under Investigation" value={String(openNcrs)} sub="need resolution" />
        <StatTile label="Inspections Overdue" value={String(overdueInspections.length)} sub={`of ${filteredInspections.length} tracked`} />
        <StatTile label="Material Traceability" value={traceabilityPct !== null ? `${traceabilityPct}%` : '—'} sub="fully traceable" />
        <StatTile label="ITP Compliance" value={itpPct !== null ? `${itpPct}%` : '—'} sub="completed vs planned" />
        <StatTile label="Test Certs Outstanding" value={String(certTotals.outstanding)} sub={`${certTotals.pending} pending verification`} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="NCR Status" subtitle="Click a segment to filter">
          <Donut data={ncrStatusData} activeKey={filters.status} valueLabel="NCRs" onSliceClick={k => toggle('status', k as NcrStatus)} />
        </ChartCard>
        <ChartCard title="Inspection Status" subtitle="Click a segment to filter">
          <Donut data={inspStatusData} activeKey={filters.inspStatus} valueLabel="Inspections" onSliceClick={k => toggle('inspStatus', k as InspectionStatus)} />
        </ChartCard>
      </div>

      {/* Recurring types + overdue inspections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Recurring NCR Types" subtitle="By category · click a bar to filter">
          {categoryData.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No NCRs match the current filters.</p>
            : <HBar data={categoryData} activeName={filters.category} onBarClick={name => toggle('category', name)} height={Math.max(150, categoryData.length * 34)} />}
        </ChartCard>
        <ChartCard title="Overdue Inspections" subtitle="Most overdue first">
          <div className="space-y-1 max-h-[220px] overflow-y-auto">
            {overdueInspections.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing overdue.</p>}
            {overdueInspections.map(i => (
              <div key={i.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{i.discipline} inspection</p>
                  <p className="text-[11px] text-gray-400 font-mono">{i.id} · {i.projectId}</p>
                </div>
                <span className="text-sm font-bold shrink-0 text-red-600">{Math.abs(i.dueDaysFromNow)}d overdue</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Traceability + ITP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Material Traceability by Project" subtitle="% of materials fully traceable">
          {traceabilityByProject.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
            : <HBar data={traceabilityByProject} valueFormatter={v => `${v}%`} height={Math.max(150, traceabilityByProject.length * 34)} />}
        </ChartCard>
        <ChartCard title="ITP Compliance by Project" subtitle="Inspections completed vs planned">
          {itpByProject.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
            : <HBar data={itpByProject} valueFormatter={v => `${v}%`} height={Math.max(150, itpByProject.length * 34)} />}
        </ChartCard>
      </div>

      {/* Test certs + final docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Test Certificate Status" subtitle="Across filtered projects">
          <Donut data={certData} valueLabel="Certificates" />
        </ChartCard>
        <ChartCard title="Final Documentation Completeness" subtitle="By project">
          {docsByProject.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
            : <HBar data={docsByProject} valueFormatter={v => `${v}%`} height={Math.max(150, docsByProject.length * 34)} />}
        </ChartCard>
      </div>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Non-Conformance Reports</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredNcrs.length} of {NCRS.length} tracked NCRs</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">NCR</th>
                <th className="text-left font-semibold px-4 py-2.5">Project</th>
                <th className="text-left font-semibold px-4 py-2.5">Vendor</th>
                <th className="text-left font-semibold px-4 py-2.5">Category</th>
                <th className="text-left font-semibold px-4 py-2.5">Root Cause</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                <th className="text-left font-semibold px-4 py-2.5">Age</th>
              </tr>
            </thead>
            <tbody>
              {filteredNcrs.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 text-sm py-10">No NCRs match the current filters.</td></tr>
              )}
              {filteredNcrs.map(n => (
                <tr key={n.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{n.id}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-500">{n.projectId}</p>
                    <p className="text-gray-600">{n.client}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{n.vendor}</td>
                  <td className="px-4 py-2.5 text-gray-600">{n.category}</td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-sm">{n.rootCause}</td>
                  <td className="px-4 py-2.5"><Pill color={NCR_STATUS_COLOR[n.status]} label={NCR_STATUS_LABEL[n.status]} /></td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {n.status === 'closed' && n.closedDaysAgo != null ? `closed ${n.closedDaysAgo}d ago` : `${n.raisedDaysAgo}d open`}
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
