import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { useGTR30EmployeeMasterSyncStatus } from '../hooks/useGTR30EmployeeMasterSync';
import type { Gtr30SyncPhase } from '../services/gtr30EmployeeMaster.service';

const PHASE_LABEL: Record<Gtr30SyncPhase, string> = {
  idle: 'All changes saved',
  pending: 'Waiting to sync',
  syncing: 'Syncing to server',
  synced: 'All changes saved',
  error: 'Sync failed - will retry',
};

const PHASE_STYLES: Record<Gtr30SyncPhase, string> = {
  idle: 'text-slate-600 bg-slate-100 border-slate-200',
  synced: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  syncing: 'text-blue-700 bg-blue-50 border-blue-200',
  error: 'text-red-700 bg-red-50 border-red-200',
};

export function GTR30SyncStatusBadge() {
  const status = useGTR30EmployeeMasterSyncStatus();
  const { phase, pendingCount, errorCount } = status;

  const Icon =
    phase === 'syncing'
      ? RefreshCw
      : phase === 'pending'
        ? Clock
        : phase === 'error'
          ? AlertTriangle
          : CheckCircle2;

  const title =
    phase === 'error'
      ? `${errorCount} group(s) failed to sync to the server`
      : phase === 'pending'
        ? `${pendingCount} group(s) waiting to sync to the server`
        : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${PHASE_STYLES[phase]}`}
      title={title}
      role="status"
    >
      <Icon className={`h-3.5 w-3.5 ${phase === 'syncing' ? 'animate-spin' : ''}`} />
      {PHASE_LABEL[phase]}
    </span>
  );
}
