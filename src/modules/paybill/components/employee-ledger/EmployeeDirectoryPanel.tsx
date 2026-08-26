import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Search, UserCheck, Users } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PaybillDirectoryEntry } from '../../hooks/useEmployeeDirectory';

const RECENT_HRPNS_KEY = 'paybill-ledger-recent-hrpns';

const readRecentHrpns = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_HRPNS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((h) => typeof h === 'string') : [];
  } catch {
    return [];
  }
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface EmployeeDirectoryPanelProps {
  employees: PaybillDirectoryEntry[];
  selectedHrpn: string;
  onSelect: (hrpn: string) => void;
}

/**
 * Modernized left-rail employee directory:
 * - Live in-rail search and filtering without annoying popup listboxes covering the UI
 * - Rich employee cards with avatar initials, HRPN pill tags, and active accents
 * - Clean scrollable designation pill filters
 * - Full keyboard navigation (Ctrl+K, bare "/", ArrowUp/Down, Enter)
 */
export function EmployeeDirectoryPanel({
  employees,
  selectedHrpn,
  onSelect,
}: EmployeeDirectoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIdx, setActiveSearchIdx] = useState(-1);
  const [recentHrpns, setRecentHrpns] = useState<string[]>(readRecentHrpns);
  const [activeDesignations, setActiveDesignations] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Recents are persisted on selection; re-read when directory mounts or selection changes
  useEffect(() => {
    setRecentHrpns(readRecentHrpns());
  }, [selectedHrpn]);

  // Unique non-empty designations, sorted
  const designationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) {
      const d = (e.designation || '').trim();
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployeesList = useMemo(() => {
    let list = employees;
    if (activeDesignations.length > 0) {
      const selected = new Set(activeDesignations);
      list = list.filter((e) => selected.has((e.designation || '').trim()));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.hrpn.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          (e.designation || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, searchQuery, activeDesignations]);

  const selectEmployee = useCallback(
    (hrpn: string) => {
      onSelect(hrpn);
      setSearchQuery('');
      setActiveSearchIdx(-1);
    },
    [onSelect]
  );

  const virtualizer = useVirtualizer({
    count: filteredEmployeesList.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 58,
    overscan: 10,
  });

  const revealActiveOption = useCallback(
    (idx: number) => {
      if (idx < 0) return;
      virtualizer.scrollToIndex(idx);
      document.getElementById(`employee-opt-${idx}`)?.scrollIntoView({ block: 'nearest' });
    },
    [virtualizer]
  );

  // Global search shortcut: Ctrl+K / Cmd+K or bare "/" outside form elements
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/') {
        const target = e.target as HTMLElement | null;
        if (
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleDesignation = (designation: string) =>
    setActiveDesignations((prev) =>
      prev.includes(designation) ? prev.filter((d) => d !== designation) : [...prev, designation]
    );

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const max = filteredEmployeesList.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = activeSearchIdx < 0 || activeSearchIdx >= max ? 0 : activeSearchIdx + 1;
      setActiveSearchIdx(next);
      revealActiveOption(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(0, activeSearchIdx <= 0 ? 0 : activeSearchIdx - 1);
      setActiveSearchIdx(next);
      revealActiveOption(next);
    } else if (e.key === 'Enter') {
      const pick = filteredEmployeesList[Math.max(activeSearchIdx, 0)];
      if (pick && (activeSearchIdx >= 0 || searchQuery.trim())) {
        e.preventDefault();
        selectEmployee(pick.hrpn);
      }
    } else if (e.key === 'Escape') {
      setActiveSearchIdx(-1);
      searchInputRef.current?.blur();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 select-none">
      {/* Top Header & Search Bar */}
      <div className="shrink-0 p-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Directory</span>
          </div>
          <span
            className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-full px-2 py-0.5 tabular-nums shadow-2xs"
            title="Employees matching current search & filters"
          >
            {filteredEmployeesList.length} employees
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
          <input
            type="text"
            ref={searchInputRef}
            role="combobox"
            aria-expanded={filteredEmployeesList.length > 0}
            aria-controls="employee-search-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              activeSearchIdx >= 0 ? `employee-opt-${activeSearchIdx}` : undefined
            }
            aria-label="Search employees by HRPN, name or designation"
            placeholder="Search employee or HRPN..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveSearchIdx(-1);
            }}
            onFocus={(e) => {
              e.target.select();
            }}
            onKeyDown={handleSearchKeyDown}
            className="pl-8 pr-12 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 w-full font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 shadow-2xs transition-all"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveSearchIdx(-1);
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 min-w-[20px] min-h-[20px] flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
            >
              ×
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded pointer-events-none">
              /
            </kbd>
          )}
        </div>

        {/* Designation Filter Chips */}
        {designationOptions.length > 0 && (
          <div
            role="group"
            aria-label="Filter by designation"
            className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar py-0.5"
          >
            <button
              type="button"
              onClick={() => setActiveDesignations([])}
              aria-pressed={activeDesignations.length === 0}
              className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                activeDesignations.length === 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              All
            </button>
            {designationOptions.map((d) => {
              const pressed = activeDesignations.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDesignation(d)}
                  aria-pressed={pressed}
                  title={d}
                  className={`shrink-0 max-w-[120px] truncate px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                    pressed
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Virtualized Employee List */}
      <div
        ref={listRef}
        id="employee-search-listbox"
        role="listbox"
        aria-label="Employees"
        className="flex-1 min-h-0 overflow-auto app-scroll"
      >
        {filteredEmployeesList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
            <p className="font-medium text-slate-600 dark:text-slate-400">No employees found</p>
            <p className="mt-1 text-[11px]">Try adjusting your search query or designation filter</p>
          </div>
        ) : (
          <div
            style={{
              height: Math.max(virtualizer.getTotalSize(), filteredEmployeesList.length * 58),
              position: 'relative',
              width: '100%',
            }}
          >
            {(virtualizer.getVirtualItems().length > 0
              ? virtualizer.getVirtualItems().map((vi) => ({
                  index: vi.index,
                  start: vi.start,
                  measureRef: virtualizer.measureElement,
                  emp: filteredEmployeesList[vi.index],
                }))
              : filteredEmployeesList.map((emp, index) => ({
                  index,
                  start: index * 58,
                  measureRef: undefined,
                  emp,
                }))
            ).map(({ index, start, measureRef, emp }) => {
              if (!emp) return null;
              const isSelected = emp.hrpn === selectedHrpn;
              const isHighlighted = index === activeSearchIdx;
              const initials = getInitials(emp.name);
              const isRecent = recentHrpns.includes(emp.hrpn);

              return (
                <button
                  key={emp.hrpn}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  id={`employee-opt-${index}`}
                  data-index={index}
                  ref={measureRef}
                  onClick={() => selectEmployee(emp.hrpn)}
                  onMouseEnter={() => setActiveSearchIdx(index)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${start}px)`,
                  }}
                  className={`w-full text-left px-2.5 py-2 flex items-center gap-2.5 transition-all border-b border-slate-100 dark:border-slate-800/60 focus:outline-none ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 border-l-[3px] border-l-blue-600 dark:border-l-blue-400 pl-[7px]'
                      : isHighlighted
                        ? 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {/* Initials Avatar */}
                  <div
                    className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80'
                    }`}
                  >
                    {initials}
                  </div>

                  {/* Name, HRPN and Designation */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate leading-snug">
                        {emp.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] leading-none">
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1 py-0.2 rounded">
                        HRPN:{emp.hrpn}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {emp.designation || 'Staff'}
                      </span>
                    </div>
                  </div>

                  {/* Active / Recent Status Badge */}
                  {isSelected ? (
                    <span className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-900/60 px-1.5 py-0.5 rounded-md">
                      <UserCheck className="w-2.5 h-2.5" />
                      Active
                    </span>
                  ) : isRecent ? (
                    <span className="shrink-0 text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Recent
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
