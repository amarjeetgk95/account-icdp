import type { GTR30BudgetHead } from '../types';
import { DEFAULT_BUDGET_HEADS } from '../constants';
import { safeGetJSON, safeSetJSON, safeRemove } from '@/shared/storage';

const STORAGE_KEY = 'gtr30-budget-heads-v1-all';

interface StoredHeads {
  configured: boolean;
  items: GTR30BudgetHead[];
}

function readFrom(key: string): GTR30BudgetHead[] | null {
  // safeGetJSON returns null for missing/corrupt keys; falsy stored primitives are
  // not configured data either (original wrapper check rejected them as well).
  const parsed = safeGetJSON<unknown>(key, null);
  if (!parsed) return null;
  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === 'object' && 'configured' in parsed && 'items' in parsed) {
      const stored = parsed as StoredHeads;
      if (!stored.configured) return null;
      return Array.isArray(stored.items) ? stored.items : [];
    }
    return null;
  }
  if (parsed.length === 0) return [];
  return parsed as GTR30BudgetHead[];
}

function writeTo(key: string, heads: GTR30BudgetHead[]): void {
  const wrapper: StoredHeads = { configured: true, items: heads };
  safeSetJSON(key, wrapper);
}

function isKeyConfigured(key: string): boolean {
  const parsed = safeGetJSON<unknown>(key, null);
  if (!Array.isArray(parsed)) {
    return Boolean(parsed) && typeof parsed === 'object' && (parsed as { configured?: unknown }).configured === true;
  }
  return parsed.length > 0;
}

class Gtr30BudgetHeadsLocalRepository {
  private storageKey(): string {
    return STORAGE_KEY;
  }

  loadAll(): GTR30BudgetHead[] {
    const key = this.storageKey();
    const stored = readFrom(key);
    if (stored !== null) {
      return stored;
    }
    if (isKeyConfigured(key)) {
      return [];
    }
    return [...DEFAULT_BUDGET_HEADS];
  }

  saveAll(heads: GTR30BudgetHead[]): void {
    writeTo(this.storageKey(), heads);
  }

  clear(): void {
    safeRemove(this.storageKey());
  }
}

export const gtr30BudgetHeadsLocalRepository = new Gtr30BudgetHeadsLocalRepository();
