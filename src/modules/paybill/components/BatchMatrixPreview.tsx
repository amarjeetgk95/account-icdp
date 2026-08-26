import React from 'react';
import { PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../services/paybillReport.service';
import type { PayBillBatchMatrix } from '../types';
import { Layers } from 'lucide-react';

interface BatchMatrixPreviewProps {
  matrix: PayBillBatchMatrix;
}

const ALL_COLUMNS = [...PAYBILL_EARNING_COLUMNS, ...PAYBILL_DEDUCTION_COLUMNS];

const formatInr = (n: number | undefined) =>
  `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export const BatchMatrixPreview: React.FC<BatchMatrixPreviewProps> = ({ matrix }) => {
  const totalCols = ALL_COLUMNS.length + 1; // +1 for the Employee column

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center font-bold">
            <Layers size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Consolidated Batch Matrix Preview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {matrix.months.length} month(s) &bull; {matrix.totalEmployees} employee record(s) &bull; {matrix.totalFiles} file(s) &bull; merged Earning + Deduction
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[540px] app-scroll">
        <table className="w-full text-xs text-left border-separate border-spacing-0">
          <thead className="text-slate-700 dark:text-slate-200 sticky top-0 z-30 shadow-sm font-sans">
            {/* Group Header Row */}
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90">
              <th
                rowSpan={2}
                className="py-2.5 px-3 font-bold sticky left-0 bg-slate-100 dark:bg-slate-800 min-w-[190px] z-20 border-r border-b border-slate-200 dark:border-slate-700"
              >
                Employee
              </th>
              <th
                colSpan={PAYBILL_EARNING_COLUMNS.length}
                className="py-2 px-2.5 text-center font-extrabold text-blue-900 dark:text-blue-200 bg-blue-100/80 dark:bg-blue-950/60 border-r border-slate-200 dark:border-slate-700"
              >
                EARNING
              </th>
              <th
                colSpan={PAYBILL_DEDUCTION_COLUMNS.length}
                className="py-2 px-2.5 text-center font-extrabold text-rose-900 dark:text-rose-200 bg-rose-100/80 dark:bg-rose-950/40"
              >
                DEDUCTION
              </th>
            </tr>
            {/* Parameter Label Row (vertical text) */}
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90">
              {ALL_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`py-1.5 px-1 text-center font-semibold align-bottom min-w-[52px] max-w-[64px] border-r border-slate-200 dark:border-slate-700 ${
                    col.key === 'grossAmount'
                      ? 'text-blue-900 dark:text-blue-200'
                      : col.key === 'netPay'
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : col.key === 'totalDeductions'
                          ? 'text-rose-900 dark:text-rose-200'
                          : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span
                    className="inline-block leading-tight"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[0.72rem]">
            {matrix.months.map((monthBlock) => (
              <React.Fragment key={monthBlock.monthLabel}>
                {/* Month Section Header */}
                <tr className="bg-slate-200/70 dark:bg-slate-700/60">
                  <td
                    colSpan={totalCols}
                    className="py-1.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100"
                  >
                    Month: {monthBlock.monthLabel} &bull; FY {monthBlock.financialYear}-
                    {String(monthBlock.financialYear + 1).slice(-2)} &bull; {monthBlock.rows.length} employee(s)
                  </td>
                </tr>

                {/* Employee Rows */}
                {monthBlock.rows.map((row) => (
                  <tr key={`${monthBlock.monthLabel}-${row.hrpn}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 sticky left-0 z-10 bg-white dark:bg-slate-900 font-sans border-r border-slate-100 dark:border-slate-800">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {row.employeeName}
                      </div>
                      <div className="text-[0.65rem] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {row.hrpn}
                        {row.designation ? `  •  ${row.designation}` : ''}
                      </div>
                    </td>
                    {ALL_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`py-2 px-2.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap ${
                          col.key === 'grossAmount'
                            ? 'font-bold text-blue-700 dark:text-blue-300'
                            : col.key === 'netPay'
                              ? 'font-bold text-emerald-700 dark:text-emerald-300'
                              : col.key === 'totalDeductions'
                                ? 'font-bold text-rose-700 dark:text-rose-300'
                                : ''
                        }`}
                      >
                        {formatInr(row.values[col.key])}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Month Totals Row */}
                <tr className="bg-slate-100/90 dark:bg-slate-800/70 font-sans">
                  <td className="py-2 px-3 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                    Total ({monthBlock.rows.length} Employees)
                  </td>
                  {ALL_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2 px-2.5 text-right font-extrabold whitespace-nowrap ${
                        col.key === 'grossAmount'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
                          : col.key === 'netPay'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                            : col.key === 'totalDeductions'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200'
                              : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {formatInr(monthBlock.totals[col.key])}
                    </td>
                  ))}
                </tr>
              </React.Fragment>
            ))}

            {matrix.months.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="py-8 text-center text-slate-400 font-sans">
                  No successfully parsed files to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};