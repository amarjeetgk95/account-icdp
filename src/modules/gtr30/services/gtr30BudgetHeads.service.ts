import type { GTR30BudgetHead } from '../types';
import { gtr30BudgetHeadsLocalRepository } from '../repositories/gtr30BudgetHeadsLocal.repository';
import { gtr30BudgetHeadsBackendRepository } from '../repositories/gtr30BudgetHeadsBackend.repository';

const SYNC_DEBOUNCE_MS = 600;

export type Gtr30BudgetHeadsSyncPhase = 'idle' | 'syncing' | 'synced' | 'error';

let budgetHeadsSyncPhase: Gtr30BudgetHeadsSyncPhase = 'idle';

function setBudgetHeadsSyncPhase(phase: Gtr30BudgetHeadsSyncPhase): void {
  budgetHeadsSyncPhase = phase;
}

export function getGTR30BudgetHeadsSyncStatus(): Gtr30BudgetHeadsSyncPhase {
  return budgetHeadsSyncPhase;
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let backendWriteChain: Promise<void> = Promise.resolve();
// Latest coalesced payload awaiting flush (debounce collapses rapid saves to
// one backend call). Lets a settling flush yield the phase to a newer save.
let pendingPushHeads: GTR30BudgetHead[] | null = null;
// Bumped by reset() so a racing flush never resurrects cleared data.
let headsEpoch = 0;

function debounceReplace(heads: GTR30BudgetHead[]): void {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingPushHeads = heads;
  // NOTE: this service's phase type has no 'pending' state (kept identical
  // for all current readers) — the first visible transition is 'syncing'.
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    const queued = pendingPushHeads;
    pendingPushHeads = null;
    if (queued) void runBackendWrite(queued).catch(() => undefined);
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Backend-first write: the backend replaceAll is awaited FIRST and its echo
 * is authoritative. On success the echo is persisted to the local cache
 * (only when local still holds the flushed payload and no reset raced us)
 * and the phase becomes synced. On failure the provisional local input is
 * kept and the phase becomes error. Rejects exactly as before.
 */
async function runBackendWrite(heads: GTR30BudgetHead[]): Promise<void> {
  const write = async (): Promise<void> => {
    const epoch = headsEpoch;
    setBudgetHeadsSyncPhase('syncing');
    try {
      const confirmed = await gtr30BudgetHeadsBackendRepository.replaceAll(heads);
      // A reset raced this flush — it owns the local cache and phase now.
      if (epoch !== headsEpoch) return;
      if (confirmed !== null && confirmed.length > 0) {
        const current = gtr30BudgetHeadsLocalRepository.loadAll();
        if (JSON.stringify(current) === JSON.stringify(heads)) {
          gtr30BudgetHeadsLocalRepository.saveAll(confirmed);
        }
      }
      // A degenerate empty echo never wipes a provisional non-empty list
      // (genuine remove-all already matches local, so this is a no-op there).
      if (pendingPushHeads === null) setBudgetHeadsSyncPhase('synced');
    } catch (err) {
      if (epoch === headsEpoch && pendingPushHeads === null) {
        setBudgetHeadsSyncPhase('error');
      }
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

    if (remote.length > 0) {
      gtr30BudgetHeadsLocalRepository.saveAll(remote);
      setBudgetHeadsSyncPhase('synced');
    }
  }

  reset(): void {
    gtr30BudgetHeadsLocalRepository.clear();
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = null;
    pendingPushHeads = null;
    headsEpoch += 1;
    setBudgetHeadsSyncPhase('idle');
  }
}

export const gtr30BudgetHeadsService = new Gtr30BudgetHeadsService();
