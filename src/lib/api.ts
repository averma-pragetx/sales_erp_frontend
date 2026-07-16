// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiInquiry {
  _id: string;
  inquiryId: string;
  client: string;
  project: string;
  scope: string;
  value: number;
  currency: 'USD' | 'INR';
  valueUnit: 'Mn' | 'Cr';
  priority: 'P1' | 'P2' | 'P3';
  currentStage: number;
  currentStageName: string;
  cluster: string;
  daysToBid: number;
  bidDue: string;
  receivedDate: string;
  source: string;
  estimator: string;
  completedUpTo: number;
  createdAt: string;
}

export interface ApiExtractedSection {
  title: string;
  content: string;
  summary: string;
}

export interface ApiDocument {
  _id: string;
  inquiryId: string;
  docType: string;
  title: string;
  rev: string;
  status: 'read' | 'open' | 'queued';
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  hasFile: boolean;
  presignedUrl: string | null;
  // AI fields
  processingStatus: 'pending' | 'processing' | 'done' | 'failed';
  processingError?: string;
  aiSummary: string;
  keyItems: string[];
  extractedSections: ApiExtractedSection[];
  createdAt: string;
  updatedAt: string;
}

// ─── PageIndex chatbot ──────────────────────────────────────────────────────

export interface ApiPageIndexNode {
  nodeId: string;
  title: string;
  startPage: number;
  endPage: number;
  summary: string;
  nodes: ApiPageIndexNode[];
}

export type LlmProvider = 'gemini' | 'openai';

export interface ApiPageIndex {
  documentId: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  error: string;
  provider: LlmProvider;
  pageCount: number;
  docSummary: string;
  tree: ApiPageIndexNode[];
  qualityFlags: string[];
  currentVersion: number;
  builtAt: string | null;
}

export interface ApiPageIndexVersion {
  versionNumber: number;
  action: 'build' | 'repair';
  provider: LlmProvider;
  pageCount: number;
  docSummary: string;
  tree: ApiPageIndexNode[];
  qualityFlags: string[];
  createdAt: string;
}

export interface ApiPageIndexChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ApiPageIndexChatResult {
  answer: string;
  pagesUsed: number[];
}

export interface ApiSearchSource {
  docId: string;
  pages: number[];
  title: string;
  inquiryId: string;
}

export interface ApiSearchResult {
  answer: string;
  sources: ApiSearchSource[];
  chatId: string;
}

export interface ApiSearchChatSummary {
  chatId: string;
  title: string;
  updatedAt: string;
}

export interface ApiSearchChatMessage {
  role: 'user' | 'model';
  text: string;
  sources: ApiSearchSource[];
}

export interface ApiSearchChat {
  chatId: string;
  title: string;
  messages: ApiSearchChatMessage[];
  updatedAt: string;
}

export interface ApiCorpusDoc {
  docId: string;
  title: string;
  inquiryId: string;
  pageCount: number;
  builtAt: string | null;
}

export interface ApiAnalysis {
  docId: string;
  inquiryId: string;
  docType: string;
  title: string;
  processingStatus: 'pending' | 'processing' | 'done' | 'failed';
  processingError?: string;
  analysis: {
    overview: string;
    keyItems: string[];
    sections: ApiExtractedSection[];
  } | null;
  updatedAt: string;
}

export interface ExtractTriggerResponse {
  message: string;
  docId: string;
  statusUrl: string;
}

export interface ExtractedDocResult {
  _id: string;
  docType: string;
  title: string;
  processingStatus: 'pending' | 'processing' | 'done' | 'failed';
  processingError?: string;
  aiSummary: string;
  keyItems: string[];
  extractedSections: ApiExtractedSection[];
}

export interface ExtractInquiryResult {
  message: string;
  processed: number;
  documents: ExtractedDocResult[];
}

export type NewInquiryPayload = Omit<ApiInquiry, '_id' | 'createdAt'>;

// ─── Scraped Tenders ──────────────────────────────────────────

export interface ApiScrapedTender {
  tenderName: string;
  scraperId: string;
  tenderId: string;
  client: string;
  title: string;
  source: string;
  value: number;
  currency: 'USD' | 'INR';
  valueUnit: 'Mn' | 'Cr';
  dueDate: string;
  score: number | null;
  analysed: boolean;
  zipUrl: string | null;
  status: 'new' | 'approved' | 'rejected' | 'pushed';
  pushedInquiryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PushToSalesResult {
  tender: ApiScrapedTender;
  inquiry: ApiInquiry;
}

export interface ApiScraper {
  scraperId: string;
  name: string;
  sourceUrl: string;
  script: string;
  target: string;
  actor: string;
  cron: string;
  lastRun: string;
  nextRun: string;
  runtime: string;
  status: 'running' | 'idle' | 'error';
  errorMsg: string;
  leads24h: number;
  qualified24h: number;
  quotaPct: number;
}

export interface ApiScrapedTenderPage {
  items: ApiScrapedTender[];
  total: number;
  page: number;
  limit: number;
}

// Sections
export interface ApiSection {
  _id: string;
  inquiryId: string;
  documentId: string;
  docType: string;
  documentTitle: string;
  sectionIndex: number;
  title: string;
  content: string;
  summary: string;
  reviewDecision: 'pending' | 'ok' | 'flagged' | 'issue';
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSectionsByDoc {
  documentId: string;
  docType: string;
  documentTitle: string;
  sections: ApiSection[];
}

export interface ApiSectionsResponse {
  inquiryId: string;
  totalSections: number;
  documents: ApiSectionsByDoc[];
}

// Stage 3
export interface GapItem {
  section: string;
  severity: 'critical' | 'minor';
  reason: string;
}

export interface Stage3GapAnalysis {
  status: 'pending' | 'processing' | 'done' | 'failed';
  error?: string;
  requiredSections: string[];
  receivedSections: string[];
  gaps: GapItem[];
  recommendation: string;
  analysedAt?: string;
}

export interface Stage3EmailDraft {
  status: 'pending' | 'processing' | 'done' | 'failed';
  error?: string;
  subject: string;
  body: string;
  draftedAt?: string;
}

export interface ApiStage3 {
  inquiryId: string;
  gapAnalysis: Stage3GapAnalysis | null;
  emailDraft: Stage3EmailDraft | null;
}

// Stage 4
export interface ShellTubeSide {
  fluid:                 string;
  operatingPressureBarg: number;
  designPressureBarg:    number;
  operatingTempC:        number;
  designTempC:           number;
  material:              string;
}

export interface TagItem {
  tagNumber:       string;
  service:         string;
  temaType:        string;
  shellOdMm:       number;
  tubeLengthMm:    number;
  nos:             number;
  shellSide:       ShellTubeSide;
  tubeSide:        ShellTubeSide;
  weightPerUnitT:  number;
  totalWeightT:    number;
  datasheetRef:    string;
  datasheetRev:    string;
  ltcs:            boolean;
  ibr:             boolean;
  pwht:            boolean;
  ndeRequirements: string[];
  deviations:      string[];
  openItems:       string[];
  specialNotes:    string[];
}

export interface ExtractionMeta {
  sourceDocuments:         string[];
  totalTagsFound:          number;
  totalUnits:              number;
  ltcsItemCount:           number;
  totalFabricationWeightT: number;
}

export interface ApiStage4 {
  inquiryId: string;
  sourceDocumentId?: string;
  sourceDocumentTitle?: string;
  status: 'pending' | 'extracting' | 'done' | 'failed';
  error?: string;
  tags: TagItem[];
  extractionMeta?: ExtractionMeta;
  extractionNotes: string;
  extractedAt?: string;
}

// Stage 5
export interface ComplianceMeta {
  tclDocumentRef:       string;
  tclRevision:          string;
  totalComplianceItems: number;
  compliantCount:       number;
  deviationCount:       number;
  openUnderReviewCount: number;
  blockerCount:         number;
  categories:           string[];
}

export interface ComplianceItem {
  clauseId:            string;
  sourceRef:           string;
  topic:               string;
  category:            string;
  rfqBuyerRequirement: string;
  oswalStandOffer:     string;
  impact:              string;
  status:              string;
  owner:               string;
  compliantFlag:       boolean;
  deviationFlag:       boolean;
  blockerFlag:         boolean;
  openFlag:            boolean;
  statusOverride:      string | null;
  ownerOverride:       string | null;
  remarks:             string;
}

export interface ApiStage5 {
  inquiryId:        string;
  status:           'pending' | 'processing' | 'done' | 'failed';
  error?:           string;
  complianceMeta:   ComplianceMeta;
  complianceMatrix: ComplianceItem[];
  analyzedAt?:      string;
}

// Stage 6
export interface TechQuery {
  _id: string;
  tqNumber: string;
  tqIndex: number;
  tagClause: string;
  clauseRef: string;
  question: string;
  answer: string;
  sendTo: string;
  raisedBy: string;
  status: 'draft' | 'sent' | 'answered';
  sentAt?: string;
  answeredAt?: string;
}

export interface TQSummary {
  total: number;
  draft: number;
  sent: number;
  answered: number;
  stageState: string;
}

export interface ApiStage6 {
  inquiryId: string;
  tqs: TechQuery[];
  summary: TQSummary;
}

// Stage 7
export interface BomComponent {
  srNo:            string;
  component:       string;
  applicable:      string;
  moc:             string | null;
  mocSource:       string;
  mocFlag:         string | null;
  typeDetail:      string | null;
  remarks:         string;
  weightKg:        number | null;
  quantity:        string;
  unit:            string;
  unitCostPerKg:   number | null;
  materialCost:    number | null;
  fabricationCost: number | null;
  totalCost:       number | null;
  costBasis:       string | null;
}

export interface NozzleEntry {
  mark:        string;
  sizeNps:     string;
  asmeClass:   string;
  schedule:    string;
  facing:      string;
  designation: string;
  mocNeck:     string | null;
  mocFlange:   string | null;
  mocFlag:     string | null;
  totalCost:   number | null;
  costBasis:   string | null;
}

export interface EquipmentBom {
  tagNo:                     string;
  service:                   string;
  temaClass:                 string;
  exchangerType:             string;
  sizeIdMm:                  number;
  sizeSlMm:                  number;
  noOfShells:                number;
  noOfPassesShell:           number;
  noOfPassesTube:            number;
  designPressureShell:       string;
  designPressureTube:        string;
  designTempShellC:          number;
  designTempTubeC:           number;
  fluidShell:                string;
  fluidTube:                 string;
  corrosionAllowanceShellMm: number;
  corrosionAllowanceTubeMm:  number;
  stressRelieving:           string;
  radiography:               string;
  bundleWeightKg:            number | null;
  emptyWeightKg:             number | null;
  fullWaterWeightKg:         number | null;
  deletedFromScope:          boolean;
  ibrApplicable:             boolean;
  hydrogenService:           boolean;
  bom:                       BomComponent[];
  nozzleSchedule:            NozzleEntry[];
  totalMaterialCost:         number | null;
  totalFabricationCost:      number | null;
  totalNozzleCost:           number | null;
  specialCost:               number | null;
  inspectionCost:            number | null;
  totalEquipCost:            number | null;
}

export interface ProjectInfo {
  name:       string;
  jobNo:      string;
  client:     string;
  consultant: string;
  prNumber:   string;
  revision:   string;
  date:       string;
}

export interface ApiStage7 {
  inquiryId:   string;
  status:      'pending' | 'processing' | 'done' | 'failed';
  error?:      string;
  projectInfo: ProjectInfo;
  equipment:   EquipmentBom[];
  extractedAt?: string;
}

// Stage 8
export interface ApiStage8 {
  inquiryId: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  error?: string;
  title: string;
  body: string;
  draftedAt?: string;
  editedAt?: string;
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

// In production the frontend calls Render directly (avoids Netlify proxy
// mangling multipart boundaries). Set VITE_API_URL in Netlify env vars.
// In development it's empty and Vite's proxy handles /api/* → localhost:3001.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(API_BASE + url, {
    ...options,
    headers: isFormData
      ? options.headers                                          // browser sets multipart boundary
      : { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── API surface ──────────────────────────────────────────────────────────────

export const api = {
  inquiries: {
    list:   () => request<ApiInquiry[]>('/api/inquiries'),
    get:    (id: string) => request<ApiInquiry>(`/api/inquiries/${encodeURIComponent(id)}`),
    create: (data: NewInquiryPayload) =>
      request<ApiInquiry>('/api/inquiries', { method: 'POST', body: JSON.stringify(data) }),
    advance: (id: string, completedUpTo: number, currentStage: number, currentStageName: string) =>
      request<ApiInquiry>(`/api/inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ completedUpTo, currentStage, currentStageName }),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    kanbanMove: (id: string, cluster: string) =>
      request<ApiInquiry>(`/api/inquiries/${encodeURIComponent(id)}/kanban`, {
        method: 'PATCH',
        body: JSON.stringify({ cluster }),
      }),
  },

  scrapedTenders: {
    list: (page = 1, limit = 20, scraperId?: string) =>
      request<ApiScrapedTenderPage>(
        `/api/scraped-tenders?page=${page}&limit=${limit}${scraperId ? `&scraperId=${encodeURIComponent(scraperId)}` : ''}`
      ),
    analyse: (tenderName: string) =>
      request<ApiScrapedTender>(`/api/scraped-tenders/${encodeURIComponent(tenderName)}/analyse`, { method: 'POST' }),
    approve: (tenderName: string) =>
      request<ApiScrapedTender>(`/api/scraped-tenders/${encodeURIComponent(tenderName)}/approve`, { method: 'PATCH' }),
    reject: (tenderName: string) =>
      request<ApiScrapedTender>(`/api/scraped-tenders/${encodeURIComponent(tenderName)}/reject`, { method: 'PATCH' }),
    pushToSales: (tenderName: string) =>
      request<PushToSalesResult>(`/api/scraped-tenders/${encodeURIComponent(tenderName)}/push-to-sales`, { method: 'POST' }),
  },

  scrapers: {
    list: () => request<ApiScraper[]>('/api/scrapers'),
  },

  documents: {
    list: (inquiryId: string) =>
      request<ApiDocument[]>(`/api/documents/inquiry/${encodeURIComponent(inquiryId)}`),

    get: (docId: string) =>
      request<ApiDocument>(`/api/documents/${docId}`),

    upload: (inquiryId: string, formData: FormData) =>
      request<ApiDocument>(`/api/documents/inquiry/${encodeURIComponent(inquiryId)}`, {
        method: 'POST',
        body: formData,
      }),

    delete: (docId: string) =>
      request<{ message: string }>(`/api/documents/${docId}`, { method: 'DELETE' }),

    analysis: (docId: string) =>
      request<ApiAnalysis>(`/api/documents/${docId}/analysis`),
  },

  extract: {
    // Trigger Gemini extraction for one document (202 async, then poll)
    trigger: (docId: string) =>
      request<ExtractTriggerResponse>(`/api/extract/document/${docId}`, { method: 'POST' }),

    // Poll for results
    status: (docId: string) =>
      request<ApiAnalysis>(`/api/extract/document/${docId}`),

    // Synchronously extract all pending docs for an inquiry, returns full results.
    // Pass force=true to re-extract docs that are already done/failed.
    triggerInquiry: (inquiryId: string, force = false) =>
      request<ExtractInquiryResult>(
        `/api/extract/inquiry/${encodeURIComponent(inquiryId)}${force ? '?force=true' : ''}`,
        { method: 'POST' },
      ),
  },

  sections: {
    listForInquiry: (inquiryId: string) =>
      request<ApiSectionsResponse>(`/api/sections/inquiry/${encodeURIComponent(inquiryId)}`),
    update: (sectionId: string, data: { summary?: string; content?: string; title?: string; reviewDecision?: 'pending' | 'ok' | 'flagged' | 'issue'; reviewNote?: string }) =>
      request<ApiSection>(`/api/sections/${sectionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  stage3: {
    get: (inquiryId: string) =>
      request<ApiStage3>(`/api/stage3/${encodeURIComponent(inquiryId)}`),
    analyse: (inquiryId: string) =>
      request<Stage3GapAnalysis>(`/api/stage3/${encodeURIComponent(inquiryId)}/analyse`, { method: 'POST' }),
    draftEmail: (inquiryId: string) =>
      request<Stage3EmailDraft>(`/api/stage3/${encodeURIComponent(inquiryId)}/email`, { method: 'POST' }),
  },

  stage4: {
    get: (inquiryId: string) =>
      request<ApiStage4>(`/api/stage4/${encodeURIComponent(inquiryId)}`),
    extract: (inquiryId: string, documentId?: string) =>
      request<ApiStage4>(`/api/stage4/${encodeURIComponent(inquiryId)}/extract`, {
        method: 'POST',
        body: JSON.stringify(documentId ? { documentId } : {}),
      }),
  },

  stage5: {
    get: (inquiryId: string) =>
      request<ApiStage5>(`/api/stage5/${encodeURIComponent(inquiryId)}`),
    analyse: (inquiryId: string) =>
      request<ApiStage5>(`/api/stage5/${encodeURIComponent(inquiryId)}/analyse`, { method: 'POST' }),
    updateItem: (inquiryId: string, itemIndex: number, data: { topic?: string; category?: string; sourceRef?: string; rfqBuyerRequirement?: string; oswalStandOffer?: string; impact?: string; status?: string; owner?: string; statusOverride?: string | null; ownerOverride?: string | null; remarks?: string }) =>
      request<ApiStage5>(`/api/stage5/${encodeURIComponent(inquiryId)}/items/${itemIndex}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    addItem: (inquiryId: string, data: { topic: string; rfqBuyerRequirement: string; category?: string; sourceRef?: string; oswalStandOffer?: string; impact?: string; status?: string; owner?: string; remarks?: string }) =>
      request<ApiStage5>(`/api/stage5/${encodeURIComponent(inquiryId)}/items`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteItem: (inquiryId: string, itemIndex: number) =>
      request<ApiStage5>(`/api/stage5/${encodeURIComponent(inquiryId)}/items/${itemIndex}`, {
        method: 'DELETE',
      }),
  },

  stage6: {
    get: (inquiryId: string) =>
      request<ApiStage6>(`/api/stage6/${encodeURIComponent(inquiryId)}`),
    createTQ: (inquiryId: string, data: { tagClause: string; clauseRef?: string; question: string; sendTo: string; raisedBy: string }) =>
      request<TechQuery>(`/api/stage6/${encodeURIComponent(inquiryId)}/tq`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateTQ: (inquiryId: string, tqId: string, data: Partial<{ tagClause: string; clauseRef: string; question: string; answer: string; sendTo: string; raisedBy: string; status: 'draft' | 'sent' | 'answered' }>) =>
      request<TechQuery>(`/api/stage6/${encodeURIComponent(inquiryId)}/tq/${tqId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteTQ: (inquiryId: string, tqId: string) =>
      request<{ message: string }>(`/api/stage6/${encodeURIComponent(inquiryId)}/tq/${tqId}`, { method: 'DELETE' }),
  },

  stage7: {
    get: (inquiryId: string) =>
      request<ApiStage7>(`/api/stage7/${encodeURIComponent(inquiryId)}`),
    extract: (inquiryId: string) =>
      request<ApiStage7>(`/api/stage7/${encodeURIComponent(inquiryId)}/extract`, { method: 'POST' }),
    estimateCost: (inquiryId: string) =>
      request<ApiStage7>(`/api/stage7/${encodeURIComponent(inquiryId)}/estimate-cost`, { method: 'POST' }),
  },

  stage8: {
    get: (inquiryId: string) =>
      request<ApiStage8>(`/api/stage8/${encodeURIComponent(inquiryId)}`),
    draft: (inquiryId: string) =>
      request<ApiStage8>(`/api/stage8/${encodeURIComponent(inquiryId)}/draft`, { method: 'POST' }),
    update: (inquiryId: string, data: { title?: string; body?: string }) =>
      request<ApiStage8>(`/api/stage8/${encodeURIComponent(inquiryId)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  pageIndex: {
    get: (docId: string) =>
      request<ApiPageIndex>(`/api/pageindex/${docId}`),
    build: (docId: string, provider: LlmProvider) =>
      request<ApiPageIndex>(`/api/pageindex/${docId}/build`, {
        method: 'POST',
        body: JSON.stringify({ provider }),
      }),
    repair: (docId: string, provider: LlmProvider) =>
      request<ApiPageIndex>(`/api/pageindex/${docId}/repair`, {
        method: 'POST',
        body: JSON.stringify({ provider }),
      }),
    versions: (docId: string) =>
      request<ApiPageIndexVersion[]>(`/api/pageindex/${docId}/versions`),
    chat: (docId: string, message: string, history: ApiPageIndexChatTurn[], provider: LlmProvider) =>
      request<ApiPageIndexChatResult>(`/api/pageindex/${docId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message, history, provider }),
      }),
  },

  search: {
    corpus: () => request<ApiCorpusDoc[]>('/api/search/corpus'),
    ask: (question: string, history: ApiPageIndexChatTurn[], provider: LlmProvider, docId?: string, chatId?: string) =>
      request<ApiSearchResult>('/api/search/ask', {
        method: 'POST',
        body: JSON.stringify({ question, history, provider, docId: docId || undefined, chatId: chatId || undefined }),
      }),
    chats: () => request<ApiSearchChatSummary[]>('/api/search/chats'),
    chat: (chatId: string) => request<ApiSearchChat>(`/api/search/chats/${chatId}`),
    deleteChat: (chatId: string) =>
      request<{ ok: boolean }>(`/api/search/chats/${chatId}`, { method: 'DELETE' }),
  },
};
