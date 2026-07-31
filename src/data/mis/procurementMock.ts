// Mock dataset for the Procurement Dashboard (4.2). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { PROJECTS } from './projectSetupMock';

export type PoStatus = 'draft' | 'issued' | 'acknowledged' | 'in_transit' | 'received' | 'overdue';
export type RfqStatus = 'issued' | 'responses_received' | 'under_evaluation' | 'awarded';
export type DeliveryRisk = 'low' | 'medium' | 'high';

export interface PurchaseOrder {
  id: string;
  projectId: string;
  client: string;
  package: string;
  vendor: string;
  status: PoStatus;
  valueCr: number;
  orderedDaysAgo: number;
  expectedDeliveryDaysFromNow: number;
  deliveryRisk: DeliveryRisk;
  critical: boolean;
}

export interface VendorQuote {
  vendor: string;
  amountCr: number;
  deliveryWeeks: number;
}

export interface Rfq {
  id: string;
  projectId: string;
  package: string;
  status: RfqStatus;
  vendorsInvited: number;
  issuedDaysAgo: number;
  quotes: VendorQuote[];
}

export interface ProcurementBudget {
  projectId: string;
  client: string;
  budgetCr: number;
}

export const PO_STATUSES: PoStatus[] = ['draft', 'issued', 'acknowledged', 'in_transit', 'received', 'overdue'];
export const RFQ_STATUSES: RfqStatus[] = ['issued', 'responses_received', 'under_evaluation', 'awarded'];
export const PACKAGES = [
  'Shell Plates', 'Tube Bundle Materials', 'Forgings', 'Flanges & Fittings',
  'Instrumentation', 'Electrical Cables', 'Structural Steel', 'Insulation Materials',
];

export const VENDORS = [
  'Metalcraft Fabricators', 'Precision Alloys Ltd', 'Bharat Forge Components', 'SteelTech Industries',
  'Apex Vessel Works', 'Global Flange Traders', 'Instrutech Systems', 'National Cable Corp',
];

function projectAt(idx: number) {
  return PROJECTS[idx % PROJECTS.length];
}

// [seq, projectIdx, packageIdx, vendorIdx, statusIdx, valueCr, orderedDaysAgo, expectedDeliveryDaysFromNow, riskIdx, critical]
type Row = [number, number, number, number, number, number, number, number, number, boolean];

const RISK_MAP: DeliveryRisk[] = ['low', 'medium', 'high'];

const ROWS: Row[] = [
  [1, 0, 0, 0, 4, 8.2, 45, -3, 0, false],
  [2, 0, 1, 1, 3, 6.5, 30, 6, 1, false],
  [3, 0, 2, 2, 2, 4.1, 18, 20, 0, false],
  [4, 1, 3, 3, 5, 2.8, 50, -8, 2, true],
  [5, 1, 4, 4, 1, 1.5, 10, 25, 0, false],
  [6, 1, 5, 5, 4, 3.2, 40, -2, 1, false],
  [7, 2, 0, 6, 3, 7.6, 28, 9, 1, false],
  [8, 2, 6, 7, 2, 5.4, 15, 22, 0, false],
  [9, 2, 2, 0, 5, 4.9, 48, -6, 2, true],
  [10, 3, 1, 1, 4, 9.1, 35, -1, 1, false],
  [11, 3, 7, 2, 0, 1.2, 3, 40, 0, false],
  [12, 3, 3, 3, 3, 3.6, 26, 8, 1, false],
  [13, 4, 4, 4, 2, 2.4, 20, 18, 0, false],
  [14, 4, 5, 5, 5, 6.8, 55, -10, 2, true],
  [15, 4, 6, 6, 1, 1.8, 12, 24, 0, false],
  [16, 5, 0, 7, 4, 8.5, 32, 4, 1, false],
  [17, 5, 1, 0, 2, 5.9, 17, 21, 0, false],
  [18, 6, 2, 1, 3, 4.4, 24, 11, 1, false],
  [19, 6, 7, 2, 5, 2.1, 42, -5, 2, true],
  [20, 7, 3, 3, 1, 3.9, 8, 27, 0, false],
];

export const PURCHASE_ORDERS: PurchaseOrder[] = ROWS.map(
  ([seq, projectIdx, packageIdx, vendorIdx, statusIdx, valueCr, orderedDaysAgo, expectedDeliveryDaysFromNow, riskIdx, critical]) => {
    const project = projectAt(projectIdx);
    return {
      id: `OE-PO-${9900 + seq}`,
      projectId: project.id,
      client: project.client,
      package: PACKAGES[packageIdx],
      vendor: VENDORS[vendorIdx],
      status: PO_STATUSES[statusIdx],
      valueCr,
      orderedDaysAgo,
      expectedDeliveryDaysFromNow,
      deliveryRisk: RISK_MAP[riskIdx],
      critical,
    };
  },
);

// [seq, projectIdx, packageIdx, statusIdx, vendorsInvited, issuedDaysAgo, quoteRows]
// quoteRows: [vendorIdx, amountCr, deliveryWeeks][]
type QuoteRow = [number, number, number];
type RfqRow = [number, number, number, number, number, number, QuoteRow[]];

const RFQ_ROWS: RfqRow[] = [
  [1, 0, 0, 3, 4, 20, [[0, 8.0, 6], [1, 8.6, 5], [2, 8.9, 7]]],
  [2, 1, 3, 2, 3, 12, [[3, 2.9, 4], [4, 3.1, 5]]],
  [3, 2, 6, 3, 5, 25, [[5, 5.2, 8], [6, 5.6, 6], [7, 5.9, 9], [0, 6.1, 7]]],
  [4, 3, 1, 1, 4, 8, [[1, 9.0, 6]]],
  [5, 4, 4, 3, 3, 18, [[2, 2.3, 4], [3, 2.5, 5]]],
  [6, 5, 7, 0, 4, 3, []],
  [7, 6, 2, 2, 4, 14, [[4, 4.5, 6], [5, 4.8, 7]]],
  [8, 7, 5, 3, 3, 22, [[6, 2.0, 3], [7, 2.2, 4]]],
  [9, 0, 7, 1, 5, 6, [[0, 3.0, 5]]],
  [10, 2, 3, 2, 4, 16, [[1, 3.7, 6], [2, 3.9, 5]]],
];

export const RFQS: Rfq[] = RFQ_ROWS.map(([seq, projectIdx, packageIdx, statusIdx, vendorsInvited, issuedDaysAgo, quoteRows]) => {
  const project = projectAt(projectIdx);
  return {
    id: `OE-RFQ-${1010 + seq}`,
    projectId: project.id,
    package: PACKAGES[packageIdx],
    status: RFQ_STATUSES[statusIdx],
    vendorsInvited,
    issuedDaysAgo,
    quotes: quoteRows.map(([vendorIdx, amountCr, deliveryWeeks]) => ({ vendor: VENDORS[vendorIdx], amountCr, deliveryWeeks })),
  };
});

export const PROCUREMENT_BUDGETS: ProcurementBudget[] = PROJECTS.map(p => ({
  projectId: p.id,
  client: p.client,
  budgetCr: Math.round(p.budgetLoadedCr * 0.55),
}));
