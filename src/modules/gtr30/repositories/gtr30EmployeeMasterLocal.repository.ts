import type { GTR30EmployeeMaster, GTR30MasterGroup } from '../types';

const STORAGE_KEY = 'gtr30-employee-master-v3-groups-all';
const LEGACY_STORAGE_KEY = 'gtr30-employee-master-v3-groups';

function indexKey(monthKey: string, billCode: string): string {
  return `${monthKey.trim().toLowerCase()}|${billCode.trim().toLowerCase()}`;
}

function readFrom(key: string): Record<string, GTR30MasterGroup> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, GTR30MasterGroup>;
  } catch {
    return {};
  }
}

function writeTo(key: string, payload: Record<string, GTR30MasterGroup>): void {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    return;
  }
}

class Gtr30EmployeeMasterLocalRepository {
  private storageKey(): string {
    return STORAGE_KEY;
  }

  private migrateLegacyIfNeeded(key: string): void {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const existing = readFrom(key);
      if (Object.keys(existing).length === 0) {
        writeTo(key, parsed);
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      return;
    }
  }

  loadAll(): Record<string, GTR30MasterGroup> {
    const key = STORAGE_KEY;
    this.migrateLegacyIfNeeded(key);
    return readFrom(key);
  }

  loadGroup(monthKey: string, billCode: string): GTR30MasterGroup | null {
    const all = this.loadAll();
    return all[indexKey(monthKey, billCode)] ?? null;
  }

  saveGroup(monthKey: string, billCode: string, employees: GTR30EmployeeMaster[]): void {
    const all = this.loadAll();
    all[indexKey(monthKey, billCode)] = { monthKey, billCode, employees };
    writeTo(this.storageKey(), all);
  }

  removeGroup(monthKey: string, billCode: string): void {
    const all = this.loadAll();
    delete all[indexKey(monthKey, billCode)];
    writeTo(this.storageKey(), all);
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey());
    } catch {
      return;
    }
  }
}

export const gtr30EmployeeMasterLocalRepository = new Gtr30EmployeeMasterLocalRepository();
