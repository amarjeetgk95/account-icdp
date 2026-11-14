// ============================================================================
// GLOBAL DATE UTILITY — IST (Asia/Kolkata) & DD-MM-YYYY STANDARD
// ============================================================================
import { toEnglishDigits } from './digits';
import { pad2 } from './index';
import { MONTHS } from '@/shared/constants';

export const DATE_FORMAT_LABEL = 'DD-MM-YYYY';
export const APP_TIME_ZONE = 'Asia/Kolkata';

interface AppParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const IST_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function istParts(d: Date): AppParts | null {
  if (isNaN(d.getTime())) return null;
  const parts = IST_FORMATTER.formatToParts(d);
  const num = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: num('year'),
    month: num('month'),
    day: num('day'),
    hour: num('hour'),
    minute: num('minute'),
    second: num('second'),
  };
}

export function formatDateObjectDDMMYYYY(d: Date): string {
  const p = istParts(d);
  return p ? `${pad2(p.day)}-${pad2(p.month)}-${p.year}` : '-';
}

export function formatDateTimeObjectDDMMYYYY(d: Date): string {
  const p = istParts(d);
  return p
    ? `${pad2(p.day)}-${pad2(p.month)}-${p.year} ${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`
    : '-';
}

const HAS_UTC_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

function instantFromOffsetString(s: string): Date | null {
  if (!HAS_UTC_OFFSET.test(s)) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateDDMMYYYY(value?: unknown): string {
  if (value === null || value === undefined) return '-';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '-';
    return formatDateObjectDDMMYYYY(value);
  }
  const s = String(value).trim();
  if (!s || s === '-') return '-';

  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    const yyyy = Number(dmy[3]);
    const probe = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (probe.getUTCFullYear() === yyyy && probe.getUTCMonth() === mm - 1 && probe.getUTCDate() === dd) {
      return s;
    }
    return '-';
  }

  const instant = instantFromOffsetString(s);
  if (instant) return formatDateObjectDDMMYYYY(instant);

  let m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const probe = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (probe.getUTCFullYear() === yyyy && probe.getUTCMonth() === mm - 1 && probe.getUTCDate() === dd) {
      return `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yyyy}`;
    }
    return '-';
  }

  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const probe = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (probe.getUTCFullYear() === yyyy && probe.getUTCMonth() === mm - 1 && probe.getUTCDate() === dd) {
      return `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yyyy}`;
    }
    return '-';
  }

  m = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})/.exec(s);
  if (m) {
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const probe = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (probe.getUTCFullYear() === yyyy && probe.getUTCMonth() === mm - 1 && probe.getUTCDate() === dd) {
      return `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yyyy}`;
    }
    return '-';
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return formatDateObjectDDMMYYYY(d);
  return '-';
}

export function formatDateTimeDDMMYYYY(value?: unknown): string {
  if (value === null || value === undefined) return '-';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '-';
    return formatDateTimeObjectDDMMYYYY(value);
  }
  const s = String(value).trim();
  if (!s || s === '-') return '-';

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return formatDateDDMMYYYY(s);

  const instant = instantFromOffsetString(s);
  if (instant) return formatDateTimeObjectDDMMYYYY(instant);

  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}(:\d{2})?)/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]} ${m[4]}${m[5] ? '' : ':00'}`;

  m = /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}:\d{2}(:\d{2})?)/.exec(s);
  if (m) {
    const time = m[4].length === 5 ? `${m[4]}:00` : m[4];
    return `${m[1]}-${m[2]}-${m[3]} ${time}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return formatDateTimeObjectDDMMYYYY(d);
  return '-';
}

export function todayDDMMYYYY(date = new Date()): string {
  return formatDateObjectDDMMYYYY(date);
}

export function todayDateTimeDDMMYYYY(date = new Date()): string {
  return formatDateTimeObjectDDMMYYYY(date);
}

export function todayISODate(date = new Date()): string {
  const p = istParts(date);
  if (!p) throw new Error('todayISODate: invalid Date');
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export function toISODateOrNull(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = toEnglishDigits(value).trim();
  if (!trimmed || trimmed === '-') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
    if (y < 1900 || y > 2200) return null;
    return trimmed;
  }
  const m = /^(\d{1,2})([-/.])(\d{1,2})\2(\d{4})$/.exec(trimmed);
  if (!m) return null;
  if (m[2] === '/') {
    const a = Number(m[1]);
    const b = Number(m[3]);
    if (a <= 12 && b <= 12 && a !== b) return null;
  }
  const dd = m[1].padStart(2, '0');
  const mm = m[3].padStart(2, '0');
  const yyyy = m[4];
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (
    date.getUTCFullYear() !== Number(yyyy) ||
    date.getUTCMonth() !== Number(mm) - 1 ||
    date.getUTCDate() !== Number(dd) ||
    Number(yyyy) < 1900 ||
    Number(yyyy) > 2200
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

export function toISODateForDB(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = toEnglishDigits(value).trim();
  if (!trimmed || trimmed === '-') return null;
  const iso = toISODateOrNull(value);
  if (!iso) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new Error(`Invalid date: ${value}. Year ${trimmed.slice(0, 4)} is out of range.`);
    }
    throw new Error(`Invalid date: ${value}. Use ${DATE_FORMAT_LABEL}.`);
  }
  return iso;
}

/**
 * Single source of truth for the April-March financial year rule.
 * Every date-based FY default must use this — never inline `getMonth() >= 3`.
 */
export function currentFinancialYear(date: Date = new Date()): number {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

// ============================================================================
// ISO (YYYY-MM-DD) DATE HELPERS — canonical home for the pay-history /
// pay-matrix date utilities (previously duplicated verbatim in
// `gtr30/utils/payHistory.ts` and `gtr30/utils/gtr30PayMatrix.ts`).
// ============================================================================

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface IsoDateParts {
  y: number;
  m: number;
  d: number;
}

/** Parse `YYYY-MM-DD` into parts, or null when the value is not an ISO date. */
export function parseIsoDate(iso: string): IsoDateParts | null {
  if (!ISO_DATE_REGEX.test(iso.trim())) return null;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** Render parts as `YYYY-MM-DD`. Inverse of `parseIsoDate`. */
export function toIsoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function addDays(iso: string, delta: number): string {
  const p = parseIsoDate(iso);
  if (!p) return iso;
  const dt = new Date(p.y, p.m - 1, p.d);
  dt.setDate(dt.getDate() + delta);
  return toIsoDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function dayBefore(iso: string): string {
  return addDays(iso, -1);
}

export function dayAfter(iso: string): string {
  return addDays(iso, 1);
}

export function daysBetween(startIso: string, endIso: string): number {
  const a = parseIsoDate(startIso);
  const b = parseIsoDate(endIso);
  if (!a || !b) return 0;
  const start = new Date(a.y, a.m - 1, a.d);
  const end = new Date(b.y, b.m - 1, b.d);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function daysInMonth(iso: string): number {
  const p = parseIsoDate(iso);
  if (!p) return 0;
  return new Date(p.y, p.m, 0).getDate();
}

export function monthStart(iso: string): string {
  const p = parseIsoDate(iso);
  if (!p) return iso;
  return toIsoDate(p.y, p.m, 1);
}

export function monthEnd(iso: string): string {
  const p = parseIsoDate(iso);
  if (!p) return iso;
  return toIsoDate(p.y, p.m, daysInMonth(iso));
}

export function monthStartFromKey(monthKey: string): string | null {
  const match = /^([A-Za-z]+)-(\d{4})$/.exec(monthKey.trim());
  if (!match) return null;
  const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  const idx = MONTHS.indexOf(name);
  if (idx < 0) return null;
  const monthNum = ((idx + 3) % 12) + 1;
  return toIsoDate(Number(match[2]), monthNum, 1);
}

/**
 * Render `YYYY-MM-DD` (or anything parseable as ISO) as `DD-MM-YYYY`.
 * Falsy input yields `'—'` (legacy pay-matrix display fallback); a non-ISO
 * string is returned as-is.
 */
export function formatIsoDate(iso?: string | null): string {
  if (!iso) return '—';
  const p = parseIsoDate(iso);
  if (!p) return iso;
  return `${pad2(p.d)}-${pad2(p.m)}-${p.y}`;
}

export function formatFinancialYear(year: number): string {
  return `FY ${year}-${(year + 1).toString().slice(2)}`;
}

export function getAvailableFinancialYears(activeFY: number): number[] {
  if (!Number.isInteger(activeFY) || activeFY < 2000) {
    const fy = currentFinancialYear();
    return [fy - 2, fy - 1, fy, fy + 1, fy + 2];
  }
  return [activeFY - 2, activeFY - 1, activeFY, activeFY + 1, activeFY + 2];
}
