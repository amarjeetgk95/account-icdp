import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { EmployeeRosterItem } from '../types';
import { formatCurrency } from '@/shared/utilities';
import { payrollService } from '../services/payroll.service';
import {
  Save,
  Copy,
  AlertTriangle,
  Search,
  SearchX,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Banknote,
  Receipt,
  Wallet,
} from 'lucide-react';
import { MONTHS } from '@/shared/constants';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { ClassifiedSalaryRecord } from '../validation/salary.schema';
import { useUnsavedChanges } from '@/shared/hooks/useUnsavedChanges';

interface SalaryEntryGridProps {
  roster: EmployeeRosterItem[];
  isLoading: boolean;
  showDA: boolean;
  selectedMonth: string;
  autoFill: boolean;
  fy: number;
  onSave: (entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface EntryValues {
  gross: number;
  da: number;
  tax: number;
}

const MAX_VALUE = 9999999;

const parseAmount = (value: string | number): number => {
  const n = parseFloat(String(value).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MAX_VALUE, Math.round(n * 100) / 100);
};

const formatInput = (n: number): string => {
  if (n === 0) return '';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export interface SalaryEntryGridHandle {
  applyImportedValues: (records: ClassifiedSalaryRecord[]) => number;
}

type StatusFilter = 'all' | 'pending' | 'completed' | 'zero-tax';

export const SalaryEntryGrid = forwardRef<SalaryEntryGridHandle, SalaryEntryGridProps>(function SalaryEntryGrid(
  { roster, isLoading, showDA, selectedMonth, autoFill, fy, onSave, onDirtyChange },
  ref
) {
  const officeId = useActiveOfficeId();
  const storageKey =
    officeId && fy && selectedMonth
      ? `payroll-draft:${officeId}:${fy}:${selectedMonth}`
      : null;

  const [overriddenEntries, setOverriddenEntries] = useState<Record<string, EntryValues>>(() => {
    if (!storageKey) return {};
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, EntryValues>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (storageKey) {
      sessionStorage.setItem(storageKey, JSON.stringify(overriddenEntries));
    }
  }, [overriddenEntries, storageKey]);

  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<{ id: string; field: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(() => Object.keys(overriddenEntries).length > 0);

  useUnsavedChanges(hasChanges);
  const [loadingEmployeeId, setLoadingEmployeeId] = useState<string | null>(null);
  const [missingPrevData, setMissingPrevData] = useState<Record<string, boolean>>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const cellRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const cellKey = (id: string, field: string) => `${id}-${field}`;

  useEffect(() => {
    if (activeCell) {
      const el = cellRefs.current.get(cellKey(activeCell.id, activeCell.field));
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [activeCell]);

  // Detect scroll for sticky header shadow
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 0);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [roster.length]);

  // Notify parent when dirty state changes
  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  // Warn before leaving the page with unsaved edits
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    const scrollable = target.closest('.overflow-y-auto');
    if (scrollable) {
      scrollable.scrollTop += e.deltaY;
      e.preventDefault();
    }
  }, []);

  const markDirty = useCallback((id: string, field: string) => {
    const key = cellKey(id, field);
    setDirtyCells((prev) => new Set([...prev, key]));
  }, []);

  const clearDirty = useCallback(() => {
    setDirtyCells(new Set());
  }, []);

  const entries = useMemo(() => {
    const result: Record<string, EntryValues> = {};
    roster.forEach((emp) => {
      const override = overriddenEntries[emp.id];
      if (override) {
        result[emp.id] = override;
      } else {
        result[emp.id] = { gross: emp.gross, da: emp.da, tax: emp.tax };
      }
    });
    return result;
  }, [roster, overriddenEntries]);

  // Filtered Roster by text search + status filter
  const visibleRoster = useMemo(() => {
    let result = roster;
    const q = filter.trim().toLowerCase();
    if (q) {
      result = result.filter((emp) => {
        const nameMatch = emp.name ? emp.name.toLowerCase().includes(q) : false;
        const panMatch = emp.pan ? emp.pan.toLowerCase().includes(q) : false;
        const hrpnMatch = emp.hprnNo ? emp.hprnNo.toLowerCase().includes(q) : false;
        return nameMatch || panMatch || hrpnMatch;
      });
    }

    if (statusFilter === 'all') return result;

    return result.filter((emp) => {
      const e = entries[emp.id] || { gross: 0, da: 0, tax: 0 };
      const hasGross = e.gross > 0;
      const isPending = !hasGross;
      const isZeroTax = hasGross && e.tax === 0 && e.gross > 25000;

      if (statusFilter === 'pending') return isPending;
      if (statusFilter === 'completed') return hasGross;
      if (statusFilter === 'zero-tax') return isZeroTax;
      return true;
    });
  }, [roster, filter, statusFilter, entries]);

  // Overall summary metrics across all roster entries
  const summaryStats = useMemo(() => {
    let completedCount = 0;
    let pendingCount = 0;
    let zeroTaxCount = 0;
    let totalGross = 0;
    let totalDA = 0;
    let totalTax = 0;

    roster.forEach((emp) => {
      const e = entries[emp.id] || { gross: 0, da: 0, tax: 0 };
      const gross = e.gross || 0;
      const da = showDA ? e.da || 0 : 0;
      const tax = e.tax || 0;

      if (gross > 0) {
        completedCount++;
        if (tax === 0 && gross > 25000) {
          zeroTaxCount++;
        }
      } else {
        pendingCount++;
      }

      totalGross += gross;
      totalDA += da;
      totalTax += tax;
    });

    const totalNet = totalGross + totalDA - totalTax;

    return {
      completedCount,
      pendingCount,
      zeroTaxCount,
      totalGross,
      totalDA,
      totalTax,
      totalNet,
    };
  }, [roster, entries, showDA]);

  // Totals for visible (filtered) rows
  const totals = useMemo(() => {
    return visibleRoster.reduce(
      (acc, emp) => {
        const e = entries[emp.id] || { gross: 0, da: 0, tax: 0 };
        const gross = e.gross || 0;
        const da = showDA ? e.da || 0 : 0;
        const tax = e.tax || 0;
        const net = gross + da - tax;

        return {
          gross: acc.gross + gross,
          da: acc.da + da,
          tax: acc.tax + tax,
          net: acc.net + net,
        };
      },
      { gross: 0, da: 0, tax: 0, net: 0 }
    );
  }, [visibleRoster, entries, showDA]);

  const startEditing = (key: string, id: string, field: 'gross' | 'da' | 'tax') => {
    setDrafts((prev) => ({ ...prev, [key]: entries[id][field] ? String(entries[id][field]) : '' }));
    setActiveCell({ id, field });
  };

  const updateEntry = (id: string, field: 'gross' | 'da' | 'tax', rawVal: string) => {
    const parsed = parseAmount(rawVal);
    setOverriddenEntries((prev) => {
      const existing = prev[id] ?? entries[id] ?? { gross: 0, da: 0, tax: 0 };
      return {
        ...prev,
        [id]: { ...existing, [field]: parsed },
      };
    });
    markDirty(id, field);
    setHasChanges(true);
  };

  const changeEditing = (key: string, id: string, field: 'gross' | 'da' | 'tax', value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
    updateEntry(id, field, value);
  };

  const endEditing = (key: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const inputValue = (key: string, value: number): string => {
    const draft = drafts[key];
    if (draft !== undefined) return draft;
    return formatInput(value);
  };

  useImperativeHandle(
    ref,
    () => ({
      applyImportedValues(records) {
        const matches = records.filter(
          (r) => r.employeeId && r.month === selectedMonth && r.financialYear === fy
        );
        if (matches.length === 0) return 0;

        setOverriddenEntries((prev) => {
          const next = { ...prev };
          for (const r of matches) {
            const empId = r.employeeId as string;
            const existing = next[empId] ?? entries[empId] ?? { gross: 0, da: 0, tax: 0 };
            next[empId] = { ...existing, gross: r.grossSalary, tax: r.incomeTax };
          }
          return next;
        });

        matches.forEach((r) => {
          markDirty(r.employeeId as string, 'gross');
          markDirty(r.employeeId as string, 'tax');
        });
        setHasChanges(true);
        return matches.length;
      },
    }),
    [entries, markDirty, selectedMonth, fy]
  );

  useEffect(() => {
    if (!autoFill || !selectedMonth || roster.length === 0) return;
    if (MONTHS.indexOf(selectedMonth) === -1) return;

    let cancelled = false;

    const applyAutoFill = async () => {
      let anyMissing = false;
      for (const emp of roster) {
        const override = overriddenEntries[emp.id];
        const hasData = override
          ? override.gross > 0 || override.da > 0 || override.tax > 0
          : emp.gross > 0 || emp.da > 0 || emp.tax > 0;
        if (!hasData) {
          try {
            const prev = await payrollService.getEmployeePreviousMonthData(emp.id, selectedMonth, fy);
            if (cancelled) return;
            if (prev) {
              setOverriddenEntries((old) => ({
                ...old,
                [emp.id]: { gross: prev.gross, da: prev.da, tax: prev.tax },
              }));
              markDirty(emp.id, 'gross');
              if (showDA) markDirty(emp.id, 'da');
              markDirty(emp.id, 'tax');
              setHasChanges(true);
            } else {
              anyMissing = true;
            }
          } catch {
            anyMissing = true;
          }
        }
      }
      if (anyMissing && !cancelled) {
        setMissingPrevData((prev) => ({ ...prev, [selectedMonth]: true }));
      }
    };

    applyAutoFill();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFill, selectedMonth, fy, roster]);

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    startColIndex: number
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;

    e.preventDefault();

    const colsToUpdate = getCols();
    let updatedCount = 0;

    setOverriddenEntries((prev) => {
      const next = { ...prev };
      lines.forEach((line, rIdx) => {
        const targetRow = startRowIndex + rIdx;
        if (targetRow >= visibleRoster.length) return;
        const emp = visibleRoster[targetRow];
        const cells = line.split('\t').map((c) => c.trim());

        const existing = next[emp.id] ?? entries[emp.id] ?? { gross: 0, da: 0, tax: 0 };
        const updated = { ...existing };

        cells.forEach((cellVal, cIdx) => {
          const targetCol = startColIndex + cIdx;
          if (targetCol >= colsToUpdate.length) return;
          const field = colsToUpdate[targetCol] as 'gross' | 'da' | 'tax';
          updated[field] = parseAmount(cellVal);
          markDirty(emp.id, field);
          updatedCount++;
        });

        next[emp.id] = updated;
      });
      return next;
    });

    if (updatedCount > 0) {
      setHasChanges(true);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string,
    _field: 'gross' | 'da' | 'tax',
    rowIndex: number,
    colIndex: number
  ) => {
    const numCols = cols.length;

    switch (e.key) {
      case 'Tab': {
        e.preventDefault();
        const nextCol = (colIndex + (e.shiftKey ? -1 : 1) + numCols) % numCols;
        const nextRow = rowIndex + (e.shiftKey && colIndex === 0 ? -1 : !e.shiftKey && colIndex === numCols - 1 ? 1 : 0);
        if (nextRow >= 0 && nextRow < visibleRoster.length) {
          const nextField = cols[nextCol];
          const nextId = visibleRoster[nextRow].id;
          setActiveCell({ id: nextId, field: nextField });
          const key = cellKey(nextId, nextField);
          setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
        }
        break;
      }

      case 'Enter': {
        e.preventDefault();
        const enterRow = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
        const enterCol = colIndex;
        if (enterRow >= 0 && enterRow < visibleRoster.length) {
          const enterField = cols[enterCol];
          const enterId = visibleRoster[enterRow].id;
          setActiveCell({ id: enterId, field: enterField });
          const key = cellKey(enterId, enterField);
          setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
        }
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        if (rowIndex > 0) {
          const nextField = cols[colIndex];
          const nextId = visibleRoster[rowIndex - 1].id;
          setActiveCell({ id: nextId, field: nextField });
          const key = cellKey(nextId, nextField);
          setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
        }
        break;
      }

      case 'ArrowDown': {
        e.preventDefault();
        if (rowIndex < visibleRoster.length - 1) {
          const nextField = cols[colIndex];
          const nextId = visibleRoster[rowIndex + 1].id;
          setActiveCell({ id: nextId, field: nextField });
          const key = cellKey(nextId, nextField);
          setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
        }
        break;
      }

      case 'ArrowLeft': {
        e.preventDefault();
        if (colIndex > 0) {
          const nextField = cols[colIndex - 1];
          const key = cellKey(id, nextField);
          setActiveCell({ id, field: nextField });
          setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
        }
        break;
      }

      case 'ArrowRight': {
        e.preventDefault();
        if (colIndex < cols.length - 1) {
          const nextField = cols[colIndex + 1];
          const key = cellKey(id, nextField);
          setActiveCell({ id, field: nextField });
          setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
        }
        break;
      }
    }
  };

  const handleCopyPrevMonth = async (id: string) => {
    const existing = entries[id];
    const hasData = existing && (existing.gross > 0 || existing.da > 0 || existing.tax > 0);
    if (hasData) return;

    setLoadingEmployeeId(id);
    try {
      const prevData = await payrollService.getEmployeePreviousMonthData(id, selectedMonth, fy);
      if (prevData) {
        setOverriddenEntries((prev) => ({
          ...prev,
          [id]: { gross: prevData.gross, da: prevData.da, tax: prevData.tax },
        }));
        markDirty(id, 'gross');
        if (showDA) markDirty(id, 'da');
        markDirty(id, 'tax');
        setHasChanges(true);
      } else {
        setMissingPrevData((prev) => ({ ...prev, [id]: true }));
      }
    } catch {
      setMissingPrevData((prev) => ({ ...prev, [id]: true }));
    } finally {
      setLoadingEmployeeId(null);
    }
  };

  const handleCopyAllPrevMonth = async () => {
    if (!selectedMonth || roster.length === 0) return;
    try {
      const prevData = await payrollService.getPreviousMonthData(selectedMonth, fy);
      const prevMap = new Map(prevData.map((d) => [d.employeeId, d]));
      const toApply = roster.filter((emp) => prevMap.has(emp.id));

      if (toApply.length === 0) {
        alert('No previous month data found to copy.');
        return;
      }

      setOverriddenEntries((prev) => {
        const next = { ...prev };
        for (const emp of toApply) {
          const prevEntry = prevMap.get(emp.id);
          if (prevEntry) {
            next[emp.id] = { gross: prevEntry.gross, da: prevEntry.da, tax: prevEntry.tax };
          }
        }
        return next;
      });

      toApply.forEach((emp) => {
        markDirty(emp.id, 'gross');
        if (showDA) markDirty(emp.id, 'da');
        markDirty(emp.id, 'tax');
      });
      setHasChanges(true);

      alert(
        `Loaded ${toApply.length} employee entries from the previous month as a draft.\n` +
          'Review the grid, then click "Save Now" to commit (or Discard to clear).'
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to fetch previous month data');
    }
  };

  const handleSave = () => {
    const saveData = roster.map((emp) => ({
      employeeId: emp.id,
      gross: entries[emp.id]?.gross || 0,
      da: showDA ? entries[emp.id]?.da || 0 : 0,
      tax: entries[emp.id]?.tax || 0,
    }));
    onSave(saveData);
    setOverriddenEntries({});
    clearDirty();
    setHasChanges(false);
  };

  const handleCancel = () => {
    setOverriddenEntries({});
    clearDirty();
    setHasChanges(false);
    setActiveCell(null);
  };

  const getCols = () => {
    const base = ['gross'];
    if (showDA) base.push('da');
    base.push('tax');
    return base;
  };

  const cols = getCols();

  // Save shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (roster.length > 0) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, overriddenEntries, showDA]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm">
        <div className="text-center loading-pulse">
          <div className="spinner h-8 w-8 mx-auto mb-3"></div>
          <p className="text-slate-500 font-medium">Loading employee roster…</p>
          <p className="text-xs text-slate-400 mt-1">Fetching salary data</p>
        </div>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm">
        <div className="empty-state">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-slate-200" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-600">No employees found</p>
          <p className="text-sm text-slate-400 mt-1">Add employees in the Master Directory to start payroll entry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 text-sm">
      {/* Metric Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 px-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users size={13} />
          </div>
          <div className="truncate">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Active Staff</p>
            <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight mt-0.5">{roster.length} Staff</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Banknote size={13} />
          </div>
          <div className="truncate">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Gross Outflow</p>
            <p className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 leading-tight mt-0.5">{formatCurrency(summaryStats.totalGross)}</p>
          </div>
        </div>

        {showDA && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <TrendingUp size={13} />
            </div>
            <div className="truncate">
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">DA Allowance</p>
              <p className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300 leading-tight mt-0.5">{formatCurrency(summaryStats.totalDA)}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Receipt size={13} />
          </div>
          <div className="truncate">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">TDS Deducted</p>
            <p className="text-[11px] font-extrabold text-rose-700 dark:text-rose-300 leading-tight mt-0.5">{formatCurrency(summaryStats.totalTax)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Wallet size={13} />
          </div>
          <div className="truncate">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Net Payable</p>
            <p className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 leading-tight mt-0.5">{formatCurrency(summaryStats.totalNet)}</p>
          </div>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="unsaved-banner py-1 px-3">
          <span className="flex items-center gap-2 text-xs">
            <AlertTriangle size={13} />
            <span>{dirtyCells.size} cell{dirtyCells.size !== 1 ? 's' : ''} modified in draft</span>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 transition-colors">
              Discard
            </button>
            <span className="text-amber-300 dark:text-amber-600">|</span>
            <button onClick={handleSave} className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 transition-colors">
              Save Now (Ctrl+S)
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Filter + Status Chips + Batch Copy */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by Name, PAN…"
              className="input pl-8 py-1 text-xs font-medium"
              aria-label="Filter employees by Name or PAN"
            />
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              All ({roster.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Clock size={11} />
              Pending ({summaryStats.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <CheckCircle2 size={11} />
              Done ({summaryStats.completedCount})
            </button>
            {summaryStats.zeroTaxCount > 0 && (
              <button
                onClick={() => setStatusFilter('zero-tax')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
                  statusFilter === 'zero-tax'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <AlertCircle size={11} />
                Zero Tax ({summaryStats.zeroTaxCount})
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyAllPrevMonth}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
            title="Copy previous month values for all empty entries"
          >
            <Copy size={12} />
            <span>Copy All Prev. Month</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
          >
            <Save size={12} />
            <span>Save Entry</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto flex-1 overflow-y-auto"
      >
        {visibleRoster.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SearchX size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">No employees match criteria.</p>
            <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search terms.</p>
            <button
              onClick={() => {
                setFilter('');
                setStatusFilter('all');
              }}
              className="btn btn-secondary btn-sm mt-3"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <table className="w-full text-sm salary-grid-table border-collapse">
            <thead className={`salary-grid-header ${isScrolled ? 'scrolled' : ''}`}>
              <tr>
                <th className="text-center font-bold text-xs text-slate-700 dark:text-slate-300 salary-col-index">#</th>
                <th className="text-left font-bold text-xs text-slate-700 dark:text-slate-300 salary-col-name">Employee Name</th>
                <th className="text-left font-bold text-xs text-slate-700 dark:text-slate-300 salary-col-pan">PAN Number</th>
                <th className="text-right">
                  <span className="inline-flex items-center justify-end w-full gap-1 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                    Gross Salary (₹)
                  </span>
                </th>
                {showDA && (
                  <th className="text-right">
                    <span className="inline-flex items-center justify-end w-full gap-1 font-bold text-xs text-teal-600 dark:text-teal-400">
                      DA Allowance (₹)
                    </span>
                  </th>
                )}
                <th className="text-right">
                  <span className="inline-flex items-center justify-end w-full gap-1 font-bold text-xs text-rose-600 dark:text-rose-400">
                    Income Tax / TDS (₹)
                  </span>
                </th>
                <th className="text-right">
                  <span className="inline-flex items-center justify-end w-full gap-1 font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    Net Payable (₹)
                  </span>
                </th>
                <th className="text-center font-bold text-xs text-slate-500 dark:text-slate-400" style={{ width: '110px' }}>
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRoster.map((emp, idx) => {
                const entry = entries[emp.id] || { gross: 0, da: 0, tax: 0 };
                const isDirtyGross = dirtyCells.has(cellKey(emp.id, 'gross'));
                const isDirtyDA = dirtyCells.has(cellKey(emp.id, 'da'));
                const isDirtyTax = dirtyCells.has(cellKey(emp.id, 'tax'));

                const grossVal = entry.gross || 0;
                const daVal = showDA ? entry.da || 0 : 0;
                const taxVal = entry.tax || 0;
                const netPayable = grossVal + daVal - taxVal;

                const hasData = grossVal > 0;
                const isRowActive = activeCell?.id === emp.id;
                const panDisplay = emp.pan ? emp.pan.toUpperCase() : '—';
                const hasPrevData = !missingPrevData[emp.id];

                const isZeroTaxAlert = hasData && taxVal === 0 && grossVal > 25000;

                return (
                  <tr key={emp.id} className={`salary-row ${isRowActive ? 'salary-row-active' : ''}`}>
                    <td className="px-2.5 py-1 text-slate-400 dark:text-slate-500 text-center text-xs font-medium salary-col-index">{idx + 1}</td>
                    <td className="px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap truncate text-left text-xs salary-col-name">
                      <span>{emp.name}</span>
                    </td>
                    <td className="px-2.5 py-1 font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap text-left salary-col-pan">{panDisplay}</td>

                    <td className="px-2.5 py-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={inputValue(cellKey(emp.id, 'gross'), entry.gross)}
                        onChange={(e) => changeEditing(cellKey(emp.id, 'gross'), emp.id, 'gross', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, emp.id, 'gross', idx, cols.indexOf('gross'))}
                        onFocus={() => startEditing(cellKey(emp.id, 'gross'), emp.id, 'gross')}
                        onBlur={() => endEditing(cellKey(emp.id, 'gross'))}
                        onPaste={(e) => handlePaste(e, idx, cols.indexOf('gross'))}
                        onWheel={handleWheel}
                        ref={(el) => {
                          if (el) cellRefs.current.set(cellKey(emp.id, 'gross'), el);
                        }}
                        className={`salary-cell text-xs font-semibold ${isDirtyGross ? 'dirty' : ''}`}
                        placeholder="0"
                        aria-label={`Gross salary for ${emp.name}`}
                      />
                    </td>

                    {showDA && (
                      <td className="px-2.5 py-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={inputValue(cellKey(emp.id, 'da'), entry.da)}
                          onChange={(e) => changeEditing(cellKey(emp.id, 'da'), emp.id, 'da', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, emp.id, 'da', idx, cols.indexOf('da'))}
                          onFocus={() => startEditing(cellKey(emp.id, 'da'), emp.id, 'da')}
                          onBlur={() => endEditing(cellKey(emp.id, 'da'))}
                          onPaste={(e) => handlePaste(e, idx, cols.indexOf('da'))}
                          onWheel={handleWheel}
                          ref={(el) => {
                            if (el) cellRefs.current.set(cellKey(emp.id, 'da'), el);
                          }}
                          className={`salary-cell text-xs font-semibold ${isDirtyDA ? 'dirty' : ''}`}
                          placeholder="0"
                          aria-label={`DA for ${emp.name}`}
                        />
                      </td>
                    )}

                    <td className="px-2.5 py-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={inputValue(cellKey(emp.id, 'tax'), entry.tax)}
                        onChange={(e) => changeEditing(cellKey(emp.id, 'tax'), emp.id, 'tax', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, emp.id, 'tax', idx, cols.indexOf('tax'))}
                        onFocus={() => startEditing(cellKey(emp.id, 'tax'), emp.id, 'tax')}
                        onBlur={() => endEditing(cellKey(emp.id, 'tax'))}
                        onPaste={(e) => handlePaste(e, idx, cols.indexOf('tax'))}
                        onWheel={handleWheel}
                        ref={(el) => {
                          if (el) cellRefs.current.set(cellKey(emp.id, 'tax'), el);
                        }}
                        className={`salary-cell text-xs font-semibold ${isDirtyTax ? 'dirty' : ''}`}
                        placeholder="0"
                        aria-label={`Tax for ${emp.name}`}
                      />
                    </td>

                    <td className="px-2.5 py-1 text-right font-extrabold text-emerald-700 dark:text-emerald-400 text-xs tabular-nums">
                      {formatCurrency(netPayable)}
                    </td>

                    <td className="px-2.5 py-1 text-center whitespace-nowrap">
                      {loadingEmployeeId === emp.id ? (
                        <div className="spinner h-4 w-4 mx-auto" />
                      ) : hasData ? (
                        isZeroTaxAlert ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800" title="Gross salary > ₹25k with zero TDS">
                            <AlertCircle size={10} /> Zero TDS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={10} /> Entry Done
                          </span>
                        )
                      ) : hasPrevData ? (
                        <button
                          onClick={() => handleCopyPrevMonth(emp.id)}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1 mx-auto"
                          title="Copy previous month data for this employee"
                        >
                          <Copy size={10} /> Copy Prev
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Pinned Totals Summary Footer */}
            <tfoot className="salary-totals">
              <tr>
                <td className="salary-col-index text-center text-xs font-bold">∑</td>
                <td className="salary-col-name font-bold text-slate-800 dark:text-slate-100">
                  TOTALS ({visibleRoster.length} staff)
                </td>
                <td className="salary-col-pan text-slate-400 dark:text-slate-500 font-normal text-xs">—</td>
                <td className="text-right font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
                  {formatCurrency(totals.gross)}
                </td>
                {showDA && (
                  <td className="text-right font-extrabold text-teal-700 dark:text-teal-300 tabular-nums">
                    {formatCurrency(totals.da)}
                  </td>
                )}
                <td className="text-right font-extrabold text-rose-700 dark:text-rose-300 tabular-nums">
                  {formatCurrency(totals.tax)}
                </td>
                <td className="text-right font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {formatCurrency(totals.net)}
                </td>
                <td className="text-center font-bold text-slate-400 dark:text-slate-500 text-xs">—</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Grid Status Footer */}
      <div className="salary-footer">
        <div className="flex items-center gap-3">
          <span className="stat-pill">
            <Users size={12} className="text-slate-400" />
            <span>Roster: {roster.length}</span>
          </span>
          {visibleRoster.length !== roster.length && (
            <span className="stat-pill bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
              <span>Showing: {visibleRoster.length}</span>
            </span>
          )}
          {hasChanges && (
            <span className="stat-pill bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              <span>● Draft Changes</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span>Use Arrow keys / Tab to navigate</span>
          <span>•</span>
          <span>Enter to move down</span>
          <span>•</span>
          <span>Ctrl+S to save</span>
        </div>
      </div>
    </div>
  );
});
