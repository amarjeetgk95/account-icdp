import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { useUIStore } from '@/core/stores/ui-store';
import { useGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import {
  useGTR30EmployeeMasterGroups,
  useCopyGTR30EmployeeGroup,
  gtr30GroupKey,
} from '../hooks/useGTR30EmployeeMaster';
import { gtr30MonthKeyFor, gtr30MonthOptions, gtr30YearOptions } from '../utils/gtr30MonthKey';

interface GTR30CopyMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMonthKey: string;
  targetBillCode: string;
  targetCount: number;
}

export function GTR30CopyMasterModal({
  isOpen,
  onClose,
  targetMonthKey,
  targetBillCode,
  targetCount,
}: GTR30CopyMasterModalProps) {
  const { toast } = useToast();
  const activeFY = useUIStore((state) => state.activeFinancialYear) ?? 2026;
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const mappingsQuery = useGTR30BillCodeMappings();
  const copyMutation = useCopyGTR30EmployeeGroup();

  const groups = groupsQuery.data ?? {};
  const mappings = mappingsQuery.data ?? [];

  const [fromMonth, setFromMonth] = useState('June');
  const [fromYear, setFromYear] = useState(activeFY);
  const [fromBillCode, setFromBillCode] = useState(targetBillCode || 'GTR30-SAL');
  const [overwrite, setOverwrite] = useState(false);
  const [adjustDA, setAdjustDA] = useState(false);
  const [daPercent, setDaPercent] = useState(53);
  const [isCopying, setIsCopying] = useState(false);

  const fromMonthKey = gtr30MonthKeyFor(fromMonth, fromYear);
  const sourceEmployees = groups[gtr30GroupKey(fromMonthKey, fromBillCode)] ?? [];

  const handleCopy = async () => {
    if (sourceEmployees.length === 0) {
      toast({
        title: 'Source Group Empty',
        description: `No employees found in ${fromMonthKey} / ${fromBillCode}.`,
        variant: 'destructive',
      });
      return;
    }

    if (targetCount > 0 && !overwrite) {
      toast({
        title: 'Target Contains Employees',
        description: 'Please enable "Overwrite existing employees" to replace target entries.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCopying(true);
      await copyMutation.mutateAsync({
        sourceMonthKey: fromMonthKey,
        sourceBillCode: fromBillCode,
        targetMonthKey,
        targetBillCode,
        options: {
          overwrite,
          daPercent: adjustDA ? daPercent : undefined,
        },
      });

      toast({
        title: 'Master Rollover Complete',
        description: `Successfully copied ${sourceEmployees.length} employee(s) to ${targetMonthKey} / ${targetBillCode}.`,
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: error instanceof Error ? error.message : 'Could not copy employee group.',
        variant: 'destructive',
      });
    } finally {
      setIsCopying(false);
    }
  };

  const selectStyle =
    'w-full h-9 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 px-2 text-sm';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isCopying && !open && onClose()}>
      <DialogContent className="max-w-md p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Copy size={16} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Copy Master from Another Month
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Roll over employee entries from a previous month into <strong>{targetMonthKey}</strong> / <strong>{targetBillCode}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Source Selection */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
            Source Month &amp; Bill Code
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Source Month</Label>
              <select
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
                className={selectStyle}
              >
                {gtr30MonthOptions().map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[11px]">Source Year</Label>
              <select
                value={fromYear}
                onChange={(e) => setFromYear(Number(e.target.value))}
                className={selectStyle}
              >
                {gtr30YearOptions(activeFY).map((y) => (
                  <option key={y} value={y}>
                    {y}-{String(y + 1).slice(-2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-[11px]">Source Bill Code</Label>
            <select
              value={fromBillCode}
              onChange={(e) => setFromBillCode(e.target.value)}
              className={selectStyle}
            >
              {mappings.map((m) => (
                <option key={m.id} value={m.billCode}>
                  {m.billCode} - {m.description}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1 text-slate-600">
            <span>Source records:</span>
            <span className="font-bold text-blue-700">
              {sourceEmployees.length} employee{sourceEmployees.length === 1 ? '' : 's'} available
            </span>
          </div>
        </div>

        {/* Target summary flow */}
        <div className="flex items-center justify-center gap-2 text-xs py-1 text-slate-500 font-medium">
          <span className="bg-slate-100 px-2 py-1 rounded font-mono text-slate-700">{fromMonthKey} ({fromBillCode})</span>
          <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
          <span className="bg-blue-50 px-2 py-1 rounded font-mono text-blue-700 font-bold">{targetMonthKey} ({targetBillCode})</span>
        </div>

        {/* Options */}
        <div className="space-y-2.5 text-xs text-slate-700">
          {targetCount > 0 && (
            <label className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="font-semibold text-amber-900 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Overwrite existing {targetCount} employee(s) in target group
                </span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Target month currently has entries. Check to replace them.
                </p>
              </div>
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={adjustDA}
              onChange={(e) => setAdjustDA(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Recalculate DA rate during copy</span>
            {adjustDA && (
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  value={daPercent}
                  onChange={(e) => setDaPercent(Number(e.target.value))}
                  className="w-14 h-7 text-xs border border-slate-300 rounded px-1 text-center font-bold font-mono"
                />
                <span className="text-[11px] font-semibold">%</span>
              </div>
            )}
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isCopying}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCopy}
            disabled={sourceEmployees.length === 0 || (targetCount > 0 && !overwrite) || isCopying}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isCopying ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Copying...
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy {sourceEmployees.length} Employee(s)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
