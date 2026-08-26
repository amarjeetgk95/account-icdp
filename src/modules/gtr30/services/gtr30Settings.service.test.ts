import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../repositories/gtr30SettingsBackend.repository', () => ({
  gtr30SettingsBackendRepository: {
    load: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
  },
}));

import {
  gtr30SettingsService,
  getGtr30SettingsSyncStatus,
  subscribeGtr30SettingsSync,
} from './gtr30Settings.service';
import { gtr30SettingsBackendRepository } from '../repositories/gtr30SettingsBackend.repository';
import {
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
} from '../constants/settings';

const payload = {
  settings: { ...DEFAULT_GTR30_SETTINGS, officeName: 'Persisted Office' },
  employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE, designation: 'Persisted' },
  defaultPosts: [],
  daRates: [{ id: 'da1', effectiveFrom: '2024-12-04', rate: 53 }],
};

describe('gtr30Settings.service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.mocked(gtr30SettingsBackendRepository.load).mockReset();
    vi.mocked(gtr30SettingsBackendRepository.save).mockReset();
    vi.mocked(gtr30SettingsBackendRepository.clear).mockReset();
  });

  afterEach(() => {
    gtr30SettingsService.resetSettings();
    vi.useRealTimers();
  });

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
    it('persists and reloads exactly what was saved', () => {
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

    it('resetSettings clears localStorage, schedules backend clear, and returns defaults', () => {
      gtr30SettingsService.saveSettings(payload);
      const result = gtr30SettingsService.resetSettings();
      expect(result.settings.officeName).toBe(DEFAULT_GTR30_SETTINGS.officeName);
      const loaded = gtr30SettingsService.loadSettings();
      expect(loaded.settings.officeName).toBe(DEFAULT_GTR30_SETTINGS.officeName);
      expect(gtr30SettingsBackendRepository.clear).toHaveBeenCalledTimes(1);
      expect(getGtr30SettingsSyncStatus()).toBe('idle');
    });
  });

  it('handles corrupt localStorage without throwing', () => {
    localStorage.setItem('gtr30-settings-v1', '{not json');
    const loaded = gtr30SettingsService.loadSettings();
    expect(loaded.settings).toEqual(DEFAULT_GTR30_SETTINGS);
  });

  describe('backend sync', () => {
    it('pushes saved settings to the backend after the debounce window', async () => {
      vi.mocked(gtr30SettingsBackendRepository.save).mockResolvedValue(true);
      gtr30SettingsService.saveSettings(payload);
      expect(gtr30SettingsBackendRepository.save).not.toHaveBeenCalled();
      expect(getGtr30SettingsSyncStatus()).toBe('pending');

      await vi.advanceTimersByTimeAsync(700);
      expect(gtr30SettingsBackendRepository.save).toHaveBeenCalledTimes(1);
      expect(gtr30SettingsBackendRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ settings: expect.objectContaining({ officeName: 'Persisted Office' }) })
      );
      expect(getGtr30SettingsSyncStatus()).toBe('synced');
    });

    it('coalesces rapid saves into a single backend push with the latest payload', async () => {
      vi.mocked(gtr30SettingsBackendRepository.save).mockResolvedValue(true);
      gtr30SettingsService.saveSettings(payload);
      gtr30SettingsService.saveSettings({
        ...payload,
        settings: { ...payload.settings, officeName: 'Latest Office' },
      });
      gtr30SettingsService.saveSettings({
        ...payload,
        settings: { ...payload.settings, officeName: 'Final Office' },
      });

      await vi.advanceTimersByTimeAsync(700);
      expect(gtr30SettingsBackendRepository.save).toHaveBeenCalledTimes(1);
      expect(gtr30SettingsBackendRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ settings: expect.objectContaining({ officeName: 'Final Office' }) })
      );
    });

    it('flags the sync phase as error when the backend save fails', async () => {
      vi.mocked(gtr30SettingsBackendRepository.save).mockResolvedValue(null);
      gtr30SettingsService.saveSettings(payload);

      await vi.advanceTimersByTimeAsync(700);
      expect(getGtr30SettingsSyncStatus()).toBe('error');
    });

    it('sets the sync phase to error when the backend push rejects', async () => {
      vi.mocked(gtr30SettingsBackendRepository.save).mockRejectedValue(new Error('network down'));
      gtr30SettingsService.saveSettings(payload);
      await gtr30SettingsService.flushPendingSave();
      expect(getGtr30SettingsSyncStatus()).toBe('error');
    });

    it('marks the phase synced and notifies listeners', async () => {
      vi.mocked(gtr30SettingsBackendRepository.save).mockResolvedValue(true);
      const phases: string[] = [];
      const unsubscribe = subscribeGtr30SettingsSync(() => {
        phases.push(getGtr30SettingsSyncStatus());
      });
      gtr30SettingsService.saveSettings(payload);
      await vi.advanceTimersByTimeAsync(700);
      unsubscribe();
      expect(phases).toContain('pending');
      expect(phases).toContain('syncing');
      expect(phases).toContain('synced');
    });
  });

  describe('flushPendingSave', () => {
    it('collapses rapid successive saves into exactly one backend write carrying the latest payload', async () => {
      vi.mocked(gtr30SettingsBackendRepository.save).mockResolvedValue(true);
      gtr30SettingsService.saveSettings({
        ...payload,
        settings: { ...payload.settings, officeName: 'First Office' },
      });
      gtr30SettingsService.saveSettings({
        ...payload,
        settings: { ...payload.settings, officeName: 'Second Office' },
      });
      gtr30SettingsService.saveSettings({
        ...payload,
        settings: { ...payload.settings, officeName: 'Latest Office' },
      });
      await gtr30SettingsService.flushPendingSave();
      expect(gtr30SettingsBackendRepository.save).toHaveBeenCalledTimes(1);
      expect(gtr30SettingsBackendRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ settings: expect.objectContaining({ officeName: 'Latest Office' }) })
      );
      expect(getGtr30SettingsSyncStatus()).toBe('synced');
    });

    it('resolves only after the backend write completes', async () => {
      let defer!: { resolve: (value: boolean) => void };
      vi.mocked(gtr30SettingsBackendRepository.save).mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            defer = { resolve };
          })
      );
      gtr30SettingsService.saveSettings(payload);
      const flushed = gtr30SettingsService.flushPendingSave();
      let settled = false;
      void flushed.then(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(gtr30SettingsBackendRepository.save).toHaveBeenCalledTimes(1);
      expect(getGtr30SettingsSyncStatus()).toBe('syncing');
      expect(settled).toBe(false);
      defer.resolve(true);
      await flushed;
      expect(settled).toBe(true);
      expect(getGtr30SettingsSyncStatus()).toBe('synced');
    });
  });

  it('cancels a pending debounced push when resetting so cleared settings are not resurrected', async () => {
    vi.mocked(gtr30SettingsBackendRepository.save).mockResolvedValue(true);
    vi.mocked(gtr30SettingsBackendRepository.clear).mockResolvedValue(undefined);
    gtr30SettingsService.saveSettings(payload);
    gtr30SettingsService.resetSettings();
    await vi.advanceTimersByTimeAsync(700);
    expect(gtr30SettingsBackendRepository.save).not.toHaveBeenCalled();
    expect(gtr30SettingsService.loadSettings().settings.officeName).toBe(
      DEFAULT_GTR30_SETTINGS.officeName
    );
    expect(getGtr30SettingsSyncStatus()).toBe('idle');
  });

  describe('hydrateFromBackend', () => {
    it('skips the backend entirely when local settings already exist', async () => {
      gtr30SettingsService.saveSettings(payload);
      await gtr30SettingsService.hydrateFromBackend();
      expect(gtr30SettingsBackendRepository.load).not.toHaveBeenCalled();
    });

    it('populates local storage from the backend when no local settings exist', async () => {
      vi.mocked(gtr30SettingsBackendRepository.load).mockResolvedValue({
        settings: { ...DEFAULT_GTR30_SETTINGS, officeName: 'Remote Office' },
        employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE },
        defaultPosts: [],
        daRates: [{ id: 'da1', effectiveFrom: '2024-12-04', rate: 53 }],
      });
      await gtr30SettingsService.hydrateFromBackend();
      const loaded = gtr30SettingsService.loadSettings();
      expect(loaded.settings.officeName).toBe('Remote Office');
    });

    it('leaves defaults untouched when the backend has nothing stored', async () => {
      vi.mocked(gtr30SettingsBackendRepository.load).mockResolvedValue(null);
      await gtr30SettingsService.hydrateFromBackend();
      const loaded = gtr30SettingsService.loadSettings();
      expect(loaded.settings).toEqual(DEFAULT_GTR30_SETTINGS);
    });

    it('shares a single backend load across concurrent hydrate calls', async () => {
      vi.mocked(gtr30SettingsBackendRepository.load).mockImplementation(
        () =>
          new Promise((resolve) => {
            queueMicrotask(() =>
              resolve({
                settings: { ...DEFAULT_GTR30_SETTINGS, officeName: 'Remote Office' },
                employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE },
                defaultPosts: [],
                daRates: [{ id: 'da1', effectiveFrom: '2024-12-04', rate: 53 }],
              })
            );
          })
      );
      const [a, b] = await Promise.all([
        gtr30SettingsService.hydrateFromBackend(),
        gtr30SettingsService.hydrateFromBackend(),
      ]);
      expect(gtr30SettingsBackendRepository.load).toHaveBeenCalledTimes(1);
      expect(a).toBe(true);
      expect(b).toBe(true);
      const loaded = gtr30SettingsService.loadSettings();
      expect(loaded.settings.officeName).toBe('Remote Office');
    });

    it('sets the sync phase to error when the backend load fails', async () => {
      vi.mocked(gtr30SettingsBackendRepository.load).mockRejectedValue(new Error('boom'));
      await gtr30SettingsService.hydrateFromBackend();
      expect(getGtr30SettingsSyncStatus()).toBe('error');
    });
  });
});