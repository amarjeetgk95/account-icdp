import type { PartyTransaction } from '../types';
import { formatCurrency } from '@/shared/utilities';

interface TransactionsTableProps {
  transactions: PartyTransaction[];
  isLoading: boolean;
}

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return <div className="text-center py-8 text-slate-500">No transactions yet.</div>;
  }

  const totals = transactions.reduce(
    (acc, tx) => ({
      amount: acc.amount + tx.amount,
      cgst: acc.cgst + tx.cgst,
      sgst: acc.sgst + tx.sgst,
      igst: acc.igst + tx.igst,
      totalGst: acc.totalGst + tx.total_gst,
      incomeTax: acc.incomeTax + tx.income_tax,
    }),
    { amount: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, incomeTax: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Party</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Bill No</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Amount</th>
            <th className="px-3 py-2 text-right font-semibold text-green-700">CGST</th>
            <th className="px-3 py-2 text-right font-semibold text-green-700">SGST</th>
            <th className="px-3 py-2 text-right font-semibold text-green-700">IGST</th>
            <th className="px-3 py-2 text-right font-semibold text-green-700">Total GST</th>
            <th className="px-3 py-2 text-right font-semibold text-red-600">Income Tax</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-medium">{tx.party_name}</td>
              <td className="px-3 py-2">{tx.bill_no}</td>
              <td className="px-3 py-2 text-right font-bold">{formatCurrency(tx.amount)}</td>
              <td className="px-3 py-2 text-right text-green-700">{formatCurrency(tx.cgst)}</td>
              <td className="px-3 py-2 text-right text-green-700">{formatCurrency(tx.sgst)}</td>
              <td className="px-3 py-2 text-right text-green-700">{formatCurrency(tx.igst)}</td>
              <td className="px-3 py-2 text-right text-green-700 font-bold">{formatCurrency(tx.total_gst)}</td>
              <td className="px-3 py-2 text-right text-red-600">{formatCurrency(tx.income_tax)}</td>
              <td className="px-3 py-2 text-right text-slate-500">{tx.transaction_date}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-bold">
          <tr>
            <td colSpan={2} className="px-3 py-2 text-right">Total</td>
            <td className="px-3 py-2 text-right">{formatCurrency(totals.amount)}</td>
            <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.cgst)}</td>
            <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.sgst)}</td>
            <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.igst)}</td>
            <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.totalGst)}</td>
            <td className="px-3 py-2 text-right text-red-600">{formatCurrency(totals.incomeTax)}</td>
            <td className="px-3 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
