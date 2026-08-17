import type { GTR30BillCodeMapping } from '../types';
import { DEFAULT_BILL_CODE_MAPPINGS } from '../constants';
import { getOfficeScope, type OfficeScope } from '@/shared/utilities/office';

const STORAGE_KEY_PREFIX = 'gtr30-employee-master-v3-mappings';
const LEGACY_STORAGE_KEY = 'gtr30-employee-master-v3-mappings';

export function gtr30BillCodeMappingsStorageKey(scope: OfficeScope): string {
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

function readFrom(key: string): GTR30BillCodeMapping[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as GTR30BillCodeMapping[];
  } catch {
    return null;
  }
}

function writeTo(key: string, mappings: GTR30BillCodeMapping[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(mappings));
  } catch {
    return;
  }
}

export class Gtr30BillCodeMappingsLocalRepository {
  private storageKey(): string {
    const scope = resolveScope();
    return scope ? gtr30BillCodeMappingsStorageKey(scope) : `${STORAGE_KEY_PREFIX}-default`;
  }

  private migrateLegacyIfNeeded(key: string): void {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      if (!readFrom(key)) {
        writeTo(key, parsed);
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      return;
    }
  }

  loadAll(): GTR30BillCodeMapping[] {
    const scope = resolveScope();
    const key = scope ? gtr30BillCodeMappingsStorageKey(scope) : `${STORAGE_KEY_PREFIX}-default`;
    if (scope) {
      this.migrateLegacyIfNeeded(key);
    }
    return readFrom(key) ?? [...DEFAULT_BILL_CODE_MAPPINGS];
  }

  saveAll(mappings: GTR30BillCodeMapping[]): void {
    writeTo(this.storageKey(), mappings);
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey());
    } catch {
      return;
    }
  }
}

export const gtr30BillCodeMappingsLocalRepository = new Gtr30BillCodeMappingsLocalRepository();
