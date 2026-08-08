import { Download } from 'lucide-react';
import type { DataEntryReportRow } from '../types';
import { formatCurrency, formatNumber, downloadCsv } from '@/shared/utilities';

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
      <div className="flex justify-center py-8">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="empty-state"><p>No offices found.</p></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={handleExport} className="btn btn-outline btn-sm">
          <Download size={14} className="mr-1" /> CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Office</th>
              <th>User</th>
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
                <td className="font-bold">{row.office_name || `Office ${row.office_id}`}</td>
                <td>{row.user_email || '-'}</td>
                <td className="text-right">{row.current_fy ?? '-'}</td>
                <td className="text-right">{formatNumber(row.employees)}</td>
                <td className="text-right">{formatNumber(row.salary_records)}</td>
                <td className="text-right">{formatCurrency(row.total_gross)}</td>
                <td className="text-right">{formatCurrency(row.total_tax)}</td>
                <td className="text-right">{formatNumber(row.vendors)}</td>
                <td className="text-right">{formatNumber(row.transactions)}</td>
                <td className="text-right">{formatCurrency(row.total_amount)}</td>
                <td className="text-right text-green-700">{formatCurrency(row.total_gst)}</td>
                <td className="text-right text-red-600">{formatCurrency(row.total_income_tax)}</td>
                <td className="text-right text-slate-500">{formatDate(row.last_activity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td colSpan={3} className="text-right text-slate-600">Total</td>
              <td className="text-right">{formatNumber(totals.employees)}</td>
              <td className="text-right">{formatNumber(totals.salaryRecords)}</td>
              <td className="text-right">{formatCurrency(totals.gross)}</td>
              <td className="text-right">{formatCurrency(totals.tax)}</td>
              <td className="text-right">{formatNumber(totals.vendors)}</td>
              <td className="text-right">{formatNumber(totals.transactions)}</td>
              <td className="text-right">{formatCurrency(totals.amount)}</td>
              <td className="text-right text-green-700">{formatCurrency(totals.gst)}</td>
              <td className="text-right text-red-600">{formatCurrency(totals.incomeTax)}</td>
              <td className="text-right">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
