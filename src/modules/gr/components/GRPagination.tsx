import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAGE_SIZE_OPTIONS } from '../constants';
import type { GRPaginationState } from '../types';

interface GRPaginationProps {
  pagination: GRPaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function GRPagination({
  pagination,
  onPageChange,
  onPageSizeChange,
}: GRPaginationProps) {
  const firstRow = pagination.totalCount > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastRow = Math.min(pagination.page * pagination.pageSize, pagination.totalCount);

  return (
    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span>
          Showing{' '}
          <strong className="text-slate-800 dark:text-slate-200">{firstRow}</strong> to{' '}
          <strong className="text-slate-800 dark:text-slate-200">{lastRow}</strong> of{' '}
          <strong className="text-slate-800 dark:text-slate-200">{pagination.totalCount}</strong>{' '}
          entries
        </span>

        <div className="hidden sm:flex items-center gap-1 ml-4">
          <span className="text-xs text-slate-400">Rows per page:</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-slate-700 dark:text-slate-300"
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="h-8 px-2 text-xs"
        >
          <ChevronLeft size={14} className="mr-1" /> Previous
        </Button>

        <div className="flex items-center px-2 font-semibold text-slate-700 dark:text-slate-300">
          Page {pagination.page} of {Math.max(1, pagination.totalPages)}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="h-8 px-2 text-xs"
        >
          Next <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
