import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { pdfParserV2Service as pdfParserService } from '../../services/pdfParserV2.service';
import { componentMasterService } from '../../services/componentMaster.service';
import { paybillStorageService } from '../../services/paybillStorage.service';
import { paybillRepository } from '../../repositories/paybill.repository';
import { hrpnMappingService } from '../../services/hrpnMapping.service';
import { paybillValidationService } from '../../services/paybillValidation.service';
import { toast } from '@/shared/components/Toast';
import { buildBatchMatrix } from './batchMatrix';
import type { BatchFileItem, PayBillBatchMatrix } from '../../types';

interface UsePayBillBatchQueueParams {
  billType: string;
  setError: Dispatch<SetStateAction<string | null>>;
  setIsImporting: Dispatch<SetStateAction<boolean>>;
}

/**
 * Batch-queue state machine for the paybill multi-file import:
 * queue management, per-file parsing with duplicate/validation gates, and the
 * consolidated batch matrix. Pure ledger import shared with the single-file
 * path via paybillStorageService.
 */
export function usePayBillBatchQueue({ billType, setError, setIsImporting }: UsePayBillBatchQueueParams) {
// Batch queue state
const [batchQueue, setBatchQueue] = useState<BatchFileItem[]>([]);
const [isBatchProcessing, setIsBatchProcessing] = useState(false);
const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
const [batchMatrix, setBatchMatrix] = useState<PayBillBatchMatrix | null>(null);

/**
 * Add multiple PDF files to batch processing queue
 * Guards against adding the same file twice (name+size) within the current queue.
 */
const addFilesToBatchQueue = useCallback((newFiles: File[]) => {
  const pdfs = newFiles.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
  setBatchQueue((prev) => {
    const existingKeys = new Set(prev.map((p) => `${p.name}::${p.size}`));
    const items: BatchFileItem[] = [];
    let skipped = 0;
    for (const f of pdfs) {
      const key = `${f.name}::${f.size}`;
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }
      existingKeys.add(key);
      items.push({
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        name: f.name,
        size: f.size,
        status: 'PENDING',
      });
    }
    if (skipped > 0) {
      setError(`${skipped} file(s) were already in the queue and were skipped.`);
    }
    return [...prev, ...items];
  });
}, []);

/**
 * Process all files in batch queue sequentially
 * Improvements: per-file duplicate-bill guard, validation gates, confidence capture, BLOCKED status for bad files.
 */
const processBatchQueue = useCallback(async () => {
  if (batchQueue.length === 0) return;
  setIsBatchProcessing(true);
  setError(null);

  await componentMasterService.refresh().catch(() => undefined);
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
    // Skip already successful items; allow retry for ERROR/BLOCKED by reprocessing them
    if (item.status === 'SUCCESS') {
      succeededItems.push(item);
      continue;
    }

    setBatchQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'PARSING' } : q))
    );

    try {
      const parsed = await pdfParserService.parsePdf(item.file);
      const confidence = parsed.detection?.confidence ?? 100;

      // Duplicate bill guard (same bill_no + month + sheet side already imported)
      const dup = parsed.metadata.billNo
        ? await paybillRepository.findImportByBillNo(parsed.metadata.billNo, {
            month: parsed.metadata.month,
            financialYear: paybillStorageService.parseMonthAndFy(parsed.metadata.month).financialYear,
            sheetType: parsed.sheetType,
          } as unknown as { month?: string; financialYear?: number; sheetType?: import('../../types').PayBillSheetType })
        : null;

      if (dup) {
        const blocked: BatchFileItem = {
          ...item,
          status: 'BLOCKED',
          month: parsed.metadata.month,
          billNo: parsed.metadata.billNo,
          sheetType: parsed.sheetType,
          parsedResult: parsed,
          confidence,
          hasCriticalErrors: false,
          hasDuplicates: false,
          error: `Duplicate bill ${dup.billNo} for ${dup.month}-${dup.financialYear} (${dup.sheetType}) already exists.`,
        };
        setBatchQueue((prev) => prev.map((q) => (q.id === item.id ? blocked : q)));
        continue;
      }

      if (parsed.sheetType === 'COMBINED') {
        const earnRowCount = parsed.rows?.length || 0;
        const dedRowCount = parsed.deductionRows?.length || 0;
        const mappedE = hrpnMappingService.mapRows(parsed.rows || [], masterEmployees);
        const validatedE = paybillValidationService.validateRecords(mappedE);
        const recon = paybillValidationService.reconcile(validatedE, parsed.pdfTotals);
        const mappedD = hrpnMappingService.mapDeductionRows(parsed.deductionRows || [], masterEmployees);
        const validatedD = paybillValidationService.validateDeductionRecords(mappedD);

        const hasCriticalE = validatedE.some((r) => r.validationStatus === 'ERROR' || r.mappingStatus === 'INVALID_HRPN' || r.mappingStatus === 'NOT_FOUND');
        const hasCriticalD = validatedD.some((r) => r.validationStatus === 'ERROR' || r.mappingStatus === 'INVALID_HRPN' || r.mappingStatus === 'NOT_FOUND');
        const hasDuplicatesE = validatedE.some((r) => r.mappingStatus === 'DUPLICATE');
        const hasDuplicatesD = validatedD.some((r) => r.mappingStatus === 'DUPLICATE');
        const hasUnmatched = validatedE.some((r) => r.mappingStatus === 'NOT_FOUND') || validatedD.some((r) => r.mappingStatus === 'NOT_FOUND');
        const hasReconciliationMismatch = recon.status === 'MISMATCH' && recon.diff !== 0 && Math.abs(recon.diff) > 1;
        const hasZeroRecords = earnRowCount === 0 && dedRowCount === 0;
        const isFailed = hasZeroRecords || hasCriticalE || hasCriticalD || hasDuplicatesE || hasDuplicatesD || (hasReconciliationMismatch && validatedE.length > 0) || confidence < 50;

        const updated: BatchFileItem = {
          ...item,
          status: isFailed ? 'ERROR' : 'SUCCESS',
          month: parsed.metadata.month,
          billNo: parsed.metadata.billNo,
          sheetType: 'COMBINED',
          parsedResult: parsed,
          recordCount: Math.max(earnRowCount, dedRowCount),
          grossTotal: parsed.pdfTotals?.grossAmount || parsed.pdfDeductionTotals?.totalDeductions || 0,
          confidence,
          hasCriticalErrors: hasCriticalE || hasCriticalD,
          hasDuplicates: hasDuplicatesE || hasDuplicatesD,
          error: isFailed
            ? hasZeroRecords
              ? 'Failed: 0 employee records found in file.'
              : (hasDuplicatesE || hasDuplicatesD)
                ? 'Failed: Duplicate employee HRPNs in file.'
                : hasUnmatched
                  ? 'Failed: HRPN(s) not matched with Establishment employee directory — register them in Establishment first.'
                  : (hasCriticalE || hasCriticalD)
                    ? 'Failed: Critical validation errors on employee records.'
                    : confidence < 50
                      ? `Failed: Low extraction confidence (${confidence}%).`
                      : 'Failed to extract entries.'
            : undefined,
        };
        setBatchQueue((prev) => prev.map((q) => (q.id === item.id ? updated : q)));
        if (!isFailed) succeededItems.push(updated);
      } else if (parsed.sheetType === 'DEDUCTION' && parsed.deductionRows) {
        const rowCount = parsed.deductionRows?.length || 0;
        const mapped = hrpnMappingService.mapDeductionRows(parsed.deductionRows, masterEmployees);
        const validated = paybillValidationService.validateDeductionRecords(mapped);
        const hasCritical = validated.some((r) => r.validationStatus === 'ERROR' || r.mappingStatus === 'INVALID_HRPN' || r.mappingStatus === 'NOT_FOUND');
        const hasDuplicates = validated.some((r) => r.mappingStatus === 'DUPLICATE');
        const hasUnmatched = validated.some((r) => r.mappingStatus === 'NOT_FOUND');
        const hasZeroRecords = rowCount === 0;
        const isFailed = hasZeroRecords || hasCritical || hasDuplicates || confidence < 50;

        const updated: BatchFileItem = {
          ...item,
          status: isFailed ? 'ERROR' : 'SUCCESS',
          month: parsed.metadata.month,
          billNo: parsed.metadata.billNo,
          sheetType: 'DEDUCTION',
          parsedResult: parsed,
          recordCount: rowCount,
          grossTotal: parsed.pdfDeductionTotals?.totalDeductions || 0,
          confidence,
          hasCriticalErrors: hasCritical,
          hasDuplicates,
          error: isFailed
            ? hasZeroRecords
              ? 'Failed: 0 employee deduction records found in file.'
              : hasDuplicates
                ? 'Failed: Duplicate employee HRPNs in file.'
                : hasUnmatched
                  ? 'Failed: HRPN(s) not matched with Establishment employee directory — register them in Establishment first.'
                  : hasCritical
                  ? 'Failed: Critical validation errors on employee records.'
                  : confidence < 50
                    ? `Failed: Low extraction confidence (${confidence}%).`
                    : 'Failed to extract deduction entries.'
            : undefined,
        };
        setBatchQueue((prev) => prev.map((q) => (q.id === item.id ? updated : q)));
        if (!isFailed) succeededItems.push(updated);
      } else {
        const rowCount = parsed.rows?.length || 0;
        const mapped = hrpnMappingService.mapRows(parsed.rows || [], masterEmployees);
        const validated = paybillValidationService.validateRecords(mapped);
        const recon = paybillValidationService.reconcile(validated, parsed.pdfTotals);
        const hasCritical = validated.some((r) => r.validationStatus === 'ERROR' || r.mappingStatus === 'INVALID_HRPN' || r.mappingStatus === 'NOT_FOUND');
        const hasDuplicates = validated.some((r) => r.mappingStatus === 'DUPLICATE');
        const hasUnmatched = validated.some((r) => r.mappingStatus === 'NOT_FOUND');
        const hasReconciliationMismatch = recon.status === 'MISMATCH' && recon.diff !== 0 && Math.abs(recon.diff) > 1;
        const hasZeroRecords = rowCount === 0;
        const isFailed = hasZeroRecords || hasCritical || hasDuplicates || (hasReconciliationMismatch && validated.length > 0) || confidence < 50;

        const updated: BatchFileItem = {
          ...item,
          status: isFailed ? 'ERROR' : 'SUCCESS',
          month: parsed.metadata.month,
          billNo: parsed.metadata.billNo,
          sheetType: 'EARNING',
          parsedResult: parsed,
          recordCount: rowCount,
          grossTotal: parsed.pdfTotals?.grossAmount || 0,
          confidence,
          hasCriticalErrors: hasCritical,
          hasDuplicates,
          error: isFailed
            ? hasZeroRecords
              ? 'Failed: 0 employee records found in file.'
              : hasDuplicates
                ? 'Failed: Duplicate employee HRPNs in file.'
                : hasUnmatched
                  ? 'Failed: HRPN(s) not matched with Establishment employee directory — register them in Establishment first.'
                  : hasCritical
                  ? 'Failed: Critical validation errors on employee records.'
                  : hasReconciliationMismatch
                    ? `Failed: Gross amount mismatch (${recon.message})`
                    : confidence < 50
                      ? `Failed: Low extraction confidence (${confidence}%).`
                      : 'Failed to extract employee entries.'
            : undefined,
        };
        setBatchQueue((prev) => prev.map((q) => (q.id === item.id ? updated : q)));
        if (!isFailed) succeededItems.push(updated);
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

  const failedCount = batchQueue.length - succeededItems.length;
  if (failedCount > 0) {
    toast.error(`Batch processing completed: ${succeededItems.length} parsed, ${failedCount} failed.`);
  } else if (succeededItems.length > 0) {
    toast.success(`Batch processing completed: all ${succeededItems.length} pay bills parsed successfully.`);
  }

  if (succeededItems.length > 0) {
    setBatchMatrix(buildBatchMatrix(succeededItems));
  } else {
    setBatchMatrix(null);
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
 * Reset failed / blocked items to PENDING so the user can fix source files and retry only those.
 */
const retryFailedBatchItems = useCallback(() => {
  setBatchQueue((prev) =>
    prev.map((q) =>
      q.status === 'ERROR' || q.status === 'BLOCKED' ? { ...q, status: 'PENDING' as const, error: undefined, hasCriticalErrors: undefined, hasDuplicates: undefined } : q
    )
  );
  setBatchMatrix(null);
  setError(null);
}, []);

/**
 * Save ALL successfully parsed batch files into the ledger at once.
 * Skips BLOCKED/ERROR files; surfaces per-file failures. Passes file for hash.
 * Returns per-file import counts; on partial failure, sets an error message.
 */
const importBatchToLedger = useCallback(async (): Promise<{
  imported: number;
  failed: number;
  total: number;
} | null> => {
  const successItems = batchQueue.filter((q) => q.status === 'SUCCESS' && q.parsedResult);
  if (successItems.length === 0) {
    const blocked = batchQueue.filter((q) => q.status === 'BLOCKED');
    if (blocked.length > 0) {
      setError(
        `${blocked.length} file(s) have validation issues and are blocked. Review each blocked file, fix errors, then retry. Only successful files can be saved.`
      );
    } else {
      setError('No processed files to save. Please run Process All first.');
    }
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
        if (parsed.sheetType === 'COMBINED') {
          if (parsed.rows && parsed.rows.length > 0) {
            const mappedE = hrpnMappingService.mapRows(parsed.rows, masterEmployees);
            const valE = paybillValidationService.validateRecords(mappedE);
            if (valE.some((r) => r.validationStatus === 'ERROR')) {
              throw new Error('Critical validation errors in earnings — re-validate before saving.');
            }
            await paybillStorageService.importPayBill(parsed.metadata, valE, item.name, item.file, billType);
          }
          if (parsed.deductionRows && parsed.deductionRows.length > 0) {
            const mappedD = hrpnMappingService.mapDeductionRows(parsed.deductionRows, masterEmployees);
            const valD = paybillValidationService.validateDeductionRecords(mappedD);
            if (valD.some((r) => r.validationStatus === 'ERROR')) {
              throw new Error('Critical validation errors in deductions — re-validate before saving.');
            }
            await paybillStorageService.importDeductions(parsed.metadata, valD, item.name, item.file, billType);
          }
        } else if (parsed.sheetType === 'DEDUCTION' && parsed.deductionRows) {
          const mapped = hrpnMappingService.mapDeductionRows(parsed.deductionRows, masterEmployees);
          const validated = paybillValidationService.validateDeductionRecords(mapped);
          // Final gate: if critical errors emerged since parsing, skip
          if (validated.some((r) => r.validationStatus === 'ERROR')) {
            throw new Error('Critical validation errors present — re-validate before saving.');
          }
          await paybillStorageService.importDeductions(parsed.metadata, validated, item.name, item.file, billType);
        } else {
          const mapped = hrpnMappingService.mapRows(parsed.rows, masterEmployees);
          const validated = paybillValidationService.validateRecords(mapped);
          if (validated.some((r) => r.validationStatus === 'ERROR')) {
            throw new Error('Critical validation errors present — re-validate before saving.');
          }
          await paybillStorageService.importPayBill(parsed.metadata, validated, item.name, item.file, billType);
        }
        imported += 1;
        // Mark item as imported in queue to prevent re-import
        setBatchQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'SUCCESS' as const } : q)));
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : 'Import failed';
        failures.push(`${item.name}: ${msg}`);
        setBatchQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'ERROR' as const, error: msg } : q))
        );
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
}, [batchQueue, billType]);

  return {
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
  };
}
