import type { ClusterKey } from '../types';

export interface Stage {
  num: number;
  name: string;
  owner: string;
  cluster: ClusterKey;
  description: string;
}

export const STAGES: Stage[] = [
  { num: 1,  name: 'RFQ Received',                       owner: 'BD',               cluster: 'intake',     description: 'Inquiry metadata, attached RFQ documents, source.' },
  { num: 2,  name: 'Go / No-Go Review',                  owner: 'VP-Sales',         cluster: 'intake',     description: 'Review inquiry viability and decide to pursue or decline.' },
  { num: 3,  name: 'Document Check & Acknowledgment',    owner: 'Estimator',        cluster: 'estimation', description: 'Verify all RFQ documents received and acknowledge to client.' },
  { num: 4,  name: 'Tag List & Datasheet Extraction',    owner: 'Estimator',        cluster: 'estimation', description: 'Extract tag list and equipment datasheets from RFQ documents.' },
  { num: 5,  name: 'Tech Compliance Review',             owner: 'Estimator',        cluster: 'estimation', description: 'Review technical compliance of specifications against standards.' },
  { num: 6,  name: 'Technical Queries',                  owner: 'Estimator',        cluster: 'estimation', description: 'Raise and resolve technical queries with client/engineering.' },
  { num: 7,  name: 'Cost Estimate',                      owner: 'Estimator',        cluster: 'estimation', description: 'Prepare detailed cost estimate for the package.' },
  { num: 8,  name: 'Techno-Commercial Proposal',         owner: 'Sales',            cluster: 'proposal',   description: 'Compile techno-commercial proposal document for submission.' },
  { num: 9,  name: 'Internal Review & Sign-off',         owner: 'VP-Sales',         cluster: 'proposal',   description: 'Internal review and management sign-off before bid submission.' },
  { num: 10, name: 'Bid Submitted',                      owner: 'BD / Sales',       cluster: 'bid_active', description: 'Formal bid submitted to client on time.' },
  { num: 11, name: 'Post-bid · Clarifications',          owner: 'Sales',            cluster: 'bid_active', description: 'Respond to client queries following bid submission.' },
  { num: 12, name: 'Order Outcome',                      owner: 'Sales',            cluster: 'outcome',    description: 'Record order win / loss and outcome reasoning.' },
  { num: 13, name: 'Contract Review Meeting',            owner: 'Sales Head',       cluster: 'outcome',    description: 'Contract review meeting with client to finalise terms.' },
  { num: 14, name: 'Handover to Projects',               owner: 'Sales / Projects', cluster: 'outcome',    description: 'Formal handover of order to Projects team for execution.' },
];

export const CLUSTER_COLORS: Record<ClusterKey, string> = {
  intake:     '#334155',
  estimation: '#d97706',
  proposal:   '#3b82f6',
  bid_active: '#16a34a',
  outcome:    '#dc2626',
};

export const CLUSTER_OWNER_COLORS: Record<ClusterKey, string> = {
  intake:     '#334155',
  estimation: '#92400e',
  proposal:   '#1d4ed8',
  bid_active: '#15803d',
  outcome:    '#991b1b',
};
