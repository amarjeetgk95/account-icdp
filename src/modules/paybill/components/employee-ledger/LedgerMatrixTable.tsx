import { useMemo, useState } from 'react';
import {
  MONTH_ORDER,
  summarizeSection,
} from './ledgerMath';
import type { LedgerMatrixRow as MatrixRowModel } from './ledgerMath';
import { LedgerSectionHeader } from './LedgerSectionHeader';
import { LedgerMatrixRow } from './LedgerMatrixRow';

interface LedgerMatrixTableProps {
  rows: MatrixRowModel[];
  employeeName: string;
  hrpn: string;
  fyLabel: string;
  anomalyMonths: { zeroGross: Set<number>; negativeNet: Set<number> };
  onMonthClick?: (month: string) => void;
}

const ALL_12_MONTH_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * 12-Month Ledger Matrix Table:
 * - Direct full 12-month financial grid
 * - Interactive month headers with audit drill-down cues
 * - Static EARNING and DEDUCTION section divisions with sub-totals
 * - High-precision sticky table header
 * - Keeps `border-separate border-spacing-0` for sticky cell border stability
 */
export function LedgerMatrixTable({
  rows,
  employeeName,
  hrpn,
  fyLabel,
  anomalyMonths,
  onMonthClick,
}: LedgerMatrixTableProps) {
  // Column crosshair highlight on cell hover
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const visibleMonthIndices = ALL_12_MONTH_INDICES;
  const visibleCount = visibleMonthIndices.length;

  const earningSectionSummary = useMemo(
    () => summarizeSection(rows, 'EARNING', visibleMonthIndices),
    [rows, visibleMonthIndices]
  );
  const deductionSectionSummary = useMemo(
    () => summarizeSection(rows, 'DEDUCTION', visibleMonthIndices),
    [rows, visibleMonthIndices]
  );

  return (
    <section className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
      {/* Grid Container */}
      <div
        className="ledger-scroll overflow-auto app-scroll flex-1 min-h-0"
        onMouseLeave={() => setHoveredCol(null)}
      >
        <table
          className="w-full text-sm text-left border-separate border-spacing-0"
          aria-label={`Employee ledger for ${employeeName}, HRPN ${hrpn}, FY ${fyLabel}`}
        >
          <caption className="sr-only">
            Twelve-month earnings and deductions ledger grouped by parameter with monthly values and totals
          </caption>

          {/* Table Thead */}
          <thead className="bg-slate-100/95 dark:bg-slate-850/95 text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider sticky top-0 z-30 backdrop-blur-xs">
            <tr>
              <th
                scope="col"
                className="py-2 px-3 font-bold border-b border-slate-200/90 dark:border-slate-800 sticky left-0 bg-slate-100 dark:bg-slate-850 z-20 min-w-[180px] border-r border-slate-200/90 dark:border-slate-800"
              >
                Allowance Parameter
              </th>
              {visibleMonthIndices.map((mi) => (
                <th
                  scope="col"
                  key={mi}
                  onMouseEnter={() => setHoveredCol(mi)}
                  className={`py-2 px-1 font-bold border-b border-slate-200/90 dark:border-slate-800 text-right min-w-[78px] transition-colors ${
                    hoveredCol === mi ? 'bg-blue-100/70 dark:bg-blue-950/60' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onMonthClick?.(MONTH_ORDER[mi])}
                    disabled={!onMonthClick}
                    title={`View ${MONTH_ORDER[mi]} source records & PDF slips`}
                    className={`w-full px-1.5 py-1 rounded-md uppercase tracking-wider text-right font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                      onMonthClick
                        ? 'cursor-pointer hover:bg-blue-200/60 dark:hover:bg-blue-900/60 hover:text-blue-800 dark:hover:text-blue-200'
                        : 'cursor-default'
                    }`}
                  >
                    {MONTH_ORDER[mi]}
                  </button>
                </th>
              ))}
              <th
                scope="col"
                className="py-2 px-3 font-extrabold border-b border-slate-200/90 dark:border-slate-800 text-right bg-slate-200/70 dark:bg-slate-800/80 min-w-[105px] border-l border-slate-200/90 dark:border-slate-800"
              >
                Annual Total
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            <LedgerSectionHeader
              label="EARNING"
              toneClasses="bg-blue-50/60 dark:bg-blue-950/30"
              summary={earningSectionSummary}
              colSpan={visibleCount + 2}
            />
            {rows
              .filter((r) => r.group === 'EARNING')
              .map((row, index) => (
                <LedgerMatrixRow
                  key={row.key}
                  row={row}
                  rowIndex={index}
                  visibleMonthIndices={visibleMonthIndices}
                  hoveredCol={hoveredCol}
                  setHoveredCol={setHoveredCol}
                  anomalyMonths={anomalyMonths}
                />
              ))}

            <LedgerSectionHeader
              label="DEDUCTION"
              toneClasses="bg-rose-50/60 dark:bg-rose-950/30"
              summary={deductionSectionSummary}
              colSpan={visibleCount + 2}
            />
            {rows
              .filter((r) => r.group === 'DEDUCTION')
              .map((row, index) => (
                <LedgerMatrixRow
                  key={row.key}
                  row={row}
                  rowIndex={index}
                  visibleMonthIndices={visibleMonthIndices}
                  hoveredCol={hoveredCol}
                  setHoveredCol={setHoveredCol}
                  anomalyMonths={anomalyMonths}
                />
              ))}
          </tbody>
        </table>
      </div>

      {/* Row Jump Flash Animation */}
      <style>{`
        @keyframes ledger-row-flash {
          0%, 100% { background-color: transparent; }
          25%, 75% { background-color: rgba(59, 130, 246, 0.22); }
        }
        .flash-row > td { animation: ledger-row-flash 1.5s ease-in-out; }
        @media print {
          tfoot { display: none !important; }
        }
      `}</style>
    </section>
  );
}


