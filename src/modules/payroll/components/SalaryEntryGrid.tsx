import { useState, useEffect } from 'react';
import type { EmployeeRosterItem } from '../types';
import { formatCurrency } from '@/shared/utilities';

interface SalaryEntryGridProps {
  roster: EmployeeRosterItem[];
  isLoading: boolean;
  showDA: boolean;
  onSave: (entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>) => void;
}

export function SalaryEntryGrid({ roster, isLoading, showDA, onSave }: SalaryEntryGridProps) {
  const [entries, setEntries] = useState<Record<string, { gross: number; da: number; tax: number }>>({});

  useEffect(() => {
    const initial: Record<string, { gross: number; da: number; tax: number }> = {};
    roster.forEach((emp) => {
      initial[emp.id] = { gross: emp.gross, da: emp.da, tax: emp.tax };
    });
    setEntries(initial);
  }, [roster]);

  const updateEntry = (id: string, field: 'gross' | 'da' | 'tax', value: string) => {
    const num = parseFloat(value) || 0;
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: Math.max(0, num) },
    }));
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
  };

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
        Click <strong>"Load Roster"</strong> to fetch employee data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 w-10">#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">PAN No.</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Gross Salary</th>
              {showDA && (
                <>
                  <th className="px-3 py-2 text-right font-semibold text-amber-700">DA & Other</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Total Salary</th>
                </>
              )}
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Tax Deduction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roster.map((emp, idx) => {
              const entry = entries[emp.id] || { gross: 0, da: 0, tax: 0 };
              const total = entry.gross + entry.da;
              return (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium">{emp.name}</td>
                  <td className="px-3 py-2 font-mono text-sm">{emp.pan}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={entry.gross || ''}
                      onChange={(e) => updateEntry(emp.id, 'gross', e.target.value)}
                      className="w-28 px-2 py-1 border border-slate-300 rounded text-right"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  {showDA && (
                    <>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={entry.da || ''}
                          onChange={(e) => updateEntry(emp.id, 'da', e.target.value)}
                          className="w-28 px-2 py-1 border border-slate-300 rounded text-right"
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{formatCurrency(total)}</td>
                    </>
                  )}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={entry.tax || ''}
                      onChange={(e) => updateEntry(emp.id, 'tax', e.target.value)}
                      className="w-28 px-2 py-1 border border-slate-300 rounded text-right"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-bold sticky bottom-0">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right text-slate-600">Total</td>
              <td className="px-3 py-2 text-right">{formatCurrency(totals.gross)}</td>
              {showDA && (
                <>
                  <td className="px-3 py-2 text-right text-amber-700">{formatCurrency(totals.da)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(totals.gross + totals.da)}</td>
                </>
              )}
              <td className="px-3 py-2 text-right">{formatCurrency(totals.tax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Action Bar */}
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
          {status && <span className="text-sm text-slate-600">{status}</span>}
          <button onClick={handleSave} className="btn btn-primary">
            💾 Save Monthly Data
          </button>
        </div>
      </div>
    </div>
  );
}
