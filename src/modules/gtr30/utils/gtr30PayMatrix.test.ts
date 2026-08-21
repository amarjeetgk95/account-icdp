import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayBefore,
  dayAfter,
  daysBetween,
  daysInMonth,
  monthStart,
  monthEnd,
  monthStartFromKey,
  monthKeyFromDate,
  formatDate,
  normalizePayEntries,
  resolveBasicPayForDate,
  resolveBasicPayForMonth,
} from './gtr30PayMatrix';

describe('date helpers', () => {
  it('addDays / dayBefore / dayAfter', () => {
    expect(addDays('2026-02-01', 1)).toBe('2026-02-02');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(dayBefore('2026-02-01')).toBe('2026-01-31');
    expect(dayAfter('2026-01-30')).toBe('2026-01-31');
  });

  it('daysBetween inclusive span', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-01-17', '2026-02-01')).toBe(15);
  });

  it('daysInMonth handles leap and FY months', () => {
    expect(daysInMonth('2026-02-01')).toBe(28);
    expect(daysInMonth('2028-02-01')).toBe(29);
    expect(daysInMonth('2026-01-01')).toBe(31);
  });

  it('monthStart / monthEnd', () => {
    expect(monthStart('2026-01-17')).toBe('2026-01-01');
    expect(monthEnd('2026-01-17')).toBe('2026-01-31');
    expect(monthEnd('2026-02-05')).toBe('2026-02-28');
  });

  it('monthStartFromKey resolves FY month order (April = 1)', () => {
    expect(monthStartFromKey('July-2026')).toBe('2026-07-01');
    expect(monthStartFromKey('April-2026')).toBe('2026-04-01');
    expect(monthStartFromKey('March-2027')).toBe('2027-03-01');
    expect(monthStartFromKey('garbage')).toBeNull();
  });

  it('monthKeyFromDate round-trips', () => {
    expect(monthKeyFromDate('2026-07-01')).toBe('July-2026');
    expect(monthKeyFromDate('2026-04-15')).toBe('April-2026');
  });

  it('formatDate renders DD-MM-YYYY', () => {
    expect(formatDate('2026-07-01')).toBe('01-07-2026');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('normalizePayEntries', () => {
  it('sorts by startDate and fills ids', () => {
    const out = normalizePayEntries([
      { startDate: '2026-07-01', basicPay: 39900 },
      { startDate: '2026-02-01', basicPay: 38000 },
    ]);
    expect(out.map((e) => e.startDate)).toEqual(['2026-02-01', '2026-07-01']);
    expect(out.every((e) => typeof e.id === 'string' && e.id.length > 0)).toBe(true);
  });

  it('drops entries with identical startDate, keeping the first', () => {
    const out = normalizePayEntries([
      { id: 'a', startDate: '2026-07-01', basicPay: 39900 },
      { id: 'b', startDate: '2026-07-01', basicPay: 42500 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].basicPay).toBe(39900);
  });

  it('auto-closes the previous entry at dayBefore the next start', () => {
    const out = normalizePayEntries([
      { startDate: '2026-07-01', basicPay: 39900 },
      { startDate: '2026-02-01', basicPay: 38000 },
    ]);
    const july = out.find((e) => e.startDate === '2026-07-01')!;
    expect(july.endDate).toBeUndefined();
    const feb = out.find((e) => e.startDate === '2026-02-01')!;
    expect(feb.endDate).toBe('2026-06-30');
  });

  it('overrides an explicit endDate that collides with the next start', () => {
    const out = normalizePayEntries([
      { startDate: '2026-07-01', endDate: '2026-09-15', basicPay: 39900 },
      { startDate: '2026-08-01', basicPay: 42500 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].endDate).toBe('2026-07-31');
  });

  it('rejects invalid or inverted entries', () => {
    const out = normalizePayEntries([
      { startDate: 'not-a-date', basicPay: 10 },
      { startDate: '2026-07-01', endDate: '2026-06-01', basicPay: 39900 },
      { startDate: '2026-02-01', basicPay: 38000 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].startDate).toBe('2026-02-01');
  });

  it('handles null/undefined input', () => {
    expect(normalizePayEntries(null)).toEqual([]);
    expect(normalizePayEntries(undefined)).toEqual([]);
  });
});

describe('resolveBasicPayForDate', () => {
  const entries = [
    { id: 'a', startDate: '2026-07-01', basicPay: 39900 },
    { id: 'b', startDate: '2027-02-01', basicPay: 42500 },
  ];

  it('returns the active entry on an exact date', () => {
    expect(resolveBasicPayForDate(entries, '2026-07-01')?.basicPay).toBe(39900);
    expect(resolveBasicPayForDate(entries, '2027-02-01')?.basicPay).toBe(42500);
  });

  it('falls back to the latest entry with startDate <= date', () => {
    expect(resolveBasicPayForDate(entries, '2026-06-15')?.basicPay).toBe(39900);
    expect(resolveBasicPayForDate(entries, '2027-06-15')?.basicPay).toBe(42500);
  });
});

describe('resolveBasicPayForMonth', () => {
  it('returns zero for empty matrix', () => {
    const r = resolveBasicPayForMonth([], '2026-07-01');
    expect(r.basicPay).toBe(0);
    expect(r.prorated).toBe(false);
    expect(r.entry).toBeNull();
  });

  it('uses the full-month pay when a single entry covers the month', () => {
    const entries = [{ id: 'a', startDate: '2026-07-01', basicPay: 39900 }];
    const r = resolveBasicPayForMonth(entries, '2026-07-01');
    expect(r.basicPay).toBe(39900);
    expect(r.prorated).toBe(false);
    expect(r.totalDays).toBe(31);
  });

  it('mid-month change is day-weighted: 39900 x 15d + 42500 x 16d over Jan', () => {
    const entries = [
      { id: 'a', startDate: '2026-07-01', endDate: '2027-01-30', basicPay: 39900 },
      { id: 'b', startDate: '2027-01-16', basicPay: 42500 },
    ];
    const r = resolveBasicPayForMonth(entries, '2027-01-01');
    expect(r.prorated).toBe(true);
    expect(r.totalDays).toBe(31);
    expect(r.split).toHaveLength(2);
    expect(r.split[0]).toMatchObject({ basicPay: 39900, days: 15, startDate: '2027-01-01', endDate: '2027-01-15' });
    expect(r.split[1]).toMatchObject({ basicPay: 42500, days: 16, startDate: '2027-01-16', endDate: '2027-01-31' });
    expect(r.basicPay).toBe(41242);
  });

  it('uses the full new pay from February onwards', () => {
    const entries = [
      { id: 'a', startDate: '2026-07-01', endDate: '2027-01-30', basicPay: 39900 },
      { id: 'b', startDate: '2027-02-01', basicPay: 42500 },
    ];
    const r = resolveBasicPayForMonth(entries, '2027-02-01');
    expect(r.basicPay).toBe(42500);
    expect(r.prorated).toBe(false);
  });

  it('uses the last active pay before the month when no entry overlaps', () => {
    const entries = [
      { id: 'a', startDate: '2026-07-01', endDate: '2026-12-31', basicPay: 38000 },
    ];
    const r = resolveBasicPayForMonth(entries, '2027-04-01');
    expect(r.basicPay).toBe(38000);
    expect(r.prorated).toBe(false);
  });

  it('weights only the days inside the bill month for split entries', () => {
    const entries = [
      { id: 'a', startDate: '2026-01-10', endDate: '2026-02-20', basicPay: 30000 },
      { id: 'b', startDate: '2026-02-21', basicPay: 36000 },
    ];
    const r = resolveBasicPayForMonth(entries, '2026-02-01');
    expect(r.totalDays).toBe(28);
    expect(r.split).toHaveLength(2);
    expect(r.split[0]).toMatchObject({ days: 20, startDate: '2026-02-01', endDate: '2026-02-20' });
    expect(r.split[1]).toMatchObject({ days: 8, startDate: '2026-02-21', endDate: '2026-02-28' });
    expect(r.basicPay).toBe(Math.round((30000 * 20 + 36000 * 8) / 28));
  });
});