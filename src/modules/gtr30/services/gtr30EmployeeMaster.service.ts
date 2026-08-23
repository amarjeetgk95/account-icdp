import type { GTR30EmployeeMaster, GTR30MasterGroup } from '../types';
import { gtr30EmployeeMasterLocalRepository } from '../repositories/gtr30EmployeeMasterLocal.repository';
import { gtr30EmployeeMasterBackendRepository } from '../repositories/gtr30EmployeeMasterBackend.repository';
import {
  gtr30EmployeeMasterSchema,
  type GTR30EmployeeMasterInput,
} from '../validation/gtr30EmployeeMaster.schema';
import { normalizePayEntries } from '../utils/gtr30PayMatrix';
import { isAllOfficesMode } from '@/shared/utilities/office';

const SYNC_DEBOUNCE_MS = 600;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export type Gtr30SyncPhase = 'idle' | 'pending' | 'syncing' | 'synced' | 'error';

export interface Gtr30SyncStatus {
  phase: Gtr30SyncPhase;
  pendingCount: number;
  errorCount: number;
}

const syncPhases = new Map<string, Gtr30SyncPhase>();
const syncListeners = new Set<() => void>();

function setSyncPhase(key: string, phase: Gtr30SyncPhase): void {
  syncPhases.set(key, phase);
  for (const listener of syncListeners) listener();
}

function aggregateSyncStatus(): Gtr30SyncStatus {
  const phases = [...syncPhases.values()];
  const pendingCount = phases.filter((p) => p === 'pending').length;
  const errorCount = phases.filter((p) => p === 'error').length;
  let phase: Gtr30SyncPhase = 'idle';
  if (errorCount > 0) phase = 'error';
  else if (phases.some((p) => p === 'syncing')) phase = 'syncing';
  else if (pendingCount > 0) phase = 'pending';
  else if (phases.some((p) => p === 'synced')) phase = 'synced';
  return { phase, pendingCount, errorCount };
}

export function getGtr30SyncStatus(): Gtr30SyncStatus {
  return aggregateSyncStatus();
}

export function subscribeGtr30Sync(listener: () => void): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

function debounceReplace(monthKey: string, billCode: string, employees: GTR30EmployeeMaster[]): void {
  const key = gtr30GroupKey(monthKey, billCode);
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      setSyncPhase(key, 'syncing');
      void (async () => {
        try {
          const result = await gtr30EmployeeMasterBackendRepository.replaceGroup(monthKey, billCode, employees);
          if (result === null) {
            let allOffices = false;
            try {
              allOffices = isAllOfficesMode();
            } catch {
              // store unavailable
            }
            setSyncPhase(key, allOffices ? 'idle' : 'error');
          } else {
            setSyncPhase(key, 'synced');
          }
        } catch {
          setSyncPhase(key, 'error');
        }
      })();
    }, SYNC_DEBOUNCE_MS)
  );
}

interface EmployeeGroupSnapshot {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
}

class Gtr30EmployeeMasterService {
  listGroups(): EmployeeGroupSnapshot[] {
    return Object.values(gtr30EmployeeMasterLocalRepository.loadAll());
  }

  listGroupsAsMap(): Record<string, GTR30EmployeeMaster[]> {
    const groups = gtr30EmployeeMasterLocalRepository.loadAll();
    const out: Record<string, GTR30EmployeeMaster[]> = {};
    for (const key of Object.keys(groups)) {
      out[key] = groups[key].employees;
    }
    return out;
  }

  getGroup(monthKey: string, billCode: string): GTR30EmployeeMaster[] {
    const group = gtr30EmployeeMasterLocalRepository.loadGroup(monthKey, billCode);
    return group?.employees ?? [];
  }

  private validateEmployee(employee: GTR30EmployeeMasterInput | GTR30EmployeeMaster): GTR30EmployeeMaster {
    const parsed = gtr30EmployeeMasterSchema.safeParse(employee);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.join('.') || 'employee';
      throw new Error(`${field}: ${issue.message}`);
    }
    const d = parsed.data;
    const payEntries = normalizePayEntries(d.payEntries);
    const latestEntry = payEntries[payEntries.length - 1] ?? null;
    return {
      id: d.id || crypto.randomUUID(),
      srNo: d.srNo,
      billCode: d.billCode ? d.billCode.trim().toUpperCase() : undefined,
      hrpnNo: d.hrpnNo || undefined,
      name: d.name,
      designation: d.designation ?? '',
      designationGujarati: d.designationGujarati ?? '',
      cadreClass: d.cadreClass ?? '',
      payScale: d.payScale ?? '',
      gradePay: d.gradePay ?? '',
      payLevelCell: d.payLevelCell ?? '',
      ppaNo: d.ppaNo ?? '',
      currentPay: latestEntry ? latestEntry.basicPay : d.currentPay,
      currentPayDate: latestEntry ? latestEntry.startDate : (d.currentPayDate ?? ''),
      payEntries,
      quarterAddress: d.quarterAddress ?? '',
      insuranceGroup: d.insuranceGroup ?? '',
      insuranceType: d.insuranceType,
      hraPercent: d.hraPercent,
      da: d.da,
      transportAllowance: d.transportAllowance,
      medicalAllowance: d.medicalAllowance,
      claAllowance: d.claAllowance,
      rentOfBuilding: d.rentOfBuilding,
      professionalTax: d.professionalTax,
      gis1981Insurance: d.gis1981Insurance,
      gis1981Savings: d.gis1981Savings,
      npsPension: d.npsPension,
      societyDeduction: d.societyDeduction,
      remarks: d.remarks ?? '',
    };
  }

  saveEmployee(monthKey: string, billCode: string, employee: GTR30EmployeeMasterInput): GTR30EmployeeMaster[] {
    const valid = this.validateEmployee(employee);
    const existing = this.getGroup(monthKey, billCode);
    const idx = existing.findIndex((e) => e.id === valid.id);
    const next: GTR30EmployeeMaster[] =
      idx >= 0
        ? existing.map((item, i) => (i === idx ? valid : item))
        : [...existing, valid];
    gtr30EmployeeMasterLocalRepository.saveGroup(monthKey, billCode, next);
    setSyncPhase(gtr30GroupKey(monthKey, billCode), 'pending');
    debounceReplace(monthKey, billCode, next);
    this.removeEmployeeFromOtherBillCodes(valid, billCode);
    return next;
  }

  /**
   * Bill code assignment is a move: after saving an employee under its new bill code,
   * strip it from every other bill-code group (all months) so it never appears twice.
   */
  private removeEmployeeFromOtherBillCodes(
    employee: GTR30EmployeeMaster,
    keepBillCode: string
  ): void {
    const target = keepBillCode.trim().toLowerCase();
    const all = gtr30EmployeeMasterLocalRepository.loadAll();
    for (const [key, group] of Object.entries(all)) {
      if (group.billCode.trim().toLowerCase() === target) continue;
      const next = group.employees.filter((e) => e.id !== employee.id);
      if (next.length === group.employees.length) continue;
      gtr30EmployeeMasterLocalRepository.saveGroup(group.monthKey, group.billCode, next);
      setSyncPhase(key, 'pending');
      debounceReplace(group.monthKey, group.billCode, next);
    }
  }

  saveGroup(monthKey: string, billCode: string, employees: GTR30EmployeeMasterInput[]): GTR30EmployeeMaster[] {
    const valid = employees.map((e) => this.validateEmployee(e));
    gtr30EmployeeMasterLocalRepository.saveGroup(monthKey, billCode, valid);
    setSyncPhase(gtr30GroupKey(monthKey, billCode), 'pending');
    debounceReplace(monthKey, billCode, valid);
    return valid;
  }

  copyGroup(
    sourceMonthKey: string,
    sourceBillCode: string,
    targetMonthKey: string,
    targetBillCode: string,
    options?: { overwrite?: boolean; daPercent?: number }
  ): GTR30EmployeeMaster[] {
    const source = this.getGroup(sourceMonthKey, sourceBillCode);
    if (source.length === 0) {
      throw new Error(`No employees found in source group (${sourceMonthKey} / ${sourceBillCode}).`);
    }

    const currentTarget = this.getGroup(targetMonthKey, targetBillCode);
    if (currentTarget.length > 0 && !options?.overwrite) {
      throw new Error(`Target group (${targetMonthKey} / ${targetBillCode}) already has employees. Enable overwrite to replace.`);
    }

    const cloned: GTR30EmployeeMaster[] = source.map((emp, idx) => {
      const pay = emp.currentPay || 0;
      let da = emp.da;
      if (options?.daPercent !== undefined && pay > 0) {
        da = Math.round(pay * (options.daPercent / 100));
      }
      return {
        ...emp,
        id: crypto.randomUUID(),
        srNo: idx + 1,
        da,
      };
    });

    return this.saveGroup(targetMonthKey, targetBillCode, cloned);
  }

  removeEmployee(
    monthKey: string,
    billCode: string,
    employeeId: string
  ): GTR30EmployeeMaster[] {
    const existing = this.getGroup(monthKey, billCode);
    const next = existing.filter((e) => e.id !== employeeId);
    gtr30EmployeeMasterLocalRepository.saveGroup(monthKey, billCode, next);
    setSyncPhase(gtr30GroupKey(monthKey, billCode), 'pending');
    debounceReplace(monthKey, billCode, next);
    return next;
  }

  /**
   * Removal is scoped to the exact employee id. The hrpnNo argument is kept for
   * backward compatibility with existing callers and is ignored.
   */
  removeEmployeeAcrossGroups(
    employeeId: string,
    _hrpnNo: string | undefined,
    billCode: string
  ): { removedCount: number } {
    const all = gtr30EmployeeMasterLocalRepository.loadAll();
    const target = billCode.trim().toLowerCase();
    let removedCount = 0;
    for (const [key, group] of Object.entries(all)) {
      if (group.billCode.trim().toLowerCase() !== target) continue;
      const next = group.employees.filter((e) => e.id !== employeeId);
      if (next.length === group.employees.length) continue;
      removedCount += group.employees.length - next.length;
      gtr30EmployeeMasterLocalRepository.saveGroup(group.monthKey, group.billCode, next);
      setSyncPhase(key, 'pending');
      debounceReplace(group.monthKey, group.billCode, next);
    }
    return { removedCount };
  }

  async hydrateFromBackend(): Promise<void> {
    const remoteGroups = await gtr30EmployeeMasterBackendRepository.listGroups();
    if (remoteGroups === null) {
      let allOffices = false;
      try {
        allOffices = isAllOfficesMode();
      } catch {
        // store unavailable
      }
      if (!allOffices) {
        for (const key of Object.keys(gtr30EmployeeMasterLocalRepository.loadAll())) {
          setSyncPhase(key, 'error');
        }
      }
      return;
    }
    const local = gtr30EmployeeMasterLocalRepository.loadAll();
    const isDirty = (key: string): boolean => {
      const phase = syncPhases.get(key);
      return phase === 'pending' || phase === 'syncing' || phase === 'error';
    };
    const { groups, addedKeys } = reconcileGroups(local, remoteGroups, isDirty);
    for (const group of groups) {
      const key = gtr30GroupKey(group.monthKey, group.billCode);
      const current = local[key];
      if (!current || !sameGroupEmployees(current.employees, group.employees)) {
        gtr30EmployeeMasterLocalRepository.saveGroup(group.monthKey, group.billCode, group.employees);
      }
    }
    for (const key of addedKeys) {
      setSyncPhase(key, 'synced');
    }
  }

  reset(): void {
    gtr30EmployeeMasterLocalRepository.clear();
    for (const timer of pendingTimers.values()) clearTimeout(timer);
    pendingTimers.clear();
    syncPhases.clear();
    for (const listener of syncListeners) listener();
  }

  resolveEmployeesWithFallback(
    monthKey: string,
    billCode: string
  ): GTR30ResolvedEmployees {
    const map = this.listGroupsAsMap();
    return gtr30ResolveEmployees(map, monthKey, billCode);
  }

  getEmployeesForBill(monthKey: string, billCode: string): GTR30EmployeeMaster[] {
    return this.resolveEmployeesWithFallback(monthKey, billCode).rows;
  }
}

export const gtr30EmployeeMasterService = new Gtr30EmployeeMasterService();

export function gtr30GroupKey(monthKey: string, billCode: string): string {
  return `${monthKey.trim().toLowerCase()}|${billCode.trim().toLowerCase()}`;
}

export interface GTR30ResolvedEmployees {
  rows: GTR30EmployeeMaster[];
  sourceKey: string | null;
  isFallback: boolean;
  exactKey: string;
}

/**
 * Resolve employees for a bill month with fallback:
 * 1) exact monthKey|billCode
 * 2) master|billCode
 * 3) aggregated deduped across all groups for that billCode (most useful for August when only July exists)
 */
export function gtr30ResolveEmployees(
  groups: Record<string, GTR30EmployeeMaster[]>,
  monthKey: string,
  billCode: string
): GTR30ResolvedEmployees {
  const trimmedMonth = monthKey.trim();
  const trimmedCode = billCode.trim();
  const exactKey = gtr30GroupKey(trimmedMonth, trimmedCode);

  if (!trimmedMonth || !trimmedCode) {
    return { rows: [], sourceKey: null, isFallback: false, exactKey };
  }

  const exact = groups[exactKey];
  if (exact && exact.length > 0) {
    return { rows: exact, sourceKey: exactKey, isFallback: false, exactKey };
  }

  const masterKey = gtr30GroupKey('master', trimmedCode);
  const masterRows = groups[masterKey];
  if (masterRows && masterRows.length > 0) {
    return { rows: masterRows, sourceKey: masterKey, isFallback: true, exactKey };
  }

  // Fallback: aggregate deduped employees for this billCode across all months
  const targetBillLower = trimmedCode.toLowerCase();
  const aggregated: GTR30EmployeeMaster[] = [];
  const seen = new Set<string>();

  for (const [key, emps] of Object.entries(groups)) {
    const sepIdx = key.lastIndexOf('|');
    if (sepIdx < 0) continue;
    const keyBill = key.slice(sepIdx + 1).trim().toLowerCase();
    if (keyBill !== targetBillLower) continue;
    if (!emps || emps.length === 0) continue;
    for (const emp of emps) {
      const hrpn = (emp.hrpnNo ?? '').trim().toLowerCase();
      const dedupeKey = hrpn ? `hrpn:${hrpn}` : `id:${emp.id}`;
      const finalKey = `${dedupeKey}|${targetBillLower}`;
      if (seen.has(finalKey)) continue;
      seen.add(finalKey);
      aggregated.push(emp);
    }
  }

  if (aggregated.length > 0) {
    // Use the first found group key as source for display; mark as fallback
    const firstKey = Object.keys(groups).find((k) => {
      const bill = k.slice(k.lastIndexOf('|') + 1).trim().toLowerCase();
      return bill === targetBillLower && (groups[k]?.length ?? 0) > 0;
    }) ?? null;
    return { rows: aggregated, sourceKey: firstKey, isFallback: true, exactKey };
  }

  return { rows: [], sourceKey: null, isFallback: false, exactKey };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function sameGroupEmployees(a: GTR30EmployeeMaster[], b: GTR30EmployeeMaster[]): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

export interface Gtr30ReconcileResult {
  groups: GTR30MasterGroup[];
  addedKeys: string[];
}

/**
 * Merge backend groups into local state without losing unsynced local work.
 * - remote group missing locally -> inserted (reported in addedKeys)
 * - local group dirty (pending/syncing/error) -> local version wins
 * - local group clean and identical -> kept untouched
 * - local group clean but different -> replaced with the backend version
 * - local groups absent from the backend -> preserved (offline-created data)
 */
export function reconcileGroups(
  local: Record<string, GTR30MasterGroup>,
  remote: GTR30MasterGroup[],
  isDirty: (key: string) => boolean
): Gtr30ReconcileResult {
  const groups: GTR30MasterGroup[] = [];
  const addedKeys: string[] = [];
  const matched = new Set<string>();

  for (const remoteGroup of remote) {
    const key = gtr30GroupKey(remoteGroup.monthKey, remoteGroup.billCode);
    matched.add(key);
    const localGroup = local[key];
    if (!localGroup) {
      addedKeys.push(key);
      groups.push({ monthKey: remoteGroup.monthKey, billCode: remoteGroup.billCode, employees: remoteGroup.employees });
      continue;
    }
    if (isDirty(key)) {
      groups.push(localGroup);
      continue;
    }
    if (sameGroupEmployees(localGroup.employees, remoteGroup.employees)) {
      groups.push(localGroup);
    } else {
      groups.push({ monthKey: remoteGroup.monthKey, billCode: remoteGroup.billCode, employees: remoteGroup.employees });
    }
  }

  for (const [key, localGroup] of Object.entries(local)) {
    if (!matched.has(key)) groups.push(localGroup);
  }

  return { groups, addedKeys };
}
