import React from 'react';
import {
  Layers,
  CircleDot,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Shield,
} from 'lucide-react';
import type { StatusFilter, TicketCounts } from '../shared/types';

interface SidebarProps {
  currentFilter: StatusFilter;
  onSelectFilter: (filter: StatusFilter) => void;
  counts: TicketCounts;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCreate: () => void;
  onOpenSettings: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onSelectFilter,
  counts,
  isCollapsed,
  onToggleCollapse,
  onOpenCreate,
  onOpenSettings,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'all' as StatusFilter,
      label: 'All Tickets',
      icon: Layers,
      count: counts.all,
    },
    {
      id: 'new' as StatusFilter,
      label: 'New',
      icon: CircleDot,
      count: counts.byStatus?.['New'] || 0,
    },
    {
      id: 'in_progress' as StatusFilter,
      label: 'In Progress',
      icon: Circle,
      count: counts.byStatus?.['Updated - In Progress'] || 0,
    },
    {
      id: 'waiting_customer' as StatusFilter,
      label: 'Waiting Customer',
      icon: Clock,
      count: counts.byStatus?.['Updated - Waiting Customer'] || 0,
    },
    {
      id: 'closed' as StatusFilter,
      label: 'Closed',
      icon: CheckCircle2,
      count: (counts.byStatus?.['Updated - Closed'] || 0) + (counts.byStatus?.['Closed'] || 0) + (counts.byStatus?.['Resolved'] || 0),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-200 ease-in-out shrink-0 select-none ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Brand / Logo Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 shrink-0 font-bold text-sm tracking-tight shadow-xs">
              LJ
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                  LocalJira
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">
                  SQLite Local Edition
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex items-center justify-center w-7 h-7 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action: Create Ticket */}
        <div className="p-3">
          <button
            onClick={() => {
              onOpenCreate();
              onCloseMobile();
            }}
            title="Create Ticket"
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xs ${
              isCollapsed ? 'p-2' : ''
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Create Ticket</span>}
          </button>
        </div>

        {/* Navigation Filters */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Ticket views">
          <div className={`px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider ${isCollapsed ? 'hidden' : 'block'}`}>
            Views
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectFilter(item.id);
                  onCloseMobile();
                }}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                />
                {!isCollapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!isCollapsed && (
                  <span
                    className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-400 bg-neutral-100 dark:bg-neutral-800'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Settings */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            title="Settings & Storage"
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors text-left"
          >
            <Settings className="w-4 h-4 shrink-0 text-neutral-400" />
            {!isCollapsed && <span className="flex-1 truncate">Settings</span>}
          </button>

          {!isCollapsed && (
            <div className="mt-2 pt-2 px-3 py-1 flex items-center gap-2 text-[10px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/60">
              <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="truncate">Local SQLite · 100% Private</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
