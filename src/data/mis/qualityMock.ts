// Mock dataset for the Quality Dashboard (4.2). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { PROJECTS } from './projectSetupMock';

export type NcrStatus = 'open' | 'under_investigation' | 'closed';
export type InspectionStatus = 'scheduled' | 'completed' | 'pending' | 'overdue';

export interface Ncr {
  id: string;
  projectId: string;
  client: string;
  vendor: string;
  category: string;
  rootCause: string;
  status: NcrStatus;
  raisedDaysAgo: number;
  closedDaysAgo?: number;
}

export interface Inspection {
  id: string;
  projectId: string;
  discipline: string;
  status: InspectionStatus;
  dueDaysFromNow: number;
}

export interface ProjectQuality {
  projectId: string;
  client: string;
  materialsTotal: number;
  materialsTraceable: number;
  itpPlanned: number;
  itpCompleted: number;
  certsReceived: number;
  certsVerified: number;
  certsOutstanding: number;
  finalDocsTotal: number;
  finalDocsComplete: number;
}

export const NCR_STATUSES: NcrStatus[] = ['open', 'under_investigation', 'closed'];
export const INSPECTION_STATUSES: InspectionStatus[] = ['scheduled', 'completed', 'pending', 'overdue'];
export const NCR_CATEGORIES = ['Welding', 'Dimensional', 'Material', 'Coating', 'Documentation', 'NDE'];
const VENDORS = ['Metalcraft Fabricators', 'Precision Alloys Ltd', 'Bharat Forge Components', 'SteelTech Industries', 'Apex Vessel Works', 'In-house'];
const ROOT_CAUSES: Record<string, string> = {
  Welding: 'Welder qualification lapsed / incorrect WPS followed',
  Dimensional: 'Fit-up tolerance exceeded drawing allowance',
  Material: 'Incorrect heat/batch traceability at receipt',
  Coating: 'DFT below specification in localised areas',
  Documentation: 'Missing or mismatched test certificate reference',
  NDE: 'Indication exceeds acceptance criteria per code',
};

function projectAt(idx: number) {
  return PROJECTS[idx % PROJECTS.length];
}

// [seq, projectIdx, categoryIdx, vendorIdx, statusIdx, raisedDaysAgo, closedDaysAgo]
type NcrRow = [number, number, number, number, number, number, number | null];

const NCR_ROWS: NcrRow[] = [
  [1, 0, 0, 0, 2, 40, 8],
  [2, 0, 4, 5, 0, 6, null],
  [3, 1, 1, 1, 2, 35, 12],
  [4, 1, 5, 5, 1, 15, null],
  [5, 2, 2, 2, 0, 4, null],
  [6, 2, 0, 5, 2, 50, 20],
  [7, 3, 3, 3, 1, 18, null],
  [8, 3, 0, 0, 2, 45, 10],
  [9, 4, 4, 5, 0, 3, null],
  [10, 4, 1, 4, 2, 38, 9],
  [11, 5, 2, 1, 1, 12, null],
  [12, 5, 0, 5, 0, 5, null],
  [13, 6, 5, 2, 2, 55, 15],
  [14, 6, 3, 3, 0, 7, null],
  [15, 7, 0, 0, 2, 42, 11],
  [16, 7, 4, 5, 1, 20, null],
  [17, 2, 0, 5, 2, 48, 14],
  [18, 4, 0, 2, 0, 9, null],
];

export const NCRS: Ncr[] = NCR_ROWS.map(([seq, projectIdx, categoryIdx, vendorIdx, statusIdx, raisedDaysAgo, closedDaysAgo]) => {
  const project = projectAt(projectIdx);
  const category = NCR_CATEGORIES[categoryIdx];
  return {
    id: `OE-NCR-${1200 + seq}`,
    projectId: project.id,
    client: project.client,
    vendor: VENDORS[vendorIdx],
    category,
    rootCause: ROOT_CAUSES[category],
    status: NCR_STATUSES[statusIdx],
    raisedDaysAgo,
    closedDaysAgo: closedDaysAgo ?? undefined,
  };
});

const DISCIPLINES = ['Mechanical', 'Piping', 'Civil', 'Electrical', 'Welding', 'NDE'];

// [seq, projectIdx, disciplineIdx, statusIdx, dueDaysFromNow]
type InspRow = [number, number, number, number, number];

const INSP_ROWS: InspRow[] = [
  [1, 0, 0, 1, -2],
  [2, 0, 4, 3, -6],
  [3, 1, 1, 0, 5],
  [4, 1, 5, 2, -1],
  [5, 2, 2, 1, -3],
  [6, 2, 0, 0, 8],
  [7, 3, 3, 2, -4],
  [8, 3, 4, 1, -5],
  [9, 4, 1, 0, 3],
  [10, 4, 5, 3, -9],
  [11, 5, 2, 1, -2],
  [12, 5, 0, 0, 6],
  [13, 6, 4, 2, -7],
  [14, 6, 3, 1, -1],
  [15, 7, 1, 0, 4],
  [16, 7, 5, 3, -8],
];

export const INSPECTIONS: Inspection[] = INSP_ROWS.map(([seq, projectIdx, disciplineIdx, statusIdx, dueDaysFromNow]) => {
  const project = projectAt(projectIdx);
  return {
    id: `OE-INSP-${1300 + seq}`,
    projectId: project.id,
    discipline: DISCIPLINES[disciplineIdx],
    status: INSPECTION_STATUSES[statusIdx],
    dueDaysFromNow,
  };
});

// [projectIdx, materialsTotal, materialsTraceable, itpPlanned, itpCompleted,
//  certsReceived, certsVerified, certsOutstanding, finalDocsTotal, finalDocsComplete]
type QualityRow = [number, number, number, number, number, number, number, number, number, number];

const QUALITY_ROWS: QualityRow[] = [
  [0, 120, 112, 24, 18, 40, 34, 6, 30, 22],
  [1, 95, 80, 18, 10, 32, 24, 8, 24, 12],
  [2, 60, 60, 12, 12, 20, 20, 0, 16, 16],
  [3, 88, 70, 16, 8, 28, 18, 10, 22, 10],
  [4, 54, 54, 10, 10, 18, 18, 0, 14, 14],
  [5, 130, 118, 26, 21, 44, 38, 6, 32, 24],
  [6, 76, 60, 14, 7, 26, 16, 10, 20, 9],
  [7, 48, 48, 9, 9, 16, 16, 0, 12, 12],
];

export const PROJECT_QUALITY: ProjectQuality[] = QUALITY_ROWS.map(
  ([projectIdx, materialsTotal, materialsTraceable, itpPlanned, itpCompleted, certsReceived, certsVerified, certsOutstanding, finalDocsTotal, finalDocsComplete]) => {
    const project = projectAt(projectIdx);
    return {
      projectId: project.id,
      client: project.client,
      materialsTotal,
      materialsTraceable,
      itpPlanned,
      itpCompleted,
      certsReceived,
      certsVerified,
      certsOutstanding,
      finalDocsTotal,
      finalDocsComplete,
    };
  },
);
