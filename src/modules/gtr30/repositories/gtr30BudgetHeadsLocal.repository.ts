import type { GTR30BudgetHead } from '../types';
import { DEFAULT_BUDGET_HEADS } from '../constants';

const STORAGE_KEY = 'gtr30-budget-heads-v1-all';

interface StoredHeads {
  configured: boolean;
  items: GTR30BudgetHead[];
}

function readFrom(key: string): GTR30BudgetHead[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
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
  } catch {
    return null;
  }
}

function writeTo(key: string, heads: GTR30BudgetHead[]): void {
  try {
    const wrapper: StoredHeads = { configured: true, items: heads };
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
    try {
      localStorage.removeItem(this.storageKey());
    } catch {
      return;
    }
  }
}

export const gtr30BudgetHeadsLocalRepository = new Gtr30BudgetHeadsLocalRepository();
