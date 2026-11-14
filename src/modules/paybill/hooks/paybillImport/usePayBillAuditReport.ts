import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { paybillRepository } from '../../repositories/paybill.repository';
import { paybillAuditService } from '../../services/paybillAudit.service';
import { previousMonthOf } from './batchMatrix';
import type {
  PayBillAuditReport,
  PayBillExtractedRecord,
  PayBillMetadata,
  PayBillParsedResult,
  PayBillSettings,
  PayBillTotalRow,
  PayBillSheetType,
} from '../../types';

interface UsePayBillAuditReportParams {
  metadata: PayBillMetadata | null;
  records: PayBillExtractedRecord[];
  pdfTotals: PayBillTotalRow | null;
  settings: PayBillSettings | null;
  sheetType: PayBillSheetType;
  setAuditReport: Dispatch<SetStateAction<PayBillAuditReport | null>>;
}

/**
 * Smart Audit Report for the active records.
 * Runs on records/metadata change; uses office settings (DA rates / thresholds)
 * and the previous month's earnings for month-to-month anomaly checks.
 * Extracted from usePayBillImport; behaviour is identical.
 */
export function usePayBillAuditReport({ metadata, records, pdfTotals, settings, sheetType, setAuditReport }: UsePayBillAuditReportParams): void {
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
}
