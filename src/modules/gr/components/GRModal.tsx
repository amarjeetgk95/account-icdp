import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface GRModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
  maxHeightClass?: string;
  isFullscreen?: boolean;
  closeOnBackdrop?: boolean;
  ariaLabelledBy?: string;
}

export function GRModal({
  isOpen,
  onClose,
  children,
  maxWidthClass = 'max-w-2xl',
  maxHeightClass = 'max-h-[90vh]',
  isFullscreen = false,
  closeOnBackdrop = true,
  ariaLabelledBy,
}: GRModalProps) {
  const generatedId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const scrollers = Array.from(document.querySelectorAll<HTMLElement>('.app-scroll'));
    const previousBodyOverflow = document.body.style.overflow;
    const previous = scrollers.map((el) => el.style.overflow);
    document.body.style.overflow = 'hidden';
    scrollers.forEach((el) => {
      el.style.overflow = 'hidden';
    });
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      scrollers.forEach((el, index) => {
        el.style.overflow = previous[index];
      });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 ${
        isFullscreen ? 'p-0' : 'p-3 sm:p-4'
      }`}
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy || generatedId}
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col ${
          isFullscreen
            ? 'h-full rounded-none border-0'
            : `${maxWidthClass} ${maxHeightClass} rounded-2xl`
        }`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
