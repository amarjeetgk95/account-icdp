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

export type PayChangeReason = 'increment' | 'promotion' | 'revision' | 'da-revision' | 'correction' | 'other';
export interface PayEntry {
  id: string;
  startDate: string;
  endDate?: string;
  basicPay: number;
  reason?: PayChangeReason;
  orderNo?: string;
  remark?: string;
}
export interface PayForMonthSplit {
  basicPay: number;
  days: number;
  startDate: string;
  endDate: string;
  entryId: string;
  reason?: PayChangeReason;
}
export interface PayForMonthResult {
  basicPay: number;
  totalDays: number;
  entry: PayEntry | null;
  split: PayForMonthSplit[];
  prorated: boolean;
}
export interface PayTimelineStats {
  totalEntries: number;
  current: PayEntry | null;
  lastChangeDate: string | null;
  avgIncrement: number | null;
}

// Normalize: sort, fill ids, auto-close gaps. Strict mode throws on overlap/duplicate.
export function normalizePayHistory(entries: Partial<PayEntry>[] | null | undefined, opts?: { strict?: boolean }): PayEntry[] {
  const valid = (entries ?? [])
    .filter((e) => e && parseIso((e.startDate as string) ?? ''))
    .filter((e) => !e.endDate || (parseIso(e.endDate) && (e.endDate as string) >= (e.startDate as string)))
    .map((e) => ({
      id: (e.id as string) || crypto.randomUUID(),
      startDate: (e.startDate as string).trim(),
      endDate: (e.endDate as string | undefined)?.trim() || undefined,
      basicPay: Number((e as PayEntry).basicPay) || 0,
      reason: (e as PayEntry).reason,
      orderNo: (e as PayEntry).orderNo?.trim() || undefined,
      remark: (e as PayEntry).remark?.trim() || undefined,
    }))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.id < b.id ? -1 : 1));

  const out: PayEntry[] = [];
  for (const cur of valid) {
    const last = out[out.length - 1];
    if (last && cur.startDate <= last.startDate) {
      if (opts?.strict) throw new Error(`duplicate startDate ${cur.startDate}`);
      continue;
    }
    if (last && (last.endDate === undefined || last.endDate >= cur.startDate)) {
      if (opts?.strict && last.endDate !== undefined && last.endDate >= cur.startDate) {
        throw new Error(`overlap ${last.startDate}–${last.endDate} with ${cur.startDate}`);
      }
      last.endDate = dayBefore(cur.startDate);
    }
    out.push({ ...cur });
  }
  return out;
}

export function resolveBasicPayForMonth(entries: PayEntry[] | null | undefined, monthStartIso: string): PayForMonthResult {
  const norm = normalizePayHistory(entries);
  const start = monthStart(monthStartIso);
  const end = monthEnd(start);
  const totalDays = daysInMonth(start);
  if (norm.length === 0) return { basicPay: 0, totalDays, entry: null, split: [], prorated: false };
  const overlapping = norm.filter((e) => e.startDate <= end && (e.endDate === undefined || e.endDate >= start));
  if (overlapping.length === 0) {
    let best: PayEntry | null = null;
    for (const e of norm) if (e.startDate <= end && (!best || e.startDate > best.startDate)) best = e;
    if (!best) best = norm[norm.length - 1];
    return { basicPay: best.basicPay, totalDays, entry: best, split: [], prorated: false };
  }
  if (overlapping.length === 1) return { basicPay: overlapping[0].basicPay, totalDays, entry: overlapping[0], split: [], prorated: false };
  const split: PayForMonthSplit[] = overlapping.map((e) => {
    const s = e.startDate > start ? e.startDate : start;
    const en = e.endDate !== undefined && e.endDate < end ? e.endDate : end;
    return { basicPay: e.basicPay, days: daysBetween(s, en) + 1, startDate: s, endDate: en, entryId: e.id, reason: e.reason };
  });
  const weighted = split.reduce((sum, p) => sum + p.basicPay * p.days, 0);
  return { basicPay: Math.round(weighted / Math.max(totalDays, 1)), totalDays, entry: null, split, prorated: true };
}

export function deriveCurrentPay(payEntries: PayEntry[] | null | undefined, fallbackPay: number, fallbackDate?: string): { currentPay: number; currentPayDate: string } {
  const norm = normalizePayHistory(payEntries);
  const last = norm[norm.length - 1];
  if (last) return { currentPay: last.basicPay, currentPayDate: last.startDate };
  return { currentPay: fallbackPay, currentPayDate: fallbackDate ?? '' };
}

export function getPayTimelineStats(entries: PayEntry[] | null | undefined): PayTimelineStats {
  const norm = normalizePayHistory(entries);
  if (norm.length === 0) return { totalEntries: 0, current: null, lastChangeDate: null, avgIncrement: null };
  const current = norm[norm.length - 1];
  let avg: number | null = null;
  if (norm.length > 1) {
    const diffs = norm.slice(1).map((e, i) => e.basicPay - norm[i].basicPay);
    avg = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  }
  return { totalEntries: norm.length, current, lastChangeDate: current.startDate, avgIncrement: avg };
}

export function appendPayChange(entries: PayEntry[] | null | undefined, change: Omit<PayEntry, 'id' | 'endDate'> & { id?: string }): PayEntry[] {
  const norm = normalizePayHistory(entries);
  const next: PayEntry = {
    id: change.id || crypto.randomUUID(),
    startDate: change.startDate.trim(),
    basicPay: Number(change.basicPay) || 0,
    reason: change.reason,
    orderNo: change.orderNo?.trim(),
    remark: change.remark?.trim(),
    endDate: undefined,
  };
  // validate startDate after last entry
  const last = norm[norm.length - 1];
  if (last && next.startDate <= last.startDate) throw new Error(`startDate ${next.startDate} must be after last pay ${last.startDate}`);
  if (last && !last.endDate) {
    // auto-close previous
    last.endDate = dayBefore(next.startDate);
  } else if (last && last.endDate && last.endDate >= next.startDate) {
    throw new Error(`overlaps previous ${last.startDate}–${last.endDate}`);
  }
  return normalizePayHistory([...norm, next]);
}
