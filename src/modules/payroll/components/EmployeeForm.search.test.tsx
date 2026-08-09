import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmployeeForm } from './EmployeeForm';
import type { EmployeeInput } from '../validation/employee.schema';

const { updateAsync, createAsync, EMPLOYEES } = vi.hoisted(() => {
  const updateAsync = vi.fn(async (input: unknown) => input);
  const createAsync = vi.fn(async (input: unknown) => input);
  const EMPLOYEES = [
    {
      id: 3,
      hprn_no: '100123',
      name: 'John Doe',
      pan: 'ABCDE1234F',
      join_date: '2026-03-01',
      transfer_date: '2026-08-15',
    },
  ];
  return { updateAsync, createAsync, EMPLOYEES };
});

vi.mock('../hooks/useEmployees', () => ({
  useEmployees: () => ({
    employees: EMPLOYEES,
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

function Harness() {
  const [editing, setEditing] = useState<EmployeeInput | null>(null);
  return (
    <EmployeeForm editingEmployee={editing} onCancel={() => setEditing(null)} onSelect={setEditing} fy={2026} />
  );
}

describe('EmployeeForm name-search dropdown', () => {
  beforeEach(() => {
    updateAsync.mockClear();
    createAsync.mockClear();
  });

  it('loads the full existing record when a search result is selected', async () => {
    render(<Harness />);

    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'joh' } });

    const result = await screen.findByRole('button', { name: /John Doe/ });
    fireEvent.click(result);

    await waitFor(() => expect((screen.getByLabelText(/PAN Number/) as HTMLInputElement).value).toBe('ABCDE1234F'));

    expect((screen.getByLabelText(/Employee Name/) as HTMLInputElement).value).toBe('John Doe');
    expect((screen.getByLabelText('Join Date') as HTMLInputElement).value).toBe('2026-03-01');
    expect((screen.getByLabelText('Transfer Date') as HTMLInputElement).value).toBe('2026-08-15');
    expect(screen.getByRole('button', { name: /update employee/i })).toBeTruthy();
  });

  it('routes save to updateAsync (not create) with the id and unchanged join date preserved', async () => {
    render(<Harness />);

    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'joh' } });

    const result = await screen.findByRole('button', { name: /John Doe/ });
    fireEvent.click(result);

    await waitFor(() => expect((screen.getByLabelText(/PAN Number/) as HTMLInputElement).value).toBe('ABCDE1234F'));

    const transferInput = screen.getByLabelText('Transfer Date') as HTMLInputElement;
    fireEvent.change(transferInput, { target: { value: '2026-12-31' } });

    fireEvent.click(screen.getByRole('button', { name: /update employee/i }));

    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1));

    const arg = updateAsync.mock.calls[0][0] as EmployeeInput;
    expect(arg.id).toBe('3');
    expect(arg.name).toBe('John Doe');
    expect(arg.joinDate).toBe('2026-03-01');
    expect(arg.transferDate).toBe('2026-12-31');
    expect(createAsync).not.toHaveBeenCalled();
  });
});
