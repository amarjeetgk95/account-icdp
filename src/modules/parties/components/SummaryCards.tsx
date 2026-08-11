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
      label: 'Total Transactions',
      value: formatNumber(transactions.length),
      sub: `${formatNumber(partiesCount)} parties`,
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: 'Total Amount',
      value: formatCurrency(totalAmount),
      sub: 'Gross value',
      icon: IndianRupee,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      label: 'Total GST',
      value: formatCurrency(totalGst),
      sub: 'CGST + SGST + IGST',
      icon: Receipt,
      gradient: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
    },
    {
      label: 'Income Tax (TDS)',
      value: formatCurrency(totalIT),
      sub: '26Q deductions',
      icon: Landmark,
      gradient: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`stat-tile group animate-fade-in animate-fade-in-delay-${i}`}
        >
          {/* Gradient top accent */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} rounded-t-2xl`}
          />

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {card.label}
              </p>
              <p className={`text-2xl font-black ${card.text} tracking-tight`}>{card.value}</p>
              <p className="text-xs text-slate-400 font-medium">{card.sub}</p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center transition-transform group-hover:scale-110`}
            >
              <card.icon size={20} className={card.text} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
