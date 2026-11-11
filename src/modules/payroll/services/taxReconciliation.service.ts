import {
  taxReconciliationRepository,
  type QuarterRawData,
} from '../repositories/taxReconciliation.repository';
import { isActiveInEntryMonth } from '../utils/employeeDates';

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

  /**
   * Canonical HRPN key for cross-table joins: normalized + leading-zero
   * insensitive for purely numeric HRPNs. Both `02001001` and `2001001`
   * collapse to `2001001` so display (processReconciliationData) and sync
   * (generateSyncPayload) always agree — previously display matched via
   * variants but sync used strict equality and silently produced 0 entries.
   */
  private canonicalHrpnKey(hrpn: string | null | undefined): string {
    const norm = this.normalizeHrpn(hrpn);
    if (!norm) return '';
    if (/^\d+$/.test(norm)) {
      const stripped = norm.replace(/^0+/, '');
      if (stripped) return stripped;
    }
    return norm;
  }

  private cleanName(name: string | null | undefined): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\b(shri|smt|dr|mr|mrs|ms|km|er|prof)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private isNameMismatch(pdfName: string | null | undefined, masterName: string | null | undefined): boolean {
    if (!pdfName || !masterName) return false;
    return this.cleanName(pdfName) !== this.cleanName(masterName) && Boolean(this.cleanName(pdfName) && this.cleanName(masterName));
  }

  /**
   * Manual ledger arrears labels (Pay/DA Difference) whose amounts belong to
   * paybill-side gross but sit outside the printed bill total.
   * NOTE: regular DA is part of monthly pay inside Gross — only DA *Difference*
   * (arrears) is tracked separately here.
   */
  private static readonly ARREARS_LABELS = new Set(['pay difference', 'da difference']);
  private static readonly PAY_LABELS = new Set(['pay difference']);
  private static readonly DA_LABELS = new Set(['da difference']);

  /**
   * Index manual arrears: [hrpnLower] -> [monthLower] -> amount, summing only
   * the Pay/DA Difference labels. HRPN keys are matched loosely (case +
   * leading zeros) at lookup time.
   */
  private buildArrearsIndex(
    manual: Record<string, Record<string, Record<string, number>>> | undefined
  ): Map<string, Map<string, number>> {
    return this.buildArrearsIndexForLabels(manual, TaxReconciliationService.ARREARS_LABELS);
  }

  /** 059: per-track manual index so DA-diff and Pay-diff reconcile separately. */
  private buildArrearsIndexForLabels(
    manual: Record<string, Record<string, Record<string, number>>> | undefined,
    labels: Set<string>
  ): Map<string, Map<string, number>> {
    const index = new Map<string, Map<string, number>>();
    if (!manual || typeof manual !== 'object') return index;
    for (const [rawHrpn, byLabel] of Object.entries(manual)) {
      if (!byLabel || typeof byLabel !== 'object') continue;
      const hKey = this.normalizeHrpn(rawHrpn) || String(rawHrpn).trim().toLowerCase();
      if (!hKey) continue;
      for (const [label, byMonth] of Object.entries(byLabel)) {
        if (!labels.has(String(label).trim().toLowerCase())) continue;
        if (!byMonth || typeof byMonth !== 'object') continue;
        for (const [month, amount] of Object.entries(byMonth)) {
          const v = Number(amount) || 0;
          if (v === 0) continue;
          const mKey = this.normalizeMonthKey(month);
          if (!mKey) continue;
          let perMonth = index.get(hKey);
          if (!perMonth) {
            perMonth = new Map();
            index.set(hKey, perMonth);
          }
          perMonth.set(mKey, this.round2((perMonth.get(mKey) || 0) + v));
        }
      }
    }
    return index;
  }

  private lookupArrears(
    index: Map<string, Map<string, number>>,
    hrpnKeys: Array<string | null | undefined>,
    month: string
  ): number {
    const mKey = this.normalizeMonthKey(month);
    if (!mKey) return 0;
    const seen = new Set<string>();
    let total = 0;
    for (const k of hrpnKeys) {
      const norm = this.normalizeHrpn(k) || String(k || '').trim().toLowerCase();
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      total += index.get(norm)?.get(mKey) || 0;
    }
    return this.round2(total);
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

  async getQuarterTaxReconciliation(quarter: string, fy: number): Promise<TaxReconciliationReport> {
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      throw new Error('Invalid quarter');
    }

    const rawData = await taxReconciliationRepository.getQuarterRawData(quarter, fy);
    return this.processReconciliationData(rawData);
  }

  private normalizeMonthKey(month: string | null | undefined): string {
    return String(month || '').trim().toLowerCase();
  }

  processReconciliationData(rawData: QuarterRawData): TaxReconciliationReport {
    const { quarter, fy, months, employees, salaries, paybillDeductions, paybillEarnings } = rawData;
    // Payroll stores PAYMENT months (Apr/May/Jun for Q1), Paybill stores WORK
    // months (Mar/Apr/May for Q1). Align index-wise: paid[i] <=> work[i].
    const paidMonths = months;
    const workMonths = rawData.paybillMonths && rawData.paybillMonths.length === months.length
      ? rawData.paybillMonths
      : months;

    // 1. Index Payroll Salaries: [String(empId)][monthKey] -> { gross, da, tax + arrears splits }
    // 059: gross+da stays the TOTAL monthly pay (regular DA lives inside it).
    // pay_diff / da_diff are arrears-only tracks (Excel never carries them).
    const salaryMap = new Map<string, Map<string, { gross: number; da: number; tax: number; payDiff: number; daDiff: number; arrearsTax: number }>>();
    for (const s of salaries) {
      const empIdStr = String(s.employee_id);
      if (!salaryMap.has(empIdStr)) {
        salaryMap.set(empIdStr, new Map());
      }
      const mKey = this.normalizeMonthKey(s.month);
      const existing = salaryMap.get(empIdStr)!.get(mKey);
      if (existing) {
        existing.gross += Number(s.gross) || 0;
        existing.da += Number(s.da) || 0;
        existing.tax += Number(s.tax) || 0;
        existing.payDiff += Number((s as unknown as { pay_diff?: unknown }).pay_diff) || 0;
        existing.daDiff += Number((s as unknown as { da_diff?: unknown }).da_diff) || 0;
        existing.arrearsTax += Number((s as unknown as { arrears_tax?: unknown }).arrears_tax) || 0;
      } else {
        salaryMap.get(empIdStr)!.set(mKey, {
          gross: Number(s.gross) || 0,
          da: Number(s.da) || 0,
          tax: Number(s.tax) || 0,
          payDiff: Number((s as unknown as { pay_diff?: unknown }).pay_diff) || 0,
          daDiff: Number((s as unknown as { da_diff?: unknown }).da_diff) || 0,
          arrearsTax: Number((s as unknown as { arrears_tax?: unknown }).arrears_tax) || 0,
        });
      }
    }

    // Bill-type classifier (059): missing/REGULAR = monthly pay; the rest are arrears tracks.
    const billTypeOf = (v: unknown): string => String((v as { bill_type?: unknown })?.bill_type || 'REGULAR').trim().toUpperCase();
    const isDaArrearBill = (bt: string): boolean => bt === 'DA_ARREAR';
    const isPayArrearBill = (bt: string): boolean => bt === 'PAY_ARREAR' || bt === 'SUPPLEMENTARY';

    // 2. Index Paybill Deductions: [hrpn][monthKey] -> { incomeTax, employeeName, employeeId }
    // 059: tax split into regular vs arrears for the tax track detail (totals unchanged).
    const pbDedMap = new Map<string, Map<string, { incomeTax: number; regularTax: number; arrearsTax: number; employeeName: string; employeeId: string | null }>>();
    for (const d of paybillDeductions) {
      const h = this.normalizeHrpn(d.hrpn);
      if (!h) continue;
      if (!pbDedMap.has(h)) {
        pbDedMap.set(h, new Map());
      }
      const mKey = this.normalizeMonthKey(d.month);
      const bt = billTypeOf(d);
      const taxV = Number(d.income_tax) || 0;
      const existing = pbDedMap.get(h)!.get(mKey);
      if (existing) {
        existing.incomeTax += taxV;
        if (isDaArrearBill(bt) || isPayArrearBill(bt)) existing.arrearsTax += taxV;
        else existing.regularTax += taxV;
        if (!existing.employeeName && d.employee_name) existing.employeeName = d.employee_name;
        if (!existing.employeeId && d.employee_id) existing.employeeId = String(d.employee_id);
      } else {
        pbDedMap.get(h)!.set(mKey, {
          incomeTax: taxV,
          regularTax: (isDaArrearBill(bt) || isPayArrearBill(bt)) ? 0 : taxV,
          arrearsTax: (isDaArrearBill(bt) || isPayArrearBill(bt)) ? taxV : 0,
          employeeName: d.employee_name || '',
          employeeId: d.employee_id ? String(d.employee_id) : null,
        });
      }
    }

    // 3. Index Paybill Earnings: [hrpn][monthKey] -> all allowance components.
    // PB gross is recomputed as SUM of components (basic+da+hra+cla+med+trans+
    // special+washing+npp) + manual Pay/DA Difference — exactly like the
    // paybill ledger frontend single-table Gross Amt (ledgerMath). The stored
    // gross_amount column alone is unreliable (parser drift / partial imports),
    // so it is only a fallback when every component column is 0.
    // 059: component sums are kept per track — regular (monthly pay, incl.
    // regular DA) vs daArrear vs payArrear — so each track reconciles on its own.
    const pbEarnMap = new Map<string, Map<string, {
      grossAmount: number; da: number; basicPay: number; hra: number; cla: number;
      medical: number; transport: number; special: number; washing: number; npp: number;
      rowCount: number; employeeName: string;
      regComp: number; regStored: number; regRows: number;
      daComp: number; daStored: number; hasDaBill: boolean;
      payComp: number; payStored: number; hasPayBill: boolean;
    }>>();
    const num = (v: unknown): number => Number(v) || 0;
    const compSumOf = (e: unknown): number => {
      const r = e as unknown as Record<string, unknown>;
      return num((e as { basic_pay?: unknown }).basic_pay) + num((e as { da?: unknown }).da) +
        num(r.hra) + num(r.cla) +
        num(r.medical_allowance) + num(r.transport_allowance) +
        num(r.special_pay) + num(r.washing_allowance) +
        num(r.npp_allowance);
    };
    for (const e of paybillEarnings) {
      const h = this.normalizeHrpn(e.hrpn);
      if (!h) continue;
      if (!pbEarnMap.has(h)) {
        pbEarnMap.set(h, new Map());
      }
      const mKey = this.normalizeMonthKey(e.month);
      const bt = billTypeOf(e);
      const cs = compSumOf(e);
      const gs = num(e.gross_amount);
      const existing = pbEarnMap.get(h)!.get(mKey);
      if (existing) {
        existing.grossAmount += gs;
        existing.da += num(e.da);
        existing.basicPay += num(e.basic_pay);
        existing.hra += num((e as unknown as { hra?: unknown }).hra);
        existing.cla += num((e as unknown as { cla?: unknown }).cla);
        existing.medical += num((e as unknown as { medical_allowance?: unknown }).medical_allowance);
        existing.transport += num((e as unknown as { transport_allowance?: unknown }).transport_allowance);
        existing.special += num((e as unknown as { special_pay?: unknown }).special_pay);
        existing.washing += num((e as unknown as { washing_allowance?: unknown }).washing_allowance);
        existing.npp += num((e as unknown as { npp_allowance?: unknown }).npp_allowance);
        existing.rowCount += 1;
        if (isDaArrearBill(bt)) { existing.daComp += cs; existing.daStored += gs; existing.hasDaBill = true; }
        else if (isPayArrearBill(bt)) { existing.payComp += cs; existing.payStored += gs; existing.hasPayBill = true; }
        else { existing.regComp += cs; existing.regStored += gs; existing.regRows += 1; }
        if (!existing.employeeName && e.employee_name) existing.employeeName = e.employee_name;
      } else {
        const isDa = isDaArrearBill(bt);
        const isPay = isPayArrearBill(bt);
        pbEarnMap.get(h)!.set(mKey, {
          grossAmount: gs,
          da: num(e.da),
          basicPay: num(e.basic_pay),
          hra: num((e as unknown as { hra?: unknown }).hra),
          cla: num((e as unknown as { cla?: unknown }).cla),
          medical: num((e as unknown as { medical_allowance?: unknown }).medical_allowance),
          transport: num((e as unknown as { transport_allowance?: unknown }).transport_allowance),
          special: num((e as unknown as { special_pay?: unknown }).special_pay),
          washing: num((e as unknown as { washing_allowance?: unknown }).washing_allowance),
          npp: num((e as unknown as { npp_allowance?: unknown }).npp_allowance),
          rowCount: 1,
          employeeName: e.employee_name || '',
          regComp: isDa || isPay ? 0 : cs,
          regStored: isDa || isPay ? 0 : gs,
          regRows: isDa || isPay ? 0 : 1,
          daComp: isDa ? cs : 0,
          daStored: isDa ? gs : 0,
          hasDaBill: isDa,
          payComp: isPay ? cs : 0,
          payStored: isPay ? gs : 0,
          hasPayBill: isPay,
        });
      }
    }

    // NOTE: HRPN is the hard key. No employee_id / name fallback maps here —
    // the roster is employee-master only and paybill joins strictly by HRPN.

    // Deduplicate employees in Phase 1:
    // If multiple employee records have the same normalized HRPN or PAN,
    // consolidate under a single primary employee entry and merge their salaries in salaryMap.
    const dedupedEmployees: typeof employees = [];
    const seenEmployeeKeys = new Map<string, string>(); // primaryKey -> primaryEmployeeId

    for (const emp of employees) {
      const empHrpn = this.normalizeHrpn(emp.hprn_no);
      const empPan = this.normalizePan(emp.pan);
      const primaryKey = empHrpn ? `H:${empHrpn}` : empPan ? `P:${empPan}` : `ID:${emp.id}`;

      if (seenEmployeeKeys.has(primaryKey)) {
        const primaryId = seenEmployeeKeys.get(primaryKey)!;
        const secondarySalaries = salaryMap.get(String(emp.id));
        if (secondarySalaries) {
          let primarySalMap = salaryMap.get(primaryId);
          if (!primarySalMap) {
            primarySalMap = new Map();
            salaryMap.set(primaryId, primarySalMap);
          }
          for (const [mKey, salVal] of secondarySalaries.entries()) {
            const ex = primarySalMap.get(mKey);
            if (ex) {
              ex.gross += salVal.gross;
              ex.da += salVal.da;
              ex.tax += salVal.tax;
              ex.payDiff += salVal.payDiff;
              ex.daDiff += salVal.daDiff;
              ex.arrearsTax += salVal.arrearsTax;
            } else {
              primarySalMap.set(mKey, { ...salVal });
            }
          }
        }
      } else {
        seenEmployeeKeys.set(primaryKey, String(emp.id));
        dedupedEmployees.push(emp);
      }
    }

    const rows: TaxReconciliationRow[] = [];
    // Manual ledger arrears indexed once per report: total + per-track splits.
    // DA Difference and Pay Difference reconcile as their own tracks — regular
    // monthly pay (which already includes regular DA) reconciles separately.
    const arrearsIndex = this.buildArrearsIndex(rawData.manualLedgerValues);
    const daManualIndex = this.buildArrearsIndexForLabels(rawData.manualLedgerValues, TaxReconciliationService.DA_LABELS);
    const payManualIndex = this.buildArrearsIndexForLabels(rawData.manualLedgerValues, TaxReconciliationService.PAY_LABELS);

    // Employee list comes ONLY from the employee master (dedupedEmployees).
    // Paybill joins strictly by HRPN (hard key). Name differences are tolerated —
    // if HRPN matches, it is the same person even when names differ.
    for (const emp of dedupedEmployees) {
      const empIdStr = String(emp.id);
      const empHrpn = this.normalizeHrpn(emp.hprn_no);
      const empPan = this.normalizePan(emp.pan);
      // Blank master HRPN (shows as EMP-*) can never join paybill — HRPN is the hard key.
      const missingHrpn = !empHrpn;

      // Locate matching Paybill HRPN — canonical (exact + leading-zero
      // insensitive both ways) so `2001001` matches `02001001` regardless of
      // which side carries the leading zero. Keeps display and sync in sync.
      let matchedPbHrpn = '';

      const hrpnVariants = this.getHrpnVariants(emp.hprn_no);
      for (const variant of hrpnVariants) {
        if (pbDedMap.has(variant) || pbEarnMap.has(variant)) {
          matchedPbHrpn = variant;
          break;
        }
      }
      if (!matchedPbHrpn) {
        const empKey = this.canonicalHrpnKey(emp.hprn_no);
        if (empKey) {
          for (const pbKey of new Set([...pbDedMap.keys(), ...pbEarnMap.keys()])) {
            if (this.canonicalHrpnKey(pbKey) === empKey) {
              matchedPbHrpn = pbKey;
              break;
            }
          }
        }
      }

      // Fetch Paybill & Payroll data for the 3 months.
      // paidMonths[i] (Payroll) corresponds to workMonths[i] (Paybill).
      // `month` stays as the payment month because employee_salaries is keyed
      // by payment month and sync writes back using it.
      // Transfer-aware: months where the employee was not in service
      // (transferred out / not yet joined) are marked inactive and excluded
      // from quarter totals and status below — paybill PDFs correctly omit
      // them, so they must not surface as MISSING_IN_PAYBILL mismatches.
      const monthItems: TaxReconciliationMonthItem[] = paidMonths.map((payrollMonth, idx) => {
        const paybillMonth = workMonths[idx] || payrollMonth;
        const payrollKey = this.normalizeMonthKey(payrollMonth);
        const paybillKey = this.normalizeMonthKey(paybillMonth);
        const isActive = isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, payrollMonth);
        let pbTax = 0;
        let pbRegular = 0;
        let pbDaDiff = 0;
        let pbPayDiff = 0;
        let hasPb = false;

        if (matchedPbHrpn) {
          const d = pbDedMap.get(matchedPbHrpn)?.get(paybillKey);
          if (d) {
            pbTax = this.round2(d.incomeTax);
            hasPb = true;
          }
          const e = pbEarnMap.get(matchedPbHrpn)?.get(paybillKey);
          if (e) {
            // Regular = monthly pay incl. regular DA (same ledger Gross Amt formula
            // restricted to REGULAR bills). Falls back to stored gross_amount only
            // when every component column is 0 (legacy / partial rows).
            pbRegular = e.regComp > 0 ? this.round2(e.regComp)
              : e.regRows > 0 ? this.round2(e.regStored) : 0;
            // Arrears tracks from tagged supplementary bills (component sums,
            // same fallback). Missing bill_type = REGULAR, so legacy months keep
            // everything inside pbRegular and manual below preserves old totals.
            const daBillSum = e.daComp > 0 ? this.round2(e.daComp)
              : e.hasDaBill ? this.round2(e.daStored) : 0;
            const payBillSum = e.payComp > 0 ? this.round2(e.payComp)
              : e.hasPayBill ? this.round2(e.payStored) : 0;
            // Manual Pay/DA Difference sits outside the printed bill total but
            // the ledger Gross Amt always includes it. Per-track guard: manual
            // applies only when that track has no bill rows. Legacy guard: when
            // the month has 2+ untagged rows (regular + supplementary both
            // imported without bill_type), arrears are already inside the sums.
            const hrpnKeys = [matchedPbHrpn, ...this.getHrpnVariants(emp.hprn_no)];
            const legacyUntaggedDouble = !e.hasDaBill && !e.hasPayBill && e.rowCount > 1;
            const manualDa = (!e.hasDaBill && !legacyUntaggedDouble)
              ? this.round2(this.lookupArrears(daManualIndex, hrpnKeys, paybillMonth)) : 0;
            const manualPay = (!e.hasPayBill && !legacyUntaggedDouble)
              ? this.round2(this.lookupArrears(payManualIndex, hrpnKeys, paybillMonth)) : 0;
            pbDaDiff = this.round2(daBillSum + manualDa);
            pbPayDiff = this.round2(payBillSum + manualPay);
            // Stash manual split for tooltip/detail (total kept in paybillArrears).
            (e as unknown as { _manualDa?: number })._manualDa = manualDa;
            (e as unknown as { _manualPay?: number })._manualPay = manualPay;
            hasPb = true;
          } else if (matchedPbHrpn && hasPb) {
            // Deduction-only month (no earning rows): manual still applies.
            const hrpnKeys = [matchedPbHrpn, ...this.getHrpnVariants(emp.hprn_no)];
            pbDaDiff = this.round2(this.lookupArrears(daManualIndex, hrpnKeys, paybillMonth));
            pbPayDiff = this.round2(this.lookupArrears(payManualIndex, hrpnKeys, paybillMonth));
          }
        }

        // Legacy total-base for backward compat (old pbGrossBase summed every row
        // regardless of track). Recomputed here only to keep paybillArrears guard
        // semantics identical for untagged months.
        let paybillArrears = 0;
        if (matchedPbHrpn && hasPb) {
          const e = pbEarnMap.get(matchedPbHrpn)?.get(paybillKey);
          const manualDa = Number((e as unknown as { _manualDa?: number } | undefined)?._manualDa || 0);
          const manualPay = Number((e as unknown as { _manualPay?: number } | undefined)?._manualPay || 0);
          if (e && (manualDa > 0 || manualPay > 0)) {
            paybillArrears = this.round2(manualDa + manualPay);
          } else if (!e) {
            paybillArrears = this.round2(this.lookupArrears(
              arrearsIndex,
              [matchedPbHrpn, ...this.getHrpnVariants(emp.hprn_no)],
              paybillMonth
            ));
          } else {
            // Bill-only arrears months carry no manual: total arrears = bill sums.
            paybillArrears = 0;
          }
        }
        const manualDaOut = Number((pbEarnMap.get(matchedPbHrpn)?.get(paybillKey) as unknown as { _manualDa?: number } | undefined)?._manualDa || 0);
        const manualPayOut = Number((pbEarnMap.get(matchedPbHrpn)?.get(paybillKey) as unknown as { _manualPay?: number } | undefined)?._manualPay || 0);
        // paybillArrears keeps its legacy meaning: MANUAL-only amount folded in.
        // Bill-based arrears live in pbDaDiff/pbPayDiff directly.
        if (paybillArrears === 0 && (manualDaOut > 0 || manualPayOut > 0)) {
          paybillArrears = this.round2(manualDaOut + manualPayOut);
        }
        const pbGross = this.round2(pbRegular + pbDaDiff + pbPayDiff);

        let prGross = 0;
        let prTax = 0;
        let prRegular = 0;
        let prDaDiff = 0;
        let prPayDiff = 0;
        let hasPr = false;

        const salData = salaryMap.get(empIdStr)?.get(payrollKey);
        if (salData) {
          // Payroll 24Q working copy:
          // salData.gross is the FULL regular monthly gross (Basic + regular DA + allowances).
          // salData.da is DA & Other (Arrears: DA Difference + Pay Difference).
          // Regular monthly DA is an integral part of regular monthly gross and must NEVER be stripped into DA & Other.
          prDaDiff = this.round2(salData.daDiff > 0 ? salData.daDiff : (salData.payDiff === 0 ? salData.da : 0));
          prPayDiff = this.round2(salData.payDiff);
          prRegular = this.round2(salData.gross);
          prGross = this.round2(prRegular + prDaDiff + prPayDiff);
          prTax = this.round2(salData.tax);
          hasPr = true;
        }

        const taxDiff = this.round2(pbTax - prTax);
        const grossDiff = this.round2(pbGross - prGross);
        const regularDiff = this.round2(pbRegular - prRegular);
        const daDiffDiff = this.round2(pbDaDiff - prDaDiff);
        const payDiffDiff = this.round2(pbPayDiff - prPayDiff);
        // Inactive (post-transfer / pre-joining) months always count as
        // matched so stale rows never flip the quarter status.
        const isTaxMatched = !isActive ? true : Math.abs(taxDiff) < 0.01;
        const isGrossMatched = !isActive ? true : Math.abs(grossDiff) < 0.01;
        const isRegularMatched = !isActive ? true : Math.abs(regularDiff) < 0.01;
        const isDaMatched = !isActive ? true : Math.abs(daDiffDiff) < 0.01;
        const isPayMatched = !isActive ? true : Math.abs(payDiffDiff) < 0.01;

        return {
          month: payrollMonth,
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
          isActive,
          paybillArrears,
          pbRegular,
          pbDaDiff,
          pbPayDiff,
          prRegular,
          prDaDiff,
          prPayDiff,
          regularDiff,
          daDiffDiff,
          payDiffDiff,
          isRegularMatched,
          isDaMatched,
          isPayMatched,
          paybillDaManual: manualDaOut,
          paybillPayManual: manualPayOut,
        };
      });

      // Quarter aggregates consider ACTIVE months only. Inactive months
      // (e.g. post-transfer) keep their values for display but do not
      // contribute to diffs — otherwise transferred staff like Sr 46/47
      // show a bogus -26000 MISSING_IN_PAYBILL every quarter.
      const activeItems = monthItems.filter((m) => m.isActive !== false);
      const qPbTax = this.round2(activeItems.reduce((s, m) => s + m.paybillTax, 0));
      const qPrTax = this.round2(activeItems.reduce((s, m) => s + m.payrollTax, 0));
      const qTaxDiff = this.round2(qPbTax - qPrTax);

      const qPbGross = this.round2(activeItems.reduce((s, m) => s + m.paybillGross, 0));
      const qPrGross = this.round2(activeItems.reduce((s, m) => s + m.payrollGross, 0));
      const qGrossDiff = this.round2(qPbGross - qPrGross);

      // 059 three-track quarter aggregates (active months only).
      const qPbReg = this.round2(activeItems.reduce((s, m) => s + (m.pbRegular || 0), 0));
      const qPrReg = this.round2(activeItems.reduce((s, m) => s + (m.prRegular || 0), 0));
      const qRegDiff = this.round2(qPbReg - qPrReg);
      const qPbDa = this.round2(activeItems.reduce((s, m) => s + (m.pbDaDiff || 0), 0));
      const qPrDa = this.round2(activeItems.reduce((s, m) => s + (m.prDaDiff || 0), 0));
      const qDaDiff = this.round2(qPbDa - qPrDa);
      const qPbPay = this.round2(activeItems.reduce((s, m) => s + (m.pbPayDiff || 0), 0));
      const qPrPay = this.round2(activeItems.reduce((s, m) => s + (m.prPayDiff || 0), 0));
      const qPayDiff = this.round2(qPbPay - qPrPay);

      const hasAnyPbData = activeItems.some((m) => m.hasPaybillData);
      const hasAnyPrData = activeItems.some((m) => m.hasPayrollData);
      const totalActivity = qPbTax + qPrTax + qPbGross + qPrGross;

      // Skip employees with no active months in this quarter, or with no
      // salary and no paybill activity in their active months.
      if (activeItems.length === 0 || (totalActivity === 0 && !hasAnyPbData && !hasAnyPrData)) {
        continue;
      }

      // Status determination (active months only).
      // Priority: tax first (statutory), then regular monthly pay, then arrears.
      // REGULAR_MISMATCH = monthly pay excl. diffs differs — fix salary/parse error.
      // ARREARS_MISMATCH = monthly matches but DA/Pay diff differs — fix arrears entry.
      // GROSS_MISMATCH kept as legacy fallback for combined-only consumers.
      let status: TaxReconciliationStatus = 'MATCHED';
      let statusMessage = 'Income tax and gross salary match perfectly';

      if (hasAnyPbData && !hasAnyPrData) {
        status = 'MISSING_IN_PAYROLL';
        statusMessage = 'Tax deducted in Paybill PDF, but no salary record exists in Payroll grid';
      } else if (!hasAnyPbData && hasAnyPrData) {
        status = 'MISSING_IN_PAYBILL';
        statusMessage = missingHrpn
          ? 'No HRPN in Employee Master — add the HRPN to map Paybill data (HRPN is the hard key, names are ignored)'
          : 'Salary entered in Payroll 24Q, but no Paybill data uploaded for this quarter';
      } else {
        const hasTaxMismatch = activeItems.some((m) => !m.isTaxMatched);
        const hasRegularMismatch = activeItems.some((m) => !m.isRegularMatched);
        const hasArrearsMismatch = activeItems.some((m) => !m.isDaMatched || !m.isPayMatched);
        const hasGrossMismatch = activeItems.some((m) => !m.isGrossMatched);

        if (hasTaxMismatch) {
          status = 'TAX_MISMATCH';
          statusMessage = `Tax variance of ₹${Math.abs(qTaxDiff).toLocaleString('en-IN')} across the quarter`;
        } else if (!hasGrossMismatch && (hasRegularMismatch || hasArrearsMismatch)) {
          // Totals agree but tracks don't: payroll holds the arrears combined
          // (or not at all) instead of split into DA-diff / Pay-diff.
          // Sync once to record the splits — no salary correction needed.
          status = 'ARREARS_MISMATCH';
          statusMessage = `Totals match (₹${Math.abs(qPbGross).toLocaleString('en-IN')}) but DA/Pay diff not split in payroll — sync to record arrears separately (Reg Δ ₹${Math.abs(qRegDiff).toLocaleString('en-IN')}, DA-diff Δ ₹${Math.abs(qDaDiff).toLocaleString('en-IN')}, Pay-diff Δ ₹${Math.abs(qPayDiff).toLocaleString('en-IN')})`;
        } else if (hasRegularMismatch) {
          status = 'REGULAR_MISMATCH';
          statusMessage = `Regular pay variance of ₹${Math.abs(qRegDiff).toLocaleString('en-IN')} (excl. DA/Pay diff)`;
          if (hasArrearsMismatch) {
            statusMessage += ` + arrears variance ₹${Math.abs(qDaDiff + qPayDiff).toLocaleString('en-IN')}`;
          }
        } else if (hasArrearsMismatch) {
          status = 'ARREARS_MISMATCH';
          const parts: string[] = [];
          if (Math.abs(qDaDiff) >= 0.01) parts.push(`DA-diff ₹${Math.abs(qDaDiff).toLocaleString('en-IN')}`);
          if (Math.abs(qPayDiff) >= 0.01) parts.push(`Pay-diff ₹${Math.abs(qPayDiff).toLocaleString('en-IN')}`);
          statusMessage = `Regular matches; arrears variance (${parts.join(' + ') || 'see months'})`;
        } else if (hasGrossMismatch) {
          status = 'GROSS_MISMATCH';
          statusMessage = `Tax matches, but gross variance of ₹${Math.abs(qGrossDiff).toLocaleString('en-IN')} detected`;
        }
      }

      // Transferred staff with only stale post-transfer payroll rows are
      // already skipped above; if they still land here on an active month,
      // keep the mismatch visible. Add a hint when the employee has a
      // transfer date so the operator knows why paybill is 0 afterwards.
      if (emp.transfer_date) {
        statusMessage += ` (Transferred: ${emp.transfer_date})`;
      }

      // Ledger persons with no legacy payroll row (`est:<uuid>`) have no
      // salary-store key — visible for reconciliation, never syncable.
      const rowEmployeeId = empIdStr.startsWith('est:') ? null : emp.id;

      const canSync =
        (status === 'TAX_MISMATCH' || status === 'GROSS_MISMATCH' || status === 'REGULAR_MISMATCH' || status === 'ARREARS_MISMATCH' || status === 'MISSING_IN_PAYROLL') &&
        hasAnyPbData &&
        !!rowEmployeeId;

      // Paybill-printed name for this HRPN (may differ — HRPN is the hard key).
      const paybillName = matchedPbHrpn
        ? pbDedMap.get(matchedPbHrpn)?.values().next().value?.employeeName ||
          pbEarnMap.get(matchedPbHrpn)?.values().next().value?.employeeName ||
          null
        : null;
      const nameMismatch = this.isNameMismatch(paybillName, emp.name);

      rows.push({
        hrpn: emp.hprn_no || matchedPbHrpn || `EMP-${emp.id}`,
        employeeId: rowEmployeeId,
        employeeName: emp.name,
        paybillName,
        nameMismatch,
        missingHrpn,
        pan: empPan || 'NOT SET',
        designation: emp.designation,
        months: [monthItems[0], monthItems[1], monthItems[2]],
        quarterPaybillTax: qPbTax,
        quarterPayrollTax: qPrTax,
        quarterTaxDiff: qTaxDiff,
        quarterPaybillGross: qPbGross,
        quarterPayrollGross: qPrGross,
        quarterGrossDiff: qGrossDiff,
        quarterPbRegular: qPbReg,
        quarterPrRegular: qPrReg,
        quarterRegularDiff: qRegDiff,
        quarterPbDaDiff: qPbDa,
        quarterPrDaDiff: qPrDa,
        quarterDaDiffDiff: qDaDiff,
        quarterPbPayDiff: qPbPay,
        quarterPrPayDiff: qPrPay,
        quarterPayDiffDiff: qPayDiff,
        status,
        statusMessage,
        canSync,
      });
    }

    // No Phase 2: the reconciliation roster is employee-master only.
    // Paybill HRPNs with no matching employee-master HRPN are intentionally
    // excluded (register the employee in Employee Master first). This keeps
    // HRPN as the hardcore join key and tolerates paybill/master name drift.

    // Deduplicate output rows by HRPN as final defense
    const uniqueRowsMap = new Map<string, TaxReconciliationRow>();
    for (const r of rows) {
      const key = this.normalizeHrpn(r.hrpn) || r.hrpn;
      if (!uniqueRowsMap.has(key)) {
        uniqueRowsMap.set(key, r);
      } else {
        const existing = uniqueRowsMap.get(key)!;
        if (!existing.employeeId && r.employeeId) {
          uniqueRowsMap.set(key, r);
        }
      }
    }
    const finalRows = Array.from(uniqueRowsMap.values());

    // 6. Summary Calculation
    const summary: TaxReconciliationSummary = {
      totalEmployees: finalRows.length,
      matchedCount: finalRows.filter((r) => r.status === 'MATCHED').length,
      taxMismatchCount: finalRows.filter((r) => r.status === 'TAX_MISMATCH').length,
      grossMismatchCount: finalRows.filter((r) => r.status === 'GROSS_MISMATCH').length,
      regularMismatchCount: finalRows.filter((r) => r.status === 'REGULAR_MISMATCH').length,
      arrearsMismatchCount: finalRows.filter((r) => r.status === 'ARREARS_MISMATCH').length,
      missingInPayrollCount: finalRows.filter((r) => r.status === 'MISSING_IN_PAYROLL').length,
      missingInPaybillCount: finalRows.filter((r) => r.status === 'MISSING_IN_PAYBILL').length,
      unmappedHrpnCount: finalRows.filter((r) => r.status === 'UNMAPPED_HRPN').length,
      totalPaybillTax: this.round2(finalRows.reduce((s, r) => s + r.quarterPaybillTax, 0)),
      totalPayrollTax: this.round2(finalRows.reduce((s, r) => s + r.quarterPayrollTax, 0)),
      netTaxDiff: this.round2(finalRows.reduce((s, r) => s + r.quarterTaxDiff, 0)),
      totalPaybillGross: this.round2(finalRows.reduce((s, r) => s + r.quarterPaybillGross, 0)),
      totalPayrollGross: this.round2(finalRows.reduce((s, r) => s + r.quarterPayrollGross, 0)),
      netGrossDiff: this.round2(finalRows.reduce((s, r) => s + r.quarterGrossDiff, 0)),
      totalPbRegular: this.round2(finalRows.reduce((s, r) => s + (r.quarterPbRegular || 0), 0)),
      totalPrRegular: this.round2(finalRows.reduce((s, r) => s + (r.quarterPrRegular || 0), 0)),
      netRegularDiff: this.round2(finalRows.reduce((s, r) => s + (r.quarterRegularDiff || 0), 0)),
      totalPbDaDiff: this.round2(finalRows.reduce((s, r) => s + (r.quarterPbDaDiff || 0), 0)),
      totalPrDaDiff: this.round2(finalRows.reduce((s, r) => s + (r.quarterPrDaDiff || 0), 0)),
      netDaDiffDiff: this.round2(finalRows.reduce((s, r) => s + (r.quarterDaDiffDiff || 0), 0)),
      totalPbPayDiff: this.round2(finalRows.reduce((s, r) => s + (r.quarterPbPayDiff || 0), 0)),
      totalPrPayDiff: this.round2(finalRows.reduce((s, r) => s + (r.quarterPrPayDiff || 0), 0)),
      netPayDiffDiff: this.round2(finalRows.reduce((s, r) => s + (r.quarterPayDiffDiff || 0), 0)),
    };

    const monthLabels = this.getMonthLabelsForQuarter(quarter, fy);
    const y2 = String(fy + 1).slice(-2);

    return {
      quarter,
      quarterMonths: months,
      fy,
      fyLabel: `${fy}-${y2}`,
      monthLabels,
      rows: finalRows,
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

    // Normalize target HRPNs (trim/case + leading-zero insensitive) so the
    // "Sync All (4)" selection from the UI always matches the freshly
    // recomputed report, even when master/paybill HRPN text differs by
    // leading zeros or casing.
    const targetSet =
      targetHrpns && targetHrpns.length > 0
        ? new Set(targetHrpns.map((h) => this.canonicalHrpnKey(h)))
        : null;
    const eligibleRows = rows.filter((r) => {
      if (!r.canSync || !r.employeeId) return false;
      if (targetSet && !targetSet.has(this.canonicalHrpnKey(r.hrpn))) return false;
      return true;
    });

    const entries: SyncPaybillToPayrollItem[] = [];
    // Map payment month -> work month for Paybill lookup.
    const paidMonths = rawData.months;
    const workMonths = rawData.paybillMonths && rawData.paybillMonths.length === paidMonths.length
      ? rawData.paybillMonths
      : paidMonths;
    const workMonthByPaid = new Map<string, string>();
    paidMonths.forEach((pm, i) => {
      workMonthByPaid.set(this.normalizeMonthKey(pm), workMonths[i] || pm);
    });

    for (const row of eligibleRows) {
      if (!row.employeeId) continue;
      // Canonical key collapses `02001001` <=> `2001001` so sync finds the
      // same paybill rows the reconciliation grid matched via variants.
      const rowKey = this.canonicalHrpnKey(row.hrpn);
      if (!rowKey) continue;

      for (const mItem of row.months) {
        // mItem.month is the PAYMENT month (employee_salaries key).
        // Paybill rows are keyed by WORK month, so translate first.
        // Skip months with no Paybill data so we never overwrite Payroll
        // with zeros from a missing import side. Skip inactive
        // (post-transfer) months so sync never revives departed staff.
        if (!mItem.hasPaybillData) continue;
        if (mItem.isActive === false) continue;
        const paybillMonth = workMonthByPaid.get(this.normalizeMonthKey(mItem.month)) || mItem.month;
        const paybillKey = this.normalizeMonthKey(paybillMonth);

        const matchingEarnings = paybillEarnings.filter(
          (e) => this.canonicalHrpnKey(e.hrpn) === rowKey && this.normalizeMonthKey(e.month) === paybillKey
        );
        const matchingDeductions = paybillDeductions.filter(
          (d) => this.canonicalHrpnKey(d.hrpn) === rowKey && this.normalizeMonthKey(d.month) === paybillKey
        );

        // Require BOTH sides: syncing a month that only has earnings would
        // overwrite real payroll tax with 0 (and vice-versa for gross).
        // mItem.hasPaybillData is true when either side exists, so this
        // guard is what stops "sync inserts zeros instead of real data".
        if (matchingEarnings.length === 0 || matchingDeductions.length === 0) continue;

        // 059 three-track sync (corrected): payroll `gross` is the regular
        // monthly total (regular DA lives INSIDE it, same shape as Karmayogi
        // Excel imports), and payroll `da` is the arrears column — DA
        // Difference + Pay Difference ONLY, never regular DA. Display-side
        // splits are authoritative (bill sums + manual with the legacy
        // double-count guard already applied in processReconciliationData).
        const daDiff = this.round2(mItem.pbDaDiff ?? 0);
        const payDiff = this.round2(mItem.pbPayDiff ?? 0);
        const regTotal = this.round2(mItem.pbRegular ?? 0);
        const arrTotal = this.round2(daDiff + payDiff);
        // Sum the real deduction rows for tax instead of trusting the display
        // aggregate, so the written value is always paybill-sourced.
        const realTax = this.round2(matchingDeductions.reduce((sum, d) => sum + (Number((d as { income_tax?: unknown }).income_tax) || 0), 0));

        entries.push({
          employeeId: row.employeeId,
          hrpn: row.hrpn,
          month: mItem.month,
          gross: regTotal,
          da: arrTotal,
          tax: realTax,
          pay_diff: payDiff,
          da_diff: daDiff,
          arrears_tax: 0,
          old_gross: mItem.payrollGross,
          old_da: this.round2((mItem.prDaDiff ?? 0) + (mItem.prPayDiff ?? 0)),
          old_tax: mItem.payrollTax,
          old_pay_diff: mItem.prPayDiff ?? 0,
          old_da_diff: mItem.prDaDiff ?? 0,
        });
      }
    }

    return entries;
  }

  async syncPaybillToPayroll(
    payload: SyncPaybillToPayrollPayload
  ): Promise<SyncPaybillToPayrollResult> {
    const { quarter, fy, hrpns } = payload;
    const rawData = await taxReconciliationRepository.getQuarterRawData(quarter, fy);
    const report = this.processReconciliationData(rawData);
    const entries = this.generateSyncPayload(report, rawData, hrpns);

    if (entries.length === 0) {
      return {
        syncedCount: 0,
        message: 'No eligible Paybill entries found to synchronize.',
      };
    }

    const count = await taxReconciliationRepository.syncPaybillValuesToPayroll(entries, fy, quarter);
    return {
      syncedCount: count,
      message: `Successfully synchronized ${count} salary entries into Payroll 24Q.`,
    };
  }
}

export const taxReconciliationService = new TaxReconciliationService();
