import React, { useEffect, useState } from 'react';
import { getGtr44SyncStatus, subscribeGtr44Sync, Gtr44SyncPhase } from '../services/gtr44Sync.service';

const PHASE_CONFIG: Record<Gtr44SyncPhase, { label: string; className: string; dot: string }> = {
  idle: { label: 'Local only', className: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  pending: { label: 'Pending sync', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  syncing: { label: 'Syncing…', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500 animate-pulse' },
  synced: { label: 'Synced', className: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  error: { label: 'Sync error', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

export interface GTR44SyncBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export const GTR44SyncBadge: React.FC<GTR44SyncBadgeProps> = ({ className = '', showLabel = true }) => {
  const [phase, setPhase] = useState<Gtr44SyncPhase>(() => getGtr44SyncStatus());

  useEffect(() => {
    const unsub = subscribeGtr44Sync(() => setPhase(getGtr44SyncStatus()));
    return unsub;
  }, []);

  const cfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.className} ${className}`}
      title={`GTR-44 sync status: ${phase}`}
      aria-live="polite"
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} aria-hidden />
      {showLabel ? cfg.label : null}
    </span>
  );
};

export default GTR44SyncBadge;
