// Mock dataset for the Engineering Dashboard (4.2). Deterministic (no
// Math.random) so the dashboard reads the same numbers on every reload.

import { PROJECTS } from './projectSetupMock';

export type DrawingStatus = 'issued' | 'under_review' | 'approved' | 'rejected';
export type EcnImpact = 'high' | 'medium' | 'low';

export interface Drawing {
  id: string;
  projectId: string;
  client: string;
  discipline: string;
  title: string;
  status: DrawingStatus;
  revision: number;
  issuedDaysAgo: number;
  dueDaysFromNow: number;
  approvalCycleDays?: number;
  pendingApprovalDaysAgo?: number;
}

export interface EngineeringChangeNotice {
  id: string;
  projectId: string;
  client: string;
  description: string;
  impact: EcnImpact;
  affectedDrawings: number;
  issuedDaysAgo: number;
}

export const DRAWING_STATUSES: DrawingStatus[] = ['issued', 'under_review', 'approved', 'rejected'];
export const DISCIPLINES = ['Mechanical', 'Piping', 'Civil', 'Electrical', 'Instrumentation', 'Process'];

function projectAt(idx: number) {
  return PROJECTS[idx % PROJECTS.length];
}

const TITLE_TEMPLATES = [
  'General Arrangement Drawing',
  'Fabrication Drawing',
  'P&ID',
  'Foundation Layout',
  'Cable Routing Layout',
  'Nozzle Orientation Drawing',
  'Datasheet',
  'Isometric Drawing',
];

// [seq, projectIdx, disciplineIdx, statusIdx, revision, issuedDaysAgo, dueDaysFromNow, cycleOrPendingDays]
type Row = [number, number, number, number, number, number, number, number];

const ROWS: Row[] = [
  [1, 0, 0, 2, 3, 30, -5, 12],
  [2, 0, 1, 1, 2, 12, 4, 14],
  [3, 0, 2, 2, 1, 40, -12, 8],
  [4, 1, 0, 3, 4, 20, -8, 0],
  [5, 1, 3, 1, 3, 18, 2, 21],
  [6, 1, 4, 2, 2, 25, -3, 6],
  [7, 2, 1, 0, 1, 4, 10, 0],
  [8, 2, 2, 2, 2, 35, -10, 9],
  [9, 2, 5, 1, 1, 9, 6, 9],
  [10, 3, 0, 1, 5, 22, 1, 26],
  [11, 3, 1, 2, 3, 45, -15, 11],
  [12, 3, 3, 3, 2, 15, -5, 0],
  [13, 4, 2, 2, 1, 28, -6, 7],
  [14, 4, 4, 1, 2, 14, 3, 16],
  [15, 4, 0, 0, 1, 2, 14, 0],
  [16, 5, 5, 2, 2, 32, -9, 10],
  [17, 5, 1, 1, 4, 20, 0, 19],
  [18, 5, 2, 2, 1, 38, -14, 6],
  [19, 6, 3, 1, 2, 16, 5, 12],
  [20, 6, 0, 2, 3, 26, -7, 8],
  [21, 7, 4, 0, 1, 5, 9, 0],
  [22, 7, 1, 2, 2, 30, -4, 13],
];

export const DRAWINGS: Drawing[] = ROWS.map(
  ([seq, projectIdx, disciplineIdx, statusIdx, revision, issuedDaysAgo, dueDaysFromNow, cycleOrPendingDays]) => {
    const project = projectAt(projectIdx);
    const status = DRAWING_STATUSES[statusIdx];
    return {
      id: `OE-DWG-${7700 + seq}`,
      projectId: project.id,
      client: project.client,
      discipline: DISCIPLINES[disciplineIdx],
      title: `${TITLE_TEMPLATES[seq % TITLE_TEMPLATES.length]} — ${DISCIPLINES[disciplineIdx]}`,
      status,
      revision,
      issuedDaysAgo,
      dueDaysFromNow,
      approvalCycleDays: status === 'approved' ? cycleOrPendingDays : undefined,
      pendingApprovalDaysAgo: status === 'under_review' ? cycleOrPendingDays : undefined,
    };
  },
);

// [seq, projectIdx, descIdx, impactIdx, affectedDrawings, issuedDaysAgo]
type EcnRow = [number, number, number, number, number, number];

const ECN_DESCRIPTIONS = [
  'Client-requested change in shell material of construction',
  'Revised nozzle orientation per updated piping layout',
  'Design pressure upgraded following process re-simulation',
  'Foundation loading revised after equipment weight change',
  'Cable tray routing changed to avoid civil interference',
  'Additional manway added per client review comments',
  'Insulation specification updated for hydrogen service',
  'Support spacing revised after vibration analysis',
];

const ECN_ROWS: EcnRow[] = [
  [1, 0, 0, 0, 4, 8],
  [2, 1, 1, 1, 2, 15],
  [3, 2, 2, 0, 6, 5],
  [4, 3, 3, 1, 3, 20],
  [5, 4, 4, 2, 1, 12],
  [6, 5, 5, 1, 2, 18],
  [7, 6, 6, 2, 1, 22],
  [8, 7, 7, 0, 5, 6],
];

const IMPACT_MAP: EcnImpact[] = ['high', 'medium', 'low'];

export const ECNS: EngineeringChangeNotice[] = ECN_ROWS.map(([seq, projectIdx, descIdx, impactIdx, affectedDrawings, issuedDaysAgo]) => {
  const project = projectAt(projectIdx);
  return {
    id: `OE-ECN-${8800 + seq}`,
    projectId: project.id,
    client: project.client,
    description: ECN_DESCRIPTIONS[descIdx],
    impact: IMPACT_MAP[impactIdx],
    affectedDrawings,
    issuedDaysAgo,
  };
});
