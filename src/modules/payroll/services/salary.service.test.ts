import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salaryService } from './salary.service';
import { employeeService } from './employee.service';
import { supabase } from '@/core/supabase/client';

vi.mock('./employee.service', () => ({
  employeeService: {
    listEmployees: vi.fn(),
  },
}));

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockListEmployees = vi.mocked(employeeService.listEmployees);
const mockFrom = vi.mocked(supabase.from);

function legacyRow(id: string, hprn_no: string | null, pan: string) {
  return {
    id,
    hprn_no,
    name: `Emp ${id}`,
    pan,
    designation: null,
    pay_scale: null,
    join_date: null,
    transfer_date: null,
    budget_head_id: null,
    created_at: '',
    updated_at: '',
  };
}

function mockCanonical(rows: Array<{ hrpn_no: string | null; pan: string | null }>) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: rows, error: null }),
  } as unknown as ReturnType<typeof supabase.from>);
}

const FILE_ROWS = [
  ['HRPN No.', 'Employee Name', 'PAN', 'Aug-25 GROSS', 'Aug-25 TDS'],
  ['100123', 'Employee A', 'ABCDE1234F', '40000', '6000'],
];

describe('salaryService.classifyRows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('matches by HRPN directly against the legacy master', async () => {
    mockListEmployees.mockResolvedValue([legacyRow('emp-1', '100123', 'ABCDE1234F')]);
    mockCanonical([]);

    const { classified, summary } = await salaryService.classifyRows(FILE_ROWS);
    expect(classified.length).toBe(1);
    expect(classified[0]).toMatchObject({ employeeId: 'emp-1', status: 'matched' });
    expect(summary.matchedRecords).toBe(1);
  });

  it('falls back to PAN when the file HRPN is unknown', async () => {
    mockListEmployees.mockResolvedValue([legacyRow('emp-1', 'H1001', 'ABCDE1234F')]);
    mockCanonical([]);

    const { classified } = await salaryService.classifyRows(FILE_ROWS);
    expect(classified.length).toBe(1);
    expect(classified[0]).toMatchObject({ employeeId: 'emp-1', status: 'matched' });
  });

  it('resolves via the canonical register when legacy HRPN differs', async () => {
    // Same person, HRPN recorded differently in the legacy master.
    mockListEmployees.mockResolvedValue([legacyRow('emp-9', 'LEGACY999', 'XYZAB1234C')]);
    mockCanonical([{ hrpn_no: '100123', pan: 'XYZAB1234C' }]);

    const rows = [
      ['HRPN No.', 'Employee Name', 'Aug-25 GROSS', 'Aug-25 TDS'],
      ['100123', 'Employee A', '40000', '6000'],
    ];
    const { classified } = await salaryService.classifyRows(rows);
    expect(classified.length).toBe(1);
    expect(classified[0]).toMatchObject({ employeeId: 'emp-9', status: 'matched' });
  });

  it('leaves truly unknown people unmatched', async () => {
    mockListEmployees.mockResolvedValue([legacyRow('emp-1', 'H1001', 'ZZZZZ9999Z')]);
    mockCanonical([{ hrpn_no: 'OTHER', pan: 'YYYYY9999Y' }]);

    const { classified, summary } = await salaryService.classifyRows(FILE_ROWS);
    expect(classified.length).toBe(1);
    expect(classified[0]).toMatchObject({ employeeId: null, status: 'unmatched' });
    expect(summary.unmatchedRecords).toBe(1);
  });

  it('still matches legacy HRPNs when the canonical lookup fails', async () => {
    mockListEmployees.mockResolvedValue([legacyRow('emp-1', '100123', 'ABCDE1234F')]);
    mockFrom.mockImplementation(() => {
      throw new Error('down');
    });

    const { classified } = await salaryService.classifyRows(FILE_ROWS);
    expect(classified.length).toBe(1);
    expect(classified[0]).toMatchObject({ employeeId: 'emp-1', status: 'matched' });
  });
});
