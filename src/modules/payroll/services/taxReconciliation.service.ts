import {
  taxReconciliationRepository,
  type QuarterRawData,
} from '../repositories/taxReconciliation.repository';

import type {
  TaxReconciliationReport,
  TaxReconciliationRow,
  TaxReconciliationSummary,
  TaxReconciliationMonthItem,
  TaxReconciliationStatus,
  SyncPaybillToPayrollPayload,
  SyncPaybillToPayrollResult,
  SyncPaybillToPayrollItem,
} from '../types/reconciliation';

export class TaxReconciliationService {
  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private normalizeHrpn(hrpn: string | null | undefined): string {
    if (!hrpn) return '';
    const clean = String(hrpn).trim().toUpperCase();
    if (['0', '-', 'NA', 'N/A', 'NULL', 'NIL', 'NONE'].includes(clean)) {
      return '';
    }
    return clean;
  }

  private normalizePan(pan: string | null | undefined): string {
    if (!pan) return '';
    const clean = String(pan).trim().toUpperCase();
    if (['UNMAPPED', 'NA', 'N/A', 'NULL', '-'].includes(clean)) return '';
    return clean;
  }

  private getHrpnVariants(hrpn: string | null | undefined): string[] {
    const norm = this.normalizeHrpn(hrpn);
    if (!norm) return [];
    const variants = new Set<string>([norm]);
    if (/^\d+$/.test(norm)) {
      const stripped = norm.replace(/^0+/, '');
      if (stripped) variants.add(stripped);
    }
    return Array.from(variants);
  }

  getMonthLabelsForQuarter(quarter: string, fy: number): Array<{ work: string; paid: string }> {
    const y1 = String(fy).slice(-2);
    const y2 = String(fy + 1).slice(-2);

    const quarterLabels: Record<
      string,
      { work: string[]; paid: string[]; workYear: number[]; paidYear: number[] }
    > = {
      Q1: { work: ['Mar', 'Apr', 'May'], paid: ['Apr', 'May', 'Jun'], workYear: [0, 0, 0], paidYear: [0, 0, 0] },
      Q2: { work: ['Jun', 'Jul', 'Aug'], paid: ['Jul', 'Aug', 'Sep'], workYear: [0, 0, 0], paidYear: [0, 0, 0] },
      Q3: { work: ['Sep', 'Oct', 'Nov'], paid: ['Oct', 'Nov', 'Dec'], workYear: [0, 0, 0], paidYear: [0, 0, 0] },
      Q4: { work: ['Dec', 'Jan', 'Feb'], paid: ['Jan', 'Feb', 'Mar'], workYear: [0, 1, 1], paidYear: [1, 1, 1] },
    };

    const cfg = quarterLabels[quarter] || quarterLabels.Q1;
    return cfg.work.map((_, i) => ({
      work: `${cfg.work[i]}-${cfg.workYear[i] ? y2 : y1}`,
      paid: `${cfg.paid[i]}-${cfg.paidYear[i] ? y2 : y1}`,
    }));
  }

  async getQuarterTaxReconciliation(
    quarter: string,
    fy: number,
    officeId?: string
  ): Promise<TaxReconciliationReport> {
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      throw new Error('Invalid quarter');
    }

    const rawData = await taxReconciliationRepository.getQuarterRawData(quarter, fy, officeId);
    return this.processReconciliationData(rawData);
  }

  processReconciliationData(rawData: QuarterRawData): TaxReconciliationReport {
    const { quarter, fy, months, employees, salaries, paybillDeductions, paybillEarnings } = rawData;

    // 1. Index Payroll Salaries: [String(empId)][month] -> { gross, da, tax }
    const salaryMap = new Map<string, Map<string, { gross: number; da: number; tax: number }>>();
    for (const s of salaries) {
      const empIdStr = String(s.employee_id);
      if (!salaryMap.has(empIdStr)) {
        salaryMap.set(empIdStr, new Map());
      }
      salaryMap.get(empIdStr)!.set(s.month, {
        gross: Number(s.gross) || 0,
        da: Number(s.da) || 0,
        tax: Number(s.tax) || 0,
      });
    }

    // 2. Index Paybill Deductions: [hrpn][month] -> { incomeTax, employeeName, employeeId }
    const pbDedMap = new Map<string, Map<string, { incomeTax: number; employeeName: string; employeeId: string | null }>>();
    for (const d of paybillDeductions) {
      const h = this.normalizeHrpn(d.hrpn);
      if (!h) continue;
      if (!pbDedMap.has(h)) {
        pbDedMap.set(h, new Map());
      }
      pbDedMap.get(h)!.set(d.month, {
        incomeTax: Number(d.income_tax) || 0,
        employeeName: d.employee_name || '',
        employeeId: d.employee_id ? String(d.employee_id) : null,
      });
    }

    // 3. Index Paybill Earnings: [hrpn][month] -> { grossAmount, da, basicPay, employeeName }
    const pbEarnMap = new Map<string, Map<string, { grossAmount: number; da: number; basicPay: number; employeeName: string }>>();
    for (const e of paybillEarnings) {
      const h = this.normalizeHrpn(e.hrpn);
      if (!h) continue;
      if (!pbEarnMap.has(h)) {
        pbEarnMap.set(h, new Map());
      }
      pbEarnMap.get(h)!.set(e.month, {
        grossAmount: Number(e.gross_amount) || 0,
        da: Number(e.da) || 0,
        basicPay: Number(e.basic_pay) || 0,
        employeeName: e.employee_name || '',
      });
    }

    // Paybill lookup by employeeId (if mapped in Paybill import)
    const pbHrpnByEmpId = new Map<string, string>();
    for (const d of paybillDeductions) {
      if (d.employee_id && d.hrpn) {
        const h = this.normalizeHrpn(d.hrpn);
        if (h) pbHrpnByEmpId.set(String(d.employee_id), h);
      }
    }
    for (const e of paybillEarnings) {
      if (e.employee_id && e.hrpn) {
        const h = this.normalizeHrpn(e.hrpn);
        if (h) pbHrpnByEmpId.set(String(e.employee_id), h);
      }
    }

    // Paybill lookup by employee Name as fallback
    const pbHrpnByName = new Map<string, string>();
    for (const d of paybillDeductions) {
      if (d.employee_name && d.hrpn) {
        const h = this.normalizeHrpn(d.hrpn);
        const nameKey = d.employee_name.trim().toLowerCase();
        if (h && nameKey) pbHrpnByName.set(nameKey, h);
      }
    }

    const rows: TaxReconciliationRow[] = [];
    const consumedPbHrpns = new Set<string>();

    // 4. Phase 1: Process every registered Payroll Employee
    for (const emp of employees) {
      const empIdStr = String(emp.id);
      const empHrpn = this.normalizeHrpn(emp.hprn_no);
      const empPan = this.normalizePan(emp.pan);
      const empNameKey = (emp.name || '').trim().toLowerCase();

      // Locate matching Paybill HRPN
      let matchedPbHrpn = '';

      // Match Attempt A: Exact or variant HRPN match
      const hrpnVariants = this.getHrpnVariants(emp.hprn_no);
      for (const variant of hrpnVariants) {
        if (pbDedMap.has(variant) || pbEarnMap.has(variant)) {
          matchedPbHrpn = variant;
          break;
        }
      }

      // Match Attempt B: Explicit employee_id in Paybill
      if (!matchedPbHrpn && pbHrpnByEmpId.has(empIdStr)) {
        matchedPbHrpn = pbHrpnByEmpId.get(empIdStr)!;
      }

      // Match Attempt C: Name match if employee has no HRPN configured
      if (!matchedPbHrpn && !empHrpn && pbHrpnByName.has(empNameKey)) {
        matchedPbHrpn = pbHrpnByName.get(empNameKey)!;
      }

      if (matchedPbHrpn) {
        consumedPbHrpns.add(matchedPbHrpn);
      }

      // Fetch Paybill & Payroll data for the 3 months
      const monthItems: TaxReconciliationMonthItem[] = months.map((month) => {
        let pbTax = 0;
        let pbGross = 0;
        let hasPb = false;

        if (matchedPbHrpn) {
          const d = pbDedMap.get(matchedPbHrpn)?.get(month);
          if (d) {
            pbTax = this.round2(d.incomeTax);
            hasPb = true;
          }
          const e = pbEarnMap.get(matchedPbHrpn)?.get(month);
          if (e) {
            pbGross = this.round2(e.grossAmount);
            hasPb = true;
          }
        }

        let prGross = 0;
        let prTax = 0;
        let hasPr = false;

        const salData = salaryMap.get(empIdStr)?.get(month);
        if (salData) {
          prGross = this.round2(salData.gross + salData.da);
          prTax = this.round2(salData.tax);
          hasPr = true;
        }

        const taxDiff = this.round2(pbTax - prTax);
        const grossDiff = this.round2(pbGross - prGross);
        const isTaxMatched = Math.abs(taxDiff) < 0.01;
        const isGrossMatched = Math.abs(grossDiff) < 0.01;

        return {
          month,
          paybillGross: pbGross,
          paybillTax: pbTax,
          payrollGross: prGross,
          payrollTax: prTax,
          taxDiff,
          grossDiff,
          isTaxMatched,
          isGrossMatched,
          hasPaybillData: hasPb,
          hasPayrollData: hasPr,
        };
      });

      const qPbTax = this.round2(monthItems.reduce((s, m) => s + m.paybillTax, 0));
      const qPrTax = this.round2(monthItems.reduce((s, m) => s + m.payrollTax, 0));
      const qTaxDiff = this.round2(qPbTax - qPrTax);

      const qPbGross = this.round2(monthItems.reduce((s, m) => s + m.paybillGross, 0));
      const qPrGross = this.round2(monthItems.reduce((s, m) => s + m.payrollGross, 0));
      const qGrossDiff = this.round2(qPbGross - qPrGross);

      const hasAnyPbData = monthItems.some((m) => m.hasPaybillData);
      const hasAnyPrData = monthItems.some((m) => m.hasPayrollData);
      const totalActivity = qPbTax + qPrTax + qPbGross + qPrGross;

      // Skip employees with no salary and no paybill activity in this quarter
      if (totalActivity === 0 && !hasAnyPbData && !hasAnyPrData) {
        continue;
      }

      // Status determination
      let status: TaxReconciliationStatus = 'MATCHED';
      let statusMessage = 'Income tax and gross salary match perfectly';

      if (hasAnyPbData && !hasAnyPrData) {
        status = 'MISSING_IN_PAYROLL';
        statusMessage = 'Tax deducted in Paybill PDF, but no salary record exists in Payroll grid';
      } else if (!hasAnyPbData && hasAnyPrData) {
        status = 'MISSING_IN_PAYBILL';
        statusMessage = 'Salary entered in Payroll 24Q, but no Paybill data uploaded for this quarter';
      } else {
        const hasTaxMismatch = monthItems.some((m) => !m.isTaxMatched);
        const hasGrossMismatch = monthItems.some((m) => !m.isGrossMatched);

        if (hasTaxMismatch) {
          status = 'TAX_MISMATCH';
          statusMessage = `Tax variance of ₹${Math.abs(qTaxDiff).toLocaleString('en-IN')} across the quarter`;
        } else if (hasGrossMismatch) {
          status = 'GROSS_MISMATCH';
          statusMessage = `Tax matches, but gross variance of ₹${Math.abs(qGrossDiff).toLocaleString('en-IN')} detected`;
        }
      }

      const canSync = (status === 'TAX_MISMATCH' || status === 'GROSS_MISMATCH' || status === 'MISSING_IN_PAYROLL') && hasAnyPbData;

      rows.push({
        hrpn: emp.hprn_no || matchedPbHrpn || `EMP-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        pan: empPan || 'NOT SET',
        designation: emp.designation,
        months: [monthItems[0], monthItems[1], monthItems[2]],
        quarterPaybillTax: qPbTax,
        quarterPayrollTax: qPrTax,
        quarterTaxDiff: qTaxDiff,
        quarterPaybillGross: qPbGross,
        quarterPayrollGross: qPrGross,
        quarterGrossDiff: qGrossDiff,
        status,
        statusMessage,
        canSync,
      });
    }

    // 5. Phase 2: Add any remaining Paybill HRPNs that were not linked to any Employee Master record
    const allPbHrpns = new Set<string>([...pbDedMap.keys(), ...pbEarnMap.keys()]);
    for (const pbHrpn of allPbHrpns) {
      if (consumedPbHrpns.has(pbHrpn)) continue;

      const pbName =
        pbDedMap.get(pbHrpn)?.values().next().value?.employeeName ||
        pbEarnMap.get(pbHrpn)?.values().next().value?.employeeName ||
        `Unmapped Employee (${pbHrpn})`;

      const monthItems: TaxReconciliationMonthItem[] = months.map((month) => {
        const d = pbDedMap.get(pbHrpn)?.get(month);
        const e = pbEarnMap.get(pbHrpn)?.get(month);

        const pbTax = d ? this.round2(d.incomeTax) : 0;
        const pbGross = e ? this.round2(e.grossAmount) : 0;

        return {
          month,
          paybillGross: pbGross,
          paybillTax: pbTax,
          payrollGross: 0,
          payrollTax: 0,
          taxDiff: pbTax,
          grossDiff: pbGross,
          isTaxMatched: pbTax === 0,
          isGrossMatched: pbGross === 0,
          hasPaybillData: Boolean(d || e),
          hasPayrollData: false,
        };
      });

      const qPbTax = this.round2(monthItems.reduce((s, m) => s + m.paybillTax, 0));
      const qPbGross = this.round2(monthItems.reduce((s, m) => s + m.paybillGross, 0));

      rows.push({
        hrpn: pbHrpn,
        employeeId: null,
        employeeName: pbName,
        pan: 'UNMAPPED',
        designation: null,
        months: [monthItems[0], monthItems[1], monthItems[2]],
        quarterPaybillTax: qPbTax,
        quarterPayrollTax: 0,
        quarterTaxDiff: qPbTax,
        quarterPaybillGross: qPbGross,
        quarterPayrollGross: 0,
        quarterGrossDiff: qPbGross,
        status: 'UNMAPPED_HRPN',
        statusMessage: `HRPN ${pbHrpn} found in Pay Bill but not registered in Employee Master`,
        canSync: false,
      });
    }

    // 6. Summary Calculation
    const summary: TaxReconciliationSummary = {
      totalEmployees: rows.length,
      matchedCount: rows.filter((r) => r.status === 'MATCHED').length,
      taxMismatchCount: rows.filter((r) => r.status === 'TAX_MISMATCH').length,
      grossMismatchCount: rows.filter((r) => r.status === 'GROSS_MISMATCH').length,
      missingInPayrollCount: rows.filter((r) => r.status === 'MISSING_IN_PAYROLL').length,
      missingInPaybillCount: rows.filter((r) => r.status === 'MISSING_IN_PAYBILL').length,
      unmappedHrpnCount: rows.filter((r) => r.status === 'UNMAPPED_HRPN').length,
      totalPaybillTax: this.round2(rows.reduce((s, r) => s + r.quarterPaybillTax, 0)),
      totalPayrollTax: this.round2(rows.reduce((s, r) => s + r.quarterPayrollTax, 0)),
      netTaxDiff: this.round2(rows.reduce((s, r) => s + r.quarterTaxDiff, 0)),
      totalPaybillGross: this.round2(rows.reduce((s, r) => s + r.quarterPaybillGross, 0)),
      totalPayrollGross: this.round2(rows.reduce((s, r) => s + r.quarterPayrollGross, 0)),
      netGrossDiff: this.round2(rows.reduce((s, r) => s + r.quarterGrossDiff, 0)),
    };

    const monthLabels = this.getMonthLabelsForQuarter(quarter, fy);
    const y2 = String(fy + 1).slice(-2);

    return {
      quarter,
      quarterMonths: months,
      fy,
      fyLabel: `${fy}-${y2}`,
      monthLabels,
      rows,
      summary,
    };
  }

  generateSyncPayload(
    report: TaxReconciliationReport,
    rawData: QuarterRawData,
    targetHrpns?: string[]
  ): SyncPaybillToPayrollItem[] {
    const { rows } = report;
    const { paybillEarnings, paybillDeductions } = rawData;

    const targetSet = targetHrpns && targetHrpns.length > 0 ? new Set(targetHrpns) : null;
    const eligibleRows = rows.filter((r) => {
      if (!r.canSync || !r.employeeId) return false;
      if (targetSet && !targetSet.has(r.hrpn)) return false;
      return true;
    });

    const entries: SyncPaybillToPayrollItem[] = [];

    for (const row of eligibleRows) {
      if (!row.employeeId) continue;

      for (const mItem of row.months) {
        // Find raw earning & deduction for this month & HRPN
        const eMatch = paybillEarnings.find(
          (e) => this.normalizeHrpn(e.hrpn) === this.normalizeHrpn(row.hrpn) && e.month === mItem.month
        );
        const dMatch = paybillDeductions.find(
          (d) => this.normalizeHrpn(d.hrpn) === this.normalizeHrpn(row.hrpn) && d.month === mItem.month
        );

        if (eMatch || dMatch) {
          const gross = eMatch ? Number(eMatch.gross_amount) || 0 : mItem.paybillGross;
          const da = eMatch ? Number(eMatch.da) || 0 : 0;
          const basic = eMatch ? Number(eMatch.basic_pay) || 0 : 0;
          // In Payroll system, gross in employee_salaries = gross - da (Basic + other)
          const payrollGross = basic > 0 ? basic : Math.max(0, gross - da);
          const tax = dMatch ? Number(dMatch.income_tax) || 0 : mItem.paybillTax;

          entries.push({
            employeeId: row.employeeId,
            month: mItem.month,
            gross: payrollGross,
            da,
            tax,
          });
        }
      }
    }

    return entries;
  }

  async syncPaybillToPayroll(
    payload: SyncPaybillToPayrollPayload
  ): Promise<SyncPaybillToPayrollResult> {
    const { quarter, fy, hrpns, officeId } = payload;
    const rawData = await taxReconciliationRepository.getQuarterRawData(quarter, fy, officeId);
    const report = this.processReconciliationData(rawData);
    const entries = this.generateSyncPayload(report, rawData, hrpns);

    if (entries.length === 0) {
      return {
        syncedCount: 0,
        message: 'No eligible Paybill entries found to synchronize.',
      };
    }

    const count = await taxReconciliationRepository.syncPaybillValuesToPayroll(entries, fy, officeId);
    return {
      syncedCount: count,
      message: `Successfully synchronized ${count} salary entries into Payroll 24Q.`,
    };
  }
}

export const taxReconciliationService = new TaxReconciliationService();
