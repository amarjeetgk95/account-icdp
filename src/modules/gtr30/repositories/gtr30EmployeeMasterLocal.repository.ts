import type { GTR30EmployeeMaster, GTR30MasterGroup } from '../types';
import { getOfficeScope, type OfficeScope } from '@/shared/utilities/office';

const STORAGE_KEY_PREFIX = 'gtr30-employee-master-v3-groups';
const LEGACY_STORAGE_KEY = 'gtr30-employee-master-v3-groups';

export function gtr30EmployeeMasterStorageKey(scope: OfficeScope): string {
  const suffix = scope.all ? 'all' : scope.officeId ?? 'default';
  return `${STORAGE_KEY_PREFIX}-${suffix}`;
}

function resolveScope(): OfficeScope | null {
  try {
    return getOfficeScope();
  } catch {
    return null;
  }
}

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
    const scope = resolveScope();
    return scope ? gtr30EmployeeMasterStorageKey(scope) : `${STORAGE_KEY_PREFIX}-default`;
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
    const scope = resolveScope();
    const key = scope ? gtr30EmployeeMasterStorageKey(scope) : `${STORAGE_KEY_PREFIX}-default`;
    if (scope) {
      this.migrateLegacyIfNeeded(key);
    }
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
