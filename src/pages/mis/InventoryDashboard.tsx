import { useMemo, useState } from 'react';
import type { StockItem, QualityResult } from '../../data/mis/inventoryMock';
import { STOCK_ITEMS, ITEM_CATEGORIES, WAREHOUSES } from '../../data/mis/inventoryMock';
import { CAT, STATUS_COLOR, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect, Pill, FilterChips, BackLink } from '../../components/mis/MisCharts';

type GroupDim = 'projectId' | 'itemCategory' | 'warehouse';

interface Filters {
  projectId?: string;
  itemCategory?: string;
  warehouse?: string;
  quality?: QualityResult;
}

function matches(item: StockItem, f: Filters, exclude?: string): boolean {
  if (f.projectId && exclude !== 'projectId' && item.projectId !== f.projectId) return false;
  if (f.itemCategory && exclude !== 'itemCategory' && item.itemCategory !== f.itemCategory) return false;
  if (f.warehouse && exclude !== 'warehouse' && item.warehouse !== f.warehouse) return false;
  if (f.quality && exclude !== 'quality' && item.qualityInspection !== f.quality) return false;
  return true;
}

const QUALITY_LABEL: Record<QualityResult, string> = { pass: 'Pass', fail: 'Fail', pending: 'Pending' };
const QUALITY_COLOR: Record<QualityResult, string> = { pass: STATUS_COLOR.good, fail: STATUS_COLOR.critical, pending: STATUS_COLOR.warning };

const SLOW_MOVING_THRESHOLD_DAYS = 45;
const EXCESS_THRESHOLD_PCT = 110;

const PROJECT_OPTIONS = [...new Map(STOCK_ITEMS.map(i => [i.projectId, `${i.projectId} · ${i.client}`])).entries()];

function fulfilmentPct(item: StockItem): number {
  return Math.round((item.receivedQuantity / item.mtoQuantity) * 100);
}

function fulfilmentColor(pct: number): string {
  if (pct > EXCESS_THRESHOLD_PCT) return CAT[4];
  if (pct >= 95) return STATUS_COLOR.good;
  if (pct >= 70) return STATUS_COLOR.warning;
  return STATUS_COLOR.critical;
}

export default function InventoryDashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const [groupBy, setGroupBy] = useState<GroupDim>('projectId');

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredItems = useMemo(() => STOCK_ITEMS.filter(i => matches(i, filters)), [filters]);

  const stockStatusData = useMemo(() => {
    const list = STOCK_ITEMS.filter(i => matches(i, filters, groupBy));
    const groups = groupBy === 'projectId' ? [...new Set(list.map(i => i.projectId))] : groupBy === 'itemCategory' ? ITEM_CATEGORIES : WAREHOUSES;
    return groups
      .map(g => {
        const inGroup = list.filter(i => i[groupBy] === g);
        if (!inGroup.length) return null;
        const avgPct = Math.round(inGroup.reduce((s, i) => s + fulfilmentPct(i), 0) / inGroup.length);
        const name = groupBy === 'projectId' ? (PROJECT_OPTIONS.find(([id]) => id === g)?.[1] ?? g) : g;
        return { name, value: avgPct, fill: fulfilmentColor(avgPct) };
      })
      .filter((r): r is { name: string; value: number; fill: string } => r !== null)
      .sort((a, b) => a.value - b.value);
  }, [filters, groupBy]);

  const avgFulfilment = filteredItems.length
    ? Math.round(filteredItems.reduce((s, i) => s + fulfilmentPct(i), 0) / filteredItems.length)
    : null;

  const pendingReceipts = useMemo(
    () => filteredItems.filter(i => i.pendingReceiptQty > 0).sort((a, b) => (a.expectedDeliveryDaysFromNow ?? 0) - (b.expectedDeliveryDaysFromNow ?? 0)),
    [filteredItems],
  );
  const avgPendingDays = pendingReceipts.length
    ? Math.round(pendingReceipts.reduce((s, i) => s + (i.expectedDeliveryDaysFromNow ?? 0), 0) / pendingReceipts.length)
    : null;

  const withIssued = filteredItems.filter(i => i.issuedQuantity > 0);
  const avgConsumptionRate = withIssued.length
    ? Math.round(withIssued.reduce((s, i) => s + (i.consumedQuantity / i.issuedQuantity) * 100, 0) / withIssued.length)
    : null;

  const qualityData = useMemo(() => {
    const list = STOCK_ITEMS.filter(i => matches(i, filters, 'quality'));
    const counts = countBy(list, i => i.qualityInspection);
    return (['pass', 'fail', 'pending'] as QualityResult[]).map(q => ({
      key: q, name: QUALITY_LABEL[q], value: counts.get(q) ?? 0, color: QUALITY_COLOR[q],
    }));
  }, [filters]);
  const decidedQuality = filteredItems.filter(i => i.qualityInspection !== 'pending');
  const qualityPassRate = decidedQuality.length
    ? Math.round((decidedQuality.filter(i => i.qualityInspection === 'pass').length / decidedQuality.length) * 100)
    : null;

  const consumptionByCategory = useMemo(() => {
    const list = STOCK_ITEMS.filter(i => matches(i, filters, 'itemCategory') && i.issuedQuantity > 0);
    return ITEM_CATEGORIES
      .map(cat => {
        const inCat = list.filter(i => i.itemCategory === cat);
        if (!inCat.length) return null;
        return { name: cat, value: Math.round(inCat.reduce((s, i) => s + (i.consumedQuantity / i.issuedQuantity) * 100, 0) / inCat.length) };
      })
      .filter((r): r is { name: string; value: number } => r !== null)
      .sort((a, b) => b.value - a.value);
  }, [filters]);

  const excessItems = useMemo(
    () => filteredItems.filter(i => fulfilmentPct(i) > EXCESS_THRESHOLD_PCT).sort((a, b) => fulfilmentPct(b) - fulfilmentPct(a)),
    [filteredItems],
  );

  const slowMovingItems = useMemo(
    () => filteredItems
      .filter(i => i.lastMovementDaysAgo > SLOW_MOVING_THRESHOLD_DAYS && i.receivedQuantity - i.issuedQuantity > 0)
      .sort((a, b) => b.lastMovementDaysAgo - a.lastMovementDaysAgo),
    [filteredItems],
  );

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => {
    if (key === 'quality') return QUALITY_LABEL[value as QualityResult];
    if (key === 'projectId') return PROJECT_OPTIONS.find(([id]) => id === value)?.[1] ?? value;
    return value;
  };

  return (
    <div className="p-6 space-y-4">
      <BackLink />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Inventory & Material Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Bridges Business Central inventory records and the engineering MTO — are the right materials available for the work planned.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Project" value={filters.projectId} options={PROJECT_OPTIONS.map(([id]) => id)} onChange={v => toggle('projectId', v)} />
          <FilterSelect label="Item Category" value={filters.itemCategory} options={ITEM_CATEGORIES} onChange={v => toggle('itemCategory', v)} />
          <FilterSelect label="Warehouse" value={filters.warehouse} options={WAREHOUSES} onChange={v => toggle('warehouse', v)} />
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
        <StatTile label="Items Tracked" value={String(filteredItems.length)} sub="across all warehouses" />
        <StatTile label="Avg. MTO Fulfilment" value={avgFulfilment !== null ? `${avgFulfilment}%` : '—'} sub="received vs required" />
        <StatTile label="Pending Receipts" value={String(pendingReceipts.length)} sub={avgPendingDays !== null ? `avg ${avgPendingDays}d to delivery` : '—'} />
        <StatTile label="Consumption Rate" value={avgConsumptionRate !== null ? `${avgConsumptionRate}%` : '—'} sub="issued vs consumed" />
        <StatTile label="Quality Pass Rate" value={qualityPassRate !== null ? `${qualityPassRate}%` : '—'} sub="at receipt" />
        <StatTile label="Slow-Moving Alerts" value={String(slowMovingItems.length)} sub={`no movement >${SLOW_MOVING_THRESHOLD_DAYS}d`} />
      </div>

      {/* Stock status toggle chart */}
      <ChartCard
        title="Stock Status"
        subtitle={`By ${groupBy === 'projectId' ? 'project' : groupBy === 'itemCategory' ? 'item category' : 'warehouse'} · avg. MTO fulfilment %`}
        action={
          <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
            {([['projectId', 'Project'], ['itemCategory', 'Category'], ['warehouse', 'Warehouse']] as [GroupDim, string][]).map(([g, label]) => (
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
        {stockStatusData.length === 0
          ? <p className="text-sm text-gray-400 py-10 text-center">No stock items match the current filters.</p>
          : <HBar data={stockStatusData} valueFormatter={v => `${v}%`} height={Math.max(150, stockStatusData.length * 34)} />}
      </ChartCard>

      {/* Pending receipts + quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Pending Receipts" subtitle="Soonest expected first">
          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {pendingReceipts.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing pending receipt.</p>}
            {pendingReceipts.map(i => (
              <div key={i.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{i.itemCategory} · {i.pendingReceiptQty} {i.unit}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{i.id} · {i.projectId}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${(i.expectedDeliveryDaysFromNow ?? 0) <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                  {i.expectedDeliveryDaysFromNow}d
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Quality Inspection at Receipt" subtitle="Click a segment to filter">
          <Donut data={qualityData} activeKey={filters.quality} valueLabel="Items" onSliceClick={k => toggle('quality', k as QualityResult)} />
        </ChartCard>
      </div>

      {/* Consumption + excess */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Material Issued vs Consumed" subtitle="Avg. consumption rate by category">
          {consumptionByCategory.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No issued materials in this view.</p>
            : <HBar data={consumptionByCategory} valueFormatter={v => `${v}%`} height={Math.max(150, consumptionByCategory.length * 34)} />}
        </ChartCard>
        <ChartCard title="Excess & Surplus Stock" subtitle={`Received > ${EXCESS_THRESHOLD_PCT}% of MTO requirement`}>
          <div className="space-y-1 max-h-[220px] overflow-y-auto">
            {excessItems.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No excess stock flagged.</p>}
            {excessItems.map(i => (
              <div key={i.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{i.itemCategory} · {i.projectId}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{i.receivedQuantity} / {i.mtoQuantity} {i.unit}</p>
                </div>
                <Pill color={CAT[4]} label={`${fulfilmentPct(i)}%`} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Slow-moving alerts */}
      <ChartCard title="Slow-Moving Stock Alerts" subtitle={`On hand with no movement in over ${SLOW_MOVING_THRESHOLD_DAYS} days`}>
        <div className="space-y-1">
          {slowMovingItems.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No slow-moving stock flagged.</p>}
          {slowMovingItems.map(i => (
            <div key={i.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{i.itemCategory} · {i.warehouse} · {i.client}</p>
                <p className="text-[11px] text-gray-400 font-mono">{i.id} · {i.receivedQuantity - i.issuedQuantity} {i.unit} idle</p>
              </div>
              <span className="text-sm font-bold shrink-0 text-red-600">{i.lastMovementDaysAgo}d</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Stock Items</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredItems.length} of {STOCK_ITEMS.length} tracked items</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Item</th>
                <th className="text-left font-semibold px-4 py-2.5">Project</th>
                <th className="text-left font-semibold px-4 py-2.5">Warehouse</th>
                <th className="text-left font-semibold px-4 py-2.5">MTO / Received</th>
                <th className="text-left font-semibold px-4 py-2.5">Fulfilment</th>
                <th className="text-left font-semibold px-4 py-2.5">Issued / Consumed</th>
                <th className="text-left font-semibold px-4 py-2.5">Quality</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 text-sm py-10">No stock items match the current filters.</td></tr>
              )}
              {filteredItems.map(i => (
                <tr key={i.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <p className="text-gray-800">{i.itemCategory}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{i.id}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-500">{i.projectId}</p>
                    <p className="text-gray-600">{i.client}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{i.warehouse}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{i.mtoQuantity} / {i.receivedQuantity} {i.unit}</td>
                  <td className="px-4 py-2.5"><Pill color={fulfilmentColor(fulfilmentPct(i))} label={`${fulfilmentPct(i)}%`} /></td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{i.issuedQuantity} / {i.consumedQuantity} {i.unit}</td>
                  <td className="px-4 py-2.5"><Pill color={QUALITY_COLOR[i.qualityInspection]} label={QUALITY_LABEL[i.qualityInspection]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
