// Mock dataset for the Bid Preparation Dashboard (4.1). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { ALL_CLIENTS, ALL_BD_OWNERS } from './tenderPipelineMock';

export type BidStage = 'drafting' | 'review' | 'final' | 'submitted';
export type InstrumentType = 'EMD' | 'BG';
export type InstrumentStatus = 'active' | 'expiring' | 'released';

export interface FinancialInstrument {
  type: InstrumentType;
  amountCr: number;
  status: InstrumentStatus;
  expiryDate: string;
}

export interface Bid {
  id: string;
  tenderId: string;
  client: string;
  stage: BidStage;
  submissionDeadline: string;
  complianceTotal: number;
  complianceCleared: number;
  instruments: FinancialInstrument[];
  hoursLogged: number;
  owner: string;
}

export const BID_STAGES: BidStage[] = ['drafting', 'review', 'final', 'submitted'];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

function daysFromNowIso(days: number): string {
  const d = new Date('2026-07-31T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// [seq, stageIdx, deadlineDaysFromNow, complianceTotal, complianceCleared, hoursLogged, instrumentRows]
// instrumentRows: [typeIdx(0=EMD,1=BG), amountCr, statusIdx(0=active,1=expiring,2=released), expiryDaysFromNow][]
type InstRow = [number, number, number, number];
type Row = [number, number, number, number, number, number, InstRow[]];

const TYPE_MAP: InstrumentType[] = ['EMD', 'BG'];
const STATUS_MAP: InstrumentStatus[] = ['active', 'expiring', 'released'];

const ROWS: Row[] = [
  [1, 0, 24, 18, 6, 48, [[0, 1.2, 0, 40]]],
  [2, 0, 31, 14, 4, 36, [[0, 0.8, 0, 55]]],
  [3, 1, 12, 22, 16, 72, [[0, 2.1, 0, 20], [1, 3.5, 0, 95]]],
  [4, 1, 18, 16, 10, 58, [[0, 1.5, 1, 6]]],
  [5, 1, 9, 20, 14, 66, [[0, 1.9, 1, 4]]],
  [6, 2, 5, 24, 22, 88, [[0, 2.6, 0, 30], [1, 4.2, 0, 110]]],
  [7, 2, 3, 19, 19, 74, [[0, 1.4, 1, 3]]],
  [8, 2, 7, 21, 18, 80, [[0, 2.0, 0, 45]]],
  [9, 3, -4, 20, 20, 96, [[0, 1.8, 2, -2], [1, 3.0, 0, 150]]],
  [10, 3, -11, 17, 17, 84, [[0, 1.3, 2, -9]]],
  [11, 3, -18, 23, 23, 102, [[0, 2.4, 0, 60], [1, 3.8, 0, 130]]],
  [12, 0, 27, 12, 3, 30, [[0, 0.9, 0, 48]]],
  [13, 1, 15, 18, 11, 62, [[0, 1.6, 1, 5]]],
  [14, 2, 6, 22, 20, 90, [[0, 2.2, 0, 33], [1, 3.6, 1, 8]]],
  [15, 3, -7, 16, 16, 76, [[0, 1.1, 2, -3]]],
  [16, 0, 35, 13, 2, 26, [[0, 1.0, 0, 62]]],
];

export const BIDS: Bid[] = ROWS.map(
  ([seq, stageIdx, deadlineDaysFromNow, complianceTotal, complianceCleared, hoursLogged, instrumentRows]) => ({
    id: `OE-BID-${4400 + seq}`,
    tenderId: `OE-TDR-${1200 + seq}`,
    client: pick(ALL_CLIENTS, seq),
    stage: BID_STAGES[stageIdx],
    submissionDeadline: daysFromNowIso(deadlineDaysFromNow),
    complianceTotal,
    complianceCleared,
    hoursLogged,
    owner: pick(ALL_BD_OWNERS, seq),
    instruments: instrumentRows.map(([typeIdx, amountCr, statusIdx, expiryDaysFromNow]) => ({
      type: TYPE_MAP[typeIdx],
      amountCr,
      status: STATUS_MAP[statusIdx],
      expiryDate: daysFromNowIso(expiryDaysFromNow),
    })),
  }),
);
