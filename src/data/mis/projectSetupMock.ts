// Mock dataset for the Project Setup Dashboard (4.2). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { ALL_CLIENTS } from './tenderPipelineMock';
import { PROJECT_TYPES } from './estimationMock';
import type { RiskSeverity } from './bidIntelligenceMock';

export type ResourceStatus = 'not_started' | 'partial' | 'complete';
export type KickoffStatus = 'open' | 'overdue' | 'closed';

export interface KickoffItem {
  description: string;
  status: KickoffStatus;
}

export interface RiskRegisterItem {
  severity: RiskSeverity;
  category: string;
  description: string;
}

export interface ProjectSetup {
  id: string;
  tenderId: string;
  client: string;
  projectType: string;
  projectManager: string;
  contractValueCr: number;
  budgetLoadedCr: number;
  resourceStatus: ResourceStatus;
  rolesRequired: number;
  rolesAssigned: number;
  setupItemsTotal: number;
  setupItemsDone: number;
  setupStartedDaysAgo: number;
  kickoffItems: KickoffItem[];
  risks: RiskRegisterItem[];
}

export const RESOURCE_STATUSES: ResourceStatus[] = ['not_started', 'partial', 'complete'];
export const KICKOFF_STATUSES: KickoffStatus[] = ['open', 'overdue', 'closed'];
export const PROJECT_MANAGERS = ['Nikhil Rao', 'Divya Menon', 'Suresh Pillai', 'Anjali Deshmukh'];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

const KICKOFF_TEMPLATES = [
  'Kickoff meeting held with client',
  'Project execution plan (PEP) issued',
  'Baseline schedule uploaded to Business Central',
  'Cost code structure set up in Business Central',
  'Long-lead item POs identified',
  'QA/QC plan submitted',
  'HSE plan submitted and approved',
  'Site mobilisation plan approved',
];

const RISK_TEMPLATES: { severity: RiskSeverity; category: string; description: string }[] = [
  { severity: 'critical', category: 'Resourcing', description: 'Resource unavailability for critical-path activities in the first 60 days' },
  { severity: 'critical', category: 'Budget', description: 'Budget shortfall identified for civil scope versus contract value' },
  { severity: 'high', category: 'Procurement', description: 'Vendor lead time for long-lead items exceeds baseline schedule' },
  { severity: 'high', category: 'Access', description: 'Site access permit pending from client, blocking mobilisation' },
  { severity: 'medium', category: 'Engineering', description: 'Key engineering deliverable carried over from bid stage still pending' },
  { severity: 'medium', category: 'Commercial', description: 'Currency fluctuation risk on imported materials not yet hedged' },
  { severity: 'medium', category: 'Subcontracting', description: 'Subcontractor pre-qualification pending for specialised scope' },
  { severity: 'low', category: 'Safety', description: 'Site safety induction not yet completed for full core team' },
];

// [seq, contractValueCr, budgetLoadedCr, resourceStatusIdx, rolesRequired, rolesAssigned,
//  setupTotal, setupDone, setupStartedDaysAgo, pmIdx, kickoffRows, riskIdxs]
// kickoffRows: [templateIdx, statusIdx][]
type KickoffRow = [number, number];
type Row = [number, number, number, number, number, number, number, number, number, number, KickoffRow[], number[]];

const ROWS: Row[] = [
  [1, 62, 58, 2, 8, 8, 12, 10, 22, 0, [[0, 2], [1, 2], [2, 2], [3, 1]], [2, 5]],
  [2, 91, 80, 1, 10, 6, 14, 8, 15, 1, [[0, 2], [1, 0], [2, 1]], [0, 3, 6]],
  [3, 45, 45, 2, 6, 6, 10, 10, 30, 2, [[0, 2], [1, 2], [2, 2], [3, 2], [4, 1]], [7]],
  [4, 73, 60, 0, 9, 2, 13, 3, 6, 3, [[0, 1], [1, 0], [2, 0]], [0, 1, 3]],
  [5, 58, 55, 2, 7, 7, 11, 11, 25, 0, [[0, 2], [1, 2], [2, 2]], [5]],
  [6, 118, 100, 1, 12, 7, 16, 9, 18, 1, [[0, 2], [1, 1], [2, 0], [4, 0]], [1, 2, 4]],
  [7, 39, 39, 2, 6, 6, 9, 9, 28, 2, [[0, 2], [1, 2], [2, 2], [3, 2]], [7]],
  [8, 66, 50, 0, 8, 1, 12, 2, 4, 3, [[0, 1], [1, 0], [2, 0]], [0, 1, 2, 3]],
  [9, 32, 32, 2, 5, 5, 8, 8, 33, 0, [[0, 2], [1, 2], [2, 2]], [6]],
  [10, 85, 78, 1, 10, 8, 14, 11, 20, 1, [[0, 2], [1, 2], [2, 1], [5, 0]], [2, 4]],
  [11, 54, 50, 1, 7, 4, 11, 6, 11, 2, [[0, 1], [1, 0], [2, 0], [6, 1]], [1, 3, 6]],
  [12, 48, 48, 2, 6, 6, 10, 10, 26, 3, [[0, 2], [1, 2], [2, 2], [3, 1]], [5, 7]],
  [13, 76, 60, 0, 9, 3, 13, 4, 8, 0, [[0, 1], [1, 0], [2, 0], [4, 0]], [0, 2, 3, 4]],
  [14, 41, 41, 2, 6, 6, 9, 9, 31, 1, [[0, 2], [1, 2], [2, 2]], [7]],
];

export const PROJECTS: ProjectSetup[] = ROWS.map(
  ([seq, contractValueCr, budgetLoadedCr, resourceStatusIdx, rolesRequired, rolesAssigned,
    setupItemsTotal, setupItemsDone, setupStartedDaysAgo, pmIdx, kickoffRows, riskIdxs]) => ({
    id: `OE-PRJ-${6600 + seq}`,
    tenderId: `OE-TDR-${1200 + seq}`,
    client: pick(ALL_CLIENTS, seq),
    projectType: pick(PROJECT_TYPES, seq),
    projectManager: PROJECT_MANAGERS[pmIdx],
    contractValueCr,
    budgetLoadedCr,
    resourceStatus: RESOURCE_STATUSES[resourceStatusIdx],
    rolesRequired,
    rolesAssigned,
    setupItemsTotal,
    setupItemsDone,
    setupStartedDaysAgo,
    kickoffItems: kickoffRows.map(([templateIdx, statusIdx]) => ({
      description: KICKOFF_TEMPLATES[templateIdx],
      status: KICKOFF_STATUSES[statusIdx],
    })),
    risks: riskIdxs.map(idx => RISK_TEMPLATES[idx]),
  }),
);
