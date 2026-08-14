import { Card, CardContent } from '../../../components/ui/card';
import { FileText, IndianRupee, Clock, CheckCircle } from 'lucide-react';

interface GTR44StatsHeaderProps {
  totalBills: number;
  ytdExpense: number;
  pendingCount: number;
  passedTotal: number;
  activeTab?: string;
  onTabClick?: (tab: string) => void;
}

export function GTR44StatsHeader({
  totalBills,
  ytdExpense,
  pendingCount,
  passedTotal,
  activeTab = 'all',
  onTabClick,
}: GTR44StatsHeaderProps) {
  const tileConfig = [
    {
      id: 'all',
      label: 'Total DC Bills',
      value: totalBills,
      icon: FileText,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      isActive: activeTab === 'all',
    },
    {
      id: 'submitted',
      label: 'Pending Treasury',
      value: pendingCount,
      icon: Clock,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      isActive: activeTab === 'submitted',
    },
    {
      id: 'passed',
      label: 'Passed Bills Total',
      value: `₹${passedTotal.toLocaleString('en-IN')}`,
      icon: CheckCircle,
      bg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      isActive: activeTab === 'passed',
    },
    {
      id: 'ytd',
      label: 'YTD Contingent Exp.',
      value: `₹${ytdExpense.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      isActive: activeTab === 'ytd',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {tileConfig.map((tile) => (
        <Card
          key={tile.id}
          className={`transition-all cursor-pointer ${tile.isActive ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.02]' : 'hover:shadow-md'}`}
          onClick={() => onTabClick && onTabClick(tile.id)}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
              <h3 className="text-2xl font-bold mt-1">{tile.value}</h3>
            </div>
            <div className={`p-3 rounded-full ${tile.bg}`}>
              <tile.icon className={`h-5 w-5 ${tile.iconColor}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
