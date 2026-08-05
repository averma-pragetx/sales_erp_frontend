import { useMemo, useState } from 'react';
import type { Bid, BidStage, InstrumentStatus } from '../../data/mis/bidPreparationMock';
import { BIDS, BID_STAGES } from '../../data/mis/bidPreparationMock';
import { ALL_CLIENTS, ALL_BD_OWNERS, BD_CAPACITY } from '../../data/mis/tenderPipelineMock';
import { CAT, STATUS_COLOR, countBy, daysUntil } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect, Pill, FilterChips, BackLink } from '../../components/mis/MisCharts';

interface Filters {
  stage?: BidStage;
  client?: string;
  owner?: string;
}

function matches(b: Bid, f: Filters, exclude?: keyof Filters): boolean {
  if (f.stage && exclude !== 'stage' && b.stage !== f.stage) return false;
  if (f.client && exclude !== 'client' && b.client !== f.client) return false;
  if (f.owner && exclude !== 'owner' && b.owner !== f.owner) return false;
  return true;
}

const STAGE_LABEL: Record<BidStage, string> = { drafting: 'Drafting', review: 'Review', final: 'Final', submitted: 'Submitted' };
const STAGE_COLOR: Record<BidStage, string> = { drafting: CAT[0], review: CAT[1], final: CAT[2], submitted: CAT[3] };

const INSTRUMENT_COLOR: Record<InstrumentStatus, string> = {
  active: STATUS_COLOR.good, expiring: STATUS_COLOR.warning, released: '#898781',
};
const INSTRUMENT_LABEL: Record<InstrumentStatus, string> = { active: 'Active', expiring: 'Expiring', released: 'Released' };

const AT_RISK_DAYS = 7;

function fmtCr(v: number): string {
  return `₹${v.toFixed(1)} Cr`;
}

export default function BidPreparationDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredBids = useMemo(() => BIDS.filter(b => matches(b, filters)), [filters]);

  const stageData = useMemo(() => {
    const list = BIDS.filter(b => matches(b, filters, 'stage'));
    const counts = countBy(list, b => b.stage);
    return BID_STAGES.map(s => ({ key: s, name: STAGE_LABEL[s], value: counts.get(s) ?? 0, color: STAGE_COLOR[s] }));
  }, [filters]);

  const activeBids = filteredBids.filter(b => b.stage !== 'submitted');
  const submittedBids = filteredBids.filter(b => b.stage === 'submitted');

  const deadlineList = useMemo(
    () => activeBids.map(b => ({ ...b, days: daysUntil(b.submissionDeadline) })).sort((a, b) => a.days - b.days).slice(0, 8),
    [activeBids],
  );

  const atRiskCount = activeBids.filter(b => daysUntil(b.submissionDeadline) <= AT_RISK_DAYS).length;

  const complianceTotals = filteredBids.reduce(
    (acc, b) => ({ total: acc.total + b.complianceTotal, cleared: acc.cleared + b.complianceCleared }),
    { total: 0, cleared: 0 },
  );
  const complianceData = [
    { key: 'cleared', name: 'Cleared', value: complianceTotals.cleared, color: STATUS_COLOR.good },
    { key: 'outstanding', name: 'Outstanding', value: complianceTotals.total - complianceTotals.cleared, color: STATUS_COLOR.warning },
  ];

  const allInstruments = useMemo(
    () => filteredBids.flatMap(b => b.instruments.map(i => ({ ...i, bidId: b.id, client: b.client }))),
    [filteredBids],
  );

  const instrumentData = useMemo(() => {
    const counts = countBy(allInstruments, i => i.status);
    return (['active', 'expiring', 'released'] as InstrumentStatus[]).map(s => ({
      key: s, name: INSTRUMENT_LABEL[s], value: counts.get(s) ?? 0, color: INSTRUMENT_COLOR[s],
    }));
  }, [allInstruments]);

  const expiringSoon = useMemo(
    () => allInstruments
      .filter(i => i.status !== 'released')
      .map(i => ({ ...i, days: daysUntil(i.expiryDate) }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 8),
    [allInstruments],
  );

  const effortData = useMemo(
    () => filteredBids.map(b => ({ name: `${b.id} · ${b.client}`, value: b.hoursLogged })).sort((a, b) => b.value - a.value).slice(0, 10),
    [filteredBids],
  );

  const teamUtilisation = useMemo(() => {
    const list = filters.owner ? BD_CAPACITY.filter(o => o.name === filters.owner) : BD_CAPACITY;
    return list
      .map(o => {
        const pct = Math.round((o.hoursLogged / o.capacityHours) * 100);
        const fill = pct > 100 ? STATUS_COLOR.critical : pct >= 90 ? STATUS_COLOR.warning : CAT[0];
        return { name: o.name, value: pct, fill };
      })
      .sort((a, b) => b.value - a.value);
  }, [filters.owner]);

  const avgUtilisation = Math.round(teamUtilisation.reduce((s, o) => s + o.value, 0) / (teamUtilisation.length || 1));
  const avgHours = filteredBids.length ? Math.round(filteredBids.reduce((s, b) => s + b.hoursLogged, 0) / filteredBids.length) : 0;
  const expiringCount = allInstruments.filter(i => i.status === 'expiring').length;
  const activeInstrumentCount = allInstruments.filter(i => i.status === 'active').length;

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => (key === 'stage' ? STAGE_LABEL[value as BidStage] : value);

  return (
    <div className="p-6 space-y-4">
      <BackLink />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Bid Preparation Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Which bids are on track for submission, and which are at risk of missing deadlines or compliance requirements.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Stage" value={filters.stage ? STAGE_LABEL[filters.stage] : undefined} options={BID_STAGES.map(s => STAGE_LABEL[s])}
            onChange={v => toggle('stage', v ? (BID_STAGES.find(s => STAGE_LABEL[s] === v) as BidStage) : undefined)} />
          <FilterSelect label="Client" value={filters.client} options={ALL_CLIENTS} onChange={v => toggle('client', v)} />
          <FilterSelect label="Owner" value={filters.owner} options={ALL_BD_OWNERS} onChange={v => toggle('owner', v)} />
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
        <StatTile label="Bids In Progress" value={String(activeBids.length)} sub={`${submittedBids.length} submitted`} />
        <StatTile label="At-Risk Deadlines" value={String(atRiskCount)} sub={`≤${AT_RISK_DAYS} days remaining`} />
        <StatTile label="Compliance Cleared" value={`${complianceTotals.cleared}/${complianceTotals.total}`}
          sub={complianceTotals.total ? `${Math.round((complianceTotals.cleared / complianceTotals.total) * 100)}% cleared` : '—'} />
        <StatTile label="EMD / BG Active" value={String(activeInstrumentCount)} sub={`${expiringCount} expiring soon`} />
        <StatTile label="Team Utilisation" value={`${avgUtilisation}%`} sub="logged vs capacity hours" />
        <StatTile label="Avg. Hours / Bid" value={`${avgHours}h`} sub="across filtered bids" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Bids by Stage" subtitle="Click a segment to filter">
          <Donut data={stageData} activeKey={filters.stage} valueLabel="Bids" onSliceClick={k => toggle('stage', k as BidStage)} />
        </ChartCard>
        <ChartCard title="Submission Deadlines" subtitle="Active bids, soonest first">
          <div className="space-y-1">
            {deadlineList.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No active bids match the current filters.</p>}
            {deadlineList.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{b.client}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{b.id}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${b.days <= 7 ? 'text-red-600' : b.days <= 21 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {b.days < 0 ? `${Math.abs(b.days)}d overdue` : `${b.days}d`}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Compliance Status" subtitle="Checklist items cleared vs outstanding">
          <Donut data={complianceData} valueLabel="Items" />
        </ChartCard>
        <ChartCard title="EMD & Bank Guarantee Status" subtitle="Across filtered bids">
          <Donut data={instrumentData} valueLabel="Instruments" />
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Expiring Soon" subtitle="EMD / BG instruments not yet released">
          <div className="space-y-1 max-h-[220px] overflow-y-auto">
            {expiringSoon.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing outstanding.</p>}
            {expiringSoon.map((i, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{i.type} · {fmtCr(i.amountCr)} · {i.client}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{i.bidId}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${i.days <= 7 ? 'text-red-600' : i.days <= 21 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {i.days < 0 ? `${Math.abs(i.days)}d overdue` : `${i.days}d`}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Bid Preparation Effort" subtitle="Hours logged, per bid">
          <HBar data={effortData} valueFormatter={v => `${v}h`} height={Math.max(150, effortData.length * 34)} />
        </ChartCard>
      </div>

      <ChartCard title="Bid Team Utilisation" subtitle="Hours logged vs monthly capacity · click to filter">
        <HBar data={teamUtilisation} valueFormatter={v => `${v}%`} activeName={filters.owner} onBarClick={name => toggle('owner', name)} />
      </ChartCard>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Bids</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredBids.length} of {BIDS.length} tracked bids</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Bid</th>
                <th className="text-left font-semibold px-4 py-2.5">Client</th>
                <th className="text-left font-semibold px-4 py-2.5">Stage</th>
                <th className="text-left font-semibold px-4 py-2.5">Deadline</th>
                <th className="text-left font-semibold px-4 py-2.5">Compliance</th>
                <th className="text-left font-semibold px-4 py-2.5">EMD / BG</th>
                <th className="text-left font-semibold px-4 py-2.5">Hours</th>
                <th className="text-left font-semibold px-4 py-2.5">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filteredBids.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-400 text-sm py-10">No bids match the current filters.</td></tr>
              )}
              {filteredBids.map(b => {
                const days = daysUntil(b.submissionDeadline);
                return (
                  <tr key={b.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-xs text-gray-500">{b.id}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{b.tenderId}</p>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{b.client}</td>
                    <td className="px-4 py-2.5"><Pill color={STAGE_COLOR[b.stage]} label={STAGE_LABEL[b.stage]} /></td>
                    <td className="px-4 py-2.5">
                      <span className={days <= 7 ? 'text-red-600 font-semibold' : days <= 21 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{b.complianceCleared}/{b.complianceTotal}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {b.instruments.map((i, idx) => (
                          <Pill key={idx} color={INSTRUMENT_COLOR[i.status]} label={`${i.type} · ${INSTRUMENT_LABEL[i.status]}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{b.hoursLogged}h</td>
                    <td className="px-4 py-2.5 text-gray-600">{b.owner}</td>
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
