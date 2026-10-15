import React from 'react';
import {
  Search,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Trash2,
  Inbox,
  FilterX,
  Sparkles,
  Plus,
} from 'lucide-react';
import type { Ticket, TicketStatus, SortField, SortOrder, StatusFilter } from '../shared/types';
import { formatDateTime, formatRelativeTime } from '../utils/date';
import { getStatusConfig } from '../utils/status';

interface TicketTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField) => void;
  onToggleSortOrder: () => void;
  onSelectTicket: (ticket: Ticket) => void;
  onChangeStatus: (ticket: Ticket, nextStatus: TicketStatus) => void;
  onDeleteTicket: (ticket: Ticket, e: React.MouseEvent) => void;
  onOpenCreate: () => void;
  onSeedData: () => void;
}

export const TicketTable: React.FC<TicketTableProps> = ({
  tickets,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  onToggleSortOrder,
  onSelectTicket,
  onChangeStatus,
  onDeleteTicket,
  onOpenCreate,
  onSeedData,
}) => {
  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'created_at', label: 'Date Created' },
    { field: 'updated_at', label: 'Last Updated' },
    { field: 'title', label: 'Title (A-Z)' },
    { field: 'status', label: 'Status' },
  ];

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'waiting_customer', label: 'Waiting Customer' },
    { id: 'closed', label: 'Closed' },
  ];

  const statusOptions: TicketStatus[] = [
    'New',
    'Updated - In Progress',
    'Updated - Waiting Customer',
    'Updated - Closed',
    'Open',
    'Resolved',
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-50/50 dark:bg-neutral-950 p-3 sm:p-6 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-4">
        {/* Top Control Bar: Search & Filter Tabs & Sort Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by ID (LOC-1), title, or description..."
              aria-label="Search tickets"
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs px-1"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0">
            {/* Status Filter Segmented Buttons */}
            <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-x-auto max-w-full" role="tablist" aria-label="Status filter">
              {filterTabs.map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onStatusFilterChange(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Selector & Direction Toggle */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto lg:ml-0">
              <select
                id="sort-select"
                aria-label="Sort by"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortField)}
                className="px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-lg text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.field} value={opt.field}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={onToggleSortOrder}
                aria-label={`Toggle sort direction (currently ${sortOrder === 'asc' ? 'ascending' : 'descending'})`}
                title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-lg transition-colors"
              >
                {sortOrder === 'asc' ? (
                  <ArrowUp className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tickets Container */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
          {isLoading && tickets.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-400 animate-pulse">
              Loading tickets from local database...
            </div>
          ) : tickets.length === 0 ? (
            /* Empty State */
            <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
              {search || statusFilter !== 'all' ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                    <FilterX className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                    No tickets match your filter criteria
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
                    No tickets match the search query "{search}" or the active filter.
                  </p>
                  <button
                    onClick={() => {
                      onSearchChange('');
                      onStatusFilterChange('all');
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    Clear All Filters
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
                    No tickets in LocalJira yet
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mb-6 leading-relaxed">
                    LocalJira keeps all your tasks, bugs, and notes in a private SQLite database on your computer. Create your first ticket to get started.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={onOpenCreate}
                      className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create First Ticket</span>
                    </button>
                    <button
                      onClick={onSeedData}
                      className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load Sample Tickets</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card List (Visible on mobile screens) */}
              <div className="block md:hidden divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {tickets.map((ticket) => {
                  const cfg = getStatusConfig(ticket.status);
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => onSelectTicket(ticket)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSelectTicket(ticket);
                      }}
                      className="p-3.5 flex flex-col gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                          {ticket.key}
                        </span>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <select
                              value={ticket.status}
                              onChange={(e) => onChangeStatus(ticket, e.target.value as TicketStatus)}
                              title="Change status"
                              aria-label={`Status for ${ticket.key}`}
                              className={`px-2 py-0.5 pr-4 rounded text-[10px] font-semibold border transition-colors cursor-pointer appearance-none ${cfg.badgeClass}`}
                            >
                              {statusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] opacity-60">
                              ▾
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => onDeleteTicket(ticket, e)}
                            aria-label={`Delete ticket ${ticket.key}`}
                            className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4
                        className={`text-xs font-medium leading-snug ${
                          cfg.isClosed
                            ? 'text-neutral-400 dark:text-neutral-500 line-through'
                            : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {ticket.title}
                      </h4>

                      {ticket.description && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                          {ticket.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[10px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/60">
                        <span className="tabular-nums">Updated {formatRelativeTime(ticket.updated_at)}</span>
                        {ticket.comment_count && ticket.comment_count > 0 ? (
                          <span className="flex items-center gap-1 font-mono">
                            <MessageSquare className="w-3 h-3" />
                            <span>{ticket.comment_count}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse" aria-label="Ticket table">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/75 dark:bg-neutral-800/40 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider select-none">
                      <th scope="col" className="py-2.5 px-4 w-24">Key</th>
                      <th scope="col" className="py-2.5 px-4">Title & Context</th>
                      <th scope="col" className="py-2.5 px-4 w-44">Status</th>
                      <th scope="col" className="py-2.5 px-4 w-32 hidden md:table-cell">Created</th>
                      <th scope="col" className="py-2.5 px-4 w-28 hidden lg:table-cell">Updated</th>
                      <th scope="col" className="py-2.5 px-4 w-20 text-center">Comments</th>
                      <th scope="col" className="py-2.5 px-4 w-16 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-xs">
                    {tickets.map((ticket) => {
                      const cfg = getStatusConfig(ticket.status);
                      return (
                        <tr
                          key={ticket.id}
                          onClick={() => onSelectTicket(ticket)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onSelectTicket(ticket);
                          }}
                          className="group hover:bg-neutral-50/90 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors focus:bg-neutral-50 dark:focus:bg-neutral-800/40 focus:outline-hidden"
                        >
                          {/* Key */}
                          <td className="py-3 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums whitespace-nowrap">
                            {ticket.key}
                          </td>

                          {/* Title & Description Preview */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span
                                className={`font-medium leading-snug ${
                                  cfg.isClosed
                                    ? 'text-neutral-400 dark:text-neutral-500 line-through'
                                    : 'text-neutral-900 dark:text-white group-hover:text-neutral-950 dark:group-hover:text-white'
                                }`}
                              >
                                {ticket.title}
                              </span>
                              {ticket.description && (
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-lg mt-0.5">
                                  {ticket.description}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status - Fast Row Dropdown */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-flex items-center">
                              <select
                                value={ticket.status}
                                onChange={(e) => onChangeStatus(ticket, e.target.value as TicketStatus)}
                                title="Change status"
                                aria-label={`Status for ${ticket.key}`}
                                className={`px-2.5 py-1 pr-6 rounded text-[11px] font-semibold border transition-all cursor-pointer appearance-none focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white ${cfg.badgeClass}`}
                              >
                                {statusOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] opacity-60">
                                ▾
                              </span>
                            </div>
                          </td>

                          {/* Created Date */}
                          <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 hidden md:table-cell tabular-nums text-[11px]" title={ticket.created_at}>
                            {formatDateTime(ticket.created_at)}
                          </td>

                          {/* Updated Date */}
                          <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 hidden lg:table-cell tabular-nums text-[11px]" title={ticket.updated_at}>
                            {formatRelativeTime(ticket.updated_at)}
                          </td>

                          {/* Comments count */}
                          <td className="py-3 px-4 text-center">
                            {ticket.comment_count && ticket.comment_count > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                                <MessageSquare className="w-3 h-3 text-neutral-400" />
                                <span className="tabular-nums">{ticket.comment_count}</span>
                              </span>
                            ) : (
                              <span className="text-neutral-300 dark:text-neutral-700 text-[11px]">
                                -
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => onDeleteTicket(ticket, e)}
                              aria-label={`Delete ticket ${ticket.key}`}
                              title={`Delete ticket ${ticket.key}`}
                              className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors opacity-80 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Footer info */}
          {tickets.length > 0 && (
            <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
              <span>
                Showing <strong className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">{tickets.length}</strong> ticket{tickets.length === 1 ? '' : 's'}
              </span>
              <span className="hidden sm:inline">
                Click row for full details & comments · Use status dropdown to transition
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
