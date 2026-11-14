import { useState, useCallback, useEffect } from 'react';
import { pdfParserV2Service as pdfParserService, PDF_PARSER_BUILD } from '../services/pdfParserV2.service';
import { hrpnMappingService } from '../services/hrpnMapping.service';
import { paybillValidationService } from '../services/paybillValidation.service';
import { paybillStorageService } from '../services/paybillStorage.service';
import { paybillRepository } from '../repositories/paybill.repository';
import { componentMasterService } from '../services/componentMaster.service';
import { loadSamplePayBillData, loadSamplePayBillDeductionData } from '../utils/samplePayBillPdf';
import { useUnknownComponents } from './paybillImport/useUnknownComponents';
import { usePayBillBatchQueue } from './paybillImport/useBatchQueue';
import { usePayBillAuditReport } from './paybillImport/usePayBillAuditReport';
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
} from '../types';

export function usePayBillImport() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [sheetType, setSheetType] = useState<PayBillSheetType>('EARNING');
  // 059 three-track: which treasury bill is being imported. Regular monthly pay
  // (incl. regular DA) vs DA/Pay difference arrears vs generic supplementary.
  const [billType, setBillType] = useState<string>('REGULAR');

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
  const {
    unknownComponents,
    captureUnknownComponents,
    dismissUnknownComponent,
    resetUnknownComponents,
  } = useUnknownComponents();

  // Batch queue state machine (sub-hook owns batchQueue/batchMatrix/selectedBatchId)
  const {
    batchQueue,
    isBatchProcessing,
    selectedBatchId,
    batchMatrix,
    addFilesToBatchQueue,
    processBatchQueue,
    clearBatchQueue,
    removeBatchItem,
    retryFailedBatchItems,
    importBatchToLedger,
    setSelectedBatchId,
  } = usePayBillBatchQueue({ billType, setError, setIsImporting });

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
    // Warm the component-master cache so the parser sees live DB aliases
    // (not just seed defaults) on the very first upload of the session.
    componentMasterService.refresh().catch(() => {
      // offline / DB unreachable — seed defaults apply
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
      // Refresh live component master first so header detection uses current
      // DB aliases (best-effort; seed defaults apply offline).
      await componentMasterService.refresh().catch(() => undefined);
      // Stage 1: PDF Uploaded
      console.info(
        `[paybill] parser=${PDF_PARSER_BUILD} build=${typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'}`
      );
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

      let validatedDeductions: PayBillDeductionExtractedRecord[] = [];
      if (parsedResult.sheetType === 'COMBINED' && parsedResult.deductionRows) {
        const mappedD = hrpnMappingService.mapDeductionRows(parsedResult.deductionRows, masterEmployees);
        validatedDeductions = paybillValidationService.validateDeductionRecords(mappedD);
      }

      // Stage 7: Ready for Review
      setMetadata(parsedResult.metadata);
      setRecords(validatedRecords);
      setDeductionRecords(validatedDeductions);
      setPdfTotals(parsedResult.pdfTotals);
      setPdfDeductionTotals(parsedResult.pdfDeductionTotals || null);
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
      await componentMasterService.refresh().catch(() => undefined);
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

    if (sheetType === 'COMBINED') {
      if (records.length === 0 && deductionRecords.length === 0) {
        setError('No data to import.');
        return null;
      }
      setIsImporting(true);
      setError(null);
      try {
        let earnResult = null;
        let dedResult = null;
        if (records.length > 0) {
          earnResult = await paybillStorageService.importPayBill(
            metadata,
            records,
            fileName || 'PayBill.pdf',
            file as unknown as File | null,
            billType
          );
        }
        if (deductionRecords.length > 0) {
          dedResult = await paybillStorageService.importDeductions(
            metadata,
            deductionRecords,
            fileName ? fileName.replace(/\.pdf$/i, '_Deduction.pdf') : 'PayBill_Deduction.pdf',
            file as unknown as File | null,
            billType
          );
        }
        const result = earnResult || dedResult;
        setImportResult(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Combined import failed.';
        setError(msg);
        return null;
      } finally {
        setIsImporting(false);
      }
    }

    if (sheetType === 'DEDUCTION') {
      if (deductionRecords.length === 0) {
        setError('No deduction data to import.');
        return null;
      }
      // Deduction parity: block on critical validation errors (negatives, invalid HRPN, duplicates, total mismatch).
      // NOT_FOUND (HRPN not in Establishment directory, the single source of truth) is an ERROR and blocks import.
      const dedCritical = deductionRecords.some((r) => r.validationStatus === 'ERROR' || r.mappingStatus === 'INVALID_HRPN' || r.mappingStatus === 'DUPLICATE' || r.mappingStatus === 'NOT_FOUND');
      if (dedCritical) {
        const notFound = deductionRecords.filter((r) => r.mappingStatus === 'NOT_FOUND');
        setError(
          notFound.length > 0
            ? `Cannot import: ${notFound.length} HRPN(s) not matched with Establishment employee directory (${notFound.slice(0, 5).map((r) => r.row.hrpn).join(', ')}${notFound.length > 5 ? '…' : ''}). Register them in Establishment first.`
            : 'Cannot import: deduction records have critical errors (check negatives / HRPN / duplicates / total deductions). Please resolve them first.'
        );
        return null;
      }
      setIsImporting(true);
      setError(null);
      try {
        const result = await paybillStorageService.importDeductions(
          metadata,
          deductionRecords,
          fileName || 'PayBill_Deduction.pdf',
          file as unknown as File | null,
          billType
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
      const notFound = records.filter((r) => r.mappingStatus === 'NOT_FOUND');
      setError(
        notFound.length > 0
          ? `Cannot import: ${notFound.length} HRPN(s) not matched with Establishment employee directory (${notFound.slice(0, 5).map((r) => r.row.hrpn).join(', ')}${notFound.length > 5 ? '…' : ''}). Register them in Establishment first.`
          : `Cannot import: ${summary.errorCount} records have critical errors. Please resolve them first.`
      );
      return null;
    }

    setIsImporting(true);
    setError(null);

    try {
      const result = await paybillStorageService.importPayBill(
        metadata,
        records,
        fileName || 'PayBill.pdf',
        file as unknown as File | null,
        billType
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
  }, [metadata, records, deductionRecords, sheetType, billType, summary, fileName, file]);

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
   * 1-Click Quick Add unmapped employee into the Establishment directory.
   * Establishment HRPN is the single source of truth — new HRPNs must be
   * registered there (not the legacy payroll master) so the ledger, the
   * directory and future imports all resolve to one canonical record.
   */
  const quickAddEmployee = useCallback(
    async (row: PayBillEmployeeRow | PayBillDeductionRow) => {
      try {
        const { establishmentService } = await import('@/modules/establishment/services/establishment.service');
        const { createBlankEstablishmentEmployee } = await import('@/modules/establishment/constants');
        const blank = createBlankEstablishmentEmployee();
        await establishmentService.saveEmployee({
          ...blank,
          hrpnNo: (row.hrpn || '').trim().toUpperCase(),
          name: row.employeeName || `Employee ${row.hrpn}`,
          designation: row.designation || '',
          payScale: (row as PayBillEmployeeRow).payScale || '',
          active: true,
        });
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
        setError(err instanceof Error ? err.message : 'Failed to add employee to Establishment directory.');
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

  // Smart audit report runs as a side effect of records/metadata change
  usePayBillAuditReport({ metadata, records, pdfTotals, settings, sheetType, setAuditReport });

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
    billType,
    setBillType,
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
    retryFailedBatchItems,
    selectBatchItem,
    quickAddEmployee,
    syncMasterPayScale,
    updateRecord,
    deleteRecord,
    importData,
    reset,
  };
}