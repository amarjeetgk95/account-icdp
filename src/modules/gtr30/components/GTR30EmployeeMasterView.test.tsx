import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GTR30EmployeeMasterView } from './GTR30EmployeeMasterView';
import { gtr30EmployeeMasterService } from '../services/gtr30EmployeeMaster.service';
import { gtr30BillCodeMappingsService } from '../services/gtr30BillCodeMappings.service';

vi.mock('@/core/stores/ui-store', () => ({
  useUIStore: () => 2026,
}));

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <GTR30EmployeeMasterView />
      </QueryClientProvider>
    </MemoryRouter>
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
    gtr30BillCodeMappingsService.saveMapping({
      id: 'm2',
      billCode: 'GTR30-DA',
      description: 'DA Arrears',
    });
  });

  it('shows the empty state when no employees are saved for the selected group', () => {
    renderView();
    expect(screen.getByText(/No employees saved for/i)).toBeTruthy();
  });

  it('submitting the form adds the employee to the list and persists it', async () => {
    renderView();
    addEmployeeWithName('Shri R.B.Makvana');

    await waitFor(() => {
      expect(group()).toHaveLength(1);
      expect(group()[0].name).toBe('Shri R.B.Makvana');
      expect(screen.getByText('Shri R.B.Makvana')).toBeTruthy();
    });
  });

  it('saved employees still appear after the page reloads (remount)', async () => {
    await gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
      id: 'e1',
      srNo: 1,
      name: 'Shri R.B.Makvana',
      designation: 'Research Assistant',
      payScale: '34,500-1,12,400',
      currentPay: 39900,
      currentPayDate: '2026-07-01',
      hraPercent: 9,
      transportAllowance: 3600,
      medicalAllowance: 1000,
      claAllowance: 270,
    });

    renderView();
    expect(screen.getByText('Shri R.B.Makvana')).toBeTruthy();
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
});
