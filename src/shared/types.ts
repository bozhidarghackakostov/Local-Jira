export type TicketStatus =
  | 'New'
  | 'Updated - In Progress'
  | 'Updated - Waiting Customer'
  | 'Updated - Closed'
  | 'Open'
  | 'Resolved'
  | 'Updated'
  | 'Closed';

export const ALL_STATUSES: TicketStatus[] = [
  'New',
  'Updated - In Progress',
  'Updated - Waiting Customer',
  'Updated - Closed',
  'Open',
  'Resolved',
];

export interface Ticket {
  id: number;
  key: string;
  title: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  comment_count?: number;
}

export interface Comment {
  id: number;
  ticket_id: number;
  text: string;
  created_at: string;
}

export interface TicketDetail extends Ticket {
  comments: Comment[];
}

export type SortField = 'created_at' | 'updated_at' | 'title' | 'status';
export type SortOrder = 'asc' | 'desc';
export type StatusFilter =
  | 'all'
  | 'new'
  | 'in_progress'
  | 'waiting_customer'
  | 'closed'
  | 'open'
  | 'resolved'
  | string;

export interface TicketCounts {
  all: number;
  byStatus: Record<string, number>;
  open?: number;
  resolved?: number;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  counts: TicketCounts;
}

export interface CreateTicketPayload {
  title: string;
  description?: string;
  status?: TicketStatus;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  status?: TicketStatus;
}

export interface CreateCommentPayload {
  text: string;
}

export interface SystemStats {
  database_path: string;
  database_size_bytes: number;
  total_tickets: number;
  status_breakdown: Record<string, number>;
  total_comments: number;
  last_modified: string;
  open_tickets?: number;
  resolved_tickets?: number;
}

export interface BackupData {
  version: 1;
  exported_at: string;
  tickets: Ticket[];
  comments: Comment[];
}
