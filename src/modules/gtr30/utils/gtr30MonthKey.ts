import { MONTHS } from '@/shared/constants';

export interface GTR30MonthKeyParts {
  month: string;
  year: number;
}

export function gtr30MonthKeyFor(month: string, year: number): string {
  return `${month.trim()}-${year}`;
}

export function gtr30ParseMonthKey(monthKey: string): GTR30MonthKeyParts | null {
  const match = /^([A-Za-z]+)-(\d{4})$/.exec(monthKey.trim());
  if (!match) return null;
  const month = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  if (!MONTHS.includes(month)) return null;
  return { month, year: Number(match[2]) };
}

export function gtr30MonthOptions(): string[] {
  return MONTHS;
}

export function gtr30YearOptions(activeFY: number): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const y of [activeFY, activeFY - 1, activeFY + 1]) {
    if (!seen.has(y)) {
      seen.add(y);
      out.push(y);
    }
  }
  return out.sort((a, b) => a - b);
}
