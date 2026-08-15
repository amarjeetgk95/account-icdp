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

// Mock dependencies
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

  it('renders initial upload dropzone and sample load button', () => {
    render(
      <MemoryRouter>
        <PayBillImportPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Pay Bill PDF Import/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Sample Pay Bill PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/OCR \/ Text Paste Fallback/i)).toBeInTheDocument();
  });

  it('loads and parses sample PDF data on sample button click', async () => {
    render(
      <MemoryRouter>
        <PayBillImportPage />
      </MemoryRouter>
    );

    const sampleBtn = screen.getByText(/Load Sample Pay Bill PDF/i);
    fireEvent.click(sampleBtn);

    // Wait for the stages and ready state
    await waitFor(
      () => {
        expect(screen.getByText(/Pay Bill Inner Sheet Details/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Check Header Metadata
    expect(screen.getByText(/July-2026/i)).toBeInTheDocument();
    expect(screen.getByText(/2403/i)).toBeInTheDocument(); // Major Head
    expect(screen.getByText(/SRTD00979G/i)).toBeInTheDocument(); // TAN

    // Check HRPN Keys
    expect(screen.getByText('20013826')).toBeInTheDocument();
    expect(screen.getByText('20014113')).toBeInTheDocument();
    expect(screen.getByText('20014151')).toBeInTheDocument();
    expect(screen.getByText('20014153')).toBeInTheDocument();

    // Check Gross amounts
    expect(screen.getByText('₹2,28,118')).toBeInTheDocument();
    expect(screen.getByText('₹2,53,494')).toBeInTheDocument();
    expect(screen.getByText('₹2,40,200')).toBeInTheDocument();
    expect(screen.getByText('₹1,70,502')).toBeInTheDocument();

    // Check Reconciliation
    expect(screen.getByText(/Total Reconciliation Status:/i)).toBeInTheDocument();
    expect(screen.getAllByText('MATCHED').length).toBeGreaterThan(0);
  });
});
