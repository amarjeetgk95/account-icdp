import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: ReactNode;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  headerActions?: ReactNode;
  footerActions?: ModalAction[];
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
}

const MAX_WIDTH_MAP = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-5xl',
} as const;

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  headerActions,
  footerActions,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  className = '',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onMouseDown={closeOnBackdropClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />
      <div
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in sm:max-h-[85dvh] sm:rounded-2xl dark:border-slate-700 dark:bg-slate-900 ${MAX_WIDTH_MAP[maxWidth]} ${className}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Mobile sheet grab handle */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden dark:bg-slate-600" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 sm:px-5 sm:py-4">
          <h3 id="modal-title" className="text-xs font-heading font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerActions}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">{children}</div>
        {footerActions && footerActions.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-4 pb-safe pt-3 dark:border-slate-700 dark:bg-slate-800/40 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
            {footerActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`btn justify-center ${
                  action.variant === 'danger'
                    ? 'btn-danger'
                    : action.variant === 'secondary'
                    ? 'btn-secondary'
                    : 'btn-primary'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}