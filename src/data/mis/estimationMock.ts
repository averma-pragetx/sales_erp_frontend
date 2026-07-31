// Mock dataset for the Estimation Dashboard (4.1). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { ALL_CLIENTS } from './tenderPipelineMock';

export type EstimateStage = 'draft' | 'review' | 'finalised';
export type VendorQuoteStatus = 'requested' | 'received' | 'overdue';

export interface VendorQuote {
  vendor: string;
  package: string;
  status: VendorQuoteStatus;
  requestedDaysAgo: number;
}

export interface Estimate {
  id: string;
  tenderId: string;
  client: string;
  projectType: string;
  stage: EstimateStage;
  estimatedValueCr: number;
  benchmarkValueCr: number;
  estimator: string;
  startedDaysAgo: number;
  turnaroundDays: number;
  vendorQuotes: VendorQuote[];
}

export interface AccuracyRecord {
  id: string;
  month: string; // YYYY-MM
  projectType: string;
  estimatedValueCr: number;
  actualCostCr: number;
}

export const ESTIMATE_STAGES: EstimateStage[] = ['draft', 'review', 'finalised'];
export const PROJECT_TYPES = ['Shell & Tube HX', 'Air-Cooled HX', 'Pressure Vessel', 'Reactor', 'Column/Tower', 'Heat Recovery Unit'];
export const ESTIMATORS = ['Meera Joshi', 'Rahul Desai', 'Aditya Kapoor', 'Simran Bhatt'];
const VENDORS = ['Metalcraft Fabricators', 'Precision Alloys Ltd', 'Bharat Forge Components', 'SteelTech Industries', 'Apex Vessel Works'];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

// [seq, stageIdx, estimatedValueCr, benchmarkValueCr, estimatorIdx, startedDaysAgo, turnaroundDays, quoteRows]
// quoteRows: [vendorIdx, statusIdx(0=requested,1=received,2=overdue), requestedDaysAgo][]
type QuoteRow = [number, number, number];
type Row = [number, number, number, number, number, number, number, QuoteRow[]];

const ROWS: Row[] = [
  [1, 2, 58, 54, 0, 32, 11, [[0, 1, 14], [1, 1, 12]]],
  [2, 2, 34, 38, 1, 28, 9, [[2, 1, 10]]],
  [3, 1, 91, 85, 2, 14, 8, [[0, 1, 13], [3, 0, 6]]],
  [4, 0, 27, 30, 3, 4, 3, [[4, 0, 4]]],
  [5, 2, 63, 60, 0, 40, 14, [[1, 1, 18], [2, 1, 16], [3, 1, 15]]],
  [6, 1, 45, 41, 1, 12, 7, [[0, 2, 22]]],
  [7, 2, 112, 118, 2, 45, 16, [[3, 1, 20], [4, 1, 19]]],
  [8, 0, 22, 24, 3, 3, 2, [[1, 0, 3]]],
  [9, 2, 76, 70, 0, 35, 13, [[0, 1, 17], [2, 1, 15]]],
  [10, 1, 39, 44, 1, 10, 6, [[4, 2, 24]]],
  [11, 0, 55, 52, 2, 6, 4, [[3, 0, 5], [0, 0, 4]]],
  [12, 2, 48, 46, 3, 30, 10, [[1, 1, 16]]],
  [13, 1, 84, 79, 0, 16, 9, [[2, 0, 8], [4, 1, 14]]],
  [14, 2, 30, 33, 1, 26, 8, [[0, 1, 11]]],
  [15, 0, 66, 61, 2, 5, 3, [[3, 2, 21]]],
  [16, 1, 41, 38, 3, 9, 5, [[1, 0, 7], [2, 0, 6]]],
];

const STATUS_MAP: VendorQuoteStatus[] = ['requested', 'received', 'overdue'];

export const ESTIMATES: Estimate[] = ROWS.map(
  ([seq, stageIdx, estimatedValueCr, benchmarkValueCr, estimatorIdx, startedDaysAgo, turnaroundDays, quoteRows]) => ({
    id: `OE-EST-${3300 + seq}`,
    tenderId: `OE-TDR-${1200 + seq}`,
    client: pick(ALL_CLIENTS, seq),
    projectType: pick(PROJECT_TYPES, seq),
    stage: ESTIMATE_STAGES[stageIdx],
    estimatedValueCr,
    benchmarkValueCr,
    estimator: ESTIMATORS[estimatorIdx],
    startedDaysAgo,
    turnaroundDays,
    vendorQuotes: quoteRows.map(([vendorIdx, statusIdx, requestedDaysAgo]) => ({
      vendor: VENDORS[vendorIdx],
      package: pick(PROJECT_TYPES, vendorIdx + seq),
      status: STATUS_MAP[statusIdx],
      requestedDaysAgo,
    })),
  }),
);

// [monthsAgo, projectType, estimatedValueCr, actualCostCr]
type AccRow = [number, string, number, number];

const ACC_ROWS: AccRow[] = [
  [0, 'Shell & Tube HX', 58, 61],
  [0, 'Pressure Vessel', 90, 87],
  [1, 'Reactor', 112, 121],
  [1, 'Air-Cooled HX', 34, 33],
  [2, 'Column/Tower', 76, 79],
  [2, 'Shell & Tube HX', 48, 46],
  [3, 'Pressure Vessel', 84, 90],
  [4, 'Heat Recovery Unit', 55, 54],
  [5, 'Reactor', 66, 72],
  [6, 'Shell & Tube HX', 41, 40],
  [7, 'Air-Cooled HX', 39, 43],
  [8, 'Column/Tower', 63, 66],
  [9, 'Pressure Vessel', 30, 29],
  [10, 'Reactor', 45, 49],
];

function monthLabel(monthsAgo: number): string {
  const d = new Date('2026-07-31T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toISOString().slice(0, 7);
}

export const ACCURACY_RECORDS: AccuracyRecord[] = ACC_ROWS.map(
  ([monthsAgo, projectType, estimatedValueCr, actualCostCr], i) => ({
    id: `OE-ACC-${i + 1}`,
    month: monthLabel(monthsAgo),
    projectType,
    estimatedValueCr,
    actualCostCr,
  }),
);
