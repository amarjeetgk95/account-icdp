import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { OfficeReportView } from './OfficeReportView';
import type { EstablishmentRecord } from '../types';

const POSITION_RECORDS: EstablishmentRecord[] = [
  {
    id: 'p1',
    srNo: 1,
    postName: 'સિનિયર કારકુન',
    status: 'Filled',
    statusDate: '01-04-2026',
    employeeName: 'રાજેશ પટેલ',
    hrpnNo: 'HRPN001',
    positionNo: '1',
    mobileNo: '9876543210',
    chargeHrpnNo: '-',
    cadreClass: 'Class-2',
  },
  {
    id: 'p2',
    srNo: 2,
    postName: 'સિનિયર કારકુન',
    status: 'Vacant',
    statusDate: '10-04-2026',
    employeeName: '-',
    hrpnNo: '-',
    positionNo: '2',
    mobileNo: '-',
    chargeHrpnNo: '-',
    cadreClass: 'Class-2',
  },
  {
    id: 'p3',
    srNo: 3,
    postName: 'આંકડા અધિકારી',
    status: 'Cancelled',
    statusDate: '12-04-2026',
    employeeName: '-',
    hrpnNo: '-',
    positionNo: '3',
    mobileNo: '-',
    chargeHrpnNo: '-',
    cadreClass: 'Class-1',
  },
];

const refetch = vi.fn();

vi.mock('../hooks/useEstablishmentPositions', () => ({
  useEstablishmentPositions: () => ({
    data: POSITION_RECORDS,
    isLoading: false,
    isError: false,
    refetch,
  }),
}));

describe('OfficeReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps the printable document in a .report-print-area (otherwise the report prints blank)', () => {
    render(<OfficeReportView />);

    const printArea = document.getElementById('establishment-report-print');
    expect(printArea).toBeInTheDocument();
    expect(printArea).toHaveClass('report-print-area');
  });

  it('labels a cancelled post "રદ" in the detailed form (it used to print "અબેયન્સ")', () => {
    render(<OfficeReportView />);

    fireEvent.click(screen.getByRole('button', { name: /detailed/i }));
    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText('રદ')).toBeInTheDocument();
    expect(screen.queryByText('અબેયન્સ')).not.toBeInTheDocument();
  });

  it('keeps abolished/cancelled posts out of the post summary until the toggle is on', () => {
    render(<OfficeReportView />);

    // Default: terminal posts are hidden, so no abolished column and no row.
    expect(screen.queryByText('અ.બે./રદ')).not.toBeInTheDocument();
    expect(screen.queryByText('આંકડા અધિકારી')).not.toBeInTheDocument();

    // Toggle on: the post appears with its own column, and the sanctioned
    // strength of the office is NOT inflated by it.
    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText('અ.બે./રદ')).toBeInTheDocument();

    const summaryTable = screen.getByRole('table');
    const row = within(summaryTable).getByText('આંકડા અધિકારી').closest('tr')!;
    const cells = within(row).getAllByRole('cell').map((c) => c.textContent?.trim());
    // sanctioned / filled / vacant / under-charge / abolished
    expect(cells.slice(3)).toEqual(['0', '0', '0', '-', '1']);
  });
});
