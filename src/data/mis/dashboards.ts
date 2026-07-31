export type MisSection = 'pre-award' | 'post-award';

export interface MisDashboardMeta {
  id: string;
  title: string;
  section: MisSection;
  path: string;
  purpose: string;
  primaryUsers: string[];
  ready: boolean;
}

export const MIS_SECTION_LABELS: Record<MisSection, string> = {
  'pre-award': 'Pre-Award Dashboards (Bid Intelligence Suite)',
  'post-award': 'Post-Award Dashboards (AI Automation Platform)',
};

export const MIS_DASHBOARDS: MisDashboardMeta[] = [
  {
    id: 'tender-pipeline',
    title: 'Tender Pipeline Dashboard',
    section: 'pre-award',
    path: '/mis/tender-pipeline',
    purpose: 'Live, filterable pipeline view of every tracked tender, its value, deadlines, and Go/No-Go status.',
    primaryUsers: ['Managing Director', 'BD Head', 'Bid Team Lead'],
    ready: true,
  },
  {
    id: 'bid-intelligence',
    title: 'Bid Intelligence Dashboard',
    section: 'pre-award',
    path: '/mis/bid-intelligence',
    purpose: 'Visibility into how thoroughly each tender is analysed by the AI platform and whether critical risks surface before submission.',
    primaryUsers: ['Bid Team Lead', 'Estimation Head', 'Contracts Manager'],
    ready: true,
  },
  {
    id: 'estimation',
    title: 'Estimation Dashboard',
    section: 'pre-award',
    path: '/mis/estimation',
    purpose: 'Estimation pipeline, accuracy trends, and competitive pricing versus historical cost history.',
    primaryUsers: ['Estimation Head', 'MD', 'Finance Head'],
    ready: true,
  },
  {
    id: 'bid-preparation',
    title: 'Bid Preparation Dashboard',
    section: 'pre-award',
    path: '/mis/bid-preparation',
    purpose: 'Which bids are on track for submission versus at risk of missing deadlines or compliance requirements.',
    primaryUsers: ['Bid Team Lead', 'Finance Head', 'MD'],
    ready: true,
  },
  {
    id: 'tender-results',
    title: 'Tender Results Dashboard',
    section: 'pre-award',
    path: '/mis/tender-results',
    purpose: 'Bidding effectiveness and how smoothly the post-award handoff to project execution happens.',
    primaryUsers: ['MD', 'BD Head', 'Finance Head'],
    ready: true,
  },
  {
    id: 'project-setup',
    title: 'Project Setup Dashboard',
    section: 'post-award',
    path: '/mis/project-setup',
    purpose: 'Whether newly awarded projects are set up quickly and completely, or setup delays are eating into execution time.',
    primaryUsers: ['Project Managers', 'Project Directors', 'PMO'],
    ready: true,
  },
  {
    id: 'engineering',
    title: 'Engineering Dashboard',
    section: 'post-award',
    path: '/mis/engineering',
    purpose: 'Live view of the engineering function replacing the manual drawing register — bottlenecks and client approval delays.',
    primaryUsers: ['Engineering Head', 'Project Directors', 'Design Leads', 'Project Managers'],
    ready: true,
  },
  {
    id: 'procurement',
    title: 'Procurement Dashboard',
    section: 'post-award',
    path: '/mis/procurement',
    purpose: 'BC procurement data unified with AI-generated risk and performance intelligence — what is ordered and what is at risk.',
    primaryUsers: ['Procurement Head', 'Project Directors', 'Finance Head', 'MD'],
    ready: true,
  },
  {
    id: 'vendor-intelligence',
    title: 'Vendor Intelligence Dashboard',
    section: 'post-award',
    path: '/mis/vendor-intelligence',
    purpose: 'Objective, data-driven view of vendor performance for better sourcing decisions and early risk identification.',
    primaryUsers: ['Procurement Head', 'MD'],
    ready: true,
  },
  {
    id: 'inventory-material',
    title: 'Inventory & Material Dashboard',
    section: 'post-award',
    path: '/mis/inventory-material',
    purpose: "Bridges BC inventory records and the engineering MTO — whether the right materials are available for planned work.",
    primaryUsers: ['Warehouse Manager', 'Procurement Head', 'Project Managers'],
    ready: true,
  },
  {
    id: 'quality',
    title: 'Quality Dashboard',
    section: 'post-award',
    path: '/mis/quality',
    purpose: 'Real-time quality performance and risk — NCR trends and documentation readiness for handover.',
    primaryUsers: ['Quality Head', 'Project Directors', 'MD'],
    ready: true,
  },
  {
    id: 'finance',
    title: 'Finance Dashboard',
    section: 'post-award',
    path: '/mis/finance',
    purpose: "BC's transactional records bridged with AI forecasts — cash flow, profitability, and risk across the portfolio.",
    primaryUsers: ['Finance Head', 'CFO', 'MD', 'Project Directors'],
    ready: false,
  },
  {
    id: 'project-health',
    title: 'Project Health Dashboard',
    section: 'post-award',
    path: '/mis/project-health',
    purpose: 'Unified cross-functional health view per project — cost, schedule, engineering, procurement, quality, and risk.',
    primaryUsers: ['Project Directors', 'Project Managers', 'PMO'],
    ready: false,
  },
];

export function getMisDashboard(id: string): MisDashboardMeta | undefined {
  return MIS_DASHBOARDS.find(d => d.id === id);
}
