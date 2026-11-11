import type { GTR30BillCodeMapping, GTR30EmployeeMaster } from '../types';
import { isLegacyBillCode, normalizeBillCodeKey } from '../constants/billCodes';

export interface Gtr30BillCodeOption {
  billCode: string;
  description: string;
}

/**
 * Classification applied to bill codes that exist only in the employee master
 * (no configured mapping yet). Mirrors the default Stats budget head so new
 * bills still carry a sane classification until one is configured in Settings.
 */
const DYNAMIC_FALLBACK_CLASSIFICATION = {
  controllingOfficer: '0101',
  classOfExpenditure: '1',
  fund: '3',
  drawingOfficer: '299',
  demandNo: '004',
  typeOfBudget: '1',
  schemeNo: '0000000',
  headChargeable: '2403001139900',
  sector: 'Sector-C-Economic Service',
  majorHead: 'Major Head-2403 Animal Husbandry',
  subMajorHead: '-',
  minorHead: 'Minor Head-113 Administrative Investigation and Statistics',
  subHead:
    'Sub Head-05 Scheme for Strengthening of Statistical Wing in Directorate of Animal Husbandry (Pay and Allowances for Centrally Sponsored Scheme)',
  budgetYear: '2026-27',
} as const;

function dynamicMapping(code: string): GTR30BillCodeMapping {
  return {
    id: `bc-dyn-${code}`,
    billCode: code,
    description: `${code} Bill`,
    ...DYNAMIC_FALLBACK_CLASSIFICATION,
  };
}

function groupRawCode(groupKey: string): string {
  return (groupKey.split('|')[1] || '').trim();
}

/**
 * Merge configured bill-code mappings with codes discovered in the employee
 * master groups:
 * - configured mappings always win over derived codes,
 * - legacy dummy codes (`GTR30-SAL`, `GTR30-DA`, `GTR30-BONUS`) are dropped,
 * - case/hyphen variants collapse onto the canonical mapping entry.
 */
export function mergeGtr30BillCodeMappings(
  configured: GTR30BillCodeMapping[],
  employeeGroups: Record<string, GTR30EmployeeMaster[]> | undefined
): GTR30BillCodeMapping[] {
  const map = new Map<string, GTR30BillCodeMapping>();
  const put = (mapping: GTR30BillCodeMapping) => {
    const key = normalizeBillCodeKey(mapping.billCode);
    if (key && !map.has(key)) map.set(key, mapping);
  };

  for (const m of configured) {
    if (!isLegacyBillCode(m.billCode)) put(m);
  }

  for (const [key, emps] of Object.entries(employeeGroups ?? {})) {
    const rawCode = groupRawCode(key);
    const derivedCodes = [rawCode, ...emps.map((e) => (e.billCode || '').trim())];
    for (const code of derivedCodes) {
      if (!code || isLegacyBillCode(code)) continue;
      const dedupeKey = normalizeBillCodeKey(code);
      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, dynamicMapping(code.toUpperCase()));
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Bill-code picker options (billCode + label) for the management and master
 * forms: configured mappings first, then group/employee-derived codes with
 * legacy codes filtered out. `extraCodes` (e.g. the code currently being
 * edited) are always included so existing records stay selectable even if
 * they use a legacy code.
 */
export function buildGtr30BillCodeOptions(
  configured: GTR30BillCodeMapping[],
  employeeGroups: Record<string, GTR30EmployeeMaster[]> | undefined,
  extraCodes: Array<string | null | undefined> = []
): Gtr30BillCodeOption[] {
  const map = new Map<string, Gtr30BillCodeOption>();
  const put = (code: string, description: string, force = false) => {
    const key = normalizeBillCodeKey(code);
    if (!key) return;
    if (force || !map.has(key)) map.set(key, { billCode: code, description });
  };

  for (const m of configured) {
    put(m.billCode.trim().toUpperCase(), m.description || `${m.billCode} Bill`);
  }

  for (const [key, emps] of Object.entries(employeeGroups ?? {})) {
    const rawCode = groupRawCode(key);
    if (rawCode && !isLegacyBillCode(rawCode)) {
      put(rawCode.toUpperCase(), `${rawCode.toUpperCase()} (Master Group)`);
    }
    for (const emp of emps) {
      const empCode = (emp.billCode || rawCode).trim();
      if (empCode && !isLegacyBillCode(empCode)) {
        put(empCode.toUpperCase(), `${empCode.toUpperCase()} (From Employee Record)`);
      }
    }
  }

  for (const code of extraCodes) {
    const trimmed = (code || '').trim().toUpperCase();
    if (trimmed) put(trimmed, `${trimmed} Bill`, true);
  }

  return Array.from(map.values());
}
