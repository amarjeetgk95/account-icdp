import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GRFormModal } from './GRFormModal';
import type { GRRecord } from '../types';

vi.mock('@/core/auth/store', () => ({
  useAuthStore: (selector?: (state: { user: unknown }) => unknown) => {
    const state = {
      user: { id: 'office-1', email: 'officer@icdp.gov.in', role: 'office' },
    };
    return selector ? selector(state) : state;
  },
}));

const metadata = {
  departments: [{ id: 'dept_ah', name: 'Animal Husbandry Department', code: 'AH', description: null }],
  documentTypes: [
    { id: 'DOC-01', name_en: 'GR', name_gu: 'ઠરાવ', display_order: 1, is_active: true },
  ],
  categories: [
    { id: 'CAT-01', name_en: 'General Administration', name_gu: 'સામાન્ય', display_order: 1, is_active: true },
  ],
  subcategories: [],
  getSubcategoriesForCategory: () => [],
  getDocumentTypeLabel: (id?: string | null) => (id ? `Label ${id}` : ''),
  isLoading: false,
};

vi.mock('../hooks/useGRMetadata', () => ({
  useGRMetadata: () => metadata,
  invalidateGRMetadata: vi.fn(),
}));

function createMockPdf(name = 'sample.pdf'): File {
  const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
  return new File([blob], name, { type: 'application/pdf' });
}

const editRecord: GRRecord = {
  id: 'gr-1',
  gr_number: 'GR/2026/001',
  title: 'Existing Resolution',
  document_type_id: 'DOC-01',
  department_id: 'dept_ah',
  category_id: 'CAT-01',
  subcategory_id: null,
  issue_date: '2026-01-15',
  description: 'Existing description',
  keywords: ['DBT'],
  file_name: 'existing.pdf',
  storage_path: 'gr/gr-1/existing.pdf',
  file_size: 1024,
  mime_type: 'application/pdf',
  visibility: 'private',
  status: 'active',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-01-15T00:00:00.000Z',
};

describe('GRFormModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  const renderModal = (props: Partial<React.ComponentProps<typeof GRFormModal>> = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onSubmit: vi.fn().mockResolvedValue(undefined),
      mode: 'add' as const,
      isSubmitting: false,
      ...props,
    };
    return render(
      <QueryClientProvider client={queryClient}>
        <GRFormModal {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it('renders form with required inputs in add mode', () => {
    renderModal();
    expect(screen.getByText(/Add New Government Resolution/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GR \/ Document Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject \/ Title/i)).toBeInTheDocument();
  });

  it('validates required fields on empty submit', async () => {
    const onSubmit = vi.fn();
    renderModal({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: /Upload & Create GR/i }));

    await waitFor(() => {
      expect(screen.getByText(/GR Number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Title \/ Subject is required/i)).toBeInTheDocument();
      expect(screen.getByText(/A PDF document is required/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a payload without ownership/assignment fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderModal({ onSubmit, onClose });

    fireEvent.change(screen.getByLabelText(/GR \/ Document Number/i), {
      target: { value: 'GR/2026/099' },
    });
    fireEvent.change(screen.getByLabelText(/Subject \/ Title/i), {
      target: { value: 'New Resolution' },
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [createMockPdf('new.pdf')] } });

    expect(await screen.findByText('new.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Upload & Create GR/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.gr_number).toBe('GR/2026/099');
    expect(payload.title).toBe('New Resolution');
    expect(payload.visibility).toBe('public');
    expect(payload.category_id).toBe('CAT-01');
    expect(payload.file).toBeInstanceOf(File);
    expect(payload).not.toHaveProperty('owner_user_id');
    expect(payload).not.toHaveProperty('assigned_user_ids');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open and shows the error when submit fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Server exploded'));
    const onClose = vi.fn();
    renderModal({ onSubmit, onClose });

    fireEvent.change(screen.getByLabelText(/GR \/ Document Number/i), {
      target: { value: 'GR/2026/100' },
    });
    fireEvent.change(screen.getByLabelText(/Subject \/ Title/i), {
      target: { value: 'Failing Resolution' },
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [createMockPdf('fail.pdf')] } });

    expect(await screen.findByText('fail.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Upload & Create GR/i }));

    expect(await screen.findByText(/Server exploded/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('prefills and resets state across open cycles', async () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <GRFormModal
          isOpen
          onClose={vi.fn()}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          mode="edit"
          initialData={editRecord}
        />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/GR \/ Document Number/i)).toHaveValue('GR/2026/001');
    expect(screen.getByLabelText(/Subject \/ Title/i)).toHaveValue('Existing Resolution');

    rerender(
      <QueryClientProvider client={queryClient}>
        <GRFormModal
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          mode="edit"
          initialData={editRecord}
        />
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <GRFormModal
          isOpen
          onClose={vi.fn()}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          mode="add"
        />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/GR \/ Document Number/i)).toHaveValue('');
  });
});
