import { useState, useRef } from 'react';
import type { EmployeeRosterItem } from '../types';
import { formatCurrency } from '@/shared/utilities';
import { useCopyPreviousMonth } from '../hooks/usePayroll';
import { Save, X, Copy } from 'lucide-react';

interface SalaryEntryGridProps {
  roster: EmployeeRosterItem[];
  isLoading: boolean;
  showDA: boolean;
  selectedMonth: string;
  onSave: (entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>) => void;
}

export function SalaryEntryGrid({ roster, isLoading, showDA, selectedMonth, onSave }: SalaryEntryGridProps) {
  const [entries, setEntries] = useState<Record<string, { gross: number; da: number; tax: number }>>(() => {
    const initial: Record<string, { gross: number; da: number; tax: number }> = {};
    roster.forEach((emp) => {
      initial[emp.id] = { gross: emp.gross, da: emp.da, tax: emp.tax };
    });
    return initial;
  });
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<{ id: string; field: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const copyMutation = useCopyPreviousMonth();
  const cellRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const cellKey = (id: string, field: string) => `${id}-${field}`;

  const markDirty = (id: string, field: string) => {
    const key = cellKey(id, field);
    setDirtyCells((prev) => new Set([...prev, key]));
  };

  const clearDirty = () => {
    setDirtyCells(new Set());
  };

  const updateEntry = (id: string, field: 'gross' | 'da' | 'tax', value: string) => {
    const num = parseFloat(value) || 0;
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: Math.max(0, num) },
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
        setEntries((prev) => ({
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
    const prevEntry = entries[id];
    if (!prevEntry) return;
    setEntries((prev) => ({
      ...prev,
      [id]: { gross: prevEntry.gross, da: prevEntry.da, tax: prevEntry.tax },
    }));
    markDirty(id, 'gross');
    if (showDA) markDirty(id, 'da');
    markDirty(id, 'tax');
    setHasChanges(true);
  };

  const handleCopyAllPrevMonth = async () => {
    if (!selectedMonth) return;
    try {
      await copyMutation.mutateAsync(selectedMonth);
      window.location.reload();
    } catch (error) {
      console.error('Failed to copy previous month:', error);
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
    clearDirty();
    setHasChanges(false);
  };

  const handleCancel = () => {
    const initial: Record<string, { gross: number; da: number; tax: number }> = {};
    roster.forEach((emp) => {
      initial[emp.id] = { gross: emp.gross, da: emp.da, tax: emp.tax };
    });
    setEntries(initial);
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
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Click <strong>&quot;Load Roster&quot;</strong> to fetch employee data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-amber-800">You have unsaved changes ({dirtyCells.size} cells modified)</span>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-secondary btn-sm">
              Save Changes
            </button>
            <button onClick={handleCancel} className="btn-outline btn-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className="overflow-x-auto max-h-[60vh] overflow-y-auto"
        onPaste={(e) => handlePaste(e, 0)}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 w-10">#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">PAN No.</th>
              {showDA && (
                <th className="px-3 py-2 text-right font-semibold text-amber-700">DA & Other</th>
              )}
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Gross Salary</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Tax Deduction</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600 w-14">Prev</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roster.map((emp, idx) => {
              const entry = entries[emp.id] || { gross: 0, da: 0, tax: 0 };
              const total = entry.gross + entry.da;
              const isDirtyGross = dirtyCells.has(cellKey(emp.id, 'gross'));
              const isDirtyDA = dirtyCells.has(cellKey(emp.id, 'da'));
              const isDirtyTax = dirtyCells.has(cellKey(emp.id, 'tax'));
              const isActiveGross = activeCell?.id === emp.id && activeCell?.field === 'gross';
              const isActiveDA = activeCell?.id === emp.id && activeCell?.field === 'da';
              const isActiveTax = activeCell?.id === emp.id && activeCell?.field === 'tax';

              return (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium">{emp.name}</td>
                  <td className="px-3 py-2 font-mono text-sm">{emp.pan}</td>

                  {showDA && (
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={entry.da || ''}
                        onChange={(e) => updateEntry(emp.id, 'da', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, emp.id, 'da', idx, cols.indexOf('da'))}
                        ref={(el) => {
                          if (el) cellRefs.current.set(cellKey(emp.id, 'da'), el);
                        }}
                        className={`w-28 px-2 py-1 border rounded text-right transition-colors ${
                          isDirtyDA ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                        } ${isActiveDA ? 'ring-2 ring-blue-400 border-blue-400' : ''}`}
                        placeholder="0"
                        min="0"
                      />
                    </td>
                  )}

                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={entry.gross || ''}
                      onChange={(e) => updateEntry(emp.id, 'gross', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, emp.id, 'gross', idx, cols.indexOf('gross'))}
                      ref={(el) => {
                        if (el) cellRefs.current.set(cellKey(emp.id, 'gross'), el);
                      }}
                      className={`w-28 px-2 py-1 border rounded text-right transition-colors ${
                        isDirtyGross ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                      } ${isActiveGross ? 'ring-2 ring-blue-400 border-blue-400' : ''}`}
                      placeholder="0"
                      min="0"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={entry.tax || ''}
                      onChange={(e) => updateEntry(emp.id, 'tax', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, emp.id, 'tax', idx, cols.indexOf('tax'))}
                      ref={(el) => {
                        if (el) cellRefs.current.set(cellKey(emp.id, 'tax'), el);
                      }}
                      className={`w-28 px-2 py-1 border rounded text-right transition-colors ${
                        isDirtyTax ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                      } ${isActiveTax ? 'ring-2 ring-blue-400 border-blue-400' : ''}`}
                      placeholder="0"
                      min="0"
                    />
                  </td>

                  {showDA && (
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(total)}</td>
                  )}

                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleCopyPrevMonth(emp.id)}
                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                      title="Copy previous month values for this employee"
                    >
                      <Copy size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-bold sticky bottom-0">
            <tr>
              <td colSpan={showDA ? 4 : 3} className="px-3 py-2 text-right text-slate-600">Total</td>
              {showDA && (
                <td className="px-3 py-2 text-right text-amber-700">{formatCurrency(totals.da)}</td>
              )}
              <td className="px-3 py-2 text-right">{formatCurrency(totals.gross)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(totals.tax)}</td>
              <td className="px-3 py-2 text-center"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-200 py-4 px-4 -mx-4 flex justify-between items-center">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-slate-500">Gross:</span>{' '}
            <span className="font-bold text-green-700">{formatCurrency(totals.gross)}</span>
          </div>
          {showDA && (
            <div>
              <span className="text-slate-500">DA:</span>{' '}
              <span className="font-bold text-amber-700">{formatCurrency(totals.da)}</span>
            </div>
          )}
          <div>
            <span className="text-slate-500">Tax:</span>{' '}
            <span className="font-bold text-red-600">{formatCurrency(totals.tax)}</span>
          </div>
          <div>
            <span className="text-slate-500">Employees:</span>{' '}
            <span className="font-bold">{roster.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
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
                <X size={14} className="mr-1" /> Cancel
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
