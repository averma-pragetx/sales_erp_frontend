export interface RfqDocument {
  doc: string;
  title: string;
  rev: string;
  status: 'read' | 'open' | 'queued';
}

export interface InquiryDetail {
  id: string;
  estimator: string;
  bidDue: string;
  receivedDate: string;
  source: string;
  completedUpTo: number;
  rfqDocuments: RfqDocument[];
}

export const INQUIRY_DETAILS: Record<string, InquiryDetail> = {
  'OEL/EST/2026/0411': {
    id: 'OEL/EST/2026/0411',
    estimator: 'Sneha Bharti',
    bidDue: '12-Apr',
    receivedDate: '2026-05-09',
    source: 'Direct intake',
    completedUpTo: 1,
    rfqDocuments: [
      { doc: 'RFQ',  title: 'Request for Quotation',                          rev: 'A', status: 'read' },
      { doc: 'BDS',  title: 'Bid Data Sheet',                                 rev: 'A', status: 'read' },
      { doc: 'ITB',  title: 'Instructions to Bidders + Appendices I–VIII',    rev: '0', status: 'read' },
      { doc: 'ATC',  title: 'Agreed Terms & Conditions',                      rev: '–', status: 'open' },
      { doc: 'SPC',  title: 'Special Purchase Conditions',                    rev: '0', status: 'open' },
      { doc: 'GPC',  title: 'General Purchase Conditions',                    rev: '0', status: 'queued' },
      { doc: 'PS',   title: 'Price Schedule (Format B1)',                     rev: 'B', status: 'open' },
      { doc: 'MR',   title: 'Material Requisition — Heat Exchanger CS',       rev: 'B', status: 'read' },
      { doc: 'SOW',  title: 'MR Scope of Work & Supply',                      rev: 'A', status: 'read' },
      { doc: 'TCL',  title: 'Technical Compliance Statement (template)',       rev: 'B', status: 'open' },
    ],
  },
  'OEL/EST/2026/0418': {
    id: 'OEL/EST/2026/0418',
    estimator: 'Rajan Mehta',
    bidDue: '08-Apr',
    receivedDate: '2026-04-15',
    source: 'EPC Tender',
    completedUpTo: 6,
    rfqDocuments: [
      { doc: 'RFQ',  title: 'Request for Quotation',        rev: 'B', status: 'read' },
      { doc: 'BDS',  title: 'Bid Data Sheet',               rev: 'A', status: 'read' },
      { doc: 'MR',   title: 'Material Requisition (CS)',    rev: 'A', status: 'read' },
      { doc: 'TCL',  title: 'Tech Compliance List',         rev: '0', status: 'open' },
    ],
  },
  'OEL/EST/2026/0404': {
    id: 'OEL/EST/2026/0404',
    estimator: 'Priya Nair',
    bidDue: '22-Apr',
    receivedDate: '2026-04-01',
    source: 'Client Portal',
    completedUpTo: 5,
    rfqDocuments: [
      { doc: 'RFQ',  title: 'Request for Quotation',           rev: 'A', status: 'read' },
      { doc: 'DS',   title: 'Equipment Datasheet Package',     rev: 'C', status: 'read' },
      { doc: 'SPC',  title: 'Special Purchase Conditions',     rev: '0', status: 'open' },
    ],
  },
  'OEL/EST/2026/0401': {
    id: 'OEL/EST/2026/0401',
    estimator: 'Arun Joshi',
    bidDue: '30-Apr',
    receivedDate: '2026-03-28',
    source: 'Agent referral',
    completedUpTo: 2,
    rfqDocuments: [
      { doc: 'RFQ',  title: 'Request for Quotation',   rev: 'A', status: 'read' },
      { doc: 'GPC',  title: 'General Purchase Conditions', rev: '0', status: 'queued' },
    ],
  },
  'OEL/EST/2026/0398': {
    id: 'OEL/EST/2026/0398',
    estimator: 'Kavita Sharma',
    bidDue: '15-May',
    receivedDate: '2026-03-22',
    source: 'Direct intake',
    completedUpTo: 3,
    rfqDocuments: [
      { doc: 'RFQ',  title: 'Request for Quotation',   rev: 'A', status: 'read' },
      { doc: 'BDS',  title: 'Bid Data Sheet',           rev: 'A', status: 'open' },
    ],
  },
  'OEL/EST/2026/0407': {
    id: 'OEL/EST/2026/0407',
    estimator: 'Sneha Bharti',
    bidDue: '15-Mar',
    receivedDate: '2026-01-10',
    source: 'EPC Tender',
    completedUpTo: 10,
    rfqDocuments: [
      { doc: 'RFQ',  title: 'Request for Quotation',             rev: 'B', status: 'read' },
      { doc: 'BDS',  title: 'Bid Data Sheet',                    rev: 'A', status: 'read' },
      { doc: 'ITB',  title: 'Instructions to Bidders',           rev: '0', status: 'read' },
      { doc: 'MR',   title: 'Material Requisition',              rev: 'B', status: 'read' },
      { doc: 'TCL',  title: 'Technical Compliance Statement',    rev: 'A', status: 'read' },
    ],
  },
};
