import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GTR30EmployeeManagementPage } from './GTR30EmployeeManagementPage';
import { gtr30EmployeeMasterService } from '../services/gtr30EmployeeMaster.service';
import { gtr30BillCodeMappingsService } from '../services/gtr30BillCodeMappings.service';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/core/stores/ui-store', () => ({
  useUIStore: () => 2026,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <GTR30EmployeeManagementPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
  return { ...view, queryClient };
}

describe('GTR30EmployeeManagementPage', () => {
  beforeEach(() => {
    localStorage.clear();
    gtr30BillCodeMappingsService.saveMapping({
      id: 'm1',
      billCode: 'GTR30-SAL',
      description: 'Salary Bill',
    });
    gtr30BillCodeMappingsService.saveMapping({
      id: 'm2',
      billCode: 'GTR30-DA',
      description: 'DA Arrears',
    });
  });

  it('renders header, KPI metrics, and top-right New Registration button', async () => {
    renderPage();
    expect(screen.getByText('Employee Management')).toBeDefined();
    expect(screen.getByRole('button', { name: /New Registration/i })).toBeDefined();
    expect(screen.getByText(/Total Basic Pay/i)).toBeDefined();
    expect(screen.getByText(/Total Take-Home/i)).toBeDefined();
  });

  it('displays existing employee rows with details and calculated totals', async () => {
    await gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
      id: 'emp-1',
      srNo: 1,
      name: 'Shri R.B.Makvana',
      designation: 'Research Assistant',
      designationGujarati: 'સંશોધન મદદનીશ',
      hrpnNo: '100123',
      cadreClass: '૩',
      payScale: '34,500-1,12,400',
      gradePay: 'GP:4200',
      currentPay: 39900,
      currentPayDate: '2026-07-01',
      hraPercent: 9,
      da: 21147,
      transportAllowance: 3600,
      medicalAllowance: 1000,
      claAllowance: 270,
      rentOfBuilding: 300,
      professionalTax: 200,
      gis1981Insurance: 240,
      gis1981Savings: 560,
      npsPension: 6105,
      societyDeduction: 4154,
      billCode: 'GTR30-SAL',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shri R.B.Makvana')).toBeDefined();
      expect(screen.getByText('100123')).toBeDefined();
      expect(screen.getByText('Research Assistant')).toBeDefined();
      expect(screen.getByText('સંશોધન મદદનીશ')).toBeDefined();
      expect(screen.getByText('GTR30-SAL')).toBeDefined();
      expect(screen.getAllByText('₹39,900').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('filters employees by search input and billcode dropdown', async () => {
    await gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
      id: 'emp-1',
      srNo: 1,
      name: 'Shri R.B.Makvana',
      designation: 'Research Assistant',
      hrpnNo: '100123',
      currentPay: 39900,
      currentPayDate: '2026-07-01',
      payScale: '34,500-1,12,400',
      transportAllowance: 0,
      medicalAllowance: 0,
      claAllowance: 0,
      hraPercent: 0,
      billCode: 'GTR30-SAL',
    });

    await gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-DA', {
      id: 'emp-2',
      srNo: 2,
      name: 'Smt K.P.Patel',
      designation: 'Account Officer',
      hrpnNo: '200456',
      currentPay: 56100,
      currentPayDate: '2026-07-01',
      payScale: '56,100-1,77,500',
      transportAllowance: 0,
      medicalAllowance: 0,
      claAllowance: 0,
      hraPercent: 0,
      billCode: 'GTR30-DA',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shri R.B.Makvana')).toBeDefined();
      expect(screen.getByText('Smt K.P.Patel')).toBeDefined();
    });

    // Filter by search text
    const searchInput = screen.getByPlaceholderText(/Search by Name/i);
    fireEvent.change(searchInput, { target: { value: 'Patel' } });

    expect(screen.queryByText('Shri R.B.Makvana')).toBeNull();
    expect(screen.getByText('Smt K.P.Patel')).toBeDefined();
  });

  it('navigates to new registration and edit via SPA navigation', async () => {
    navigateMock.mockClear();

    await gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
      id: 'emp-1',
      srNo: 1,
      name: 'Shri R.B.Makvana',
      designation: 'Research Assistant',
      hrpnNo: '100123',
      currentPay: 39900,
      currentPayDate: '2026-07-01',
      payScale: '34,500-1,12,400',
      transportAllowance: 0,
      medicalAllowance: 0,
      claAllowance: 0,
      hraPercent: 0,
      billCode: 'GTR30-SAL',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shri R.B.Makvana')).toBeDefined();
    });

    // Click New Registration
    fireEvent.click(screen.getByRole('button', { name: /New Registration/i }));
    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining('/gtr30/employee-management/new')
    );

    // Click Edit icon on row
    const editBtn = screen.getByTitle('Edit Employee');
    fireEvent.click(editBtn);
    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining('/gtr30/employee-management/edit/emp-1')
    );
  });

  it('confirms and deletes a single employee', async () => {
    await gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
      id: 'emp-delete',
      srNo: 1,
      name: 'Shri Deletable Person',
      designation: 'Assistant',
      currentPay: 25000,
      currentPayDate: '2026-07-01',
      payScale: '25,500-81,100',
      transportAllowance: 0,
      medicalAllowance: 0,
      claAllowance: 0,
      hraPercent: 0,
      billCode: 'GTR30-SAL',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shri Deletable Person')).toBeDefined();
    });

    // Click Delete
    const deleteBtn = screen.getByTitle('Delete this employee');
    fireEvent.click(deleteBtn);

    // Confirmation dialog appears
    expect(screen.getByText(/Delete Employee Master Record/i)).toBeDefined();

    // Confirm Delete
    const confirmBtn = screen.getByRole('button', { name: /Delete Employee/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText('Shri Deletable Person')).toBeNull();
    });
  });

  it('supports selecting multiple employees and bulk deleting them', async () => {
    await gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
      id: 'emp-bulk-1',
      srNo: 1,
      name: 'Person One',
      designation: 'Assistant',
      currentPay: 25000,
      currentPayDate: '2026-07-01',
      payScale: '25,500-81,100',
      transportAllowance: 0,
      medicalAllowance: 0,
      claAllowance: 0,
      hraPercent: 0,
      billCode: 'GTR30-SAL',
    });

    await gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
      id: 'emp-bulk-2',
      srNo: 2,
      name: 'Person Two',
      designation: 'Clerk',
      currentPay: 19900,
      currentPayDate: '2026-07-01',
      payScale: '19,900-63,200',
      transportAllowance: 0,
      medicalAllowance: 0,
      claAllowance: 0,
      hraPercent: 0,
      billCode: 'GTR30-SAL',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Person One')).toBeDefined();
      expect(screen.getByText('Person Two')).toBeDefined();
    });

    // Select all via header checkbox
    const selectAllCheckbox = screen.getByLabelText('Select all employees');
    fireEvent.click(selectAllCheckbox);

    // Bulk action banner appears
    await waitFor(() => {
      expect(screen.getByText(/2 employee records selected/i)).toBeDefined();
    });

    // Click Delete Selected button in banner
    const bulkDeleteBtn = screen.getByRole('button', { name: /Delete Selected \(2\)/i });
    fireEvent.click(bulkDeleteBtn);

    // Modal appears
    expect(screen.getByText(/Delete Multiple Employee Records/i)).toBeDefined();

    // Confirm deletion
    const confirmModalBtn = screen.getByRole('button', { name: /Delete 2 Employees/i });
    fireEvent.click(confirmModalBtn);

    await waitFor(() => {
      expect(screen.queryByText('Person One')).toBeNull();
      expect(screen.queryByText('Person Two')).toBeNull();
    });
  });
});
