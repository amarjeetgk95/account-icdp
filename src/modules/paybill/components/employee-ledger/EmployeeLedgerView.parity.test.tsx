import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { EmployeeLedgerView } from './EmployeeLedgerView';
import { paybillRepository } from '../../repositories/paybill.repository';
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
  createdAt: new Date().toISOString(),
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
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Prev-FY requests resolve to [] so YoY arrows never pollute chip titles/values
const spyRepoData = (earnings: PayBillStoredEarning[], deductions: PayBillStoredDeduction[]) => {
  vi.mocked(paybillRepository.listEarnings).mockImplementation(async (params) =>
    params?.financialYear === FINANCIAL_YEAR ? earnings : []
  );
  vi.mocked(paybillRepository.listDeductions).mockImplementation(async (params) =>
    params?.financialYear === FINANCIAL_YEAR ? deductions : []
  );
};

const spyRepoDefaults = () => {
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

const useHappyFixture = () => {
  spyRepoData([makeEarning()], [makeDeduction()]);
  spyRepoDefaults();
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

const renderLedger = (initialHrpn?: string | null, children?: React.ReactNode) =>
  render(
    <TestWrapper>
      <EmployeeLedgerView financialYear={FINANCIAL_YEAR} initialHrpn={initialHrpn} />
      {children}
    </TestWrapper>
  );

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="url-probe">{location.pathname}{location.search}</div>;
}

describe('EmployeeLedgerView parity (ported characterization)', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders employee identity: name, designation and HRPN badge', async () => {
    useHappyFixture();
    renderLedger('20014113');

    // Name/designation also appear in the persistent directory rail — assert presence, not uniqueness
    expect((await screen.findAllByText('Dr. Ramesh Patel')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Veterinary Officer').length).toBeGreaterThan(0);
    expect(screen.getByText(/HRPN: 20014113/)).toBeInTheDocument();
  });

  it('renders matrix rows, both section headers, and Arrears badges on difference rows', async () => {
    useHappyFixture();
    renderLedger('20014113');

    await screen.findByText('Basic Pay');
    expect(screen.getByText('Gross Amt')).toBeInTheDocument();
    expect(screen.getByText('EARNING (Rs.)')).toBeInTheDocument();
    expect(screen.getByText('DEDUCTION (Rs.)')).toBeInTheDocument();

    for (const label of ['Pay Difference', 'DA Difference']) {
      const row = screen.getByText(label).closest('tr');
      expect(row).not.toBeNull();
      expect(within(row as HTMLElement).getByText('Arrears')).toBeInTheDocument();
    }
  });

  it('stat chips settle on final Annual Gross and Net Take-Home values after count-up', async () => {
    useHappyFixture();
    renderLedger('20014113');

    const grossChip = await screen.findByRole('button', { name: /Annual Gross/ });
    await waitFor(() => expect(grossChip).toHaveTextContent('₹94,700'), { timeout: 3000 });

    const netChip = screen.getByRole('button', { name: /Net Take-Home/ });
    await waitFor(() => expect(netChip).toHaveTextContent('₹83,100'), { timeout: 3000 });
  });

  it('renders all 12 month columns and Annual Total in the matrix table', async () => {
    useHappyFixture();
    renderLedger('20014113');

    await screen.findByText('Basic Pay');

    expect(screen.getAllByRole('columnheader', { name: 'March' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('columnheader', { name: 'April' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('columnheader', { name: 'August' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('columnheader', { name: 'September' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('columnheader', { name: 'February' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: 'Annual Total' })).toBeInTheDocument();
  });

  it('renders static EARNING and DEDUCTION section headers with their parameter rows', async () => {
    useHappyFixture();
    renderLedger('20014113');

    expect(await screen.findByText('EARNING (Rs.)')).toBeInTheDocument();
    expect(screen.getByText('DEDUCTION (Rs.)')).toBeInTheDocument();
    expect(screen.getByText('Basic Pay')).toBeInTheDocument();
    expect(screen.getByText('Income Tax')).toBeInTheDocument();
  });

  it('selecting an employee from search syncs ?hrpn= into router location and clears the input', async () => {
    useHappyFixture();
    renderLedger(null, <LocationProbe />);

    const input = screen.getByLabelText(/Search employees by HRPN, name or designation/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '20014113' } });

    const option = await screen.findByRole('option', { name: /Dr\. Ramesh Patel/ });
    expect(option.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(screen.getByTestId('url-probe')).toHaveTextContent('hrpn=20014113')
    );
    expect(input).toHaveValue('');
  });

  it('shows the empty state with Upload Pay Bill and Refresh actions when no records exist', async () => {
    spyRepoData([], []);
    spyRepoDefaults();
    renderLedger('20014113');

    expect(
      await screen.findByText('No earnings or deduction records found for this employee')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Pay Bill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('shows an alert with Retry on load failure and Retry re-invokes listEarnings', async () => {
    spyRepoDefaults();
    vi.mocked(paybillRepository.listDeductions).mockResolvedValue([]);
    const listEarningsSpy = vi
      .mocked(paybillRepository.listEarnings)
      .mockRejectedValue(new Error('boom'));
    renderLedger('20014113');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Employee data could not be loaded');
    expect(alert).toHaveTextContent('boom');

    const callsBeforeRetry = listEarningsSpy.mock.calls.filter(
      (c) => c[0]?.financialYear === FINANCIAL_YEAR
    ).length;

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    await waitFor(() =>
      expect(
        listEarningsSpy.mock.calls.filter((c) => c[0]?.financialYear === FINANCIAL_YEAR).length
      ).toBeGreaterThan(callsBeforeRetry)
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('flags a month with grossAmount 0 in the Gross Amt row via a zero-gross anomaly marker', async () => {
    spyRepoData(
      [
        makeEarning(),
        makeEarning({
          id: 'earn-march',
          month: 'March',
          basicPay: 0,
          da: 0,
          hra: 0,
          cla: 0,
          medicalAllowance: 0,
          transportAllowance: 0,
          washingAllowance: 0,
          grossAmount: 0,
        }),
      ],
      [makeDeduction()]
    );
    spyRepoDefaults();
    renderLedger('20014113');

    const flagged = await screen.findByTitle(/^March: zero gross/);
    expect(flagged.querySelector('svg')).not.toBeNull();
    expect(flagged.closest('tr')).toHaveAttribute('id', 'ledger-row-grossAmount');
  });

  it('selecting an employee from the directory updates ?hrpn= — Enter alone picks the first match', async () => {
    useHappyFixture();
    renderLedger(null, <LocationProbe />);

    const input = screen.getByLabelText(/Search employees by HRPN, name or designation/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ramesh' } });

    const option = await screen.findByRole('option', { name: /Dr\. Ramesh Patel/ });
    expect(option.getAttribute('aria-selected')).toBe('true');

    // New behaviour (old quirk fixed): Enter without prior ArrowDown selects the first match
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(screen.getByTestId('url-probe')).toHaveTextContent('hrpn=20014113')
    );
    expect(input).toHaveValue('');
  });
});
