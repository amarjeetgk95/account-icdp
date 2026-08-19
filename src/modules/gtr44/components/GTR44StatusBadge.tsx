import { CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

type GTR44Status = 'draft' | 'submitted' | 'passed' | 'objected' | 'ac_adjusted';

interface GTR44StatusBadgeProps {
  status: GTR44Status;
  className?: string;
}

const statusConfig: Record<GTR44Status, { label: string; badgeClass: string; icon: ReactNode }> = {
  draft: {
    label: 'Draft',
    badgeClass: 'badge-neutral',
    icon: <Clock className="w-4 h-4" />
  },
  submitted: {
    label: 'Submitted',
    badgeClass: 'badge-primary',
    icon: <RefreshCw className="w-4 h-4 animate-spin" />
  },
  passed: {
    label: 'Passed',
    badgeClass: 'badge-success',
    icon: <CheckCircle className="w-4 h-4" />
  },
  objected: {
    label: 'Objected',
    badgeClass: 'badge-danger',
    icon: <XCircle className="w-4 h-4" />
  },
  ac_adjusted: {
    label: 'AC Adjusted',
    badgeClass: 'badge-info',
    icon: <AlertCircle className="w-4 h-4" />
  }
};

export function GTR44StatusBadge({ status, className = '' }: GTR44StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`badge ${config.badgeClass} ${className}`}
      title={`Status: ${config.label}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
