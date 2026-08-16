import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentEditor } from './ComponentEditor';
import { useAdminComponentSave } from '../hooks/useAdminComponents';
import type { AdminComponent } from '../types/components';

vi.mock('../hooks/useAdminComponents', () => ({
  useAdminComponentSave: vi.fn(),
}));

const mockSaveAsync = vi.fn().mockResolvedValue({ id: 'c1' } as never);

function setupSave(error: Error | null = null) {
  vi.mocked(useAdminComponentSave).mockReturnValue({
    saveComponentAsync: mockSaveAsync,
    isSaving: false,
    error,
  } as never);
}

function renderEditor(component: AdminComponent | null = null) {
  return render(
    <ComponentEditor open component={component} onClose={() => {}} onSaved={() => {}} />
  );
}

const editComponent: AdminComponent = {
  id: 'c1',
  component_code: '0111',
  component_name: 'Basic Pay',
  short_name: 'BASIC',
  type: 'EARNING',
  kind: 'COMPONENT',
  category: 'Allowance',
  sub_category: null,
  active: true,
  display_order: 5,
  is_mandatory: false,
  is_total_field: false,
  is_system_generated: false,
  validation_rule: null,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  aliases: [
    { id: 'a1', alias_text: 'Basic', alias_type: 'HEADER', created_at: '2026-01-01T00:00:00.000Z' },
    { id: 'a2', alias_text: '0101', alias_type: 'CODE', created_at: '2026-01-01T00:00:00.000Z' },
  ],
};

describe('ComponentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSave();
  });

  it('renders the add modal for a new component', () => {
    renderEditor();

    expect(screen.getByText('Add Payroll Component')).toBeInTheDocument();
  });

  it('requires a component name before saving', async () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Add Component' }));

    expect(await screen.findByText('Component name is required')).toBeInTheDocument();
    expect(mockSaveAsync).not.toHaveBeenCalled();
  });

  it('submits a full payload including typed aliases', async () => {
    renderEditor();

    fireEvent.change(screen.getByPlaceholderText('e.g. City Compensatory Allowance'), {
      target: { value: 'Basic Pay' },
    });

    const aliasInput = screen.getByPlaceholderText('e.g. CLA, City Comp Allow');
    fireEvent.change(aliasInput, { target: { value: 'CLA' } });
    fireEvent.keyDown(aliasInput, { key: 'Enter' });

    expect(screen.getByText('CLA')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Component' }));

    await waitFor(() =>
      expect(mockSaveAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: null,
          component_name: 'Basic Pay',
          active: true,
          is_total_field: false,
          aliases: [{ alias_text: 'CLA', alias_type: 'HEADER' }],
        })
      )
    );
  });

  it('prefills fields and aliases when editing, with a distinct title', () => {
    renderEditor(editComponent);

    expect(screen.getByText('Edit Component — Basic Pay')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Basic Pay')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0111')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('0101')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('surfaces save errors', () => {
    setupSave(new Error('save failed'));
    renderEditor();

    expect(screen.getByText(/save failed/)).toBeInTheDocument();
  });
});
