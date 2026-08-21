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
import { isAllOfficesMode } from '@/shared/utilities/office';

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

function debouncePushSettings(payload: Gtr30SettingsPayload): void {
  if (settingsSyncTimer) clearTimeout(settingsSyncTimer);
  setSettingsSyncPhase('pending');
  settingsSyncTimer = setTimeout(() => {
    settingsSyncTimer = null;
    setSettingsSyncPhase('syncing');
    void (async () => {
      try {
        const result = await gtr30SettingsBackendRepository.save(payload);
        if (result === null) {
          let allOffices = false;
          try {
            allOffices = isAllOfficesMode();
          } catch {
            // store unavailable
          }
          setSettingsSyncPhase(allOffices ? 'idle' : 'error');
        } else {
          setSettingsSyncPhase('synced');
        }
      } catch {
        setSettingsSyncPhase('error');
      }
    })();
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
    if (stored) return stored;
    return this.getDefaults();
  }

  async hydrateFromBackend(): Promise<void> {
    const local = gtr30SettingsLocalStorageRepository.load();
    if (local) return;
    const remote = await gtr30SettingsBackendRepository.load();
    if (remote === null) return;
    gtr30SettingsLocalStorageRepository.save(remote);
  }

  saveSettings(payload: {
    settings: GTR30DefaultSettings;
    employeeTemplate: GTR30DefaultEmployeeTemplate;
    defaultPosts: GTR30PostItem[];
    daRates?: GTR30DARateEntry[];
  }): Gtr30SettingsPayload {
    const existing = gtr30SettingsLocalStorageRepository.load();
    const daRates = payload.daRates
      ? payload.daRates.map((r) => ({ ...r }))
      : existing?.daRates ?? freshDefaultDaRates();
    const next: Gtr30SettingsPayload = {
      settings: { ...payload.settings },
      employeeTemplate: { ...payload.employeeTemplate },
      defaultPosts: payload.defaultPosts.map((post) => ({ ...post })),
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
    gtr30SettingsLocalStorageRepository.clear();
    if (settingsSyncTimer) {
      clearTimeout(settingsSyncTimer);
      settingsSyncTimer = null;
    }
    setSettingsSyncPhase('idle');
    void gtr30SettingsBackendRepository.clear();
    return this.getDefaults();
  }
}

export const gtr30SettingsService = new Gtr30SettingsService();