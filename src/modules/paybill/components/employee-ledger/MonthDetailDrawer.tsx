import { useMemo } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Calendar, FileCheck, Layers, X } from 'lucide-react';
import {
  PAYBILL_EARNING_COLUMNS,
  PAYBILL_DEDUCTION_COLUMNS,
} from '../../services/paybillReport.service';
import type { PayBillMonthlyMatrixColumn } from '../../types';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../../types';
import { formatInr } from './format';

interface MonthDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string | null;
  employeeName: string;
  earnings: PayBillStoredEarning[];
  deductions: PayBillStoredDeduction[];
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface ComponentValue {
  label: string;
  value: number;
}

/** Nonzero components of one stored record, labelled via the canonical column lists. */
const readComponents = (
  record: unknown,
  columns: PayBillMonthlyMatrixColumn[],
  emphasisKey: string
): ComponentValue[] => {
  const out: ComponentValue[] = [];
  const rec = record as Record<string, unknown>;
  for (const col of columns) {
    if (col.key === emphasisKey) continue;
    const v = Number(rec[col.key] ?? 0);
    if (v !== 0) out.push({ label: col.label, value: v });
  }
  return out;
};

function RecordCard({
  record,
  columns,
  emphasisKey,
  emphasisLabel,
  emphasisClass,
}: {
  record: unknown;
  columns: PayBillMonthlyMatrixColumn[];
  emphasisKey: string;
  emphasisLabel: string;
  emphasisClass: string;
}) {
  const components = readComponents(record, columns, emphasisKey);
  const emphasisValue = Number((record as Record<string, unknown>)[emphasisKey] ?? 0);
  const importIdShort = String((record as Record<string, unknown>).importId ?? '').slice(0, 8);

  return (
    <li className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
      <dl className="space-y-1.5">
        {components.map((c) => (
          <div key={c.label} className="flex items-baseline justify-between gap-3 text-xs">
            <dt className="text-slate-600 dark:text-slate-400 font-medium">{c.label}</dt>
            <dd className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {formatInr(c.value)}
            </dd>
          </div>
        ))}

        <div
          className={`flex items-baseline justify-between gap-3 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 ${emphasisClass}`}
        >
          <dt className="text-xs font-bold uppercase tracking-wider">{emphasisLabel}</dt>
          <dd className="text-sm font-extrabold font-mono tabular-nums">{formatInr(emphasisValue)}</dd>
        </div>
      </dl>

      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
        <span className="truncate">Import {importIdShort}</span>
        <span className="truncate">{formatDate(String((record as Record<string, unknown>).createdAt ?? ''))}</span>
      </div>
    </li>
  );
}

function MonthSection({
  heading,
  records,
  columns,
  emphasisKey,
}: {
  heading: string;
  records: (PayBillStoredEarning | PayBillStoredDeduction)[];
  columns: PayBillMonthlyMatrixColumn[];
  emphasisKey: string;
}) {
  const emphasisLabel = columns.find((c) => c.key === emphasisKey)?.label ?? emphasisKey;
  const isEarning = heading.toUpperCase().includes('EARNING');
  const emphasisClass = isEarning
    ? 'text-blue-700 dark:text-blue-300'
    : 'text-emerald-700 dark:text-emerald-300';

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
              isEarning
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            <Layers className="w-2.5 h-2.5" />
          </span>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {heading}
          </h4>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 tabular-nums">
          {records.length} record{records.length === 1 ? '' : 's'}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">No records for this month</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {records.map((rec) => (
            <RecordCard
              key={rec.id}
              record={rec}
              columns={columns}
              emphasisKey={emphasisKey}
              emphasisLabel={emphasisLabel}
              emphasisClass={emphasisClass}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Month Detail Drawer:
 * - High-clarity audit drill-down side panel
 * - Itemized earning and deduction slips with import ID lineage
 * - Full Radix Dialog accessible modal support
 */
export function MonthDetailDrawer({
  open,
  onOpenChange,
  month,
  employeeName,
  earnings,
  deductions,
}: MonthDetailDrawerProps) {
  const monthEarnings = useMemo(
    () => (month ? earnings.filter((e) => e.month === month) : []),
    [earnings, month]
  );
  const monthDeductions = useMemo(
    () => (month ? deductions.filter((d) => d.month === month) : []),
    [deductions, month]
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-50 dark:bg-slate-950 border-l border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
        >
          {/* Header */}
          <div className="shrink-0 px-5 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 flex items-start justify-between gap-3 shadow-2xs">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <FileCheck className="w-3 h-3" />
                </span>
                <DialogPrimitive.Title className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  {month} — {employeeName}
                </DialogPrimitive.Title>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-7 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Source salary & deduction slips for this month</span>
              </p>
            </div>
            <DialogPrimitive.Close
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none"
              aria-label="Close month detail"
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto app-scroll p-5 space-y-5">
            <MonthSection
              heading="EARNING"
              records={monthEarnings}
              columns={PAYBILL_EARNING_COLUMNS}
              emphasisKey="grossAmount"
            />
            <MonthSection
              heading="DEDUCTION"
              records={monthDeductions}
              columns={PAYBILL_DEDUCTION_COLUMNS}
              emphasisKey="netPay"
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

