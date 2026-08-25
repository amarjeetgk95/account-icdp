import type { EstablishmentEmployee, EstablishmentPost, EstablishmentState } from '../types';
import { getOfficeScope, type OfficeScope } from '@/shared/utilities/office';

const STORAGE_KEY_PREFIX = 'establishment-v1';

export function establishmentStorageKey(scope: OfficeScope): string {
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

function readState(key: string): EstablishmentState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return null;
  }
}

function writeState(key: string, state: EstablishmentState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    return;
  }
}

class EstablishmentLocalRepository {
  private storageKey(): string {
    const scope = resolveScope();
    return scope ? establishmentStorageKey(scope) : `${STORAGE_KEY_PREFIX}-default`;
  }

  loadState(): EstablishmentState {
    return readState(this.storageKey()) ?? { employees: [], posts: [], lastSyncedAt: null };
  }

  saveEmployees(employees: EstablishmentEmployee[]): EstablishmentState {
    const key = this.storageKey();
    const current = readState(key) ?? { employees: [], posts: [], lastSyncedAt: null };
    const next: EstablishmentState = {
      ...current,
      employees,
      lastSyncedAt: new Date().toISOString(),
    };
    writeState(key, next);
    return next;
  }

  savePosts(posts: EstablishmentPost[]): EstablishmentState {
    const key = this.storageKey();
    const current = readState(key) ?? { employees: [], posts: [], lastSyncedAt: null };
    const next: EstablishmentState = {
      ...current,
      posts,
      lastSyncedAt: new Date().toISOString(),
    };
    writeState(key, next);
    return next;
  }

  saveStatePatch(patch: Partial<Pick<EstablishmentState, 'lastSyncedAt'>>): void {
    const key = this.storageKey();
    const current = readState(key) ?? { employees: [], posts: [], lastSyncedAt: null };
    writeState(key, { ...current, ...patch });
  }
}

export const establishmentLocalRepository = new EstablishmentLocalRepository();
