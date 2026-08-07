import type { DataEntryReportRow } from '../types';
import { formatCurrency } from '@/shared/utilities';

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-slate-500">No offices found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Office</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">User</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">FY</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Employees</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Salary Records</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Gross Salary</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">TDS</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Vendors</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Transactions</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Amount</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">GST</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Income Tax</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Last Entry</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-bold">{row.office_name || `Office ${row.office_id}`}</td>
              <td className="px-3 py-2">{row.user_email || '-'}</td>
              <td className="px-3 py-2 text-right">{row.current_fy || '-'}</td>
              <td className="px-3 py-2 text-right">{row.employees.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2 text-right">{row.salary_records.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(row.total_gross)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(row.total_tax)}</td>
              <td className="px-3 py-2 text-right">{row.vendors.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2 text-right">{row.transactions.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(row.total_amount)}</td>
              <td className="px-3 py-2 text-right text-green-700">{formatCurrency(row.total_gst)}</td>
              <td className="px-3 py-2 text-right text-red-600">{formatCurrency(row.total_income_tax)}</td>
              <td className="px-3 py-2 text-right text-slate-500">{formatDate(row.last_activity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
