import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  HardDrive,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { SystemStats, BackupData } from '../shared/types';
import { api } from '../services/api';
import { formatDateTime } from '../utils/date';
import type { Theme } from '../hooks/useTheme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onDataChanged: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  onDataChanged,
  showToast,
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSystemStats();
      setStats(data);
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const backup = await api.getBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `localjira-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Database backup downloaded successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to download backup', 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsRestoring(true);
        setRestoreError(null);
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as BackupData;

        const result = await api.restoreBackup(parsed);
        showToast(result.message, 'success');
        await loadStats();
        onDataChanged();
      } catch (err: any) {
        setRestoreError(err.message || 'Invalid backup file');
        showToast('Failed to restore backup', 'error');
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSeedData = async () => {
    try {
      const res = await api.seedDemoData();
      showToast(res.message, res.seeded ? 'success' : 'info');
      await loadStats();
      onDataChanged();
    } catch (err: any) {
      showToast(err.message || 'Failed to seed sample data', 'error');
    }
  };

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <HardDrive className="w-4 h-4" />
            </div>
            <h2 id="settings-title" className="text-base font-semibold text-neutral-900 dark:text-white">
              LocalJira Settings & Storage
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Privacy & Guarantee Card */}
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-semibold text-neutral-900 dark:text-white block">
                Local-First & Zero Telemetry
              </span>
              <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                All tickets, comments, and configurations are stored purely inside your local SQLite database file. No external analytics, cloud servers, or third-party tracking.
              </p>
            </div>
          </div>

          {/* Database Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                SQLite Storage Details
              </h3>
              <button
                onClick={loadStats}
                disabled={isLoading}
                className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Database Path</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate max-w-[260px] text-[11px]" title={stats?.database_path}>
                  {stats?.database_path || './data/localjira.db'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Database Size</span>
                <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200 font-medium">
                  {stats ? formatBytes(stats.database_size_bytes) : '...'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Total Tickets</span>
                <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                  {stats?.total_tickets ?? 0}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Total Comments</span>
                <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                  {stats?.total_comments ?? 0}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Last Modified</span>
                <span className="tabular-nums text-neutral-800 dark:text-neutral-200">
                  {stats?.last_modified ? formatDateTime(stats.last_modified) : '...'}
                </span>
              </div>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Backup & Data Portability
            </h3>

            {restoreError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-left transition-colors flex items-start gap-3"
              >
                <Download className="w-4 h-4 text-neutral-600 dark:text-neutral-300 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                    Export Backup (JSON)
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight block mt-0.5">
                    Download full archive of tickets and comments.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-left transition-colors flex items-start gap-3 disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-neutral-600 dark:text-neutral-300 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                    {isRestoring ? 'Restoring...' : 'Restore from JSON'}
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight block mt-0.5">
                    Restore database from a previous JSON backup.
                  </span>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleSeedData}
                className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Seed initial starter tickets (if empty)</span>
              </button>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Appearance
            </h3>
            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-neutral-300" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900/80 border-t border-neutral-200 dark:border-neutral-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
