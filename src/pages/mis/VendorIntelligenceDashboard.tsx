import { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { VENDOR_SCORECARDS, VENDOR_CATEGORIES, RELIABILITY_TREND } from '../../data/mis/vendorIntelligenceMock';
import { RFQS } from '../../data/mis/procurementMock';
import { CAT, AXIS_TICK, GRID_STROKE } from '../../components/mis/misUtils';
import { StatTile, ChartCard, HBar, FilterSelect, Pill, FilterChips } from '../../components/mis/MisCharts';

interface Filters {
  category?: string;
  vendor?: string;
}

const ALL_VENDOR_NAMES = VENDOR_SCORECARDS.map(v => v.vendor);
const AGEING_THRESHOLD_DAYS = 14;

function scoreColor(score: number): string {
  return score >= 85 ? '#0ca30c' : score >= 70 ? '#fab219' : '#d03b3b';
}

export default function VendorIntelligenceDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredVendors = useMemo(
    () => VENDOR_SCORECARDS.filter(v => (!filters.category || v.category === filters.category) && (!filters.vendor || v.vendor === filters.vendor)),
    [filters],
  );

  const ranked = useMemo(
    () => [...filteredVendors].sort((a, b) => b.performanceScore - a.performanceScore).map((v, i) => ({ ...v, rank: i + 1 })),
    [filteredVendors],
  );

  const rankingChartData = useMemo(
    () => ranked.map(v => ({ name: v.vendor, value: v.performanceScore, fill: scoreColor(v.performanceScore) })),
    [ranked],
  );

  const avgPerformance = filteredVendors.length
    ? Math.round(filteredVendors.reduce((s, v) => s + v.performanceScore, 0) / filteredVendors.length)
    : null;
  const avgReliability = filteredVendors.length
    ? Math.round(filteredVendors.reduce((s, v) => s + v.deliveryReliabilityPct, 0) / filteredVendors.length)
    : null;

  const reliabilityDelta = RELIABILITY_TREND[RELIABILITY_TREND.length - 1].reliabilityPct - RELIABILITY_TREND[0].reliabilityPct;

  const openRfqs = useMemo(() => RFQS.filter(r => r.status !== 'awarded'), []);
  const pendingResponses = openRfqs.reduce((s, r) => s + Math.max(0, r.vendorsInvited - r.quotes.length), 0);
  const ageingRfqs = useMemo(
    () => openRfqs.filter(r => r.issuedDaysAgo > AGEING_THRESHOLD_DAYS).sort((a, b) => b.issuedDaysAgo - a.issuedDaysAgo),
    [openRfqs],
  );

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Vendor Intelligence Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            An objective, data-driven view of vendor performance across the entire vendor base.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Category" value={filters.category} options={VENDOR_CATEGORIES} onChange={v => toggle('category', v)} />
          <FilterSelect label="Vendor" value={filters.vendor} options={ALL_VENDOR_NAMES} onChange={v => toggle('vendor', v)} />
        </div>
        <FilterChips
          entries={activeFilterEntries}
          labelFor={(_, v) => v}
          onRemove={key => setFilters(prev => ({ ...prev, [key]: undefined }))}
          onClear={() => setFilters({})}
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <StatTile label="Vendors Tracked" value={String(filteredVendors.length)} sub="scored this period" />
        <StatTile label="Avg. Performance Score" value={avgPerformance !== null ? String(avgPerformance) : '—'} sub="out of 100" />
        <StatTile label="Avg. Delivery Reliability" value={avgReliability !== null ? `${avgReliability}%` : '—'}
          sub={`${reliabilityDelta > 0 ? '▲' : '▼'} ${Math.abs(reliabilityDelta)}pp vs 12mo ago`} />
        <StatTile label="Pending Vendor Responses" value={String(pendingResponses)} sub="across open RFQs" />
        <StatTile label="Ageing RFQs" value={String(ageingRfqs.length)} sub={`over ${AGEING_THRESHOLD_DAYS} days open`} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Vendor Performance Ranking" subtitle="Overall score, click a bar to filter">
          {rankingChartData.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No vendors match the current filters.</p>
            : <HBar data={rankingChartData} activeName={filters.vendor} onBarClick={name => toggle('vendor', name)} height={Math.max(150, rankingChartData.length * 34)} />}
        </ChartCard>
        <ChartCard title="Delivery Reliability Trend" subtitle="Portfolio-wide on-time delivery %, last 12 months">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={RELIABILITY_TREND} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [`${v}%`, 'Reliability']} />
              <Line type="monotone" dataKey="reliabilityPct" name="On-time %" stroke={CAT[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Vendor scorecard table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Vendor Scorecards</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">Ranked by overall performance score{filters.category ? ` · ${filters.category}` : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Rank</th>
                <th className="text-left font-semibold px-4 py-2.5">Vendor</th>
                <th className="text-left font-semibold px-4 py-2.5">Category</th>
                <th className="text-left font-semibold px-4 py-2.5">Performance</th>
                <th className="text-left font-semibold px-4 py-2.5">Delivery Reliability</th>
                <th className="text-left font-semibold px-4 py-2.5">Quality</th>
                <th className="text-left font-semibold px-4 py-2.5">Cost Competitiveness</th>
                <th className="text-left font-semibold px-4 py-2.5">Orders Completed</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-400 text-sm py-10">No vendors match the current filters.</td></tr>
              )}
              {ranked.map(v => (
                <tr key={v.vendor} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 text-gray-500 font-mono">#{v.rank}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{v.vendor}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.category}</td>
                  <td className="px-4 py-2.5"><Pill color={scoreColor(v.performanceScore)} label={String(v.performanceScore)} /></td>
                  <td className="px-4 py-2.5 text-gray-600">{v.deliveryReliabilityPct}%</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.qualityScore}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.costScore}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.ordersCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending responses / ageing */}
      <ChartCard title="Pending Vendor Responses — RFQ Ageing" subtitle="Open RFQs, oldest first">
        <div className="space-y-1">
          {ageingRfqs.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No ageing RFQs — all responses are current.</p>}
          {ageingRfqs.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{r.package}</p>
                <p className="text-[11px] text-gray-400 font-mono">{r.id} · {r.quotes.length}/{r.vendorsInvited} responded</p>
              </div>
              <span className={`text-sm font-bold shrink-0 ${r.issuedDaysAgo > 21 ? 'text-red-600' : 'text-amber-600'}`}>{r.issuedDaysAgo}d</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
