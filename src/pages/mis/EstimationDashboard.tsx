import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts';
import type { Estimate, EstimateStage } from '../../data/mis/estimationMock';
import {
  ESTIMATES, ACCURACY_RECORDS, ESTIMATE_STAGES, PROJECT_TYPES, ESTIMATORS,
} from '../../data/mis/estimationMock';
import { ALL_CLIENTS } from '../../data/mis/tenderPipelineMock';
import { CAT, STATUS_COLOR, AXIS_TICK, GRID_STROKE, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect, Pill, FilterChips } from '../../components/mis/MisCharts';

interface Filters {
  stage?: EstimateStage;
  projectType?: string;
  client?: string;
  estimator?: string;
}

function matches(e: Estimate, f: Filters, exclude?: keyof Filters): boolean {
  if (f.stage && exclude !== 'stage' && e.stage !== f.stage) return false;
  if (f.projectType && exclude !== 'projectType' && e.projectType !== f.projectType) return false;
  if (f.client && exclude !== 'client' && e.client !== f.client) return false;
  if (f.estimator && exclude !== 'estimator' && e.estimator !== f.estimator) return false;
  return true;
}

const STAGE_LABEL: Record<EstimateStage, string> = { draft: 'Draft', review: 'Review', finalised: 'Finalised' };
const STAGE_COLOR: Record<EstimateStage, string> = { draft: CAT[0], review: CAT[1], finalised: CAT[2] };

function fmtCr(v: number): string {
  return `₹${v.toLocaleString('en-IN')} Cr`;
}

function fmtPct(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function EstimationDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredEstimates = useMemo(() => ESTIMATES.filter(e => matches(e, filters)), [filters]);

  const stageData = useMemo(() => {
    const list = ESTIMATES.filter(e => matches(e, filters, 'stage'));
    const counts = countBy(list, e => e.stage);
    return ESTIMATE_STAGES.map(s => ({
      key: s, name: STAGE_LABEL[s], value: counts.get(s) ?? 0, color: STAGE_COLOR[s],
    }));
  }, [filters]);

  const benchmarkData = useMemo(() => {
    const list = ESTIMATES.filter(e => matches(e, filters, 'projectType'));
    return PROJECT_TYPES.map(pt => {
      const inType = list.filter(e => e.projectType === pt);
      if (inType.length === 0) return { name: pt, estimated: 0, benchmark: 0 };
      return {
        name: pt,
        estimated: Math.round(inType.reduce((s, e) => s + e.estimatedValueCr, 0) / inType.length),
        benchmark: Math.round(inType.reduce((s, e) => s + e.benchmarkValueCr, 0) / inType.length),
      };
    }).filter(d => d.estimated > 0 || d.benchmark > 0);
  }, [filters]);

  const accuracyFiltered = useMemo(
    () => ACCURACY_RECORDS.filter(a => !filters.projectType || a.projectType === filters.projectType),
    [filters.projectType],
  );

  const accuracyTrend = useMemo(() => {
    const months = [...new Set(ACCURACY_RECORDS.map(a => a.month))].sort();
    return months.map(m => {
      const inMonth = accuracyFiltered.filter(a => a.month === m);
      if (inMonth.length === 0) return { month: m.slice(2), accuracy: null };
      const avg = inMonth.reduce((s, a) => s + (100 - Math.abs(a.actualCostCr - a.estimatedValueCr) / a.actualCostCr * 100), 0) / inMonth.length;
      return { month: m.slice(2), accuracy: Math.round(avg * 10) / 10 };
    });
  }, [accuracyFiltered]);

  const avgAccuracy = accuracyFiltered.length
    ? Math.round(
        (accuracyFiltered.reduce((s, a) => s + (100 - Math.abs(a.actualCostCr - a.estimatedValueCr) / a.actualCostCr * 100), 0) / accuracyFiltered.length) * 10,
      ) / 10
    : null;

  const allQuotes = useMemo(() => filteredEstimates.flatMap(e => e.vendorQuotes.map(q => ({ ...q, estimateId: e.id, client: e.client }))), [filteredEstimates]);

  const quoteStatusData = useMemo(() => {
    const counts = countBy(allQuotes, q => q.status);
    return [
      { key: 'requested', name: 'Requested', value: counts.get('requested') ?? 0, color: CAT[0] },
      { key: 'received', name: 'Received', value: counts.get('received') ?? 0, color: STATUS_COLOR.good },
      { key: 'overdue', name: 'Overdue', value: counts.get('overdue') ?? 0, color: STATUS_COLOR.critical },
    ];
  }, [allQuotes]);

  const pendingQuotes = useMemo(
    () => allQuotes.filter(q => q.status !== 'received').sort((a, b) => b.requestedDaysAgo - a.requestedDaysAgo),
    [allQuotes],
  );

  const workloadData = useMemo(() => {
    const list = ESTIMATES.filter(e => matches(e, filters, 'estimator'));
    const counts = countBy(list, e => e.estimator);
    return ESTIMATORS.map(name => ({ name, value: counts.get(name) ?? 0 })).sort((a, b) => b.value - a.value);
  }, [filters]);

  const turnaroundData = useMemo(() => {
    const list = ESTIMATES.filter(e => matches(e, filters, 'estimator') && e.stage === 'finalised');
    return ESTIMATORS.map(name => {
      const inList = list.filter(e => e.estimator === name);
      const avg = inList.length ? Math.round(inList.reduce((s, e) => s + e.turnaroundDays, 0) / inList.length) : 0;
      return { name, value: avg };
    }).sort((a, b) => b.value - a.value);
  }, [filters]);

  const finalisedCount = filteredEstimates.filter(e => e.stage === 'finalised').length;
  const finalisedRate = filteredEstimates.length ? Math.round((finalisedCount / filteredEstimates.length) * 100) : 0;

  const avgVariance = filteredEstimates.length
    ? filteredEstimates.reduce((s, e) => s + (e.estimatedValueCr - e.benchmarkValueCr) / e.benchmarkValueCr * 100, 0) / filteredEstimates.length
    : 0;

  const quotesPending = allQuotes.filter(q => q.status !== 'received').length;
  const quotesOverdue = allQuotes.filter(q => q.status === 'overdue').length;

  const finalisedTurnarounds = filteredEstimates.filter(e => e.stage === 'finalised');
  const avgTurnaround = finalisedTurnarounds.length
    ? Math.round(finalisedTurnarounds.reduce((s, e) => s + e.turnaroundDays, 0) / finalisedTurnarounds.length)
    : null;

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => (key === 'stage' ? STAGE_LABEL[value as EstimateStage] : value);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Estimation Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Estimation pipeline, accuracy trends, and whether bids are priced competitively against cost history.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Stage" value={filters.stage ? STAGE_LABEL[filters.stage] : undefined} options={ESTIMATE_STAGES.map(s => STAGE_LABEL[s])}
            onChange={v => toggle('stage', v ? (ESTIMATE_STAGES.find(s => STAGE_LABEL[s] === v) as EstimateStage) : undefined)} />
          <FilterSelect label="Project Type" value={filters.projectType} options={PROJECT_TYPES} onChange={v => toggle('projectType', v)} />
          <FilterSelect label="Client" value={filters.client} options={ALL_CLIENTS} onChange={v => toggle('client', v)} />
          <FilterSelect label="Estimator" value={filters.estimator} options={ESTIMATORS} onChange={v => toggle('estimator', v)} />
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
        <StatTile label="Estimates Tracked" value={String(filteredEstimates.length)} sub="draft + review + finalised" />
        <StatTile label="Finalised Rate" value={`${finalisedRate}%`} sub={`${finalisedCount} finalised`} />
        <StatTile label="Estimation Accuracy" value={avgAccuracy !== null ? `${avgAccuracy}%` : '—'} sub="vs actual project cost" />
        <StatTile label="Avg. Variance vs Benchmark" value={fmtPct(avgVariance)} sub={avgVariance > 0 ? 'priced above benchmark' : 'priced below benchmark'} />
        <StatTile label="Vendor Quotes Pending" value={String(quotesPending)} sub={`${quotesOverdue} overdue`} />
        <StatTile label="Avg. Turnaround" value={avgTurnaround !== null ? `${avgTurnaround}d` : '—'} sub="finalised estimates" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Estimates by Stage" subtitle="Click a segment to filter">
          <Donut data={stageData} activeKey={filters.stage} valueLabel="Estimates" onSliceClick={k => toggle('stage', k as EstimateStage)} />
        </ChartCard>

        <ChartCard title="Estimated vs Historical Benchmark" subtitle="Average value by project type">
          {benchmarkData.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No estimates match the current filters.</p>
            : (
              <ResponsiveContainer width="100%" height={Math.max(180, benchmarkData.length * 46)}>
                <BarChart data={benchmarkData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={2}>
                  <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={104} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => fmtCr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="estimated" name="Estimated" fill={CAT[0]} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="benchmark" name="Benchmark" fill={CAT[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Estimation Accuracy Trend" subtitle="Last 12 months, avg. estimated vs actual cost">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={accuracyTrend} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [`${v}%`, 'Accuracy']} />
              <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke={CAT[0]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vendor Quotation Status" subtitle="Across filtered estimates">
          <Donut data={quoteStatusData} valueLabel="Quotes" />
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <ChartCard title="Estimation Team Workload" subtitle="Estimates per person · click to filter">
          <HBar data={workloadData} activeName={filters.estimator} onBarClick={name => toggle('estimator', name)} />
        </ChartCard>
        <ChartCard title="Avg. Turnaround by Estimator" subtitle="Finalised estimates only">
          <HBar data={turnaroundData} valueFormatter={v => `${v}d`} />
        </ChartCard>
        <ChartCard title="Vendor Quotes Ageing" subtitle="Pending, oldest first">
          <div className="space-y-1 max-h-[220px] overflow-y-auto">
            {pendingQuotes.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing pending.</p>}
            {pendingQuotes.map((q, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{q.vendor}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{q.estimateId}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${q.status === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
                  {q.requestedDaysAgo}d
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Estimates</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredEstimates.length} of {ESTIMATES.length} tracked estimates</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Estimate</th>
                <th className="text-left font-semibold px-4 py-2.5">Client</th>
                <th className="text-left font-semibold px-4 py-2.5">Project Type</th>
                <th className="text-left font-semibold px-4 py-2.5">Stage</th>
                <th className="text-left font-semibold px-4 py-2.5">Estimated</th>
                <th className="text-left font-semibold px-4 py-2.5">Benchmark</th>
                <th className="text-left font-semibold px-4 py-2.5">Variance</th>
                <th className="text-left font-semibold px-4 py-2.5">Vendor Quotes</th>
                <th className="text-left font-semibold px-4 py-2.5">Estimator</th>
              </tr>
            </thead>
            <tbody>
              {filteredEstimates.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-400 text-sm py-10">No estimates match the current filters.</td></tr>
              )}
              {filteredEstimates.map(e => {
                const variance = (e.estimatedValueCr - e.benchmarkValueCr) / e.benchmarkValueCr * 100;
                const received = e.vendorQuotes.filter(q => q.status === 'received').length;
                return (
                  <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-xs text-gray-500">{e.id}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{e.tenderId}</p>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{e.client}</td>
                    <td className="px-4 py-2.5 text-gray-600">{e.projectType}</td>
                    <td className="px-4 py-2.5"><Pill color={STAGE_COLOR[e.stage]} label={STAGE_LABEL[e.stage]} /></td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{fmtCr(e.estimatedValueCr)}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtCr(e.benchmarkValueCr)}</td>
                    <td className="px-4 py-2.5">
                      <span className={variance > 0 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>{fmtPct(variance)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {e.vendorQuotes.length === 0 ? '—' : `${received}/${e.vendorQuotes.length} received`}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{e.estimator}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
