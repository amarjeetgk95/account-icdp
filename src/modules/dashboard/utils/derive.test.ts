import { describe, it, expect } from 'vitest';
import { currentFinancialYear } from '@/shared/utilities/date';
import { buildActions, derivePayrollPacing, formatRelativeTime } from './derive';
import type { MonthlyRoadmapData, PayrollSummary, TreasurySummary } from '../types';

const NOW = new Date(2026, 9, 20);

function makePayroll(overrides: Partial<PayrollSummary> = {}): PayrollSummary {
  return {
    fy: currentFinancialYear(NOW),
    activeEmployees: 10,
    pendingEmployees: 0,
    ytdSalary: 0,
    ytdTax: 0,
    entryMonthName: 'October',
    entryWorkMonthName: 'September',
    currentQuarter: 'Q3',
    monthsElapsed: 7,
    monthlyRoadmap: [],
    quarterReadiness: {
      Q1: { pct: 100, processed: 30, expected: 30, future: false },
      Q2: { pct: 100, processed: 30, expected: 30, future: false },
      Q3: { pct: 80, processed: 24, expected: 30, future: false },
      Q4: { pct: 0, processed: 0, expected: 30, future: true },
    },
    prevQuarterPending: 0,
    zeroTaxEntries: [],
    missingPANs: [],
    statutoryDeadlines: {
      nextTdsDepositDate: '7 Nov 2026',
      nextQuarterFilingDate: '31 Oct 2026',
      nextQuarterName: 'Form 24Q (Q3)',
      daysUntilFiling: 11,
    },
    ...overrides,
  };
}

function makeTreasury(overrides: Partial<TreasurySummary> = {}): TreasurySummary {
  return {
    gtr30Count: 0,
    gtr30GrossTotal: 0,
    gtr30PendingCount: 0,
    gtr44Count: 0,
    gtr44GrossTotal: 0,
    gtr44DraftCount: 0,
    ...overrides,
  };
}

function month(
  name: string,
  active: number,
  processed: number,
  extra: Partial<MonthlyRoadmapData> = {}
): MonthlyRoadmapData {
  return {
    month: name,
    active,
    processed,
    salary: 0,
    tax: 0,
    pct: active > 0 ? Math.round((processed / active) * 100) : 0,
    status: processed >= active && active > 0 ? 'complete' : processed > 0 ? 'partial' : 'empty',
    isCurrent: false,
    future: false,
    pendingNames: [],
    ...extra,
  };
}

describe('buildActions', () => {
  const farFiling = {
    statutoryDeadlines: {
      nextTdsDepositDate: '7 Nov 2026',
      nextQuarterFilingDate: '31 Oct 2026',
      nextQuarterName: 'Form 24Q (Q3)',
      daysUntilFiling: 90,
    },
  };

  it('returns no actions when payroll and treasury are clean', () => {
    expect(buildActions(makePayroll(farFiling), makeTreasury(), NOW)).toEqual([]);
  });

  it('ranks missing PAN ahead of treasury warnings and drafts', () => {
    const actions = buildActions(
      makePayroll({ ...farFiling, missingPANs: ['A', 'B'] }),
      makeTreasury({ gtr30PendingCount: 3, gtr44DraftCount: 5 }),
      NOW
    );

    expect(actions.map((action) => action.id)).toEqual([
      'compliance-missing-pan',
      'treasury-gtr30-pending',
      'treasury-gtr44-draft',
    ]);
  });

  it('adds a filing action only for the current FY, only when the quarter is incomplete and the deadline is near', () => {
    const near = buildActions(makePayroll(), makeTreasury(), NOW);
    expect(near.map((action) => action.id)).toContain('compliance-filing-deadline');

    const ready = buildActions(
      makePayroll({
        quarterReadiness: {
          ...makePayroll().quarterReadiness,
          Q3: { pct: 100, processed: 30, expected: 30, future: false },
        },
      }),
      makeTreasury(),
      NOW
    );
    expect(ready.map((action) => action.id)).not.toContain('compliance-filing-deadline');

    const far = buildActions(
      makePayroll({
        statutoryDeadlines: {
          ...makePayroll().statutoryDeadlines,
          daysUntilFiling: 90,
        },
      }),
      makeTreasury(),
      NOW
    );
    expect(far.map((action) => action.id)).not.toContain('compliance-filing-deadline');

    const pastFy = buildActions(
      makePayroll({ fy: currentFinancialYear(NOW) - 1, currentQuarter: 'Q4' }),
      makeTreasury(),
      NOW
    );
    expect(pastFy.map((action) => action.id)).not.toContain('compliance-filing-deadline');
  });

  it('marks the filing action overdue when the deadline has passed', () => {
    const actions = buildActions(
      makePayroll({
        statutoryDeadlines: {
          ...makePayroll().statutoryDeadlines,
          daysUntilFiling: -4,
        },
      }),
      makeTreasury(),
      NOW
    );

    const filing = actions.find((action) => action.id === 'compliance-filing-deadline');
    expect(filing?.severity).toBe('danger');
    expect(filing?.title).toContain('overdue');
  });
});

describe('derivePayrollPacing', () => {
  it('sums only elapsed months and reports earlier-month gaps separately', () => {
    const pacing = derivePayrollPacing([
      month('April', 10, 10),
      month('May', 10, 8),
      month('June', 10, 7, { isCurrent: true }),
      month('July', 10, 0, { future: true, status: 'idle' }),
    ]);

    expect(pacing.current).toEqual({ month: 'June', active: 10, processed: 7, pct: 70 });
    expect(pacing.ytd).toEqual({ active: 30, processed: 25, pct: 83 });
    expect(pacing.priorPending).toBe(2);
    expect(pacing.isOnTrack).toBe(false);
  });

  it('reports on track when the current month and earlier months are complete', () => {
    const pacing = derivePayrollPacing([
      month('April', 10, 10),
      month('May', 10, 10, { isCurrent: true }),
    ]);

    expect(pacing.priorPending).toBe(0);
    expect(pacing.isOnTrack).toBe(true);
  });
});

describe('formatRelativeTime', () => {
  it('formats recent and older timestamps', () => {
    const now = Date.UTC(2026, 9, 20, 12, 0, 0);
    expect(formatRelativeTime(now - 10_000, now)).toBe('just now');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5m ago');
    expect(formatRelativeTime(now - 3 * 60 * 60_000, now)).toBe('3h ago');
    expect(formatRelativeTime(now - 2 * 24 * 60 * 60_000, now)).toBe('2d ago');
  });
});
