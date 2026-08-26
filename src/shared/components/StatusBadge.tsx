import React from 'react';
import { cn } from '@/utils/cn';
import { CheckCircle2, Send, XCircle, FileText } from 'lucide-react';

export type BillStatus = 'draft' | 'submitted' | 'passed' | 'rejected';

const STATUS_CONFIG: Record<BillStatus, {
  label: string;
  className: string;
  icon: React.ElementType;
}> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    icon: FileText,
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800',
    icon: Send,
  },
  passed: {
    label: 'Passed',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800',
    icon: XCircle,
  },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
  className,
}) => {
  const normalizedStatus = (status?.toLowerCase() || 'draft') as BillStatus;
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold ring-1 ring-inset rounded-full whitespace-nowrap',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.className,
        className,
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {config.label}
    </span>
  );
};

export default StatusBadge;
