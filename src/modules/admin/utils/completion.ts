import { MONTHS } from '@/shared/constants';
import type { OfficeCompletion } from '../types';

const MONTH_SHORT: Record<string, string> = {
  April: 'Apr',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Aug',
  September: 'Sep',
  October: 'Oct',
  November: 'Nov',
  December: 'Dec',
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
};

export function shortMonth(month: string): string {
  return MONTH_SHORT[month] || month.slice(0, 3);
}

export function completionPercentage(office: OfficeCompletion): number {
  const filled = new Set(office.months || []).size;
  return Math.round((filled / MONTHS.length) * 100);
}

function isComplete(office: OfficeCompletion): boolean {
  return new Set(office.months || []).size >= MONTHS.length;
}

export function computeCompletionSummary(data: OfficeCompletion[]) {
  if (!data || data.length === 0) return { completeCount: 0, avgPct: 0 };
  const completeCount = data.filter(isComplete).length;
  const avgPct = Math.round(
    data.reduce((sum, office) => sum + completionPercentage(office), 0) / data.length
  );
  return { completeCount, avgPct };
}

export function completionBadgeClass(office: OfficeCompletion): string {
  const pct = completionPercentage(office);
  if (isComplete(office)) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
  }
  return pct >= 50
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
    : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400';
}

export function completionBarClass(office: OfficeCompletion): string {
  const pct = completionPercentage(office);
  if (isComplete(office)) return 'bg-emerald-500';
  return pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
}
