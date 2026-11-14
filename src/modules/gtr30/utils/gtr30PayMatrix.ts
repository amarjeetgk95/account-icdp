// ISO (YYYY-MM-DD) date helpers live canonically in `@/shared/utilities/date`.
// Local import + re-export so existing gtr30 modules keep their import surface.
import {
  parseIsoDate as parseIso,
  addDays,
  dayBefore,
  dayAfter,
  daysBetween,
  daysInMonth,
  monthStart,
  monthEnd,
  monthStartFromKey,
  formatIsoDate,
} from '@/shared/utilities/date';
import type { GTR30PayEntry } from '../types';

export {
  addDays,
  dayBefore,
  dayAfter,
  daysBetween,
  daysInMonth,
  monthStart,
  monthEnd,
  monthStartFromKey,
  formatIsoDate as formatDate,
};

export interface PayForMonthSplit {
  basicPay: number;
  days: number;
  startDate: string;
  endDate: string;
  entryId: string;
}

export interface PayForMonthResult {
  basicPay: number;
  totalDays: number;
  entry: GTR30PayEntry | null;
  split: PayForMonthSplit[];
  prorated: boolean;
}

export type PayEntryDraft = Partial<GTR30PayEntry> & { startDate: string };

export function normalizePayEntries(entries: PayEntryDraft[] | null | undefined): GTR30PayEntry[] {
  const valid = (entries ?? [])
    .filter((e) => e && parseIso(e.startDate))
    .filter((e) => !e.endDate || (parseIso(e.endDate) && e.endDate >= e.startDate))
    .map((e) => ({
      id: e.id || crypto.randomUUID(),
      startDate: e.startDate,
      endDate: e.endDate,
      basicPay: Number(e.basicPay) || 0,
    }))
    .sort((a, b) =>
      a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.id < b.id ? -1 : 1
    );

  const out: GTR30PayEntry[] = [];
  for (const entry of valid) {
    const last = out[out.length - 1];
    if (last && entry.startDate <= last.startDate) continue;
    if (last && (last.endDate === undefined || last.endDate >= entry.startDate)) {
      last.endDate = dayBefore(entry.startDate);
    }
    out.push({ ...entry });
  }
  return out;
}

export function resolveBasicPayForMonth(
  entries: GTR30PayEntry[] | null | undefined,
  monthStartIso: string
): PayForMonthResult {
  const norm = normalizePayEntries(entries);
  const start = monthStart(monthStartIso);
  const end = monthEnd(start);
  const totalDays = daysInMonth(start);

  if (norm.length === 0) {
    return { basicPay: 0, totalDays, entry: null, split: [], prorated: false };
  }

  const overlapping = norm.filter(
    (e) => e.startDate <= end && (e.endDate === undefined || e.endDate >= start)
  );

  if (overlapping.length === 0) {
    let best: GTR30PayEntry | null = null;
    for (const entry of norm) {
      if (entry.startDate <= end && (!best || entry.startDate > best.startDate)) best = entry;
    }
    if (!best) best = norm[norm.length - 1];
    return { basicPay: best.basicPay, totalDays, entry: best, split: [], prorated: false };
  }

  if (overlapping.length === 1) {
    const entry = overlapping[0];
    return { basicPay: entry.basicPay, totalDays, entry, split: [], prorated: false };
  }

  const split: PayForMonthSplit[] = overlapping.map((entry) => {
    const s = entry.startDate > start ? entry.startDate : start;
    const e = entry.endDate !== undefined && entry.endDate < end ? entry.endDate : end;
    return {
      basicPay: entry.basicPay,
      days: daysBetween(s, e) + 1,
      startDate: s,
      endDate: e,
      entryId: entry.id,
    };
  });

  const weighted = split.reduce((sum, part) => sum + part.basicPay * part.days, 0);
  return {
    basicPay: Math.round(weighted / Math.max(totalDays, 1)),
    totalDays,
    entry: null,
    split,
    prorated: true,
  };
}