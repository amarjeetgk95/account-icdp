import type { GTR30BillCodeMapping } from '../types';
import { gtr30BillCodeMappingsLocalRepository } from '../repositories/gtr30BillCodeMappingsLocal.repository';
import { gtr30BillCodeMappingsBackendRepository } from '../repositories/gtr30BillCodeMappingsBackend.repository';

const SYNC_DEBOUNCE_MS = 600;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debounceReplace(mappings: GTR30BillCodeMapping[]): void {
  const key = 'all';
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      void gtr30BillCodeMappingsBackendRepository
        .replaceAll(mappings)
        .catch(() => undefined);
    }, SYNC_DEBOUNCE_MS)
  );
}

export class Gtr30BillCodeMappingsService {
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
    if (local.length > 0) return;
    if (remote.length === 0) return;
    gtr30BillCodeMappingsLocalRepository.saveAll(remote);
  }

  reset(): void {
    gtr30BillCodeMappingsLocalRepository.clear();
    for (const timer of pendingTimers.values()) clearTimeout(timer);
    pendingTimers.clear();
  }
}

export const gtr30BillCodeMappingsService = new Gtr30BillCodeMappingsService();
