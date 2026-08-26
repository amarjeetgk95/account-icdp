import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { paybillRepository } from '../repositories/paybill.repository';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import type { EstablishmentEmployee } from '@/modules/establishment/types';
import type { PayBillStoredEarning, PayBillStoredDeduction, PayBillSettings } from '../types';
import { buildEmployeeDirectory, useEmployeeDirectory } from './useEmployeeDirectory';
import { useEmployeeLedger } from './useEmployeeLedger';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}));

vi.mock('@/shared/utilities/office', () => ({
  getOfficeId: () => 'office-123',
  isAllOfficesMode: () => false,
  resolveOfficeIdForUser: () => Promise.resolve('office-123'),
}));

vi.mock('../repositories/paybill.repository', () => ({
  paybillRepository: {
    listEarnings: vi.fn(),
    listDeductions: vi.fn(),
    getSettings: vi.fn(),
    getManualLedgerValues: vi.fn(),
  },
}));

vi.mock('@/modules/establishment/services/establishment.service', () => ({
  establishmentService: {
    syncEmployees: vi.fn(),
    loadEmployees: vi.fn(),
  },
}));

function makeEarning(
  overrides: Partial<PayBillStoredEarning> & Pick<PayBillStoredEarning, 'hrpn'>
): PayBillStoredEarning {
  return {
    id: `earn-${overrides.hrpn}`,
    importId: 'imp-1',
    officeId: 'office-123',
    employeeId: null,
    employeeName: `Earn Name ${overrides.hrpn}`,
    designation: 'Earning Designation',
    payScale: 'Level 10',
    ph: null,
    slo: null,
    month: 'April',
    financialYear: 2026,
    basicPay: 1000,
    da: 0,
    hra: 0,
    cla: 0,
    medicalAllowance: 0,
    transportAllowance: 0,
    specialPay: 0,
    washingAllowance: 0,
    nppAllowance: 0,
    grossAmount: overrides.grossAmount ?? 1000,
    mappingStatus: 'MATCHED',
    createdAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeDeduction(
  overrides: Partial<PayBillStoredDeduction> & Pick<PayBillStoredDeduction, 'hrpn'>
): PayBillStoredDeduction {
  return {
    id: `ded-${overrides.hrpn}`,
    importId: 'imp-1',
    officeId: 'office-123',
    employeeId: null,
    employeeName: `Ded Name ${overrides.hrpn}`,
    designation: 'Deduction Designation',
    month: 'April',
    financialYear: 2026,
    incomeTax: 0,
    profTax: 0,
    hbaInterest: 0,
    gpfRegular: 0,
    gpfClass4: 0,
    npsRegular: 0,
    gisGovtFund: 0,
    gisGovtSaving: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    netPay: overrides.netPay ?? 900,
    mappingStatus: 'MATCHED',
    createdAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeEstEmployee(
  overrides: Partial<EstablishmentEmployee> & Pick<EstablishmentEmployee, 'id' | 'name'>
): EstablishmentEmployee {
  return {
    hrpnNo: undefined,
    designation: undefined,
    payScale: undefined,
    joinDate: undefined,
    transferDate: undefined,
    active: true,
    allowances: {},
    deductions: {},
    payEntries: [],
    ...overrides,
  };
}

const TEST_SETTINGS: PayBillSettings = {
  daRates: [50, 53],
  daHikeThreshold: 50,
  basicPayChangeTolerance: 10,
  manualAllowances: ['Pay Difference', 'DA Difference'],
  manualDeductions: [],
  earningColumnOrder: [],
  deductionColumnOrder: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('buildEmployeeDirectory', () => {
  const FY = 2026;

  it('prefers earnings over deductions over establishment for the same HRPN', () => {
    const earnings = [makeEarning({ hrpn: 'E1', employeeName: 'From Earnings' })];
    const deductions = [
      makeDeduction({ hrpn: 'E1', employeeName: 'From Deductions' }),
      makeDeduction({ hrpn: 'D1', employeeName: 'Only Deductions' }),
    ];
    const estEmployees = [
      makeEstEmployee({ id: 'est-1', name: 'From Establishment', hrpnNo: 'E1' }),
      makeEstEmployee({ id: 'est-2', name: 'Est Only', hrpnNo: 'S1', designation: 'Clerk', payScale: 'Level 4' }),
    ];

    const dir = buildEmployeeDirectory(earnings, deductions, estEmployees, FY);

    expect(dir.map((e) => e.hrpn)).toEqual(['E1', 'D1', 'S1']);
    // Earning entry wins wholesale (incl. payScale from the earning row)
    expect(dir[0]).toEqual({
      hrpn: 'E1',
      name: 'From Earnings',
      designation: 'Earning Designation',
      payScale: 'Level 10',
    });
    // Deduction-sourced entry carries payScale: null even if establishment could supply one
    expect(dir[1]).toEqual({
      hrpn: 'D1',
      name: 'Only Deductions',
      designation: 'Deduction Designation',
      payScale: null,
    });
    expect(dir[2]).toEqual({
      hrpn: 'S1',
      name: 'Est Only',
      designation: 'Clerk',
      payScale: 'Level 4',
    });
  });

  it('filters establishment employees by servesInFinancialYear', () => {
    const future = makeEstEmployee({
      id: 'est-future',
      name: 'Future Joiner',
      hrpnNo: 'F1',
      joinDate: `${FY + 1}-06-01`,
    });
    const past = makeEstEmployee({
      id: 'est-past',
      name: 'Past Transfer',
      hrpnNo: 'P1',
      transferDate: `${FY - 1}-01-01`,
    });
    const midYearTransfer = makeEstEmployee({
      id: 'est-mid',
      name: 'Mid Year Transfer',
      hrpnNo: 'M1',
      joinDate: `${FY}-01-01`,
      transferDate: `${FY}-08-31`,
    });
    const serving = makeEstEmployee({
      id: 'est-serving',
      name: 'Current Server',
      hrpnNo: 'C1',
      joinDate: `${FY - 5}-04-01`,
    });

    const dir = buildEmployeeDirectory([], [], [future, past, midYearTransfer, serving], FY);

    expect(dir.map((e) => e.hrpn)).toEqual(['M1', 'C1']);
  });

  it('deduplicates establishment rows and trims whitespace', () => {
    const estEmployees = [
      makeEstEmployee({ id: 'est-a', name: 'First Wins', hrpnNo: 'X1' }),
      makeEstEmployee({ id: 'est-b', name: 'Second Ignored', hrpnNo: 'X1' }),
      makeEstEmployee({ id: 'est-space', name: 'Whitespace Trimmed', hrpnNo: '  Y1  ' }),
    ];

    const dir = buildEmployeeDirectory([], [], estEmployees, FY);

    expect(dir.map((e) => e.hrpn)).toEqual(['X1', 'Y1']);
    expect(dir[0].name).toBe('First Wins');
  });
});

describe('useEmployeeDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges paybill rows with synced establishment employees', async () => {
    vi.mocked(paybillRepository.listEarnings).mockResolvedValue([
      makeEarning({ hrpn: 'E1', employeeName: 'Dr. Ramesh Patel' }),
    ]);
    vi.mocked(paybillRepository.listDeductions).mockResolvedValue([]);
    vi.mocked(establishmentService.syncEmployees).mockResolvedValue([
      makeEstEmployee({ id: 'est-1', name: 'Establishment Only', hrpnNo: 'S1' }),
    ]);

    const { result } = renderHook(() => useEmployeeDirectory(2026), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.employees.map((e) => e.hrpn)).toEqual(['E1', 'S1']);
    expect(result.current.employees[0].name).toBe('Dr. Ramesh Patel');
    expect(paybillRepository.listEarnings).toHaveBeenCalledWith({ financialYear: 2026 });
    expect(paybillRepository.listDeductions).toHaveBeenCalledWith({ financialYear: 2026 });
  });

  it('falls back to loadEmployees when sync fails', async () => {
    vi.mocked(paybillRepository.listEarnings).mockResolvedValue([]);
    vi.mocked(paybillRepository.listDeductions).mockResolvedValue([]);
    vi.mocked(establishmentService.syncEmployees).mockRejectedValue(new Error('sync down'));
    vi.mocked(establishmentService.loadEmployees).mockReturnValue([
      makeEstEmployee({ id: 'est-1', name: 'Local Cache Employee', hrpnNo: 'L1' }),
    ]);

    const { result } = renderHook(() => useEmployeeDirectory(2026), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.employees.map((e) => e.hrpn)).toEqual(['L1']);
    expect(result.current.employees[0].name).toBe('Local Cache Employee');
    expect(establishmentService.loadEmployees).toHaveBeenCalled();
  });
});

describe('useEmployeeLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paybillRepository.getSettings).mockResolvedValue(TEST_SETTINGS);
    vi.mocked(paybillRepository.getManualLedgerValues).mockResolvedValue({});
  });

  it('fetches earnings/deductions scoped to { financialYear, hrpn } plus prev-year aggregate', async () => {
    vi.mocked(paybillRepository.listEarnings).mockImplementation((params) =>
      Promise.resolve(
        params?.financialYear === 2026 ? [makeEarning({ hrpn: 'H1', grossAmount: 12000 })] : []
      )
    );
    vi.mocked(paybillRepository.listDeductions).mockImplementation((params) =>
      Promise.resolve(
        params?.financialYear === 2025 ? [makeDeduction({ hrpn: 'H1', netPay: 40000 })] : []
      )
    );

    const { result } = renderHook(() => useEmployeeLedger(2026, 'H1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.prevYearAgg.size).toBe(1));

    expect(paybillRepository.listEarnings).toHaveBeenCalledWith({ financialYear: 2026, hrpn: 'H1' });
    expect(paybillRepository.listDeductions).toHaveBeenCalledWith({ financialYear: 2026, hrpn: 'H1' });
    expect(paybillRepository.listEarnings).toHaveBeenCalledWith({ financialYear: 2025, hrpn: 'H1' });
    expect(paybillRepository.listDeductions).toHaveBeenCalledWith({ financialYear: 2025, hrpn: 'H1' });

    expect(result.current.earnings).toHaveLength(1);
    expect(result.current.earnings[0].grossAmount).toBe(12000);
    expect(result.current.deductions).toHaveLength(0);
    expect(result.current.settings).toEqual(TEST_SETTINGS);
    expect(result.current.prevYearAgg.get('H1')).toEqual({ gross: 0, net: 40000 });
  });

  it('does not fire hrpn-scoped queries when hrpn is null', async () => {
    const { result } = renderHook(() => useEmployeeLedger(2026, null), {
      wrapper: createWrapper(),
    });

    // Config (unscoped) still loads; scoped queries stay idle
    await waitFor(() => expect(result.current.settings).not.toBeNull());

    expect(paybillRepository.listEarnings).not.toHaveBeenCalled();
    expect(paybillRepository.listDeductions).not.toHaveBeenCalled();
    expect(result.current.earnings).toEqual([]);
    expect(result.current.deductions).toEqual([]);
    expect(result.current.prevYearAgg.size).toBe(0);
  });

  it('never surfaces prev-year failures', async () => {
    vi.mocked(paybillRepository.listEarnings).mockImplementation((params) =>
      params?.financialYear === 2026
        ? Promise.resolve([makeEarning({ hrpn: 'H2' })])
        : Promise.reject(new Error('prev FY unavailable'))
    );
    vi.mocked(paybillRepository.listDeductions).mockResolvedValue([]);

    const { result } = renderHook(() => useEmployeeLedger(2026, 'H2'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.earnings).toHaveLength(1);
    expect(result.current.prevYearAgg.size).toBe(0);
  });

  it('aggregates query errors: failing deductions query sets isError and error', async () => {
    vi.mocked(paybillRepository.listEarnings).mockResolvedValue([makeEarning({ hrpn: 'H4' })]);
    vi.mocked(paybillRepository.listDeductions).mockRejectedValue(new Error('deductions down'));

    const { result } = renderHook(() => useEmployeeLedger(2026, 'H4'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('deductions down');
  });

  it('reports isError/error as null when all ledger queries succeed', async () => {
    vi.mocked(paybillRepository.listEarnings).mockResolvedValue([]);
    vi.mocked(paybillRepository.listDeductions).mockResolvedValue([]);

    const { result } = renderHook(() => useEmployeeLedger(2026, 'H5'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('refetchAll refetches earnings, deductions, config and prev-year', async () => {
    vi.mocked(paybillRepository.listEarnings).mockResolvedValue([makeEarning({ hrpn: 'H3' })]);
    vi.mocked(paybillRepository.listDeductions).mockResolvedValue([]);

    const { result } = renderHook(() => useEmployeeLedger(2026, 'H3'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(paybillRepository.listEarnings).toHaveBeenCalledTimes(2); // FY + prev FY
    expect(paybillRepository.listDeductions).toHaveBeenCalledTimes(2);
    expect(paybillRepository.getSettings).toHaveBeenCalledTimes(1);
    expect(paybillRepository.getManualLedgerValues).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetchAll();
    });

    expect(paybillRepository.listEarnings).toHaveBeenCalledTimes(4);
    expect(paybillRepository.listDeductions).toHaveBeenCalledTimes(4);
    expect(paybillRepository.getSettings).toHaveBeenCalledTimes(2);
    expect(paybillRepository.getManualLedgerValues).toHaveBeenCalledTimes(2);
  });
});
