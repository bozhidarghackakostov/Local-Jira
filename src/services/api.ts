import type {
  Ticket,
  TicketDetail,
  TicketListResponse,
  TicketStatus,
  StatusFilter,
  SortField,
  SortOrder,
  CreateTicketPayload,
  UpdateTicketPayload,
  CreateCommentPayload,
  Comment,
  SystemStats,
  BackupData,
} from '../shared/types';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && data.error) {
        errorMsg = data.error;
      }
    } catch {
      // ignore
    }
    throw new ApiError(res.status, errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getTickets(params: {
    status?: StatusFilter;
    search?: string;
    sortBy?: SortField;
    sortOrder?: SortOrder;
  } = {}): Promise<TicketListResponse> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.sortBy) query.set('sort_by', params.sortBy);
    if (params.sortOrder) query.set('sort_order', params.sortOrder);

    const qs = query.toString();
    const url = `/api/tickets${qs ? `?${qs}` : ''}`;
    const res = await fetch(url);
    return handleResponse<TicketListResponse>(res);
  },

  async getTicket(idOrKey: string | number): Promise<TicketDetail> {
    const res = await fetch(`/api/tickets/${encodeURIComponent(idOrKey)}`);
    return handleResponse<TicketDetail>(res);
  },

  async createTicket(payload: CreateTicketPayload): Promise<Ticket> {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Ticket>(res);
  },

  async updateTicket(idOrKey: string | number, payload: UpdateTicketPayload): Promise<Ticket> {
    const res = await fetch(`/api/tickets/${encodeURIComponent(idOrKey)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Ticket>(res);
  },

  async deleteTicket(idOrKey: string | number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/tickets/${encodeURIComponent(idOrKey)}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async addComment(idOrKey: string | number, text: string): Promise<Comment> {
    const res = await fetch(`/api/tickets/${encodeURIComponent(idOrKey)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse<Comment>(res);
  },

  async getSystemStats(): Promise<SystemStats> {
    const res = await fetch('/api/system/stats');
    return handleResponse<SystemStats>(res);
  },

  async getBackup(): Promise<BackupData> {
    const res = await fetch('/api/system/backup');
    return handleResponse<BackupData>(res);
  },

  async restoreBackup(backup: BackupData): Promise<{ success: boolean; message: string; restoredTickets: number; restoredComments: number }> {
    const res = await fetch('/api/system/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backup),
    });
    return handleResponse<{ success: boolean; message: string; restoredTickets: number; restoredComments: number }>(res);
  },

  async seedDemoData(): Promise<{ success: boolean; seeded: boolean; message: string }> {
    const res = await fetch('/api/system/seed', { method: 'POST' });
    return handleResponse<{ success: boolean; seeded: boolean; message: string }>(res);
  },
};
