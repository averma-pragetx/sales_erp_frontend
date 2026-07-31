// Mock dataset for the Tender Results Dashboard (4.1). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { ALL_CLIENTS, ALL_SECTORS } from './tenderPipelineMock';
import { PROJECT_TYPES } from './estimationMock';

export type ResultOutcome = 'won' | 'lost';
export type LoiStatus = 'received' | 'pending' | 'not_required';

export interface ResultRecord {
  id: string;
  tenderId: string;
  client: string;
  sector: string;
  projectType: string;
  outcome: ResultOutcome;
  month: string; // decision month, YYYY-MM
  bidValueCr: number;
  contractValueCr?: number; // won only — final signed contract value
  estimatedValueCr?: number; // won only — internal cost-estimate baseline
  bidToAwardDays?: number; // won only
  loiStatus?: LoiStatus; // won only
  contractSigned?: boolean; // won only
  handoffItemsTotal?: number; // won only
  handoffItemsDone?: number; // won only
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

function monthLabel(monthsAgo: number): string {
  const d = new Date('2026-07-31T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toISOString().slice(0, 7);
}

// Won: [seq, monthsAgo, bidValueCr, contractValueCr, estimatedValueCr, bidToAwardDays, loiIdx(0=received,1=pending,2=n/a), signed, handoffTotal, handoffDone]
type WonRow = [number, number, number, number, number, number, number, boolean, number, number];

const LOI_MAP: LoiStatus[] = ['received', 'pending', 'not_required'];

const WON_ROWS: WonRow[] = [
  [1, 0, 64, 62, 58, 21, 1, false, 12, 3],
  [2, 0, 94, 91, 87, 26, 0, true, 14, 14],
  [3, 1, 47, 45, 46, 19, 0, true, 10, 9],
  [4, 1, 76, 73, 79, 24, 1, false, 13, 5],
  [5, 2, 60, 58, 54, 21, 0, true, 11, 11],
  [6, 3, 121, 118, 112, 29, 0, true, 16, 13],
  [7, 4, 40, 39, 41, 18, 2, true, 9, 9],
  [8, 5, 68, 66, 63, 22, 1, false, 12, 4],
  [9, 6, 33, 32, 30, 16, 0, true, 8, 8],
  [10, 7, 88, 85, 90, 25, 0, true, 15, 12],
  [11, 8, 56, 54, 55, 20, 2, true, 10, 10],
  [12, 9, 49, 48, 45, 19, 1, false, 9, 3],
];

// Lost: [seq, monthsAgo, bidValueCr]
type LostRow = [number, number, number];

const LOST_ROWS: LostRow[] = [
  [13, 0, 38],
  [14, 1, 27],
  [15, 2, 34],
  [16, 3, 22],
  [17, 5, 41],
  [18, 7, 29],
  [19, 9, 34],
  [20, 10, 45],
];

export const RESULTS: ResultRecord[] = [
  ...WON_ROWS.map(
    ([seq, monthsAgo, bidValueCr, contractValueCr, estimatedValueCr, bidToAwardDays, loiIdx, signed, handoffTotal, handoffDone]) => ({
      id: `OE-RES-${5500 + seq}`,
      tenderId: `OE-TDR-${1200 + seq}`,
      client: pick(ALL_CLIENTS, seq),
      sector: pick(ALL_SECTORS, seq),
      projectType: pick(PROJECT_TYPES, seq),
      outcome: 'won' as ResultOutcome,
      month: monthLabel(monthsAgo),
      bidValueCr,
      contractValueCr,
      estimatedValueCr,
      bidToAwardDays,
      loiStatus: LOI_MAP[loiIdx],
      contractSigned: signed,
      handoffItemsTotal: handoffTotal,
      handoffItemsDone: handoffDone,
    }),
  ),
  ...LOST_ROWS.map(([seq, monthsAgo, bidValueCr]) => ({
    id: `OE-RES-${5500 + seq}`,
    tenderId: `OE-TDR-${1200 + seq}`,
    client: pick(ALL_CLIENTS, seq),
    sector: pick(ALL_SECTORS, seq),
    projectType: pick(PROJECT_TYPES, seq),
    outcome: 'lost' as ResultOutcome,
    month: monthLabel(monthsAgo),
    bidValueCr,
  })),
];

export const VALUE_RANGES = ['<40 Cr', '40–70 Cr', '70–100 Cr', '100+ Cr'] as const;

export function valueRangeOf(v: number): string {
  if (v < 40) return VALUE_RANGES[0];
  if (v < 70) return VALUE_RANGES[1];
  if (v < 100) return VALUE_RANGES[2];
  return VALUE_RANGES[3];
}
