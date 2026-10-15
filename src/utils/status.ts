export interface StatusConfig {
  label: string;
  badgeClass: string;
  isClosed: boolean;
}

export function getStatusConfig(status: string): StatusConfig {
  const s = (status || '').toLowerCase().trim();

  if (s === 'new') {
    return {
      label: 'New',
      badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900/40',
      isClosed: false,
    };
  }

  if (s === 'updated - in progress' || s === 'in progress') {
    return {
      label: 'Updated - In Progress',
      badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
      isClosed: false,
    };
  }

  if (s === 'updated - waiting customer' || s === 'waiting customer' || s === 'updated - waitin customer') {
    return {
      label: 'Updated - Waiting Customer',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/40',
      isClosed: false,
    };
  }

  if (s === 'updated - closed' || s === 'closed' || s === 'updated and closed') {
    return {
      label: 'Updated - Closed',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
      isClosed: true,
    };
  }

  if (s === 'open') {
    return {
      label: 'Open',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/40',
      isClosed: false,
    };
  }

  if (s === 'resolved') {
    return {
      label: 'Resolved',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
      isClosed: true,
    };
  }

  return {
    label: status,
    badgeClass: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700',
    isClosed: false,
  };
}
