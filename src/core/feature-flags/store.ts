import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FeatureFlags {
  auth_module: boolean;
  dashboard_module: boolean;
  settings_module: boolean;
  payroll_module: boolean;
  parties_module: boolean;
  reports_module: boolean;
  gtr44_module: boolean;
  gtr30_module: boolean;
  establishment_module: boolean;
  paybill_module: boolean;
  gr_repository_module: boolean;
}

interface FeatureFlagStore {
  flags: FeatureFlags;
}

const defaultFlags: FeatureFlags = {
  auth_module: true,
  dashboard_module: true,
  settings_module: true,
  payroll_module: true,
  parties_module: true,
  reports_module: true,
  gtr44_module: true,
  gtr30_module: true,
  establishment_module: true,
  paybill_module: true,
  gr_repository_module: true,
};

const useFeatureFlags = create<FeatureFlagStore>()(
  persist(
    () => ({
      flags: defaultFlags,
    }),
    {
      name: 'icdp-feature-flags',
      merge: (persistedState) => {
        const persisted = (persistedState as Partial<FeatureFlagStore> | undefined)?.flags ?? {};
        return {
          flags: { ...defaultFlags, ...persisted },
        };
      },
    }
  )
);

export function isModuleEnabled(moduleKey: keyof FeatureFlags): boolean {
  return useFeatureFlags.getState().flags[moduleKey];
}
