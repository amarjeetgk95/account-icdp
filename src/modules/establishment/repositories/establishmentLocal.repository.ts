import type { EstablishmentEmployee, EstablishmentState } from '../types';

const STORAGE_KEY = 'establishment-v1-all';

function readState(key: string): EstablishmentState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return null;
  }
}

function writeState(key: string, state: EstablishmentState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    return;
  }
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
