import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminImportsPage } from './AdminImportsPage';
import { useImportHealth } from '../hooks/useAdmin';

vi.mock('../hooks/useAdmin', () => ({
  useImportHealth: vi.fn(),
}));

const healthRow = {
  office_id: '123',
  office_name: 'Alpha Office',
  fy: 2026,
  salary_imports: 2,
  paybill_imports: 1,
  salary_total_records: 50,
  salary_matched_count: 40,
  paybill_total_records: 30,
  paybill_matched_count: 25,
  mapping_issues: 1,
  name_mismatches: 2,
  validation_errors: 0,
  earnings_rows: 50,
  deduction_rows: 30,
  last_activity: '2026-07-01T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminImportsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('AdminImportsPage', () => {
  beforeEach(() => {
    vi.mocked(useImportHealth).mockReturnValue({
      data: [healthRow],
      isLoading: false,
      isError: false,
      error: null,
    } as never);
  });

  it('renders KPI cards and per-office health rows', () => {
    renderPage();

    expect(screen.getByText('Import Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Salary Imports')).toBeInTheDocument();
    expect(screen.getByText('Paybill Imports')).toBeInTheDocument();
    expect(screen.getByText('Mapping Issues')).toBeInTheDocument();
    expect(screen.getByText('Name Mismatches')).toBeInTheDocument();
    expect(screen.getByText('Validation Errors')).toBeInTheDocument();

    expect(screen.getByText('Alpha Office')).toBeInTheDocument();
    expect(screen.getByText('2026-27')).toBeInTheDocument();
    expect(screen.getByText(/matched 40\/50/)).toBeInTheDocument();
    expect(screen.getByText(/matched 25\/30/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no rows', () => {
    vi.mocked(useImportHealth).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByText('No import activity yet')).toBeInTheDocument();
  });

  it('shows an error banner when loading fails', () => {
    vi.mocked(useImportHealth).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as never);

    renderPage();

    expect(screen.getByText('Failed to load import health:')).toBeInTheDocument();
  });
});
