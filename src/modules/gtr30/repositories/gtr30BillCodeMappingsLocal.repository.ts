import type { GTR30BillCodeMapping } from '../types';
import { DEFAULT_BILL_CODE_MAPPINGS } from '../constants';
import { isLegacyBillCode } from '../constants/billCodes';

const STORAGE_KEY = 'gtr30-employee-master-v3-mappings-all';
const LEGACY_STORAGE_KEY = 'gtr30-employee-master-v3-mappings';

interface StoredMappings {
  configured: boolean;
  items: GTR30BillCodeMapping[];
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
    return STORAGE_KEY;
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
    try {
      localStorage.removeItem(this.storageKey());
    } catch {
      return;
    }
  }
}

export const gtr30BillCodeMappingsLocalRepository = new Gtr30BillCodeMappingsLocalRepository();
