import { supabase } from '@/core/supabase/client';
import { paybillRepository } from '@/modules/paybill/repositories/paybill.repository';
import {
  buildLegacyBridge,
  resolveLegacyId,
  toCanonicalHrpn,
} from '@/shared/domain/canonicalEmployee';
import type { SyncPaybillToPayrollItem } from '../types/reconciliation';

export interface RawEmployeeDbRow {
  id: string;
  name: string;
  pan: string | null;
  hprn_no: string | null;
  designation: string | null;
  join_date: string | null;
  transfer_date: string | null;
}

export interface RawSalaryDbRow {
  employee_id: string;
  month: string;
  gross: number | string | null;
  da: number | string | null;
  tax: number | string | null;
  /** 059 three-track: Pay Difference arrears booked in this paid month. */
  pay_diff?: number | string | null;
  /** 059 three-track: DA Difference arrears booked in this paid month. */
  da_diff?: number | string | null;
  /** 059 three-track: TDS attributable to arrears (subset of tax). */
  arrears_tax?: number | string | null;
}

export interface RawPaybillDeductionRow {
  id: string;
  hrpn: string;
  employee_name: string;
  employee_id: string | null;
  designation: string | null;
  month: string;
  financial_year: number;
  /** 059: REGULAR monthly vs DA_ARREAR / PAY_ARREAR / SUPPLEMENTARY. Missing = REGULAR. */
  bill_type?: string | null;
  income_tax: number | string | null;
  prof_tax: number | string | null;
  total_deductions: number | string | null;
  net_pay: number | string | null;
}

export interface RawPaybillEarningRow {
  id: string;
  hrpn: string;
  employee_name: string;
  employee_id: string | null;
  designation: string | null;
  month: string;
  financial_year: number;
  /** 059: REGULAR monthly vs DA_ARREAR / PAY_ARREAR / SUPPLEMENTARY. Missing = REGULAR. */
  bill_type?: string | null;
  gross_amount: number | string | null;
  basic_pay: number | string | null;
  da: number | string | null;
  hra?: number | string | null;
  cla?: number | string | null;
  medical_allowance?: number | string | null;
  transport_allowance?: number | string | null;
  special_pay?: number | string | null;
  washing_allowance?: number | string | null;
  npp_allowance?: number | string | null;
}

export interface QuarterRawData {
  quarter: string;
  fy: number;
  /** Payment months (Payroll convention): Q1 = Apr/May/Jun, etc. */
  months: string[];
  /**
   * Work months (Paybill convention): Q1 = Mar/Apr/May, etc.
   * Paybill rows store the work month from the PDF header, so they must be
   * queried with these values and aligned index-wise with `months`.
   * Optional for backward-compat with unit-test fixtures (falls back to `months`).
   */
  paybillMonths?: string[];
  employees: RawEmployeeDbRow[];
  salaries: RawSalaryDbRow[];
  paybillDeductions: RawPaybillDeductionRow[];
  paybillEarnings: RawPaybillEarningRow[];
  /**
   * Manual ledger values `{ [hrpn]: { [label]: { [MonthName]: amount } } }`
   * (Pay Difference / DA Difference arrears). The ledger Gross Amt includes
   * these but the printed bill gross does not — reconciliation adds them to
   * the paybill side so arrears months don't false-flag GROSS_MISMATCH.
   */
  manualLedgerValues?: Record<string, Record<string, Record<string, number>>>;
}

export const QUARTER_MONTH_MAP: Record<string, string[]> = {
  Q1: ['April', 'May', 'June'],
  Q2: ['July', 'August', 'September'],
  Q3: ['October', 'November', 'December'],
  Q4: ['January', 'February', 'March'],
};

/**
 * Paybill inner sheets store the WORK month (e.g. "March-2026" => month='March'),
 * while Payroll `employee_salaries` stores the PAYMENT month
 * (e.g. March work paid in April => month='April').
 * Reconciliation must therefore query Paybill with work months and Payroll
 * with payment (paid) months, then align them index-wise:
 *   Q1 paid [Apr,May,Jun] <=> work [Mar,Apr,May], etc.
 * This mirrors getMonthLabelsForQuarter() work/paid pairs and
 * payrollService.getMonthOptions() ("March paid in April").
 */
export const QUARTER_WORK_MONTH_MAP: Record<string, string[]> = {
  Q1: ['March', 'April', 'May'],
  Q2: ['June', 'July', 'August'],
  Q3: ['September', 'October', 'November'],
  Q4: ['December', 'January', 'February'],
};

export const taxReconciliationRepository = {
  async getQuarterRawData(quarter: string, fy: number): Promise<QuarterRawData> {
    const months = QUARTER_MONTH_MAP[quarter] || QUARTER_MONTH_MAP.Q1;
    const paybillMonths = QUARTER_WORK_MONTH_MAP[quarter] || QUARTER_WORK_MONTH_MAP.Q1;

    // 1. Fetch Employee Master — Establishment-first canonical roster.
    // The HRPN lives in the employee ledger (`establishment_employees`, e.g.
    // Sr 52 Solanki HRPN 20105451); the legacy payroll `employees` table often
    // has a blank HRPN for the same person, which used to surface as EMP-* and
    // could never join paybill. Each canonical person keeps the ledger HRPN
    // (hard join key) and resolves to its legacy row id via HRPN (fallback
    // PAN) so `employee_salaries` (keyed by legacy id) keep joining.
    // Last resort is an exact full-name match for split records where the
    // ledger has the HRPN but a blank PAN and the legacy row has the PAN but
    // a blank HRPN (e.g. Makwana: ledger 20138092/PAN blank + legacy PAN
    // ANIPM7821N/HRPN blank) — same normalized name, nothing else in common.
    // This never touches the paybill join, which stays strictly HRPN.
    // Persons with no legacy row keep id `est:<uuid>` — visible, not syncable.
    let employees: RawEmployeeDbRow[] = [];
    try {
      const [estRes, legRes] = await Promise.all([
        supabase
          .from('establishment_employees')
          .select('id, hrpn_no, name, pan, designation, join_date, transfer_date, display_order')
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('name'),
        supabase
          .from('employees')
          .select('id, name, pan, hprn_no, designation, join_date, transfer_date')
          .order('id'),
      ]);
      if (estRes.error) throw estRes.error;
      if (legRes.error) console.warn('[TaxReconciliationRepo] Legacy employees unavailable:', legRes.error);

      type EstRow = {
        id: string | number;
        hrpn_no: string | null;
        name: string;
        pan: string | null;
        designation?: string | null;
        join_date?: string | null;
        transfer_date?: string | null;
        display_order?: number | null;
      };
      type LegRow = {
        id: string | number;
        hprn_no: string | null;
        name: string;
        pan: string | null;
        designation?: string | null;
        join_date?: string | null;
        transfer_date?: string | null;
      };
      const normalizeFullName = (v: unknown): string =>
        String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const estRows = ((estRes.data || []) as EstRow[]);
      const legRows = ((legRes.data || []) as LegRow[]);
      const bridge = buildLegacyBridge(legRows);
      const legacyMap = new Map(legRows.map((r) => [String(r.id), r]));
      const matchedLegacyIds = new Set<string>();
      // Exact-name index over legacy rows (ambiguous names map to null = no link).
      const legacyByExactName = new Map<string, string | null>();
      for (const leg of legRows) {
        const key = normalizeFullName(leg.name);
        if (!key) continue;
        if (legacyByExactName.has(key)) {
          legacyByExactName.set(key, null);
        } else {
          legacyByExactName.set(key, String(leg.id));
        }
      }

      for (const r of estRows) {
        let legacyId = resolveLegacyId(r.hrpn_no, r.pan, bridge);
        if (!legacyId) {
          const key = normalizeFullName(r.name);
          const candidate = key ? legacyByExactName.get(key) : undefined;
          if (candidate && !matchedLegacyIds.has(candidate)) {
            legacyId = candidate;
          }
        }
        const leg = legacyId ? legacyMap.get(legacyId) : undefined;
        if (legacyId) matchedLegacyIds.add(legacyId);
        const hrpn = toCanonicalHrpn(r.hrpn_no) || toCanonicalHrpn(leg?.hprn_no);
        employees.push({
          id: legacyId ?? `est:${String(r.id)}`,
          name: r.name || leg?.name || '',
          pan: r.pan ?? leg?.pan ?? null,
          hprn_no: hrpn || null,
          designation: r.designation ?? leg?.designation ?? null,
          join_date: r.join_date ?? leg?.join_date ?? null,
          transfer_date: r.transfer_date ?? leg?.transfer_date ?? null,
        });
      }
      // Preserve legacy-only rows (salary entered under a legacy id not yet
      // linked to the ledger) so their salaries still appear.
      for (const leg of legRows) {
        if (!matchedLegacyIds.has(String(leg.id))) {
          employees.push({
            id: String(leg.id),
            name: leg.name,
            pan: leg.pan,
            hprn_no: leg.hprn_no,
            designation: leg.designation ?? null,
            join_date: leg.join_date ?? null,
            transfer_date: leg.transfer_date ?? null,
          });
        }
      }
    } catch (err) {
      console.warn('[TaxReconciliationRepo] Establishment roster unavailable, falling back to legacy employees:', err);
      const { data: employeesData, error: empErr } = await supabase
        .from('employees')
        .select('id, name, pan, hprn_no, designation, join_date, transfer_date')
        .order('id');
      if (empErr) console.warn('[TaxReconciliationRepo] Failed to fetch employees:', empErr);
      employees = ((employeesData || []) as RawEmployeeDbRow[]);
    }

    // 2. Fetch Payroll Salaries for the quarter months
    // 059: include arrears splits so regular vs DA-diff vs Pay-diff reconcile separately.
    // gross+da stays the TOTAL monthly pay (regular DA lives inside it).
    const { data: salariesData, error: salErr } = await supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax, pay_diff, da_diff, arrears_tax')
      .eq('financial_year', fy)
      .in('month', months);
    if (salErr) console.warn('[TaxReconciliationRepo] Failed to fetch salaries:', salErr);
    const salaries: RawSalaryDbRow[] = (salariesData || []) as RawSalaryDbRow[];

    // 3. Fetch Paybill Deductions (IT code 9510)
    // NOTE: Paybill stores WORK months (Mar/Apr/May for Q1), Payroll stores
    // PAYMENT months (Apr/May/Jun). Query each side with its own convention.
    let paybillDeductions: RawPaybillDeductionRow[] = [];
    try {
      const { data: dedData, error: dedErr } = await supabase
        .from('paybill_employee_deductions')
        .select('id, hrpn, employee_name, employee_id, designation, month, financial_year, bill_type, income_tax, prof_tax, total_deductions, net_pay')
        .eq('financial_year', fy)
        .in('month', paybillMonths);
      if (dedErr) throw dedErr;
      if (dedData) {
        paybillDeductions = dedData as RawPaybillDeductionRow[];
      }
    } catch (err) {
      console.warn('[TaxReconciliationRepo] Falling back to paybillRepository for deductions:', err);
      const fallbackList = await paybillRepository.listDeductions({ financialYear: fy });
      const workSet = new Set(paybillMonths.map((m) => m.toLowerCase()));
      paybillDeductions = fallbackList
        .filter((d) => workSet.has(String(d.month).toLowerCase()))
        .map((d) => ({
          id: d.id,
          hrpn: d.hrpn,
          employee_name: d.employeeName,
          employee_id: d.employeeId,
          designation: d.designation,
          month: d.month,
          financial_year: d.financialYear,
          bill_type: (d as unknown as { billType?: string }).billType ?? 'REGULAR',
          income_tax: d.incomeTax,
          prof_tax: d.profTax,
          total_deductions: d.totalDeductions,
          net_pay: d.netPay,
        }));
    }

    // 4. Fetch Paybill Earnings (WORK months)
    let paybillEarnings: RawPaybillEarningRow[] = [];
    try {
      const { data: earnData, error: earnErr } = await supabase
        .from('paybill_employee_earnings')
        .select('id, hrpn, employee_name, employee_id, designation, month, financial_year, bill_type, gross_amount, basic_pay, da, hra, cla, medical_allowance, transport_allowance, special_pay, washing_allowance, npp_allowance')
        .eq('financial_year', fy)
        .in('month', paybillMonths);
      if (earnErr) throw earnErr;
      if (earnData) {
        paybillEarnings = earnData as RawPaybillEarningRow[];
      }
    } catch (err) {
      console.warn('[TaxReconciliationRepo] Falling back to paybillRepository for earnings:', err);
      const fallbackList = await paybillRepository.listEarnings({ financialYear: fy });
      const workSet = new Set(paybillMonths.map((m) => m.toLowerCase()));
      paybillEarnings = fallbackList
        .filter((e) => workSet.has(String(e.month).toLowerCase()))
        .map((e) => ({
          id: e.id,
          hrpn: e.hrpn,
          employee_name: e.employeeName,
          employee_id: e.employeeId,
          designation: e.designation,
          month: e.month,
          financial_year: e.financialYear,
          bill_type: (e as unknown as { billType?: string }).billType ?? 'REGULAR',
          gross_amount: e.grossAmount,
          basic_pay: e.basicPay,
          da: e.da,
          hra: (e as unknown as { hra?: number }).hra ?? 0,
          cla: (e as unknown as { cla?: number }).cla ?? 0,
          medical_allowance: (e as unknown as { medicalAllowance?: number }).medicalAllowance ?? 0,
          transport_allowance: (e as unknown as { transportAllowance?: number }).transportAllowance ?? 0,
          special_pay: (e as unknown as { specialPay?: number }).specialPay ?? 0,
          washing_allowance: (e as unknown as { washingAllowance?: number }).washingAllowance ?? 0,
          npp_allowance: (e as unknown as { nppAllowance?: number }).nppAllowance ?? 0,
        }));
    }

    // 1b. Manual ledger arrears (Pay/DA Difference) — stored in
    // paybill_settings/localStorage, keyed { hrpn -> label -> MonthName }.
    let manualLedgerValues: Record<string, Record<string, Record<string, number>>> = {};
    try {
      manualLedgerValues = (await paybillRepository.getManualLedgerValues()) || {};
    } catch (err) {
      console.warn('[TaxReconciliationRepo] Manual ledger values unavailable:', err);
    }

    return {
      quarter,
      fy,
      months,
      paybillMonths,
      employees,
      salaries,
      paybillDeductions,
      paybillEarnings,
      manualLedgerValues,
    };
  },

  async syncPaybillValuesToPayroll(
    records: SyncPaybillToPayrollItem[],
    fy: number,
    quarter?: string
  ): Promise<number> {
    if (!records || records.length === 0) return 0;

    // 059: persist arrears splits alongside totals. gross/da/tax stay TOTALS;
    // pay_diff/da_diff carry the arrears tracks so regular reconciles on its own.
    const payload = records.map((r) => ({
      employee_id: r.employeeId,
      financial_year: fy,
      month: r.month,
      gross: Math.round(r.gross * 100) / 100,
      da: Math.round(r.da * 100) / 100,
      tax: Math.round(r.tax * 100) / 100,
      pay_diff: Math.round((r.pay_diff ?? 0) * 100) / 100,
      da_diff: Math.round((r.da_diff ?? 0) * 100) / 100,
      arrears_tax: Math.round((r.arrears_tax ?? 0) * 100) / 100,
    }));

    const { error } = await supabase
      .from('employee_salaries')
      .upsert(payload, { onConflict: 'employee_id,financial_year,month' });

    if (error) {
      // Backward compat: pre-059 DBs lack the new columns — retry without them.
      const msg = String((error as { message?: string })?.message || error);
      if (/pay_diff|da_diff|arrears_tax|column/i.test(msg)) {
        const legacy = payload.map(({ pay_diff, da_diff, arrears_tax, ...rest }) => rest);
        const { error: retryErr } = await supabase
          .from('employee_salaries')
          .upsert(legacy, { onConflict: 'employee_id,financial_year,month' });
        if (retryErr) throw retryErr;
        return legacy.length;
      }
      throw error;
    }

    // 059 audit logging: write old vs new changes to tax_recon_sync_log (best-effort)
    try {
      const logs = records.map((r) => ({
        financial_year: fy,
        quarter: quarter || 'Q1',
        month: r.month,
        employee_id: r.employeeId,
        hrpn: r.hrpn || '',
        old_gross: r.old_gross != null ? Math.round(r.old_gross * 100) / 100 : null,
        old_da: r.old_da != null ? Math.round(r.old_da * 100) / 100 : null,
        old_tax: r.old_tax != null ? Math.round(r.old_tax * 100) / 100 : null,
        new_gross: Math.round(r.gross * 100) / 100,
        new_da: Math.round(r.da * 100) / 100,
        new_tax: Math.round(r.tax * 100) / 100,
        new_pay_diff: Math.round((r.pay_diff ?? 0) * 100) / 100,
        new_da_diff: Math.round((r.da_diff ?? 0) * 100) / 100,
      }));
      await supabase.from('tax_recon_sync_log').insert(logs);
    } catch (auditErr) {
      console.warn('[TaxReconciliationRepo] tax_recon_sync_log write notice:', auditErr);
    }

    return payload.length;
  },
};
