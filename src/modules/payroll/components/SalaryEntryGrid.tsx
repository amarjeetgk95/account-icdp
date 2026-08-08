import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { EmployeeRosterItem } from '../types';
import { formatCurrency } from '@/shared/utilities';
import { payrollService } from '../services/payroll.service';
import { useCopyPreviousMonth } from '../hooks/usePayroll';
import { Save, X, Copy, AlertTriangle } from 'lucide-react';
import { MONTHS } from '@/shared/constants';

interface SalaryEntryGridProps {
  roster: EmployeeRosterItem[];
  isLoading: boolean;
  showDA: boolean;
  selectedMonth: string;
  autoFill: boolean;
  onSave: (entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>) => void;
}

interface EntryValues {
  gross: number;
  da: number;
  tax: number;
}

export function SalaryEntryGrid({ roster, isLoading, showDA, selectedMonth, autoFill, onSave }: SalaryEntryGridProps) {
  const [overriddenEntries, setOverriddenEntries] = useState<Record<string, EntryValues>>({});
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<{ id: string; field: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingEmployeeId, setLoadingEmployeeId] = useState<string | null>(null);
  const [missingPrevData, setMissingPrevData] = useState<Record<string, boolean>>({});

  const copyMutation = useCopyPreviousMonth();
  const cellRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const cellKey = (id: string, field: string) => `${id}-${field}`;

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
            const prevData = await payrollService.getEmployeePreviousMonthData(emp.id, selectedMonth);
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
  }, [autoFill, selectedMonth, roster, showDA, markDirty]);

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
      const prevData = await payrollService.getEmployeePreviousMonthData(id, selectedMonth);
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
      const result = await copyMutation.mutateAsync(selectedMonth);
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
        <div className="text-center">
          <div className="spinner h-7 w-7 mx-auto mb-3"></div>
          <p className="text-slate-500">Loading employee roster...</p>
        </div>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm">
        <div className="empty-state">
          <p>No employees found for this office.</p>
          <p className="text-sm text-slate-400 mt-1">Add employees in the Employees tab to start payroll entry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 text-sm">
      {hasChanges && (
        <div className="alert alert-warning mb-3 flex-shrink-0 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} />
            You have unsaved changes ({dirtyCells.size} cells modified)
          </span>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="btn btn-outline btn-sm">
              <X size={14} className="mr-1" /> Discard
            </button>
            <button onClick={handleSave} className="btn btn-primary btn-sm">
              <Save size={14} className="mr-1" /> Save Changes
            </button>
          </div>
        </div>
      )}

      <div
        className="overflow-x-auto flex-1 overflow-y-auto"
        onPaste={(e) => handlePaste(e, 0)}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider" style={{ width: '40px' }}>#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Employee</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">PAN No.</th>
              {showDA && (
                <th className="px-3 py-2 text-right font-semibold text-amber-700 text-xs uppercase tracking-wider">DA &amp; Other</th>
              )}
              <th className="px-3 py-2 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Gross</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Tax</th>
              {showDA && (
                <th className="px-3 py-2 text-center font-semibold text-green-700 text-xs uppercase tracking-wider">Total</th>
              )}
              <th className="px-3 py-2 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider" style={{ width: '80px' }} title="Copy from previous month">
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
              const isActiveGross = activeCell?.id === emp.id && activeCell?.field === 'gross';
              const isActiveDA = activeCell?.id === emp.id && activeCell?.field === 'da';
              const isActiveTax = activeCell?.id === emp.id && activeCell?.field === 'tax';

              return (
                <tr key={emp.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-1.5 text-slate-500 text-center">{idx + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800 truncate max-w-[220px]">{emp.name}</td>
                  <td className="px-3 py-1.5 font-mono text-sm text-slate-600">{emp.pan}</td>

                  {showDA && (
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        value={entry.da || ''}
                        onChange={(e) => updateEntry(emp.id, 'da', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, emp.id, 'da', idx, cols.indexOf('da'))}
                        onWheel={handleWheel}
                        ref={(el) => {
                          if (el) cellRefs.current.set(cellKey(emp.id, 'da'), el);
                        }}
                        className={`px-2.5 py-1.5 text-sm w-28 text-right rounded-md border bg-white transition-all ${
                          isDirtyDA ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                        } ${isActiveDA ? 'ring-2 ring-blue-400 border-blue-500' : ''}`}
                        placeholder="0"
                        min="0"
                      />
                    </td>
                  )}

                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      value={entry.gross || ''}
                      onChange={(e) => updateEntry(emp.id, 'gross', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, emp.id, 'gross', idx, cols.indexOf('gross'))}
                      onWheel={handleWheel}
                      ref={(el) => {
                        if (el) cellRefs.current.set(cellKey(emp.id, 'gross'), el);
                      }}
                      className={`px-2.5 py-1.5 text-sm w-28 text-right rounded-md border bg-white transition-all ${
                        isDirtyGross ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                      } ${isActiveGross ? 'ring-2 ring-blue-400 border-blue-500' : ''}`}
                      placeholder="0"
                      min="0"
                    />
                  </td>

                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      value={entry.tax || ''}
                      onChange={(e) => updateEntry(emp.id, 'tax', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, emp.id, 'tax', idx, cols.indexOf('tax'))}
                      onWheel={handleWheel}
                      ref={(el) => {
                        if (el) cellRefs.current.set(cellKey(emp.id, 'tax'), el);
                      }}
                      className={`px-2.5 py-1.5 text-sm w-28 text-right rounded-md border bg-white transition-all ${
                        isDirtyTax ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                      } ${isActiveTax ? 'ring-2 ring-blue-400 border-blue-500' : ''}`}
                      placeholder="0"
                      min="0"
                    />
                  </td>

                  {showDA && (
                    <td className="px-3 py-1.5 text-center font-bold text-green-700 text-sm">{formatCurrency(total)}</td>
                  )}

                  <td className="px-3 py-1.5 text-center">
                    {loadingEmployeeId === emp.id ? (
                      <div className="spinner h-4 w-4 mx-auto"></div>
                    ) : hasData ? (
                      <span className="text-sm text-slate-400">—</span>
                    ) : hasPrevData ? (
                      <button
                        onClick={() => handleCopyPrevMonth(emp.id)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                        title="Copy values from previous month"
                      >
                        <Copy size={14} />
                      </button>
                    ) : (
                      <span className="text-sm text-red-400" title="No data found for previous month">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold sticky bottom-0 border-t border-slate-200">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right text-slate-600 text-sm">
                Total
              </td>
              {showDA && (
                <>
                  <td className="px-3 py-2 text-right text-amber-700 text-sm">{formatCurrency(totals.da)}</td>
                  <td className="px-3 py-2 text-right text-amber-600 text-sm">{formatCurrency(totals.gross)}</td>
                  <td className="px-3 py-2 text-right text-red-600 text-sm">{formatCurrency(totals.tax)}</td>
                  <td className="px-3 py-2 text-right text-green-700 text-sm">{formatCurrency(totals.gross + totals.da)}</td>
                  <td className="px-3 py-2 text-center"></td>
                </>
              )}
              {!showDA && (
                <>
                  <td className="px-3 py-2 text-right text-amber-600 text-sm">{formatCurrency(totals.gross)}</td>
                  <td className="px-3 py-2 text-right text-red-600 text-sm">{formatCurrency(totals.tax)}</td>
                  <td className="px-3 py-2 text-center"></td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-500">Employees:</span>{' '}
            <span className="font-bold text-slate-800">{roster.length}</span>
          </div>
          {hasChanges && (
            <div>
              <span className="text-slate-500">Modified:</span>{' '}
              <span className="font-bold text-amber-600">{dirtyCells.size} cells</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAllPrevMonth}
            disabled={copyMutation.isPending}
            className="btn btn-outline btn-sm"
            title="Copy all data from the previous month"
          >
            <Copy size={14} className="mr-1" /> {copyMutation.isPending ? 'Copying...' : 'Copy All Prev Month'}
          </button>
          {hasChanges ? (
            <>
              <button onClick={handleCancel} className="btn btn-outline btn-sm">
                <X size={14} className="mr-1" /> Discard
              </button>
              <button onClick={handleSave} className="btn btn-primary btn-sm">
                <Save size={14} className="mr-1" /> Save Changes
              </button>
            </>
          ) : (
            <button onClick={handleSave} className="btn btn-primary btn-sm">
              <Save size={14} className="mr-1" /> Save Monthly Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
