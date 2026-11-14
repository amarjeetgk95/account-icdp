import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GRListPage } from './GRListPage';
import { useGRList } from '../hooks/useGRList';
import { useGRMetadata } from '../hooks/useGRMetadata';
import { useGRMutations } from '../hooks/useGRMutations';
import { DEFAULT_FILTER_STATE } from '../constants';
import type { GRRecord } from '../types';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: () => {
      throw new Error('Real Supabase client must not be used in tests');
    },
    rpc: () => {
      throw new Error('Real Supabase client must not be used in tests');
    },
    auth: {},
  },
}));

vi.mock('@/core/auth/store', () => ({
  useAuthStore: (selector?: (state: { user: unknown }) => unknown) => {
    const state = { user: { id: 'office-1', email: 'officer@icdp.gov.in', role: 'office' } };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../hooks/useGRList', () => ({ useGRList: vi.fn() }));
vi.mock('../hooks/useGRMetadata', () => ({
  useGRMetadata: vi.fn(),
  invalidateGRMetadata: vi.fn(),
}));
vi.mock('../hooks/useGRMutations', () => ({ useGRMutations: vi.fn() }));
vi.mock('../services/grAudit.service', () => ({
  grAuditService: { fetchAuditLogs: vi.fn().mockResolvedValue([]) },
  GRAuditService: class {},
}));

const sampleRecord: GRRecord = {
  id: 'test-gr-1',
  gr_number: 'GR/2026/001',
  title: 'DA Revision Rules Order',
  document_type_id: 'DOC-01',
  department_id: 'dept_fd',
  category_id: 'CAT-03',
  department_name: 'Finance Department',
  category_name: 'Pay, Allowances & Benefits',
  issue_date: '2026-07-15',
  description: 'Revised DA percentage guidelines',
  keywords: ['DA'],
  file_name: 'DA_Revision_2026.pdf',
  storage_path: 'gr/test-gr-1/DA_Revision_2026.pdf',
  file_size: 1048576,
  mime_type: 'application/pdf',
  visibility: 'public',
  status: 'active',
  created_by: 'office-1',
  created_at: '2026-07-15T00:00:00.000Z',
  updated_at: '2026-07-15T00:00:00.000Z',
  is_owner: true,
  can_manage: true,
  can_delete: true,
};

function mockListState(overrides: Record<string, unknown> = {}) {
  return {
    records: [sampleRecord],
    pagination: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
    filters: { ...DEFAULT_FILTER_STATE },
    isLoading: false,
    isFetching: false,
    error: null,
    setFilterField: vi.fn(),
    resetFilters: vi.fn(),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    refetch: vi.fn(),
    invalidateList: vi.fn(),
    ...overrides,
  };
}

describe('GRListPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    vi.mocked(useGRList).mockReturnValue(
      mockListState() as unknown as ReturnType<typeof useGRList>
    );
    vi.mocked(useGRMetadata).mockReturnValue({
      departments: [{ id: 'dept_fd', name: 'Finance Department', code: 'FD', description: null }],
      documentTypes: [
        { id: 'DOC-01', name_en: 'GR', name_gu: 'ઠરાવ', display_order: 1, is_active: true },
      ],
      categories: [
        { id: 'CAT-03', name_en: 'Pay & Allowances', name_gu: 'પગાર', display_order: 1, is_active: true },
      ],
      subcategories: [],
      getSubcategoriesForCategory: () => [],
      getDocumentTypeLabel: (id?: string | null) => (id === 'DOC-01' ? 'GR' : id || ''),
      isLoading: false,
    });
    vi.mocked(useGRMutations).mockReturnValue({
      createGR: vi.fn().mockResolvedValue(sampleRecord),
      isCreating: false,
      updateGR: vi.fn().mockResolvedValue(sampleRecord),
      isUpdating: false,
      replacePDF: vi.fn().mockResolvedValue(sampleRecord),
      isReplacingPDF: false,
      archiveGR: vi.fn().mockResolvedValue(sampleRecord),
      isArchiving: false,
      restoreGR: vi.fn().mockResolvedValue(sampleRecord),
      isRestoring: false,
      deleteGR: vi.fn().mockResolvedValue(undefined),
      isDeleting: false,
    } as unknown as ReturnType<typeof useGRMutations>);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <GRListPage />
      </QueryClientProvider>
    );

  it('renders page title and header controls', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /GR Repository/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add New GR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Taxonomy Settings/i })).toBeInTheDocument();
  });

  it('renders search bar, filters and reset control', () => {
    renderComponent();
    expect(
      screen.getByPlaceholderText(/Search by Document Number, Subject, Category or Keywords/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument();
  });

  it('renders records with document type labels', () => {
    renderComponent();
    expect(screen.getAllByText('GR/2026/001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DA Revision Rules Order').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Finance Department').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GR').length).toBeGreaterThan(0);
  });

  it('opens the Add GR form modal', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Add New GR/i }));

    expect(await screen.findByText(/Add New Government Resolution/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GR \/ Document Number/i)).toBeInTheDocument();
  });

  it('shows an error state with retry when the list query fails', () => {
    vi.mocked(useGRList).mockReturnValue(
      mockListState({ records: [], error: new Error('Connection refused') }) as unknown as ReturnType<
        typeof useGRList
      >
    );

    renderComponent();
    expect(screen.getByText(/Could not load the repository/i)).toBeInTheDocument();
    expect(screen.getByText(/Connection refused/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });
});
