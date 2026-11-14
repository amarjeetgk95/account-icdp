import type {
  GTR30DARateEntry,
  GTR30DefaultSettings,
  GTR30DefaultEmployeeTemplate,
} from '../types/settings';
import type { GTR30PostItem } from '../types';
import {
  GTR30_SETTINGS_STORAGE_KEY,
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
  freshDefaultPosts,
  freshDefaultDaRates,
} from '../constants/settings';
import { safeGetJSON, safeSetJSON, safeRemove } from '@/shared/storage';

export interface Gtr30SettingsPayload {
  settings: GTR30DefaultSettings;
  employeeTemplate: GTR30DefaultEmployeeTemplate;
  defaultPosts: GTR30PostItem[];
  daRates: GTR30DARateEntry[];
}

class Gtr30SettingsLocalStorageRepository {
  load(): Gtr30SettingsPayload | null {
    const parsed = safeGetJSON<Partial<Gtr30SettingsPayload> | null>(
      GTR30_SETTINGS_STORAGE_KEY,
      null
    );
    if (parsed === null) return null;
    return {
      settings: parsed.settings ?? { ...DEFAULT_GTR30_SETTINGS },
      employeeTemplate: parsed.employeeTemplate ?? { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE },
      defaultPosts: Array.isArray(parsed.defaultPosts)
        ? parsed.defaultPosts
        : freshDefaultPosts(),
      daRates: Array.isArray(parsed.daRates)
        ? (parsed.daRates as GTR30DARateEntry[])
        : freshDefaultDaRates(),
    };
  }

  save(payload: Gtr30SettingsPayload): void {
    safeSetJSON(GTR30_SETTINGS_STORAGE_KEY, payload);
  }

  clear(): void {
    safeRemove(GTR30_SETTINGS_STORAGE_KEY);
  }
}

export const gtr30SettingsLocalStorageRepository = new Gtr30SettingsLocalStorageRepository();
