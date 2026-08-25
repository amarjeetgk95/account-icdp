import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface EstablishmentClassOption {
  value: string;
  labelGu: string;
  labelEn: string;
  shortGu: string;
}

// Gujarati class options — વર્ગ ૧ to વર્ગ ૪
export const ESTABLISHMENT_CLASS_OPTIONS: EstablishmentClassOption[] = [
  { value: '૧', labelGu: 'વર્ગ ૧', labelEn: 'Class 1', shortGu: '૧' },
  { value: '૨', labelGu: 'વર્ગ ૨', labelEn: 'Class 2', shortGu: '૨' },
  { value: '૩', labelGu: 'વર્ગ ૩', labelEn: 'Class 3', shortGu: '૩' },
  { value: '૪', labelGu: 'વર્ગ ૪', labelEn: 'Class 4', shortGu: '૪' },
];

// Normalize Arabic/Gujarati numerals to Gujarati
function normalizeClassValue(raw: string | undefined): string {
  if (!raw) return '';
  const v = raw.trim();
  const map: Record<string, string> = {
    '1': '૧',
    '2': '૨',
    '3': '૩',
    '4': '૪',
    '૧': '૧',
    '૨': '૨',
    '૩': '૩',
    '૪': '૪',
  };
  return map[v] ?? v;
}

interface EstablishmentClassPickerProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
  placeholder?: string;
}

interface PickerPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

/**
 * Gujarati Class (વર્ગ) dropdown — keyboard friendly
 * - Tab to focus, Enter/Space/ArrowDown to open
 * - ArrowUp/ArrowDown to navigate, Home/End to jump
 * - Enter to select, Escape to close, Tab to close and move next
 * - Fully ARIA compliant with roving tabindex
 */
export function EstablishmentClassPicker({
  value,
  onChange,
  id,
  placeholder = 'વર્ગ પસંદ કરો',
}: EstablishmentClassPickerProps) {
  const normalized = normalizeClassValue(value);
  const selected = ESTABLISHMENT_CLASS_OPTIONS.find((o) => o.value === normalized) ?? null;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const idx = ESTABLISHMENT_CLASS_OPTIONS.findIndex((o) => o.value === normalized);
    return idx >= 0 ? idx : 0;
  });
  const [position, setPosition] = useState<PickerPosition | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const listId = `${id}-class-listbox`;
  const activeDescendant = open
    ? `${id}-class-opt-${ESTABLISHMENT_CLASS_OPTIONS[activeIndex]?.value ?? 'none'}`
    : undefined;

  // Sync active index when value/open changes
  useEffect(() => {
    if (open) {
      const idx = ESTABLISHMENT_CLASS_OPTIONS.findIndex((o) => o.value === normalized);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [open, normalized]);

  // Scroll active option into view
  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const calcPosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const menuHeight = 200;
    const opensUp = rect.bottom + menuHeight > window.innerHeight && rect.top > menuHeight;
    setPosition(
      opensUp
        ? { left, width, bottom: window.innerHeight - rect.top + 4 }
        : { left, width, top: rect.bottom + 4 }
    );
  };

  const openPicker = () => {
    calcPosition();
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
  };

  const togglePicker = () => {
    if (open) closePicker();
    else openPicker();
  };

  const choose = (val: string) => {
    onChange(val);
    closePicker();
    // return focus to button for keyboard continuity
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  // Outside click / scroll / resize handling
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closePicker();
    };
    const handleScrollOrResize = (event: Event) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      const btn = buttonRef.current;
      if (!btn) {
        closePicker();
        return;
      }
      const rect = btn.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        closePicker();
        return;
      }
      calcPosition();
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open]);

  // Keyboard handling on trigger
  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openPicker();
        // set active to first/last
        if (e.key === 'ArrowUp') setActiveIndex(ESTABLISHMENT_CLASS_OPTIONS.length - 1);
        else setActiveIndex(0);
      } else {
        // navigate while open
        setActiveIndex((prev) => {
          if (e.key === 'ArrowDown') return (prev + 1) % ESTABLISHMENT_CLASS_OPTIONS.length;
          return (prev - 1 + ESTABLISHMENT_CLASS_OPTIONS.length) % ESTABLISHMENT_CLASS_OPTIONS.length;
        });
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) openPicker();
      else choose(ESTABLISHMENT_CLASS_OPTIONS[activeIndex].value);
    } else if (e.key === 'Home') {
      if (open) {
        e.preventDefault();
        setActiveIndex(0);
      }
    } else if (e.key === 'End') {
      if (open) {
        e.preventDefault();
        setActiveIndex(ESTABLISHMENT_CLASS_OPTIONS.length - 1);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        closePicker();
      }
    } else if (e.key === 'Tab') {
      if (open) closePicker();
    } else if (['1', '2', '3', '4', '૧', '૨', '૩', '૪'].includes(e.key)) {
      // type-ahead quick select
      const norm = normalizeClassValue(e.key);
      const idx = ESTABLISHMENT_CLASS_OPTIONS.findIndex((o) => o.value === norm);
      if (idx >= 0) {
        e.preventDefault();
        if (!open) openPicker();
        setActiveIndex(idx);
        // optionally auto-select
        // choose(norm);
      }
    }
  };

  // Keyboard handling when menu is open (global for Home/End/Arrow)
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % ESTABLISHMENT_CLASS_OPTIONS.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + ESTABLISHMENT_CLASS_OPTIONS.length) % ESTABLISHMENT_CLASS_OPTIONS.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(ESTABLISHMENT_CLASS_OPTIONS.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(ESTABLISHMENT_CLASS_OPTIONS[activeIndex].value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePicker();
      buttonRef.current?.focus();
    } else if (e.key === 'Tab') {
      closePicker();
    }
  };

  const menu = open && position ? (
    <div
      ref={menuRef}
      id={listId}
      role="listbox"
      aria-labelledby={id}
      tabIndex={-1}
      onKeyDown={onMenuKeyDown}
      style={position}
      className="fixed z-[60] max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="sticky top-0 z-10 mb-1 flex items-center gap-1.5 border-b border-slate-100 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        <span className="font-serif">વર્ગ — Cadre Class</span>
        <span className="ml-auto font-mono text-[10px]">૪ વિકલ્પો</span>
      </div>
      {ESTABLISHMENT_CLASS_OPTIONS.map((opt, idx) => {
        const isSelected = normalized === opt.value;
        const isActive = idx === activeIndex;
        return (
          <button
            key={opt.value}
            id={`${id}-class-opt-${opt.value}`}
            ref={(el) => {
              optionRefs.current[idx] = el;
            }}
            type="button"
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
            onClick={() => choose(opt.value)}
            onMouseEnter={() => setActiveIndex(idx)}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
              isSelected && !isActive && 'bg-slate-50 dark:bg-slate-800 font-semibold'
            )}
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-serif font-bold text-sm dark:bg-white dark:text-slate-900">
                {opt.shortGu}
              </span>
              <span>
                <span className="block text-xs font-serif font-bold text-slate-800 dark:text-slate-100">{opt.labelGu}</span>
                <span className="block text-[10px] font-medium text-slate-400">{opt.labelEn}</span>
              </span>
            </span>
            {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
          </button>
        );
      })}
      {/* Clear option */}
      {normalized && (
        <button
          type="button"
          onClick={() => choose('')}
          className="mt-1 w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Clear — ખાલી કરો
        </button>
      )}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeDescendant}
        aria-label="Select cadre class — વર્ગ પસંદ કરો"
        onClick={togglePicker}
        onKeyDown={onButtonKeyDown}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-1.5 rounded-md border bg-white px-2.5 text-xs font-semibold shadow-sm transition-colors dark:bg-slate-900',
          'border-slate-200 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 dark:border-slate-700 dark:hover:border-slate-600',
          open && 'border-blue-300 ring-2 ring-blue-600 ring-offset-0 dark:border-blue-700',
          !selected && 'text-slate-400 font-normal'
        )}
      >
        <span className="flex items-center gap-1.5 truncate">
          {selected ? (
            <>
              <span className="font-serif font-bold text-slate-800 dark:text-slate-100">{selected.labelGu}</span>
              <span className="hidden sm:inline text-[10px] font-normal text-slate-400">({selected.labelEn})</span>
            </>
          ) : (
            <span className="font-serif">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180 text-blue-600 dark:text-blue-400'
          )}
          aria-hidden="true"
        />
      </button>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
      {/* Hidden input for form accessibility if needed */}
      <span className="sr-only" aria-live="polite">
        {selected ? `Selected ${selected.labelGu} ${selected.labelEn}` : 'No class selected'}
      </span>
    </div>
  );
}

// Helper to coerce legacy values for display/saving
export function coerceClassToGujarati(raw?: string | null): string {
  return normalizeClassValue(raw ?? '');
}
