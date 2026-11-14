import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkPdfExportModal } from './BulkPdfExportModal';
import { paybillPdfService } from '../../services/paybillPdf.service';
import type { PaybillDirectoryEntry } from '../../hooks/useEmployeeDirectory';

vi.mock('../../services/paybillPdf.service', () => ({
  paybillPdfService: {
    exportAllEmployeesLedgerPdfZip: vi.fn(),
  },
}));

describe('BulkPdfExportModal', () => {
  const mockAllEmployees: PaybillDirectoryEntry[] = [
    { hrpn: '20013826', name: 'Dr. D.C. Chaudhari', designation: 'Deputy Director' },
    { hrpn: '20014113', name: 'Dr. H.M. Patidar', designation: 'Assistant Director' },
    { hrpn: '20014151', name: 'Dr. J.M. Jalandhra', designation: 'Assistant Director' },
  ];

  const mockFilteredEmployees: PaybillDirectoryEntry[] = [
    { hrpn: '20014113', name: 'Dr. H.M. Patidar', designation: 'Assistant Director' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open is true and shows correct employee counts', () => {
    render(
      <BulkPdfExportModal
        open={true}
        onClose={vi.fn()}
        financialYear={2026}
        fyLabel="2026-27"
        officeName="ICDP SURAT"
        allEmployees={mockAllEmployees}
        filteredEmployees={mockFilteredEmployees}
      />
    );

    expect(screen.getByText('Export All Employee PDFs (ZIP)')).toBeDefined();
    expect(screen.getByText(/Annual Financial Statement Package — FY 2026-27/i)).toBeDefined();
    expect(screen.getByText(/All Employees/i)).toBeDefined();
    expect(screen.getByText(/3 employees in directory/i)).toBeDefined();
    expect(screen.getByText(/Filtered Employees/i)).toBeDefined();
    expect(screen.getByText(/1 matching search\/filter/i)).toBeDefined();
    expect(screen.getByText(/Start Export \(3 PDFs\)/i)).toBeDefined();
  });

  it('switches between all and filtered employee scopes', () => {
    render(
      <BulkPdfExportModal
        open={true}
        onClose={vi.fn()}
        financialYear={2026}
        fyLabel="2026-27"
        allEmployees={mockAllEmployees}
        filteredEmployees={mockFilteredEmployees}
      />
    );

    const filteredScopeBtn = screen.getByText('Filtered Employees').closest('button')!;
    fireEvent.click(filteredScopeBtn);

    expect(screen.getByText(/Start Export \(1 PDFs\)/i)).toBeDefined();

    const allScopeBtn = screen.getByText('All Employees').closest('button')!;
    fireEvent.click(allScopeBtn);

    expect(screen.getByText(/Start Export \(3 PDFs\)/i)).toBeDefined();
  });

  it('triggers exportAllEmployeesLedgerPdfZip on start export click and shows progress', async () => {
    vi.mocked(paybillPdfService.exportAllEmployeesLedgerPdfZip).mockImplementation(async (options: any) => {
      options.onProgress?.({
        current: 1,
        total: 3,
        currentEmployeeName: 'Dr. D.C. Chaudhari',
        status: 'generating',
      });
      return { total: 3, fileName: 'Employee_Ledgers_FY2026-27.zip' };
    });

    render(
      <BulkPdfExportModal
        open={true}
        onClose={vi.fn()}
        financialYear={2026}
        fyLabel="2026-27"
        officeName="ICDP SURAT"
        allEmployees={mockAllEmployees}
      />
    );

    const startBtn = screen.getByText(/Start Export/i).closest('button')!;
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(paybillPdfService.exportAllEmployeesLedgerPdfZip).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Export Complete!')).toBeDefined();
      expect(screen.getByText('Done')).toBeDefined();
    });
  });

  it('handles cancellation properly', async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(paybillPdfService.exportAllEmployeesLedgerPdfZip).mockImplementation(async (options: any) => {
      capturedSignal = options.signal;
      // Simulate delay
      await new Promise((r) => setTimeout(r, 100));
      if (options.signal?.aborted) {
        throw new Error('Export cancelled');
      }
      return { total: 3, fileName: 'Employee_Ledgers_FY2026-27.zip' };
    });

    render(
      <BulkPdfExportModal
        open={true}
        onClose={vi.fn()}
        financialYear={2026}
        fyLabel="2026-27"
        allEmployees={mockAllEmployees}
      />
    );

    const startBtn = screen.getByText(/Start Export/i).closest('button')!;
    fireEvent.click(startBtn);

    // Click cancel button while exporting
    await waitFor(() => {
      const cancelBtn = screen.getByText('Cancel Export');
      expect(cancelBtn).toBeDefined();
      fireEvent.click(cancelBtn);
    });

    await waitFor(() => {
      expect(capturedSignal?.aborted).toBe(true);
    });
  });
});
