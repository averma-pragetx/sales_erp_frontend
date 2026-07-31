// Mock dataset for the Inventory & Material Dashboard (4.2). Deterministic
// (no Math.random) so the dashboard reads the same numbers on every reload.

import { PROJECTS } from './projectSetupMock';

export type QualityResult = 'pass' | 'fail' | 'pending';

export interface StockItem {
  id: string;
  projectId: string;
  client: string;
  itemCategory: string;
  warehouse: string;
  unit: string;
  mtoQuantity: number;
  receivedQuantity: number;
  issuedQuantity: number;
  consumedQuantity: number;
  pendingReceiptQty: number;
  expectedDeliveryDaysFromNow?: number;
  qualityInspection: QualityResult;
  lastMovementDaysAgo: number;
}

export const ITEM_CATEGORIES = [
  'Plates & Sheets', 'Pipes & Fittings', 'Fasteners', 'Gaskets & Seals',
  'Welding Consumables', 'Structural Steel', 'Instrumentation Items', 'Electrical Cables',
];
export const WAREHOUSES = ['Ahmedabad Main Store', 'Vadodara Yard', 'Site Store'];
const UNITS = ['MT', 'Mtr', 'Nos', 'Nos', 'Kg', 'MT', 'Nos', 'Mtr'];

function projectAt(idx: number) {
  return PROJECTS[idx % PROJECTS.length];
}

// [seq, projectIdx, categoryIdx, warehouseIdx, mtoQty, receivedQty, issuedQty, consumedQty,
//  pendingReceiptQty, expectedDeliveryDaysFromNow, qualityIdx(0=pass,1=fail,2=pending), lastMovementDaysAgo]
type Row = [number, number, number, number, number, number, number, number, number, number, number, number];

const QUALITY_MAP: QualityResult[] = ['pass', 'fail', 'pending'];

const ROWS: Row[] = [
  [1, 0, 0, 0, 40, 40, 32, 28, 0, 0, 0, 12],
  [2, 0, 1, 2, 800, 620, 500, 470, 180, 9, 0, 6],
  [3, 0, 2, 0, 5000, 5000, 3800, 3600, 0, 0, 0, 20],
  [4, 1, 3, 1, 1200, 900, 700, 640, 300, 14, 1, 8],
  [5, 1, 4, 2, 2500, 2100, 1900, 1850, 400, 5, 0, 4],
  [6, 1, 5, 0, 60, 45, 30, 25, 15, 18, 0, 15],
  [7, 2, 6, 2, 150, 150, 90, 70, 0, 0, 2, 55],
  [8, 2, 7, 1, 3000, 2400, 2000, 1950, 600, 11, 0, 7],
  [9, 2, 0, 0, 35, 35, 35, 34, 0, 0, 0, 62],
  [10, 3, 1, 2, 950, 700, 500, 460, 250, 20, 0, 5],
  [11, 3, 2, 0, 4200, 4200, 4200, 4100, 0, 0, 0, 10],
  [12, 3, 3, 1, 1100, 780, 600, 540, 320, 7, 1, 9],
  [13, 4, 4, 2, 1800, 1800, 1600, 1590, 0, 0, 0, 3],
  [14, 4, 5, 0, 45, 30, 20, 15, 15, 25, 2, 48],
  [15, 4, 6, 1, 120, 100, 60, 50, 20, 12, 0, 6],
  [16, 5, 7, 2, 2600, 2600, 2100, 2080, 0, 0, 0, 58],
  [17, 5, 0, 0, 38, 28, 20, 18, 10, 16, 0, 11],
  [18, 5, 1, 1, 700, 700, 700, 690, 0, 0, 1, 4],
  [19, 6, 2, 2, 3900, 3200, 2800, 2700, 700, 8, 0, 6],
  [20, 6, 3, 0, 900, 900, 750, 720, 0, 0, 0, 65],
  [21, 7, 5, 1, 55, 40, 25, 20, 15, 22, 0, 9],
  [22, 7, 6, 2, 200, 160, 110, 100, 40, 13, 0, 5],
  [23, 7, 7, 0, 2900, 2900, 2500, 2450, 0, 0, 0, 50],
  [24, 6, 4, 1, 2200, 1750, 1600, 1590, 450, 10, 0, 4],
];

export const STOCK_ITEMS: StockItem[] = ROWS.map(
  ([seq, projectIdx, categoryIdx, warehouseIdx, mtoQuantity, receivedQuantity, issuedQuantity, consumedQuantity,
    pendingReceiptQty, expectedDeliveryDaysFromNow, qualityIdx, lastMovementDaysAgo]) => {
    const project = projectAt(projectIdx);
    return {
      id: `OE-INV-${1100 + seq}`,
      projectId: project.id,
      client: project.client,
      itemCategory: ITEM_CATEGORIES[categoryIdx],
      warehouse: WAREHOUSES[warehouseIdx],
      unit: UNITS[categoryIdx],
      mtoQuantity,
      receivedQuantity,
      issuedQuantity,
      consumedQuantity,
      pendingReceiptQty,
      expectedDeliveryDaysFromNow: pendingReceiptQty > 0 ? expectedDeliveryDaysFromNow : undefined,
      qualityInspection: QUALITY_MAP[qualityIdx],
      lastMovementDaysAgo,
    };
  },
);
