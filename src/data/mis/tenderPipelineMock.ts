// Mock dataset for the Tender Pipeline Dashboard (4.1). Values are in INR Crore
// for consistent portfolio-wide aggregation. Deterministic (no Math.random) so
// the dashboard reads the same numbers on every reload.

export type TenderStatus = 'identified' | 'evaluating' | 'bid_in_progress' | 'submitted' | 'result_pending';
export type PrequalStatus = 'pass' | 'fail' | 'pending';
export type GoNoGo = 'go' | 'no_go' | 'pending';

export interface MisTender {
  id: string;
  title: string;
  client: string;
  sector: string;
  region: string;
  status: TenderStatus;
  valueCr: number;
  identifiedDate: string;
  submissionDeadline: string;
  prequal: PrequalStatus;
  goNoGo: GoNoGo;
  declineReason?: string;
  decisionDate?: string;
  bdOwner: string;
}

export interface MisClosedTender {
  id: string;
  month: string; // YYYY-MM
  client: string;
  sector: string;
  outcome: 'won' | 'lost';
  valueCr: number;
  identifiedDate: string;
  decisionDate: string;
  bidToAwardDays: number;
}

export interface MisBdCapacity {
  name: string;
  hoursLogged: number;
  capacityHours: number;
}

export const STATUS_LABELS: Record<TenderStatus, string> = {
  identified: 'Identified',
  evaluating: 'Evaluating',
  bid_in_progress: 'Bid in Progress',
  submitted: 'Submitted',
  result_pending: 'Result Pending',
};

export const DECLINE_REASONS = [
  'Not aligned with core capability',
  'Margin too thin',
  'Client credit risk',
  'Resource constraint',
  'Unfavourable payment terms',
  'Technical scope mismatch',
  'JV partner unavailable',
] as const;

const CLIENTS = [
  'Reliance Industries', 'Indian Oil Corporation', 'ONGC', 'GAIL', 'Adani Group',
  'NTPC', 'Tata Projects', 'L&T Hydrocarbon', 'BPCL', 'HPCL', 'Vedanta',
  'JSW Energy', 'Aramco Overseas', 'SABIC',
];

const SECTORS = ['Oil & Gas', 'Petrochemical', 'Power', 'Fertiliser', 'Chemical', 'Refinery'];
const REGIONS = ['West India', 'North India', 'South India', 'East India', 'Middle East', 'South East Asia'];
const BD_OWNERS = ['Rohan Mehta', 'Priya Nair', 'Karan Shah', 'Ayesha Khan', 'Vikram Iyer'];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

// [seq, statusIdx, valueCr, identifiedDaysAgo, deadlineDaysFromNow, prequal, goNoGo, declineReasonIdx, decisionDaysAfterIdentified]
type Row = [number, number, number, number, number, PrequalStatus, GoNoGo, number | null, number | null];

const STATUSES: TenderStatus[] = ['identified', 'evaluating', 'bid_in_progress', 'submitted', 'result_pending'];

const ROWS: Row[] = [
  [1, 0, 42, 3, 38, 'pending', 'pending', null, null],
  [2, 0, 18, 5, 51, 'pending', 'pending', null, null],
  [3, 1, 65, 9, 22, 'pass', 'go', null, 6],
  [4, 1, 27, 12, 19, 'pass', 'go', null, 4],
  [5, 1, 90, 6, 45, 'pending', 'pending', null, null],
  [6, 1, 33, 14, 8, 'fail', 'no_go', 5, 9],
  [7, 2, 55, 21, 14, 'pass', 'go', null, 5],
  [8, 2, 120, 18, 27, 'pass', 'go', null, 7],
  [9, 2, 48, 25, 6, 'pass', 'go', null, 8],
  [10, 2, 22, 16, 33, 'pass', 'go', null, 3],
  [11, 2, 76, 30, 11, 'pass', 'go', null, 6],
  [12, 3, 34, 40, 3, 'pass', 'go', null, 6],
  [13, 3, 88, 35, 5, 'pass', 'go', null, 9],
  [14, 3, 15, 28, 2, 'pass', 'go', null, 4],
  [15, 4, 60, 52, -4, 'pass', 'go', null, 7],
  [16, 4, 145, 48, -9, 'pass', 'go', null, 11],
  [17, 4, 29, 44, -2, 'pass', 'go', null, 5],
  [18, 0, 51, 2, 60, 'pending', 'pending', null, null],
  [19, 0, 24, 4, 47, 'pending', 'pending', null, null],
  [20, 1, 39, 10, 24, 'pending', 'pending', null, null],
  [21, 1, 71, 15, 17, 'pass', 'go', null, 5],
  [22, 1, 12, 8, 55, 'fail', 'no_go', 0, 6],
  [23, 2, 95, 22, 13, 'pass', 'go', null, 8],
  [24, 2, 41, 19, 20, 'pass', 'go', null, 4],
  [25, 2, 63, 27, 9, 'pass', 'go', null, 10],
  [26, 3, 19, 33, 4, 'pass', 'go', null, 5],
  [27, 3, 108, 38, 7, 'pass', 'go', null, 9],
  [28, 4, 46, 55, -6, 'pass', 'go', null, 6],
  [29, 4, 82, 60, -12, 'pass', 'go', null, 8],
  [30, 0, 30, 1, 65, 'pending', 'pending', null, null],
  [31, 0, 17, 6, 42, 'pending', 'pending', null, null],
  [32, 0, 58, 7, 36, 'pending', 'pending', null, null],
  [33, 1, 26, 11, 29, 'fail', 'no_go', 1, 7],
  [34, 1, 44, 13, 21, 'pass', 'go', null, 5],
  [35, 1, 99, 17, 15, 'pending', 'pending', null, null],
  [36, 2, 37, 23, 12, 'pass', 'go', null, 6],
  [37, 2, 68, 29, 10, 'pass', 'go', null, 7],
  [38, 3, 21, 36, 6, 'pass', 'go', null, 4],
  [39, 3, 133, 42, 8, 'pass', 'go', null, 12],
  [40, 4, 25, 58, -8, 'pass', 'go', null, 5],
  [41, 0, 36, 2, 70, 'pending', 'pending', null, null],
  [42, 1, 53, 20, 18, 'fail', 'no_go', 3, 8],
  [43, 2, 31, 24, 16, 'pass', 'go', null, 5],
  [44, 0, 14, 5, 40, 'pending', 'pending', null, null],
  [45, 1, 47, 9, 26, 'fail', 'no_go', 6, 7],
];

function daysAgoIso(days: number): string {
  const d = new Date('2026-07-31T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function daysFromNowIso(days: number): string {
  return daysAgoIso(-days);
}

export const TENDERS: MisTender[] = ROWS.map(
  ([seq, statusIdx, valueCr, identifiedDaysAgo, deadlineDaysFromNow, prequal, goNoGo, declineIdx, decisionDaysAfter]) => {
    const identifiedDate = daysAgoIso(identifiedDaysAgo);
    const decisionDate = decisionDaysAfter != null ? daysAgoIso(identifiedDaysAgo - decisionDaysAfter) : undefined;
    return {
      id: `OE-TDR-${1200 + seq}`,
      title: `${pick(SECTORS, seq)} Package – ${pick(CLIENTS, seq)}`,
      client: pick(CLIENTS, seq),
      sector: pick(SECTORS, seq),
      region: pick(REGIONS, seq),
      status: STATUSES[statusIdx],
      valueCr,
      identifiedDate,
      submissionDeadline: daysFromNowIso(deadlineDaysFromNow),
      prequal,
      goNoGo,
      declineReason: declineIdx != null ? DECLINE_REASONS[declineIdx] : undefined,
      decisionDate,
      bdOwner: pick(BD_OWNERS, seq),
    };
  },
);

// [monthsAgo, client, sector, outcome, valueCr, identifiedDaysBeforeDecision, bidToAwardDays]
type ClosedRow = [number, string, string, 'won' | 'lost', number, number, number];

const CLOSED_ROWS: ClosedRow[] = [
  [0, 'Reliance Industries', 'Petrochemical', 'won', 62, 14, 21],
  [0, 'GAIL', 'Oil & Gas', 'lost', 38, 9, 18],
  [1, 'NTPC', 'Power', 'won', 91, 18, 26],
  [1, 'BPCL', 'Refinery', 'lost', 27, 7, 15],
  [2, 'Tata Projects', 'Fertiliser', 'won', 45, 11, 19],
  [2, 'Adani Group', 'Chemical', 'won', 73, 16, 24],
  [3, 'HPCL', 'Oil & Gas', 'lost', 34, 8, 17],
  [4, 'L&T Hydrocarbon', 'Petrochemical', 'won', 58, 13, 22],
  [5, 'Vedanta', 'Chemical', 'lost', 22, 6, 14],
  [6, 'Aramco Overseas', 'Refinery', 'won', 118, 20, 29],
  [7, 'SABIC', 'Petrochemical', 'lost', 41, 10, 20],
  [8, 'ONGC', 'Oil & Gas', 'won', 66, 15, 23],
  [9, 'JSW Energy', 'Power', 'won', 52, 12, 20],
  [10, 'Indian Oil Corporation', 'Oil & Gas', 'lost', 29, 7, 16],
  [11, 'GAIL', 'Fertiliser', 'won', 48, 11, 18],
];

function monthLabel(monthsAgo: number): string {
  const d = new Date('2026-07-31T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toISOString().slice(0, 7);
}

export const CLOSED_TENDERS: MisClosedTender[] = CLOSED_ROWS.map(
  ([monthsAgo, client, sector, outcome, valueCr, identifiedDaysBeforeDecision, bidToAwardDays], i) => {
    const month = monthLabel(monthsAgo);
    const decisionDate = `${month}-15`;
    const identified = new Date(`${decisionDate}T00:00:00Z`);
    identified.setUTCDate(identified.getUTCDate() - identifiedDaysBeforeDecision);
    return {
      id: `OE-TDR-CLOSED-${i + 1}`,
      month,
      client,
      sector,
      outcome,
      valueCr,
      identifiedDate: identified.toISOString().slice(0, 10),
      decisionDate,
      bidToAwardDays,
    };
  },
);

export const BD_CAPACITY: MisBdCapacity[] = [
  { name: 'Rohan Mehta', hoursLogged: 168, capacityHours: 180 },
  { name: 'Priya Nair', hoursLogged: 142, capacityHours: 180 },
  { name: 'Karan Shah', hoursLogged: 196, capacityHours: 180 },
  { name: 'Ayesha Khan', hoursLogged: 121, capacityHours: 180 },
  { name: 'Vikram Iyer', hoursLogged: 158, capacityHours: 180 },
];

export const ALL_CLIENTS = CLIENTS;
export const ALL_SECTORS = SECTORS;
export const ALL_REGIONS = REGIONS;
export const ALL_BD_OWNERS = BD_OWNERS;
