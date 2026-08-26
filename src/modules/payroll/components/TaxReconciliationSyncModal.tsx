import { useState, useId } from 'react';
import { formatCurrency } from '@/shared/utilities';
import type { TaxReconciliationRow } from '../types/reconciliation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TaxReconciliationSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hrpns: string[]) => Promise<void>;
  targetRows: TaxReconciliationRow[];
  quarter: string;
  fyLabel: string;
  isLoading: boolean;
}

export function TaxReconciliationSyncModal({
  isOpen,
  onClose,
  onConfirm,
  targetRows,
  quarter,
  fyLabel,
  isLoading,
}: TaxReconciliationSyncModalProps) {
  const [selectedHrpns, setSelectedHrpns] = useState<string[]>(() => targetRows.map((r) => r.hrpn));
  const selectAllId = useId();

  const handleToggleSelect = (hrpn: string) => {
    setSelectedHrpns((prev) =>
      prev.includes(hrpn) ? prev.filter((h) => h !== hrpn) : [...prev, hrpn]
    );
  };

  const handleToggleAll = () => {
    if (selectedHrpns.length === targetRows.length) {
      setSelectedHrpns([]);
    } else {
      setSelectedHrpns(targetRows.map((r) => r.hrpn));
    }
  };

  const handleProceed = async () => {
    if (selectedHrpns.length === 0) return;
    await onConfirm(selectedHrpns);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <RefreshCw size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Sync Paybill Data to Payroll (24Q Grid)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Period: <span className="font-bold text-slate-700 dark:text-slate-300">{quarter} (FY {fyLabel})</span>.
            Synchronize verified Treasury Paybill Income Tax and Gross figures directly into monthly salary entries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 rounded-xl text-xs text-indigo-900 dark:text-indigo-300">
            <AlertTriangle size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              This will update <strong className="font-bold">employee_salaries</strong> (Gross, DA, and Tax) for the selected employees in {quarter}. This ensures 100% parity for 24Q e-TDS filing.
            </span>
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <label htmlFor={selectAllId} className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                id={selectAllId}
                type="checkbox"
                checked={selectedHrpns.length === targetRows.length && targetRows.length > 0}
                onChange={handleToggleAll}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Select All ({targetRows.length} eligible)</span>
            </label>
            <span className="text-slate-500 font-medium">
              {selectedHrpns.length} of {targetRows.length} selected
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0">
                <tr>
                  <th className="w-8 px-3 py-2 text-center">#</th>
                  <th className="px-3 py-2 text-left">Employee / HRPN</th>
                  <th className="px-3 py-2 text-right">Paybill IT</th>
                  <th className="px-3 py-2 text-right">Payroll IT</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {targetRows.map((r) => {
                  const isChecked = selectedHrpns.includes(r.hrpn);
                  return (
                    <tr
                      key={r.hrpn}
                      onClick={() => handleToggleSelect(r.hrpn)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(r.hrpn)}
                          aria-label={`Select employee ${r.employeeName} with HRPN ${r.hrpn}`}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{r.employeeName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{r.hrpn} {r.pan ? `· ${r.pan}` : ''}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatCurrency(r.quarterPaybillTax)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatCurrency(r.quarterPayrollTax)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatCurrency(r.quarterTaxDiff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={isLoading || selectedHrpns.length === 0}
            className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Syncing Data...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Sync {selectedHrpns.length} Record{selectedHrpns.length !== 1 ? 's' : ''} to Payroll</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
