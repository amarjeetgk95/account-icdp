import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EstablishmentSyncStatusBadgeProps {
  lastSyncedAt?: string | null;
  isHydrating?: boolean;
  onSync?: () => void;
  className?: string;
}

export function EstablishmentSyncStatusBadge({
  lastSyncedAt,
  isHydrating = false,
  onSync,
  className,
}: EstablishmentSyncStatusBadgeProps) {
  const label = isHydrating
    ? 'Syncing…'
    : lastSyncedAt
      ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Local only';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-semibold rounded-full px-2.5 py-1 ring-1 ring-inset whitespace-nowrap',
        isHydrating
          ? 'bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800'
          : lastSyncedAt
            ? 'bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800'
            : 'bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800',
        className
      )}
      title={
        lastSyncedAt
          ? `Last synced from backend at ${new Date(lastSyncedAt).toLocaleString()}`
          : 'Not yet synced with the backend'
      }
    >
      {isHydrating ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : lastSyncedAt ? (
        <Cloud className="h-3 w-3" />
      ) : (
        <CloudOff className="h-3 w-3" />
      )}
      {label}
      {onSync && !isHydrating && (
        <button
          type="button"
          onClick={onSync}
          className="ml-1 underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-300"
          title="Re-sync from backend"
        >
          Sync
        </button>
      )}
    </span>
  );
}

export default EstablishmentSyncStatusBadge;
