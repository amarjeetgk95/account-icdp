import type { GTR30BillCodeMapping } from '../types';
import { gtr30BillCodeMappingsLocalRepository } from '../repositories/gtr30BillCodeMappingsLocal.repository';
import { gtr30BillCodeMappingsBackendRepository } from '../repositories/gtr30BillCodeMappingsBackend.repository';

const SYNC_DEBOUNCE_MS = 600;

export type Gtr30BillCodeMappingsSyncPhase = 'idle' | 'syncing' | 'synced' | 'error';

let billCodeMappingsSyncPhase: Gtr30BillCodeMappingsSyncPhase = 'idle';

function setBillCodeMappingsSyncPhase(phase: Gtr30BillCodeMappingsSyncPhase): void {
  billCodeMappingsSyncPhase = phase;
}

function getBillCodeMappingsSyncStatusInternal(): Gtr30BillCodeMappingsSyncPhase {
  return billCodeMappingsSyncPhase;
}

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
let backendWriteChain: Promise<void> = Promise.resolve();

function debounceReplace(mappings: GTR30BillCodeMapping[]): void {
  const key = 'all';
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      void runBackendWrite(mappings);
    }, SYNC_DEBOUNCE_MS)
  );
}

async function runBackendWrite(mappings: GTR30BillCodeMapping[]): Promise<void> {
  const write = async (): Promise<void> => {
    setBillCodeMappingsSyncPhase('syncing');
    try {
      await gtr30BillCodeMappingsBackendRepository.replaceAll(mappings);
      setBillCodeMappingsSyncPhase('synced');
    } catch (err) {
      setBillCodeMappingsSyncPhase('error');
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

    const local = this.list();
    const phase = getBillCodeMappingsSyncStatusInternal();

    if (phase === 'syncing' || phase === 'error') {
      return;
    }

    const localById = new Map(local.map((m) => [m.id, m]));
    const remoteById = new Map(remote.map((m) => [m.id, m]));
    const merged: GTR30BillCodeMapping[] = [];

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
        merged.some((m, i) => m.id !== local[i]?.id)) {
      gtr30BillCodeMappingsLocalRepository.saveAll(merged);
    }
  }

  reset(): void {
    gtr30BillCodeMappingsLocalRepository.clear();
    for (const timer of pendingTimers.values()) clearTimeout(timer);
    pendingTimers.clear();
    setBillCodeMappingsSyncPhase('idle');
  }
}

export const gtr30BillCodeMappingsService = new Gtr30BillCodeMappingsService();
