import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { ProjectHealth, Trend } from '../../data/mis/projectHealthMock';
import { PROJECT_HEALTH, CONSTRUCTION_PROGRESS } from '../../data/mis/projectHealthMock';
import type { RiskLevel } from '../../data/mis/financeMock';
import { CAT, STATUS_COLOR, AXIS_TICK, GRID_STROKE, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect, Pill, FilterChips, BackLink } from '../../components/mis/MisCharts';

interface Filters {
  riskLevel?: RiskLevel;
  trend?: Trend;
}

function matches(p: ProjectHealth, f: Filters, exclude?: string): boolean {
  if (f.riskLevel && exclude !== 'riskLevel' && p.riskLevel !== f.riskLevel) return false;
  if (f.trend && exclude !== 'trend' && p.trend !== f.trend) return false;
  return true;
}

const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];
const RISK_LABEL: Record<RiskLevel, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const RISK_COLOR: Record<RiskLevel, string> = { low: STATUS_COLOR.good, medium: STATUS_COLOR.warning, high: STATUS_COLOR.critical };

const TRENDS: Trend[] = ['improving', 'stable', 'declining'];
const TREND_LABEL: Record<Trend, string> = { improving: 'Improving', stable: 'Stable', declining: 'Declining' };
const TREND_COLOR: Record<Trend, string> = { improving: STATUS_COLOR.good, stable: CAT[0], declining: STATUS_COLOR.critical };
const TREND_ARROW: Record<Trend, string> = { improving: '▲', stable: '►', declining: '▼' };

function healthColor(score: number): string {
  return score >= 80 ? STATUS_COLOR.good : score >= 60 ? STATUS_COLOR.warning : STATUS_COLOR.critical;
}

function profitColor(pct: number): string {
  return pct < 0 ? STATUS_COLOR.critical : pct < 8 ? STATUS_COLOR.warning : STATUS_COLOR.good;
}

export default function ProjectHealthDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filtered = useMemo(() => PROJECT_HEALTH.filter(p => matches(p, filters)), [filters]);

  const healthRankingData = useMemo(
    () => filtered.map(p => ({ name: p.client, value: p.healthScore, fill: healthColor(p.healthScore) })).sort((a, b) => a.value - b.value),
    [filtered],
  );

  const riskData = useMemo(() => {
    const list = PROJECT_HEALTH.filter(p => matches(p, filters, 'riskLevel'));
    const counts = countBy(list, p => p.riskLevel);
    return RISK_LEVELS.map(r => ({ key: r, name: RISK_LABEL[r], value: counts.get(r) ?? 0, color: RISK_COLOR[r] }));
  }, [filters]);

  const trendData = useMemo(() => {
    const list = PROJECT_HEALTH.filter(p => matches(p, filters, 'trend'));
    const counts = countBy(list, p => p.trend);
    return TRENDS.map(t => ({ key: t, name: TREND_LABEL[t], value: counts.get(t) ?? 0, color: TREND_COLOR[t] }));
  }, [filters]);

  const engByProject = useMemo(
    () => filtered
      .filter(p => p.engDrawingsTotal > 0)
      .map(p => ({ name: p.client, value: Math.round((p.engDrawingsApproved / p.engDrawingsTotal) * 100) }))
      .sort((a, b) => a.value - b.value),
    [filtered],
  );

  const constructionData = useMemo(
    () => filtered.map(p => {
      const c = CONSTRUCTION_PROGRESS.find(cp => cp.projectId === p.projectId);
      return { name: p.client, physical: p.completionPct, planned: c?.plannedProgressPct ?? p.completionPct };
    }).sort((a, b) => a.physical - b.physical),
    [filtered],
  );

  const procurementRiskData = useMemo(
    () => filtered.filter(p => p.poCount > 0).map(p => ({ name: p.client, value: p.poItemsAtRisk })).sort((a, b) => b.value - a.value),
    [filtered],
  );

  const profitabilityData = useMemo(
    () => filtered
      .filter(p => p.forecastProfitPct != null)
      .map(p => ({ name: p.client, value: p.forecastProfitPct as number, fill: profitColor(p.forecastProfitPct as number) }))
      .sort((a, b) => a.value - b.value),
    [filtered],
  );

  const attentionNeeded = useMemo(
    () => filtered.filter(p => p.riskLevel === 'high' || p.criticalIssues.length > 0).sort((a, b) => a.healthScore - b.healthScore),
    [filtered],
  );

  const avgHealth = filtered.length ? Math.round(filtered.reduce((s, p) => s + p.healthScore, 0) / filtered.length) : null;
  const avgCompletion = filtered.length ? Math.round(filtered.reduce((s, p) => s + p.completionPct, 0) / filtered.length) : null;
  const highRiskCount = filtered.filter(p => p.riskLevel === 'high').length;
  const decliningCount = filtered.filter(p => p.trend === 'declining').length;
  const totalCriticalIssues = filtered.reduce((s, p) => s + p.criticalIssues.length, 0);

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => (key === 'riskLevel' ? RISK_LABEL[value as RiskLevel] : TREND_LABEL[value as Trend]);

  return (
    <div className="p-6 space-y-4">
      <BackLink />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Project Health Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            A unified, cross-functional view of every project — cost, schedule, engineering, procurement, quality, and risk in one place.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Risk Level" value={filters.riskLevel ? RISK_LABEL[filters.riskLevel] : undefined} options={RISK_LEVELS.map(r => RISK_LABEL[r])}
            onChange={v => toggle('riskLevel', v ? (RISK_LEVELS.find(r => RISK_LABEL[r] === v) as RiskLevel) : undefined)} />
          <FilterSelect label="Trend" value={filters.trend ? TREND_LABEL[filters.trend] : undefined} options={TRENDS.map(t => TREND_LABEL[t])}
            onChange={v => toggle('trend', v ? (TRENDS.find(t => TREND_LABEL[t] === v) as Trend) : undefined)} />
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
        <StatTile label="Active Projects" value={String(filtered.length)} sub={avgCompletion !== null ? `${avgCompletion}% avg. completion` : '—'} />
        <StatTile label="Avg. Health Score" value={avgHealth !== null ? String(avgHealth) : '—'} sub="out of 100" />
        <StatTile label="High Risk Projects" value={String(highRiskCount)} sub="need immediate attention" />
        <StatTile label="Declining Trend" value={String(decliningCount)} sub={`of ${filtered.length} tracked`} />
        <StatTile label="Critical Issues" value={String(totalCriticalIssues)} sub="across all functions" />
        <StatTile label="Projects Flagged" value={String(attentionNeeded.length)} sub="risk or open issues" />
      </div>

      {/* Health ranking */}
      <ChartCard title="Project Health Ranking" subtitle="Composite score — cost risk, schedule, quality, and procurement risk">
        {healthRankingData.length === 0
          ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
          : <HBar data={healthRankingData} height={Math.max(180, healthRankingData.length * 34)} />}
      </ChartCard>

      {/* Risk + trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Risk Level" subtitle="Click a segment to filter">
          <Donut data={riskData} activeKey={filters.riskLevel} valueLabel="Projects" onSliceClick={k => toggle('riskLevel', k as RiskLevel)} />
        </ChartCard>
        <ChartCard title="Health Trend" subtitle="Click a segment to filter">
          <Donut data={trendData} activeKey={filters.trend} valueLabel="Projects" onSliceClick={k => toggle('trend', k as Trend)} />
        </ChartCard>
      </div>

      {/* Engineering + construction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Engineering Status" subtitle="% drawings approved, by project">
          {engByProject.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No drawing data for projects in this view.</p>
            : <HBar data={engByProject} valueFormatter={v => `${v}%`} height={Math.max(150, engByProject.length * 34)} />}
        </ChartCard>
        <ChartCard title="Construction Status" subtitle="Physical vs planned progress, by site">
          <ResponsiveContainer width="100%" height={Math.max(180, constructionData.length * 40)}>
            <BarChart data={constructionData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={2}>
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis type="category" dataKey="name" width={120} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="planned" name="Planned %" fill={CAT[1]} radius={[0, 4, 4, 0]} />
              <Bar dataKey="physical" name="Physical %" fill={CAT[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Procurement + finance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Procurement Risk" subtitle="Items at high delivery risk, by project">
          {procurementRiskData.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No procurement data for projects in this view.</p>
            : <HBar data={procurementRiskData} height={Math.max(150, procurementRiskData.length * 34)} />}
        </ChartCard>
        <ChartCard title="Forecast Profitability" subtitle="Forecast margin %, by project">
          {profitabilityData.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No finance data for projects in this view.</p>
            : <HBar data={profitabilityData} valueFormatter={v => `${v}%`} height={Math.max(150, profitabilityData.length * 34)} />}
        </ChartCard>
      </div>

      {/* Attention needed */}
      <ChartCard title="High-Risk Projects & Critical Issues" subtitle="Requires immediate management attention">
        <div className="space-y-2">
          {attentionNeeded.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No projects flagged in this view.</p>}
          {attentionNeeded.map(p => (
            <div key={p.projectId} className="flex items-start justify-between gap-3 py-2 border-b border-dotted border-gray-100 last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{p.client}</p>
                  <span className={`text-xs font-bold ${p.trend === 'declining' ? 'text-red-600' : p.trend === 'improving' ? 'text-green-600' : 'text-gray-400'}`}>
                    {TREND_ARROW[p.trend]}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-mono mb-1">{p.projectId} · {p.site}</p>
                {p.criticalIssues.length > 0
                  ? <p className="text-xs text-gray-600">{p.criticalIssues.join(' · ')}</p>
                  : <p className="text-xs text-gray-400">Flagged on overall risk level.</p>}
              </div>
              <div className="text-right shrink-0">
                <Pill color={RISK_COLOR[p.riskLevel]} label={`${RISK_LABEL[p.riskLevel]} risk`} />
                <p className="text-xs text-gray-400 mt-1">score {p.healthScore}</p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">All Projects</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filtered.length} of {PROJECT_HEALTH.length} active projects</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Project</th>
                <th className="text-left font-semibold px-4 py-2.5">Completion</th>
                <th className="text-left font-semibold px-4 py-2.5">Health</th>
                <th className="text-left font-semibold px-4 py-2.5">Risk</th>
                <th className="text-left font-semibold px-4 py-2.5">Trend</th>
                <th className="text-left font-semibold px-4 py-2.5">Engineering</th>
                <th className="text-left font-semibold px-4 py-2.5">Procurement</th>
                <th className="text-left font-semibold px-4 py-2.5">Quality</th>
                <th className="text-left font-semibold px-4 py-2.5">Profitability</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-400 text-sm py-10">No projects match the current filters.</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.projectId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-500">{p.projectId}</p>
                    <p className="text-gray-800 font-medium">{p.client}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{p.completionPct}%</td>
                  <td className="px-4 py-2.5"><Pill color={healthColor(p.healthScore)} label={String(p.healthScore)} /></td>
                  <td className="px-4 py-2.5"><Pill color={RISK_COLOR[p.riskLevel]} label={RISK_LABEL[p.riskLevel]} /></td>
                  <td className="px-4 py-2.5">
                    <span className={p.trend === 'declining' ? 'text-red-600' : p.trend === 'improving' ? 'text-green-600' : 'text-gray-500'}>
                      {TREND_ARROW[p.trend]} {TREND_LABEL[p.trend]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {p.engDrawingsTotal > 0 ? `${p.engDrawingsApproved}/${p.engDrawingsTotal} approved` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {p.poCount > 0 ? `${p.poItemsAtRisk} at risk of ${p.poCount}` : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={p.openNcrs > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>{p.openNcrs} open NCRs</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {p.forecastProfitPct != null
                      ? <span className={p.forecastProfitPct < 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>{p.forecastProfitPct}%</span>
                      : '—'}
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
