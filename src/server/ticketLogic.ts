import type {
  Ticket,
  TicketStatus,
  StatusFilter,
  SortField,
  SortOrder,
  TicketCounts,
  CreateTicketPayload,
  UpdateTicketPayload,
  BackupData,
} from '../shared/types';
import { ALL_STATUSES } from '../shared/types';

export const VALID_STATUSES: string[] = [
  'New',
  'Updated - In Progress',
  'Updated - Waiting Customer',
  'Updated - Closed',
  'Open',
  'Resolved',
  'Updated',
  'Closed',
];

export function isValidStatus(status: string): boolean {
  return VALID_STATUSES.some(s => s.toLowerCase() === status.trim().toLowerCase());
}

export function canonicalStatus(status: string): TicketStatus {
  const match = VALID_STATUSES.find(s => s.toLowerCase() === status.trim().toLowerCase());
  if (match) return match as TicketStatus;
  return status.trim() as TicketStatus;
}

export function formatTicketKey(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error('Sequence must be a positive integer');
  }
  return `LOC-${sequence}`;
}

export function parseTicketIdOrKey(param: string): { type: 'key'; value: string } | { type: 'id'; value: number } | null {
  if (!param || typeof param !== 'string') return null;
  const trimmed = param.trim();
  if (/^LOC-\d+$/i.test(trimmed)) {
    return { type: 'key', value: trimmed.toUpperCase() };
  }
  const numericId = parseInt(trimmed, 10);
  if (!isNaN(numericId) && numericId > 0 && String(numericId) === trimmed) {
    return { type: 'id', value: numericId };
  }
  return null;
}

export function validateCreateTicket(payload: unknown): 
  | { valid: true; data: { title: string; description: string; status: TicketStatus } }
  | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { title, description, status } = payload as Partial<CreateTicketPayload>;

  if (typeof title !== 'string' || title.trim().length === 0) {
    return { valid: false, error: 'Title is required and cannot be empty' };
  }

  const cleanTitle = title.trim();
  if (cleanTitle.length > 255) {
    return { valid: false, error: 'Title cannot exceed 255 characters' };
  }

  let cleanDescription = '';
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return { valid: false, error: 'Description must be a string' };
    }
    cleanDescription = description.trim();
    if (cleanDescription.length > 10000) {
      return { valid: false, error: 'Description cannot exceed 10,000 characters' };
    }
  }

  let finalStatus: TicketStatus = 'New';
  if (status !== undefined) {
    if (typeof status !== 'string' || !isValidStatus(status)) {
      return { valid: false, error: `Invalid status '${status}'. Allowed statuses: ${VALID_STATUSES.join(', ')}` };
    }
    finalStatus = canonicalStatus(status);
  }

  return {
    valid: true,
    data: {
      title: cleanTitle,
      description: cleanDescription,
      status: finalStatus,
    },
  };
}

export function validateUpdateTicket(payload: unknown):
  | { valid: true; data: { title?: string; description?: string; status?: TicketStatus } }
  | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { title, description, status } = payload as Partial<UpdateTicketPayload>;
  const updates: { title?: string; description?: string; status?: TicketStatus } = {};

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return { valid: false, error: 'Title cannot be empty' };
    }
    if (title.trim().length > 255) {
      return { valid: false, error: 'Title cannot exceed 255 characters' };
    }
    updates.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      return { valid: false, error: 'Description must be a string' };
    }
    if (description.trim().length > 10000) {
      return { valid: false, error: 'Description cannot exceed 10,000 characters' };
    }
    updates.description = description.trim();
  }

  if (status !== undefined) {
    if (typeof status !== 'string' || !isValidStatus(status)) {
      return { valid: false, error: `Invalid status '${status}'. Allowed statuses: ${VALID_STATUSES.join(', ')}` };
    }
    updates.status = canonicalStatus(status);
  }

  if (Object.keys(updates).length === 0) {
    return { valid: false, error: 'No valid fields provided for update' };
  }

  return { valid: true, data: updates };
}

export function validateComment(payload: unknown):
  | { valid: true; text: string }
  | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { text } = payload as { text?: unknown };
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { valid: false, error: 'Comment text cannot be empty' };
  }

  const cleanText = text.trim();
  if (cleanText.length > 5000) {
    return { valid: false, error: 'Comment cannot exceed 5,000 characters' };
  }

  return { valid: true, text: cleanText };
}

export function matchesStatusFilter(ticketStatus: string, filter: string): boolean {
  if (!filter || filter === 'all') return true;
  const f = filter.toLowerCase().trim();
  const s = ticketStatus.toLowerCase().trim();

  if (f === 'new') return s === 'new';
  if (f === 'in_progress') return s === 'updated - in progress';
  if (f === 'waiting_customer') return s === 'updated - waiting customer';
  if (f === 'closed') return s === 'updated - closed' || s === 'closed' || s === 'resolved';
  if (f === 'open') return s === 'open' || s === 'new' || s === 'updated - in progress' || s === 'updated - waiting customer';
  if (f === 'resolved') return s === 'resolved' || s === 'updated - closed' || s === 'closed';

  return s === f;
}

export function filterAndSortTickets(
  tickets: Ticket[],
  options: {
    status?: StatusFilter;
    search?: string;
    sortBy?: SortField;
    sortOrder?: SortOrder;
  } = {}
): Ticket[] {
  const {
    status = 'all',
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  let result = [...tickets];

  // 1. Status Filter
  if (status && status !== 'all') {
    result = result.filter(t => matchesStatusFilter(t.status, status));
  }

  // 2. Search across key, title, description (case-insensitive)
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(t =>
      t.key.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  }

  // 3. Sorting with deterministic tie-breaking by ID
  const factor = sortOrder === 'asc' ? 1 : -1;

  result.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    } else if (sortBy === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else if (sortBy === 'updated_at') {
      const timeA = new Date(a.updated_at).getTime();
      const timeB = new Date(b.updated_at).getTime();
      comparison = timeA - timeB;
    } else {
      // created_at (default)
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      comparison = timeA - timeB;
    }

    if (comparison !== 0) {
      return comparison * factor;
    }

    return (b.id - a.id) * factor;
  });

  return result;
}

export function computeCounts(tickets: Ticket[]): TicketCounts {
  const byStatus: Record<string, number> = {
    New: 0,
    'Updated - In Progress': 0,
    'Updated - Waiting Customer': 0,
    'Updated - Closed': 0,
  };

  let open = 0;
  let resolved = 0;

  for (const t of tickets) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    if (t.status === 'Updated - Closed' || t.status === 'Closed' || t.status === 'Resolved') {
      resolved++;
    } else {
      open++;
    }
  }

  return {
    all: tickets.length,
    byStatus,
    open,
    resolved,
  };
}

export function validateBackupData(data: unknown):
  | { valid: true; data: BackupData }
  | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Backup content must be a valid JSON object' };
  }

  const obj = data as Partial<BackupData>;
  if (obj.version !== 1 || !Array.isArray(obj.tickets) || !Array.isArray(obj.comments)) {
    return { valid: false, error: 'Invalid backup format. Expected version 1 with tickets and comments arrays.' };
  }

  for (const ticket of obj.tickets) {
    if (!ticket.key || !ticket.title || !ticket.status || !ticket.created_at) {
      return { valid: false, error: `Invalid ticket structure in backup: ${ticket.key || 'unknown'}` };
    }
  }

  return { valid: true, data: obj as BackupData };
}
