export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: LeadStatus;
  createdAt: string;
  notesCount: number;
}

export interface Note {
  id: number;
  leadId: number;
  content: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeadList {
  data: Lead[];
  pagination: Pagination;
}

export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  status?: LeadStatus;
}
