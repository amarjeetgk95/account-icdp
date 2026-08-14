import { useEffect, useState, type ReactNode } from 'react';
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
  const [lastOpen, setLastOpen] = useState(open);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setTyped('');
  }

  useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, onCancel]);

  if (!open) return null;

  const confirmed = !requireText || typed.trim().toLowerCase() === requireText.toLowerCase();

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4 animate-fade-in"
      onMouseDown={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {(IconProp || danger) && (
              IconProp
                ? <IconProp size={18} className={danger ? 'text-red-600 shrink-0' : 'text-slate-500 shrink-0'} />
                : <AlertTriangle size={18} className="text-red-600 shrink-0" />
            )}
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {message && <div className="text-sm text-slate-600">{message}</div>}
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

        <div className="flex justify-end gap-2 px-5 py-4 bg-slate-50/70 border-t border-slate-100">
          <button onClick={onCancel} className="btn btn-secondary" disabled={busy}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || busy}
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
      </div>,
    document.body
  );
}
