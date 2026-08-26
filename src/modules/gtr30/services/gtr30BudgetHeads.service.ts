import type { GTR30BudgetHead } from '../types';
import { gtr30BudgetHeadsLocalRepository } from '../repositories/gtr30BudgetHeadsLocal.repository';
import { gtr30BudgetHeadsBackendRepository } from '../repositories/gtr30BudgetHeadsBackend.repository';

const SYNC_DEBOUNCE_MS = 600;

export type Gtr30BudgetHeadsSyncPhase = 'idle' | 'syncing' | 'synced' | 'error';

let budgetHeadsSyncPhase: Gtr30BudgetHeadsSyncPhase = 'idle';

function setBudgetHeadsSyncPhase(phase: Gtr30BudgetHeadsSyncPhase): void {
  budgetHeadsSyncPhase = phase;
}

function getBudgetHeadsSyncStatusInternal(): Gtr30BudgetHeadsSyncPhase {
  return budgetHeadsSyncPhase;
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let backendWriteChain: Promise<void> = Promise.resolve();

function debounceReplace(heads: GTR30BudgetHead[]): void {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    void runBackendWrite(heads);
  }, SYNC_DEBOUNCE_MS);
}

async function runBackendWrite(heads: GTR30BudgetHead[]): Promise<void> {
  const write = async (): Promise<void> => {
    setBudgetHeadsSyncPhase('syncing');
    try {
      await gtr30BudgetHeadsBackendRepository.replaceAll(heads);
      setBudgetHeadsSyncPhase('synced');
    } catch (err) {
      setBudgetHeadsSyncPhase('error');
      throw err;
    }
  };
  const chained = backendWriteChain.then(write, write);
  backendWriteChain = chained.then(
    () => undefined,
    () => undefined
  );
  return chained;
}

class Gtr30BudgetHeadsService {
  list(): GTR30BudgetHead[] {
    return gtr30BudgetHeadsLocalRepository.loadAll();
  }

  saveHead(head: GTR30BudgetHead): GTR30BudgetHead[] {
    const all = this.list();
    const idx = all.findIndex((h) => h.id === head.id);
    const next: GTR30BudgetHead[] =
      idx >= 0 ? all.map((h, i) => (i === idx ? head : h)) : [...all, head];
    gtr30BudgetHeadsLocalRepository.saveAll(next);
    debounceReplace(next);
    return next;
  }

  removeHead(id: string): GTR30BudgetHead[] {
    const next = this.list().filter((h) => h.id !== id);
    gtr30BudgetHeadsLocalRepository.saveAll(next);
    debounceReplace(next);
    return next;
  }

  async hydrateFromBackend(): Promise<void> {
    const remote = await gtr30BudgetHeadsBackendRepository.list();
    if (remote === null) return;

    const local = this.list();
    const phase = getBudgetHeadsSyncStatusInternal();

    if (phase === 'syncing' || phase === 'error') {
      return;
    }

    const localById = new Map(local.map((h) => [h.id, h]));
    const remoteById = new Map(remote.map((h) => [h.id, h]));
    const merged: GTR30BudgetHead[] = [];

    for (const remoteItem of remote) {
      const localItem = localById.get(remoteItem.id);
      if (!localItem) {
        merged.push(remoteItem);
      } else {
        merged.push(localItem);
      }
    }

    for (const localItem of local) {
      if (!remoteById.has(localItem.id)) {
        merged.push(localItem);
      }
    }

    if (merged.length !== local.length ||
        merged.some((h, i) => h.id !== local[i]?.id)) {
      gtr30BudgetHeadsLocalRepository.saveAll(merged);
    }
  }

  reset(): void {
    gtr30BudgetHeadsLocalRepository.clear();
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = null;
    setBudgetHeadsSyncPhase('idle');
  }
}

export const gtr30BudgetHeadsService = new Gtr30BudgetHeadsService();
