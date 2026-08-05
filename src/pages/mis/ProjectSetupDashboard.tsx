import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { ProjectSetup, ResourceStatus, KickoffStatus } from '../../data/mis/projectSetupMock';
import { PROJECTS, RESOURCE_STATUSES, KICKOFF_STATUSES, PROJECT_MANAGERS } from '../../data/mis/projectSetupMock';
import type { RiskSeverity } from '../../data/mis/bidIntelligenceMock';
import { RISK_SEVERITIES } from '../../data/mis/bidIntelligenceMock';
import { ALL_CLIENTS } from '../../data/mis/tenderPipelineMock';
import { PROJECT_TYPES } from '../../data/mis/estimationMock';
import { CAT, STATUS_COLOR, AXIS_TICK, GRID_STROKE, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, FilterSelect, Pill, FilterChips, BackLink } from '../../components/mis/MisCharts';

interface Filters {
  client?: string;
  projectType?: string;
  projectManager?: string;
  resourceStatus?: ResourceStatus;
}

function matches(p: ProjectSetup, f: Filters, exclude?: string): boolean {
  if (f.client && exclude !== 'client' && p.client !== f.client) return false;
  if (f.projectType && exclude !== 'projectType' && p.projectType !== f.projectType) return false;
  if (f.projectManager && exclude !== 'projectManager' && p.projectManager !== f.projectManager) return false;
  if (f.resourceStatus && exclude !== 'resourceStatus' && p.resourceStatus !== f.resourceStatus) return false;
  return true;
}

const RESOURCE_LABEL: Record<ResourceStatus, string> = { not_started: 'Not Started', partial: 'Partial', complete: 'Complete' };
const RESOURCE_COLOR: Record<ResourceStatus, string> = { not_started: STATUS_COLOR.critical, partial: STATUS_COLOR.warning, complete: STATUS_COLOR.good };

const KICKOFF_LABEL: Record<KickoffStatus, string> = { open: 'Open', overdue: 'Overdue', closed: 'Closed' };
const KICKOFF_COLOR: Record<KickoffStatus, string> = { open: CAT[0], overdue: STATUS_COLOR.critical, closed: STATUS_COLOR.good };

const SEVERITY_COLOR: Record<RiskSeverity, string> = {
  critical: STATUS_COLOR.critical, high: STATUS_COLOR.serious, medium: STATUS_COLOR.warning, low: STATUS_COLOR.good,
};
const SEVERITY_LABEL: Record<RiskSeverity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

function fmtCr(v: number): string {
  return `₹${v} Cr`;
}

export default function ProjectSetupDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredProjects = useMemo(() => PROJECTS.filter(p => matches(p, filters)), [filters]);

  const setupProgressData = useMemo(
    () => filteredProjects
      .map(p => ({ name: `${p.id} · ${p.client}`, done: p.setupItemsDone, pending: p.setupItemsTotal - p.setupItemsDone }))
      .sort((a, b) => (b.done + b.pending) - (a.done + a.pending)),
    [filteredProjects],
  );

  const budgetData = useMemo(
    () => filteredProjects
      .map(p => ({ name: `${p.id} · ${p.client}`, contract: p.contractValueCr, budget: p.budgetLoadedCr }))
      .sort((a, b) => b.contract - a.contract),
    [filteredProjects],
  );

  const resourceData = useMemo(() => {
    const list = PROJECTS.filter(p => matches(p, filters, 'resourceStatus'));
    const counts = countBy(list, p => p.resourceStatus);
    return RESOURCE_STATUSES.map(s => ({ key: s, name: RESOURCE_LABEL[s], value: counts.get(s) ?? 0, color: RESOURCE_COLOR[s] }));
  }, [filters]);

  const allKickoffItems = useMemo(
    () => filteredProjects.flatMap(p => p.kickoffItems.map(k => ({ ...k, projectId: p.id, client: p.client }))),
    [filteredProjects],
  );

  const kickoffData = useMemo(() => {
    const counts = countBy(allKickoffItems, k => k.status);
    return KICKOFF_STATUSES.map(s => ({ key: s, name: KICKOFF_LABEL[s], value: counts.get(s) ?? 0, color: KICKOFF_COLOR[s] }));
  }, [allKickoffItems]);

  const overdueKickoffItems = useMemo(() => allKickoffItems.filter(k => k.status === 'overdue'), [allKickoffItems]);
  const openKickoffCount = allKickoffItems.filter(k => k.status === 'open').length;

  const allRisks = useMemo(
    () => filteredProjects.flatMap(p => p.risks.map(r => ({ ...r, projectId: p.id, client: p.client }))),
    [filteredProjects],
  );

  const riskSeverityData = useMemo(() => {
    const counts = countBy(allRisks, r => r.severity);
    return RISK_SEVERITIES.map(s => ({ key: s, name: SEVERITY_LABEL[s], value: counts.get(s) ?? 0, color: SEVERITY_COLOR[s] }));
  }, [allRisks]);

  const criticalHighRisks = allRisks.filter(r => r.severity === 'critical' || r.severity === 'high').length;
  const criticalRisks = allRisks.filter(r => r.severity === 'critical').length;

  const setupTotals = filteredProjects.reduce(
    (acc, p) => ({ total: acc.total + p.setupItemsTotal, done: acc.done + p.setupItemsDone }),
    { total: 0, done: 0 },
  );
  const budgetTotals = filteredProjects.reduce(
    (acc, p) => ({ contract: acc.contract + p.contractValueCr, budget: acc.budget + p.budgetLoadedCr }),
    { contract: 0, budget: 0 },
  );
  const roleTotals = filteredProjects.reduce(
    (acc, p) => ({ required: acc.required + p.rolesRequired, assigned: acc.assigned + p.rolesAssigned }),
    { required: 0, assigned: 0 },
  );
  const fullyStaffedCount = filteredProjects.filter(p => p.resourceStatus === 'complete').length;

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => (key === 'resourceStatus' ? RESOURCE_LABEL[value as ResourceStatus] : value);

  return (
    <div className="p-6 space-y-4">
      <BackLink />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Project Setup Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Whether newly awarded projects are being set up quickly and completely, or setup delays are eating into execution time.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Client" value={filters.client} options={ALL_CLIENTS} onChange={v => toggle('client', v)} />
          <FilterSelect label="Project Type" value={filters.projectType} options={PROJECT_TYPES} onChange={v => toggle('projectType', v)} />
          <FilterSelect label="Project Manager" value={filters.projectManager} options={PROJECT_MANAGERS} onChange={v => toggle('projectManager', v)} />
          <FilterSelect label="Resource Status" value={filters.resourceStatus ? RESOURCE_LABEL[filters.resourceStatus] : undefined}
            options={RESOURCE_STATUSES.map(s => RESOURCE_LABEL[s])}
            onChange={v => toggle('resourceStatus', v ? (RESOURCE_STATUSES.find(s => RESOURCE_LABEL[s] === v) as ResourceStatus) : undefined)} />
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
        <StatTile label="Projects In Setup" value={String(filteredProjects.length)} sub="newly awarded" />
        <StatTile label="Setup Items Complete" value={`${setupTotals.done}/${setupTotals.total}`}
          sub={setupTotals.total ? `${Math.round((setupTotals.done / setupTotals.total) * 100)}% complete` : '—'} />
        <StatTile label="Budget Loaded" value={budgetTotals.contract ? `${Math.round((budgetTotals.budget / budgetTotals.contract) * 100)}%` : '—'}
          sub={`${fmtCr(budgetTotals.budget)} of ${fmtCr(budgetTotals.contract)}`} />
        <StatTile label="Resources Assigned" value={roleTotals.required ? `${Math.round((roleTotals.assigned / roleTotals.required) * 100)}%` : '—'}
          sub={`${fullyStaffedCount} of ${filteredProjects.length} fully staffed`} />
        <StatTile label="Kick-off Items Overdue" value={String(overdueKickoffItems.length)} sub={`${openKickoffCount} still open`} />
        <StatTile label="Critical / High Risks" value={String(criticalHighRisks)} sub={`${criticalRisks} critical`} />
      </div>

      {/* Setup progress per project */}
      <ChartCard title="Setup Progress by Project" subtitle="Checklist items completed vs pending">
        {setupProgressData.length === 0
          ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
          : (
            <ResponsiveContainer width="100%" height={Math.max(160, setupProgressData.length * 34)}>
              <BarChart data={setupProgressData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="done" name="Done" stackId="a" fill={STATUS_COLOR.good} radius={[4, 0, 0, 4]} />
                <Bar dataKey="pending" name="Pending" stackId="a" fill={STATUS_COLOR.warning} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      {/* Budget vs contract per project */}
      <ChartCard title="Budget Loaded vs Contract Value" subtitle="Per project, in ₹ Cr">
        {budgetData.length === 0
          ? <p className="text-sm text-gray-400 py-10 text-center">No projects match the current filters.</p>
          : (
            <ResponsiveContainer width="100%" height={Math.max(160, budgetData.length * 34)}>
              <BarChart data={budgetData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={2}>
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={140} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => fmtCr(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="contract" name="Contract Value" fill={CAT[1]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="budget" name="Budget Loaded" fill={CAT[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      {/* Resource + kickoff status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Resource Assignment Status" subtitle="Click a segment to filter">
          <Donut data={resourceData} activeKey={filters.resourceStatus} valueLabel="Projects" onSliceClick={k => toggle('resourceStatus', k as ResourceStatus)} />
        </ChartCard>
        <ChartCard title="Kick-off Action Items" subtitle="Across filtered projects">
          <Donut data={kickoffData} valueLabel="Items" />
        </ChartCard>
      </div>

      {/* Overdue kickoff + risk severity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Overdue Kick-off Items" subtitle="Needs immediate attention">
          <div className="space-y-1 max-h-[220px] overflow-y-auto">
            {overdueKickoffItems.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing overdue.</p>}
            {overdueKickoffItems.map((k, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{k.description}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{k.projectId} · {k.client}</p>
                </div>
                <Pill color={STATUS_COLOR.critical} label="Overdue" />
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Risk Register by Severity" subtitle="Across filtered projects">
          <Donut data={riskSeverityData} valueLabel="Risks" />
        </ChartCard>
      </div>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Projects in Setup</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredProjects.length} of {PROJECTS.length} newly awarded projects</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Project</th>
                <th className="text-left font-semibold px-4 py-2.5">Client</th>
                <th className="text-left font-semibold px-4 py-2.5">Contract Value</th>
                <th className="text-left font-semibold px-4 py-2.5">Budget Loaded</th>
                <th className="text-left font-semibold px-4 py-2.5">Setup Progress</th>
                <th className="text-left font-semibold px-4 py-2.5">Resources</th>
                <th className="text-left font-semibold px-4 py-2.5">Kick-off Items</th>
                <th className="text-left font-semibold px-4 py-2.5">Risks</th>
                <th className="text-left font-semibold px-4 py-2.5">PM</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-400 text-sm py-10">No projects match the current filters.</td></tr>
              )}
              {filteredProjects.map(p => {
                const overdue = p.kickoffItems.filter(k => k.status === 'overdue').length;
                const open = p.kickoffItems.filter(k => k.status === 'open').length;
                const closed = p.kickoffItems.filter(k => k.status === 'closed').length;
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-xs text-gray-500">{p.id}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{p.tenderId}</p>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{p.client}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtCr(p.contractValueCr)}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtCr(p.budgetLoadedCr)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.setupItemsDone}/{p.setupItemsTotal}</td>
                    <td className="px-4 py-2.5"><Pill color={RESOURCE_COLOR[p.resourceStatus]} label={RESOURCE_LABEL[p.resourceStatus]} /></td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {overdue > 0 && <span className="text-red-600 font-semibold">{overdue} overdue</span>}
                      {overdue > 0 && (open > 0 || closed > 0) && ' · '}
                      {open > 0 && <span className="text-amber-600">{open} open</span>}
                      {open > 0 && closed > 0 && ' · '}
                      {closed > 0 && <span className="text-gray-400">{closed} closed</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{p.risks.length}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.projectManager}</td>
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
