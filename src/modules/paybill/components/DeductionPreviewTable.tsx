import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  UserPlus,
  Check,
} from 'lucide-react';
import { MappingStatusBadge } from './MappingStatusBadge';
import type { PayBillDeductionExtractedRecord, PayBillDeductionTotalRow } from '../types';

interface DeductionPreviewTableProps {
  records: PayBillDeductionExtractedRecord[];
  pdfTotals: PayBillDeductionTotalRow | null;
  onQuickAddEmployee?: (row: PayBillDeductionExtractedRecord['row']) => void;
}

export const DeductionPreviewTable: React.FC<DeductionPreviewTableProps> = ({
  records,
  pdfTotals,
  onQuickAddEmployee,
}) => {
  const formatInr = (n: number | undefined) =>
    `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  const calculatedTotals = records.reduce(
    (acc, r) => {
      acc.incomeTax += r.row.incomeTax || 0;
      acc.profTax += r.row.profTax || 0;
      acc.hbaInterest += r.row.hbaInterest || 0;
      acc.gpfRegular += r.row.gpfRegular || 0;
      acc.gpfClass4 += r.row.gpfClass4 || 0;
      acc.npsRegular += r.row.npsRegular || 0;
      acc.gisGovtFund += r.row.gisGovtFund || 0;
      acc.gisGovtSaving += r.row.gisGovtSaving || 0;
      acc.totalDeductions += r.row.totalDeductions || 0;
      acc.netPay += r.row.netPay || 0;
      return acc;
    },
    {
      incomeTax: 0,
      profTax: 0,
      hbaInterest: 0,
      gpfRegular: 0,
      gpfClass4: 0,
      npsRegular: 0,
      gisGovtFund: 0,
      gisGovtSaving: 0,
      totalDeductions: 0,
      netPay: 0,
    }
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span>Deduction Sheet &amp; Net Pay Verification</span>
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-[0.68rem] font-bold px-2 py-0.5 rounded-full">
            {records.length} Employees
          </span>
        </h4>
        <span className="text-xs text-slate-500 font-mono">
          Net Pay Total: <strong className="text-emerald-600 dark:text-emerald-400">{formatInr(calculatedTotals.netPay)}</strong>
        </span>
      </div>

      <div className="overflow-x-auto max-h-[450px] app-scroll">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[0.68rem] tracking-wider sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Sr</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">HRPN</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Employee Name</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Designation</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">IT (9510)</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">PT (9570)</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">HBA (9591)</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">GPF (9670)</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">GPF Cl.4 (9531)</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">NPS (9534)</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Govt Fund (9581)</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Govt Sav (9582)</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-rose-50/50 dark:bg-rose-950/30">Total Ded</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-emerald-50/50 dark:bg-emerald-950/30">Net Pay</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center">Mapping</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center">Validation</th>
              <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((rec, idx) => (
              <tr
                key={rec.id || idx}
                className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
              >
                <td className="py-2.5 px-3 font-mono text-slate-500">{rec.row.srNo || idx + 1}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                  {rec.row.hrpn}
                </td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {rec.row.employeeName}
                </td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {rec.row.designation}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {formatInr(rec.row.incomeTax)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {formatInr(rec.row.profTax)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {formatInr(rec.row.hbaInterest)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {formatInr(rec.row.gpfRegular)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {formatInr(rec.row.gpfClass4)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {formatInr(rec.row.npsRegular)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {formatInr(rec.row.gisGovtFund)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {formatInr(rec.row.gisGovtSaving)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">
                  {formatInr(rec.row.totalDeductions)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                  {formatInr(rec.row.netPay)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <MappingStatusBadge status={rec.mappingStatus} nameMismatch={rec.nameMismatch} message={rec.mappingMessage} />
                </td>
                <td className="py-2.5 px-3 text-center">
                  {rec.errors.length > 0 ? (
                    <span
                      title={rec.errors.join(' | ')}
                      className="inline-flex items-center gap-1 text-[0.65rem] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded-full font-bold cursor-help"
                    >
                      <AlertCircle size={11} className="text-red-600" /> Error
                    </span>
                  ) : rec.warnings.length > 0 ? (
                    <span
                      title={rec.warnings.join(' | ')}
                      className="inline-flex items-center gap-1 text-[0.65rem] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium cursor-help"
                    >
                      <AlertTriangle size={11} className="text-amber-500" /> Warn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[0.65rem] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                      <Check size={11} className="text-emerald-600" /> OK
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {rec.mappingStatus === 'NOT_FOUND' && onQuickAddEmployee ? (
                    <button
                      onClick={() => onQuickAddEmployee(rec.row)}
                      className="inline-flex items-center gap-0.5 text-[0.65rem] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition"
                      title="Add to Master Employee dataset"
                    >
                      <UserPlus size={10} /> Add
                    </button>
                  ) : (
                    <span className="text-[0.65rem] text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Footer totals */}
          <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 z-10 backdrop-blur-xs">
            <tr>
              <td colSpan={6} className="py-3 px-3 text-left uppercase text-[0.72rem] tracking-wider text-slate-800 dark:text-slate-200">
                Total ({records.length} Employees)
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                {formatInr(pdfTotals?.incomeTax || calculatedTotals.incomeTax)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                {formatInr(pdfTotals?.profTax || calculatedTotals.profTax)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                {formatInr(pdfTotals?.hbaInterest || calculatedTotals.hbaInterest)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                {formatInr(pdfTotals?.gpfRegular || calculatedTotals.gpfRegular)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                {formatInr(pdfTotals?.gpfClass4 || calculatedTotals.gpfClass4)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                {formatInr(pdfTotals?.npsRegular || calculatedTotals.npsRegular)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                {formatInr(pdfTotals?.gisGovtFund || calculatedTotals.gisGovtFund)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                {formatInr(pdfTotals?.gisGovtSaving || calculatedTotals.gisGovtSaving)}
              </td>
              <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-950/40">
                {formatInr(pdfTotals?.totalDeductions || calculatedTotals.totalDeductions)}
              </td>
              <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/40">
                {formatInr(pdfTotals?.netPay || calculatedTotals.netPay)}
              </td>
              <td colSpan={3} className="py-3 px-3 text-center">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold font-mono text-[0.7rem]">
                  RECONCILED
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
