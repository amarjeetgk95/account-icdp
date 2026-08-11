import type { RecentTransaction } from '../types';
import { formatCurrency, num } from '@/shared/utilities';
import { Store, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const navigate = useNavigate();

  if (!transactions || transactions.length === 0) {
    return (
      <div className="py-10 text-center text-slate-400 dark:text-slate-500 font-medium">
        <Store size={32} className="mx-auto mb-2 opacity-50 text-slate-400" />
        No vendor transactions recorded for this period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            <th className="py-2.5 px-3">Party Name</th>
            <th className="py-2.5 px-3 text-right">Amount</th>
            <th className="py-2.5 px-3 text-right">GST</th>
            <th className="py-2.5 px-3 text-right">TDS (IT)</th>
            <th className="py-2.5 px-3 text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
          {transactions.map((tx, idx) => (
            <tr
              key={idx}
              onClick={() => navigate('/parties')}
              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Store size={14} />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[180px]">
                    {tx.partyName || 'Unknown'}
                  </span>
                </div>
              </td>
              <td className="py-3 px-3 text-right font-extrabold text-slate-800 dark:text-slate-100">
                {formatCurrency(num(tx.amount))}
              </td>
              <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(num(tx.gst))}
              </td>
              <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(num(tx.tax))}
              </td>
              <td className="py-3 px-3 text-right text-slate-400 dark:text-slate-500 whitespace-nowrap">
                <span className="inline-flex items-center gap-1">
                  {tx.date || ''}
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
