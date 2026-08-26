import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { EmployeeLedgerView } from './EmployeeLedgerView';
import { EmployeeDirectoryPanel } from './EmployeeDirectoryPanel';
import { paybillRepository } from '../../repositories/paybill.repository';
import type { PaybillDirectoryEntry } from '../../hooks/useEmployeeDirectory';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../../types';

vi.mock('../../repositories/paybill.repository', () => ({
  paybillRepository: {
    listEarnings: vi.fn(),
    listDeductions: vi.fn(),
    getSettings: vi.fn(),
    getManualLedgerValues: vi.fn(),
    getAllowanceMatrix: vi.fn(),
  },
}));

vi.mock('@/shared/utilities/office', () => ({
  getOfficeId: () => 'office-123',
  isAllOfficesMode: () => false,
  resolveOfficeIdForUser: () => Promise.resolve('office-123'),
}));

vi.mock('@/modules/establishment/services/establishment.service', () => ({
  establishmentService: {
    syncEmployees: vi.fn(async () => []),
    loadEmployees: vi.fn(() => []),
  },
}));

const FINANCIAL_YEAR = 2026;

const makeEarning = (overrides: Partial<PayBillStoredEarning> = {}): PayBillStoredEarning => ({
  id: 'earn-1',
  importId: 'imp-1',
  officeId: 'office-123',
  employeeId: 'emp-1',
  hrpn: '20014113',
  employeeName: 'Dr. Ramesh Patel',
  designation: 'Veterinary Officer',
  payScale: 'Level 10',
  ph: null,
  slo: null,
  month: 'April',
  financialYear: FINANCIAL_YEAR,
  basicPay: 56100,
  da: 28050,
  hra: 5610,
  cla: 240,
  medicalAllowance: 1000,
  transportAllowance: 3600,
  specialPay: 0,
  washingAllowance: 100,
  nppAllowance: 0,
  grossAmount: 94700,
  mappingStatus: 'MATCHED',
  createdAt: new Date('2026-04-02T00:00:00Z').toISOString(),
  ...overrides,
});

const makeDeduction = (overrides: Partial<PayBillStoredDeduction> = {}): PayBillStoredDeduction => ({
  id: 'ded-1',
  importId: 'imp-1',
  officeId: 'office-123',
  employeeId: 'emp-1',
  hrpn: '20014113',
  employeeName: 'Dr. Ramesh Patel',
  designation: 'Veterinary Officer',
  month: 'April',
  financialYear: FINANCIAL_YEAR,
  incomeTax: 5000,
  profTax: 200,
  hbaInterest: 0,
  gpfRegular: 6000,
  gpfClass4: 0,
  npsRegular: 0,
  gisGovtFund: 120,
  gisGovtSaving: 280,
  totalDeductions: 11600,
  netPay: 83100,
  mappingStatus: 'MATCHED',
  createdAt: new Date('2026-04-02T00:00:00Z').toISOString(),
  ...overrides,
});

const useHappyFixture = () => {
  vi.mocked(paybillRepository.listEarnings).mockImplementation(async (params) =>
    params?.financialYear === FINANCIAL_YEAR ? [makeEarning()] : []
  );
  vi.mocked(paybillRepository.listDeductions).mockImplementation(async (params) =>
    params?.financialYear === FINANCIAL_YEAR ? [makeDeduction()] : []
  );
  vi.mocked(paybillRepository.getSettings).mockResolvedValue({
    manualAllowances: ['Pay Difference', 'DA Difference'],
    earningColumnOrder: [],
    deductionColumnOrder: [],
    daRates: [50],
    daHikeThreshold: 50,
    basicPayChangeTolerance: 10,
  });
  vi.mocked(paybillRepository.getManualLedgerValues).mockResolvedValue({});
};

function TestWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/employee']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const openDrawerFor = async (month: string) => {
  fireEvent.click(screen.getByRole('button', { name: month }));
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  return screen.getByRole('dialog');
};

describe('MonthDetailDrawer (via EmployeeLedgerView)', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useHappyFixture();
  });

  it('opens on a month column-header click and lists that month earning components', async () => {
    render(
      <TestWrapper>
        <EmployeeLedgerView financialYear={FINANCIAL_YEAR} initialHrpn="20014113" />
      </TestWrapper>
    );

    await screen.findByText('Basic Pay');
    const dialog = await openDrawerFor('April');

    expect(within(dialog).getByText('April — Dr. Ramesh Patel')).toBeInTheDocument();
    // Nonzero earning components labelled with formatted ₹ values
    expect(within(dialog).getByText('₹56,100')).toBeInTheDocument(); // Basic Pay
    expect(within(dialog).getByText('₹28,050')).toBeInTheDocument(); // DA
    expect(within(dialog).getByText('₹5,610')).toBeInTheDocument(); // HRA
    // Gross emphasized on the EARNING card
    expect(within(dialog).getAllByText('Gross Amt').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('₹94,700')).toBeInTheDocument();
    // Deduction side present too
    expect(within(dialog).getByText('Income Tax')).toBeInTheDocument();
    expect(within(dialog).getByText('Net Pay')).toBeInTheDocument();
    expect(within(dialog).getByText('₹83,100')).toBeInTheDocument();
    // Meta line: short import id + created date
    expect(within(dialog).getAllByText(/imp-1/).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/Apr 2026|Apr/).length).toBeGreaterThan(0);
  });

  it('shows the empty-month message when a month has no records', async () => {
    render(
      <TestWrapper>
        <EmployeeLedgerView financialYear={FINANCIAL_YEAR} initialHrpn="20014113" />
      </TestWrapper>
    );

    await screen.findByText('Basic Pay');
    const dialog = await openDrawerFor('December');

    const empties = within(dialog).getAllByText('No records for this month');
    expect(empties).toHaveLength(2); // one per section (EARNING / DEDUCTION)
  });

  it('closes via Escape', async () => {
    render(
      <TestWrapper>
        <EmployeeLedgerView financialYear={FINANCIAL_YEAR} initialHrpn="20014113" />
      </TestWrapper>
    );

    await screen.findByText('Basic Pay');
    await openDrawerFor('April');

    fireEvent.keyDown(document.body, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

const PANEL_EMPLOYEES: PaybillDirectoryEntry[] = [
  { hrpn: 'E1', name: 'Alice A', designation: 'Clerk' },
  { hrpn: 'E2', name: 'Bob B', designation: 'Officer' },
  { hrpn: 'E3', name: 'Carol C', designation: 'Clerk' },
];

const renderPanel = () =>
  render(
    <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
      <EmployeeDirectoryPanel employees={PANEL_EMPLOYEES} selectedHrpn="E1" onSelect={vi.fn()} />
    </div>
  );

describe('EmployeeDirectoryPanel filters and shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('designation chips narrow the directory list and All resets them', () => {
    renderPanel();

    expect(screen.getByText('3 employees')).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Filter by designation' });
    const officerChip = within(group).getByRole('button', { name: 'Officer' });
    fireEvent.click(officerChip);
    expect(officerChip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 employees')).toBeInTheDocument();

    const allChip = within(group).getByRole('button', { name: 'All' });
    expect(allChip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(allChip);
    expect(allChip).toHaveAttribute('aria-pressed', 'true');
    expect(officerChip).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('3 employees')).toBeInTheDocument();
  });

  it('chips intersect the search filter', () => {
    renderPanel();

    const input = screen.getByLabelText(/Search employees by HRPN, name or designation/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bob' } }); // only Bob B (Officer) matches
    expect(screen.getByText('1 employees')).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Filter by designation' });
    // Bob is not a Clerk — intersection empties the list
    fireEvent.click(within(group).getByRole('button', { name: 'Clerk' }));
    expect(screen.getByText('0 employees')).toBeInTheDocument();

    // All clears the designation constraint but keeps the search
    fireEvent.click(within(group).getByRole('button', { name: 'All' }));
    expect(screen.getByText('1 employees')).toBeInTheDocument();
  });

  it('Ctrl+K focuses the search input', () => {
    renderPanel();

    const input = screen.getByLabelText(/Search employees by HRPN, name or designation/i);
    expect(document.activeElement).not.toBe(input);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(document.activeElement).toBe(input);
  });

  it("bare '/' focuses the search input when outside a form field", () => {
    renderPanel();

    const input = screen.getByLabelText(/Search employees by HRPN, name or designation/i);
    fireEvent.keyDown(window, { key: '/' });

    expect(document.activeElement).toBe(input);

    // Typing "/" inside the input itself must not be hijacked (no preventDefault)
    fireEvent.keyDown(input, { key: '/' });
    expect(document.activeElement).toBe(input);
  });
});
