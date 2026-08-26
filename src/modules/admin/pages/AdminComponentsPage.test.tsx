import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminComponentsPage } from './AdminComponentsPage';
import { useAdminComponents } from '../hooks/useAdminComponents';

const component = {
  id: 'c1',
  component_code: 'CLA',
  component_name: 'City Comp Allowance',
  short_name: 'CLA',
  type: 'EARNING' as const,
  kind: 'COMPONENT' as const,
  category: 'Allowance',
  display_order: 10,
  is_mandatory: false,
  active: true,
  notes: null,
  aliases: [{ id: 'a1', alias_text: 'Comp Allow', alias_type: 'HEADER' as const }],
};

vi.mock('../hooks/useAdminComponents', () => ({
  useAdminComponents: vi.fn(),
  useAdminComponentSetActive: vi.fn(),
  useAdminComponentDelete: vi.fn(),
  useAdminComponentSave: vi.fn(() => ({
    saveComponentAsync: vi.fn().mockResolvedValue({}),
    isSaving: false,
    error: null,
  })),
}));

const mockSetActiveAsync = vi.fn().mockResolvedValue(undefined);
const mockDeleteAsync = vi.fn().mockResolvedValue({ deleted: true });

import { useAdminComponentSetActive, useAdminComponentDelete } from '../hooks/useAdminComponents';

function setupMocks() {
  vi.mocked(useAdminComponents).mockReturnValue({
    data: [component],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useAdminComponentSetActive).mockReturnValue({
    setActiveAsync: mockSetActiveAsync,
    isSettingActive: false,
    error: null,
  } as never);
  vi.mocked(useAdminComponentDelete).mockReturnValue({
    deleteComponentAsync: mockDeleteAsync,
    isDeleting: false,
    error: null,
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminComponentsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('AdminComponentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the component rows with code, name and status', () => {
    renderPage();

    expect(screen.getByText('Component Master')).toBeInTheDocument();
    expect(screen.getAllByText('CLA').length).toBeGreaterThan(0);
    expect(screen.getByText('City Comp Allowance')).toBeInTheDocument();
    expect(screen.getByText('EARNING')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('Comp Allow')).toBeInTheDocument();
  });

  it('opens the editor prefilled when editing a component', () => {
    renderPage();

    fireEvent.click(screen.getByTitle('Edit component'));

    expect(screen.getByText('Edit Component — City Comp Allowance')).toBeInTheDocument();
    expect(screen.getByDisplayValue('City Comp Allowance')).toBeInTheDocument();
  });

  it('calls setActiveAsync when toggling a component', async () => {
    renderPage();

    fireEvent.click(screen.getByTitle('Deactivate'));

    await waitFor(() => expect(mockSetActiveAsync).toHaveBeenCalledWith({ componentId: 'c1', active: false }));
  });

  it('confirms before deleting and calls deleteComponentAsync', async () => {
    renderPage();

    fireEvent.click(screen.getByTitle('Delete component'));

    expect(screen.getByRole('heading', { name: 'Delete Component?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockDeleteAsync).toHaveBeenCalledWith('c1'));
  });

  it('shows an empty state when there are no components', () => {
    vi.mocked(useAdminComponents).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderPage();

    expect(screen.getByText('No components found')).toBeInTheDocument();
  });
});
