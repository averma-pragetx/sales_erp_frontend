import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts';
import type { RiskLevel, ComplianceStatus } from '../../data/mis/financeMock';
import {
  PROJECT_FINANCE, RECEIVABLES, PAYABLES, CASH_FLOW_FORECAST, COMPLIANCE_ITEMS, RISK_LEVELS,
} from '../../data/mis/financeMock';
import { CAT, STATUS_COLOR, AXIS_TICK, GRID_STROKE, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect, Pill, FilterChips } from '../../components/mis/MisCharts';

interface Filters {
  projectId?: string;
  riskLevel?: RiskLevel;
}

const RISK_LABEL: Record<RiskLevel, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const RISK_COLOR: Record<RiskLevel, string> = { low: STATUS_COLOR.good, medium: STATUS_COLOR.warning, high: STATUS_COLOR.critical };

const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = { compliant: 'Compliant', due_soon: 'Due Soon', overdue: 'Overdue' };
const COMPLIANCE_COLOR: Record<ComplianceStatus, string> = { compliant: STATUS_COLOR.good, due_soon: STATUS_COLOR.warning, overdue: STATUS_COLOR.critical };

const RECEIVABLE_AGEING_BUCKETS = [
  { key: '0-30', label: '0–30 days', test: (d: number) => d <= 30 },
  { key: '31-60', label: '31–60 days', test: (d: number) => d > 30 && d <= 60 },
  { key: '61-90', label: '61–90 days', test: (d: number) => d > 60 && d <= 90 },
  { key: '90+', label: '90+ days', test: (d: number) => d > 90 },
];

const PROJECT_OPTIONS = [...new Map(PROJECT_FINANCE.map(p => [p.projectId, `${p.projectId} · ${p.client}`])).entries()];

function fmtCr(v: number): string {
  return `₹${Math.round(v)} Cr`;
}

function profitColor(pct: number): string {
  return pct < 0 ? STATUS_COLOR.critical : pct < 8 ? STATUS_COLOR.warning : STATUS_COLOR.good;
}

export default function FinanceDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredFinance = useMemo(
    () => PROJECT_FINANCE.filter(f => (!filters.projectId || f.projectId === filters.projectId) && (!filters.riskLevel || f.riskLevel === filters.riskLevel)),
    [filters],
  );

  const budgetVsActualData = useMemo(
    () => filteredFinance.map(f => ({ name: f.client, budget: f.budgetCr, actual: f.actualCostCr, forecast: f.forecastCostCr })).sort((a, b) => b.budget - a.budget),
    [filteredFinance],
  );

  const riskData = useMemo(() => {
    const list = PROJECT_FINANCE.filter(f => !filters.projectId || f.projectId === filters.projectId);
    const counts = countBy(list, f => f.riskLevel);
    return RISK_LEVELS.map(r => ({ key: r, name: RISK_LABEL[r], value: counts.get(r) ?? 0, color: RISK_COLOR[r] }));
  }, [filters.projectId]);

  const billingProgressData = useMemo(
    () => filteredFinance.map(f => ({ name: f.client, value: Math.round((f.milestonesInvoiced / f.milestonesTotal) * 100) })).sort((a, b) => a.value - b.value),
    [filteredFinance],
  );

  const profitabilityData = useMemo(
    () => filteredFinance
      .map(f => ({ name: f.client, value: f.forecastProfitPct, fill: profitColor(f.forecastProfitPct) }))
      .sort((a, b) => a.value - b.value),
    [filteredFinance],
  );

  const filteredReceivables = useMemo(
    () => (filters.projectId ? RECEIVABLES.filter(r => r.projectId === filters.projectId) : RECEIVABLES),
    [filters.projectId],
  );
  const receivablesAgeingData = useMemo(() => RECEIVABLE_AGEING_BUCKETS.map((b, i) => ({
    key: b.key,
    name: b.label,
    value: Math.round(filteredReceivables.filter(r => b.test(r.ageDays)).reduce((s, r) => s + r.amountCr, 0)),
    color: [STATUS_COLOR.good, CAT[0], STATUS_COLOR.warning, STATUS_COLOR.critical][i],
  })), [filteredReceivables]);
  const collectionRisk = useMemo(
    () => [...filteredReceivables].sort((a, b) => b.ageDays - a.ageDays).slice(0, 8),
    [filteredReceivables],
  );

  const filteredPayables = useMemo(
    () => (filters.projectId ? PAYABLES.filter(p => p.projectId === filters.projectId) : PAYABLES),
    [filters.projectId],
  );
  const paymentSchedule = useMemo(() => [...filteredPayables].sort((a, b) => a.dueDaysFromNow - b.dueDaysFromNow), [filteredPayables]);

  const budgetTotal = filteredFinance.reduce((s, f) => s + f.budgetCr, 0);
  const actualTotal = filteredFinance.reduce((s, f) => s + f.actualCostCr, 0);
  const forecastTotal = filteredFinance.reduce((s, f) => s + f.forecastCostCr, 0);
  const forecastVariancePct = budgetTotal ? Math.round(((forecastTotal - budgetTotal) / budgetTotal) * 100) : null;

  const highRisk = filteredFinance.filter(f => f.riskLevel === 'high').length;
  const mediumRisk = filteredFinance.filter(f => f.riskLevel === 'medium').length;

  const avgProfitPct = filteredFinance.length
    ? Math.round(filteredFinance.reduce((s, f) => s + f.forecastProfitPct, 0) / filteredFinance.length)
    : null;

  const receivablesTotal = filteredReceivables.reduce((s, r) => s + r.amountCr, 0);
  const avgAgeDays = filteredReceivables.length
    ? Math.round(filteredReceivables.reduce((s, r) => s + r.ageDays, 0) / filteredReceivables.length)
    : null;

  const payablesTotal = filteredPayables.reduce((s, p) => s + p.amountCr, 0);
  const overduePayables = filteredPayables.filter(p => p.dueDaysFromNow < 0).length;

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => {
    if (key === 'riskLevel') return RISK_LABEL[value as RiskLevel];
    if (key === 'projectId') return PROJECT_OPTIONS.find(([id]) => id === value)?.[1] ?? value;
    return value;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Finance Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Not just where the money is today — cash flow, profitability, and risk across the entire project portfolio.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Project" value={filters.projectId} options={PROJECT_OPTIONS.map(([id]) => id)} onChange={v => toggle('projectId', v)} />
          <FilterSelect label="Risk Level" value={filters.riskLevel ? RISK_LABEL[filters.riskLevel] : undefined} options={RISK_LEVELS.map(r => RISK_LABEL[r])}
            onChange={v => toggle('riskLevel', v ? (RISK_LEVELS.find(r => RISK_LABEL[r] === v) as RiskLevel) : undefined)} />
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
        <StatTile label="Budget vs Actual" value={`${fmtCr(actualTotal)} / ${fmtCr(budgetTotal)}`} sub={budgetTotal ? `${Math.round((actualTotal / budgetTotal) * 100)}% of budget used` : '—'} />
        <StatTile label="Forecast Variance" value={forecastVariancePct !== null ? `${forecastVariancePct > 0 ? '+' : ''}${forecastVariancePct}%` : '—'} sub="at completion" />
        <StatTile label="High Risk Projects" value={String(highRisk)} sub={`${mediumRisk} medium risk`} />
        <StatTile label="Forecast Profitability" value={avgProfitPct !== null ? `${avgProfitPct}%` : '—'} sub="portfolio avg." />
        <StatTile label="Receivables Outstanding" value={fmtCr(receivablesTotal)} sub={avgAgeDays !== null ? `avg ${avgAgeDays}d outstanding` : '—'} />
        <StatTile label="Payables Due" value={fmtCr(payablesTotal)} sub={`${overduePayables} overdue`} />
      </div>

      {/* Budget vs actual vs forecast */}
      <ChartCard title="Budget vs Actual vs Forecast" subtitle="Per project, in ₹ Cr — forecast above budget signals overrun risk">
        {budgetVsActualData.length === 0
          ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
          : (
            <ResponsiveContainer width="100%" height={Math.max(180, budgetVsActualData.length * 40)}>
              <BarChart data={budgetVsActualData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={2}>
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={140} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => fmtCr(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="budget" name="Budget" fill={CAT[0]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="actual" name="Actual" fill={CAT[1]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="forecast" name="Forecast at Completion" fill={CAT[3]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      {/* Risk + billing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Cost Overrun Risk" subtitle="Click a segment to filter">
          <Donut data={riskData} activeKey={filters.riskLevel} valueLabel="Projects" onSliceClick={k => toggle('riskLevel', k as RiskLevel)} />
        </ChartCard>
        <ChartCard title="Billing Progress" subtitle="% of milestones invoiced, by project">
          {billingProgressData.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
            : <HBar data={billingProgressData} valueFormatter={v => `${v}%`} height={Math.max(150, billingProgressData.length * 34)} />}
        </ChartCard>
      </div>

      {/* Cash flow forecast */}
      <ChartCard title="Cash Flow Forecast" subtitle="Rolling 12-month inflow, outflow, and net position — in ₹ Cr">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={CASH_FLOW_FORECAST.map(p => ({ ...p, netCr: p.inflowCr - p.outflowCr }))}
            margin={{ top: 8, right: 16, left: -16, bottom: 4 }}
          >
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => fmtCr(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="inflowCr" name="Inflow" stroke={STATUS_COLOR.good} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="outflowCr" name="Outflow" stroke={STATUS_COLOR.critical} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="netCr" name="Net" stroke={CAT[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Profitability + receivables ageing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Forecast Profitability by Project" subtitle="Forecast margin %">
          {profitabilityData.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
            : <HBar data={profitabilityData} valueFormatter={v => `${v}%`} height={Math.max(150, profitabilityData.length * 34)} />}
        </ChartCard>
        <ChartCard title="Receivables Ageing" subtitle="Outstanding amount by age bucket">
          <Donut data={receivablesAgeingData} valueLabel="₹ Cr" />
        </ChartCard>
      </div>

      {/* Collection risk + payment schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Collection Risk" subtitle="Outstanding receivables, oldest first">
          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {collectionRisk.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No outstanding receivables.</p>}
            {collectionRisk.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{r.client} · {fmtCr(r.amountCr)}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{r.id} · {r.projectId}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${r.ageDays > 90 ? 'text-red-600' : r.ageDays > 60 ? 'text-amber-600' : 'text-gray-500'}`}>{r.ageDays}d</span>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Payment Schedule" subtitle="Outstanding payables, soonest due first">
          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {paymentSchedule.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No outstanding payables.</p>}
            {paymentSchedule.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{p.vendor} · {fmtCr(p.amountCr)}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{p.id} · {p.projectId}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${p.dueDaysFromNow < 0 ? 'text-red-600' : p.dueDaysFromNow <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {p.dueDaysFromNow < 0 ? `${Math.abs(p.dueDaysFromNow)}d overdue` : `${p.dueDaysFromNow}d`}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Compliance */}
      <ChartCard title="GST / TDS / TCS Compliance" subtitle="Statutory filing status">
        <div className="space-y-1.5">
          {COMPLIANCE_ITEMS.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-dotted border-gray-100 last:border-0">
              <div className="min-w-0">
                <p className="text-[13px] text-gray-800">{c.name}</p>
                <p className="text-[11px] text-gray-400">{c.type}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-500">{c.dueInDays < 0 ? `${Math.abs(c.dueInDays)}d overdue` : `due in ${c.dueInDays}d`}</span>
                <Pill color={COMPLIANCE_COLOR[c.status]} label={COMPLIANCE_LABEL[c.status]} />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Project Finance</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredFinance.length} of {PROJECT_FINANCE.length} projects</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Project</th>
                <th className="text-left font-semibold px-4 py-2.5">Contract</th>
                <th className="text-left font-semibold px-4 py-2.5">Budget</th>
                <th className="text-left font-semibold px-4 py-2.5">Actual</th>
                <th className="text-left font-semibold px-4 py-2.5">Forecast</th>
                <th className="text-left font-semibold px-4 py-2.5">Risk</th>
                <th className="text-left font-semibold px-4 py-2.5">Profitability</th>
                <th className="text-left font-semibold px-4 py-2.5">Milestones Invoiced</th>
              </tr>
            </thead>
            <tbody>
              {filteredFinance.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-400 text-sm py-10">No projects match the current filters.</td></tr>
              )}
              {filteredFinance.map(f => (
                <tr key={f.projectId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-500">{f.projectId}</p>
                    <p className="text-gray-800 font-medium">{f.client}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtCr(f.contractValueCr)}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtCr(f.budgetCr)}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtCr(f.actualCostCr)}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{fmtCr(f.forecastCostCr)}</td>
                  <td className="px-4 py-2.5"><Pill color={RISK_COLOR[f.riskLevel]} label={RISK_LABEL[f.riskLevel]} /></td>
                  <td className="px-4 py-2.5">
                    <span className={f.forecastProfitPct < 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>{f.forecastProfitPct}%</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{f.milestonesInvoiced}/{f.milestonesTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
