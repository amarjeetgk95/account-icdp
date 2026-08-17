import { IndianRupee, FileText, Receipt, Landmark } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/shared/utilities';
import type { PartyTransaction } from '../types';

interface SummaryCardsProps {
  transactions: PartyTransaction[];
  partiesCount: number;
}

export function SummaryCards({ transactions, partiesCount }: SummaryCardsProps) {
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalGst = transactions.reduce((sum, tx) => sum + tx.total_gst, 0);
  const totalIT = transactions.reduce((sum, tx) => sum + tx.income_tax, 0);

  const cards = [
    {
      label: 'Transactions',
      value: formatNumber(transactions.length),
      sub: `${formatNumber(partiesCount)} parties`,
      icon: FileText,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: 'Total Amount',
      value: formatCurrency(totalAmount),
      sub: 'Gross value',
      icon: IndianRupee,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      label: 'Total GST',
      value: formatCurrency(totalGst),
      sub: 'CGST + SGST + IGST',
      icon: Receipt,
      bg: 'bg-violet-50',
      text: 'text-violet-700',
    },
    {
      label: 'Income Tax (TDS)',
      value: formatCurrency(totalIT),
      sub: '26Q deductions',
      icon: Landmark,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2.5">
      {cards.map((card) => (
        <div key={card.label} className="flex items-center gap-2.5 min-w-[150px]">
          <span className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
            <card.icon size={15} className={card.text} />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {card.label}
              <span className="hidden lg:inline text-slate-400 dark:text-slate-500 font-medium normal-case tracking-normal">
                {' '}· {card.sub}
              </span>
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
