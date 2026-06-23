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
export interface TagItem {
  tagNumber: string;
  productName: string;
  dimensions: string;
  weightPerUnit: string;
  quantity: string;
  notes: string;
  missingFields: string[];
}

export interface ApiStage4 {
  inquiryId: string;
  sourceDocumentId?: string;
  sourceDocumentTitle?: string;
  status: 'pending' | 'extracting' | 'done' | 'failed';
  error?: string;
  tags: TagItem[];
  extractionNotes: string;
  extractedAt?: string;
}

// Stage 5
export interface ApiStage5 {
  inquiryId: string;
  checkedItems: boolean[];
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
export interface BomItem {
  _id: string;
  mocType: string;
  tagNumber: string;
  productName: string;
  quantity: number;
  quantityUnit: string;
  rateInr: number;
  totalInr: number;
  aiEstimated: boolean;
  rationale: string;
  confidence: string;
  notes: string;
  remarks: string;
}

export interface ApiStage7 {
  inquiryId: string;
  status: 'pending' | 'estimating' | 'done' | 'failed';
  error?: string;
  items: BomItem[];
  grandTotalInr: number;
  estimatedAt?: string;
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
    update: (sectionId: string, data: { summary?: string; title?: string; reviewDecision?: 'pending' | 'ok' | 'flagged' | 'issue'; reviewNote?: string }) =>
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
    update: (inquiryId: string, checkedItems: boolean[]) =>
      request<ApiStage5>(`/api/stage5/${encodeURIComponent(inquiryId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ checkedItems }),
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
    estimate: (inquiryId: string) =>
      request<ApiStage7>(`/api/stage7/${encodeURIComponent(inquiryId)}/estimate`, { method: 'POST' }),
    addItem: (inquiryId: string, item: { tagNumber?: string; productName: string; quantity: number; quantityUnit?: string; rateInr: number }) =>
      request<ApiStage7>(`/api/stage7/${encodeURIComponent(inquiryId)}/items`, {
        method: 'POST',
        body: JSON.stringify(item),
      }),
    updateItem: (inquiryId: string, itemId: string, data: { tagNumber?: string; productName?: string; quantity?: number; quantityUnit?: string; rateInr?: number; mocType?: string; notes?: string; remarks?: string }) =>
      request<ApiStage7>(`/api/stage7/${encodeURIComponent(inquiryId)}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteItem: (inquiryId: string, itemId: string) =>
      request<{ message: string }>(`/api/stage7/${encodeURIComponent(inquiryId)}/items/${itemId}`, { method: 'DELETE' }),
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
};
