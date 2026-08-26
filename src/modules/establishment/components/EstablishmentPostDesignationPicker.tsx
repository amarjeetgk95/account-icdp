import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { ESTABLISHMENT_POST_OPTIONS } from '../constants/establishmentPostCatalog';

interface EstablishmentPostDesignationPickerProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
}

interface PickerPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

export function EstablishmentPostDesignationPicker({
  value,
  onChange,
  id,
}: EstablishmentPostDesignationPickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const suppressFocusOpenRef = useRef(false);

  const query = value.trim().toLocaleLowerCase();
  const options = useMemo(
    () =>
      ESTABLISHMENT_POST_OPTIONS.filter((option) =>
        `${option.name} ${option.gujaratiName ?? ''} ${option.payLevel}`
          .toLocaleLowerCase()
          .includes(query)
      ),
    [query]
  );
  const exactMatch = ESTABLISHMENT_POST_OPTIONS.some(
    (option) => option.name.toLocaleLowerCase() === query
  );

  // Total selectable items = filtered options + maybe "keep custom" row
  const hasCustomOption = Boolean(value && !exactMatch);
  const totalNavigable = options.length + (hasCustomOption ? 1 : 0);

  const activeId = open && totalNavigable > 0
    ? (activeIndex < options.length
        ? `${id}-opt-${activeIndex}`
        : `${id}-opt-custom`)
    : undefined;

  // Reset active index when query changes or options length changes
  useEffect(() => {
    if (!open) return;
    // Prefer selected value if present
    const selectedIdx = options.findIndex((o) => o.name.toLocaleLowerCase() === query);
    if (selectedIdx >= 0) setActiveIndex(selectedIdx);
    else setActiveIndex(0);
  }, [query, open, options]);

  // Keep activeIndex within bounds
  useEffect(() => {
    if (activeIndex >= totalNavigable) setActiveIndex(Math.max(0, totalNavigable - 1));
  }, [totalNavigable, activeIndex]);

  // Scroll active into view
  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const openPicker = () => {
    if (suppressFocusOpenRef.current) {
      suppressFocusOpenRef.current = false;
      return;
    }
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 360), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const menuHeight = 288;
    const opensUp = rect.bottom + menuHeight > window.innerHeight && rect.top > menuHeight;

    setPosition(
      opensUp
        ? { left, width, bottom: window.innerHeight - rect.top + 4 }
        : { left, width, top: rect.bottom + 4 }
    );
    setOpen(true);
    // set active to selected or 0
    const selectedIdx = options.findIndex((o) => o.name === value);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
  };

  const closePicker = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleScrollOrResize = (event: Event) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      const input = inputRef.current;
      if (!input) {
        setOpen(false);
        return;
      }
      const rect = input.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const width = Math.min(Math.max(rect.width, 360), window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const menuHeight = 288;
      const opensUp = rect.bottom + menuHeight > window.innerHeight && rect.top > menuHeight;
      setPosition(
        opensUp
          ? { left, width, bottom: window.innerHeight - rect.top + 4 }
          : { left, width, top: rect.bottom + 4 }
      );
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        inputRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open]);

  const choose = (name: string) => {
    onChange(name);
    suppressFocusOpenRef.current = true;
    setOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      setTimeout(() => {
        suppressFocusOpenRef.current = false;
      }, 150);
    });
  };

  const chooseActive = () => {
    if (!open || totalNavigable === 0) return;
    if (activeIndex < options.length) {
      choose(options[activeIndex].name);
    } else if (hasCustomOption) {
      choose(value);
    }
  };

  const clearValue = () => {
    onChange('');
    setActiveIndex(0);
    openPicker();
    inputRef.current?.focus();
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        openPicker();
      } else {
        setActiveIndex((prev) => (prev + 1) % Math.max(1, totalNavigable));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openPicker();
        setActiveIndex(totalNavigable - 1);
      } else {
        setActiveIndex((prev) => (prev - 1 + totalNavigable) % totalNavigable);
      }
    } else if (event.key === 'Enter') {
      if (open && totalNavigable > 0) {
        // If user pressed Enter, select active option, prevent form submit
        event.preventDefault();
        chooseActive();
      }
    } else if (event.key === 'Home') {
      if (open) {
        event.preventDefault();
        setActiveIndex(0);
      }
    } else if (event.key === 'End') {
      if (open) {
        event.preventDefault();
        setActiveIndex(totalNavigable - 1);
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        closePicker();
      }
    } else if (event.key === 'Tab') {
      if (open) closePicker();
    } else if (event.key === 'PageDown') {
      if (open) {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(totalNavigable - 1, prev + 5));
      }
    } else if (event.key === 'PageUp') {
      if (open) {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(0, prev - 5));
      }
    }
  };

  const menu = open && position && (
    <div
      ref={menuRef}
      id={`${id}-options`}
      role="listbox"
      aria-label="Cadre posts — હોદ્દા"
      style={position}
      className="fixed z-[60] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-slate-100 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-3 w-3" />
        <span>{options.length} cadre options</span>
        <span className="ml-2 hidden sm:inline text-[10px] font-normal normal-case text-slate-400">↑↓ navigate · Enter select · Esc close</span>
        {value && (
          <button
            type="button"
            tabIndex={-1}
            onClick={clearValue}
            className="ml-auto rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Clear post search (Esc)"
            aria-label="Clear post search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {options.map((option, idx) => {
        const isActive = open && activeIndex === idx;
        const isSelected = option.name === value;
        return (
          <button
            key={option.name}
            id={`${id}-opt-${idx}`}
            ref={(el) => {
              optionRefs.current[idx] = el;
            }}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => choose(option.name)}
            onMouseEnter={() => setActiveIndex(idx)}
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800'
                : 'hover:bg-blue-50 dark:hover:bg-blue-950/40',
              isSelected && !isActive && 'bg-blue-50/60 dark:bg-blue-950/30'
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-serif font-semibold text-slate-800 dark:text-slate-100">
                {option.name}
                {option.gujaratiName && (
                  <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                    ({option.gujaratiName})
                  </span>
                )}
                {isSelected && <Check className="ml-1.5 inline h-3 w-3 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-400">
                Sr. {ESTABLISHMENT_POST_OPTIONS.indexOf(option) + 1} · Pay {option.payLevel}
              </span>
            </span>
            <span className="shrink-0 font-mono text-[10px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {option.minPay > 0 ? `₹${option.minPay.toLocaleString('en-IN')}` : '—'}
            </span>
          </button>
        );
      })}

      {options.length === 0 && (
        <div className="px-2.5 py-4 text-center text-xs text-slate-500">
          No catalogue match. Continue typing to keep a custom post name.
        </div>
      )}
      {hasCustomOption && (
        <button
          id={`${id}-opt-custom`}
          ref={(el) => {
            optionRefs.current[options.length] = el;
          }}
          type="button"
          role="option"
          aria-selected={false}
          onClick={() => choose(value)}
          onMouseEnter={() => setActiveIndex(options.length)}
          className={cn(
            'mt-1 w-full border-t border-dashed border-slate-200 px-2.5 py-2 text-left text-xs font-semibold dark:border-slate-700',
            activeIndex === options.length
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800 rounded-lg'
              : 'text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40 rounded-lg'
          )}
        >
          Keep custom post: “{value}”
        </button>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={activeId}
        onFocus={openPicker}
        onClick={openPicker}
        onChange={(event) => {
          onChange(event.target.value);
          // keep active at top while typing
          setActiveIndex(0);
          if (!open) openPicker();
        }}
        onKeyDown={onInputKeyDown}
        autoComplete="off"
        placeholder="Search or select cadre/post — હોદ્દો શોધો"
        className="h-8 bg-white pr-8 font-serif text-xs font-bold dark:bg-slate-900 focus-visible:ring-blue-600"
      />
      <ChevronDown
        className={cn(
          'pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-transform',
          open && 'rotate-180 text-blue-600'
        )}
        aria-hidden="true"
      />
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
