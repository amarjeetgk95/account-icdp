import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinancialYearSettingsCard } from './FinancialYearSettingsCard';
import { useUIStore } from '@/core/stores/ui-store';

describe('FinancialYearSettingsCard', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeFinancialYear: 2024,
      theme: 'light',
    });
  });

  it('renders current active financial year and status', () => {
    render(<FinancialYearSettingsCard />);

    expect(screen.getByText('Active Financial Year & Accounting Scope')).toBeInTheDocument();
    expect(screen.getByText(/Active: FY 2024-25/i)).toBeInTheDocument();
    expect(screen.getByText(/Currently Applied/i)).toBeInTheDocument();
  });

  it('allows selecting and applying a different financial year', () => {
    render(<FinancialYearSettingsCard />);

    const select = screen.getByLabelText(/Select Operational Financial Year/i);
    fireEvent.change(select, { target: { value: '2025' } });

    const applyButton = screen.getByRole('button', { name: /Apply Financial Year/i });
    expect(applyButton).toBeEnabled();

    fireEvent.click(applyButton);

    // Verifies store was updated
    expect(useUIStore.getState().activeFinancialYear).toBe(2025);

    // Verifies success alert appears
    expect(screen.getByText(/Active financial year updated to FY 2025-26/i)).toBeInTheDocument();
  });
});
