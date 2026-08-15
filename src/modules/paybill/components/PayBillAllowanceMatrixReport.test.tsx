import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PayBillAllowanceMatrixReport } from './PayBillAllowanceMatrixReport';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/supabase/client', () => {
  const queryBuilder: any = {
    eq: () => queryBuilder,
    order: () => queryBuilder,
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
  };

  return {
    supabase: {
      from: () => ({
        select: () => queryBuilder,
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

vi.mock('@/shared/utilities/office', () => ({
  getOfficeId: () => 'office-123',
}));

describe('PayBillAllowanceMatrixReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders report header, month columns, and allowance parameter rows', async () => {
    render(
      <MemoryRouter>
        <PayBillAllowanceMatrixReport financialYear={2026} />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Pay Bill Allowance Matrix Report/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Allowance Parameter/i)).toBeInTheDocument();

    // Check Quarter and Month column headers
    expect(screen.getByText('Apr')).toBeInTheDocument();
    expect(screen.getByText('Jul')).toBeInTheDocument();
    expect(screen.getByText('Q1 Total')).toBeInTheDocument();
    expect(screen.getByText('Q2 Total')).toBeInTheDocument();
    expect(screen.getByText('FY Total')).toBeInTheDocument();

    // Wait for rows to load
    await waitFor(() => {
      expect(screen.getByText('Basic Pay')).toBeInTheDocument();
      expect(screen.getByText('DA (0103)')).toBeInTheDocument();
      expect(screen.getByText('HRA (0110)')).toBeInTheDocument();
      expect(screen.getByText('Gross Amount')).toBeInTheDocument();
    });
  });
});
