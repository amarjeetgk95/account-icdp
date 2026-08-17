import type {
  GTR30EmployeeMaster,
  GTR30MasterGroup,
} from '../types';
import { gtr30EmployeeMasterLocalRepository } from '../repositories/gtr30EmployeeMasterLocal.repository';
import { gtr30EmployeeMasterBackendRepository } from '../repositories/gtr30EmployeeMasterBackend.repository';
import {
  gtr30EmployeeMasterSchema,
  type GTR30EmployeeMasterInput,
} from '../validation/gtr30EmployeeMaster.schema';
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

export interface EmployeeGroupSnapshot {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
}

export class Gtr30EmployeeMasterService {
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
    return {
      id: d.id || crypto.randomUUID(),
      srNo: d.srNo,
      hrpnNo: d.hrpnNo || undefined,
      name: d.name,
      designation: d.designation ?? '',
      payScale: d.payScale ?? '',
      currentPay: d.currentPay,
      currentPayDate: d.currentPayDate ?? '',
      hraPercent: d.hraPercent,
      transportAllowance: d.transportAllowance,
      medicalAllowance: d.medicalAllowance,
      claAllowance: d.claAllowance,
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
    return next;
  }

  saveGroup(monthKey: string, billCode: string, employees: GTR30EmployeeMasterInput[]): GTR30EmployeeMaster[] {
    const valid = employees.map((e) => this.validateEmployee(e));
    gtr30EmployeeMasterLocalRepository.saveGroup(monthKey, billCode, valid);
    setSyncPhase(gtr30GroupKey(monthKey, billCode), 'pending');
    debounceReplace(monthKey, billCode, valid);
    return valid;
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

  async hydrateFromBackend(): Promise<void> {
    const groups = await gtr30EmployeeMasterBackendRepository.listGroups();
    if (groups === null) return;
    const localKeys = Object.keys(gtr30EmployeeMasterLocalRepository.loadAll());
    if (localKeys.length > 0) return;
    if (groups.length === 0) return;
    for (const group of groups) {
      gtr30EmployeeMasterLocalRepository.saveGroup(group.monthKey, group.billCode, group.employees);
    }
  }

  reset(): void {
    gtr30EmployeeMasterLocalRepository.clear();
    for (const timer of pendingTimers.values()) clearTimeout(timer);
    pendingTimers.clear();
    syncPhases.clear();
    for (const listener of syncListeners) listener();
  }
}

export const gtr30EmployeeMasterService = new Gtr30EmployeeMasterService();

export function gtr30GroupKey(monthKey: string, billCode: string): string {
  return `${monthKey.trim().toLowerCase()}|${billCode.trim().toLowerCase()}`;
}

export type { GTR30MasterGroup };
