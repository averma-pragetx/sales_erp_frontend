export type Priority = 'P1' | 'P2' | 'P3';
export type Currency = 'USD' | 'INR';

export interface Inquiry {
  id: string;
  client: string;
  project: string;
  scope: string;
  value: number;
  currency: Currency;
  valueUnit: 'Mn' | 'Cr';
  daysToBid: number;
  currentStage: number;
  currentStageName: string;
  priority: Priority;
  cluster: ClusterKey;
}

export type ClusterKey = 'intake' | 'estimation' | 'proposal' | 'bid_active' | 'outcome';

export interface Cluster {
  key: ClusterKey;
  label: string;
  stages: number[];
  stageLabel: string;
  color: string;
  borderColor: string;
  badgeBg: string;
}
