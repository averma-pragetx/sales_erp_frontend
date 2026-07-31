import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
} from 'recharts';
import type { ResultRecord, ResultOutcome, LoiStatus } from '../../data/mis/tenderResultsMock';
import { RESULTS, VALUE_RANGES, valueRangeOf } from '../../data/mis/tenderResultsMock';
import { ALL_CLIENTS, ALL_SECTORS } from '../../data/mis/tenderPipelineMock';
import { PROJECT_TYPES } from '../../data/mis/estimationMock';
import { CAT, STATUS_COLOR, AXIS_TICK, GRID_STROKE, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, FilterSelect, Pill, FilterChips } from '../../components/mis/MisCharts';

type GroupDim = 'client' | 'sector' | 'projectType' | 'valueRange';

interface Filters {
  client?: string;
  sector?: string;
  projectType?: string;
  outcome?: ResultOutcome;
}

function matches(r: ResultRecord, f: Filters, exclude?: string): boolean {
  if (f.client && exclude !== 'client' && r.client !== f.client) return false;
  if (f.sector && exclude !== 'sector' && r.sector !== f.sector) return false;
  if (f.projectType && exclude !== 'projectType' && r.projectType !== f.projectType) return false;
  if (f.outcome && exclude !== 'outcome' && r.outcome !== f.outcome) return false;
  return true;
}

const OUTCOME_LABEL: Record<ResultOutcome, string> = { won: 'Won', lost: 'Lost' };
const LOI_LABEL: Record<LoiStatus, string> = { received: 'Received', pending: 'Pending', not_required: 'Not Required' };
const LOI_COLOR: Record<LoiStatus, string> = { received: STATUS_COLOR.good, pending: STATUS_COLOR.warning, not_required: '#898781' };

function fmtCr(v: number): string {
  return `₹${v} Cr`;
}

export default function TenderResultsDashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const [groupBy, setGroupBy] = useState<GroupDim>('client');

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredResults = useMemo(() => RESULTS.filter(r => matches(r, filters)), [filters]);
  const wonAll = useMemo(() => filteredResults.filter(r => r.outcome === 'won'), [filteredResults]);
  const lostAll = useMemo(() => filteredResults.filter(r => r.outcome === 'lost'), [filteredResults]);

  const winRatePct = (wonAll.length + lostAll.length) ? Math.round((wonAll.length / (wonAll.length + lostAll.length)) * 100) : null;

  const stackedData = useMemo(() => {
    const list = RESULTS.filter(r => matches(r, filters, groupBy));
    if (groupBy === 'valueRange') {
      return VALUE_RANGES.map(name => {
        const inCat = list.filter(r => valueRangeOf(r.bidValueCr) === name);
        return { name, won: inCat.filter(r => r.outcome === 'won').length, lost: inCat.filter(r => r.outcome === 'lost').length };
      });
    }
    const categories = groupBy === 'client' ? ALL_CLIENTS : groupBy === 'sector' ? ALL_SECTORS : PROJECT_TYPES;
    const keyFn = (r: ResultRecord) => (groupBy === 'client' ? r.client : groupBy === 'sector' ? r.sector : r.projectType);
    const rows = categories
      .map(name => {
        const inCat = list.filter(r => keyFn(r) === name);
        return { name, won: inCat.filter(r => r.outcome === 'won').length, lost: inCat.filter(r => r.outcome === 'lost').length };
      })
      .filter(r => r.won + r.lost > 0)
      .sort((a, b) => (b.won + b.lost) - (a.won + a.lost));
    return groupBy === 'client' ? rows.slice(0, 8) : rows;
  }, [filters, groupBy]);

  const cycleTrend = useMemo(() => {
    const months = [...new Set(RESULTS.map(r => r.month))].sort();
    return months.map(m => {
      const inMonth = wonAll.filter(r => r.month === m && r.bidToAwardDays != null);
      if (!inMonth.length) return { month: m.slice(2), days: null };
      return { month: m.slice(2), days: Math.round(inMonth.reduce((s, r) => s + (r.bidToAwardDays ?? 0), 0) / inMonth.length) };
    });
  }, [wonAll]);

  const marginTrend = useMemo(() => {
    const months = [...new Set(RESULTS.map(r => r.month))].sort();
    return months.map(m => {
      const inMonth = wonAll.filter(r => r.month === m && r.contractValueCr != null && r.estimatedValueCr != null);
      if (!inMonth.length) return { month: m.slice(2), margin: null };
      const avg = inMonth.reduce((s, r) => s + ((r.contractValueCr! - r.estimatedValueCr!) / r.estimatedValueCr! * 100), 0) / inMonth.length;
      return { month: m.slice(2), margin: Math.round(avg * 10) / 10 };
    });
  }, [wonAll]);

  const avgCycleDays = wonAll.filter(r => r.bidToAwardDays != null).length
    ? Math.round(wonAll.reduce((s, r) => s + (r.bidToAwardDays ?? 0), 0) / wonAll.filter(r => r.bidToAwardDays != null).length)
    : null;

  const withMargin = wonAll.filter(r => r.contractValueCr != null && r.estimatedValueCr != null);
  const avgMarginPct = withMargin.length
    ? withMargin.reduce((s, r) => s + ((r.contractValueCr! - r.estimatedValueCr!) / r.estimatedValueCr! * 100), 0) / withMargin.length
    : null;

  const pendingSignatures = wonAll.filter(r => r.contractSigned === false).length;
  const loiPending = wonAll.filter(r => r.loiStatus === 'pending').length;

  const loiData = useMemo(() => {
    const counts = countBy(wonAll.filter(r => r.loiStatus), r => r.loiStatus!);
    return (['received', 'pending', 'not_required'] as LoiStatus[]).map(s => ({
      key: s, name: LOI_LABEL[s], value: counts.get(s) ?? 0, color: LOI_COLOR[s],
    }));
  }, [wonAll]);

  const signatureData = useMemo(() => {
    const signed = wonAll.filter(r => r.contractSigned === true).length;
    const pending = wonAll.filter(r => r.contractSigned === false).length;
    return [
      { key: 'signed', name: 'Signed', value: signed, color: STATUS_COLOR.good },
      { key: 'pending', name: 'Pending', value: pending, color: STATUS_COLOR.warning },
    ];
  }, [wonAll]);

  const handoffTotals = wonAll.reduce(
    (acc, r) => ({ total: acc.total + (r.handoffItemsTotal ?? 0), done: acc.done + (r.handoffItemsDone ?? 0) }),
    { total: 0, done: 0 },
  );
  const handoffData = [
    { key: 'done', name: 'Transferred to BC', value: handoffTotals.done, color: STATUS_COLOR.good },
    { key: 'pending', name: 'Pending', value: handoffTotals.total - handoffTotals.done, color: STATUS_COLOR.warning },
  ];

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => (key === 'outcome' ? OUTCOME_LABEL[value as ResultOutcome] : value);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Tender Results Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Bidding effectiveness and how smoothly the post-award handoff to project execution is happening.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Client" value={filters.client} options={ALL_CLIENTS} onChange={v => toggle('client', v)} />
          <FilterSelect label="Sector" value={filters.sector} options={ALL_SECTORS} onChange={v => toggle('sector', v)} />
          <FilterSelect label="Project Type" value={filters.projectType} options={PROJECT_TYPES} onChange={v => toggle('projectType', v)} />
          <FilterSelect label="Outcome" value={filters.outcome ? OUTCOME_LABEL[filters.outcome] : undefined} options={['Won', 'Lost']}
            onChange={v => toggle('outcome', v ? (v.toLowerCase() as ResultOutcome) : undefined)} />
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
        <StatTile label="Win : Loss" value={`${wonAll.length} : ${lostAll.length}`} sub={winRatePct !== null ? `${winRatePct}% win rate` : '—'} />
        <StatTile label="Avg. Bid-to-Award" value={avgCycleDays !== null ? `${avgCycleDays}d` : '—'} sub="cycle time" />
        <StatTile label="Margin vs Estimate" value={avgMarginPct !== null ? `${avgMarginPct > 0 ? '+' : ''}${avgMarginPct.toFixed(1)}%` : '—'}
          sub={avgMarginPct !== null && avgMarginPct < 0 ? 'eroded at award' : 'premium at award'} />
        <StatTile label="Pending Signatures" value={String(pendingSignatures)} sub={`of ${wonAll.length} won`} />
        <StatTile label="LOI Pending" value={String(loiPending)} sub="awaiting letter of intent" />
        <StatTile label="Handoff Complete" value={handoffTotals.total ? `${Math.round((handoffTotals.done / handoffTotals.total) * 100)}%` : '—'}
          sub={`${handoffTotals.done}/${handoffTotals.total} items to BC`} />
      </div>

      {/* Win/Loss breakdown */}
      <ChartCard
        title="Win / Loss Ratio"
        subtitle={`By ${groupBy === 'projectType' ? 'project type' : groupBy === 'valueRange' ? 'value range' : groupBy} · click a segment to filter`}
        action={
          <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
            {([
              ['client', 'Client'], ['sector', 'Sector'], ['projectType', 'Project Type'], ['valueRange', 'Value Range'],
            ] as [GroupDim, string][]).map(([g, label]) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${groupBy === g ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        {stackedData.length === 0
          ? <p className="text-sm text-gray-400 py-10 text-center">No results match the current filters.</p>
          : (
            <ResponsiveContainer width="100%" height={Math.max(160, stackedData.length * 36)}>
              <BarChart data={stackedData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="won" name="Won" stackId="a" fill={STATUS_COLOR.good} radius={[4, 0, 0, 4]}
                  onClick={() => toggle('outcome', 'won')} cursor="pointer" />
                <Bar dataKey="lost" name="Lost" stackId="a" fill={STATUS_COLOR.critical} radius={[0, 4, 4, 0]}
                  onClick={() => toggle('outcome', 'lost')} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Bid-to-Award Cycle Time" subtitle="Avg. days, won tenders only">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cycleTrend} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [`${v}d`, 'Cycle time']} />
              <Line type="monotone" dataKey="days" name="Days" stroke={CAT[0]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Margin at Award" subtitle="Contract vs estimated value, won tenders only">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={marginTrend} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [`${v}%`, 'Margin']} />
              <Line type="monotone" dataKey="margin" name="Margin %" stroke={CAT[1]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Status donuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <ChartCard title="LOI Status" subtitle="Won tenders">
          <Donut data={loiData} valueLabel="Tenders" />
        </ChartCard>
        <ChartCard title="Contract Signature Status" subtitle="Won tenders">
          <Donut data={signatureData} valueLabel="Tenders" />
        </ChartCard>
        <ChartCard title="Post-Award Handoff" subtitle="Items transferred to Business Central">
          <Donut data={handoffData} valueLabel="Items" />
        </ChartCard>
      </div>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Tender Results</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredResults.length} of {RESULTS.length} closed tenders</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Result</th>
                <th className="text-left font-semibold px-4 py-2.5">Client</th>
                <th className="text-left font-semibold px-4 py-2.5">Project Type</th>
                <th className="text-left font-semibold px-4 py-2.5">Outcome</th>
                <th className="text-left font-semibold px-4 py-2.5">Bid Value</th>
                <th className="text-left font-semibold px-4 py-2.5">Contract Value</th>
                <th className="text-left font-semibold px-4 py-2.5">Cycle Time</th>
                <th className="text-left font-semibold px-4 py-2.5">LOI / Signature</th>
                <th className="text-left font-semibold px-4 py-2.5">Handoff</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-400 text-sm py-10">No results match the current filters.</td></tr>
              )}
              {filteredResults.map(r => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-500">{r.id}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{r.tenderId}</p>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{r.client}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.projectType}</td>
                  <td className="px-4 py-2.5">
                    <Pill color={r.outcome === 'won' ? STATUS_COLOR.good : STATUS_COLOR.critical} label={OUTCOME_LABEL[r.outcome]} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtCr(r.bidValueCr)}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {r.contractValueCr != null ? fmtCr(r.contractValueCr) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{r.bidToAwardDays != null ? `${r.bidToAwardDays}d` : '—'}</td>
                  <td className="px-4 py-2.5">
                    {r.loiStatus
                      ? (
                        <div className="flex flex-wrap gap-1">
                          <Pill color={LOI_COLOR[r.loiStatus]} label={LOI_LABEL[r.loiStatus]} />
                          <Pill color={r.contractSigned ? STATUS_COLOR.good : STATUS_COLOR.warning} label={r.contractSigned ? 'Signed' : 'Sign Pending'} />
                        </div>
                      )
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {r.handoffItemsTotal != null ? `${r.handoffItemsDone}/${r.handoffItemsTotal}` : '—'}
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
