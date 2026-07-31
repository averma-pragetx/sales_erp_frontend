// Mock dataset for the Vendor Intelligence Dashboard (4.2). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { VENDORS } from './procurementMock';

export interface VendorScorecard {
  vendor: string;
  category: string;
  performanceScore: number;
  deliveryReliabilityPct: number;
  qualityScore: number;
  costScore: number;
  ordersCompleted: number;
}

export interface ReliabilityPoint {
  month: string;
  reliabilityPct: number;
}

export const VENDOR_CATEGORIES = ['Fabrication', 'Raw Material', 'Instrumentation', 'Electrical', 'Logistics'];

const EXTRA_VENDORS = ['Coastal Logistics Pvt Ltd', 'Precision Instruments Co'];
const ALL_VENDOR_NAMES = [...VENDORS, ...EXTRA_VENDORS];

// [vendorIdx, categoryIdx, performanceScore, deliveryReliabilityPct, qualityScore, costScore, ordersCompleted]
type Row = [number, number, number, number, number, number, number];

const ROWS: Row[] = [
  [0, 0, 88, 92, 90, 78, 24],
  [1, 1, 81, 85, 88, 72, 18],
  [2, 0, 74, 70, 80, 85, 15],
  [3, 0, 91, 94, 92, 80, 30],
  [4, 0, 69, 62, 75, 90, 12],
  [5, 1, 77, 80, 82, 76, 20],
  [6, 2, 84, 88, 86, 74, 16],
  [7, 3, 79, 82, 84, 79, 22],
  [8, 4, 66, 58, 70, 88, 10],
  [9, 2, 86, 90, 89, 71, 14],
];

export const VENDOR_SCORECARDS: VendorScorecard[] = ROWS.map(
  ([vendorIdx, categoryIdx, performanceScore, deliveryReliabilityPct, qualityScore, costScore, ordersCompleted]) => ({
    vendor: ALL_VENDOR_NAMES[vendorIdx],
    category: VENDOR_CATEGORIES[categoryIdx],
    performanceScore,
    deliveryReliabilityPct,
    qualityScore,
    costScore,
    ordersCompleted,
  }),
);

// Portfolio-wide average on-time delivery reliability, last 12 months.
const RELIABILITY_TREND_PCT = [74, 76, 75, 78, 80, 79, 82, 81, 84, 83, 85, 86];

function monthLabel(monthsAgo: number): string {
  const d = new Date('2026-07-31T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toISOString().slice(0, 7).slice(2);
}

export const RELIABILITY_TREND: ReliabilityPoint[] = RELIABILITY_TREND_PCT
  .map((reliabilityPct, i) => ({ month: monthLabel(11 - i), reliabilityPct }));
