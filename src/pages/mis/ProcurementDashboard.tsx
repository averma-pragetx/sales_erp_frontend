import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { PurchaseOrder, PoStatus, RfqStatus, DeliveryRisk, Rfq } from '../../data/mis/procurementMock';
import { PURCHASE_ORDERS, RFQS, PROCUREMENT_BUDGETS, PO_STATUSES, RFQ_STATUSES, PACKAGES } from '../../data/mis/procurementMock';
import { CAT, STATUS_COLOR, AXIS_TICK, GRID_STROKE, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, FilterSelect, Pill, FilterChips, BackLink } from '../../components/mis/MisCharts';

interface Filters {
  projectId?: string;
  package?: string;
  poStatus?: PoStatus;
  risk?: DeliveryRisk;
  rfqStatus?: RfqStatus;
}

function matchesPO(po: PurchaseOrder, f: Filters, exclude?: string): boolean {
  if (f.projectId && exclude !== 'projectId' && po.projectId !== f.projectId) return false;
  if (f.package && exclude !== 'package' && po.package !== f.package) return false;
  if (f.poStatus && exclude !== 'poStatus' && po.status !== f.poStatus) return false;
  if (f.risk && exclude !== 'risk' && po.deliveryRisk !== f.risk) return false;
  return true;
}

function matchesRfq(rfq: Rfq, f: Filters, exclude?: string): boolean {
  if (f.projectId && exclude !== 'projectId' && rfq.projectId !== f.projectId) return false;
  if (f.package && exclude !== 'package' && rfq.package !== f.package) return false;
  if (f.rfqStatus && exclude !== 'rfqStatus' && rfq.status !== f.rfqStatus) return false;
  return true;
}

const PO_STATUS_LABEL: Record<PoStatus, string> = {
  draft: 'Draft', issued: 'Issued', acknowledged: 'Acknowledged', in_transit: 'In Transit', received: 'Received', overdue: 'Overdue',
};
const PO_STATUS_COLOR: Record<PoStatus, string> = {
  draft: '#898781', issued: CAT[0], acknowledged: CAT[1], in_transit: CAT[3], received: STATUS_COLOR.good, overdue: STATUS_COLOR.critical,
};

const RFQ_STATUS_LABEL: Record<RfqStatus, string> = {
  issued: 'Issued', responses_received: 'Responses Received', under_evaluation: 'Under Evaluation', awarded: 'Awarded',
};
const RFQ_STATUS_COLOR: Record<RfqStatus, string> = { issued: CAT[0], responses_received: CAT[1], under_evaluation: CAT[3], awarded: STATUS_COLOR.good };

const RISK_LABEL: Record<DeliveryRisk, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const RISK_COLOR: Record<DeliveryRisk, string> = { low: STATUS_COLOR.good, medium: STATUS_COLOR.warning, high: STATUS_COLOR.critical };

const PROJECT_OPTIONS = [...new Map(PURCHASE_ORDERS.map(p => [p.projectId, `${p.projectId} · ${p.client}`])).entries()];

function fmtCr(v: number): string {
  return `₹${v.toFixed(1)} Cr`;
}

export default function ProcurementDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredPOs = useMemo(() => PURCHASE_ORDERS.filter(po => matchesPO(po, filters)), [filters]);
  const filteredRfqs = useMemo(() => RFQS.filter(r => matchesRfq(r, filters)), [filters]);

  const poStatusData = useMemo(() => {
    const list = PURCHASE_ORDERS.filter(po => matchesPO(po, filters, 'poStatus'));
    const counts = countBy(list, po => po.status);
    return PO_STATUSES.map(s => ({ key: s, name: PO_STATUS_LABEL[s], value: counts.get(s) ?? 0, color: PO_STATUS_COLOR[s] }));
  }, [filters]);

  const rfqStatusData = useMemo(() => {
    const list = RFQS.filter(r => matchesRfq(r, filters, 'rfqStatus'));
    const counts = countBy(list, r => r.status);
    return RFQ_STATUSES.map(s => ({ key: s, name: RFQ_STATUS_LABEL[s], value: counts.get(s) ?? 0, color: RFQ_STATUS_COLOR[s] }));
  }, [filters]);

  const spendByProject = useMemo(() => {
    const list = PURCHASE_ORDERS.filter(po => matchesPO(po, filters, 'projectId'));
    const projectIds = [...new Set(list.map(po => po.projectId))];
    return projectIds
      .map(pid => {
        const spend = list.filter(po => po.projectId === pid).reduce((s, po) => s + po.valueCr, 0);
        const budget = PROCUREMENT_BUDGETS.find(b => b.projectId === pid)?.budgetCr ?? 0;
        const label = PROJECT_OPTIONS.find(([id]) => id === pid)?.[1] ?? pid;
        return { name: label, spend: Math.round(spend * 10) / 10, budget };
      })
      .sort((a, b) => b.budget - a.budget);
  }, [filters]);

  const activePOs = filteredPOs.filter(po => po.status !== 'received');
  const riskData = useMemo(() => {
    const counts = countBy(activePOs, po => po.deliveryRisk);
    return (['low', 'medium', 'high'] as DeliveryRisk[]).map(r => ({ key: r, name: RISK_LABEL[r], value: counts.get(r) ?? 0, color: RISK_COLOR[r] }));
  }, [activePOs]);

  const criticalItems = useMemo(() => filteredPOs.filter(po => po.critical), [filteredPOs]);

  const overdueCount = filteredPOs.filter(po => po.status === 'overdue').length;
  const highRiskCount = activePOs.filter(po => po.deliveryRisk === 'high').length;
  const mediumRiskCount = activePOs.filter(po => po.deliveryRisk === 'medium').length;

  const awardedRfqs = filteredRfqs.filter(r => r.status === 'awarded').length;
  const awardedRate = filteredRfqs.length ? Math.round((awardedRfqs / filteredRfqs.length) * 100) : null;

  const totalSpend = filteredPOs.reduce((s, po) => s + po.valueCr, 0);
  const relevantBudgetProjectIds = [...new Set(filteredPOs.map(po => po.projectId))];
  const totalBudget = PROCUREMENT_BUDGETS.filter(b => relevantBudgetProjectIds.includes(b.projectId)).reduce((s, b) => s + b.budgetCr, 0);

  const vendorComparison = useMemo(
    () => filteredRfqs.map(r => {
      const lowest = r.quotes.length ? r.quotes.reduce((a, b) => (a.amountCr < b.amountCr ? a : b)) : null;
      const avgDelivery = r.quotes.length ? Math.round(r.quotes.reduce((s, q) => s + q.deliveryWeeks, 0) / r.quotes.length) : null;
      return { ...r, lowest, avgDelivery };
    }),
    [filteredRfqs],
  );

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => {
    if (key === 'poStatus') return PO_STATUS_LABEL[value as PoStatus];
    if (key === 'rfqStatus') return RFQ_STATUS_LABEL[value as RfqStatus];
    if (key === 'risk') return RISK_LABEL[value as DeliveryRisk];
    if (key === 'projectId') return PROJECT_OPTIONS.find(([id]) => id === value)?.[1] ?? value;
    return value;
  };

  return (
    <div className="p-6 space-y-4">
      <BackLink />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Procurement Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Not just what has been ordered, but what is at risk of delay — POs, RFQs, and vendor performance in one view.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Project" value={filters.projectId} options={PROJECT_OPTIONS.map(([id]) => id)} onChange={v => toggle('projectId', v)} />
          <FilterSelect label="Package" value={filters.package} options={PACKAGES} onChange={v => toggle('package', v)} />
          <FilterSelect label="PO Status" value={filters.poStatus ? PO_STATUS_LABEL[filters.poStatus] : undefined} options={PO_STATUSES.map(s => PO_STATUS_LABEL[s])}
            onChange={v => toggle('poStatus', v ? (PO_STATUSES.find(s => PO_STATUS_LABEL[s] === v) as PoStatus) : undefined)} />
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
        <StatTile label="POs Tracked" value={String(filteredPOs.length)} sub={fmtCr(totalSpend)} />
        <StatTile label="Overdue POs" value={String(overdueCount)} sub={filteredPOs.length ? `${Math.round((overdueCount / filteredPOs.length) * 100)}% of tracked` : '—'} />
        <StatTile label="RFQs Awarded" value={String(awardedRfqs)} sub={awardedRate !== null ? `${awardedRate}% of ${filteredRfqs.length}` : '—'} />
        <StatTile label="High Delivery Risk" value={String(highRiskCount)} sub={`${mediumRiskCount} medium risk`} />
        <StatTile label="Procurement Spend" value={totalBudget ? `${Math.round((totalSpend / totalBudget) * 100)}%` : '—'} sub={`of ${fmtCr(totalBudget)} budget`} />
        <StatTile label="Critical Items" value={String(criticalItems.length)} sub="need management attention" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Purchase Orders by Status" subtitle="Click a segment to filter">
          <Donut data={poStatusData} activeKey={filters.poStatus} valueLabel="POs" onSliceClick={k => toggle('poStatus', k as PoStatus)} />
        </ChartCard>
        <ChartCard title="RFQs by Status" subtitle="Click a segment to filter">
          <Donut data={rfqStatusData} activeKey={filters.rfqStatus} valueLabel="RFQs" onSliceClick={k => toggle('rfqStatus', k as RfqStatus)} />
        </ChartCard>
      </div>

      {/* Spend vs budget */}
      <ChartCard title="Procurement Spend vs Budget" subtitle="Per project, in ₹ Cr">
        {spendByProject.length === 0
          ? <p className="text-sm text-gray-400 py-10 text-center">No purchase orders match the current filters.</p>
          : (
            <ResponsiveContainer width="100%" height={Math.max(160, spendByProject.length * 34)}>
              <BarChart data={spendByProject} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={2}>
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={140} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => fmtCr(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="budget" name="Budget" fill={CAT[1]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="spend" name="Spend" fill={CAT[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      {/* Risk + critical items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Material Delivery Risk" subtitle="Open purchase orders, click to filter">
          <Donut data={riskData} activeKey={filters.risk} valueLabel="POs" onSliceClick={k => toggle('risk', k as DeliveryRisk)} />
        </ChartCard>
        <ChartCard title="Critical Procurement Items" subtitle="Flagged for management attention">
          <div className="space-y-1 max-h-[220px] overflow-y-auto">
            {criticalItems.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing flagged critical.</p>}
            {criticalItems.map(po => (
              <div key={po.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{po.package} · {po.vendor}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{po.id} · {po.projectId}</p>
                </div>
                <Pill color={PO_STATUS_COLOR[po.status]} label={PO_STATUS_LABEL[po.status]} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Vendor comparison */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Vendor Comparison Summary</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredRfqs.length} RFQs in this view</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">RFQ</th>
                <th className="text-left font-semibold px-4 py-2.5">Package</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                <th className="text-left font-semibold px-4 py-2.5">Invited / Responded</th>
                <th className="text-left font-semibold px-4 py-2.5">Lowest Quote</th>
                <th className="text-left font-semibold px-4 py-2.5">Avg. Delivery</th>
              </tr>
            </thead>
            <tbody>
              {vendorComparison.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 text-sm py-10">No RFQs match the current filters.</td></tr>
              )}
              {vendorComparison.map(r => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.id}</td>
                  <td className="px-4 py-2.5 text-gray-800">{r.package}</td>
                  <td className="px-4 py-2.5"><Pill color={RFQ_STATUS_COLOR[r.status]} label={RFQ_STATUS_LABEL[r.status]} /></td>
                  <td className="px-4 py-2.5 text-gray-600">{r.vendorsInvited} / {r.quotes.length}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.lowest ? `${r.lowest.vendor} · ${fmtCr(r.lowest.amountCr)}` : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.avgDelivery != null ? `${r.avgDelivery} wks` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Purchase Orders</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredPOs.length} of {PURCHASE_ORDERS.length} tracked POs</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">PO</th>
                <th className="text-left font-semibold px-4 py-2.5">Project</th>
                <th className="text-left font-semibold px-4 py-2.5">Package</th>
                <th className="text-left font-semibold px-4 py-2.5">Vendor</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                <th className="text-left font-semibold px-4 py-2.5">Value</th>
                <th className="text-left font-semibold px-4 py-2.5">Delivery</th>
                <th className="text-left font-semibold px-4 py-2.5">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-400 text-sm py-10">No purchase orders match the current filters.</td></tr>
              )}
              {filteredPOs.map(po => (
                <tr key={po.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                    {po.id}
                    {po.critical && <span className="ml-1.5 text-red-500" title="Critical">●</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-500">{po.projectId}</p>
                    <p className="text-gray-600">{po.client}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{po.package}</td>
                  <td className="px-4 py-2.5 text-gray-600">{po.vendor}</td>
                  <td className="px-4 py-2.5"><Pill color={PO_STATUS_COLOR[po.status]} label={PO_STATUS_LABEL[po.status]} /></td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{fmtCr(po.valueCr)}</td>
                  <td className="px-4 py-2.5">
                    <span className={po.expectedDeliveryDaysFromNow < 0 ? 'text-red-600 font-semibold' : po.expectedDeliveryDaysFromNow <= 7 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
                      {po.expectedDeliveryDaysFromNow < 0 ? `${Math.abs(po.expectedDeliveryDaysFromNow)}d overdue` : `${po.expectedDeliveryDaysFromNow}d`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><Pill color={RISK_COLOR[po.deliveryRisk]} label={RISK_LABEL[po.deliveryRisk]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
