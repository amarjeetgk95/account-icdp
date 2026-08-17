import { Card, CardContent } from '../../../components/ui/card';
import { FileText, IndianRupee, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/shared/utilities';

interface GTR44StatsHeaderProps {
  totalBills: number;
  ytdExpense: number;
  pendingCount: number;
  passedTotal: number;
}

export function GTR44StatsHeader({
  totalBills,
  ytdExpense,
  pendingCount,
  passedTotal,
}: GTR44StatsHeaderProps) {
  const tileConfig = [
    {
      id: 'all',
      label: 'Total DC Bills',
      value: totalBills,
      icon: FileText,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'submitted',
      label: 'Pending Treasury',
      value: pendingCount,
      icon: Clock,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'passed',
      label: 'Passed Bills Total',
      value: formatCurrency(passedTotal),
      icon: CheckCircle,
      bg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      id: 'ytd',
      label: 'YTD Contingent Exp.',
      value: formatCurrency(ytdExpense),
      icon: IndianRupee,
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {tileConfig.map((tile) => (
        <Card
          key={tile.id}
          className="transition-all hover:shadow-md"
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
              <h3 className="text-lg font-bold mt-0.5">{tile.value}</h3>
            </div>
            <div className={`p-2 rounded-full ${tile.bg}`}>
              <tile.icon className={`h-4 w-4 ${tile.iconColor}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
