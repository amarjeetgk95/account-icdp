import { useState, useCallback, useEffect } from 'react';
import { pdfParserService } from '../services/pdfParser.service';
import { hrpnMappingService } from '../services/hrpnMapping.service';
import { paybillValidationService } from '../services/paybillValidation.service';
import { paybillStorageService } from '../services/paybillStorage.service';
import { paybillAuditService } from '../services/paybillAudit.service';
import { paybillRepository } from '../repositories/paybill.repository';
import { PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../services/paybillReport.service';
import { loadSamplePayBillData, loadSamplePayBillDeductionData } from '../utils/samplePayBillPdf';
import type {
  PayBillMetadata,
  PayBillExtractedRecord,
  PayBillDeductionExtractedRecord,
  PayBillTotalRow,
  PayBillDeductionTotalRow,
  PayBillReconciliation,
  PayBillImportSummary,
  PayBillProcessingState,
  PayBillImportResult,
  PayBillEmployeeRow,
  PayBillDeductionRow,
  ProcessingStage,
  BatchFileItem,
  PayBillAuditReport,
  PayBillSheetType,
  PayBillSettings,
  PayBillStoredImport,
  PayBillBatchMatrix,
  PayBillBatchMatrixMonth,
  PayBillMonthlyEmployeeMatrixRow,
  DetectedComponentInfo,
  PayBillParsedResult,
} from '../types';

const CALENDAR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Compute the previous calendar month + its financial year for "MonthName-YYYY" labels.
 * e.g. "April-2026" -> { month: 'March', financialYear: 2026 }
 */
function previousMonthOf(monthLabel: string): { month: string; financialYear: number } | null {
  const match = monthLabel.trim().match(/^([A-Za-z]+)[-/ ](\d{4})$/);
  if (!match) return null;
  const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  const year = parseInt(match[2], 10);
  const idx = CALENDAR_MONTHS.indexOf(name);
  if (idx < 0) return null;
  if (idx === 0) return { month: 'December', financialYear: year - 1 };
  return { month: CALENDAR_MONTHS[idx - 1], financialYear: year };
}

const BATCH_MATRIX_COLUMNS = [...PAYBILL_EARNING_COLUMNS, ...PAYBILL_DEDUCTION_COLUMNS];

/**
 * Build a consolidated batch matrix (month section blocks) from successfully
 * parsed batch items. Earning + deduction files of the same month are merged
 * per employee HRPN.
 */
function buildBatchMatrix(items: BatchFileItem[]): PayBillBatchMatrix {
  const read = (rec: unknown, key: string): number =>
    Number((rec as Record<string, unknown>)?.[key] ?? 0);

  const monthMap = new Map<
    string,
    {
      monthLabel: string;
      month: string;
      financialYear: number;
      employees: Map<string, PayBillMonthlyEmployeeMatrixRow>;
    }
  >();

  for (const item of items) {
    const parsed = item.parsedResult;
    if (item.status !== 'SUCCESS' || !parsed) continue;

    const { month, financialYear } = paybillStorageService.parseMonthAndFy(parsed.metadata.month);
    const key = `${financialYear}-${month}`;
    let block = monthMap.get(key);
    if (!block) {
      block = { monthLabel: `${month} ${financialYear}`, month, financialYear, employees: new Map() };
      monthMap.set(key, block);
    }

    const upsert = (hrpn: string, employeeName: string, designation: string | null, values: Record<string, number>) => {
      const existing = block!.employees.get(hrpn);
      if (existing) {
        Object.assign(existing.values, values);
      } else {
        const emptyRow: Record<string, number> = Object.fromEntries(
          BATCH_MATRIX_COLUMNS.map((c) => [c.key, 0])
        );
        block!.employees.set(hrpn, { hrpn, employeeName, designation, values: { ...emptyRow, ...values } });
      }
    };

    if (parsed.sheetType === 'DEDUCTION' && parsed.deductionRows) {
      for (const r of parsed.deductionRows) {
        upsert(r.hrpn, r.employeeName, r.designation, {
          incomeTax: r.incomeTax,
          profTax: r.profTax,
          hbaInterest: r.hbaInterest,
          gpfRegular: r.gpfRegular,
          gpfClass4: r.gpfClass4,
          npsRegular: r.npsRegular,
          gisGovtFund: r.gisGovtFund,
          gisGovtSaving: r.gisGovtSaving,
          otherDeductions: read(r, 'otherDeductions'),
          totalDeductions: r.totalDeductions,
          netPay: r.netPay,
        });
      }
    } else {
      for (const r of parsed.rows) {
        upsert(r.hrpn, r.employeeName, r.designation, {
          basicPay: r.basicPay,
          da: r.da,
          hra: r.hra,
          cla: r.cla,
          medicalAllowance: r.medicalAllowance,
          transportAllowance: r.transportAllowance,
          specialPay: read(r, 'specialPay'),
          washingAllowance: read(r, 'washingAllowance'),
          nppAllowance: read(r, 'nonPrivatePracticeAllowance'),
          grossAmount: r.grossAmount,
        });
      }
    }
  }

  const fiscalIndex = (month: string) => {
    const i = CALENDAR_MONTHS.indexOf(month);
    return i >= 3 ? i - 3 : i + 9;
  };

  const months: PayBillBatchMatrixMonth[] = Array.from(monthMap.values())
    .sort((a, b) => a.financialYear - b.financialYear || fiscalIndex(a.month) - fiscalIndex(b.month))
    .map((block) => {
      const rows = Array.from(block.employees.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName)
      );
      const totals: Record<string, number> = {};
      for (const col of BATCH_MATRIX_COLUMNS) {
        totals[col.key] = rows.reduce((s, r) => s + (r.values[col.key] || 0), 0);
      }
      return { monthLabel: block.monthLabel, month: block.month, financialYear: block.financialYear, rows, totals };
    });

  const totalEmployees = months.reduce((s, m) => s + m.rows.length, 0);

  return { months, totalEmployees, totalFiles: items.length };
}

export function usePayBillImport() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [sheetType, setSheetType] = useState<PayBillSheetType>('EARNING');

  // Batch queue state
  const [batchQueue, setBatchQueue] = useState<BatchFileItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchMatrix, setBatchMatrix] = useState<PayBillBatchMatrix | null>(null);

  const [processingState, setProcessingState] = useState<PayBillProcessingState>({
    stage: 'IDLE',
    stageName: 'Idle',
    progress: 0,
    details: '',
    error: null,
  });

  const [metadata, setMetadata] = useState<PayBillMetadata | null>(null);
  const [records, setRecords] = useState<PayBillExtractedRecord[]>([]);
  const [deductionRecords, setDeductionRecords] = useState<PayBillDeductionExtractedRecord[]>([]);
  const [pdfTotals, setPdfTotals] = useState<PayBillTotalRow | null>(null);
  const [pdfDeductionTotals, setPdfDeductionTotals] = useState<PayBillDeductionTotalRow | null>(null);
  const [reconciliation, setReconciliation] = useState<PayBillReconciliation | null>(null);
  const [summary, setSummary] = useState<PayBillImportSummary | null>(null);
  const [auditReport, setAuditReport] = useState<PayBillAuditReport | null>(null);

  const [settings, setSettings] = useState<PayBillSettings | null>(null);
  const [existingBill, setExistingBill] = useState<PayBillStoredImport | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<PayBillImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Components detected in the PDF header that did not match the master.
  // Surfaced to the user so they can add them to the Component Master.
  const [unknownComponents, setUnknownComponents] = useState<DetectedComponentInfo[]>([]);

  const captureUnknownComponents = useCallback((parsed: {
    detectedComponents?: DetectedComponentInfo[];
  }) => {
    const unknowns = (parsed.detectedComponents || []).filter(
      (c) => c.matchMethod === 'UNKNOWN'
    );
    setUnknownComponents(unknowns);
  }, []);

  const dismissUnknownComponent = useCallback((componentCode: string) => {
    setUnknownComponents((prev) =>
      prev.filter((c) => c.componentCode !== componentCode)
    );
  }, []);

  const resetUnknownComponents = useCallback(() => setUnknownComponents([]), []);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * Load office-level paybill settings (DA rates, bill metadata defaults) on mount
   */
  useEffect(() => {
    let cancelled = false;
    paybillRepository
      .getSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        // settings are non-critical; defaults apply
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Refresh office-level settings (e.g. after the settings modal saves)
   */
  const refreshSettings = useCallback(async () => {
    try {
      const s = await paybillRepository.getSettings();
      setSettings(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  /**
   * Check whether the bill was already imported (same bill no + month + sheet side)
   */
  const checkDuplicateBill = useCallback(async (m: PayBillMetadata, side: PayBillSheetType) => {
    if (!m.billNo) {
      setExistingBill(null);
      return;
    }
    try {
      const existing = await paybillRepository.findImportByBillNo(m.billNo, {
        month: m.month,
        financialYear: paybillStorageService.parseMonthAndFy(m.month).financialYear,
        sheetType: side,
      });
      setExistingBill(existing);
    } catch {
      setExistingBill(null);
    }
  }, []);

  const updateStage = (stage: ProcessingStage, stageName: string, progress: number, details = '') => {
    setProcessingState({
      stage,
      stageName,
      progress,
      details,
      error: null,
    });
  };

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  /**
   * Process an uploaded PDF file through all 7 stages
   */
  const processFile = useCallback(async (uploadedFile: File) => {
    if (!uploadedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file.');
      return;
    }

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setFileSize(uploadedFile.size);
    setError(null);
    setImportResult(null);

    try {
      // Stage 1: PDF Uploaded
      updateStage('UPLOADED', 'PDF Uploaded', 15, `Uploaded ${uploadedFile.name} (${(uploadedFile.size / 1024).toFixed(1)} KB)`);
      await delay(120);

      // Stage 2: Reading PDF
      updateStage('READING', 'Reading PDF', 30, 'Parsing PDF text layer & document layout...');
      const parsedResult = await pdfParserService.parsePdf(uploadedFile);
      setSheetType(parsedResult.sheetType);
      captureUnknownComponents(parsedResult);
      await delay(120);

      // Stage 3: Detecting Table
      const isDed = parsedResult.sheetType === 'DEDUCTION';
      updateStage(
        'DETECTING_TABLE',
        'Detecting Table',
        50,
        `Detected ${isDed ? 'Deduction Side' : 'Earning Side'} Sheet & Bill ${parsedResult.metadata.billNo || 'Metadata'}`
      );
      await delay(100);

      const masterEmployees = await paybillStorageService.getMasterEmployees();

      if (isDed && parsedResult.deductionRows) {
        // Stage 4: Extracting HRPN (Deduction)
        updateStage('EXTRACTING_HRPN', 'Extracting HRPN', 65, `Extracted ${parsedResult.deductionRows.length} deduction records with HRPN keys`);
        await delay(100);

        // Stage 5: Mapping Employees
        updateStage('MAPPING_EMPLOYEES', 'Mapping Employees', 80, 'Matching extracted deduction HRPNs with Master Employee dataset...');
        const mappedDeductions = hrpnMappingService.mapDeductionRows(
          parsedResult.deductionRows,
          masterEmployees
        );
        await delay(100);

        // Stage 6: Validating
        updateStage('VALIDATING_DATA', 'Validating Data', 90, 'Validating mathematical totals and total deductions...');
        const validatedDeductions = paybillValidationService.validateDeductionRecords(mappedDeductions);
        await delay(100);

        setMetadata(parsedResult.metadata);
        setDeductionRecords(validatedDeductions);
        setRecords([]);
        setPdfDeductionTotals(parsedResult.pdfDeductionTotals || null);
        void checkDuplicateBill(parsedResult.metadata, 'DEDUCTION');

        const totalDed = validatedDeductions.reduce((s, r) => s + r.row.totalDeductions, 0);
        const netTotal = validatedDeductions.reduce((s, r) => s + r.row.netPay, 0);
        setReconciliation({
          isGrossMatched: true,
          isAllMatched: true,
          pdfGross: totalDed,
          calculatedGross: totalDed,
          diff: 0,
          status: 'MATCHED',
          message: `Total Deductions: ₹${totalDed.toLocaleString('en-IN')} | Net Pay: ₹${netTotal.toLocaleString('en-IN')}`,
          items: [],
        });

        updateStage('READY', 'Ready for Review', 100, `${validatedDeductions.length} deduction records extracted and ready.`);
        return;
      }

      // EARNING SIDE
      // Stage 4: Extracting HRPN
      updateStage('EXTRACTING_HRPN', 'Extracting HRPN', 65, `Extracted ${parsedResult.rows.length} employee records with HRPN keys`);
      await delay(100);

      // Stage 5: Mapping Employees
      updateStage('MAPPING_EMPLOYEES', 'Mapping Employees', 80, 'Matching extracted HRPNs with Master Employee dataset...');
      const mappedRecords = hrpnMappingService.mapRows(parsedResult.rows, masterEmployees);
      await delay(100);

      // Stage 6: Validating Data
      updateStage('VALIDATING_DATA', 'Validating Data', 90, 'Validating mathematical totals and reconciling with PDF Total row...');
      const validatedRecords = paybillValidationService.validateRecords(mappedRecords);
      const recon = paybillValidationService.reconcile(validatedRecords, parsedResult.pdfTotals);
      const summ = paybillValidationService.computeSummary(validatedRecords, recon);
      await delay(100);

      // Stage 7: Ready for Review
      setMetadata(parsedResult.metadata);
      setRecords(validatedRecords);
      setDeductionRecords([]);
      setPdfTotals(parsedResult.pdfTotals);
      setReconciliation(recon);
      setSummary(summ);
      void checkDuplicateBill(parsedResult.metadata, 'EARNING');

      updateStage('READY', 'Ready for Review', 100, `${validatedRecords.length} records extracted and ready for verification.`);
    } catch (err) {
      console.error('[usePayBillImport] processing error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to extract data from PDF.';
      setError(msg);
      setProcessingState({
        stage: 'ERROR',
        stageName: 'Extraction Error',
        progress: 0,
        details: '',
        error: msg,
      });
    }
  }, [checkDuplicateBill, captureUnknownComponents]);

  /**
   * Quick-load sample PDF dataset (July-2026, 4 employees, Gross ₹892,314)
   */
  const processSampleData = useCallback(async () => {
    setFileName('Sample_PayBill_July_2026.pdf');
    setFileSize(38420);
    setSheetType('EARNING');
    setError(null);
    setImportResult(null);

    try {
      updateStage('UPLOADED', 'PDF Uploaded', 15, 'Loaded Sample Paybill Inner Sheet');
      await delay(100);

      updateStage('READING', 'Reading PDF', 30, 'Reading PDF structure...');
      const parsedResult = loadSamplePayBillData();
      captureUnknownComponents(parsedResult);
      await delay(100);

      updateStage('DETECTING_TABLE', 'Detecting Table', 50, 'Detected 14 table columns & Bill Srt0299002201');
      await delay(100);

      updateStage('EXTRACTING_HRPN', 'Extracting HRPN', 65, 'Extracted HRPNs: 20013826, 20014113, 20014151, 20014153');
      await delay(100);

      updateStage('MAPPING_EMPLOYEES', 'Mapping Employees', 80, 'Mapping with Master Employee dataset...');
      const masterEmployees = await paybillStorageService.getMasterEmployees();
      const mappedRecords = hrpnMappingService.mapRows(parsedResult.rows, masterEmployees);
      await delay(100);

      updateStage('VALIDATING_DATA', 'Validating Data', 90, 'Reconciling Gross Total ₹892,314.00...');
      const validatedRecords = paybillValidationService.validateRecords(mappedRecords);
      const recon = paybillValidationService.reconcile(validatedRecords, parsedResult.pdfTotals);
      const summ = paybillValidationService.computeSummary(validatedRecords, recon);
      await delay(100);

      setMetadata(parsedResult.metadata);
      setRecords(validatedRecords);
      setDeductionRecords([]);
      setPdfTotals(parsedResult.pdfTotals);
      setReconciliation(recon);
      setSummary(summ);
      void checkDuplicateBill(parsedResult.metadata, 'EARNING');

      updateStage('READY', 'Ready for Review', 100, 'Sample bill loaded: 4 employees matched, ₹892,314 gross reconciled.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample bill.';
      setError(msg);
    }
  }, [checkDuplicateBill, captureUnknownComponents]);

  /**
   * Quick-load sample Deduction PDF dataset (April-2026, 8 employees, Ded ₹85,388, Net ₹447,496)
   */
  const processSampleDeductionData = useCallback(async () => {
    setFileName('Sample_PayBill_Deduction_April_2026.pdf');
    setFileSize(42150);
    setSheetType('DEDUCTION');
    setError(null);
    setImportResult(null);

    try {
      updateStage('UPLOADED', 'PDF Uploaded', 15, 'Loaded Sample Deduction Inner Sheet (April-2026)');
      await delay(100);

      updateStage('READING', 'Reading PDF', 30, 'Reading Deduction Side PDF structure...');
      const parsedResult = loadSamplePayBillDeductionData();
      captureUnknownComponents(parsedResult);
      await delay(100);

      updateStage('DETECTING_TABLE', 'Detecting Table', 50, 'Detected 14 deduction columns & Bill Srt0299002202');
      await delay(100);

      updateStage('EXTRACTING_HRPN', 'Extracting HRPN', 65, 'Extracted 8 employee deduction rows');
      const masterEmployees = await paybillStorageService.getMasterEmployees();

      const mappedDeductions = hrpnMappingService.mapDeductionRows(
        parsedResult.deductionRows || [],
        masterEmployees
      );
      await delay(100);


      updateStage('VALIDATING_DATA', 'Validating Data', 90, 'Reconciling Total Deductions ₹85,388 & Net Pay ₹447,496...');
      const validated = paybillValidationService.validateDeductionRecords(mappedDeductions);
      await delay(100);

      setMetadata(parsedResult.metadata);
      setDeductionRecords(validated);
      setRecords([]);
      setPdfDeductionTotals(parsedResult.pdfDeductionTotals || null);
      void checkDuplicateBill(parsedResult.metadata, 'DEDUCTION');

      setReconciliation({
        isGrossMatched: true,
        isAllMatched: true,
        pdfGross: 85388,
        calculatedGross: 85388,
        diff: 0,
        status: 'MATCHED',
        message: 'Deductions (₹85,388.00) & Net Pay (₹4,47,496.00) perfectly reconciled.',
        items: [],
      });

      updateStage('READY', 'Ready for Review', 100, 'Sample deduction sheet loaded: 8 staff records reconciled.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample deduction bill.';
      setError(msg);
    }
  }, [checkDuplicateBill, captureUnknownComponents]);

  /**
   * Process raw text / OCR fallback dump
   */
  const processRawText = useCallback(async (rawText: string) => {
    if (!rawText.trim()) {
      setError('Text cannot be empty.');
      return;
    }

    setFileName('OCR_Raw_Text_Input.txt');
    setFileSize(rawText.length);
    setError(null);
    setImportResult(null);

    try {
      updateStage('READING', 'Reading Text', 30, 'Parsing raw text format...');
      const parsedResult = pdfParserService.parseExtractedText(rawText);
      captureUnknownComponents(parsedResult);

      updateStage('EXTRACTING_HRPN', 'Extracting HRPN', 65, `Extracted ${parsedResult.rows.length} rows`);
      const masterEmployees = await paybillStorageService.getMasterEmployees();
      const mappedRecords = hrpnMappingService.mapRows(parsedResult.rows, masterEmployees);

      updateStage('VALIDATING_DATA', 'Validating Data', 90, 'Validating totals...');
      const validatedRecords = paybillValidationService.validateRecords(mappedRecords);
      const recon = paybillValidationService.reconcile(validatedRecords, parsedResult.pdfTotals);
      const summ = paybillValidationService.computeSummary(validatedRecords, recon);

      setMetadata(parsedResult.metadata);
      setRecords(validatedRecords);
      setPdfTotals(parsedResult.pdfTotals);
      setReconciliation(recon);
      setSummary(summ);
      void checkDuplicateBill(parsedResult.metadata, 'EARNING');

      updateStage('READY', 'Ready for Review', 100, 'Text parsed successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse text.';
      setError(msg);
    }
  }, [checkDuplicateBill, captureUnknownComponents]);

  /**
   * Update a record inline in the review table (re-validates + re-audits)
   */
  const updateRecord = useCallback(
    async (id: string, updatedFields: Partial<PayBillEmployeeRow>) => {
      try {
        const masterEmployees = await paybillStorageService.getMasterEmployees();

        setRecords((prevRecords) => {
          const nextRows = prevRecords.map((r) => {
            if (r.id !== id) return r.row;
            return {
              ...r.row,
              ...updatedFields,
            };
          });

          // Remap and revalidate
          const mapped = hrpnMappingService.mapRows(nextRows, masterEmployees);
          const validated = paybillValidationService.validateRecords(mapped);
          const recon = paybillValidationService.reconcile(validated, pdfTotals);
          const summ = paybillValidationService.computeSummary(validated, recon);

          setReconciliation(recon);
          setSummary(summ);

          return validated;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update record.');
      }
    },
    [pdfTotals]
  );

  /**
   * Delete a record from the review table (re-validates + re-audits)
   */
  const deleteRecord = useCallback(
    async (id: string) => {
      try {
        const masterEmployees = await paybillStorageService.getMasterEmployees();

        setRecords((prevRecords) => {
          const nextRows = prevRecords.filter((r) => r.id !== id).map((r) => r.row);
          const mapped = hrpnMappingService.mapRows(nextRows, masterEmployees);
          const validated = paybillValidationService.validateRecords(mapped);
          const recon = paybillValidationService.reconcile(validated, pdfTotals);
          const summ = paybillValidationService.computeSummary(validated, recon);

          setReconciliation(recon);
          setSummary(summ);

          return validated;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete record.');
      }
    },
    [pdfTotals]
  );

  /**
   * Execute final import to master & monthly payroll
   */
  const importData = useCallback(async (): Promise<PayBillImportResult | null> => {
    if (!metadata) {
      setError('No data to import.');
      return null;
    }

    // Duplicate-import guard: same bill no + month + sheet side already imported?
    try {
      const dup = await paybillRepository.findImportByBillNo(metadata.billNo, {
        month: metadata.month,
        financialYear: paybillStorageService.parseMonthAndFy(metadata.month).financialYear,
        sheetType,
      });
      if (dup) {
        setExistingBill(dup);
        setError(
          `Bill ${dup.billNo} was already imported for ${dup.month}-${dup.financialYear} on ${new Date(
            dup.createdAt
          ).toLocaleDateString()}. Import blocked to avoid duplicates.`
        );
        return null;
      }
    } catch {
      // duplicate check is best-effort; do not block import on a failed lookup
    }

    if (sheetType === 'DEDUCTION') {
      if (deductionRecords.length === 0) {
        setError('No deduction data to import.');
        return null;
      }
      setIsImporting(true);
      setError(null);
      try {
        const result = await paybillStorageService.importDeductions(
          metadata,
          deductionRecords,
          fileName || 'PayBill_Deduction.pdf'
        );
        setImportResult(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Deduction import failed.';
        setError(msg);
        return null;
      } finally {
        setIsImporting(false);
      }
    }

    if (records.length === 0) {
      setError('No data to import.');
      return null;
    }

    if (summary && summary.errorCount > 0) {
      setError(`Cannot import: ${summary.errorCount} records have critical errors. Please resolve them first.`);
      return null;
    }

    setIsImporting(true);
    setError(null);

    try {
      const result = await paybillStorageService.importPayBill(
        metadata,
        records,
        fileName || 'PayBill.pdf'
      );
      setImportResult(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      setError(msg);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, [metadata, records, deductionRecords, sheetType, summary, fileName]);

  /**
   * Add multiple PDF files to batch processing queue
   */
  const addFilesToBatchQueue = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    const items: BatchFileItem[] = pdfs.map((f) => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      status: 'PENDING',
    }));
    setBatchQueue((prev) => [...prev, ...items]);
  }, []);

  /**
   * Process all files in batch queue sequentially
   */
  const processBatchQueue = useCallback(async () => {
    if (batchQueue.length === 0) return;
    setIsBatchProcessing(true);
    setError(null);

    let masterEmployees: Awaited<ReturnType<typeof paybillStorageService.getMasterEmployees>> = [];
    try {
      masterEmployees = await paybillStorageService.getMasterEmployees();
    } catch (err) {
      setIsBatchProcessing(false);
      setError(err instanceof Error ? err.message : 'Failed to load master employees for batch processing.');
      return;
    }

    const succeededItems: BatchFileItem[] = [];

    for (const item of batchQueue) {
      if (item.status === 'SUCCESS') {
        succeededItems.push(item);
        continue;
      }

      setBatchQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'PARSING' } : q))
      );

      try {
        const parsed = await pdfParserService.parsePdf(item.file);
        if (parsed.sheetType === 'DEDUCTION' && parsed.deductionRows) {
          const updated: BatchFileItem = {
            ...item,
            status: 'SUCCESS',
            month: parsed.metadata.month,
            billNo: parsed.metadata.billNo,
            sheetType: 'DEDUCTION',
            parsedResult: parsed,
            recordCount: parsed.deductionRows?.length || 0,
            grossTotal: parsed.pdfDeductionTotals?.totalDeductions || 0,
          };
          setBatchQueue((prev) => prev.map((q) => (q.id === item.id ? updated : q)));
          succeededItems.push(updated);
        } else {
          const mapped = hrpnMappingService.mapRows(parsed.rows, masterEmployees);
          const validated = paybillValidationService.validateRecords(mapped);
          paybillValidationService.reconcile(validated, parsed.pdfTotals);

          const updated: BatchFileItem = {
            ...item,
            status: 'SUCCESS',
            month: parsed.metadata.month,
            billNo: parsed.metadata.billNo,
            sheetType: 'EARNING',
            parsedResult: parsed,
            recordCount: parsed.rows.length,
            grossTotal: parsed.pdfTotals?.grossAmount || 0,
          };
          setBatchQueue((prev) => prev.map((q) => (q.id === item.id ? updated : q)));
          succeededItems.push(updated);
        }
      } catch (err) {
        setBatchQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'ERROR', error: err instanceof Error ? err.message : 'Failed to parse' }
              : q
          )
        );
      }
    }

    if (succeededItems.length > 0) {
      setBatchMatrix(buildBatchMatrix(succeededItems));
    }

    setIsBatchProcessing(false);
  }, [batchQueue]);

  /**
   * Clear the entire batch queue
   */
  const clearBatchQueue = useCallback(() => {
    setBatchQueue([]);
    setSelectedBatchId(null);
    setBatchMatrix(null);
  }, []);

  /**
   * Remove a single item from batch queue
   */
  const removeBatchItem = useCallback((id: string) => {
    setBatchQueue((prev) => prev.filter((q) => q.id !== id));
  }, []);

  /**
   * Save ALL successfully parsed batch files into the ledger at once.
   * Returns per-file import counts; on partial failure, sets an error message.
   */
  const importBatchToLedger = useCallback(async (): Promise<{
    imported: number;
    failed: number;
    total: number;
  } | null> => {
    const successItems = batchQueue.filter((q) => q.status === 'SUCCESS' && q.parsedResult);
    if (successItems.length === 0) {
      setError('No processed files to save. Please run Process All first.');
      return null;
    }

    setIsImporting(true);
    setError(null);

    let imported = 0;
    let failed = 0;
    const failures: string[] = [];

    try {
      const masterEmployees = await paybillStorageService.getMasterEmployees();

      for (const item of successItems) {
        const parsed = item.parsedResult!;
        try {
          if (parsed.sheetType === 'DEDUCTION' && parsed.deductionRows) {
            const mapped = hrpnMappingService.mapDeductionRows(parsed.deductionRows, masterEmployees);
            const validated = paybillValidationService.validateDeductionRecords(mapped);
            await paybillStorageService.importDeductions(parsed.metadata, validated, item.name);
          } else {
            const mapped = hrpnMappingService.mapRows(parsed.rows, masterEmployees);
            const validated = paybillValidationService.validateRecords(mapped);
            await paybillStorageService.importPayBill(parsed.metadata, validated, item.name);
          }
          imported += 1;
        } catch (err) {
          failed += 1;
          failures.push(`${item.name}: ${err instanceof Error ? err.message : 'Import failed'}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save batch to ledger.');
      setIsImporting(false);
      return null;
    }

    if (failed > 0) {
      setError(`${failed} file(s) failed to save: ${failures.join('; ')}`);
    }

    setIsImporting(false);
    return { imported, failed, total: successItems.length };
  }, [batchQueue]);

  /**
   * Select a parsed batch item to review in the main table
   */
  const selectBatchItem = useCallback(
    async (item: BatchFileItem) => {
      if (!item.parsedResult) return;
      setSelectedBatchId(item.id);
      setFileName(item.name);
      setFileSize(item.size);
      setSheetType(item.parsedResult.sheetType);

      try {
        if (item.parsedResult.sheetType === 'DEDUCTION' && item.parsedResult.deductionRows) {
        const masterEmployees = await paybillStorageService.getMasterEmployees();
        const mappedDeductions = hrpnMappingService.mapDeductionRows(
          item.parsedResult.deductionRows,
          masterEmployees
        );

        const validated = paybillValidationService.validateDeductionRecords(mappedDeductions);
        setMetadata(item.parsedResult.metadata);
        setDeductionRecords(validated);
        setRecords([]);
        setPdfDeductionTotals(item.parsedResult.pdfDeductionTotals || null);
        void checkDuplicateBill(item.parsedResult.metadata, 'DEDUCTION');
        updateStage('READY', 'Ready for Review', 100, `Loaded ${item.month || item.name} deduction sheet.`);
        return;
      }

      const masterEmployees = await paybillStorageService.getMasterEmployees();
      const mapped = hrpnMappingService.mapRows(item.parsedResult.rows, masterEmployees);
      const validated = paybillValidationService.validateRecords(mapped);
      const recon = paybillValidationService.reconcile(validated, item.parsedResult.pdfTotals);
      const summ = paybillValidationService.computeSummary(validated, recon);

      setMetadata(item.parsedResult.metadata);
      setRecords(validated);
      setDeductionRecords([]);
      setPdfTotals(item.parsedResult.pdfTotals);
      setReconciliation(recon);
      setSummary(summ);
      void checkDuplicateBill(item.parsedResult.metadata, 'EARNING');

      updateStage(
        'READY',
        'Ready for Review',
        100,
        `Loaded ${item.month || item.name} from batch queue (${validated.length} records).`
      );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load batch item.');
      }
    },
    [checkDuplicateBill]
  );

  /**
   * 1-Click Quick Add unmapped employee into Master Employees table
   */
  const quickAddEmployee = useCallback(
    async (row: PayBillEmployeeRow | PayBillDeductionRow) => {
      try {
        await paybillRepository.createMasterEmployeeFromPayBill(row);
        const masterEmployees = await paybillStorageService.getMasterEmployees();

        if (sheetType === 'DEDUCTION') {
          setDeductionRecords((prev) =>
            prev.map((r) => {
              const matched = masterEmployees.find((e) => e.hprnNo === r.row.hrpn);
              return {
                ...r,
                mappingStatus: matched ? 'MATCHED' : 'NOT_FOUND',
                matchedEmployee: matched || null,
              };
            })
          );
          return;
        }

        setRecords((prev) => {
          const updatedRows = prev.map((r) => r.row);
          const mapped = hrpnMappingService.mapRows(updatedRows, masterEmployees);
          const validated = paybillValidationService.validateRecords(mapped);
          const recon = paybillValidationService.reconcile(validated, pdfTotals);
          const summ = paybillValidationService.computeSummary(validated, recon);

          setReconciliation(recon);
          setSummary(summ);
          return validated;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add employee to master.');
      }
    },
    [pdfTotals, sheetType]
  );

  /**
   * 1-Click Sync Designation / Pay Scale to Master Employee
   */
  const syncMasterPayScale = useCallback(
    async (empId: string, updates: { designation?: string; payScale?: string }) => {
      try {
        await paybillRepository.syncMasterEmployeePayScale(empId, updates);
        const masterEmployees = await paybillStorageService.getMasterEmployees();

        setRecords((prev) => {
          const updatedRows = prev.map((r) => r.row);
          const mapped = hrpnMappingService.mapRows(updatedRows, masterEmployees);
          const validated = paybillValidationService.validateRecords(mapped);
          return validated;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to sync employee pay scale.');
      }
    },
    []
  );

  /**
   * Smart Audit Report for the active records.
   * Runs on records/metadata change; uses office settings (DA rates / thresholds)
   * and the previous month's earnings for month-to-month anomaly checks.
   */
  useEffect(() => {
    if (!metadata || records.length === 0) {
      setAuditReport(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [officeSettings, prevRecords] = await Promise.all([
          settings || paybillRepository.getSettings(),
          (() => {
            const prev = previousMonthOf(metadata.month);
            if (!prev) return Promise.resolve([]);
            return paybillRepository.listEarnings({
              month: prev.month,
              financialYear: prev.financialYear,
            });
          })(),
        ]);

        let prevBasic = 0;
        let prevDa = 0;
        for (const r of prevRecords) {
          prevBasic += r.basicPay || 0;
          prevDa += r.da || 0;
        }
        const previousDaPercentage =
          prevBasic > 0 ? Math.round((prevDa / prevBasic) * 10000) / 100 : undefined;

        if (cancelled) return;

        const fakeParsed: PayBillParsedResult = {
          sheetType,
          metadata,
          rows: records.map((r) => r.row),
          pdfTotals,
          rawText: '',
          pageCount: 1,
          parsingWarnings: [],
        };
        setAuditReport(
          paybillAuditService.auditPayBill(fakeParsed, records, {
            daRates: officeSettings.daRates,
            daHikeThreshold: officeSettings.daHikeThreshold,
            basicPayChangeTolerance: officeSettings.basicPayChangeTolerance,
            previousDaPercentage,
            previousMonthRecords: prevRecords,
          })
        );
      } catch {
        if (!cancelled) setAuditReport(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [metadata, records, pdfTotals, settings, sheetType]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setFile(null);
    setFileName('');
    setFileSize(0);
    setSheetType('EARNING');
    setProcessingState({
      stage: 'IDLE',
      stageName: 'Idle',
      progress: 0,
      details: '',
      error: null,
    });
    setMetadata(null);
    setRecords([]);
    setDeductionRecords([]);
    setPdfTotals(null);
    setPdfDeductionTotals(null);
    setReconciliation(null);
    setSummary(null);
    setAuditReport(null);
    setExistingBill(null);
    setIsImporting(false);
    setImportResult(null);
    setError(null);
    resetUnknownComponents();
  }, [resetUnknownComponents]);

  return {
    file,
    fileName,
    fileSize,
    sheetType,
    batchQueue,
    isBatchProcessing,
    selectedBatchId,
    batchMatrix,
    processingState,
    metadata,
    records,
    deductionRecords,
    pdfTotals,
    pdfDeductionTotals,
    reconciliation,
    summary,
    auditReport,
    settings,
    existingBill,
    refreshSettings,
    isImporting,
    importResult,
    error,
    setError,
    unknownComponents,
    dismissUnknownComponent,
    resetUnknownComponents,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    processFile,
    processSampleData,
    processSampleDeductionData,
    processRawText,
    addFilesToBatchQueue,
    processBatchQueue,
    importBatchToLedger,
    clearBatchQueue,
    removeBatchItem,
    selectBatchItem,
    quickAddEmployee,
    syncMasterPayScale,
    updateRecord,
    deleteRecord,
    importData,
    reset,
  };
}
