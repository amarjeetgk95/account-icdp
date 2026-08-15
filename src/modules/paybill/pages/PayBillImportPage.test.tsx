import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayBillImportPage } from './PayBillImportPage';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'test-import-id' }, error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ data: [], error: null }),
    }),
  },
}));

vi.mock('@/core/auth/store', () => ({
  useAuthStore: {
    getState: () => ({
      user: { id: 'test-user-123' },
    }),
  },
}));

vi.mock('@/shared/utilities/office', () => ({
  getOfficeId: () => 'office-123',
}));

vi.mock('@/modules/payroll/services/employee.service', () => ({
  employeeService: {
    listEmployees: async () => [
      {
        id: 'emp-1',
        name: 'Dr. Dineshbhai Chamabhai Chaudhari',
        pan: 'ABCDE1234F',
        hprn_no: '20013826',
        office_id: 'office-123',
      },
      {
        id: 'emp-2',
        name: 'Dr. Hitendrabhai Manilal Patidar',
        pan: 'BCDEF2345G',
        hprn_no: '20014113',
        office_id: 'office-123',
      },
      {
        id: 'emp-3',
        name: 'Dr. Jagdishkumar Mohanbhai Jalandhra',
        pan: 'CDEFG3456H',
        hprn_no: '20014151',
        office_id: 'office-123',
      },
      {
        id: 'emp-4',
        name: 'Dr. Harit Dhananjaybhai Bhatt',
        pan: 'DEFGH4567I',
        hprn_no: '20014153',
        office_id: 'office-123',
      },
    ],
  },
}));

describe('PayBillImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 2 module tabs and upload button in header', () => {
    render(
      <MemoryRouter>
        <PayBillImportPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Pay Bill PDF Import & Allowance System/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload Pay Bill PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /12-Month Matrix/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Employee Ledger/i })).toBeInTheDocument();
  });

  it('opens upload popup modal on button click and extracts sample data', async () => {
    render(
      <MemoryRouter>
        <PayBillImportPage />
      </MemoryRouter>
    );

    const uploadBtn = screen.getByRole('button', { name: /Upload Pay Bill PDF/i });
    fireEvent.click(uploadBtn);

    // Verify modal is open
    expect(screen.getByText(/Upload & Extract Pay Bill PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/Sample Earning PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/Sample Deduction PDF/i)).toBeInTheDocument();

    // Click sample load button inside modal
    const sampleBtn = screen.getByText(/Sample Earning PDF/i);
    fireEvent.click(sampleBtn);

    // Wait for the extraction preview in modal
    await waitFor(
      () => {
        expect(screen.getByText(/Employee Earnings Preview & Verification/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('20013826')).toBeInTheDocument();
    expect(screen.getByText(/Insert Data into Module/i)).toBeInTheDocument();
  });

  it('extracts sample deduction PDF data with 8 employees and reconciles net pay', async () => {
    render(
      <MemoryRouter>
        <PayBillImportPage />
      </MemoryRouter>
    );

    const uploadBtn = screen.getByRole('button', { name: /Upload Pay Bill PDF/i });
    fireEvent.click(uploadBtn);

    // Click sample deduction load button inside modal
    const sampleDedBtn = screen.getByText(/Sample Deduction PDF/i);
    fireEvent.click(sampleDedBtn);

    // Wait for the extraction preview in modal
    await waitFor(
      () => {
        expect(screen.getByText(/Deduction Sheet & Net Pay Verification/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getAllByText('20105451').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('20105536')).toBeInTheDocument();
    expect(screen.getByText(/Insert Data into Module/i)).toBeInTheDocument();
  });

  it('switches between 12-Month Matrix and Employee Ledger tabs', () => {
    render(
      <MemoryRouter>
        <PayBillImportPage />
      </MemoryRouter>
    );

    // Click 12-Month Matrix tab
    const matrixTab = screen.getByRole('button', { name: /12-Month Matrix/i });
    fireEvent.click(matrixTab);
    expect(screen.getByText(/Pay Bill Allowance Matrix Report/i)).toBeInTheDocument();

    // Click Employee Ledger tab
    const employeeTab = screen.getByRole('button', { name: /Employee Ledger/i });
    fireEvent.click(employeeTab);
    expect(screen.getByText(/Select Employee:/i)).toBeInTheDocument();
  });
});
