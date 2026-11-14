import { useRef, useEffect } from 'react';

let bodyLockCount = 0;
let savedBodyOverflow = '';

const acquireBodyLock = () => {
  if (typeof document === 'undefined') return;
  if (bodyLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bodyLockCount += 1;
};

const releaseBodyLock = () => {
  if (typeof document === 'undefined') return;
  if (bodyLockCount <= 0) return;
  bodyLockCount -= 1;
  if (bodyLockCount === 0) {
    document.body.style.overflow = savedBodyOverflow;
  }
};

/**
 * Shared modal behaviour for dialog overlays.
 * Handles Escape key, Tab focus trap, body overflow lock, and focus restoration.
 */
export const useDialogBehaviour = (onClose: () => void, enabled: boolean = true) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    acquireBodyLock();
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      releaseBodyLock();
      previouslyFocused?.focus?.();
    };
  }, [enabled]);

  return panelRef;
};
