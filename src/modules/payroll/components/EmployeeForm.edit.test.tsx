import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmployeeForm } from './EmployeeForm';
import type { EmployeeInput } from '../validation/employee.schema';

const { updateAsync, createAsync, EMPTY_EMPLOYEES } = vi.hoisted(() => {
  const updateAsync = vi.fn(async (input: unknown) => input);
  const createAsync = vi.fn(async (input: unknown) => input);
  const EMPTY_EMPLOYEES: never[] = [];
  return { updateAsync, createAsync, EMPTY_EMPLOYEES };
});

vi.mock('../hooks/useEmployees', () => ({
  useEmployees: () => ({
    employees: EMPTY_EMPLOYEES,
    isLoading: false,
    createAsync,
    updateAsync,
  }),
}));

vi.mock('../hooks/useBudgetHeads', () => ({
  useBudgetHeads: () => ({
    heads: [],
    isLoading: false,
  }),
}));

vi.mock('@/core/stores/ui-store', () => ({
  useUIStore: () => 2026,
}));

describe('EmployeeForm edit flow', () => {
  beforeEach(() => {
    updateAsync.mockClear();
    createAsync.mockClear();
  });

  it('passes the changed transfer date to updateAsync when editing (numeric bigint id)', async () => {
    const editingEmployee: EmployeeInput = {
      id: 3 as unknown as string,
      hprnNo: '100123',
      name: 'John Doe',
      pan: 'ABCDE1234F',
      joinDate: '2026-03-01',
      transferDate: '',
    };

    render(<EmployeeForm editingEmployee={editingEmployee} onCancel={() => {}} fy={2026} />);

    const transferInput = screen.getByLabelText('Transfer Date') as HTMLInputElement;
    fireEvent.change(transferInput, { target: { value: '2026-08-15' } });

    fireEvent.click(screen.getByRole('button', { name: /update employee/i }));

    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1));

    const arg = updateAsync.mock.calls[0][0] as EmployeeInput;
    expect(arg.id).toBe('3');
    expect(arg.transferDate).toBe('2026-08-15');
    expect(createAsync).not.toHaveBeenCalled();
  });

  it('keeps an existing transfer date when editing', async () => {
    const editingEmployee: EmployeeInput = {
      id: 3 as unknown as string,
      hprnNo: '100123',
      name: 'John Doe',
      pan: 'ABCDE1234F',
      joinDate: '2025-04-01',
      transferDate: '2026-03-31',
    };

    render(<EmployeeForm editingEmployee={editingEmployee} onCancel={() => {}} fy={2026} />);

    fireEvent.click(screen.getByRole('button', { name: /update employee/i }));

    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1));

    const arg = updateAsync.mock.calls[0][0] as EmployeeInput;
    expect(arg.transferDate).toBe('2026-03-31');
  });

  it('allows clearing the transfer date when editing', async () => {
    const editingEmployee: EmployeeInput = {
      id: 3 as unknown as string,
      hprnNo: '100123',
      name: 'John Doe',
      pan: 'ABCDE1234F',
      joinDate: '2025-04-01',
      transferDate: '2026-03-31',
    };

    render(<EmployeeForm editingEmployee={editingEmployee} onCancel={() => {}} fy={2026} />);

    const transferInput = screen.getByLabelText('Transfer Date') as HTMLInputElement;
    fireEvent.change(transferInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /update employee/i }));

    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1));

    const arg = updateAsync.mock.calls[0][0] as EmployeeInput;
    expect(arg.transferDate).toBe('');
  });
});

