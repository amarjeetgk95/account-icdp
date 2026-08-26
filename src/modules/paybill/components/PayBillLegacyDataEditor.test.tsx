import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PayBillLegacyDataEditor } from './PayBillLegacyDataEditor';
import { paybillRepository } from '../repositories/paybill.repository';
import { MemoryRouter } from 'react-router-dom';

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

describe('PayBillLegacyDataEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Legacy Data Editor with Pay Difference and DA Difference in last section of Earning', async () => {
    vi.spyOn(paybillRepository, 'listEarnings').mockResolvedValue([
      {
        id: 'earn-1',
        importId: 'imp-1',
        officeId: 'office-123',
        employeeId: 'emp-1',
        hrpn: '20014113',
        employeeName: 'Dr. Ramesh Patel',
        designation: 'Veterinary Officer',
        payScale: 'Level 10',
        ph: null,
        slo: null,
        month: 'April',
        financialYear: 2026,
        basicPay: 56100,
        da: 28050,
        hra: 5610,
        cla: 240,
        medicalAllowance: 1000,
        transportAllowance: 3600,
        specialPay: 0,
        washingAllowance: 100,
        nppAllowance: 0,
        grossAmount: 94700,
        mappingStatus: 'MATCHED',
        createdAt: new Date().toISOString(),
      },
    ]);

    vi.spyOn(paybillRepository, 'listDeductions').mockResolvedValue([]);
    vi.spyOn(paybillRepository, 'getOrCreateManualImport').mockResolvedValue('manual-import-1');
    vi.spyOn(paybillRepository, 'getOrCreateAllManualImports').mockResolvedValue({});
    vi.spyOn(paybillRepository, 'getManualLedgerValues').mockResolvedValue({
      '20014113': {
        'DA Difference': { April: 2500 },
      },
    });

    render(
      <MemoryRouter initialEntries={['/paybill/legacy-edit?hrpn=20014113']}>
        <PayBillLegacyDataEditor />
      </MemoryRouter>
    );

    await waitFor(() => {
      const daDiffInput = document.querySelector('input[data-row-key="DA Difference"][data-month-idx="1"]');
      expect(daDiffInput).toBeInTheDocument();
      expect(daDiffInput).toHaveValue('2500');
    });

    // Check difference rows exist with editable inputs
    expect(screen.getByText('Pay Difference')).toBeInTheDocument();
    expect(screen.getByText('DA Difference')).toBeInTheDocument();
  });
});
