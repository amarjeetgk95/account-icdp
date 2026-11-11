import { useQuery } from '@tanstack/react-query';
import { paybillRepository } from '../repositories/paybill.repository';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
// Legacy read-only fallback: payroll `employees` is NOT a second master.
// Canonical writes live in Establishment — see `@/shared/domain/canonicalEmployee`.
import { employeeService } from '@/modules/payroll/services/employee.service';
import { toCanonicalHrpn } from '@/shared/domain/canonicalEmployee';
import { servesInFinancialYear, type EstablishmentEmployee } from '@/modules/establishment/types';
import { isPlaceholderName, splitBundledNameAndDesignation } from '../services/hrpnMapping.service';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';

export interface PaybillDirectoryEntry {
  hrpn: string;
  name: string;
  designation?: string | null;
  payScale?: string | null;
  joinDate?: string | null;
  transferDate?: string | null;
  /**
   * True when this HRPN exists in the Establishment employee directory.
   * Establishment is the single source of truth — `false` means the paybill
   * row has NO matching Establishment record and must surface as an error.
   */
  isMatched?: boolean;
  /** Where the entry originates (canonical entries come from establishment). */
  source?: 'establishment' | 'paybill' | 'payroll' | 'both';
}

export interface UnmatchedPaybillHrpn {
  hrpn: string;
  name: string;
  source: 'earning' | 'deduction';
}

/**
 * Canonical HRPN key — delegates to shared `toCanonicalHrpn` so Establishment,
 * Paybill and Payroll agree on placeholders ('0','-','NA',…). Empty → ''.
 * Kept as a thin wrapper for backward-compat with existing imports/tests.
 */
export function normalizeDirectoryHrpn(value: unknown): string {
  return toCanonicalHrpn(value);
}

/**
 * Paybill HRPNs with NO matching Establishment record.
 * Comparison is case-insensitive on the canonical HRPN. Establishment rows
 * without a usable HRPN cannot be matched and are ignored here.
 */
export function findUnmatchedPaybillHrpns(
  earnings: Pick<PayBillStoredEarning, 'hrpn' | 'employeeName'>[],
  deductions: Pick<PayBillStoredDeduction, 'hrpn' | 'employeeName'>[],
  estEmployees: Pick<EstablishmentEmployee, 'hrpnNo'>[]
): UnmatchedPaybillHrpn[] {
  const estKeys = new Set<string>();
  for (const emp of estEmployees) {
    const key = normalizeDirectoryHrpn(emp.hrpnNo);
    if (key) estKeys.add(key);
  }
  const seen = new Set<string>();
  const out: UnmatchedPaybillHrpn[] = [];
  const consider = (
    hrpn: string | null | undefined,
    name: string,
    source: UnmatchedPaybillHrpn['source']
  ) => {
    const key = normalizeDirectoryHrpn(hrpn);
    if (!key || estKeys.has(key) || seen.has(`${key}|${source}`)) return;
    seen.add(`${key}|${source}`);
    // De-dupe across earning+deduction: one row per HRPN, earning wins.
    if (out.some((r) => r.hrpn === key)) return;
    out.push({ hrpn: key, name: name || `Employee ${key}`, source });
  };
  for (const e of earnings) consider(e.hrpn, e.employeeName, 'earning');
  for (const d of deductions) consider(d.hrpn, d.employeeName, 'deduction');
  return out.sort((a, b) => a.hrpn.localeCompare(b.hrpn));
}

/**
 * Duplicate HRPNs inside the Establishment directory (canonical, case-insensitive).
 * No duplication of HRPN No. is allowed — returns each duplicated HRPN once.
 */
export function findDuplicateDirectoryHrpns(
  estEmployees: Pick<EstablishmentEmployee, 'hrpnNo'>[]
): string[] {
  const counts = new Map<string, number>();
  for (const emp of estEmployees) {
    const key = normalizeDirectoryHrpn(emp.hrpnNo);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n > 1)
    .map(([hrpn]) => hrpn)
    .sort();
}

/**
 * Employee ledger directory — Establishment is the single source of truth.
 *
 * 1. Establishment employees who served in this FY seed the directory first;
 *    their name/designation/payScale are canonical and are never overwritten
 *    by paybill text (paybill variations are data errors, not truth).
 * 2. Paybill earnings/deductions enrich only missing fields (payScale, dates)
 *    for matched HRPNs. Paybill-only HRPNs are still listed so the ledger can
 *    render them, but flagged `isMatched: false` so the UI shows the
 *    "not matched with Establishment" error.
 * 3. Legacy payroll `employees` rows fill gaps only when neither Establishment
 *    nor paybill knows the HRPN (read-only fallback — NOT a second master).
 */
export function buildEmployeeDirectory(
  earnings: PayBillStoredEarning[],
  deductions: PayBillStoredDeduction[],
  estEmployees: EstablishmentEmployee[],
  financialYear: number,
  payrollEmployees?: Array<{ hprn_no?: string | null; name: string; designation?: string | null; pay_scale?: string | null; join_date?: string | null; transfer_date?: string | null }>
): PaybillDirectoryEntry[] {
  const map = new Map<string, PaybillDirectoryEntry>();

  // 1. Establishment FIRST — canonical identities.
  for (const emp of estEmployees) {
    const hrpnKey = normalizeDirectoryHrpn(emp.hrpnNo);
    if (!hrpnKey) continue;
    if (!servesInFinancialYear(emp, financialYear)) continue;
    if (map.has(hrpnKey)) continue; // first wins; duplicates reported separately

    map.set(hrpnKey, {
      hrpn: hrpnKey,
      name: emp.name || `Employee ${hrpnKey}`,
      designation: emp.designation || null,
      payScale: emp.payScale || null,
      ...(emp.joinDate ? { joinDate: emp.joinDate } : {}),
      ...(emp.transferDate ? { transferDate: emp.transferDate } : {}),
      isMatched: true,
      source: 'establishment',
    });
  }

  // 2a. Paybill earnings — enrich matched, flag unmatched.
  for (const e of earnings) {
    const hrpnKey = normalizeDirectoryHrpn(e.hrpn);
    if (!hrpnKey) continue;
    const existing = map.get(hrpnKey);
    if (!existing) {
      map.set(hrpnKey, {
        hrpn: hrpnKey,
        name: e.employeeName || 'Employee',
        designation: e.designation || null,
        payScale: e.payScale || null,
        isMatched: false,
        source: 'paybill',
      });
    } else {
      existing.source = existing.source === 'establishment' ? 'both' : existing.source;
      // Canonical Establishment name/designation win — only fill gaps.
      if (isPlaceholderName(existing.name) && !isPlaceholderName(e.employeeName)) {
        existing.name = e.employeeName;
      }
      if ((!existing.designation || existing.designation === 'Staff') && e.designation) {
        existing.designation = e.designation;
      }
      if (!existing.payScale && e.payScale) {
        existing.payScale = e.payScale;
      }
    }
  }

  // 2b. Paybill deductions — same treatment.
  for (const d of deductions) {
    const hrpnKey = normalizeDirectoryHrpn(d.hrpn);
    if (!hrpnKey) continue;
    const existing = map.get(hrpnKey);
    if (!existing) {
      map.set(hrpnKey, {
        hrpn: hrpnKey,
        name: d.employeeName || 'Employee',
        designation: d.designation || null,
        payScale: null,
        isMatched: false,
        source: 'paybill',
      });
    } else {
      existing.source = existing.source === 'establishment' ? 'both' : existing.source;
      if (isPlaceholderName(existing.name) && !isPlaceholderName(d.employeeName)) {
        existing.name = d.employeeName;
      }
      if ((!existing.designation || existing.designation === 'Staff') && d.designation) {
        existing.designation = d.designation;
      }
    }
  }

  // 3. Legacy payroll fallback (read-only) — only when nobody else knows the HRPN.
  if (payrollEmployees && Array.isArray(payrollEmployees)) {
    for (const p of payrollEmployees) {
      const hrpnKey = normalizeDirectoryHrpn(p.hprn_no);
      if (!hrpnKey) continue;
      if (!servesInFinancialYear({ joinDate: p.join_date, transferDate: p.transfer_date }, financialYear)) continue;
      if (map.has(hrpnKey)) {
        const existing = map.get(hrpnKey)!;
        if (!existing.joinDate && p.join_date) existing.joinDate = p.join_date;
        if (!existing.transferDate && p.transfer_date) existing.transferDate = p.transfer_date;
        if (!existing.payScale && p.pay_scale) existing.payScale = p.pay_scale;
        continue;
      }

      map.set(hrpnKey, {
        hrpn: hrpnKey,
        name: p.name,
        designation: p.designation || null,
        payScale: p.pay_scale || null,
        ...(p.join_date ? { joinDate: p.join_date } : {}),
        ...(p.transfer_date ? { transferDate: p.transfer_date } : {}),
        isMatched: false,
        source: 'payroll',
      });
    }
  }

  // Last resort: recover a name bundled into the designation text
  // (e.g. "Live Stock Inspector Sayan" -> name "Sayan") instead of
  // leaving the generic "Employee <HRPN>" fallback.
  for (const entry of map.values()) {
    if (isPlaceholderName(entry.name) && entry.designation) {
      const split = splitBundledNameAndDesignation(entry.designation);
      if (split) {
        entry.name = split.name;
        entry.designation = split.designation;
      }
    }
  }

  return Array.from(map.values());
}

export interface EmployeeDirectoryResult {
  employees: PaybillDirectoryEntry[];
  /** Paybill HRPNs missing from Establishment — each must surface as an error. */
  unmatched: UnmatchedPaybillHrpn[];
  /** Duplicated HRPNs inside the Establishment directory (should always be []). */
  duplicateHrpns: string[];
  /** Canonical Establishment HRPN set (upper-cased) for O(1) match checks. */
  establishmentHrpns: Set<string>;
}

export function useEmployeeDirectory(financialYear: number) {
  const query = useQuery({
    queryKey: ['paybill', 'directory', financialYear],
    queryFn: async (): Promise<EmployeeDirectoryResult> => {
      const [earnings, deductions] = await Promise.all([
        paybillRepository.listEarnings({ financialYear }),
        paybillRepository.listDeductions({ financialYear }),
      ]);

      let estEmployees: EstablishmentEmployee[] = [];
      try {
        estEmployees = await establishmentService.syncEmployees();
        if (!estEmployees || estEmployees.length === 0) estEmployees = establishmentService.loadEmployees();
      } catch (err) {
        console.warn('[useEmployeeDirectory] establishment sync failed:', err);
        estEmployees = establishmentService.loadEmployees();
      }

      let payrollEmployees: Array<{ hprn_no?: string | null; name: string; designation?: string | null; pay_scale?: string | null }> = [];
      try {
        payrollEmployees = await employeeService.listEmployees();
      } catch (err) {
        console.warn('[useEmployeeDirectory] payroll employees fetch failed:', err);
      }

      const employees = buildEmployeeDirectory(earnings, deductions, estEmployees, financialYear, payrollEmployees);
      const unmatched = findUnmatchedPaybillHrpns(earnings, deductions, estEmployees);
      const duplicateHrpns = findDuplicateDirectoryHrpns(estEmployees);
      const establishmentHrpns = new Set(
        estEmployees.map((e) => normalizeDirectoryHrpn(e.hrpnNo)).filter(Boolean)
      );
      return { employees, unmatched, duplicateHrpns, establishmentHrpns };
    },
    staleTime: 60_000,
  });

  const data = query.data;
  return {
    employees: data?.employees ?? [],
    unmatched: data?.unmatched ?? [],
    duplicateHrpns: data?.duplicateHrpns ?? [],
    establishmentHrpns: data?.establishmentHrpns ?? new Set<string>(),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
