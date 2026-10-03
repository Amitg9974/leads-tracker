import type { Lead, LeadInput, LeadList, Note } from './types';

export class ApiError extends Error {
  status: number;
  details?: Record<string, string>;

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the API is running and try again.");
  }
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (res.status === 401) {
    throw new ApiError(401, 'You need to sign in. Reload the page and enter your username and password.');
  }
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? 'Something went wrong', body?.error?.details);
  }
  return body as T;
}

interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const api = {
  listLeads(params: ListParams) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') qs.set(key, String(value));
    });
    return request<LeadList>(`/leads?${qs}`);
  },
  getLead: (id: number) => request<Lead>(`/leads/${id}`),
  createLead: (input: LeadInput) => request<Lead>('/leads', { method: 'POST', body: JSON.stringify(input) }),
  updateLead: (id: number, patch: Partial<LeadInput>) =>
    request<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteLead: (id: number) => request<void>(`/leads/${id}`, { method: 'DELETE' }),
  listNotes: (id: number) => request<Note[]>(`/leads/${id}/notes`),
  addNote: (id: number, content: string) =>
    request<Note>(`/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
};
