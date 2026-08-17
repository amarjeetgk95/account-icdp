import { describe, expect, it, beforeEach } from 'vitest';
import { gtr30SettingsService } from './gtr30Settings.service';
import {
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
} from '../constants/settings';

describe('gtr30Settings.service', () => {
  describe('getDefaults', () => {
    it('returns a fresh defaults bundle with cloned posts', () => {
      const a = gtr30SettingsService.getDefaults();
      const b = gtr30SettingsService.getDefaults();
      expect(a.settings).toEqual(DEFAULT_GTR30_SETTINGS);
      expect(a.employeeTemplate).toEqual(DEFAULT_GTR30_EMPLOYEE_TEMPLATE);
      expect(a.defaultPosts).not.toBe(b.defaultPosts);
      expect(a.defaultPosts[0].id).not.toBe(b.defaultPosts[0].id);
    });
  });

  describe('saveSettings / loadSettings round-trip via localStorage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('persists and reloads exactly what was saved', () => {
      const payload = {
        settings: { ...DEFAULT_GTR30_SETTINGS, officeName: 'Persisted Office' },
        employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE, designation: 'Persisted' },
        defaultPosts: [],
      };
      gtr30SettingsService.saveSettings(payload);
      const loaded = gtr30SettingsService.loadSettings();
      expect(loaded.settings.officeName).toBe('Persisted Office');
      expect(loaded.employeeTemplate.designation).toBe('Persisted');
      expect(loaded.defaultPosts).toEqual([]);
    });

    it('returns defaults when no entry exists', () => {
      const loaded = gtr30SettingsService.loadSettings();
      expect(loaded.settings).toEqual(DEFAULT_GTR30_SETTINGS);
    });

    it('resetSettings clears localStorage and returns defaults', () => {
      gtr30SettingsService.saveSettings({
        settings: { ...DEFAULT_GTR30_SETTINGS, officeName: 'X' },
        employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE },
        defaultPosts: [],
      });
      const result = gtr30SettingsService.resetSettings();
      expect(result.settings.officeName).toBe(DEFAULT_GTR30_SETTINGS.officeName);
      const loaded = gtr30SettingsService.loadSettings();
      expect(loaded.settings.officeName).toBe(DEFAULT_GTR30_SETTINGS.officeName);
    });
  });

  it('handles corrupt localStorage without throwing', () => {
    localStorage.setItem('gtr30-settings-v1', '{not json');
    const loaded = gtr30SettingsService.loadSettings();
    expect(loaded.settings).toEqual(DEFAULT_GTR30_SETTINGS);
  });
});
