import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  selfAssessmentPdfService,
  getSelfAssessmentPdfFileName,
} from './selfAssessmentPdf.service';
import type { SelfAssessmentMemo } from '../types/selfAssessment';

// Mock dependencies
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    width: 794,
    height: 1123,
    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockImageData'),
  }),
}));

const mockDoc = {
  addImage: vi.fn(),
  addPage: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  lastAutoTable: { finalY: 50 },
  output: vi.fn().mockImplementation((type: string) => {
    if (type === 'arraybuffer') return new ArrayBuffer(8);
    if (type === 'blob') return new Blob(['mock-pdf'], { type: 'application/pdf' });
    return 'mock-pdf-string';
  }),
  save: vi.fn(),
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockDoc),
}));

const mockAutoTable = vi.fn().mockImplementation((doc: Record<string, unknown>) => {
  doc.lastAutoTable = { finalY: 100 };
});

vi.mock('jspdf-autotable', () => ({
  default: mockAutoTable,
  autoTable: mockAutoTable,
}));

const mockZipFolder = {
  file: vi.fn(),
};

const mockZipInstance = {
  folder: vi.fn().mockReturnValue(mockZipFolder),
  file: vi.fn(),
  generateAsync: vi.fn().mockResolvedValue(new Blob(['mock-zip'], { type: 'application/zip' })),
};

vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => mockZipInstance),
}));

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('selfAssessmentPdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMemo: SelfAssessmentMemo = {
    id: 'memo-2025-20014113',
    financialYear: 2025,
    assessmentYear: '2026-27',
    hrpn: '20014113',
    status: 'DRAFT',
    preferredFormat: 'DANGS',
    departmentName: 'INTENSIVE CATTLE DEVELOPMENT PROJECT (ICDP)',
    departmentDivision: 'Surat',
    district: 'Surat',
    taxpayerName: 'Dr. H.M. Patidar',
    designation: 'Assistant Director',
    isPensioner: false,
    pan: 'ABCDE1234F',
    employeeIdOrPsn: '20014113',
    residentialStatus: 'RESIDENT',
    residentialAddress: 'Surat',
    computationDate: '01/03/2026',
    grossSalaryFromLedger: 1250000,
    grossSalaryTotal: 1250000,
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
    grossTotalIncome: 1250000,
    standardDeduction16ia: 75000,
    nps80CCD2: 0,
    otherPermittedDeductions: 0,
    totalPermittedDeductions: 75000,
    taxableTotalIncome: 1175000,
    working: {
      slabs: [
        { label: '0 to 4,00,000', from: 0, to: 400000, rate: 0, taxableAmount: 400000, taxAmount: 0 },
        { label: '4,00,001 to 8,00,000', from: 400001, to: 800000, rate: 5, taxableAmount: 400000, taxAmount: 20000 },
        { label: '8,00,001 to 11,75,000', from: 800001, to: 1200000, rate: 10, taxableAmount: 375000, taxAmount: 37500 },
      ],
      taxOnNormalIncome: 57500,
      taxOnSpecialRate: 0,
      totalTaxBeforeRebate: 57500,
      rebate87A: 0,
      taxAfterRebate: 57500,
      surcharge: 0,
      cess4: 2300,
      relief89: 0,
      totalTaxLiability: 59800,
    },
    monthlyTds: {
      taxPaidUpToNov: 45000,
      taxDeductedDec: 5000,
      taxDeductedJan: 5000,
      totalTaxPaidTillJan: 55000,
      delayFiling234A: false,
      delayPenaltyAmount: 0,
      taxDeductedFeb: 4800,
      challans: [],
      totalChallanAmount: 0,
      totalTaxCredits: 59800,
      netTaxPayableOrRefund: 0,
    },
    agreedToNewTaxScheme: true,
    gujaratiConsentText: 'હું આથી બાંહેધરી આપું છું',
    place: 'Surat',
    taxpayerSignatureName: 'Dr. H.M. Patidar',
    preparedByName: 'Staff',
    preparedByDesignation: 'Senior Clerk',
    treasuryOfficerName: 'Officer',
    treasuryOfficerDesignation: 'Assistant Administrative cum Account Officer',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };

  it('generates sanitized and standardized PDF filenames', () => {
    const fileName = getSelfAssessmentPdfFileName(mockMemo);
    expect(fileName).toBe('Self_Assessment_Memo_20014113_Dr._H.M._Patidar_FY2025-26.pdf');

    const fileNameWithSlash = getSelfAssessmentPdfFileName({
      ...mockMemo,
      taxpayerName: 'Ramesh / Suresh: Patel',
      hrpn: 'HRPN/123',
    });
    expect(fileNameWithSlash).toBe('Self_Assessment_Memo_HRPN_123_Ramesh___Suresh__Patel_FY2025-26.pdf');
  });

  it('generates a text-based vector PDF document via jsPDF and autotable', async () => {
    const result = await selfAssessmentPdfService.generateTextBasedMemoPdfDoc(mockMemo);

    expect(result.doc).toBeDefined();
    expect(result.fileName).toContain('Self_Assessment_Memo_20014113');
    expect(result.arrayBuffer).toBeDefined();
    expect(result.blob).toBeDefined();
    expect(mockDoc.text).toHaveBeenCalled();
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it('converts an HTML element to a jsPDF document (canvas fallback)', async () => {
    const dummyEl = document.createElement('div');
    const result = await selfAssessmentPdfService.convertElementToMemoPdfDoc(dummyEl, mockMemo);

    expect(result.doc).toBeDefined();
    expect(result.fileName).toContain('Self_Assessment_Memo_20014113');
    expect(result.arrayBuffer).toBeDefined();
    expect(result.blob).toBeDefined();
    expect(mockDoc.addImage).toHaveBeenCalledTimes(1);
  });

  it('downloads a single memo PDF directly from memo object without requiring DOM', async () => {
    const result = await selfAssessmentPdfService.downloadSingleMemoPdf(mockMemo);

    expect(result.fileName).toContain('Self_Assessment_Memo_20014113');
    expect(mockDoc.save).toHaveBeenCalledWith(result.fileName);
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it('generates a bulk ZIP of all memos in pure vector mode without needing DOM elements', async () => {
    const onProgress = vi.fn();

    const memos = [
      mockMemo,
      { ...mockMemo, hrpn: '20014151', taxpayerName: 'Dr. J.M. Jalandhra' },
    ];

    const result = await selfAssessmentPdfService.generateAllMemosPdfZip({
      financialYear: 2025,
      fyLabel: '2025-26',
      memos,
      mode: 'vector',
      onProgress,
    });

    expect(result.total).toBe(2);
    expect(result.fileName).toBe('Self_Assessment_Memos_FY2025-26.zip');
    expect(result.zipBlob).toBeDefined();
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'preparing', total: 2 })
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', total: 2 })
    );
    expect(mockZipFolder.file).toHaveBeenCalledTimes(2);
  });

  it('aborts bulk export when signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      selfAssessmentPdfService.generateAllMemosPdfZip({
        financialYear: 2025,
        fyLabel: '2025-26',
        memos: [mockMemo],
        signal: controller.signal,
      })
    ).rejects.toThrow('Export cancelled');
  });
});
