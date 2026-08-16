import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PayBillAllowanceMatrixReport } from './PayBillAllowanceMatrixReport';
import { MemoryRouter } from 'react-router-dom';

interface MockQueryBuilder {
  eq: () => MockQueryBuilder;
  order: () => MockQueryBuilder;
  then: (resolve: (value: { data: unknown[]; error: null }) => void) => Promise<{ data: unknown[]; error: null }>;
}

vi.mock('@/core/supabase/client', () => {
  const queryBuilder: MockQueryBuilder = {
    eq: () => queryBuilder,
    order: () => queryBuilder,
    then: (resolve) => Promise.resolve({ data: [], error: null }).then((value) => { resolve(value); return value; }),
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
  isAllOfficesMode: () => false,
}));

describe('PayBillAllowanceMatrixReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders report header, month dropdown, and grouped parameter columns (earning + deduction)', async () => {
    render(
      <MemoryRouter>
        <PayBillAllowanceMatrixReport financialYear={2026} />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Pay Bill Allowance Matrix Report/i)
    ).toBeInTheDocument();

    // Employee column on the left, month dropdown instead of employee dropdown
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/April/)).toBeInTheDocument();
    expect(screen.getAllByText(/Employee/i).length).toBeGreaterThan(0);

    // Group headers: Earning + Deduction portions on top
    expect(screen.getByText(/EARNING/)).toBeInTheDocument();
    expect(screen.getByText(/DEDUCTION/)).toBeInTheDocument();

    // Earning parameter columns
    expect(screen.getByText('Basic Pay')).toBeInTheDocument();
    expect(screen.getByText('DA')).toBeInTheDocument();
    expect(screen.getByText('HRA')).toBeInTheDocument();
    expect(screen.getByText('Gross Amt')).toBeInTheDocument();

    // Deduction parameter columns
    expect(screen.getByText('Income Tax')).toBeInTheDocument();
    expect(screen.getByText('Total Deductions')).toBeInTheDocument();
    expect(screen.getByText('Net Pay')).toBeInTheDocument();

    // Empty state once load completes
    await waitFor(() => {
      expect(screen.getByText(/No imported pay bill data available/)).toBeInTheDocument();
    });
  });
});
