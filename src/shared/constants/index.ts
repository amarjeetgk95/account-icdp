export const APP_NAME = 'ICDP Tax System';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export const MONTHS: string[] = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
];

export type Month = string;

export const QUARTERS: string[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export type Quarter = (typeof QUARTERS)[number];

export const QUARTER_MONTHS: Record<Quarter, Month[]> = {
  Q1: ['April', 'May', 'June'],
  Q2: ['July', 'August', 'September'],
  Q3: ['October', 'November', 'December'],
  Q4: ['January', 'February', 'March'],
};

export function getQuarterForMonth(month: Month): Quarter {
  const index = MONTHS.indexOf(month);
  if (index >= 0 && index <= 2) return 'Q1';
  if (index >= 3 && index <= 5) return 'Q2';
  if (index >= 6 && index <= 8) return 'Q3';
  return 'Q4';
}

export function getFinancialYear(date: Date): number {
  const year = date.getFullYear();
  return date.getMonth() < 3 ? year - 1 : year;
}

export function getMonthsForQuarter(quarter: Quarter): Month[] {
  return QUARTER_MONTHS[quarter];
}
