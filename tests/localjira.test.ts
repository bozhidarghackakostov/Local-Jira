import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTicketKey,
  parseTicketIdOrKey,
  validateCreateTicket,
  validateUpdateTicket,
  validateComment,
  filterAndSortTickets,
  computeCounts,
  isValidStatus,
} from '../src/server/ticketLogic.ts';
import {
  initDatabase,
  closeDatabase,
  createTicket,
  getTicketByIdOrKey,
  updateTicket,
  deleteTicket,
  addComment,
  getAllTickets,
  exportAll,
  restoreAll,
} from '../src/server/db.ts';
import type { Ticket } from '../src/shared/types.ts';

// Configure an in-memory database for isolated, reproducible unit testing
initDatabase(':memory:');

test('Pure Logic - formatTicketKey formats sequence numbers as LOC-X', () => {
  assert.equal(formatTicketKey(1), 'LOC-1');
  assert.equal(formatTicketKey(42), 'LOC-42');
  assert.equal(formatTicketKey(999), 'LOC-999');
  assert.throws(() => formatTicketKey(0), /Sequence must be a positive integer/);
  assert.throws(() => formatTicketKey(-5), /Sequence must be a positive integer/);
});

test('Pure Logic - parseTicketIdOrKey extracts valid keys and numeric IDs', () => {
  assert.deepEqual(parseTicketIdOrKey('LOC-1'), { type: 'key', value: 'LOC-1' });
  assert.deepEqual(parseTicketIdOrKey('loc-12'), { type: 'key', value: 'LOC-12' });
  assert.deepEqual(parseTicketIdOrKey('42'), { type: 'id', value: 42 });
  assert.equal(parseTicketIdOrKey('invalid'), null);
  assert.equal(parseTicketIdOrKey(''), null);
});

test('Pure Logic - validateCreateTicket supports new statuses and defaults to New', () => {
  const defaultStatus = validateCreateTicket({ title: 'Fix bug' });
  assert.equal(defaultStatus.valid, true);
  if (defaultStatus.valid) {
    assert.equal(defaultStatus.data.status, 'New');
  }

  const inProgress = validateCreateTicket({ title: 'Work', status: 'Updated - In Progress' });
  assert.equal(inProgress.valid, true);
  if (inProgress.valid) {
    assert.equal(inProgress.data.status, 'Updated - In Progress');
  }

  const waitingCust = validateCreateTicket({ title: 'Client check', status: 'Updated - Waiting Customer' });
  assert.equal(waitingCust.valid, true);
  if (waitingCust.valid) {
    assert.equal(waitingCust.data.status, 'Updated - Waiting Customer');
  }

  const closed = validateCreateTicket({ title: 'Done check', status: 'Updated - Closed' });
  assert.equal(closed.valid, true);
  if (closed.valid) {
    assert.equal(closed.data.status, 'Updated - Closed');
  }

  const missingTitle = validateCreateTicket({ title: '   ' });
  assert.equal(missingTitle.valid, false);

  const invalidStatus = validateCreateTicket({ title: 'Ok', status: 'Random Invalid Status' as any });
  assert.equal(invalidStatus.valid, false);
});

test('Pure Logic - validateUpdateTicket validates all new statuses', () => {
  const emptyUpdate = validateUpdateTicket({});
  assert.equal(emptyUpdate.valid, false);

  const validTitle = validateUpdateTicket({ title: 'New title' });
  assert.equal(validTitle.valid, true);

  const updateStatus = validateUpdateTicket({ status: 'Updated - In Progress' });
  assert.equal(updateStatus.valid, true);
  if (updateStatus.valid) {
    assert.equal(updateStatus.data.status, 'Updated - In Progress');
  }
});

test('Pure Logic - validateComment rejects empty or whitespace-only comments', () => {
  const empty = validateComment({ text: '  ' });
  assert.equal(empty.valid, false);

  const valid = validateComment({ text: 'Working on this fix today' });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.equal(valid.text, 'Working on this fix today');
  }
});

test('Pure Logic - filterAndSortTickets filters by new statuses correctly', () => {
  const sampleTickets: Ticket[] = [
    {
      id: 1,
      key: 'LOC-1',
      title: 'Alpha Ticket',
      description: 'Search target alpha',
      status: 'New',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-03T00:00:00.000Z',
    },
    {
      id: 2,
      key: 'LOC-2',
      title: 'Beta Ticket',
      description: 'Something else',
      status: 'Updated - In Progress',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 3,
      key: 'LOC-3',
      title: 'Gamma Ticket',
      description: 'Alpha keyword also present here',
      status: 'Updated - Waiting Customer',
      created_at: '2026-01-03T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 4,
      key: 'LOC-4',
      title: 'Delta Ticket',
      description: 'Completed task',
      status: 'Updated - Closed',
      created_at: '2026-01-04T00:00:00.000Z',
      updated_at: '2026-01-04T00:00:00.000Z',
    },
  ];

  // Filter new
  const newOnes = filterAndSortTickets(sampleTickets, { status: 'new' });
  assert.equal(newOnes.length, 1);
  assert.equal(newOnes[0].key, 'LOC-1');

  // Filter in_progress
  const inProg = filterAndSortTickets(sampleTickets, { status: 'in_progress' });
  assert.equal(inProg.length, 1);
  assert.equal(inProg[0].key, 'LOC-2');

  // Filter waiting_customer
  const waitCust = filterAndSortTickets(sampleTickets, { status: 'waiting_customer' });
  assert.equal(waitCust.length, 1);
  assert.equal(waitCust[0].key, 'LOC-3');

  // Filter closed
  const closed = filterAndSortTickets(sampleTickets, { status: 'closed' });
  assert.equal(closed.length, 1);
  assert.equal(closed[0].key, 'LOC-4');

  // Search 'alpha'
  const searched = filterAndSortTickets(sampleTickets, { search: 'alpha' });
  assert.equal(searched.length, 2);
});

test('Database Operations - creates tickets with new statuses and monotonic keys', () => {
  const t1 = createTicket({ title: 'First New Ticket', status: 'New' });
  const t2 = createTicket({ title: 'Second In Progress Ticket', status: 'Updated - In Progress' });
  const t3 = createTicket({ title: 'Third Waiting Ticket', status: 'Updated - Waiting Customer' });
  const t4 = createTicket({ title: 'Fourth Closed Ticket', status: 'Updated - Closed' });

  assert.equal(t1.key, 'LOC-1');
  assert.equal(t1.status, 'New');
  assert.equal(t2.key, 'LOC-2');
  assert.equal(t2.status, 'Updated - In Progress');
  assert.equal(t3.key, 'LOC-3');
  assert.equal(t3.status, 'Updated - Waiting Customer');
  assert.equal(t4.key, 'LOC-4');
  assert.equal(t4.status, 'Updated - Closed');
});

test('Database Operations - retrieves ticket by ID and by key', () => {
  const foundByKey = getTicketByIdOrKey('LOC-1');
  assert.ok(foundByKey);
  assert.equal(foundByKey?.title, 'First New Ticket');

  const foundById = getTicketByIdOrKey(1);
  assert.ok(foundById);
  assert.equal(foundById?.key, 'LOC-1');

  const notFound = getTicketByIdOrKey('LOC-999');
  assert.equal(notFound, null);
});

test('Database Operations - transitions ticket through new statuses', () => {
  const updatedToWait = updateTicket('LOC-1', {
    status: 'Updated - Waiting Customer',
  });
  assert.equal(updatedToWait?.status, 'Updated - Waiting Customer');

  const updatedToClosed = updateTicket('LOC-1', {
    status: 'Updated - Closed',
  });
  assert.equal(updatedToClosed?.status, 'Updated - Closed');

  const verified = getTicketByIdOrKey('LOC-1');
  assert.equal(verified?.status, 'Updated - Closed');
});

test('Database Operations - adds comments and preserves chronological order', () => {
  const c1 = addComment('LOC-1', 'Initial investigation underway.');
  const c2 = addComment('LOC-1', 'Patch committed and verified.');

  assert.ok(c1);
  assert.ok(c2);

  const detail = getTicketByIdOrKey('LOC-1');
  assert.ok(detail);
  assert.equal(detail?.comments.length, 2);
  assert.equal(detail?.comments[0].text, 'Initial investigation underway.');
  assert.equal(detail?.comments[1].text, 'Patch committed and verified.');
  assert.equal(detail?.comment_count, 2);
});

test('Database Operations - queries with filtering, search, and sorting across new statuses', () => {
  const allResult = getAllTickets();
  assert.equal(allResult.counts.all, 4);
  assert.ok(allResult.counts.byStatus['Updated - In Progress'] >= 1);

  // Filter in_progress
  const inProg = getAllTickets({ status: 'in_progress' });
  assert.equal(inProg.tickets.length, 1);
  assert.equal(inProg.tickets[0].key, 'LOC-2');

  // Filter waiting_customer
  const waiting = getAllTickets({ status: 'waiting_customer' });
  assert.equal(waiting.tickets.length, 1);
  assert.equal(waiting.tickets[0].key, 'LOC-3');
});

test('Database Operations - cascade deletes comments when a ticket is deleted', () => {
  const detailBefore = getTicketByIdOrKey('LOC-1');
  assert.ok(detailBefore);
  assert.equal(detailBefore?.comments.length, 2);

  const deleted = deleteTicket('LOC-1');
  assert.equal(deleted, true);

  const detailAfter = getTicketByIdOrKey('LOC-1');
  assert.equal(detailAfter, null);

  const allResult = getAllTickets();
  assert.equal(allResult.counts.all, 3);
});

test('Database Operations - backup export and restore preserves data integrity', () => {
  const backup = exportAll();
  assert.equal(backup.version, 1);
  assert.equal(backup.tickets.length, 3);

  // Add a ticket to verify restore resets properly
  createTicket({ title: 'Temporary Ticket', status: 'New' });
  assert.equal(getAllTickets().total, 4);

  // Restore previous backup
  const restoreResult = restoreAll(backup);
  assert.equal(restoreResult.restoredTickets, 3);

  const afterRestore = getAllTickets();
  assert.equal(afterRestore.total, 3);

  // Next ticket created must respect monotonic key without collision
  const nextTicket = createTicket({ title: 'Post-restore Ticket' });
  assert.ok(/^LOC-\d+$/.test(nextTicket.key));
});
