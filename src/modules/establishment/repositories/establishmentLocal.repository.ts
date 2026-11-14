import type { EstablishmentEmployee, EstablishmentState } from '../types';
import { safeGetJSON, safeSetJSON } from '@/shared/storage';

const STORAGE_KEY = 'establishment-v1-all';

function readState(key: string): EstablishmentState | null {
  const parsed = safeGetJSON<unknown>(key, null);
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Partial<EstablishmentState> & Record<string, unknown>;
  return {
    employees: Array.isArray(record.employees) ? (record.employees as EstablishmentEmployee[]) : [],
    lastSyncedAt: typeof record.lastSyncedAt === 'string' ? record.lastSyncedAt : null,
  };
}

function writeState(key: string, state: EstablishmentState): void {
  safeSetJSON(key, state);
}

class EstablishmentLocalRepository {
  private storageKey(): string {
    return STORAGE_KEY;
  }

  loadState(): EstablishmentState {
    return readState(this.storageKey()) ?? { employees: [], lastSyncedAt: null };
  }

  saveEmployee(employee: EstablishmentEmployee): EstablishmentState {
    const key = this.storageKey();
    const current = readState(key) ?? { employees: [], lastSyncedAt: null };
    const index = current.employees.findIndex((e) => e.id === employee.id);
    let nextEmployees: EstablishmentEmployee[];
    if (index >= 0) {
      nextEmployees = [...current.employees];
      nextEmployees[index] = employee;
    } else {
      nextEmployees = [...current.employees, employee];
    }
    const next: EstablishmentState = {
      ...current,
      employees: nextEmployees,
      lastSyncedAt: new Date().toISOString(),
    };
    writeState(key, next);
    return next;
  }

  deleteEmployee(id: string): EstablishmentState {
    const key = this.storageKey();
    const current = readState(key) ?? { employees: [], lastSyncedAt: null };
    const nextEmployees = current.employees.filter((e) => e.id !== id);
    const next: EstablishmentState = {
      ...current,
      employees: nextEmployees,
      lastSyncedAt: new Date().toISOString(),
    };
    writeState(key, next);
    return next;
  }

  saveEmployees(employees: EstablishmentEmployee[]): EstablishmentState {
    const key = this.storageKey();
    const current = readState(key) ?? { employees: [], lastSyncedAt: null };
    const next: EstablishmentState = {
      ...current,
      employees,
      lastSyncedAt: new Date().toISOString(),
    };
    writeState(key, next);
    return next;
  }

  saveStatePatch(patch: Partial<Pick<EstablishmentState, 'lastSyncedAt'>>): void {
    const key = this.storageKey();
    const current = readState(key) ?? { employees: [], lastSyncedAt: null };
    writeState(key, { ...current, ...patch });
  }
}

export const establishmentLocalRepository = new EstablishmentLocalRepository();
