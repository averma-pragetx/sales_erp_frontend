import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts';
import type { TenderStatus, PrequalStatus, GoNoGo, MisTender } from '../../data/mis/tenderPipelineMock';
import {
  TENDERS, CLOSED_TENDERS, BD_CAPACITY, STATUS_LABELS,
  ALL_SECTORS, ALL_REGIONS, ALL_CLIENTS, ALL_BD_OWNERS,
} from '../../data/mis/tenderPipelineMock';
import { CAT, STATUS_COLOR, AXIS_TICK, GRID_STROKE, countBy, sumByTop, daysUntil } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect } from '../../components/mis/MisCharts';

const STATUS_ORDER: TenderStatus[] = ['identified', 'evaluating', 'bid_in_progress', 'submitted', 'result_pending'];
const PREQUAL_ORDER: PrequalStatus[] = ['pass', 'fail', 'pending'];
const GO_NO_GO_ORDER: GoNoGo[] = ['go', 'no_go', 'pending'];

type GroupDim = 'sector' | 'region' | 'client';

interface Filters {
  status?: TenderStatus;
  sector?: string;
  region?: string;
  client?: string;
  bdOwner?: string;
}

function matches(t: MisTender, f: Filters, exclude?: keyof Filters): boolean {
  if (f.status && exclude !== 'status' && t.status !== f.status) return false;
  if (f.sector && exclude !== 'sector' && t.sector !== f.sector) return false;
  if (f.region && exclude !== 'region' && t.region !== f.region) return false;
  if (f.client && exclude !== 'client' && t.client !== f.client) return false;
  if (f.bdOwner && exclude !== 'bdOwner' && t.bdOwner !== f.bdOwner) return false;
  return true;
}

function fmtCr(v: number): string {
  return `₹${v.toLocaleString('en-IN')} Cr`;
}

const STATUS_BADGE_COLOR: Record<TenderStatus, string> = {
  identified: CAT[0], evaluating: CAT[1], bid_in_progress: CAT[2], submitted: CAT[3], result_pending: CAT[4],
};

function StatusBadge({ status }: { status: TenderStatus }) {
  const color = STATUS_BADGE_COLOR[status];
  return (
    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${color}1f`, color }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function GoNoGoBadge({ value }: { value: GoNoGo }) {
  const map = {
    go: { bg: 'bg-green-100', fg: 'text-green-700', label: 'Go' },
    no_go: { bg: 'bg-red-100', fg: 'text-red-700', label: 'No-Go' },
    pending: { bg: 'bg-amber-100', fg: 'text-amber-700', label: 'Pending' },
  } as const;
  const s = map[value];
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${s.bg} ${s.fg}`}>{s.label}</span>;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export default function TenderPipelineDashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const [groupBy, setGroupBy] = useState<GroupDim>('sector');

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredTenders = useMemo(() => TENDERS.filter(t => matches(t, filters)), [filters]);

  const statusData = useMemo(() => {
    const list = TENDERS.filter(t => matches(t, filters, 'status'));
    const counts = countBy(list, t => t.status);
    return STATUS_ORDER.map((s, i) => ({
      key: s, name: STATUS_LABELS[s], value: counts.get(s) ?? 0, color: CAT[i],
    }));
  }, [filters]);

  const valueChartData = useMemo(() => {
    const list = TENDERS.filter(t => matches(t, filters, groupBy));
    return sumByTop(list, t => t[groupBy], t => t.valueCr);
  }, [filters, groupBy]);

  const bdWorkloadData = useMemo(() => {
    const list = TENDERS.filter(t => matches(t, filters, 'bdOwner'));
    const counts = countBy(list, t => t.bdOwner);
    return ALL_BD_OWNERS.map(name => ({ name, value: counts.get(name) ?? 0 })).sort((a, b) => b.value - a.value);
  }, [filters]);

  const prequalData = useMemo(() => {
    const counts = countBy(filteredTenders, t => t.prequal);
    const colors = { pass: STATUS_COLOR.good, fail: STATUS_COLOR.critical, pending: STATUS_COLOR.warning };
    const labels = { pass: 'Pass', fail: 'Fail', pending: 'Pending' };
    return PREQUAL_ORDER.map(k => ({ key: k, name: labels[k], value: counts.get(k) ?? 0, color: colors[k] }));
  }, [filteredTenders]);

  const goNoGoData = useMemo(() => {
    const counts = countBy(filteredTenders, t => t.goNoGo);
    const colors = { go: STATUS_COLOR.good, no_go: STATUS_COLOR.critical, pending: STATUS_COLOR.warning };
    const labels = { go: 'Go', no_go: 'No-Go', pending: 'Pending' };
    return GO_NO_GO_ORDER.map(k => ({ key: k, name: labels[k], value: counts.get(k) ?? 0, color: colors[k] }));
  }, [filteredTenders]);

  const declineReasonData = useMemo(() => {
    const withReason = filteredTenders.filter(t => t.declineReason);
    const counts = countBy(withReason, t => t.declineReason!);
    return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTenders]);

  const deadlineList = useMemo(
    () => filteredTenders.map(t => ({ ...t, days: daysUntil(t.submissionDeadline) })).sort((a, b) => a.days - b.days).slice(0, 8),
    [filteredTenders],
  );

  const closedFiltered = useMemo(
    () => CLOSED_TENDERS.filter(c => (!filters.sector || c.sector === filters.sector) && (!filters.client || c.client === filters.client)),
    [filters.sector, filters.client],
  );

  const winLossTrend = useMemo(() => {
    const months = [...new Set(CLOSED_TENDERS.map(c => c.month))].sort();
    return months.map(m => {
      const inMonth = closedFiltered.filter(c => c.month === m);
      return {
        month: m.slice(2),
        won: inMonth.filter(c => c.outcome === 'won').length,
        lost: inMonth.filter(c => c.outcome === 'lost').length,
      };
    });
  }, [closedFiltered]);

  const winRate = closedFiltered.length
    ? Math.round((closedFiltered.filter(c => c.outcome === 'won').length / closedFiltered.length) * 100)
    : null;

  const resourceData = useMemo(() => {
    const list = filters.bdOwner ? BD_CAPACITY.filter(b => b.name === filters.bdOwner) : BD_CAPACITY;
    return list
      .map(b => {
        const pct = Math.round((b.hoursLogged / b.capacityHours) * 100);
        const fill = pct > 100 ? STATUS_COLOR.critical : pct >= 90 ? STATUS_COLOR.warning : CAT[0];
        return { name: b.name, value: pct, fill };
      })
      .sort((a, b) => b.value - a.value);
  }, [filters.bdOwner]);

  const avgUtilisation = Math.round(resourceData.reduce((s, b) => s + b.value, 0) / (resourceData.length || 1));

  const decided = filteredTenders.filter(t => t.goNoGo !== 'pending');
  const declinedCount = decided.filter(t => t.goNoGo === 'no_go').length;
  const pursuedCount = decided.filter(t => t.goNoGo === 'go').length;

  const avgDecisionDays = useMemo(() => {
    const withDecision = filteredTenders.filter(t => t.decisionDate);
    if (!withDecision.length) return null;
    const total = withDecision.reduce(
      (s, t) => s + (new Date(t.decisionDate!).getTime() - new Date(t.identifiedDate).getTime()) / 86_400_000, 0,
    );
    return Math.round(total / withDecision.length);
  }, [filteredTenders]);

  const pipelineValue = filteredTenders.reduce((s, t) => s + t.valueCr, 0);

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: keyof Filters, value: string) =>
    key === 'status' ? STATUS_LABELS[value as TenderStatus] : value;
  const anyFilterActive = activeFilterEntries.length > 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Tender Pipeline Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Live, filterable view of all tracked tenders — value, deadlines, and Go/No-Go status in one screen.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Status" value={filters.status} options={STATUS_ORDER.map(s => STATUS_LABELS[s])}
            onChange={v => toggle('status', v ? (STATUS_ORDER.find(s => STATUS_LABELS[s] === v) as TenderStatus) : undefined)} />
          <FilterSelect label="Sector" value={filters.sector} options={ALL_SECTORS} onChange={v => toggle('sector', v)} />
          <FilterSelect label="Region" value={filters.region} options={ALL_REGIONS} onChange={v => toggle('region', v)} />
          <FilterSelect label="Client" value={filters.client} options={ALL_CLIENTS} onChange={v => toggle('client', v)} />
          <FilterSelect label="BD Owner" value={filters.bdOwner} options={ALL_BD_OWNERS} onChange={v => toggle('bdOwner', v)} />
          {anyFilterActive && (
            <button
              onClick={() => setFilters({})}
              className="text-xs font-semibold text-blue-600 hover:underline pb-1.5"
            >
              Clear filters
            </button>
          )}
        </div>
        {anyFilterActive && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
            {activeFilterEntries.map(([key, value]) => (
              <span key={key} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">
                {filterLabel(key, value)}
                <button onClick={() => setFilters(prev => ({ ...prev, [key]: undefined }))} className="text-blue-400 hover:text-blue-700">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <StatTile label="Live Tenders" value={String(filteredTenders.length)} sub="across pipeline" />
        <StatTile label="Pipeline Value" value={fmtCr(pipelineValue)} sub="sum of tracked value" />
        <StatTile label="Win Rate · 12mo" value={winRate !== null ? `${winRate}%` : '—'} sub={`${closedFiltered.length} decided`} />
        <StatTile label="Avg. Decision Time" value={avgDecisionDays !== null ? `${avgDecisionDays}d` : '—'} sub="identification → Go/No-Go" />
        <StatTile label="Declined : Pursued" value={`${declinedCount} : ${pursuedCount}`} sub={`${decided.length} decisions made`} />
        <StatTile label="Team Utilisation" value={`${avgUtilisation}%`} sub="logged vs capacity hours" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Tenders by Status" subtitle="Click a segment to filter">
          <Donut data={statusData} activeKey={filters.status} onSliceClick={k => toggle('status', k as TenderStatus)} />
        </ChartCard>

        <ChartCard
          title="Tender Value Pipeline"
          subtitle={`By ${groupBy} · click a bar to filter`}
          action={
            <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
              {(['sector', 'region', 'client'] as GroupDim[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize ${
                    groupBy === g ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          }
        >
          <HBar
            data={valueChartData}
            valueFormatter={fmtCr}
            activeName={filters[groupBy]}
            onBarClick={name => name !== 'Other' && toggle(groupBy, name)}
          />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Win / Loss Trend" subtitle="Last 12 months, by decision month">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={winLossTrend} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="won" name="Won" stroke={STATUS_COLOR.good} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="lost" name="Lost" stroke={STATUS_COLOR.critical} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Submission Deadlines" subtitle="Soonest first, across filtered tenders">
          <div className="space-y-1">
            {deadlineList.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No tenders match the current filters.</p>}
            {deadlineList.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{t.client}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{t.id}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${t.days <= 7 ? 'text-red-600' : t.days <= 21 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {t.days < 0 ? `${Math.abs(t.days)}d overdue` : `${t.days}d`}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <ChartCard title="Pre-Qualification Status" subtitle="Pass / fail / pending">
          <Donut data={prequalData} />
        </ChartCard>
        <ChartCard title="Go / No-Go Decision Status" subtitle="Across filtered tenders">
          <Donut data={goNoGoData} />
        </ChartCard>
        <ChartCard title="Decline Reason Codes" subtitle="Why tenders were declined">
          {declineReasonData.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No declined tenders in this view.</p>
            : <HBar data={declineReasonData} height={Math.max(150, declineReasonData.length * 34)} />}
        </ChartCard>
      </div>

      {/* Charts row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="BD Team Workload" subtitle="Tenders per person · click to filter">
          <HBar data={bdWorkloadData} activeName={filters.bdOwner} onBarClick={name => toggle('bdOwner', name)} />
        </ChartCard>
        <ChartCard title="Bid Team Resource Utilisation" subtitle="Hours logged vs monthly capacity">
          <HBar data={resourceData} valueFormatter={v => `${v}%`} />
        </ChartCard>
      </div>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Filtered Tenders</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredTenders.length} of {TENDERS.length} tracked tenders</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Tender</th>
                <th className="text-left font-semibold px-4 py-2.5">Client</th>
                <th className="text-left font-semibold px-4 py-2.5">Sector</th>
                <th className="text-left font-semibold px-4 py-2.5">Region</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                <th className="text-left font-semibold px-4 py-2.5">Value</th>
                <th className="text-left font-semibold px-4 py-2.5">Deadline</th>
                <th className="text-left font-semibold px-4 py-2.5">Go/No-Go</th>
                <th className="text-left font-semibold px-4 py-2.5">BD Owner</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenders.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-400 text-sm py-10">No tenders match the current filters.</td></tr>
              )}
              {filteredTenders.map(t => {
                const days = daysUntil(t.submissionDeadline);
                return (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{t.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{t.client}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.sector}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.region}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{fmtCr(t.valueCr)}</td>
                    <td className="px-4 py-2.5">
                      <span className={days <= 7 ? 'text-red-600 font-semibold' : days <= 21 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><GoNoGoBadge value={t.goNoGo} /></td>
                    <td className="px-4 py-2.5 text-gray-600">{t.bdOwner}</td>
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
