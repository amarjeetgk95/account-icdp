import type {
  GTR30DARateEntry,
  GTR30DefaultSettings,
  GTR30DefaultEmployeeTemplate,
} from '../types/settings';
import type { GTR30PostItem } from '../types';
import {
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
  freshDefaultPosts,
  freshDefaultDaRates,
} from '../constants/settings';
import {
  gtr30SettingsLocalStorageRepository,
  type Gtr30SettingsPayload,
} from '../repositories/gtr30Settings.repository';
import { gtr30SettingsBackendRepository } from '../repositories/gtr30SettingsBackend.repository';

const SYNC_DEBOUNCE_MS = 600;

export type Gtr30SettingsSyncPhase = 'idle' | 'pending' | 'syncing' | 'synced' | 'error';

let settingsSyncPhase: Gtr30SettingsSyncPhase = 'idle';
const settingsSyncListeners = new Set<() => void>();

function setSettingsSyncPhase(phase: Gtr30SettingsSyncPhase): void {
  settingsSyncPhase = phase;
  for (const listener of settingsSyncListeners) listener();
}

export function getGtr30SettingsSyncStatus(): Gtr30SettingsSyncPhase {
  return settingsSyncPhase;
}

export function subscribeGtr30SettingsSync(listener: () => void): () => void {
  settingsSyncListeners.add(listener);
  return () => {
    settingsSyncListeners.delete(listener);
  };
}

let settingsSyncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPushPayload: Gtr30SettingsPayload | null = null;
let backendWriteChain: Promise<void> = Promise.resolve();
let hydrateInFlight: Promise<boolean> | null = null;
// Bumped by resetSettings so a racing flush never resurrects cleared data or
// clobbers the idle phase the reset established.
let settingsEpoch = 0;

function cancelPendingPushTimer(): void {
  if (settingsSyncTimer) {
    clearTimeout(settingsSyncTimer);
    settingsSyncTimer = null;
  }
}

/**
 * Backend-first write: the backend save is awaited FIRST and is authoritative.
 * On success the confirmed payload is re-persisted to the local cache (only
 * when local hasn't moved on — hydrate, reset, or a newer save must never be
 * clobbered) and the phase becomes synced. On failure the provisional local
 * input is kept and the phase becomes error. A newer queued save owns the
 * phase, so a settling older flush leaves it untouched.
 */
function runBackendWrite(payload: Gtr30SettingsPayload): Promise<boolean> {
  const write = async (): Promise<boolean> => {
    const epoch = settingsEpoch;
    setSettingsSyncPhase('syncing');
    try {
      const result = await gtr30SettingsBackendRepository.save(payload);
      // A reset raced this flush — it owns the local cache and phase now.
      if (epoch !== settingsEpoch) return result !== null;
      if (result === null) {
        if (pendingPushPayload === null) setSettingsSyncPhase('error');
        return false;
      }
      const current = gtr30SettingsLocalStorageRepository.load();
      if (current && JSON.stringify(current) === JSON.stringify(payload)) {
        gtr30SettingsLocalStorageRepository.save(payload);
      }
      if (pendingPushPayload === null) setSettingsSyncPhase('synced');
      return true;
    } catch {
      if (epoch === settingsEpoch && pendingPushPayload === null) {
        setSettingsSyncPhase('error');
      }
      return false;
    }
  };
  const chained = backendWriteChain.then(write, write);
  backendWriteChain = chained.then(
    () => undefined,
    () => undefined
  );
  return chained;
}

function debouncePushSettings(payload: Gtr30SettingsPayload): void {
  cancelPendingPushTimer();
  pendingPushPayload = payload;
  setSettingsSyncPhase('pending');
  settingsSyncTimer = setTimeout(() => {
    settingsSyncTimer = null;
    const queued = pendingPushPayload;
    pendingPushPayload = null;
    if (queued) void runBackendWrite(queued);
  }, SYNC_DEBOUNCE_MS);
}

class Gtr30SettingsService {
  getDefaults(): Gtr30SettingsPayload {
    return {
      settings: { ...DEFAULT_GTR30_SETTINGS },
      employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE },
      defaultPosts: freshDefaultPosts(),
      daRates: freshDefaultDaRates(),
    };
  }

  loadSettings(): Gtr30SettingsPayload {
    const stored = gtr30SettingsLocalStorageRepository.load();
    if (stored) {
      return {
        ...stored,
        settings: { ...DEFAULT_GTR30_SETTINGS, ...(stored.settings ?? {}) },
        employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE, ...(stored.employeeTemplate ?? {}) },
      };
    }
    return this.getDefaults();
  }

  hydrateFromBackend(force = false): Promise<boolean> {
    if (hydrateInFlight) return hydrateInFlight;
    const request = this.hydrateNow(force).finally(() => {
      if (hydrateInFlight === request) hydrateInFlight = null;
    });
    hydrateInFlight = request;
    return request;
  }

  private async hydrateNow(_force: boolean): Promise<boolean> {
    let remote: Gtr30SettingsPayload | null;
    try {
      remote = await gtr30SettingsBackendRepository.load();
    } catch {
      setSettingsSyncPhase('error');
      return false;
    }
    if (remote === null) return false;
    const current = gtr30SettingsLocalStorageRepository.load();
    const changed =
      !current || JSON.stringify(current) !== JSON.stringify(remote);
    gtr30SettingsLocalStorageRepository.save(remote);
    setSettingsSyncPhase('synced');
    return changed;
  }

  async flushPendingSave(): Promise<boolean> {
    cancelPendingPushTimer();
    const queued = pendingPushPayload;
    pendingPushPayload = null;
    if (!queued) return true;
    return runBackendWrite(queued);
  }

  saveSettings(payload: {
    settings: GTR30DefaultSettings;
    employeeTemplate: GTR30DefaultEmployeeTemplate;
    defaultPosts?: GTR30PostItem[];
    daRates?: GTR30DARateEntry[];
  }): Gtr30SettingsPayload {
    const existing = gtr30SettingsLocalStorageRepository.load();
    const daRates = payload.daRates
      ? payload.daRates.map((r) => ({ ...r }))
      : existing?.daRates ?? freshDefaultDaRates();
    const defaultPosts = payload.defaultPosts
      ? payload.defaultPosts.map((post) => ({ ...post }))
      : existing?.defaultPosts ?? freshDefaultPosts();
    const next: Gtr30SettingsPayload = {
      settings: { ...payload.settings },
      employeeTemplate: { ...payload.employeeTemplate },
      defaultPosts,
      daRates,
    };
    // Ensure daRates sorted ascending by effectiveFrom
    next.daRates.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    gtr30SettingsLocalStorageRepository.save(next);
    debouncePushSettings(next);
    return next;
  }

  saveDaRates(daRates: GTR30DARateEntry[]): Gtr30SettingsPayload {
    const current = this.loadSettings();
    return this.saveSettings({
      settings: current.settings,
      employeeTemplate: current.employeeTemplate,
      defaultPosts: current.defaultPosts,
      daRates: daRates.map((r) => ({ ...r, id: r.id || crypto.randomUUID() })),
    });
  }

  resetSettings(): Gtr30SettingsPayload {
    cancelPendingPushTimer();
    pendingPushPayload = null;
    settingsEpoch += 1;
    gtr30SettingsLocalStorageRepository.clear();
    setSettingsSyncPhase('idle');
    Promise.resolve(gtr30SettingsBackendRepository.clear()).catch(() => {
      setSettingsSyncPhase('error');
    });
    return this.getDefaults();
  }
}

export const gtr30SettingsService = new Gtr30SettingsService();
