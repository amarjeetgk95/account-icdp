import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollService } from './payroll.service';
import { payrollRepository } from '../repositories/payroll.repository';
import { MONTHS } from '@/shared/constants';

vi.mock('@/core/supabase/client', () => ({
  supabase: {},
}));

vi.mock('@/core/stores/ui-store', () => ({
  useUIStore: {
    getState: () => ({
      activeOfficeId: 'test-office',
      activeFinancialYear: 2025,
    }),
  },
}));

vi.mock('@/core/auth/store', () => ({
  useAuthStore: {
    getState: () => ({
      user: { officeId: 'test-office' },
    }),
  },
}));

vi.mock('@/shared/constants', () => ({
  MONTHS: [
    'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March',
  ],
}));

vi.mock('../repositories/payroll.repository', () => ({
  payrollRepository: {
    getRosterForMonth: vi.fn(),
    saveBulkSalary: vi.fn(),
    getEmployeeSalaryForMonth: vi.fn(),
    getPreviousMonthSalaries: vi.fn(),
    getQuarterReport: vi.fn(),
    getBudgetHeadReport: vi.fn(),
    checkMonthData: vi.fn(),
  },
}));

describe('PayrollService.getMonthOptions', () => {
  const service = new PayrollService();

  it('returns 12 month options', () => {
    const options = service.getMonthOptions(2025);
    expect(options).toHaveLength(12);
  });

  it('starts with April and ends with March', () => {
    const options = service.getMonthOptions(2025);
    expect(options[0].value).toBe('April');
    expect(options[11].value).toBe('March');
  });

  it('generates correct year labels within same FY', () => {
    const options = service.getMonthOptions(2025);
    const april = options[0];
    expect(april.label).toContain('25');
    expect(april.label).toContain('April-25');
  });

  it('generates correct year labels across FY boundary (Jan-Mar)', () => {
    const options = service.getMonthOptions(2025);
    const january = options.find((o) => o.value === 'January')!;
    const march = options.find((o) => o.value === 'March')!;
    expect(january.label).toContain('26');
    expect(march.label).toContain('26');
  });
});

describe('PayrollService.getEntryMonth', () => {
  const service = new PayrollService();

  it('returns a valid month name', () => {
    const month = service.getEntryMonth();
    expect(MONTHS).toContain(month);
  });

  it('returns the month before the current financial year month', () => {
    const service = new PayrollService();
    const now = new Date();
    const fyMonthIdx = (now.getMonth() - 3 + 12) % 12;
    const expectedEntryIdx = (fyMonthIdx - 1 + 12) % 12;
    const expected = MONTHS[expectedEntryIdx];
    expect(service.getEntryMonth()).toBe(expected);
  });
});

describe('PayrollService.getPreviousMonthData', () => {
  const service = new PayrollService();
  const mockGetPrev = payrollRepository.getPreviousMonthSalaries as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls repository with the previous month', async () => {
    mockGetPrev.mockResolvedValue([]);

    await service.getPreviousMonthData('August', 2025);

    expect(mockGetPrev).toHaveBeenCalledWith('July', 2025);
  });

  it('handles Q4 boundary (January -> December)', async () => {
    mockGetPrev.mockResolvedValue([]);

    await service.getPreviousMonthData('January', 2025);

    expect(mockGetPrev).toHaveBeenCalledWith('December', 2025);
  });

  it('handles FY boundary (April -> March)', async () => {
    mockGetPrev.mockResolvedValue([]);

    await service.getPreviousMonthData('April', 2025);

    expect(mockGetPrev).toHaveBeenCalledWith('March', 2025);
  });

  it('returns the result from the repository', async () => {
    const mockResult = [{ employeeId: 'emp-1', gross: 30000, da: 5000, tax: 2000 }];
    mockGetPrev.mockResolvedValue(mockResult);

    const result = await service.getPreviousMonthData('July', 2025);

    expect(result).toEqual(mockResult);
  });

  it('throws error for invalid month', async () => {
    await expect(service.getPreviousMonthData('InvalidMonth', 2025)).rejects.toThrow('Invalid month');
  });
});

describe('PayrollService.getEmployeePreviousMonthData', () => {
  const service = new PayrollService();
  const mockGetEmp = payrollRepository.getEmployeeSalaryForMonth as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls repository with the previous month', async () => {
    mockGetEmp.mockResolvedValue({ gross: 30000, da: 5000, tax: 2000 });

    await service.getEmployeePreviousMonthData('emp-123', 'August', 2025);

    expect(mockGetEmp).toHaveBeenCalledWith('emp-123', 'July', 2025);
  });

  it('handles FY boundary correctly', async () => {
    mockGetEmp.mockResolvedValue({ gross: 30000, da: 5000, tax: 2000 });

    await service.getEmployeePreviousMonthData('emp-123', 'April', 2025);

    expect(mockGetEmp).toHaveBeenCalledWith('emp-123', 'March', 2025);
  });

  it('returns null when no data found', async () => {
    mockGetEmp.mockResolvedValue(null);

    const result = await service.getEmployeePreviousMonthData('emp-123', 'August', 2025);

    expect(result).toBeNull();
  });

  it('throws error for invalid month', async () => {
    await expect(service.getEmployeePreviousMonthData('emp-123', 'Invalid', 2025)).rejects.toThrow('Invalid month');
  });
});

describe('PayrollService.validateEntries (via saveBulkSalary)', () => {
  const service = new PayrollService();
  const mockSave = payrollRepository.saveBulkSalary as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when employeeId is missing', async () => {
    await expect(
      service.saveBulkSalary('August', [{ employeeId: '', gross: 30000, da: 5000, tax: 2000 }], 2025)
    ).rejects.toThrow('Employee ID is required');
  });

  it('throws error for negative gross', async () => {
    await expect(
      service.saveBulkSalary('August', [{ employeeId: 'emp-1', gross: -100, da: 0, tax: 0 }], 2025)
    ).rejects.toThrow('Salary values cannot be negative');
  });

  it('throws error for negative da', async () => {
    await expect(
      service.saveBulkSalary('August', [{ employeeId: 'emp-1', gross: 30000, da: -50, tax: 0 }], 2025)
    ).rejects.toThrow('Salary values cannot be negative');
  });

  it('throws error for negative tax', async () => {
    await expect(
      service.saveBulkSalary('August', [{ employeeId: 'emp-1', gross: 30000, da: 0, tax: -200 }], 2025)
    ).rejects.toThrow('Salary values cannot be negative');
  });

  it('passes validation for valid entries', async () => {
    mockSave.mockResolvedValue('Successfully saved 2 records for August.');
    const result = await service.saveBulkSalary('August', [
      { employeeId: 'emp-1', gross: 30000, da: 5000, tax: 2000 },
      { employeeId: 'emp-2', gross: 25000, da: 4000, tax: 1500 },
    ], 2025);
    expect(result).toBe('Successfully saved 2 records for August.');
  });
});

describe('PayrollService.getQuarterReport', () => {
  const service = new PayrollService();
  const mockReport = payrollRepository.getQuarterReport as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error for invalid quarter', async () => {
    await expect(service.getQuarterReport('Q5', 2025)).rejects.toThrow('Invalid quarter');
  });

  it('passes valid quarter to repository', async () => {
    const mockResult = { fy: 2025, fyLabel: '2025-26', ayLabel: '2026-27', quarter: 'Q1', labels: [], rows: [] };
    mockReport.mockResolvedValue(mockResult);

    const result = await service.getQuarterReport('Q1', 2025, 'office-1');

    expect(mockReport).toHaveBeenCalledWith('Q1', 2025, 'office-1');
    expect(result).toEqual(mockResult);
  });
});

describe('PayrollService.getBudgetHeadReport', () => {
  const service = new PayrollService();
  const mockReport = payrollRepository.getBudgetHeadReport as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes fy and office to repository', async () => {
    const mockResult = { fy: 2025, fyLabel: '2025-26', monthLabels: [], groups: [], totals: { gross: 0, da: 0, tax: 0, net: 0 } };
    mockReport.mockResolvedValue(mockResult);

    const result = await service.getBudgetHeadReport(2025, 'office-1');

    expect(mockReport).toHaveBeenCalledWith(2025, 'office-1');
    expect(result).toEqual(mockResult);
  });

  it('uses default office when none provided', async () => {
    mockReport.mockResolvedValue({ fy: 2025, fyLabel: '2025-26', monthLabels: [], groups: [], totals: { gross: 0, da: 0, tax: 0, net: 0 } });

    await service.getBudgetHeadReport(2025);

    expect(mockReport).toHaveBeenCalledWith(2025, undefined);
  });
});
