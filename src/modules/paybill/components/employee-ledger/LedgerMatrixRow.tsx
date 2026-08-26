import { AlertTriangle } from 'lucide-react';
import { MONTH_ORDER } from './ledgerMath';
import type { LedgerMatrixRow as LedgerMatrixRowModel } from './ledgerMath';
import { formatInr } from './format';

interface LedgerMatrixRowProps {
  row: LedgerMatrixRowModel;
  rowIndex?: number;
  visibleMonthIndices: number[];
  hoveredCol: number | null;
  setHoveredCol: (col: number | null) => void;
  anomalyMonths: { zeroGross: Set<number>; negativeNet: Set<number> };
}

/**
 * One matrix row:
 * - Sticky parameter label cell with Arrears pill badge
 * - Monospace tabular figures with column hover highlights
 * - High-contrast semantic row styling (Gross, Total Deductions, Net Pay)
 * - Anomaly indicators with descriptive tooltips
 */
export function LedgerMatrixRow({
  row,
  rowIndex = 0,
  visibleMonthIndices,
  hoveredCol,
  setHoveredCol,
  anomalyMonths,
}: LedgerMatrixRowProps) {
  const isGross = row.key === 'grossAmount';
  const isTotalDed = row.key === 'totalDeductions';
  const isNetPay = row.key === 'netPay';
  const isDiff =
    row.label.toLowerCase().includes('difference') ||
    row.label.toLowerCase().includes('arrear') ||
    row.key.toLowerCase().includes('difference');

  const visibleTotal = visibleMonthIndices.reduce((s, i) => s + (row.values[i] || 0), 0);
  const isEven = rowIndex % 2 === 0;

  const rowBaseBg = isNetPay
    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 font-bold'
    : isGross
      ? 'bg-blue-50/60 dark:bg-blue-950/40 font-bold'
      : isTotalDed
        ? 'bg-rose-50/60 dark:bg-rose-950/40 font-bold'
        : isEven
          ? 'bg-slate-50/60 dark:bg-slate-850/40 hover:bg-blue-50/50 dark:hover:bg-slate-800/60'
          : 'bg-white dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-slate-800/60';

  return (
    <tr
      id={`ledger-row-${row.key}`}
      className={`group transition-colors border-b border-slate-200/70 dark:border-slate-800/70 ${rowBaseBg}`}
    >
      {/* Parameter Column (Sticky Left) */}
      <td
        className={`py-2 px-3 sticky left-0 z-10 font-sans text-xs border-r border-slate-200/90 dark:border-slate-800 ${
          isGross
            ? 'bg-blue-50 dark:bg-blue-950 text-blue-950 dark:text-blue-100 font-extrabold shadow-2xs'
            : isNetPay
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-100 font-extrabold shadow-2xs'
              : isTotalDed
                ? 'bg-rose-50 dark:bg-rose-950 text-rose-950 dark:text-rose-100 font-extrabold shadow-2xs'
                : isEven
                  ? 'bg-slate-50/95 dark:bg-slate-850/95 text-slate-800 dark:text-slate-200 font-medium group-hover:bg-blue-50 dark:group-hover:bg-slate-800'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium group-hover:bg-blue-50 dark:group-hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-[160px]">
          <span className="truncate">{row.label}</span>
          {isDiff && (
            <span className="diff-badge px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/80">
              Arrears
            </span>
          )}
        </div>
      </td>

      {/* Monthly Figures */}
      {visibleMonthIndices.map((mi) => {
        const v = row.values[mi];
        const colHighlighted = hoveredCol === mi;
        const anomaly =
          (isGross && anomalyMonths.zeroGross.has(mi)) ||
          (isNetPay && anomalyMonths.negativeNet.has(mi));
        const anomalyTitle =
          isGross && anomaly
            ? `${MONTH_ORDER[mi]}: zero gross — salary run appears to be missing for this month`
            : isNetPay && anomaly
              ? `${MONTH_ORDER[mi]}: negative net pay — total deductions exceed gross for this month`
              : `${MONTH_ORDER[mi]}: ${formatInr(v)}`;

        return (
          <td
            key={mi}
            onMouseEnter={() => setHoveredCol(mi)}
            className={`py-2 px-2 text-right whitespace-nowrap transition-colors text-xs ${
              colHighlighted ? 'bg-blue-100/50 dark:bg-blue-900/30' : ''
            } ${
              isGross
                ? 'font-bold text-blue-800 dark:text-blue-300'
                : isNetPay
                  ? 'font-bold text-emerald-800 dark:text-emerald-300'
                  : isTotalDed
                    ? 'font-bold text-rose-800 dark:text-rose-300'
                    : isDiff
                      ? 'font-semibold text-amber-900 dark:text-amber-300'
                      : v === 0
                        ? 'text-slate-400 dark:text-slate-600'
                        : 'text-slate-700 dark:text-slate-200 font-medium'
            } ${anomaly ? 'bg-amber-100/60 dark:bg-amber-950/40' : ''}`}
          >
            <span
              className="font-mono tabular-nums inline-flex items-center justify-end gap-1"
              title={anomalyTitle}
            >
              {anomaly && (
                <AlertTriangle
                  className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0"
                  aria-label={anomalyTitle}
                  aria-hidden="false"
                />
              )}
              {formatInr(v)}
            </span>
          </td>
        );
      })}

      {/* Row Total (Sticky or End Column) */}
      <td
        onMouseEnter={() => setHoveredCol(null)}
        className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap tabular-nums text-xs border-l border-slate-200/60 dark:border-slate-800/60 ${
          isGross
            ? 'bg-blue-100/90 dark:bg-blue-950 text-blue-950 dark:text-blue-100 font-extrabold'
            : isNetPay
              ? 'bg-emerald-100/90 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-100 font-extrabold'
              : isTotalDed
                ? 'bg-rose-100/90 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 font-extrabold'
                : isDiff
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100'
        }`}
      >
        {formatInr(visibleTotal)}
      </td>
    </tr>
  );
}

