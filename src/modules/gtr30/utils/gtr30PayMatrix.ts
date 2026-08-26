import { MONTHS } from '@/shared/constants';
import type { GTR30PayEntry } from '../types';

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

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  if (!ISO_DATE_REGEX.test(iso.trim())) return null;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function addDays(iso: string, delta: number): string {
  const p = parseIso(iso);
  if (!p) return iso;
  const dt = new Date(p.y, p.m - 1, p.d);
  dt.setDate(dt.getDate() + delta);
  return toIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function dayBefore(iso: string): string {
  return addDays(iso, -1);
}

export function dayAfter(iso: string): string {
  return addDays(iso, 1);
}

export function daysBetween(startIso: string, endIso: string): number {
  const a = parseIso(startIso);
  const b = parseIso(endIso);
  if (!a || !b) return 0;
  const start = new Date(a.y, a.m - 1, a.d);
  const end = new Date(b.y, b.m - 1, b.d);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function daysInMonth(iso: string): number {
  const p = parseIso(iso);
  if (!p) return 0;
  return new Date(p.y, p.m, 0).getDate();
}

export function monthStart(iso: string): string {
  const p = parseIso(iso);
  if (!p) return iso;
  return toIso(p.y, p.m, 1);
}

export function monthEnd(iso: string): string {
  const p = parseIso(iso);
  if (!p) return iso;
  return toIso(p.y, p.m, daysInMonth(iso));
}

export function monthStartFromKey(monthKey: string): string | null {
  const match = /^([A-Za-z]+)-(\d{4})$/.exec(monthKey.trim());
  if (!match) return null;
  const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  const idx = MONTHS.indexOf(name);
  if (idx < 0) return null;
  const monthNum = ((idx + 3) % 12) + 1;
  return toIso(Number(match[2]), monthNum, 1);
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const p = parseIso(iso);
  if (!p) return iso;
  return `${String(p.d).padStart(2, '0')}-${String(p.m).padStart(2, '0')}-${p.y}`;
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