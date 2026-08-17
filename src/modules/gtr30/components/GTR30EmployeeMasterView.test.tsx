import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GTR30EmployeeMasterView } from './GTR30EmployeeMasterView';
import { gtr30EmployeeMasterService } from '../services/gtr30EmployeeMaster.service';
import { gtr30BillCodeMappingsService } from '../services/gtr30BillCodeMappings.service';

vi.mock('@/core/stores/ui-store', () => ({
  useUIStore: () => 2026,
}));

vi.mock('@/modules/payroll/hooks/useEmployees', () => ({
  useEmployees: () => ({
    employees: [
      {
        id: 1,
        name: 'John Doe',
        pan: 'ABCDE1234F',
        hprn_no: '100123',
        designation: 'Research Assistant',
        pay_scale: '34,500-1,12,400',
      },
    ],
    isLoading: false,
  }),
}));

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <GTR30EmployeeMasterView />
    </QueryClientProvider>
  );
  return { ...view, queryClient };
}

function group() {
  return gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL');
}

function addEmployeeWithName(name: string) {
  const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
  fireEvent.change(nameInput, { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: /Add Employee/i }));
  return nameInput;
}

describe('GTR30EmployeeMasterView', () => {
  beforeEach(() => {
    localStorage.clear();
    gtr30BillCodeMappingsService.saveMapping({
      id: 'm1',
      billCode: 'GTR30-SAL',
      description: 'Salary',
    });
  });

  it('shows the empty state when no employees are saved for the selected group', () => {
    renderView();
    expect(screen.getByText(/No employees saved for/i)).toBeTruthy();
    expect(screen.getByText('All changes saved')).toBeTruthy();
  });

  it('submitting the form adds the employee to the list and persists it', async () => {
    renderView();
    addEmployeeWithName('Shri R.B.Makvana');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Employee/i })).toBeTruthy();
      expect(screen.getByText('Shri R.B.Makvana')).toBeTruthy();
    });

    const saved = group();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Shri R.B.Makvana');
  });

  it('saved employees still appear after the page reloads (remount)', async () => {
    const first = renderView();
    addEmployeeWithName('Shri R.B.Makvana');

    await waitFor(() => expect(group()).toHaveLength(1));
    first.unmount();

    renderView();
    expect(screen.getByText('Shri R.B.Makvana')).toBeTruthy();
  });

  it('prefills the form from the payroll employee directory search', async () => {
    renderView();
    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'joh' } });

    const result = await screen.findByRole('button', { name: /John Doe/ });
    fireEvent.click(result);

    expect((screen.getByLabelText(/Employee Name/) as HTMLInputElement).value).toBe('John Doe');
    expect((screen.getByLabelText('HRPN No.') as HTMLInputElement).value).toBe('100123');
    expect((screen.getByLabelText('Designation') as HTMLInputElement).value).toBe('Research Assistant');
    expect((screen.getByLabelText('Pay Scale') as HTMLInputElement).value).toBe('34,500-1,12,400');
  });

  it('loads an existing row into the form when Edit is clicked and persists changes', async () => {
    renderView();
    addEmployeeWithName('Shri R.B.Makvana');
    await waitFor(() => expect(screen.getByText('Shri R.B.Makvana')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Edit employee'));

    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    await waitFor(() => expect(nameInput.value).toBe('Shri R.B.Makvana'));
    expect(screen.getByRole('button', { name: /Update Employee/i })).toBeTruthy();

    fireEvent.change(nameInput, { target: { value: 'Shri R.B.Makvana Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Employee/i }));

    await waitFor(() => {
      expect(group()[0].name).toBe('Shri R.B.Makvana Updated');
      expect(screen.getByText('Shri R.B.Makvana Updated')).toBeTruthy();
    });
  });

  it('removes an employee after confirming the delete dialog', async () => {
    renderView();
    addEmployeeWithName('Shri R.B.Makvana');
    await waitFor(() => expect(screen.getByText('Shri R.B.Makvana')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Delete employee'));

    const confirm = await screen.findByRole('button', { name: /Yes, Remove Employee/i });
    fireEvent.click(confirm);

    await waitFor(() => expect(group()).toHaveLength(0));
    expect(screen.getByText(/No employees saved for/i)).toBeTruthy();
  });

  it('rejects an invalid submission and shows a validation error', async () => {
    renderView();
    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Employee/i }));

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeTruthy();
    });
    expect(group()).toHaveLength(0);
  });

  it('bulk-imports payroll directory employees with default salary fields', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /Import from Employee Directory/i }));

    await waitFor(() => {
      const saved = group();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('John Doe');
      expect(saved[0].hrpnNo).toBe('100123');
      expect(saved[0].designation).toBe('Research Assistant');
      expect(saved[0].payScale).toBe('34,500-1,12,400');
      expect(saved[0].currentPay).toBe(0);
    });

    expect(screen.getByText('John Doe')).toBeTruthy();
  });

  it('does not import duplicates when the directory employee already exists', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /Import from Employee Directory/i }));
    await waitFor(() => expect(group()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: /Import from Employee Directory/i }));
    await waitFor(() => expect(group()).toHaveLength(1));
  });
});
