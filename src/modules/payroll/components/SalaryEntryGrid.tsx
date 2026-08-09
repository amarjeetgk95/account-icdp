import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { EmployeeRosterItem } from '../types';
import { formatCurrency } from '@/shared/utilities';
import { payrollService } from '../services/payroll.service';
import { useCopyPreviousMonth } from '../hooks/usePayroll';
import { Save, X, Copy, AlertTriangle } from 'lucide-react';
import { MONTHS } from '@/shared/constants';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { ClassifiedSalaryRecord } from '../validation/salary.schema';

interface SalaryEntryGridProps {
  roster: EmployeeRosterItem[];
  isLoading: boolean;
  showDA: boolean;
  selectedMonth: string;
  autoFill: boolean;
  fy: number;
  onSave: (entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>) => void;
}

interface EntryValues {
  gross: number;
  da: number;
  tax: number;
}

export interface SalaryEntryGridHandle {
  applyImportedValues: (records: ClassifiedSalaryRecord[]) => number;
}

export const SalaryEntryGrid = forwardRef<SalaryEntryGridHandle, SalaryEntryGridProps>(function SalaryEntryGrid(
  { roster, isLoading, showDA, selectedMonth, autoFill, fy, onSave },
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
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingEmployeeId, setLoadingEmployeeId] = useState<string | null>(null);
  const [missingPrevData, setMissingPrevData] = useState<Record<string, boolean>>({});
  const [isScrolled, setIsScrolled] = useState(false);

  const copyMutation = useCopyPreviousMonth();
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

  // Ctrl+S keyboard shortcut to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (roster.length > 0) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, overriddenEntries, showDA]);

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
            const prevData = await payrollService.getEmployeePreviousMonthData(emp.id, selectedMonth, fy);
            if (prevData) {
              if (cancelled) return;
              setOverriddenEntries((prev) => ({
                ...prev,
                [emp.id]: { gross: prevData.gross, da: prevData.da, tax: prevData.tax },
              }));
              markDirty(emp.id, 'gross');
              if (showDA) markDirty(emp.id, 'da');
              markDirty(emp.id, 'tax');
              setHasChanges(true);
              setMissingPrevData((p) => ({ ...p, [emp.id]: false }));
            } else {
              anyMissing = true;
            }
          } catch {
            anyMissing = true;
          }
        }
      }
      if (anyMissing && !cancelled) setMissingPrevData((p) => ({ ...p, __any: true }));
    };

    applyAutoFill();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFill, selectedMonth, roster, showDA, fy, markDirty]);

  const updateEntry = (id: string, field: 'gross' | 'da' | 'tax', value: string) => {
    const num = parseFloat(value) || 0;
    setOverriddenEntries((prev) => ({
      ...prev,
      [id]: { ...entries[id], [field]: Math.max(0, num) },
    }));
    markDirty(id, field);
    setHasChanges(true);
  };

  const handlePaste = (e: React.ClipboardEvent, rowIndex: number) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const parsed = lines.map((l) => l.split(/\t|\|/)).filter((row) => row && row.length >= 3);

    if (parsed.length === 0) return;

    const headerLower = (parsed[0] || []).map((c: string) => c.trim().toLowerCase());
    const hasHeader =
      headerLower.includes('gross') ||
      headerLower.includes('salary') ||
      headerLower.includes('name') ||
      headerLower.includes('tax');

    const dataRows = hasHeader ? parsed.slice(1) : parsed;

    const startingEmp = roster[rowIndex];
    if (!startingEmp) return;

    const startIndex = roster.indexOf(startingEmp);

    let updated = false;
    dataRows.forEach((row, i) => {
      const empIndex = startIndex + i;
      if (empIndex >= roster.length) return;
      const emp = roster[empIndex];
      const vals = row.map((v: string) => v.trim().replace(/[,₹\s]/g, ''));

      if (vals.length >= 3) {
        const gross = parseFloat(vals[0]) || 0;
        const da = parseFloat(vals[1]) || 0;
        const tax = parseFloat(vals[2]) || 0;
        setOverriddenEntries((prev) => ({
          ...prev,
          [emp.id]: { gross: Math.max(0, gross), da: Math.max(0, da), tax: Math.max(0, tax) },
        }));
        markDirty(emp.id, 'gross');
        if (showDA) markDirty(emp.id, 'da');
        markDirty(emp.id, 'tax');
        updated = true;
      }
    });

    if (updated) setHasChanges(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string, field: string, rowIndex: number, colIndex: number) => {
    void field;
    void rowIndex;

    const cols = showDA ? ['gross', 'da', 'tax'] : ['gross', 'tax'];
    const numCols = cols.length;

    switch (e.key) {
      case 'Escape': {
        e.preventDefault();
        setActiveCell(null);
        break;
      }
      case 'Tab': {
        e.preventDefault();
        const nextCol = (colIndex + (e.shiftKey ? -1 : 1) + numCols) % numCols;
        const nextRow = rowIndex + (e.shiftKey && colIndex === 0 ? -1 : !e.shiftKey && colIndex === numCols - 1 ? 1 : 0);
        if (nextRow >= 0 && nextRow < roster.length) {
          const nextField = cols[nextCol];
          const nextId = roster[nextRow].id;
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
        if (enterRow >= 0 && enterRow < roster.length) {
          const enterField = cols[enterCol];
          const enterId = roster[enterRow].id;
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
          const nextId = roster[rowIndex - 1].id;
          setActiveCell({ id: nextId, field: nextField });
          const key = cellKey(nextId, nextField);
          setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
        }
        break;
      }

      case 'ArrowDown': {
        e.preventDefault();
        if (rowIndex < roster.length - 1) {
          const nextField = cols[colIndex];
          const nextId = roster[rowIndex + 1].id;
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
        setMissingPrevData((p) => ({ ...p, [id]: false }));
      } else {
        setMissingPrevData((p) => ({ ...p, [id]: true }));
      }
    } catch {
      setMissingPrevData((p) => ({ ...p, [id]: true }));
    } finally {
      setLoadingEmployeeId(null);
    }
  };

  const handleCopyAllPrevMonth = async () => {
    if (!selectedMonth) return;
    try {
      const result = await copyMutation.mutateAsync({ month: selectedMonth, fy });
      const { copied, created } = result;
      if (created === 0) {
        alert(`No data copied. Previous month had ${copied} records but no new entries were created.`);
      } else {
        alert(`Successfully copied ${created} employee entries from the previous month.`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to copy previous month data');
    }
  };

  const totals = roster.reduce(
    (acc, emp) => {
      const e = entries[emp.id] || { gross: 0, da: 0, tax: 0 };
      return {
        gross: acc.gross + e.gross,
        da: acc.da + e.da,
        tax: acc.tax + e.tax,
      };
    },
    { gross: 0, da: 0, tax: 0 }
  );

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
          <p className="text-sm text-slate-400 mt-1">Add employees in the Employees tab to start payroll entry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 text-sm">
      {/* Compact unsaved changes banner */}
      {hasChanges && (
        <div className="unsaved-banner">
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{dirtyCells.size} cell{dirtyCells.size !== 1 ? 's' : ''} modified</span>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors">
              Discard
            </button>
            <span className="text-amber-300">|</span>
            <button onClick={handleSave} className="text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors">
              Save Now
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto flex-1 overflow-y-auto"
        onPaste={(e) => handlePaste(e, 0)}
      >
        <table className="w-full text-sm">
          <thead className={`salary-grid-header ${isScrolled ? 'scrolled' : ''}`}>
            <tr>
              <th className="text-center" style={{ width: '44px' }}>#</th>
              <th className="text-left">Employee</th>
              <th className="text-left">PAN No.</th>
              <th className="text-right">Gross</th>
              {showDA && (
                <th className="text-right" style={{ color: '#B45309' }}>DA &amp; Other</th>
              )}
              <th className="text-right">Tax</th>
              <th className="text-right" style={{ color: '#4338CA' }}>Net Payable</th>
              {showDA && (
                <th className="text-center" style={{ color: '#15803D' }}>Total</th>
              )}
              <th className="text-center" style={{ width: '64px' }} title="Copy from previous month">
                Prev
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map((emp, idx) => {
              const entry = entries[emp.id] || { gross: 0, da: 0, tax: 0 };
              const total = entry.gross + entry.da;
              const hasData = entry.gross > 0 || entry.da > 0 || entry.tax > 0;
              const hasPrevData = !missingPrevData[emp.id];
              const isDirtyGross = dirtyCells.has(cellKey(emp.id, 'gross'));
              const isDirtyDA = dirtyCells.has(cellKey(emp.id, 'da'));
              const isDirtyTax = dirtyCells.has(cellKey(emp.id, 'tax'));
              const isRowActive = activeCell?.id === emp.id;

              return (
                <tr key={emp.id} className={`salary-row ${isRowActive ? 'salary-row-active' : ''}`}>
                  <td className="px-3 py-2 text-slate-400 text-center text-xs font-medium">{idx + 1}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800 truncate max-w-[220px]">{emp.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 tracking-wide">{emp.pan}</td>

                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={entry.gross || ''}
                      onChange={(e) => updateEntry(emp.id, 'gross', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, emp.id, 'gross', idx, cols.indexOf('gross'))}
                      onFocus={() => setActiveCell({ id: emp.id, field: 'gross' })}
                      onWheel={handleWheel}
                      ref={(el) => {
                        if (el) cellRefs.current.set(cellKey(emp.id, 'gross'), el);
                      }}
                      className={`salary-cell ${isDirtyGross ? 'dirty' : ''}`}
                      placeholder="0"
                      min="0"
                    />
                  </td>

                  {showDA && (
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={entry.da || ''}
                        onChange={(e) => updateEntry(emp.id, 'da', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, emp.id, 'da', idx, cols.indexOf('da'))}
                        onFocus={() => setActiveCell({ id: emp.id, field: 'da' })}
                        onWheel={handleWheel}
                        ref={(el) => {
                          if (el) cellRefs.current.set(cellKey(emp.id, 'da'), el);
                        }}
                        className={`salary-cell ${isDirtyDA ? 'dirty' : ''}`}
                        placeholder="0"
                        min="0"
                      />
                    </td>
                  )}

                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={entry.tax || ''}
                      onChange={(e) => updateEntry(emp.id, 'tax', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, emp.id, 'tax', idx, cols.indexOf('tax'))}
                      onFocus={() => setActiveCell({ id: emp.id, field: 'tax' })}
                      onWheel={handleWheel}
                      ref={(el) => {
                        if (el) cellRefs.current.set(cellKey(emp.id, 'tax'), el);
                      }}
                      className={`salary-cell ${isDirtyTax ? 'dirty' : ''}`}
                      placeholder="0"
                      min="0"
                    />
                  </td>

                  <td className="px-3 py-2 text-right font-bold text-indigo-700 text-sm tabular-nums">
                    {formatCurrency(total - entry.tax)}
                  </td>

                  {showDA && (
                    <td className="px-3 py-2 text-center font-bold text-green-700 text-sm tabular-nums">{formatCurrency(total)}</td>
                  )}

                  <td className="px-3 py-2 text-center">
                    {loadingEmployeeId === emp.id ? (
                      <div className="spinner h-4 w-4 mx-auto"></div>
                    ) : hasData ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : hasPrevData ? (
                      <button
                        onClick={() => handleCopyPrevMonth(emp.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Copy values from previous month"
                      >
                        <Copy size={13} />
                      </button>
                    ) : (
                      <span className="text-xs text-red-300" title="No data found for previous month">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="salary-totals">
            <tr>
              <td colSpan={3} className="text-right text-slate-600 font-bold text-xs uppercase tracking-wider">
                Total
              </td>
            {showDA && (
              <>
                <td className="text-right text-slate-700">{formatCurrency(totals.gross)}</td>
                <td className="text-right text-amber-700">{formatCurrency(totals.da)}</td>
                <td className="text-right text-red-600">{formatCurrency(totals.tax)}</td>
                <td className="text-right text-indigo-700 font-extrabold">
                  {formatCurrency(totals.gross + totals.da - totals.tax)}
                </td>
                <td className="text-center text-green-700 font-extrabold">{formatCurrency(totals.gross + totals.da)}</td>
                <td></td>
              </>
            )}
            {!showDA && (
              <>
                <td className="text-right text-slate-700">{formatCurrency(totals.gross)}</td>
                <td className="text-right text-red-600">{formatCurrency(totals.tax)}</td>
                <td className="text-right text-indigo-700 font-extrabold">{formatCurrency(totals.gross - totals.tax)}</td>
                <td></td>
              </>
            )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Elevated footer bar */}
      <div className="salary-footer text-sm">
        <div className="flex items-center gap-3">
          <span className="stat-pill">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {roster.length} employees
          </span>
          {hasChanges && (
            <span className="stat-pill stat-pill-warning">
              <AlertTriangle size={12} />
              {dirtyCells.size} modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAllPrevMonth}
            disabled={copyMutation.isPending}
            className="btn btn-outline btn-sm text-xs"
            title="Copy all data from the previous month"
          >
            <Copy size={13} className="mr-1" /> {copyMutation.isPending ? 'Copying…' : 'Copy Prev Month'}
          </button>
          {hasChanges ? (
            <>
              <button onClick={handleCancel} className="btn btn-outline btn-sm text-xs">
                <X size={13} className="mr-1" /> Discard
              </button>
              <button onClick={handleSave} className="btn btn-sm btn-save-pulse rounded-lg px-4 text-xs">
                <Save size={13} className="mr-1" /> Save Changes
              </button>
            </>
          ) : (
            <button onClick={handleSave} className="btn btn-primary btn-sm text-xs">
              <Save size={13} className="mr-1" /> Save Monthly Data
            </button>
          )}
          <span className="kbd-hint hidden sm:inline-flex">
            <kbd>Ctrl</kbd>+<kbd>S</kbd>
          </span>
        </div>
      </div>
    </div>
  );
});
