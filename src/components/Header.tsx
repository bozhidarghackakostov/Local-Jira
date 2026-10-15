import React from 'react';
import { Menu, Sun, Moon, Plus, Settings } from 'lucide-react';
import type { StatusFilter } from '../shared/types';
import type { Theme } from '../hooks/useTheme';

interface HeaderProps {
  currentFilter: StatusFilter;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenCreate: () => void;
  onOpenSettings: () => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentFilter,
  theme,
  onToggleTheme,
  onOpenCreate,
  onOpenSettings,
  onOpenMobileMenu,
}) => {
  const filterTitles: Record<string, string> = {
    all: 'All Tickets',
    new: 'New Tickets',
    in_progress: 'In Progress',
    waiting_customer: 'Waiting Customer',
    closed: 'Closed Tickets',
    open: 'Open Tickets',
    resolved: 'Resolved Tickets',
  };

  return (
    <header className="h-14 px-4 sm:px-6 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xs flex items-center justify-between gap-4 shrink-0">
      {/* Zone 1: Breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
          className="md:hidden p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium" aria-label="Breadcrumb">
          <span className="hidden sm:inline">LocalJira</span>
          <span className="hidden sm:inline text-neutral-300 dark:text-neutral-600">/</span>
          <span className="text-neutral-900 dark:text-white font-semibold whitespace-nowrap">
            {filterTitles[currentFilter]}
          </span>
        </nav>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenSettings}
          aria-label="Settings and database"
          title="Settings and database"
          className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenCreate}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Ticket</span>
        </button>
      </div>
    </header>
  );
};
