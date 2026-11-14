import { describe, it, expect, vi, beforeEach } from 'vitest';
import { payrollRepository } from './payroll.repository';
import { supabase } from '@/core/supabase/client';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const EST_ROWS = [
  { id: 'est-1', hrpn_no: '20013826', name: 'Dr. D.C.Chaudhari', pan: 'AGHPC4157B', join_date: '2026-03-01', transfer_date: null, budget_head_id: null },
  { id: 'est-2', hrpn_no: null, name: 'Smt. S.V.Solanki', pan: 'AKPPS2419E', join_date: '2026-03-01', transfer_date: '2026-06-22', budget_head_id: null },
  { id: 'est-3', hrpn_no: '99999999', name: 'Unlinked Person', pan: 'ZZZZZ9999Z', join_date: '2026-03-01', transfer_date: null, budget_head_id: null },
  { id: 'est-4', hrpn_no: '20014000', name: 'Shri A.K.TransferAug1', pan: 'AAAAA1111A', join_date: '2026-01-01', transfer_date: '2026-08-01', budget_head_id: null },
  { id: 'est-5', hrpn_no: '20015000', name: 'Shri B.K.TransferAug20', pan: 'BBBBB2222B', join_date: '2026-01-01', transfer_date: '2026-08-20', budget_head_id: null },
  { id: 'est-6', hrpn_no: '20016000', name: 'Shri C.K.JoinOct', pan: 'CCCCC3333C', join_date: '2026-10-15', transfer_date: null, budget_head_id: null },
];

const LEGACY_ROWS = [
  { id: 'legacy-1', hprn_no: '20013826', name: 'Dr. D.C.Chaudhari', pan: 'AGHPC4157B', budget_head_id: 'bh-102', join_date: '2026-03-01', transfer_date: null },
  { id: 'legacy-2', hprn_no: null, name: 'Smt. S.V.Solanki', pan: 'AKPPS2419E', budget_head_id: 'bh-102', join_date: '2026-03-01', transfer_date: '2026-06-22' },
  { id: 'legacy-4', hprn_no: '20014000', name: 'Shri A.K.TransferAug1', pan: 'AAAAA1111A', budget_head_id: 'bh-102', join_date: '2026-01-01', transfer_date: '2026-08-01' },
  { id: 'legacy-5', hprn_no: '20015000', name: 'Shri B.K.TransferAug20', pan: 'BBBBB2222B', budget_head_id: 'bh-102', join_date: '2026-01-01', transfer_date: '2026-08-20' },
  { id: 'legacy-6', hprn_no: '20016000', name: 'Shri C.K.JoinOct', pan: 'CCCCC3333C', budget_head_id: 'bh-102', join_date: '2026-10-15', transfer_date: null },
];

const SALARY_ROWS = [
  { employee_id: 'legacy-1', establishment_employee_id: null, month: 'September', gross: 50000, da: 10000, tax: 5000 },
];

function mockDb(opts: { estError?: boolean; salaries?: unknown[] } = {}) {
  const salaries = opts.salaries ?? SALARY_ROWS;
  // Supabase builder supports .order().order() chaining — the mock's first
  // .order() returns a thenable that also carries .order for the second call.
  const chainableOrder = (data: unknown, error: unknown) => {
    const second = vi.fn().mockResolvedValue({ data, error });
    const first = Object.assign(Promise.resolve({ data, error }), {
      order: second,
    });
    return vi.fn().mockReturnValue(first);
  };
  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    if (table === 'establishment_employees') {
      return {
        select: () => ({
          order: chainableOrder(
            opts.estError ? null : EST_ROWS,
            opts.estError ? new Error('down') : null
          ),
        }),
      };
    }
    if (table === 'employees') {
      return {
        select: () => ({
          order: vi.fn().mockResolvedValue({ data: LEGACY_ROWS, error: null }),
        }),
      };
    }
    if (table === 'employee_salaries') {
      const createChain = (): Record<string, unknown> => {
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.delete = () => chain;
        chain.upsert = vi.fn().mockResolvedValue({ error: null });
        chain.eq = vi.fn(() => createChain());
        chain.then = (resolve: (val: unknown) => unknown) =>
          Promise.resolve({ data: salaries, error: null }).then(resolve);
        return chain;
      };
      return createChain();
    }
    if (table === 'budget_heads') {
      return {
        select: () => ({
          order: () => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        }),
      };
    }
    return { select: () => ({}) };
  });
}

describe('payrollRepository canonical roster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds the roster from Establishment and bridges salaries via legacy ids', async () => {
    mockDb();

    const roster = await payrollRepository.getRosterForMonth('September', 2026);

    const byName = new Map(roster.map((r) => [r.name, r]));
    expect(byName.has('Dr. D.C.Chaudhari')).toBe(true);
    expect(byName.has('Unlinked Person')).toBe(true);

    const linked = byName.get('Dr. D.C.Chaudhari')!;
    expect(linked.id).toBe('legacy-1');
    expect(linked.hprnNo).toBe('20013826');
    expect(linked.hasPayrollLink).toBe(true);
    expect(linked.hasEntry).toBe(true);
    expect(linked.gross).toBe(50000);

    const unlinked = byName.get('Unlinked Person')!;
    expect(unlinked.id).toBe('est:est-3');
    expect(unlinked.hasPayrollLink).toBe(false);
    expect(unlinked.hasEntry).toBe(false);
  });

  it('resolves the PAN fallback when HRPN is missing', async () => {
    mockDb();
    const roster = await payrollRepository.getRosterForMonth('April', 2026);
    const solanki = roster.find((r) => r.name === 'Smt. S.V.Solanki');
    expect(solanki?.id).toBe('legacy-2');
    expect(solanki?.hasPayrollLink).toBe(true);
  });

  it('saveBulkSalary skips est: ids and reports the skip', async () => {
    mockDb();
    const msg = await payrollRepository.saveBulkSalary(
      'September',
      [
        { employeeId: 'legacy-1', gross: 50000, da: 10000, tax: 5000 },
        { employeeId: 'est:est-3', gross: 1000, da: 0, tax: 0 },
      ],
      2026
    );
    expect(msg).toContain('Saved 1 of 1');
    expect(msg).toContain('1 without payroll link skipped');
  });

  it('falls back to legacy employees when Establishment is unreachable', async () => {
    mockDb({ estError: true });
    const createChain = (): Record<string, unknown> => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = vi.fn(() => createChain());
      chain.then = (resolve: (val: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return chain;
    };

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'establishment_employees') {
        const second = vi.fn().mockResolvedValue({ data: null, error: new Error('down') });
        const first = Object.assign(Promise.resolve({ data: null, error: new Error('down') }), {
          order: second,
        });
        return { select: () => ({ order: vi.fn().mockReturnValue(first) }) };
      }
      if (table === 'employees') {
        return {
          select: () => ({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'legacy-1', name: 'Legacy One', pan: 'AGHPC4157B', hprn_no: '20013826', join_date: '2026-03-01', transfer_date: null },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'employee_salaries') {
        return createChain();
      }
      return { select: () => ({}) };
    });

    const roster = await payrollRepository.getRosterForMonth('September', 2026);
    expect(roster).toHaveLength(1);
    expect(roster[0].id).toBe('legacy-1');
  });
});

describe('payrollRepository getQuarterReport (transfer awareness)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes employee transferred on 2026-08-01 in Q2 with valid July & August data, zeroes September, and omits in Q3/Q4', async () => {
    const salaries = [
      // legacy-4: transferred on 2026-08-01 (worked June & July, not August)
      { employee_id: 'legacy-4', establishment_employee_id: 'est-4', month: 'July', gross: 40000, da: 8000, tax: 4000 },
      { employee_id: 'legacy-4', establishment_employee_id: 'est-4', month: 'August', gross: 40000, da: 8000, tax: 4000 },
      // Stale / leftover salary row for inactive September month:
      { employee_id: 'legacy-4', establishment_employee_id: 'est-4', month: 'September', gross: 40000, da: 8000, tax: 4000 },
      // Stale / leftover salary row in Q3:
      { employee_id: 'legacy-4', establishment_employee_id: 'est-4', month: 'October', gross: 40000, da: 8000, tax: 4000 },
    ];
    mockDb({ salaries });

    // Q2 report: months = ['July', 'August', 'September']
    const q2 = await payrollRepository.getQuarterReport('Q2', 2026);
    const rowQ2 = q2.rows.find((r) => r.name === 'Shri A.K.TransferAug1');
    expect(rowQ2).toBeDefined();
    // July (June work) and August (July work) are active, September is zeroed out
    expect(rowQ2!.g).toEqual([40000, 40000, 0]);
    expect(rowQ2!.t).toEqual([4000, 4000, 0]);
    expect(rowQ2!.d).toBe(16000); // 8000 + 8000 (September DA excluded)
    expect(rowQ2!.total).toBe(96000); // 40000 + 40000 + 0 + 16000
    expect(rowQ2!.tax).toBe(8000); // 4000 + 4000 + 0

    // Q3 report: months = ['October', 'November', 'December']
    // Employee posting ended in August -> 0 active months in Q3 -> OMITTED completely
    const q3 = await payrollRepository.getQuarterReport('Q3', 2026);
    const rowQ3 = q3.rows.find((r) => r.name === 'Shri A.K.TransferAug1');
    expect(rowQ3).toBeUndefined();

    // Q4 report: also omitted
    const q4 = await payrollRepository.getQuarterReport('Q4', 2026);
    const rowQ4 = q4.rows.find((r) => r.name === 'Shri A.K.TransferAug1');
    expect(rowQ4).toBeUndefined();
  });

  it('includes employee transferred on 2026-08-20 for all 3 months of Q2 and omits in Q3', async () => {
    const salaries = [
      // legacy-5: transferred on 2026-08-20 (worked June, July, and through 20 August)
      { employee_id: 'legacy-5', establishment_employee_id: 'est-5', month: 'July', gross: 50000, da: 10000, tax: 5000 },
      { employee_id: 'legacy-5', establishment_employee_id: 'est-5', month: 'August', gross: 50000, da: 10000, tax: 5000 },
      { employee_id: 'legacy-5', establishment_employee_id: 'est-5', month: 'September', gross: 50000, da: 10000, tax: 5000 },
      // Stale October salary
      { employee_id: 'legacy-5', establishment_employee_id: 'est-5', month: 'October', gross: 50000, da: 10000, tax: 5000 },
    ];
    mockDb({ salaries });

    // Q2 report: all 3 months active
    const q2 = await payrollRepository.getQuarterReport('Q2', 2026);
    const rowQ2 = q2.rows.find((r) => r.name === 'Shri B.K.TransferAug20');
    expect(rowQ2).toBeDefined();
    expect(rowQ2!.g).toEqual([50000, 50000, 50000]);
    expect(rowQ2!.t).toEqual([5000, 5000, 5000]);
    expect(rowQ2!.d).toBe(30000);
    expect(rowQ2!.total).toBe(180000);
    expect(rowQ2!.tax).toBe(15000);

    // Q3 report: transfer 2026-08-20 is before Sept work (Oct pay) -> 0 active months in Q3 -> OMITTED
    const q3 = await payrollRepository.getQuarterReport('Q3', 2026);
    const rowQ3 = q3.rows.find((r) => r.name === 'Shri B.K.TransferAug20');
    expect(rowQ3).toBeUndefined();
  });

  it('omits employee who joined in October from Q1 and Q2, and includes in Q3', async () => {
    const salaries = [
      { employee_id: 'legacy-6', establishment_employee_id: 'est-6', month: 'July', gross: 30000, da: 6000, tax: 3000 },
      { employee_id: 'legacy-6', establishment_employee_id: 'est-6', month: 'November', gross: 30000, da: 6000, tax: 3000 },
      { employee_id: 'legacy-6', establishment_employee_id: 'est-6', month: 'December', gross: 30000, da: 6000, tax: 3000 },
    ];
    mockDb({ salaries });

    // Q2 report: not joined yet -> OMITTED
    const q2 = await payrollRepository.getQuarterReport('Q2', 2026);
    const rowQ2 = q2.rows.find((r) => r.name === 'Shri C.K.JoinOct');
    expect(rowQ2).toBeUndefined();

    // Q3 report: active in Nov & Dec (Oct & Nov work) -> INCLUDED
    const q3 = await payrollRepository.getQuarterReport('Q3', 2026);
    const rowQ3 = q3.rows.find((r) => r.name === 'Shri C.K.JoinOct');
    expect(rowQ3).toBeDefined();
    expect(rowQ3!.g).toEqual([0, 30000, 30000]);
    expect(rowQ3!.t).toEqual([0, 3000, 3000]);
    expect(rowQ3!.total).toBe(72000); // 0 + 30000 + 30000 + 12000 DA
  });

  it('omits transferred employees in legacy fallback mode when posting ended', async () => {
    mockDb({ estError: true });

    const createChain = (salaries: unknown[]): Record<string, unknown> => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = vi.fn(() => createChain(salaries));
      chain.then = (resolve: (val: unknown) => unknown) =>
        Promise.resolve({ data: salaries, error: null }).then(resolve);
      return chain;
    };

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'establishment_employees') {
        const second = vi.fn().mockResolvedValue({ data: null, error: new Error('down') });
        const first = Object.assign(Promise.resolve({ data: null, error: new Error('down') }), {
          order: second,
        });
        return { select: () => ({ order: vi.fn().mockReturnValue(first) }) };
      }
      if (table === 'employees') {
        return {
          select: () => ({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'legacy-4', name: 'Shri A.K.TransferAug1', pan: 'AAAAA1111A', join_date: '2026-01-01', transfer_date: '2026-08-01' },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'employee_salaries') {
        return createChain([
          { employee_id: 'legacy-4', month: 'July', gross: 40000, da: 8000, tax: 4000 },
          { employee_id: 'legacy-4', month: 'August', gross: 40000, da: 8000, tax: 4000 },
          { employee_id: 'legacy-4', month: 'October', gross: 40000, da: 8000, tax: 4000 },
        ]);
      }
      return { select: () => ({}) };
    });

    const q2 = await payrollRepository.getQuarterReport('Q2', 2026);
    expect(q2.rows).toHaveLength(1);
    expect(q2.rows[0].name).toBe('Shri A.K.TransferAug1');
    expect(q2.rows[0].g).toEqual([40000, 40000, 0]);

    const q3 = await payrollRepository.getQuarterReport('Q3', 2026);
    expect(q3.rows).toHaveLength(0);
  });
});

describe('payrollRepository getBudgetHeadReport (canonical heads + members)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockBudgetDb(opts: {
    estRows?: unknown[];
    legacyRows?: unknown[];
    heads?: unknown[];
    salaries?: unknown[];
  }) {
    const chainableOrder = (data: unknown) => {
      const second = vi.fn().mockResolvedValue({ data, error: null });
      const first = Object.assign(Promise.resolve({ data, error: null }), {
        order: second,
      });
      return vi.fn().mockReturnValue(first);
    };
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'establishment_employees') {
        return {
          select: () => ({
            order: chainableOrder(opts.estRows ?? []),
          }),
        };
      }
      if (table === 'employees') {
        return {
          select: () => ({
            order: vi.fn().mockResolvedValue({ data: opts.legacyRows ?? [], error: null }),
          }),
        };
      }
      if (table === 'budget_heads') {
        return {
          select: () => ({
            order: () => ({
              order: vi.fn().mockResolvedValue({ data: opts.heads ?? [], error: null }),
            }),
          }),
        };
      }
      if (table === 'employee_salaries') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({ data: opts.salaries ?? [], error: null }),
          }),
        };
      }
      return { select: () => ({}) };
    });
  }

  const HEADS = [
    { id: 'bh-new', code: '102:06', name: 'Tribal Plan' },
    { id: 'bh-102', code: '102:05', name: 'Non-Tribal Plan' },
  ];

  it('prefers the canonical Establishment tag over the legacy tag', async () => {
    mockBudgetDb({
      estRows: [
        { id: 'est-1', hrpn_no: '20013826', name: 'Dr. D.C.Chaudhari', pan: 'AGHPC4157B', join_date: '2026-03-01', transfer_date: null, budget_head_id: 'bh-new' },
      ],
      legacyRows: [
        { id: 'legacy-1', hprn_no: '20013826', pan: 'AGHPC4157B', budget_head_id: 'bh-102' },
      ],
      heads: HEADS,
      salaries: [
        { employee_id: 'legacy-1', establishment_employee_id: null, month: 'April', gross: 40000, da: 8000, tax: 4000 },
      ],
    });

    const report = await payrollRepository.getBudgetHeadReport(2026);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0].code).toBe('102:06');
    expect(report.groups[0].name).toBe('Tribal Plan');
    expect(report.groups[0].members).toHaveLength(1);
    expect(report.groups[0].members[0]).toMatchObject({
      name: 'Dr. D.C.Chaudhari',
      pan: 'AGHPC4157B',
      hprnNo: '20013826',
    });
    expect(report.groups[0].members[0].totals).toMatchObject({ gross: 40000, da: 8000, tax: 4000 });
  });

  it('falls back to the legacy tag when the canonical tag is empty', async () => {
    mockBudgetDb({
      estRows: [
        { id: 'est-1', hrpn_no: '20013826', name: 'Dr. D.C.Chaudhari', pan: 'AGHPC4157B', join_date: '2026-03-01', transfer_date: null, budget_head_id: null },
      ],
      legacyRows: [
        { id: 'legacy-1', hprn_no: '20013826', pan: 'AGHPC4157B', budget_head_id: 'bh-102' },
      ],
      heads: HEADS,
      salaries: [
        { employee_id: 'legacy-1', establishment_employee_id: null, month: 'April', gross: 40000, da: 8000, tax: 4000 },
      ],
    });

    const report = await payrollRepository.getBudgetHeadReport(2026);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0].code).toBe('102:05');
  });

  it('lists members sorted by name with quarterly breakup', async () => {
    mockBudgetDb({
      estRows: [
        { id: 'est-b', hrpn_no: 'H2', name: 'Zed Zee', pan: 'ZZZZZ9999Z', join_date: '2026-03-01', transfer_date: null, budget_head_id: 'bh-102' },
        { id: 'est-a', hrpn_no: 'H1', name: 'Amy Aye', pan: 'AAAAA1111A', join_date: '2026-03-01', transfer_date: null, budget_head_id: 'bh-102' },
      ],
      legacyRows: [],
      heads: HEADS,
      salaries: [
        { employee_id: 'x', establishment_employee_id: 'est-a', month: 'April', gross: 30000, da: 6000, tax: 3000 },
      ],
    });

    const report = await payrollRepository.getBudgetHeadReport(2026);
    const group = report.groups.find((g) => g.code === '102:05')!;
    expect(group.members.map((m) => m.name)).toEqual(['Amy Aye', 'Zed Zee']);
    const amy = group.members[0];
    expect(amy.totals).toMatchObject({ gross: 30000, da: 6000, tax: 3000 });
    expect(amy.quarters[0]).toMatchObject({ gross: 30000, da: 6000, tax: 3000 });
    expect(amy.quarters[1]).toMatchObject({ gross: 0, da: 0, tax: 0 });
  });

  it('lists members in establishment sequence, not A-Z', async () => {
    mockBudgetDb({
      estRows: [
        { id: 'est-b', hrpn_no: 'H2', name: 'Zed Zee', pan: 'ZZZZZ9999Z', join_date: '2026-03-01', transfer_date: null, budget_head_id: 'bh-102', display_order: 1 },
        { id: 'est-a', hrpn_no: 'H1', name: 'Amy Aye', pan: 'AAAAA1111A', join_date: '2026-03-01', transfer_date: null, budget_head_id: 'bh-102', display_order: 2 },
      ],
      legacyRows: [],
      heads: HEADS,
      salaries: [
        { employee_id: 'x', establishment_employee_id: 'est-a', month: 'April', gross: 30000, da: 6000, tax: 3000 },
      ],
    });

    const report = await payrollRepository.getBudgetHeadReport(2026);
    const group = report.groups.find((g) => g.code === '102:05')!;
    expect(group.members.map((m) => m.name)).toEqual(['Zed Zee', 'Amy Aye']);
  });
});
