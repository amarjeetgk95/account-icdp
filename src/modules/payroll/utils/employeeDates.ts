import { MONTHS } from '@/shared/constants';

export interface WorkMonth {
  year: number;
  /** 0-based calendar month index (0 = January) */
  month: number;
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Each entry slot is named by the payment month and holds the PREVIOUS
 * month's salary (e.g. the "July" slot is June work paid in July). This
 * returns the work month (calendar year + 0-based month) for a given slot.
 */
export function getWorkMonthForEntrySlot(fy: number, month: string): WorkMonth {
  const slotIdx = MONTHS.indexOf(month);
  const calIdx = (slotIdx + 2) % 12; // 0 = January (work month is the slot BEFORE the payment month)
  const year = calIdx < 2 ? fy + 1 : fy; // only Jan/Feb work months fall in the next calendar year
  return { year, month: calIdx };
}

/**
 * An employee appears in an entry slot iff they worked at least ONE day in
 * that slot's work month. That means they had joined by the end of the work
 * month and, if transferred, were still employed at the start of it.
 */
export function isActiveInEntryMonth(
  joinDate: string | null | undefined,
  transferDate: string | null | undefined,
  fy: number,
  month: string
): boolean {
  const { year, month: calIdx } = getWorkMonthForEntrySlot(fy, month);
  const workMonthStart = new Date(year, calIdx, 1);
  const workMonthEnd = new Date(year, calIdx + 1, 0);

  const join = parseDate(joinDate);
  const transfer = parseDate(transferDate);

  if (join && join.getTime() > workMonthEnd.getTime()) return false;
  if (transfer && transfer.getTime() <= workMonthStart.getTime()) return false;

  return true;
}

/** Entry slots (in FY order) during which the employee is active. */
export function getActiveEntryMonths(
  fy: number,
  joinDate: string | null | undefined,
  transferDate: string | null | undefined
): string[] {
  return MONTHS.filter((m) => isActiveInEntryMonth(joinDate, transferDate, fy, m));
}
