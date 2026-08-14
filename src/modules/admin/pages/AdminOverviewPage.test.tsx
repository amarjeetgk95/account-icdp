import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminOverviewPage } from './AdminOverviewPage';

// Mock useAdmin hooks
vi.mock('../hooks/useAdmin', () => ({
  useSystemStats: () => ({
    data: {
      users: 10,
      admins: 2,
      suspended: 1,
      offices: 5,
      employees: 50,
      salaries: 200,
      parties: 30,
      transactions: 120,
      fy: 2024,
    },
    error: null,
    isLoading: false,
  }),
  useOfficeStats: () => ({
    data: [],
    error: null,
    isLoading: false,
  }),
  useEntryCompletion: () => ({
    data: [],
    error: null,
    isLoading: false,
  }),
  useDataEntryReport: () => ({
    data: [],
    error: null,
    isLoading: false,
  }),
}));

describe('AdminOverviewPage', () => {
  it('renders overview page with stat cards', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminOverviewPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });
});
