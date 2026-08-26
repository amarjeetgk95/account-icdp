import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminSettingsPage } from './AdminSettingsPage';
import { useOffices, useOfficeConfig, useSetOfficeFy } from '../hooks/useAdmin';

vi.mock('../hooks/useAdmin', () => ({
  useOffices: vi.fn(),
  useOfficeConfig: vi.fn(),
  useSetOfficeFy: vi.fn(),
}));

const offices = [{ id: '1', name: 'Alpha', district: 'X', users: 2, current_fy: 2025 }];

const config = {
  office_id: '1',
  office_name: 'Alpha',
  district: 'X',
  fy: 2025,
  current_fy: 2025,
  users: 2,
  employees: 10,
  financial_years: [2025, 2026],
};

const mockSetFyAsync = vi.fn().mockResolvedValue('Financial year updated');

function setupMocks() {
  vi.mocked(useOffices).mockReturnValue({ data: offices, isLoading: false, error: null } as never);
  vi.mocked(useOfficeConfig).mockReturnValue({ data: config, isLoading: false, error: null } as never);
  vi.mocked(useSetOfficeFy).mockReturnValue({ mutateAsync: mockSetFyAsync, isPending: false, error: null } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminSettingsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('prompts to choose an office when none is selected', () => {
    renderPage();

    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('Choose an office to manage')).toBeInTheDocument();
  });

  it('shows the office config once an office is selected', () => {
    renderPage();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '1' } });

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getAllByText('2025-26').length).toBeGreaterThan(0);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Override' })).toBeInTheDocument();
  });

  it('submits the financial year override for the selected office', async () => {
    renderPage();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '1' } });

    const fySelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(fySelect, { target: { value: '2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Override' }));

    await waitFor(() => expect(mockSetFyAsync).toHaveBeenCalledWith({ officeId: '1', fy: 2026 }));
  });
});
