import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  Ticket,
  Comment,
  TicketDetail,
  TicketStatus,
  StatusFilter,
  SortField,
  SortOrder,
  TicketCounts,
  SystemStats,
  BackupData,
} from '../shared/types';
import { formatTicketKey, parseTicketIdOrKey, matchesStatusFilter } from './ticketLogic';

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string = '';

export function getDatabasePath(): string {
  if (process.env.LOCALJIRA_DB_PATH) {
    return process.env.LOCALJIRA_DB_PATH;
  }
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'localjira.db');
}

export function initDatabase(dbPath?: string): DatabaseSync {
  const finalPath = dbPath || getDatabasePath();
  currentDbPath = finalPath;

  if (finalPath !== ':memory:') {
    const parent = path.dirname(finalPath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
  }

  const db = new DatabaseSync(finalPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (finalPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
    } catch {
      // WAL fallback
    }
  }

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_counter (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      next_val INTEGER NOT NULL
    );
    INSERT OR IGNORE INTO ticket_counter (id, next_val) VALUES (1, 1);

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_key ON tickets(key);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);
  `);

  // Migration: If the table was previously created with CHECK(status IN ('Open', 'Resolved')), migrate it
  try {
    const tableDef = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tickets'").get() as { sql?: string } | undefined;
    if (tableDef && tableDef.sql && tableDef.sql.includes("CHECK(status IN ('Open', 'Resolved'))")) {
      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec('BEGIN TRANSACTION;');
      db.exec(`
        CREATE TABLE tickets_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'New',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.exec('INSERT INTO tickets_new SELECT * FROM tickets;');
      db.exec('DROP TABLE tickets;');
      db.exec('ALTER TABLE tickets_new RENAME TO tickets;');
      db.exec('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);');
      db.exec('CREATE INDEX IF NOT EXISTS idx_tickets_key ON tickets(key);');
      db.exec('CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);');
      db.exec('COMMIT;');
      db.exec('PRAGMA foreign_keys = ON;');
    }
  } catch {
    // Migration check non-critical if already executed
  }

  dbInstance = db;
  return db;
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function createTicket(payload: {
  title: string;
  description?: string;
  status?: TicketStatus;
}): Ticket {
  const db = getDb();
  const now = new Date().toISOString();
  const description = payload.description || '';
  const status: TicketStatus = payload.status || 'New';

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const counterRow = db.prepare('SELECT next_val FROM ticket_counter WHERE id = 1').get() as { next_val: number };
    const seq = counterRow.next_val;
    const key = formatTicketKey(seq);

    const insertStmt = db.prepare(`
      INSERT INTO tickets (key, title, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertResult = insertStmt.run(key, payload.title.trim(), description.trim(), status, now, now);
    const newId = Number(insertResult.lastInsertRowid);

    db.prepare('UPDATE ticket_counter SET next_val = next_val + 1 WHERE id = 1').run();

    db.exec('COMMIT;');

    return {
      id: newId,
      key,
      title: payload.title.trim(),
      description: description.trim(),
      status,
      created_at: now,
      updated_at: now,
      comment_count: 0,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // ignore rollback error
    }
    throw err;
  }
}

export function getTicketByIdOrKey(idOrKey: string | number): TicketDetail | null {
  const db = getDb();
  const parsed = typeof idOrKey === 'number'
    ? { type: 'id' as const, value: idOrKey }
    : parseTicketIdOrKey(String(idOrKey));

  if (!parsed) return null;

  let ticketRow: any = null;
  if (parsed.type === 'key') {
    ticketRow = db.prepare('SELECT * FROM tickets WHERE key = ?').get(parsed.value);
  } else {
    ticketRow = db.prepare('SELECT * FROM tickets WHERE id = ?').get(parsed.value);
  }

  if (!ticketRow) return null;

  const comments = db.prepare(`
    SELECT id, ticket_id, text, created_at
    FROM comments
    WHERE ticket_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(ticketRow.id) as Comment[];

  return {
    id: ticketRow.id,
    key: ticketRow.key,
    title: ticketRow.title,
    description: ticketRow.description,
    status: ticketRow.status as TicketStatus,
    created_at: ticketRow.created_at,
    updated_at: ticketRow.updated_at,
    comment_count: comments.length,
    comments,
  };
}

export function updateTicket(
  idOrKey: string | number,
  updates: { title?: string; description?: string; status?: TicketStatus }
): Ticket | null {
  const existing = getTicketByIdOrKey(idOrKey);
  if (!existing) return null;

  const db = getDb();
  const now = new Date().toISOString();

  const newTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
  const newDescription = updates.description !== undefined ? updates.description.trim() : existing.description;
  const newStatus = updates.status !== undefined ? updates.status : existing.status;

  db.prepare(`
    UPDATE tickets
    SET title = ?, description = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(newTitle, newDescription, newStatus, now, existing.id);

  return {
    id: existing.id,
    key: existing.key,
    title: newTitle,
    description: newDescription,
    status: newStatus,
    created_at: existing.created_at,
    updated_at: now,
    comment_count: existing.comment_count,
  };
}

export function deleteTicket(idOrKey: string | number): boolean {
  const existing = getTicketByIdOrKey(idOrKey);
  if (!existing) return false;

  const db = getDb();
  const res = db.prepare('DELETE FROM tickets WHERE id = ?').run(existing.id);
  return res.changes > 0;
}

export function addComment(idOrKey: string | number, text: string): Comment | null {
  const existing = getTicketByIdOrKey(idOrKey);
  if (!existing) return null;

  const db = getDb();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const insertResult = db.prepare(`
      INSERT INTO comments (ticket_id, text, created_at)
      VALUES (?, ?, ?)
    `).run(existing.id, text.trim(), now);

    // Update ticket updated_at
    db.prepare('UPDATE tickets SET updated_at = ? WHERE id = ?').run(now, existing.id);

    db.exec('COMMIT;');

    return {
      id: Number(insertResult.lastInsertRowid),
      ticket_id: existing.id,
      text: text.trim(),
      created_at: now,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // ignore
    }
    throw err;
  }
}

export function getAllTickets(options: {
  status?: StatusFilter;
  search?: string;
  sortBy?: SortField;
  sortOrder?: SortOrder;
} = {}): { tickets: Ticket[]; total: number; counts: TicketCounts } {
  const db = getDb();

  // 1. Status breakdown counts
  const totalRow = db.prepare('SELECT COUNT(*) as c FROM tickets').get() as { c: number };
  const statusRows = db.prepare('SELECT status, COUNT(*) as c FROM tickets GROUP BY status').all() as Array<{ status: string; c: number }>;

  const byStatus: Record<string, number> = {
    New: 0,
    'Updated - In Progress': 0,
    'Updated - Waiting Customer': 0,
    'Updated - Closed': 0,
    Open: 0,
    Resolved: 0,
  };

  let openCount = 0;
  let resolvedCount = 0;

  for (const row of statusRows) {
    byStatus[row.status] = Number(row.c);
    if (row.status === 'Updated - Closed' || row.status === 'Closed' || row.status === 'Resolved') {
      resolvedCount += Number(row.c);
    } else {
      openCount += Number(row.c);
    }
  }

  const counts: TicketCounts = {
    all: Number(totalRow.c),
    byStatus,
    open: openCount,
    resolved: resolvedCount,
  };

  // 2. Build filtered and sorted query with comment counts
  const conditions: string[] = [];
  const params: unknown[] = [];

  const status = options.status || 'all';
  if (status && status !== 'all') {
    const f = status.toLowerCase().trim();
    if (f === 'new') {
      conditions.push("LOWER(t.status) = 'new'");
    } else if (f === 'in_progress') {
      conditions.push("LOWER(t.status) = 'updated - in progress'");
    } else if (f === 'waiting_customer') {
      conditions.push("LOWER(t.status) = 'updated - waiting customer'");
    } else if (f === 'closed') {
      conditions.push("(LOWER(t.status) = 'updated - closed' OR LOWER(t.status) = 'closed' OR LOWER(t.status) = 'resolved')");
    } else if (f === 'open') {
      conditions.push("(LOWER(t.status) = 'open' OR LOWER(t.status) = 'new' OR LOWER(t.status) = 'updated - in progress' OR LOWER(t.status) = 'updated - waiting customer')");
    } else if (f === 'resolved') {
      conditions.push("(LOWER(t.status) = 'resolved' OR LOWER(t.status) = 'updated - closed' OR LOWER(t.status) = 'closed')");
    } else {
      conditions.push("LOWER(t.status) = LOWER(?)");
      params.push(status);
    }
  }

  if (options.search && options.search.trim().length > 0) {
    const term = `%${options.search.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(t.key) LIKE ? OR
      LOWER(t.title) LIKE ? OR
      LOWER(t.description) LIKE ?
    )`);
    params.push(term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Order clause
  const orderDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
  let orderColumn = 't.created_at';
  if (options.sortBy === 'title') {
    orderColumn = 'LOWER(t.title)';
  } else if (options.sortBy === 'status') {
    orderColumn = 't.status';
  } else if (options.sortBy === 'updated_at') {
    orderColumn = 't.updated_at';
  }

  const sql = `
    SELECT 
      t.id,
      t.key,
      t.title,
      t.description,
      t.status,
      t.created_at,
      t.updated_at,
      COUNT(c.id) as comment_count
    FROM tickets t
    LEFT JOIN comments c ON c.ticket_id = t.id
    ${whereClause}
    GROUP BY t.id
    ORDER BY ${orderColumn} ${orderDir}, t.id ${orderDir}
  `;

  const rows = db.prepare(sql).all(...params) as Array<{
    id: number;
    key: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
    comment_count: number;
  }>;

  const tickets: Ticket[] = rows.map(r => ({
    id: r.id,
    key: r.key,
    title: r.title,
    description: r.description,
    status: r.status as TicketStatus,
    created_at: r.created_at,
    updated_at: r.updated_at,
    comment_count: Number(r.comment_count || 0),
  }));

  return {
    tickets,
    total: tickets.length,
    counts,
  };
}

export function getSystemStats(): SystemStats {
  const db = getDb();
  const dbPath = currentDbPath || getDatabasePath();

  let sizeBytes = 0;
  let lastModified = new Date().toISOString();

  if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
    try {
      const stats = fs.statSync(dbPath);
      sizeBytes = stats.size;
      lastModified = stats.mtime.toISOString();
    } catch {
      // ignore
    }
  }

  const totalTickets = (db.prepare('SELECT COUNT(*) as c FROM tickets').get() as { c: number }).c;
  const statusRows = db.prepare('SELECT status, COUNT(*) as c FROM tickets GROUP BY status').all() as Array<{ status: string; c: number }>;
  const statusBreakdown: Record<string, number> = {};
  for (const s of statusRows) {
    statusBreakdown[s.status] = Number(s.c);
  }

  const totalComments = (db.prepare('SELECT COUNT(*) as c FROM comments').get() as { c: number }).c;

  return {
    database_path: dbPath,
    database_size_bytes: sizeBytes,
    total_tickets: totalTickets,
    status_breakdown: statusBreakdown,
    total_comments: totalComments,
    last_modified: lastModified,
  };
}

export function exportAll(): BackupData {
  const db = getDb();
  const tickets = db.prepare(`
    SELECT t.id, t.key, t.title, t.description, t.status, t.created_at, t.updated_at, COUNT(c.id) as comment_count
    FROM tickets t
    LEFT JOIN comments c ON c.ticket_id = t.id
    GROUP BY t.id
    ORDER BY t.id ASC
  `).all() as Ticket[];

  const comments = db.prepare(`
    SELECT id, ticket_id, text, created_at
    FROM comments
    ORDER BY id ASC
  `).all() as Comment[];

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    tickets,
    comments,
  };
}

export function restoreAll(backup: BackupData): { restoredTickets: number; restoredComments: number } {
  const db = getDb();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // Delete existing
    db.exec('DELETE FROM comments;');
    db.exec('DELETE FROM tickets;');

    let maxKeySeq = 0;

    const insertTicket = db.prepare(`
      INSERT INTO tickets (id, key, title, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of backup.tickets) {
      insertTicket.run(t.id, t.key, t.title, t.description || '', t.status, t.created_at, t.updated_at);
      const match = t.key.match(/^LOC-(\d+)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxKeySeq) maxKeySeq = val;
      }
    }

    const insertComment = db.prepare(`
      INSERT INTO comments (id, ticket_id, text, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const c of backup.comments) {
      insertComment.run(c.id, c.ticket_id, c.text, c.created_at);
    }

    const nextCounter = maxKeySeq + 1;
    db.prepare('UPDATE ticket_counter SET next_val = ? WHERE id = 1').run(nextCounter);

    db.exec('COMMIT;');

    return {
      restoredTickets: backup.tickets.length,
      restoredComments: backup.comments.length,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // ignore
    }
    throw err;
  }
}

export function seedSampleDataIfEmpty(): boolean {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM tickets').get() as { c: number }).c;
  if (count > 0) return false;

  const t1 = createTicket({
    title: 'Configure automated local SQLite backup rotation',
    description: 'Ensure tickets and comments can be exported to JSON and restored cleanly on any device.',
    status: 'Updated - In Progress',
  });

  const t2 = createTicket({
    title: 'Verify keyboard navigation across ticket list and details view',
    description: 'Tab order, Escape to close modals, Enter to submit comment or search queries.',
    status: 'New',
  });

  const t3 = createTicket({
    title: 'Initial database schema design and sequence validation',
    description: 'Generated monotonic identifiers (LOC-1, LOC-2, etc.) and enforced ON DELETE CASCADE for comments.',
    status: 'Updated - Closed',
  });

  const t4 = createTicket({
    title: 'Review customer feedback on API token export workflow',
    description: 'Awaiting customer response regarding exported file formats and field mapping requirements.',
    status: 'Updated - Waiting Customer',
  });

  addComment(t1.id, 'Configured JSON export endpoint /api/system/backup for single-click export.');
  addComment(t2.id, 'Verified accessible names for tab order and screen reader announcements.');
  addComment(t3.id, 'Initial schema tested with cascade foreign keys.');
  addComment(t4.id, 'Sent customer questionnaire regarding custom field delimiter preferences.');

  return true;
}
