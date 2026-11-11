import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  requireText?: string;
  busy?: boolean;
  children?: ReactNode;
  icon?: LucideIcon;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  requireText,
  busy,
  children,
  icon: IconProp,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  const handleCancel = useCallback(() => {
    setTyped('');
    onCancel();
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    setTyped('');
    onConfirm();
  }, [onConfirm]);

  useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleCancel();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, handleCancel]);

  if (!open) return null;

  const confirmed = !requireText || typed.trim().toLowerCase() === requireText.toLowerCase();

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4"
      onMouseDown={handleCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in sm:max-h-[85dvh] sm:rounded-xl dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden dark:bg-slate-600" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-slate-100 sm:px-5 sm:py-4 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            {(IconProp || danger) && (
              IconProp
                ? <IconProp size={18} className={danger ? 'text-red-600 shrink-0' : 'text-slate-500 shrink-0'} />
                : <AlertTriangle size={18} className="text-red-600 shrink-0" />
            )}
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          </div>
          <button
            onClick={handleCancel}
            className="w-9 h-9 -mr-1 -mt-1 shrink-0 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {message && <div className="text-xs text-slate-600 dark:text-slate-300">{message}</div>}
          {children}

          {requireText && (
            <div>
              <label className="label">Type &quot;{requireText}&quot; to confirm</label>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="input"
                placeholder={requireText}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 pb-safe pt-3 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
          <button onClick={handleCancel} className="btn btn-secondary justify-center" disabled={busy}>
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || busy}
            className={`btn justify-center ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
