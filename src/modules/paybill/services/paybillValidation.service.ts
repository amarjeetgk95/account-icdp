import type {
  PayBillExtractedRecord,
  PayBillTotalRow,
  PayBillReconciliation,
  PayBillImportSummary,
  ReconciliationItem,
} from '../types';

export class PayBillValidationService {
  /**
   * Validate individual records for arithmetic correctness and required values
   */
  validateRecords(records: PayBillExtractedRecord[]): PayBillExtractedRecord[] {
    return records.map((record) => {
      const { row } = record;
      const errors = [...record.errors];
      const warnings = [...record.warnings];

      // 1. Math check: Gross = Basic + DA + HRA + CLA + Medical + Transport + SpecialPay + Washing + NPP + Other
      const sumAllowances =
        (row.basicPay || 0) +
        (row.da || 0) +
        (row.hra || 0) +
        (row.cla || 0) +
        (row.medicalAllowance || 0) +
        (row.transportAllowance || 0) +
        (row.specialPay || 0) +
        (row.washingAllowance || 0) +
        (row.nonPrivatePracticeAllowance || 0) +
        (row.otherAllowance || 0);

      const roundedSum = Math.round(sumAllowances * 100) / 100;
      const roundedGross = Math.round((row.grossAmount || 0) * 100) / 100;

      if (Math.abs(roundedSum - roundedGross) > 1.0) {
        errors.push(
          `Gross amount (${roundedGross}) does not match sum of allowances (${roundedSum})`
        );
      }

      // 2. Negative checks
      const fields: Array<[string, number | undefined]> = [
        ['Basic Pay', row.basicPay],
        ['DA', row.da],
        ['HRA', row.hra],
        ['CLA', row.cla],
        ['Medical Allowance', row.medicalAllowance],
        ['Transport Allowance', row.transportAllowance],
        ['Special Pay', row.specialPay],
        ['Washing Allowance', row.washingAllowance],
        ['NPP Allowance', row.nonPrivatePracticeAllowance],
        ['Gross Amount', row.grossAmount],
      ];

      for (const [label, val] of fields) {
        if (val !== undefined && val < 0) {
          errors.push(`${label} cannot be negative (${val})`);
        }
      }

      // 3. Mandatory amounts
      if (row.basicPay <= 0) {
        warnings.push('Basic pay is 0 or missing');
      }
      if (row.grossAmount <= 0) {
        errors.push('Gross amount must be greater than 0');
      }

      // 4. Employee Name
      if (!row.employeeName || row.employeeName.trim().length < 2) {
        errors.push('Employee name is required');
      }

      // Determine overall validation status
      const validationStatus =
        errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'VALID';

      return {
        ...record,
        errors: Array.from(new Set(errors)),
        warnings: Array.from(new Set(warnings)),
        validationStatus,
      };
    });
  }

  /**
   * Calculate column totals from extracted employee rows
   */
  calculateTotals(records: PayBillExtractedRecord[]): PayBillTotalRow {
    const totals: PayBillTotalRow = {
      basicPay: 0,
      da: 0,
      hra: 0,
      cla: 0,
      medicalAllowance: 0,
      transportAllowance: 0,
      specialPay: 0,
      washingAllowance: 0,
      nonPrivatePracticeAllowance: 0,
      otherAllowance: 0,
      grossAmount: 0,
    };

    const round = (n: number) => Math.round(n * 100) / 100;

    for (const rec of records) {
      totals.basicPay = round(totals.basicPay + (rec.row.basicPay || 0));
      totals.da = round(totals.da + (rec.row.da || 0));
      totals.hra = round(totals.hra + (rec.row.hra || 0));
      totals.cla = round(totals.cla + (rec.row.cla || 0));
      totals.medicalAllowance = round(totals.medicalAllowance + (rec.row.medicalAllowance || 0));
      totals.transportAllowance = round(totals.transportAllowance + (rec.row.transportAllowance || 0));
      totals.specialPay = round((totals.specialPay || 0) + (rec.row.specialPay || 0));
      totals.washingAllowance = round((totals.washingAllowance || 0) + (rec.row.washingAllowance || 0));
      totals.nonPrivatePracticeAllowance = round(
        totals.nonPrivatePracticeAllowance + (rec.row.nonPrivatePracticeAllowance || 0)
      );
      totals.otherAllowance = round((totals.otherAllowance || 0) + (rec.row.otherAllowance || 0));
      totals.grossAmount = round(totals.grossAmount + (rec.row.grossAmount || 0));
    }

    return totals;
  }

  /**
   * Reconcile PDF totals against calculated row sums
   */
  reconcile(
    records: PayBillExtractedRecord[],
    pdfTotals: PayBillTotalRow | null
  ): PayBillReconciliation {
    const calc = this.calculateTotals(records);

    if (!pdfTotals) {
      return {
        isGrossMatched: true,
        isAllMatched: true,
        pdfGross: calc.grossAmount,
        calculatedGross: calc.grossAmount,
        diff: 0,
        status: 'MATCHED',
        message: `Calculated Gross: ₹${calc.grossAmount.toLocaleString('en-IN')} (PDF Total row was not detected)`,
        items: [],
      };
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    const diff = round(calc.grossAmount - pdfTotals.grossAmount);
    const isGrossMatched = Math.abs(diff) < 1.0;

    const columnDefs: Array<{ key: keyof PayBillTotalRow; label: string }> = [
      { key: 'basicPay', label: 'Basic Pay' },
      { key: 'da', label: 'DA' },
      { key: 'hra', label: 'HRA' },
      { key: 'cla', label: 'CLA' },
      { key: 'medicalAllowance', label: 'Medical' },
      { key: 'transportAllowance', label: 'Transport' },
      { key: 'specialPay', label: 'Special Pay' },
      { key: 'washingAllowance', label: 'Washing' },
      { key: 'nonPrivatePracticeAllowance', label: 'NPP' },
      { key: 'grossAmount', label: 'Gross Amount' },
    ];

    const items: ReconciliationItem[] = columnDefs
      .filter(({ key }) => (calc[key] || 0) > 0 || (pdfTotals[key] || 0) > 0 || key === 'grossAmount' || key === 'basicPay' || key === 'da')
      .map(({ key, label }) => {
        const p = round(pdfTotals[key] || 0);
        const c = round(calc[key] || 0);
        const d = round(c - p);
        return {
          key,
          label,
          pdfTotal: p,
          calculatedTotal: c,
          diff: d,
          isMatched: Math.abs(d) < 1.0,
        };
      });

    const isAllMatched = items.every((i) => i.isMatched);
    const status = isGrossMatched ? 'MATCHED' : 'MISMATCH';

    let message = '';
    if (isGrossMatched && isAllMatched) {
      message = `PDF Gross Total (₹${pdfTotals.grossAmount.toLocaleString('en-IN')}) and Calculated Gross Total (₹${calc.grossAmount.toLocaleString('en-IN')}) match perfectly.`;
    } else if (isGrossMatched) {
      message = `Gross total matches (₹${calc.grossAmount.toLocaleString('en-IN')}), but some sub-column allowances have minor reconciliation differences.`;
    } else {
      message = `WARNING: PDF Gross Total (₹${pdfTotals.grossAmount.toLocaleString('en-IN')}) and Calculated Total (₹${calc.grossAmount.toLocaleString('en-IN')}) do not match. Difference: ₹${diff.toLocaleString('en-IN')}.`;
    }

    return {
      isGrossMatched,
      isAllMatched,
      pdfGross: pdfTotals.grossAmount,
      calculatedGross: calc.grossAmount,
      diff,
      status,
      message,
      items,
    };
  }

  /**
   * Compute complete summary statistics for the import batch
   */
  computeSummary(
    records: PayBillExtractedRecord[],
    reconciliation: PayBillReconciliation
  ): PayBillImportSummary {
    let matchedCount = 0;
    let notFoundCount = 0;
    let duplicateCount = 0;
    let invalidHrpnCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (const r of records) {
      if (r.mappingStatus === 'MATCHED') matchedCount++;
      else if (r.mappingStatus === 'NOT_FOUND') notFoundCount++;
      else if (r.mappingStatus === 'DUPLICATE') duplicateCount++;
      else if (r.mappingStatus === 'INVALID_HRPN') invalidHrpnCount++;

      if (r.validationStatus === 'ERROR' || r.errors.length > 0) errorCount++;
      if (r.validationStatus === 'WARNING' || r.warnings.length > 0) warningCount++;
    }

    const readyCount = records.filter(
      (r) => r.errors.length === 0 && r.mappingStatus !== 'INVALID_HRPN'
    ).length;

    return {
      totalRecords: records.length,
      matchedCount,
      notFoundCount,
      duplicateCount,
      invalidHrpnCount,
      errorCount,
      warningCount,
      readyCount,
      reconciliationStatus: reconciliation.status,
      pdfGrossTotal: reconciliation.pdfGross,
      calculatedGrossTotal: reconciliation.calculatedGross,
    };
  }
}

export const paybillValidationService = new PayBillValidationService();
