import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { useEstablishmentPosts } from '../hooks/useEstablishment';
import { ESTABLISHMENT_POST_OPTIONS } from '../constants/establishmentPostCatalog';

interface EstablishmentGujaratiDesignationPickerProps {
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

interface PickerOption {
  designation: string;
  cadreClass?: string;
  sanctioned?: number;
  filled?: number;
  payLevel?: string;
  minPay?: number;
  isSanctioned: boolean;
}

export function EstablishmentGujaratiDesignationPicker({
  value,
  onChange,
  id,
  placeholder = 'Select Gujarati designation — હોદ્દો પસંદ કરો',
}: EstablishmentGujaratiDesignationPickerProps) {
  const postsQuery = useEstablishmentPosts();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const suppressFocusOpenRef = useRef(false);

  // Build unique designations from sanctioned posts.
  // If no sanctioned posts are configured, fall back to the static catalogue
  // so the dropdown is still usable (covers fresh offices).
  const sanctionOptions: PickerOption[] = useMemo(() => {
    const posts = postsQuery.data ?? [];
    const seen = new Map<string, PickerOption>();

    for (const post of posts) {
      const designation = (post.designation ?? '').trim();
      if (!designation) continue;
      const key = designation.toLocaleLowerCase();
      if (seen.has(key)) continue;

      const catalogMatch = ESTABLISHMENT_POST_OPTIONS.find(
        (opt) => opt.name.toLocaleLowerCase() === key
      );

      seen.set(key, {
        designation,
        cadreClass: post.cadreClass,
        sanctioned: post.sanctioned,
        filled: post.filled,
        payLevel: catalogMatch?.payLevel,
        minPay: catalogMatch?.minPay,
        isSanctioned: true,
      });
    }

    if (seen.size > 0) {
      return Array.from(seen.values());
    }

    // Fallback: catalogue when no sanctioned posts exist
    return ESTABLISHMENT_POST_OPTIONS.map((opt) => ({
      designation: opt.name,
      cadreClass: undefined,
      sanctioned: undefined,
      filled: undefined,
      payLevel: opt.payLevel,
      minPay: opt.minPay,
      isSanctioned: false,
    }));
  }, [postsQuery.data]);

  const isUsingFallback = useMemo(() => {
    const posts = postsQuery.data ?? [];
    return posts.filter((p) => (p.designation ?? '').trim()).length === 0;
  }, [postsQuery.data]);

  const query = value.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(
    () =>
      sanctionOptions.filter((option) =>
        option.designation.toLocaleLowerCase().includes(query)
      ),
    [query, sanctionOptions]
  );

  const exactMatch = sanctionOptions.some(
    (option) => option.designation.toLocaleLowerCase() === query
  );

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
  };

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleScrollOrResize = (event: Event) => {
      const target = event.target as Node | null;
      // Don't close/reposition when scrolling inside the dropdown itself
      if (target && menuRef.current?.contains(target)) return;
      const input = inputRef.current;
      if (!input) {
        setOpen(false);
        return;
      }
      const rect = input.getBoundingClientRect();
      // If input scrolled out of viewport, close
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

  const choose = (designation: string) => {
    onChange(designation);
    suppressFocusOpenRef.current = true;
    setOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      setTimeout(() => {
        suppressFocusOpenRef.current = false;
      }, 150);
    });
  };

  const clearValue = () => {
    onChange('');
    openPicker();
    inputRef.current?.focus();
  };

  const menu = open && position && (
    <div
      ref={menuRef}
      id={`${id}-options`}
      role="listbox"
      style={position}
      className="fixed z-[60] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-slate-100 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-3 w-3" />
        <span>
          {filteredOptions.length} {isUsingFallback ? 'catalogue' : 'sanctioned post'}
          {filteredOptions.length !== 1 ? 's' : ''}
          {isUsingFallback ? ' (fallback)' : ''}
        </span>
        {value && (
          <button
            type="button"
            onClick={clearValue}
            className="ml-auto rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Clear designation"
            aria-label="Clear designation"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {isUsingFallback && (
        <div className="px-2.5 py-2 text-[11px] leading-snug text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg mt-1">
          No sanctioned posts configured. Showing catalogue. Configure sanctioned posts (મહેકમ) to limit this list to office-sanctioned designations.
        </div>
      )}

      {filteredOptions.map((option) => (
        <button
          key={option.designation}
          type="button"
          role="option"
          aria-selected={option.designation === value}
          onClick={() => choose(option.designation)}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40',
            option.designation === value && 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
          )}
        >
          <span className="min-w-0">
            <span className="block truncate text-xs font-serif font-semibold text-slate-800 dark:text-slate-100">
              {option.designation}
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {option.isSanctioned ? (
                <>
                  {option.cadreClass ? `Class ${option.cadreClass} · ` : ''}
                  Sanc. {option.sanctioned ?? 0} · Filled {option.filled ?? 0}
                  {option.payLevel ? ` · ${option.payLevel}` : ''}
                </>
              ) : (
                <>Catalogue · {option.payLevel ?? ''}</>
              )}
            </span>
          </span>
          <span className="shrink-0 font-mono text-[10px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {option.minPay && option.minPay > 0 ? `₹${option.minPay.toLocaleString('en-IN')}` : ''}
          </span>
        </button>
      ))}

      {filteredOptions.length === 0 && (
        <div className="px-2.5 py-4 text-center text-xs text-slate-500">
          No sanctioned match. Continue typing to keep a custom Gujarati designation.
        </div>
      )}
      {value && !exactMatch && (
        <button
          type="button"
          role="option"
          onClick={() => choose(value)}
          className="mt-1 w-full border-t border-dashed border-slate-200 px-2.5 py-2 text-left text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-950/40"
        >
          Keep custom designation: “{value}”
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
        onFocus={openPicker}
        onClick={openPicker}
        onChange={(event) => {
          onChange(event.target.value);
          openPicker();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openPicker();
          }
          if (event.key === 'Escape') setOpen(false);
        }}
        autoComplete="off"
        placeholder={placeholder}
        className="h-9 bg-white pr-8 font-serif text-sm dark:bg-slate-900"
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
