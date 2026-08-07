import type { RecentTransaction } from '../types';
import { formatCurrency } from '@/shared/utilities';

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No recent transactions.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-2 font-bold text-slate-600">Party</th>
            <th className="text-right py-2 px-2 font-bold text-slate-600">Amount</th>
            <th className="text-right py-2 px-2 font-bold text-slate-600">GST</th>
            <th className="text-right py-2 px-2 font-bold text-slate-600">IT</th>
            <th className="text-right py-2 px-2 font-bold text-slate-600">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((tx, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="py-2 px-2 font-semibold text-slate-800">{tx.partyName}</td>
              <td className="py-2 px-2 text-right font-bold">
                {formatCurrency(tx.amount)}
              </td>
              <td className="py-2 px-2 text-right text-green-700 font-bold">
                {formatCurrency(tx.gst)}
              </td>
              <td className="py-2 px-2 text-right text-red-600 font-bold">
                {formatCurrency(tx.tax)}
              </td>
              <td className="py-2 px-2 text-right text-slate-500">{tx.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
