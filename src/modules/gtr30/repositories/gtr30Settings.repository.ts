import type {
  GTR30DefaultSettings,
  GTR30DefaultEmployeeTemplate,
} from '../types/settings';
import type { GTR30PostItem } from '../types';
import {
  GTR30_SETTINGS_STORAGE_KEY,
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
  freshDefaultPosts,
} from '../constants/settings';

export interface Gtr30SettingsPayload {
  settings: GTR30DefaultSettings;
  employeeTemplate: GTR30DefaultEmployeeTemplate;
  defaultPosts: GTR30PostItem[];
}

class Gtr30SettingsLocalStorageRepository {
  load(): Gtr30SettingsPayload | null {
    try {
      const raw = localStorage.getItem(GTR30_SETTINGS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<Gtr30SettingsPayload>;
      return {
        settings: parsed.settings ?? { ...DEFAULT_GTR30_SETTINGS },
        employeeTemplate: parsed.employeeTemplate ?? { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE },
        defaultPosts: Array.isArray(parsed.defaultPosts)
          ? parsed.defaultPosts
          : freshDefaultPosts(),
      };
    } catch {
      return null;
    }
  }

  save(payload: Gtr30SettingsPayload): void {
    try {
      localStorage.setItem(GTR30_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      return;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(GTR30_SETTINGS_STORAGE_KEY);
    } catch {
      return;
    }
  }
}

export const gtr30SettingsLocalStorageRepository = new Gtr30SettingsLocalStorageRepository();
