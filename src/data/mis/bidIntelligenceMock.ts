// Mock dataset for the Bid Intelligence Dashboard (4.1). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { ALL_CLIENTS, ALL_SECTORS } from './tenderPipelineMock';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ItemStatus = 'open' | 'mitigated' | 'accepted';
export type ContradictionStatus = 'open' | 'resolved';
export type ClarificationStatus = 'pending' | 'responded';

export interface RiskItem {
  severity: RiskSeverity;
  category: string;
  description: string;
  status: ItemStatus;
}

export interface ContradictionItem {
  description: string;
  status: ContradictionStatus;
}

export interface ClarificationItem {
  question: string;
  raisedDaysAgo: number;
  status: ClarificationStatus;
  respondedAfterDays?: number;
}

export interface DocStatusCounts {
  processed: number;
  processing: number;
  pending: number;
  failed: number;
}

export interface BidIntelTender {
  id: string;
  client: string;
  sector: string;
  documentsTotal: number;
  docStatus: DocStatusCounts;
  risks: RiskItem[];
  contradictions: ContradictionItem[];
  clarifications: ClarificationItem[];
  effortHours: number;
  analyst: string;
}

export const RISK_SEVERITIES: RiskSeverity[] = ['critical', 'high', 'medium', 'low'];
export const ANALYSTS = ['Neha Kulkarni', 'Arjun Rao', 'Sanya Verma', 'Farhan Sheikh'];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

const RISK_TEMPLATES: { severity: RiskSeverity; category: string; description: string }[] = [
  { severity: 'critical', category: 'Commercial', description: 'Liquidated damages cap exceeds internal risk appetite (>10% of contract value)' },
  { severity: 'critical', category: 'Compliance', description: 'Mandatory IBR certification not confirmed achievable within bid timeline' },
  { severity: 'high', category: 'Technical', description: 'Design pressure/temperature envelope inconsistent with process datasheet' },
  { severity: 'high', category: 'Contractual', description: 'Unlimited warranty period requested, no cap on defect liability' },
  { severity: 'high', category: 'Schedule', description: 'Delivery schedule assumes vendor lead times 20% shorter than market average' },
  { severity: 'medium', category: 'Logistics', description: 'Site access constraints for oversized shell not addressed in RFQ' },
  { severity: 'medium', category: 'Commercial', description: 'Price escalation clause silent on base currency for imported alloys' },
  { severity: 'medium', category: 'Compliance', description: 'Third-party inspection agency not specified, cost impact unclear' },
  { severity: 'low', category: 'Technical', description: 'Minor discrepancy in nozzle orientation between GA drawing and P&ID' },
  { severity: 'low', category: 'Contractual', description: 'Retention percentage marginally above standard terms' },
];

const CONTRADICTION_TEMPLATES = [
  'Payment milestone schedule in commercial section conflicts with Annexure C payment terms',
  'Delivery timeline in BOQ does not match the technical specification schedule',
  'Scope of supply excludes civil work in Section 2 but includes it in Annexure B',
  'Material of construction differs between datasheet and line list for the same tag',
  'Inspection & test plan references a standard not listed in the applicable codes section',
  'Bank guarantee validity period differs between the tender notice and draft contract',
];

const CLARIFICATION_TEMPLATES = [
  'Clarify applicable base currency for the price escalation clause',
  'Confirm scope of civil and structural work exclusions',
  'Request extension of pre-qualification document submission deadline',
  'Clarify liquidated damages cap — per week vs cumulative',
  'Confirm inspection agency and cost allocation for third-party inspection',
  'Request soil investigation report referenced in civil scope',
  'Clarify whether spares are within base scope or a separate line item',
  'Confirm applicability of IBR certification for this package',
];

// [seq, docsTotal, processed, processing, pending, failed, riskIdxs, contradictionIdxs, clarRows, effortHours]
// clarRows: [templateIdx, raisedDaysAgo, status('p'|'r'), respondedAfterDays?][]
type ClarRow = [number, number, 'p' | 'r', number?];
type Row = [number, number, number, number, number, number, number[], number[], ClarRow[], number];

const ROWS: Row[] = [
  [1, 18, 16, 1, 1, 0, [0, 2, 6], [0], [[0, 12, 'r', 4], [3, 5, 'p']], 62],
  [2, 12, 12, 0, 0, 0, [3, 8], [], [[1, 3, 'p']], 34],
  [3, 22, 14, 3, 4, 1, [1, 4, 7], [1, 2], [[2, 20, 'r', 6], [5, 9, 'p']], 78],
  [4, 15, 15, 0, 0, 0, [9], [], [], 21],
  [5, 26, 19, 4, 2, 1, [0, 1, 5, 6], [0, 3], [[3, 15, 'r', 5], [6, 8, 'p'], [0, 4, 'p']], 94],
  [6, 10, 10, 0, 0, 0, [8], [], [[1, 2, 'p']], 18],
  [7, 19, 13, 2, 3, 1, [2, 4, 8], [4], [[4, 11, 'r', 3]], 55],
  [8, 14, 14, 0, 0, 0, [7], [], [], 27],
  [9, 24, 17, 3, 3, 1, [1, 3, 6, 9], [2, 5], [[7, 18, 'r', 7], [2, 6, 'p']], 88],
  [10, 11, 11, 0, 0, 0, [], [], [], 16],
  [11, 21, 15, 2, 3, 1, [0, 5, 7], [1], [[5, 9, 'p'], [1, 14, 'r', 4]], 71],
  [12, 13, 13, 0, 0, 0, [9, 8], [], [[6, 4, 'p']], 24],
  [13, 28, 20, 4, 3, 1, [0, 2, 3, 4, 6], [0, 4, 5], [[0, 22, 'r', 9], [3, 13, 'p'], [4, 7, 'p']], 103],
  [14, 16, 16, 0, 0, 0, [4], [], [[2, 3, 'p']], 30],
];

export const BID_INTEL_TENDERS: BidIntelTender[] = ROWS.map(
  ([seq, documentsTotal, processed, processing, pending, failed, riskIdxs, contraIdxs, clarRows, effortHours]) => ({
    id: `OE-TDR-${1200 + seq}`,
    client: pick(ALL_CLIENTS, seq),
    sector: pick(ALL_SECTORS, seq),
    documentsTotal,
    docStatus: { processed, processing, pending, failed },
    risks: riskIdxs.map((idx, j) => ({
      ...RISK_TEMPLATES[idx],
      status: (j % 3 === 2 ? 'accepted' : j % 3 === 1 ? 'mitigated' : 'open') as ItemStatus,
    })),
    contradictions: contraIdxs.map((idx, j) => ({
      description: CONTRADICTION_TEMPLATES[idx],
      status: (j % 2 === 0 ? 'open' : 'resolved') as ContradictionStatus,
    })),
    clarifications: clarRows.map(([tplIdx, raisedDaysAgo, status, respondedAfterDays]) => ({
      question: CLARIFICATION_TEMPLATES[tplIdx],
      raisedDaysAgo,
      status: status === 'r' ? 'responded' as const : 'pending' as const,
      respondedAfterDays,
    })),
    effortHours,
    analyst: pick(ANALYSTS, seq),
  }),
);
