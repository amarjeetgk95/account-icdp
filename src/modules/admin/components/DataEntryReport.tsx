import { Download, Building2, Inbox } from 'lucide-react';
import type { DataEntryReportRow } from '../types';
import { formatCurrency, formatNumber, downloadCsv } from '@/shared/utilities';
import '../styles/overview.css';

interface DataEntryReportProps {
  data: DataEntryReportRow[];
  isLoading: boolean;
}

export function DataEntryReport({ data, isLoading }: DataEntryReportProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN');
  };

  const totals = data.reduce(
    (acc, row) => ({
      employees: acc.employees + row.employees,
      salaryRecords: acc.salaryRecords + row.salary_records,
      gross: acc.gross + row.total_gross,
      tax: acc.tax + row.total_tax,
      vendors: acc.vendors + row.vendors,
      transactions: acc.transactions + row.transactions,
      amount: acc.amount + row.total_amount,
      gst: acc.gst + row.total_gst,
      incomeTax: acc.incomeTax + row.total_income_tax,
    }),
    {
      employees: 0,
      salaryRecords: 0,
      gross: 0,
      tax: 0,
      vendors: 0,
      transactions: 0,
      amount: 0,
      gst: 0,
      incomeTax: 0,
    }
  );

  const handleExport = () => {
    downloadCsv(
      'data_entry_report.csv',
      [
        'Office',
        'User',
        'FY',
        'Employees',
        'Salary Records',
        'Gross Salary',
        'TDS',
        'Vendors',
        'Transactions',
        'Amount',
        'GST',
        'Income Tax',
        'Last Entry',
      ],
      data.map((row) => [
        row.office_name || `Office ${row.office_id}`,
        row.user_email || '',
        row.current_fy ?? '',
        row.employees,
        row.salary_records,
        row.total_gross,
        row.total_tax,
        row.vendors,
        row.transactions,
        row.total_amount,
        row.total_gst,
        row.total_income_tax,
        row.last_activity || '',
      ])
    );
  };

  if (isLoading) {
    return (
      <div className="p-5" aria-busy="true">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="skeleton h-6 w-28 rounded-full" />
          <div className="skeleton h-8 w-32 rounded-[10px]" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex gap-8 px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            {Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className="skeleton h-3 flex-1" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-8 px-4 py-4 border-b border-slate-100 dark:border-slate-800/60">
              {Array.from({ length: 13 }).map((_, j) => (
                <div key={j} className="skeleton h-3 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="empty-state px-6">
        <div className="empty-state-icon dark:text-slate-600">
          <Inbox size={44} className="mx-auto" />
        </div>
        <p className="empty-state-text dark:text-slate-400">No offices found.</p>
        <p className="mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">Offices will appear here once salary entry begins.</p>
      </div>
    );
  }

  return (
    <div className="de-report">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 no-print">
        <span className="stat-pill dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
          <Building2 size={12} />
          <span>{data.length} office{data.length === 1 ? '' : 's'}</span>
        </span>
        <button onClick={handleExport} className="btn btn-outline btn-sm">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="overflow-auto max-h-[540px]">
        <table className="table table-sm data-entry-table de-table">
          <thead>
            <tr>
              <th className="text-left">Office</th>
              <th className="text-left">User</th>
              <th className="text-right">FY</th>
              <th className="text-right">Employees</th>
              <th className="text-right">Salary Records</th>
              <th className="text-right">Gross Salary</th>
              <th className="text-right">TDS</th>
              <th className="text-right">Vendors</th>
              <th className="text-right">Transactions</th>
              <th className="text-right">Amount</th>
              <th className="text-right">GST</th>
              <th className="text-right">Income Tax</th>
              <th className="text-right">Last Entry</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td className="font-semibold text-slate-800 dark:text-slate-100">{row.office_name || `Office ${row.office_id}`}</td>
                <td className="text-slate-500 dark:text-slate-400">{row.user_email || '-'}</td>
                <td className="text-right text-slate-400 dark:text-slate-500">{row.current_fy ?? '-'}</td>
                <td className="text-right tabular-nums">{formatNumber(row.employees)}</td>
                <td className="text-right tabular-nums">{formatNumber(row.salary_records)}</td>
                <td className="text-right text-money">{formatCurrency(row.total_gross)}</td>
                <td className="text-right text-money">{formatCurrency(row.total_tax)}</td>
                <td className="text-right tabular-nums">{formatNumber(row.vendors)}</td>
                <td className="text-right tabular-nums">{formatNumber(row.transactions)}</td>
                <td className="text-right text-money">{formatCurrency(row.total_amount)}</td>
                <td className="text-right text-money text-green-700 dark:text-green-400">{formatCurrency(row.total_gst)}</td>
                <td className="text-right text-money text-red-600 dark:text-red-400">{formatCurrency(row.total_income_tax)}</td>
                <td className="text-right text-slate-400 dark:text-slate-500">{formatDate(row.last_activity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="data-entry-total font-bold">
              <td colSpan={3} className="text-right text-slate-600 dark:text-slate-300">Total</td>
              <td className="text-right tabular-nums">{formatNumber(totals.employees)}</td>
              <td className="text-right tabular-nums">{formatNumber(totals.salaryRecords)}</td>
              <td className="text-right text-money">{formatCurrency(totals.gross)}</td>
              <td className="text-right text-money">{formatCurrency(totals.tax)}</td>
              <td className="text-right tabular-nums">{formatNumber(totals.vendors)}</td>
              <td className="text-right tabular-nums">{formatNumber(totals.transactions)}</td>
              <td className="text-right text-money">{formatCurrency(totals.amount)}</td>
              <td className="text-right text-money text-green-700 dark:text-green-400">{formatCurrency(totals.gst)}</td>
              <td className="text-right text-money text-red-600 dark:text-red-400">{formatCurrency(totals.incomeTax)}</td>
              <td className="text-right">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
