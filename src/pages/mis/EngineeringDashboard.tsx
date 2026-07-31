import { useMemo, useState } from 'react';
import type { Drawing, DrawingStatus, EcnImpact } from '../../data/mis/engineeringMock';
import { DRAWINGS, ECNS, DRAWING_STATUSES, DISCIPLINES } from '../../data/mis/engineeringMock';
import { CAT, STATUS_COLOR, countBy } from '../../components/mis/misUtils';
import { StatTile, ChartCard, Donut, HBar, FilterSelect, Pill, FilterChips } from '../../components/mis/MisCharts';

interface Filters {
  projectId?: string;
  discipline?: string;
  status?: DrawingStatus;
}

function matches(d: Drawing, f: Filters, exclude?: string): boolean {
  if (f.projectId && exclude !== 'projectId' && d.projectId !== f.projectId) return false;
  if (f.discipline && exclude !== 'discipline' && d.discipline !== f.discipline) return false;
  if (f.status && exclude !== 'status' && d.status !== f.status) return false;
  return true;
}

const STATUS_LABEL: Record<DrawingStatus, string> = { issued: 'Issued', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected' };
const STATUS_COLOR_MAP: Record<DrawingStatus, string> = { issued: CAT[0], under_review: CAT[1], approved: STATUS_COLOR.good, rejected: STATUS_COLOR.critical };

const IMPACT_COLOR: Record<EcnImpact, string> = { high: STATUS_COLOR.critical, medium: STATUS_COLOR.warning, low: STATUS_COLOR.good };
const IMPACT_LABEL: Record<EcnImpact, string> = { high: 'High', medium: 'Medium', low: 'Low' };

const PROJECT_OPTIONS = [...new Map(DRAWINGS.map(d => [d.projectId, `${d.projectId} · ${d.client}`])).entries()];

export default function EngineeringDashboard() {
  const [filters, setFilters] = useState<Filters>({});

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  const filteredDrawings = useMemo(() => DRAWINGS.filter(d => matches(d, filters)), [filters]);

  const statusData = useMemo(() => {
    const list = DRAWINGS.filter(d => matches(d, filters, 'status'));
    const counts = countBy(list, d => d.status);
    return DRAWING_STATUSES.map(s => ({ key: s, name: STATUS_LABEL[s], value: counts.get(s) ?? 0, color: STATUS_COLOR_MAP[s] }));
  }, [filters]);

  const completionByProject = useMemo(() => {
    const list = DRAWINGS.filter(d => matches(d, filters, 'projectId'));
    const projectIds = [...new Set(list.map(d => d.projectId))];
    return projectIds
      .map(pid => {
        const inProject = list.filter(d => d.projectId === pid);
        const approved = inProject.filter(d => d.status === 'approved').length;
        const label = PROJECT_OPTIONS.find(([id]) => id === pid)?.[1] ?? pid;
        return { name: label, value: Math.round((approved / inProject.length) * 100) };
      })
      .sort((a, b) => a.value - b.value);
  }, [filters]);

  const revisionByDiscipline = useMemo(() => {
    const list = DRAWINGS.filter(d => matches(d, filters, 'discipline'));
    return DISCIPLINES
      .map(disc => {
        const inDisc = list.filter(d => d.discipline === disc);
        if (!inDisc.length) return { name: disc, value: 0 };
        return { name: disc, value: Math.round((inDisc.reduce((s, d) => s + d.revision, 0) / inDisc.length) * 10) / 10 };
      })
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filters]);

  const cycleByDiscipline = useMemo(() => {
    const list = DRAWINGS.filter(d => matches(d, filters, 'discipline') && d.status === 'approved');
    return DISCIPLINES
      .map(disc => {
        const inDisc = list.filter(d => d.discipline === disc);
        if (!inDisc.length) return { name: disc, value: 0 };
        return { name: disc, value: Math.round(inDisc.reduce((s, d) => s + (d.approvalCycleDays ?? 0), 0) / inDisc.length) };
      })
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filters]);

  const pendingApprovals = useMemo(
    () => filteredDrawings
      .filter(d => d.status === 'under_review' && d.pendingApprovalDaysAgo != null)
      .sort((a, b) => (b.pendingApprovalDaysAgo ?? 0) - (a.pendingApprovalDaysAgo ?? 0)),
    [filteredDrawings],
  );

  const activeWork = filteredDrawings.filter(d => d.status === 'issued' || d.status === 'under_review');
  const overdueCount = activeWork.filter(d => d.dueDaysFromNow < 0).length;
  const dueBuckets = useMemo(() => {
    const overdue = activeWork.filter(d => d.dueDaysFromNow < 0).length;
    const thisWeek = activeWork.filter(d => d.dueDaysFromNow >= 0 && d.dueDaysFromNow <= 7).length;
    const thisMonth = activeWork.filter(d => d.dueDaysFromNow > 7 && d.dueDaysFromNow <= 30).length;
    const later = activeWork.filter(d => d.dueDaysFromNow > 30).length;
    return [
      { key: 'overdue', name: 'Overdue', value: overdue, color: STATUS_COLOR.critical },
      { key: 'week', name: 'Due This Week', value: thisWeek, color: STATUS_COLOR.warning },
      { key: 'month', name: 'Due This Month', value: thisMonth, color: CAT[0] },
      { key: 'later', name: 'Due Later', value: later, color: '#898781' },
    ];
  }, [activeWork]);

  const approvedDrawings = filteredDrawings.filter(d => d.status === 'approved');
  const avgCycle = approvedDrawings.length
    ? Math.round(approvedDrawings.reduce((s, d) => s + (d.approvalCycleDays ?? 0), 0) / approvedDrawings.length)
    : null;
  const completionPct = filteredDrawings.length ? Math.round((approvedDrawings.length / filteredDrawings.length) * 100) : 0;
  const avgPendingDays = pendingApprovals.length
    ? Math.round(pendingApprovals.reduce((s, d) => s + (d.pendingApprovalDaysAgo ?? 0), 0) / pendingApprovals.length)
    : null;

  const filteredEcns = useMemo(
    () => (filters.projectId ? ECNS.filter(e => e.projectId === filters.projectId) : ECNS),
    [filters.projectId],
  );
  const highImpactEcns = filteredEcns.filter(e => e.impact === 'high').length;

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const filterLabel = (key: string, value: string) => {
    if (key === 'status') return STATUS_LABEL[value as DrawingStatus];
    if (key === 'projectId') return PROJECT_OPTIONS.find(([id]) => id === value)?.[1] ?? value;
    return value;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">Engineering Dashboard</h1>
            <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gray-100 text-gray-500">Sample data</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Which projects have engineering bottlenecks, and where client approval delays are holding up procurement.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Project" value={filters.projectId} options={PROJECT_OPTIONS.map(([id]) => id)}
            onChange={v => toggle('projectId', v)} />
          <FilterSelect label="Discipline" value={filters.discipline} options={DISCIPLINES} onChange={v => toggle('discipline', v)} />
          <FilterSelect label="Status" value={filters.status ? STATUS_LABEL[filters.status] : undefined} options={DRAWING_STATUSES.map(s => STATUS_LABEL[s])}
            onChange={v => toggle('status', v ? (DRAWING_STATUSES.find(s => STATUS_LABEL[s] === v) as DrawingStatus) : undefined)} />
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
        <StatTile label="Drawings Tracked" value={String(filteredDrawings.length)} sub="across all disciplines" />
        <StatTile label="Engineering Completion" value={`${completionPct}%`} sub={`${approvedDrawings.length} approved`} />
        <StatTile label="Avg. Approval Cycle" value={avgCycle !== null ? `${avgCycle}d` : '—'} sub="approved drawings" />
        <StatTile label="Pending Client Approval" value={String(pendingApprovals.length)} sub={avgPendingDays !== null ? `avg ${avgPendingDays}d pending` : '—'} />
        <StatTile label="Overdue Deliverables" value={String(overdueCount)} sub="issued or under review" />
        <StatTile label="ECNs Issued" value={String(filteredEcns.length)} sub={`${highImpactEcns} high impact`} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Drawing Status" subtitle="Click a segment to filter">
          <Donut data={statusData} activeKey={filters.status} valueLabel="Drawings" onSliceClick={k => toggle('status', k as DrawingStatus)} />
        </ChartCard>
        <ChartCard title="Engineering Completion by Project" subtitle="% of drawings approved">
          {completionByProject.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No drawings match the current filters.</p>
            : <HBar data={completionByProject} valueFormatter={v => `${v}%`} height={Math.max(150, completionByProject.length * 34)} />}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Revision Frequency by Discipline" subtitle="Avg. revision count">
          {revisionByDiscipline.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No drawings match the current filters.</p>
            : <HBar data={revisionByDiscipline} height={Math.max(150, revisionByDiscipline.length * 34)} />}
        </ChartCard>
        <ChartCard title="Avg. Approval Cycle by Discipline" subtitle="Approved drawings only">
          {cycleByDiscipline.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No approved drawings in this view.</p>
            : <HBar data={cycleByDiscipline} valueFormatter={v => `${v}d`} height={Math.max(150, cycleByDiscipline.length * 34)} />}
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Pending Client Approvals — Bottlenecks" subtitle="Held longest first">
          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {pendingApprovals.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing pending client approval.</p>}
            {pendingApprovals.map(d => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-dotted border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{d.title}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{d.id} · {d.projectId}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${(d.pendingApprovalDaysAgo ?? 0) > 14 ? 'text-red-600' : 'text-amber-600'}`}>
                  {d.pendingApprovalDaysAgo}d
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Deliverables Due" subtitle="Issued or under-review drawings, by due date">
          <Donut data={dueBuckets} valueLabel="Drawings" />
        </ChartCard>
      </div>

      {/* ECN list */}
      <ChartCard title="Engineering Change Notifications" subtitle="Issued changes and their downstream impact">
        <div className="space-y-1.5">
          {filteredEcns.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No ECNs in this view.</p>}
          {filteredEcns.map(e => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2 border-b border-dotted border-gray-100 last:border-0">
              <div className="min-w-0">
                <p className="text-[13px] text-gray-800">{e.description}</p>
                <p className="text-[11px] text-gray-400 font-mono">{e.id} · {e.projectId} · {e.client}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-500">{e.affectedDrawings} drawings affected</span>
                <Pill color={IMPACT_COLOR[e.impact]} label={`${IMPACT_LABEL[e.impact]} impact`} />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Drill-down table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">Drawings</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">{filteredDrawings.length} of {DRAWINGS.length} tracked drawings</p>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2.5">Drawing</th>
                <th className="text-left font-semibold px-4 py-2.5">Project</th>
                <th className="text-left font-semibold px-4 py-2.5">Discipline</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                <th className="text-left font-semibold px-4 py-2.5">Rev.</th>
                <th className="text-left font-semibold px-4 py-2.5">Due</th>
                <th className="text-left font-semibold px-4 py-2.5">Cycle / Pending</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrawings.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 text-sm py-10">No drawings match the current filters.</td></tr>
              )}
              {filteredDrawings.map(d => (
                <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <p className="text-gray-800">{d.title}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{d.id}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-500">{d.projectId}</p>
                    <p className="text-gray-600">{d.client}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{d.discipline}</td>
                  <td className="px-4 py-2.5"><Pill color={STATUS_COLOR_MAP[d.status]} label={STATUS_LABEL[d.status]} /></td>
                  <td className="px-4 py-2.5 text-gray-600">Rev {d.revision}</td>
                  <td className="px-4 py-2.5">
                    <span className={d.dueDaysFromNow < 0 ? 'text-red-600 font-semibold' : d.dueDaysFromNow <= 7 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
                      {d.dueDaysFromNow < 0 ? `${Math.abs(d.dueDaysFromNow)}d overdue` : `${d.dueDaysFromNow}d`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {d.approvalCycleDays != null ? `${d.approvalCycleDays}d cycle` : d.pendingApprovalDaysAgo != null ? `${d.pendingApprovalDaysAgo}d pending` : '—'}
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
