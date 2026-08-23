import type { GTR30BillCodeMapping } from '../types';
import { DEFAULT_BILL_CODE_MAPPINGS } from '../constants';
import { getOfficeScope, type OfficeScope } from '@/shared/utilities/office';

const STORAGE_KEY_PREFIX = 'gtr30-employee-master-v3-mappings';
const LEGACY_STORAGE_KEY = 'gtr30-employee-master-v3-mappings';

interface StoredMappings {
  configured: boolean;
  items: GTR30BillCodeMapping[];
}

function gtr30BillCodeMappingsStorageKey(scope: OfficeScope): string {
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
    if (!Array.isArray(parsed)) {
      if (parsed && typeof parsed === 'object' && 'configured' in parsed && 'items' in parsed) {
        const stored = parsed as StoredMappings;
        if (!stored.configured) return null;
        return Array.isArray(stored.items) ? stored.items : [];
      }
      return null;
    }
    if (parsed.length === 0) return [];
    return parsed as GTR30BillCodeMapping[];
  } catch {
    return null;
  }
}

function writeTo(key: string, mappings: GTR30BillCodeMapping[]): void {
  try {
    const wrapper: StoredMappings = { configured: true, items: mappings };
    localStorage.setItem(key, JSON.stringify(wrapper));
  } catch {
    return;
  }
}

function isKeyConfigured(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return parsed && typeof parsed === 'object' && parsed.configured === true;
    }
    return parsed.length > 0;
  } catch {
    return false;
  }
}

class Gtr30BillCodeMappingsLocalRepository {
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
      if (!isKeyConfigured(key)) {
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
    const stored = readFrom(key);
    if (stored !== null) {
      return stored;
    }
    if (isKeyConfigured(key)) {
      return [];
    }
    return [...DEFAULT_BILL_CODE_MAPPINGS];
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
