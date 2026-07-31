// Mock dataset for the Finance Dashboard (4.2). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { PROJECTS } from './projectSetupMock';

export type RiskLevel = 'low' | 'medium' | 'high';
export type ComplianceStatus = 'compliant' | 'due_soon' | 'overdue';

export interface ProjectFinance {
  projectId: string;
  client: string;
  contractValueCr: number;
  budgetCr: number;
  actualCostCr: number;
  forecastCostCr: number;
  forecastProfitPct: number;
  riskLevel: RiskLevel;
  milestonesTotal: number;
  milestonesInvoiced: number;
  revenueRecognizedCr: number;
}

export interface Receivable {
  id: string;
  projectId: string;
  client: string;
  amountCr: number;
  ageDays: number;
}

export interface Payable {
  id: string;
  vendor: string;
  projectId: string;
  amountCr: number;
  dueDaysFromNow: number;
}

export interface CashFlowPoint {
  month: string;
  inflowCr: number;
  outflowCr: number;
}

export interface ComplianceItem {
  name: string;
  type: 'GST' | 'TDS' | 'TCS';
  status: ComplianceStatus;
  dueInDays: number;
}

export const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];

function projectAt(idx: number) {
  return PROJECTS[idx % PROJECTS.length];
}

// [projectIdx, actualCostCr, forecastCostCr, forecastProfitPct, riskIdx, milestonesTotal, milestonesInvoiced, revenueRecognizedCr]
type Row = [number, number, number, number, number, number, number, number];

const ROWS: Row[] = [
  [0, 40, 66, 12, 1, 6, 4, 38],
  [1, 68, 98, -4, 2, 8, 5, 55],
  [2, 22, 44, 15, 0, 5, 4, 40],
  [3, 55, 78, 4, 2, 7, 4, 48],
  [4, 30, 56, 10, 0, 6, 5, 50],
  [5, 82, 122, 6, 1, 9, 6, 72],
  [6, 18, 38, 8, 0, 5, 4, 32],
  [7, 26, 43, 9, 1, 5, 3, 24],
  [8, 34, 60, 13, 0, 6, 5, 44],
  [9, 45, 90, -7, 2, 8, 4, 52],
  [10, 20, 52, -1, 1, 6, 3, 30],
  [11, 28, 47, 11, 0, 5, 4, 34],
  [12, 38, 72, 3, 2, 7, 4, 42],
  [13, 15, 40, 9, 0, 5, 4, 26],
];

export const PROJECT_FINANCE: ProjectFinance[] = ROWS.map(
  ([projectIdx, actualCostCr, forecastCostCr, forecastProfitPct, riskIdx, milestonesTotal, milestonesInvoiced, revenueRecognizedCr]) => {
    const project = projectAt(projectIdx);
    return {
      projectId: project.id,
      client: project.client,
      contractValueCr: project.contractValueCr,
      budgetCr: project.budgetLoadedCr,
      actualCostCr,
      forecastCostCr,
      forecastProfitPct,
      riskLevel: RISK_LEVELS[riskIdx],
      milestonesTotal,
      milestonesInvoiced,
      revenueRecognizedCr,
    };
  },
);

// [seq, projectIdx, amountCr, ageDays]
type ReceivableRow = [number, number, number, number];

const RECEIVABLE_ROWS: ReceivableRow[] = [
  [1, 0, 8.5, 22], [2, 1, 14.2, 68], [3, 2, 6.0, 15], [4, 3, 11.4, 45],
  [5, 4, 5.8, 12], [6, 5, 18.6, 95], [7, 6, 4.2, 8], [8, 7, 6.6, 30],
  [9, 8, 9.0, 55], [10, 9, 12.8, 110], [11, 10, 4.8, 20], [12, 11, 5.5, 18],
  [13, 12, 8.2, 40], [14, 13, 3.9, 10],
];

export const RECEIVABLES: Receivable[] = RECEIVABLE_ROWS.map(([seq, projectIdx, amountCr, ageDays]) => {
  const project = projectAt(projectIdx);
  return { id: `OE-AR-${1400 + seq}`, projectId: project.id, client: project.client, amountCr, ageDays };
});

const VENDORS = ['Metalcraft Fabricators', 'Precision Alloys Ltd', 'Bharat Forge Components', 'SteelTech Industries', 'Apex Vessel Works', 'Global Flange Traders'];

// [seq, vendorIdx, projectIdx, amountCr, dueDaysFromNow]
type PayableRow = [number, number, number, number, number];

const PAYABLE_ROWS: PayableRow[] = [
  [1, 0, 0, 6.4, 5], [2, 1, 1, 9.8, 12], [3, 2, 2, 3.2, -3], [4, 3, 3, 7.5, 8],
  [5, 4, 4, 4.6, 20], [6, 5, 5, 5.9, -6], [7, 0, 6, 2.8, 15], [8, 1, 7, 6.1, 3],
  [9, 2, 8, 4.4, 25], [10, 3, 9, 8.7, -1], [11, 4, 10, 3.5, 10], [12, 5, 11, 5.2, 18],
];

export const PAYABLES: Payable[] = PAYABLE_ROWS.map(([seq, vendorIdx, projectIdx, amountCr, dueDaysFromNow]) => {
  const project = projectAt(projectIdx);
  return { id: `OE-AP-${1500 + seq}`, vendor: VENDORS[vendorIdx], projectId: project.id, amountCr, dueDaysFromNow };
});

function monthLabel(monthsFromNow: number): string {
  const d = new Date('2026-07-31T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + monthsFromNow);
  return d.toISOString().slice(0, 7).slice(2);
}

const CASH_FLOW_ROWS: [number, number][] = [
  [62, 58], [70, 64], [58, 66], [75, 60], [66, 70], [80, 72],
  [72, 68], [85, 74], [78, 76], [90, 80], [82, 78], [95, 84],
];

export const CASH_FLOW_FORECAST: CashFlowPoint[] = CASH_FLOW_ROWS.map(([inflowCr, outflowCr], i) => ({
  month: monthLabel(i + 1),
  inflowCr,
  outflowCr,
}));

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { name: 'GST Return — GSTR-3B', type: 'GST', status: 'compliant', dueInDays: 18 },
  { name: 'GST Return — GSTR-1', type: 'GST', status: 'due_soon', dueInDays: 5 },
  { name: 'TDS Deposit — Section 194C', type: 'TDS', status: 'compliant', dueInDays: 12 },
  { name: 'TDS Return — Form 26Q', type: 'TDS', status: 'overdue', dueInDays: -4 },
  { name: 'TCS Return — Form 27EQ', type: 'TCS', status: 'due_soon', dueInDays: 6 },
  { name: 'GST Annual Return — GSTR-9', type: 'GST', status: 'compliant', dueInDays: 45 },
];
