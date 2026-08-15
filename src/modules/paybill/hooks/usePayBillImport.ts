import { useState, useCallback } from 'react';
import { pdfParserService } from '../services/pdfParser.service';
import { hrpnMappingService } from '../services/hrpnMapping.service';
import { paybillValidationService } from '../services/paybillValidation.service';
import { paybillStorageService } from '../services/paybillStorage.service';
import { loadSamplePayBillData } from '../utils/samplePayBillPdf';
import type {
  PayBillMetadata,
  PayBillExtractedRecord,
  PayBillTotalRow,
  PayBillReconciliation,
  PayBillImportSummary,
  PayBillProcessingState,
  PayBillImportResult,
  PayBillEmployeeRow,
  ProcessingStage,
} from '../types';

export function usePayBillImport() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);

  const [processingState, setProcessingState] = useState<PayBillProcessingState>({
    stage: 'IDLE',
    stageName: 'Idle',
    progress: 0,
    details: '',
    error: null,
  });

  const [metadata, setMetadata] = useState<PayBillMetadata | null>(null);
  const [records, setRecords] = useState<PayBillExtractedRecord[]>([]);
  const [pdfTotals, setPdfTotals] = useState<PayBillTotalRow | null>(null);
  const [reconciliation, setReconciliation] = useState<PayBillReconciliation | null>(null);
  const [summary, setSummary] = useState<PayBillImportSummary | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<PayBillImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
      await delay(120);

      // Stage 3: Detecting Table
      updateStage('DETECTING_TABLE', 'Detecting Table', 50, `Detected Bill ${parsedResult.metadata.billNo || 'Metadata'} & column alignments`);
      await delay(100);

      // Stage 4: Extracting HRPN
      updateStage('EXTRACTING_HRPN', 'Extracting HRPN', 65, `Extracted ${parsedResult.rows.length} employee records with HRPN keys`);
      await delay(100);

      // Stage 5: Mapping Employees
      updateStage('MAPPING_EMPLOYEES', 'Mapping Employees', 80, 'Matching extracted HRPNs with Master Employee dataset...');
      const masterEmployees = await paybillStorageService.getMasterEmployees();
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
      setPdfTotals(parsedResult.pdfTotals);
      setReconciliation(recon);
      setSummary(summ);

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
  }, []);

  /**
   * Quick-load sample PDF dataset (July-2026, 4 employees, Gross ₹892,314)
   */
  const processSampleData = useCallback(async () => {
    setFileName('Sample_PayBill_July_2026.pdf');
    setFileSize(38420);
    setError(null);
    setImportResult(null);

    try {
      updateStage('UPLOADED', 'PDF Uploaded', 15, 'Loaded Sample Paybill Inner Sheet');
      await delay(100);

      updateStage('READING', 'Reading PDF', 30, 'Reading PDF structure...');
      const parsedResult = loadSamplePayBillData();
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
      setPdfTotals(parsedResult.pdfTotals);
      setReconciliation(recon);
      setSummary(summ);

      updateStage('READY', 'Ready for Review', 100, 'Sample bill loaded: 4 employees matched, ₹892,314 gross reconciled.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample bill.';
      setError(msg);
    }
  }, []);

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

      updateStage('READY', 'Ready for Review', 100, 'Text parsed successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse text.';
      setError(msg);
    }
  }, []);

  /**
   * Update a record inline in the review table
   */
  const updateRecord = useCallback(
    async (id: string, updatedFields: Partial<PayBillEmployeeRow>) => {
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
    },
    [pdfTotals]
  );

  /**
   * Delete a record from the review table
   */
  const deleteRecord = useCallback(
    async (id: string) => {
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
    },
    [pdfTotals]
  );

  /**
   * Execute final import to master & monthly payroll
   */
  const importData = useCallback(async (): Promise<PayBillImportResult | null> => {
    if (!metadata || records.length === 0) {
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
  }, [metadata, records, summary, fileName]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setFile(null);
    setFileName('');
    setFileSize(0);
    setProcessingState({
      stage: 'IDLE',
      stageName: 'Idle',
      progress: 0,
      details: '',
      error: null,
    });
    setMetadata(null);
    setRecords([]);
    setPdfTotals(null);
    setReconciliation(null);
    setSummary(null);
    setIsImporting(false);
    setImportResult(null);
    setError(null);
  }, []);

  return {
    file,
    fileName,
    fileSize,
    processingState,
    metadata,
    records,
    pdfTotals,
    reconciliation,
    summary,
    isImporting,
    importResult,
    error,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    processFile,
    processSampleData,
    processRawText,
    updateRecord,
    deleteRecord,
    importData,
    reset,
  };
}
