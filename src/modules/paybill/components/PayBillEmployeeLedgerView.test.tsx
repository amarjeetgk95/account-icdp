import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PayBillEmployeeLedgerView } from './PayBillEmployeeLedgerView';
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

describe('PayBillEmployeeLedgerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders employee ledger view with Pay Difference and DA Difference in last section of earning with Arrears badges', async () => {
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

    vi.spyOn(paybillRepository, 'listDeductions').mockResolvedValue([
      {
        id: 'ded-1',
        importId: 'imp-1',
        officeId: 'office-123',
        employeeId: 'emp-1',
        hrpn: '20014113',
        employeeName: 'Dr. Ramesh Patel',
        designation: 'Veterinary Officer',
        month: 'April',
        financialYear: 2026,
        incomeTax: 5000,
        profTax: 200,
        hbaInterest: 0,
        gpfRegular: 6000,
        gpfClass4: 0,
        npsRegular: 0,
        gisGovtFund: 120,
        gisGovtSaving: 280,
        totalDeductions: 11600,
        netPay: 83100,
        mappingStatus: 'MATCHED',
        createdAt: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter>
        <PayBillEmployeeLedgerView financialYear={2026} initialHrpn="20014113" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dr. Ramesh Patel')).toBeInTheDocument();
    });

    // Verify difference rows and Arrears badges exist
    expect(screen.getByText('Pay Difference')).toBeInTheDocument();
    expect(screen.getByText('DA Difference')).toBeInTheDocument();
    const badges = screen.getAllByText('Arrears');
    expect(badges.length).toBeGreaterThanOrEqual(2);

    // Verify basic pay and gross rows exist
    expect(screen.getByText('Basic Pay')).toBeInTheDocument();
    expect(screen.getByText('DA')).toBeInTheDocument();
    expect(screen.getByText('Gross Amt')).toBeInTheDocument();

    // Verify Edit in Legacy Entry button is available
    expect(screen.getByText(/Edit in Legacy Entry/i)).toBeInTheDocument();
  });
});
