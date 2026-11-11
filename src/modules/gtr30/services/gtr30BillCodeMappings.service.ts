import type { GTR30BillCodeMapping } from '../types';
import { gtr30BillCodeMappingsLocalRepository } from '../repositories/gtr30BillCodeMappingsLocal.repository';
import { gtr30BillCodeMappingsBackendRepository } from '../repositories/gtr30BillCodeMappingsBackend.repository';
import { isLegacyBillCode } from '../constants/billCodes';
import { DEFAULT_BILL_CODE_MAPPINGS } from '../constants';

const SYNC_DEBOUNCE_MS = 600;

export type Gtr30BillCodeMappingsSyncPhase = 'idle' | 'syncing' | 'synced' | 'error';

let billCodeMappingsSyncPhase: Gtr30BillCodeMappingsSyncPhase = 'idle';

function setBillCodeMappingsSyncPhase(phase: Gtr30BillCodeMappingsSyncPhase): void {
  billCodeMappingsSyncPhase = phase;
}

export function getGTR30BillCodeMappingsSyncStatus(): Gtr30BillCodeMappingsSyncPhase {
  return billCodeMappingsSyncPhase;
}

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
let backendWriteChain: Promise<void> = Promise.resolve();
// Latest coalesced payload awaiting flush (debounce collapses rapid saves to
// one backend call). Lets a settling flush yield the phase to a newer save.
let pendingPushMappings: GTR30BillCodeMapping[] | null = null;
// Bumped by reset() so a racing flush never resurrects cleared data.
let mappingsEpoch = 0;

function debounceReplace(mappings: GTR30BillCodeMapping[]): void {
  const key = 'all';
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  pendingPushMappings = mappings;
  // NOTE: this service's phase type has no 'pending' state (kept identical
  // for all current readers) — the first visible transition is 'syncing'.
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      const queued = pendingPushMappings;
      pendingPushMappings = null;
      if (queued) void runBackendWrite(queued).catch(() => undefined);
    }, SYNC_DEBOUNCE_MS)
  );
}

/**
 * Backend-first write: the backend replaceAll is awaited FIRST and its
 * sanitized echo is authoritative. On success the echo is persisted to the
 * local cache (only when local still holds the flushed payload and no reset
 * raced us) and the phase becomes synced. On failure the provisional local
 * input is kept and the phase becomes error. Rejects exactly as before.
 */
async function runBackendWrite(mappings: GTR30BillCodeMapping[]): Promise<void> {
  const write = async (): Promise<void> => {
    const epoch = mappingsEpoch;
    setBillCodeMappingsSyncPhase('syncing');
    try {
      const confirmed = await gtr30BillCodeMappingsBackendRepository.replaceAll(mappings);
      // A reset raced this flush — it owns the local cache and phase now.
      if (epoch !== mappingsEpoch) return;
      if (confirmed !== null && confirmed.length > 0) {
        const current = gtr30BillCodeMappingsLocalRepository.loadAll();
        if (JSON.stringify(current) === JSON.stringify(mappings)) {
          gtr30BillCodeMappingsLocalRepository.saveAll(confirmed);
        }
      }
      // A degenerate empty echo never wipes a provisional non-empty list
      // (genuine remove-all already matches local, so this is a no-op there).
      if (pendingPushMappings === null) setBillCodeMappingsSyncPhase('synced');
    } catch (err) {
      if (epoch === mappingsEpoch && pendingPushMappings === null) {
        setBillCodeMappingsSyncPhase('error');
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

class Gtr30BillCodeMappingsService {
  list(): GTR30BillCodeMapping[] {
    return gtr30BillCodeMappingsLocalRepository.loadAll();
  }

  saveMapping(mapping: GTR30BillCodeMapping): GTR30BillCodeMapping[] {
    const all = this.list();
    const idx = all.findIndex((m) => m.id === mapping.id);
    const next: GTR30BillCodeMapping[] =
      idx >= 0 ? all.map((m, i) => (i === idx ? mapping : m)) : [...all, mapping];
    gtr30BillCodeMappingsLocalRepository.saveAll(next);
    debounceReplace(next);
    return next;
  }

  removeMapping(id: string): GTR30BillCodeMapping[] {
    const next = this.list().filter((m) => m.id !== id);
    gtr30BillCodeMappingsLocalRepository.saveAll(next);
    debounceReplace(next);
    return next;
  }

  async hydrateFromBackend(): Promise<void> {
    const remote = await gtr30BillCodeMappingsBackendRepository.list();
    if (remote === null) return;

    if (remote.length === 0) {
      // Intentional wipe — persist empty so stale local defaults don't resurrect
      gtr30BillCodeMappingsLocalRepository.saveAll([]);
      setBillCodeMappingsSyncPhase('synced');
      return;
    }

    const clean = remote.filter((m) => !isLegacyBillCode(m.billCode));
    if (clean.length === 0) {
      // Backend contained only legacy dummies (e.g. GTR30-SAL) — replace with
      // canonical defaults so UI never shows empty and tests expecting
      // fallback to GTR-30-GO-STATS / NGO-STATS pass.
      gtr30BillCodeMappingsLocalRepository.saveAll([...DEFAULT_BILL_CODE_MAPPINGS]);
      setBillCodeMappingsSyncPhase('synced');
      return;
    }

    gtr30BillCodeMappingsLocalRepository.saveAll(clean);
    setBillCodeMappingsSyncPhase('synced');
  }

  reset(): void {
    gtr30BillCodeMappingsLocalRepository.clear();
    for (const timer of pendingTimers.values()) clearTimeout(timer);
    pendingTimers.clear();
    pendingPushMappings = null;
    mappingsEpoch += 1;
    setBillCodeMappingsSyncPhase('idle');
  }
}

export const gtr30BillCodeMappingsService = new Gtr30BillCodeMappingsService();
