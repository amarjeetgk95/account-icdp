import type {
  GTR30DefaultSettings,
  GTR30DefaultEmployeeTemplate,
} from '../types/settings';
import type { GTR30PostItem } from '../types';
import {
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
  freshDefaultPosts,
} from '../constants/settings';
import {
  gtr30SettingsLocalStorageRepository,
  type Gtr30SettingsPayload,
} from '../repositories/gtr30Settings.repository';

export class Gtr30SettingsService {
  getDefaults(): Gtr30SettingsPayload {
    return {
      settings: { ...DEFAULT_GTR30_SETTINGS },
      employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE },
      defaultPosts: freshDefaultPosts(),
    };
  }

  loadSettings(): Gtr30SettingsPayload {
    const stored = gtr30SettingsLocalStorageRepository.load();
    if (stored) return stored;
    return this.getDefaults();
  }

  saveSettings(payload: {
    settings: GTR30DefaultSettings;
    employeeTemplate: GTR30DefaultEmployeeTemplate;
    defaultPosts: GTR30PostItem[];
  }): Gtr30SettingsPayload {
    const next: Gtr30SettingsPayload = {
      settings: { ...payload.settings },
      employeeTemplate: { ...payload.employeeTemplate },
      defaultPosts: payload.defaultPosts.map((post) => ({ ...post })),
    };
    gtr30SettingsLocalStorageRepository.save(next);
    return next;
  }

  resetSettings(): Gtr30SettingsPayload {
    gtr30SettingsLocalStorageRepository.clear();
    return this.getDefaults();
  }
}

export const gtr30SettingsService = new Gtr30SettingsService();
