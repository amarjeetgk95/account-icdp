import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GRModal } from './GRModal';
import type { GRRecord } from '../types';

interface GRDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  gr: GRRecord | null;
  isDeleting: boolean;
}

export function GRDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  gr,
  isDeleting,
}: GRDeleteDialogProps) {
  return (
    <GRModal
      isOpen={isOpen && !!gr}
      onClose={onClose}
      maxWidthClass="max-w-md"
      maxHeightClass="max-h-[90vh]"
      closeOnBackdrop={!isDeleting}
      ariaLabelledBy="gr-delete-title"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h3 id="gr-delete-title" className="text-xs font-bold text-slate-900 dark:text-white">
              Permanently Delete GR?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This action cannot be undone. The database record and the associated PDF file will be
              permanently removed from storage.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 shrink-0">GR Number:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{gr?.gr_number}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 shrink-0">Title:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{gr?.title}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 shrink-0">File:</span>
            <span className="font-medium text-slate-600 dark:text-slate-400 truncate">{gr?.file_name}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} className="mr-1.5" /> Permanently Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </GRModal>
  );
}
