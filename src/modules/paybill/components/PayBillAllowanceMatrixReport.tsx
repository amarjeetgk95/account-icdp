import { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  User,
  RefreshCw,
  Landmark,
} from 'lucide-react';
import { paybillRepository } from '../repositories/paybill.repository';
import { paybillReportService } from '../services/paybillReport.service';
import type { PayBillAllowanceMatrixReport as MatrixReportType } from '../types';

interface PayBillAllowanceMatrixReportProps {
  financialYear: number;
  initialHrpn?: string | null;
}

export function PayBillAllowanceMatrixReport({
  financialYear,
  initialHrpn = null,
}: PayBillAllowanceMatrixReportProps) {
  const [selectedHrpn, setSelectedHrpn] = useState<string>(initialHrpn || 'ALL');
  const [report, setReport] = useState<MatrixReportType | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<
    Array<{ hrpn: string; name: string; designation?: string | null; payScale?: string | null }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load available distinct employees for dropdown
  useEffect(() => {
    async function loadEmployees() {
      const list = await paybillRepository.listEarnings({ financialYear });
      const map = new Map<
        string,
        { name: string; designation?: string | null; payScale?: string | null }
      >();
      for (const e of list) {
        if (!map.has(e.hrpn)) {
          map.set(e.hrpn, {
            name: e.employeeName,
            designation: e.designation,
            payScale: e.payScale,
          });
        }
      }
      setAvailableEmployees(
        Array.from(map.entries()).map(([hrpn, info]) => ({
          hrpn,
          name: info.name,
          designation: info.designation,
          payScale: info.payScale,
        }))
      );
    }
    loadEmployees();
  }, [financialYear]);

  // Load report data
  const loadReport = async () => {
    setIsLoading(true);
    try {
      const data = await paybillReportService.getMatrixReport(
        financialYear,
        selectedHrpn === 'ALL' ? null : selectedHrpn
      );
      setReport(data);
    } catch (err) {
      console.error('[PayBillAllowanceMatrixReport] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [financialYear, selectedHrpn]);

  const formatInr = (n: number | undefined) => {
    if (n === undefined || n === null || isNaN(n)) return '₹0';
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  };

  const handleExportCsv = () => {
    if (report) {
      paybillReportService.exportToCsv(report);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const fyLabel = `${financialYear}-${String(financialYear + 1).slice(-2)}`;

  return (
    <div className="space-y-4">
      {/* Top Filter & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Pay Bill Allowance Matrix Report
              </h3>
              <p className="text-xs text-slate-500">
                Monthly Breakdown (Columns = Months, Rows = Parameters) &bull; FY {fyLabel}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

          {/* Employee Filter Dropdown */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <select
              value={selectedHrpn}
              onChange={(e) => setSelectedHrpn(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Employees (Office Aggregate)</option>
              {availableEmployees.map((emp) => (
                <option key={emp.hrpn} value={emp.hrpn}>
                  {emp.hrpn} - {emp.name}
                  {emp.designation ? ` (${emp.designation}${emp.payScale ? ` • ${emp.payScale}` : ''})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!report || report.rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>Statement Target:</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">
              {selectedHrpn === 'ALL'
                ? 'Full Office Allowance Aggregate'
                : `${report?.employeeName || 'Employee'} (HRPN: ${selectedHrpn})`}
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            Annual Gross Total: <span className="text-emerald-600 dark:text-emerald-400">{formatInr(report?.totalGross)}</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[560px] app-scroll">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 sticky top-0 z-10 shadow-sm font-sans">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 font-bold sticky left-0 bg-slate-100 dark:bg-slate-800 min-w-[200px] z-20">
                  Allowance Parameter
                </th>
                {/* Q1 Months */}
                <th className="py-2.5 px-2 text-right font-semibold">Apr</th>
                <th className="py-2.5 px-2 text-right font-semibold">May</th>
                <th className="py-2.5 px-2 text-right font-semibold">Jun</th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100">
                  Q1 Total
                </th>

                {/* Q2 Months */}
                <th className="py-2.5 px-2 text-right font-semibold">Jul</th>
                <th className="py-2.5 px-2 text-right font-semibold">Aug</th>
                <th className="py-2.5 px-2 text-right font-semibold">Sep</th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100">
                  Q2 Total
                </th>

                {/* Q3 Months */}
                <th className="py-2.5 px-2 text-right font-semibold">Oct</th>
                <th className="py-2.5 px-2 text-right font-semibold">Nov</th>
                <th className="py-2.5 px-2 text-right font-semibold">Dec</th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100">
                  Q3 Total
                </th>

                {/* Q4 Months */}
                <th className="py-2.5 px-2 text-right font-semibold">Jan</th>
                <th className="py-2.5 px-2 text-right font-semibold">Feb</th>
                <th className="py-2.5 px-2 text-right font-semibold">Mar</th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100">
                  Q4 Total
                </th>

                {/* Total FY */}
                <th className="py-2.5 px-3 text-right font-extrabold bg-blue-100/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 min-w-[110px]">
                  FY Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[0.72rem]">
              {!report || report.rows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-8 text-center text-slate-400 font-sans">
                    No imported allowance data available for this selection.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => {
                  const isGross = row.key === 'gross_amount' || row.key === 'grossAmount';
                  return (
                    <tr
                      key={row.key}
                      className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors ${
                        isGross
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 font-bold border-t-2 border-slate-300 dark:border-slate-600'
                          : ''
                      }`}
                    >
                      {/* Parameter Name */}
                      <td
                        className={`py-2 px-3 sticky left-0 font-sans font-semibold z-10 ${
                          isGross
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {row.parameter}
                      </td>

                      {/* Q1 Months */}
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.April)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.May)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.June)}</td>
                      <td className="py-2 px-2.5 text-right font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100">
                        {formatInr(row.q1)}
                      </td>

                      {/* Q2 Months */}
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.July)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.August)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.September)}</td>
                      <td className="py-2 px-2.5 text-right font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100">
                        {formatInr(row.q2)}
                      </td>

                      {/* Q3 Months */}
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.October)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.November)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.December)}</td>
                      <td className="py-2 px-2.5 text-right font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100">
                        {formatInr(row.q3)}
                      </td>

                      {/* Q4 Months */}
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.January)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.February)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{formatInr(row.months.March)}</td>
                      <td className="py-2 px-2.5 text-right font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100">
                        {formatInr(row.q4)}
                      </td>

                      {/* Total FY */}
                      <td
                        className={`py-2 px-3 text-right font-extrabold ${
                          isGross
                            ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 text-sm'
                            : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatInr(row.total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
