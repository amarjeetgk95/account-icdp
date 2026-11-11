import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkSelfAssessmentModal } from './BulkSelfAssessmentModal';
import { selfAssessmentPdfService } from '../../services/selfAssessmentPdf.service';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import type { SelfAssessmentMemo } from '../../types/selfAssessment';

vi.mock('../../services/selfAssessmentPdf.service', () => ({
  selfAssessmentPdfService: {
    exportAllMemosPdfZip: vi.fn(),
  },
}));

vi.mock('@/shared/utilities/nativePrint', () => ({
  popupNativePrint: vi.fn(),
}));

describe('BulkSelfAssessmentModal', () => {
  const mockMemos: SelfAssessmentMemo[] = [
    {
      id: 'memo-1',
      financialYear: 2025,
      assessmentYear: '2026-27',
      hrpn: '20013826',
      status: 'DRAFT',
      preferredFormat: 'DANGS',
      departmentName: 'ICDP Surat',
      departmentDivision: 'Surat',
      district: 'Surat',
      taxpayerName: 'Dr. D.C. Chaudhari',
      designation: 'Deputy Director',
      isPensioner: false,
      pan: 'ABCDE1111A',
      employeeIdOrPsn: '20013826',
      residentialStatus: 'RESIDENT',
      residentialAddress: 'Surat',
      computationDate: '01/03/2026',
      grossSalaryFromLedger: 1500000,
      grossSalaryTotal: 1500000,
      honorariumBonus: 0,
      bonus: 0,
      bankInterest: 0,
      nscInterest: 0,
      housePropertyIncome: 0,
      retirementGratuity: 0,
      leaveSalaryEncashment: 0,
      retrenchmentCompensation: 0,
      agriculturalIncome: 0,
      familyPensionGross: 0,
      familyPensionDeduction57iia: 0,
      otherIncomeSources: 0,
      capitalGainsSpecialRate: 0,
      grossTotalIncome: 1500000,
      standardDeduction16ia: 75000,
      nps80CCD2: 0,
      otherPermittedDeductions: 0,
      totalPermittedDeductions: 75000,
      taxableTotalIncome: 1425000,
      working: {
        slabs: [],
        taxOnNormalIncome: 110000,
        taxOnSpecialRate: 0,
        totalTaxBeforeRebate: 110000,
        rebate87A: 0,
        taxAfterRebate: 110000,
        surcharge: 0,
        cess4: 4400,
        relief89: 0,
        totalTaxLiability: 114400,
      },
      monthlyTds: {
        taxPaidUpToNov: 80000,
        taxDeductedDec: 10000,
        taxDeductedJan: 10000,
        totalTaxPaidTillJan: 100000,
        delayFiling234A: false,
        delayPenaltyAmount: 0,
        taxDeductedFeb: 14400,
        challans: [],
        totalChallanAmount: 0,
        totalTaxCredits: 114400,
        netTaxPayableOrRefund: 0,
      },
      agreedToNewTaxScheme: true,
      gujaratiConsentText: 'બાંહેધરી',
      place: 'Surat',
    },
    {
      id: 'memo-2',
      financialYear: 2025,
      assessmentYear: '2026-27',
      hrpn: '20014113',
      status: 'DRAFT',
      preferredFormat: 'DANGS',
      departmentName: 'ICDP Surat',
      departmentDivision: 'Surat',
      district: 'Surat',
      taxpayerName: 'Dr. H.M. Patidar',
      designation: 'Assistant Director',
      isPensioner: false,
      pan: 'ABCDE2222B',
      employeeIdOrPsn: '20014113',
      residentialStatus: 'RESIDENT',
      residentialAddress: 'Surat',
      computationDate: '01/03/2026',
      grossSalaryFromLedger: 1800000,
      grossSalaryTotal: 1800000,
      honorariumBonus: 0,
      bonus: 0,
      bankInterest: 0,
      nscInterest: 0,
      housePropertyIncome: 0,
      retirementGratuity: 0,
      leaveSalaryEncashment: 0,
      retrenchmentCompensation: 0,
      agriculturalIncome: 0,
      familyPensionGross: 0,
      familyPensionDeduction57iia: 0,
      otherIncomeSources: 0,
      capitalGainsSpecialRate: 0,
      grossTotalIncome: 1800000,
      standardDeduction16ia: 75000,
      nps80CCD2: 0,
      otherPermittedDeductions: 0,
      totalPermittedDeductions: 75000,
      taxableTotalIncome: 1725000,
      working: {
        slabs: [],
        taxOnNormalIncome: 170000,
        taxOnSpecialRate: 0,
        totalTaxBeforeRebate: 170000,
        rebate87A: 0,
        taxAfterRebate: 170000,
        surcharge: 0,
        cess4: 6800,
        relief89: 0,
        totalTaxLiability: 176800,
      },
      monthlyTds: {
        taxPaidUpToNov: 100000,
        taxDeductedDec: 20000,
        taxDeductedJan: 20000,
        totalTaxPaidTillJan: 140000,
        delayFiling234A: false,
        delayPenaltyAmount: 0,
        taxDeductedFeb: 20000,
        challans: [],
        totalChallanAmount: 0,
        totalTaxCredits: 160000,
        netTaxPayableOrRefund: 16800, // Payable
      },
      agreedToNewTaxScheme: true,
      gujaratiConsentText: 'બાંહેધરી',
      place: 'Surat',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open is true with correct labels and memo counts', () => {
    render(
      <BulkSelfAssessmentModal
        open={true}
        onClose={vi.fn()}
        financialYear={2025}
        fyLabel="2025-26"
        ayLabel="2026-27"
        allMemos={mockMemos}
      />
    );

    expect(screen.getByText('Bulk Export Self-Assessment Memos (ZIP / PDF)')).toBeDefined();
    expect(screen.getByText(/Self-Assessment Memo Package.*FY 2025-26 \(AY 2026-27\)/i)).toBeDefined();
    expect(screen.getByText('All (2)')).toBeDefined();
    expect(screen.getByText('Tax Payable (1)')).toBeDefined();
    expect(screen.getByText('Zero Balance (1)')).toBeDefined();
    expect(screen.getByText(/Export ZIP \(2 PDFs\)/i)).toBeDefined();
  });

  it('filters memos by tax category', () => {
    render(
      <BulkSelfAssessmentModal
        open={true}
        onClose={vi.fn()}
        financialYear={2025}
        fyLabel="2025-26"
        ayLabel="2026-27"
        allMemos={mockMemos}
      />
    );

    const taxPayableBtn = screen.getByText('Tax Payable (1)');
    fireEvent.click(taxPayableBtn);

    expect(screen.getByText(/Export ZIP \(1 PDFs\)/i)).toBeDefined();

    const allBtn = screen.getByText('All (2)');
    fireEvent.click(allBtn);

    expect(screen.getByText(/Export ZIP \(2 PDFs\)/i)).toBeDefined();
  });

  it('triggers exportAllMemosPdfZip when Export ZIP is clicked', async () => {
    vi.mocked(selfAssessmentPdfService.exportAllMemosPdfZip).mockImplementation(
      async (options: any) => {
        options.onProgress?.({
          current: 1,
          total: 2,
          currentEmployeeName: 'Dr. D.C. Chaudhari',
          status: 'generating',
        });
        return { total: 2, fileName: 'Self_Assessment_Memos_FY2025-26.zip' };
      }
    );

    render(
      <BulkSelfAssessmentModal
        open={true}
        onClose={vi.fn()}
        financialYear={2025}
        fyLabel="2025-26"
        ayLabel="2026-27"
        allMemos={mockMemos}
      />
    );

    const exportBtn = screen.getByText(/Export ZIP \(2 PDFs\)/i).closest('button')!;
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(selfAssessmentPdfService.exportAllMemosPdfZip).toHaveBeenCalledTimes(1);
    });
  });

  it('triggers popupNativePrint when Print button is clicked', () => {
    render(
      <BulkSelfAssessmentModal
        open={true}
        onClose={vi.fn()}
        financialYear={2025}
        fyLabel="2025-26"
        ayLabel="2026-27"
        allMemos={mockMemos}
      />
    );

    const printBtn = screen.getByText(/Print \(2\)/i).closest('button')!;
    fireEvent.click(printBtn);

    expect(popupNativePrint).toHaveBeenCalledTimes(1);
  });
});
