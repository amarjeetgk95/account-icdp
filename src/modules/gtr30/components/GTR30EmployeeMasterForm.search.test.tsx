import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GTR30EmployeeMasterForm } from './GTR30EmployeeMasterForm';
import type { GTR30EmployeeMaster } from '../types';
import { gtr30EmployeeMasterService } from '../services/gtr30EmployeeMaster.service';
import { gtr30BillCodeMappingsService } from '../services/gtr30BillCodeMappings.service';

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

const EXISTING: GTR30EmployeeMaster[] = [
  {
    id: 'e1',
    srNo: 1,
    hrpnNo: '200200',
    name: 'Shri R.B.Makvana',
    designation: 'Director',
    payScale: 'PB-1',
    currentPay: 25000,
    currentPayDate: '2026-07-01',
    hraPercent: 24,
    transportAllowance: 1000,
    medicalAllowance: 500,
    claAllowance: 200,
  },
];

function renderForm(employees: GTR30EmployeeMaster[] = []) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Harness() {
    const [editing, setEditing] = useState<GTR30EmployeeMaster | null>(null);
    return (
      <QueryClientProvider client={queryClient}>
        <GTR30EmployeeMasterForm
          monthKey="July-2026"
          billCode="GTR30-SAL"
          employees={employees}
          editingEmployee={editing}
          onCancelEdit={() => setEditing(null)}
        />
      </QueryClientProvider>
    );
  }
  return render(<Harness />);
}

describe('GTR30EmployeeMasterForm name-search dropdown', () => {
  beforeEach(() => {
    localStorage.clear();
    gtr30BillCodeMappingsService.saveMapping({
      id: 'm1',
      billCode: 'GTR30-SAL',
      description: 'Salary',
    });
  });

  it('prefills from the payroll directory when a directory row is selected', async () => {
    renderForm();
    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'joh' } });

    const result = await screen.findByRole('button', { name: /John Doe/ });
    fireEvent.click(result);

    expect((screen.getByLabelText(/Employee Name/) as HTMLInputElement).value).toBe('John Doe');
    expect((screen.getByLabelText('HRPN No.') as HTMLInputElement).value).toBe('100123');
    expect((screen.getByLabelText('Designation') as HTMLInputElement).value).toBe('Research Assistant');
    expect((screen.getByLabelText('Pay Scale') as HTMLInputElement).value).toBe('34,500-1,12,400');
    expect((screen.getByLabelText('Current Pay (₹)') as HTMLInputElement).value).toBe('0');
  });

  it('loads the full master record when an existing master row is selected', async () => {
    renderForm(EXISTING);
    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'makvana' } });

    const result = await screen.findByRole('button', { name: /Shri R.B.Makvana/ });
    fireEvent.click(result);

    expect((screen.getByLabelText(/Employee Name/) as HTMLInputElement).value).toBe('Shri R.B.Makvana');
    expect((screen.getByLabelText('HRPN No.') as HTMLInputElement).value).toBe('200200');
    expect((screen.getByLabelText('Current Pay (₹)') as HTMLInputElement).value).toBe('25000');
    expect((screen.getByLabelText('HRA %') as HTMLInputElement).value).toBe('24');
    expect(screen.getByRole('button', { name: /Add Employee/i })).toBeTruthy();
  });

  it('saves a new employee and persists it in the service', async () => {
    renderForm();
    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Shri New Employee' } });
    fireEvent.change(screen.getByLabelText('HRPN No.'), { target: { value: '300300' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Employee/i }));

    await waitFor(() => {
      const group = gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL');
      expect(group).toHaveLength(1);
      expect(group[0].name).toBe('Shri New Employee');
      expect(group[0].hrpnNo).toBe('300300');
    });

    await waitFor(() =>
      expect((screen.getByLabelText(/Employee Name/) as HTMLInputElement).value).toBe('')
    );
  });

  it('shows field-level validation errors on invalid submission', async () => {
    renderForm();
    const nameInput = screen.getByLabelText(/Employee Name/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Employee/i }));

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeTruthy();
    });
    expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL')).toHaveLength(0);
  });
});
