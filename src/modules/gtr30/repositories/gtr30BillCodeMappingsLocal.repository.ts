import type { GTR30BillCodeMapping } from '../types';
import { DEFAULT_BILL_CODE_MAPPINGS } from '../constants';
import { isLegacyBillCode } from '../constants/billCodes';
import { safeGetJSON, safeSetJSON, safeRemove } from '@/shared/storage';

const STORAGE_KEY = 'gtr30-employee-master-v3-mappings-all';
const LEGACY_STORAGE_KEY = 'gtr30-employee-master-v3-mappings';

interface StoredMappings {
  configured: boolean;
  items: GTR30BillCodeMapping[];
}

function readFrom(key: string): GTR30BillCodeMapping[] | null {
  // safeGetJSON returns null for missing/corrupt keys; falsy stored primitives are
  // not configured data either (original wrapper check rejected them as well).
  const parsed = safeGetJSON<unknown>(key, null);
  if (!parsed) return null;
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
}

function writeTo(key: string, mappings: GTR30BillCodeMapping[]): void {
  const wrapper: StoredMappings = { configured: true, items: mappings };
  safeSetJSON(key, wrapper);
}

function isKeyConfigured(key: string): boolean {
  const parsed = safeGetJSON<unknown>(key, null);
  if (!Array.isArray(parsed)) {
    return Boolean(parsed) && typeof parsed === 'object' && (parsed as { configured?: unknown }).configured === true;
  }
  return parsed.length > 0;
}

class Gtr30BillCodeMappingsLocalRepository {
  private storageKey(): string {
    return STORAGE_KEY;
  }

  private migrateLegacyIfNeeded(key: string): void {
    const parsed = safeGetJSON<unknown>(LEGACY_STORAGE_KEY, null);
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    if (!isKeyConfigured(key)) {
      writeTo(key, parsed as GTR30BillCodeMapping[]);
    }
    safeRemove(LEGACY_STORAGE_KEY);
  }

  loadAll(): GTR30BillCodeMapping[] {
    const key = STORAGE_KEY;
    this.migrateLegacyIfNeeded(key);
    const stored = readFrom(key);
    if (stored !== null) {
      // Intentional empty (configured wrapper with 0 items) must stay empty,
      // not fall back to defaults — mirrors gtr30BudgetHeadsLocal logic.
      if (stored.length === 0) return [];
      const filtered = stored.filter((m) => !isLegacyBillCode(m.billCode));
      if (filtered.length > 0) return filtered;
      // Stored had only legacy dummies — replace with canonical defaults
      if (stored.length > 0 && filtered.length === 0) return [...DEFAULT_BILL_CODE_MAPPINGS];
    }
    if (isKeyConfigured(key)) return [];
    return [...DEFAULT_BILL_CODE_MAPPINGS];
  }

  saveAll(mappings: GTR30BillCodeMapping[]): void {
    writeTo(this.storageKey(), mappings);
  }

  clear(): void {
    safeRemove(this.storageKey());
  }
}

export const gtr30BillCodeMappingsLocalRepository = new Gtr30BillCodeMappingsLocalRepository();
