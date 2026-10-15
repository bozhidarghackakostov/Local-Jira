import { Router, Request, Response } from 'express';
import {
  getAllTickets,
  getTicketByIdOrKey,
  createTicket,
  updateTicket,
  deleteTicket,
  addComment,
  getSystemStats,
  exportAll,
  restoreAll,
  seedSampleDataIfEmpty,
} from './db';
import {
  validateCreateTicket,
  validateUpdateTicket,
  validateComment,
  validateBackupData,
} from './ticketLogic';
import type { StatusFilter, SortField, SortOrder } from '../shared/types';

export const apiRouter = Router();

// GET /api/tickets
apiRouter.get('/tickets', (req: Request, res: Response) => {
  try {
    const status = (req.query.status as StatusFilter) || 'all';
    const search = (req.query.search as string) || '';
    const sortBy = (req.query.sort_by as SortField) || 'created_at';
    const sortOrder = (req.query.sort_order as SortOrder) || 'desc';

    const result = getAllTickets({ status, search, sortBy, sortOrder });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve tickets', message: err.message });
  }
});

// POST /api/tickets
apiRouter.post('/tickets', (req: Request, res: Response) => {
  try {
    const validation = validateCreateTicket(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const ticket = createTicket(validation.data);
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create ticket', message: err.message });
  }
});

// GET /api/tickets/:id
apiRouter.get('/tickets/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = getTicketByIdOrKey(id);

    if (!ticket) {
      res.status(404).json({ error: `Ticket not found with identifier: ${id}` });
      return;
    }

    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve ticket', message: err.message });
  }
});

// PATCH /api/tickets/:id
apiRouter.patch('/tickets/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = validateUpdateTicket(req.body);

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const updated = updateTicket(id, validation.data);
    if (!updated) {
      res.status(404).json({ error: `Ticket not found with identifier: ${id}` });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update ticket', message: err.message });
  }
});

// DELETE /api/tickets/:id
apiRouter.delete('/tickets/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = deleteTicket(id);

    if (!success) {
      res.status(404).json({ error: `Ticket not found with identifier: ${id}` });
      return;
    }

    res.json({ success: true, message: `Ticket ${id} and all related comments were deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete ticket', message: err.message });
  }
});

// POST /api/tickets/:id/comments
apiRouter.post('/tickets/:id/comments', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = validateComment(req.body);

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const comment = addComment(id, validation.text);
    if (!comment) {
      res.status(404).json({ error: `Ticket not found with identifier: ${id}` });
      return;
    }

    res.status(201).json(comment);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add comment', message: err.message });
  }
});

// System endpoints
// GET /api/system/stats
apiRouter.get('/system/stats', (_req: Request, res: Response) => {
  try {
    const stats = getSystemStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get system stats', message: err.message });
  }
});

// GET /api/system/backup
apiRouter.get('/system/backup', (_req: Request, res: Response) => {
  try {
    const backup = exportAll();
    res.setHeader('Content-Disposition', 'attachment; filename="localjira-backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export backup', message: err.message });
  }
});

// POST /api/system/restore
apiRouter.post('/system/restore', (req: Request, res: Response) => {
  try {
    const validation = validateBackupData(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const result = restoreAll(validation.data);
    res.json({
      success: true,
      message: `Successfully restored ${result.restoredTickets} tickets and ${result.restoredComments} comments.`,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore backup', message: err.message });
  }
});

// POST /api/system/seed
apiRouter.post('/system/seed', (_req: Request, res: Response) => {
  try {
    const seeded = seedSampleDataIfEmpty();
    res.json({
      success: true,
      seeded,
      message: seeded ? 'Sample tickets seeded successfully.' : 'Database already contains tickets.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to seed sample data', message: err.message });
  }
});
