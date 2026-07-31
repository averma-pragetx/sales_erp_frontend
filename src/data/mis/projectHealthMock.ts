// Mock dataset for the Project Health Dashboard (4.2) — the cross-functional
// capstone. Joins PROJECTS with drawings, purchase orders, NCRs, and finance
// records from the other Post-Award dashboards by projectId, plus new
// construction-progress data, into one per-project health rollup.
// Deterministic (no Math.random) so the dashboard reads the same numbers on
// every reload.

import { PROJECTS } from './projectSetupMock';
import { DRAWINGS } from './engineeringMock';
import { PURCHASE_ORDERS } from './procurementMock';
import { NCRS } from './qualityMock';
import { PROJECT_FINANCE } from './financeMock';
import type { RiskLevel } from './financeMock';

export type Trend = 'improving' | 'stable' | 'declining';

export interface ConstructionProgress {
  projectId: string;
  site: string;
  physicalProgressPct: number;
  plannedProgressPct: number;
}

export interface ProjectHealth {
  projectId: string;
  client: string;
  site: string;
  completionPct: number;
  healthScore: number;
  riskLevel: RiskLevel;
  trend: Trend;
  scheduleDeltaPct: number;
  engDrawingsTotal: number;
  engDrawingsApproved: number;
  engDrawingsPending: number;
  poCount: number;
  poDeliveriesDue: number;
  poItemsAtRisk: number;
  openNcrs: number;
  forecastProfitPct: number | null;
  financeRisk: RiskLevel | null;
  criticalIssues: string[];
}

const SITES = [
  'Ahmedabad Fab Yard', 'Vadodara Works', 'Client Site — Jamnagar', 'Client Site — Hazira',
  'Dahej SEZ Yard', 'Client Site — Mundra', 'Ankleshwar Works', 'Client Site — Kandla',
];

function projectAt(idx: number) {
  return PROJECTS[idx % PROJECTS.length];
}

// [projectIdx, siteIdx, physicalProgressPct, plannedProgressPct, trendIdx(0=improving,1=stable,2=declining)]
type Row = [number, number, number, number, number];

const TREND_MAP: Trend[] = ['improving', 'stable', 'declining'];

const ROWS: Row[] = [
  [0, 0, 62, 58, 0],
  [1, 1, 40, 55, 2],
  [2, 2, 78, 75, 1],
  [3, 3, 35, 48, 2],
  [4, 4, 70, 66, 0],
  [5, 5, 55, 60, 2],
  [6, 6, 82, 80, 1],
  [7, 7, 28, 30, 1],
  [8, 0, 90, 85, 0],
  [9, 1, 48, 62, 2],
  [10, 2, 66, 64, 1],
  [11, 3, 20, 22, 1],
  [12, 4, 58, 68, 2],
  [13, 5, 74, 70, 0],
];

export const CONSTRUCTION_PROGRESS: ConstructionProgress[] = ROWS.map(([projectIdx, siteIdx, physicalProgressPct, plannedProgressPct]) => ({
  projectId: projectAt(projectIdx).id,
  site: SITES[siteIdx],
  physicalProgressPct,
  plannedProgressPct,
}));

const TREND_BY_PROJECT = new Map(ROWS.map(([projectIdx, , , , trendIdx]) => [projectAt(projectIdx).id, TREND_MAP[trendIdx]]));

function healthScoreOf(financeRisk: RiskLevel | null, openNcrCount: number, scheduleDeltaPct: number, highRiskPoCount: number): number {
  let score = 100;
  score -= financeRisk === 'high' ? 15 : financeRisk === 'medium' ? 7 : 0;
  score -= Math.min(20, openNcrCount * 4);
  score -= Math.min(25, Math.max(0, scheduleDeltaPct));
  score -= Math.min(15, highRiskPoCount * 5);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskFromScore(score: number): RiskLevel {
  return score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high';
}

export const PROJECT_HEALTH: ProjectHealth[] = PROJECTS.map(project => {
  const construction = CONSTRUCTION_PROGRESS.find(c => c.projectId === project.id);
  const drawings = DRAWINGS.filter(d => d.projectId === project.id);
  const pos = PURCHASE_ORDERS.filter(po => po.projectId === project.id);
  const ncrs = NCRS.filter(n => n.projectId === project.id);
  const finance = PROJECT_FINANCE.find(f => f.projectId === project.id) ?? null;

  const engDrawingsTotal = drawings.length;
  const engDrawingsApproved = drawings.filter(d => d.status === 'approved').length;
  const engDrawingsPending = drawings.filter(d => d.status === 'under_review').length;

  const poDeliveriesDue = pos.filter(po => po.status !== 'received').length;
  const poItemsAtRisk = pos.filter(po => po.deliveryRisk === 'high').length;

  const openNcrs = ncrs.filter(n => n.status !== 'closed').length;

  const scheduleDeltaPct = construction ? construction.plannedProgressPct - construction.physicalProgressPct : 0;
  const healthScore = healthScoreOf(finance?.riskLevel ?? null, openNcrs, scheduleDeltaPct, poItemsAtRisk);

  const criticalIssues: string[] = [];
  if (scheduleDeltaPct > 10) criticalIssues.push(`${scheduleDeltaPct}pp behind planned progress`);
  if (poItemsAtRisk > 0) criticalIssues.push(`${poItemsAtRisk} PO${poItemsAtRisk > 1 ? 's' : ''} at high delivery risk`);
  if (openNcrs >= 3) criticalIssues.push(`${openNcrs} open NCRs`);
  if (finance?.riskLevel === 'high') criticalIssues.push('High cost overrun risk');
  if (finance && finance.forecastProfitPct < 0) criticalIssues.push('Forecast loss-making at completion');

  return {
    projectId: project.id,
    client: project.client,
    site: construction?.site ?? '—',
    completionPct: construction?.physicalProgressPct ?? 0,
    healthScore,
    riskLevel: riskFromScore(healthScore),
    trend: TREND_BY_PROJECT.get(project.id) ?? 'stable',
    scheduleDeltaPct,
    engDrawingsTotal,
    engDrawingsApproved,
    engDrawingsPending,
    poCount: pos.length,
    poDeliveriesDue,
    poItemsAtRisk,
    openNcrs,
    forecastProfitPct: finance?.forecastProfitPct ?? null,
    financeRisk: finance?.riskLevel ?? null,
    criticalIssues,
  };
});
