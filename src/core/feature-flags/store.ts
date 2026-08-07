import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureFlags {
  auth_module: boolean;
  admin_module: boolean;
  dashboard_module: boolean;
  settings_module: boolean;
  payroll_module: boolean;
  parties_module: boolean;
  reports_module: boolean;
}

interface FeatureFlagStore {
  flags: FeatureFlags;
  setFlag: (key: keyof FeatureFlags, value: boolean) => void;
  resetFlags: () => void;
}

const defaultFlags: FeatureFlags = {
  auth_module: true,
  admin_module: false,
  dashboard_module: false,
  settings_module: false,
  payroll_module: false,
  parties_module: false,
  reports_module: false,
};

export const useFeatureFlags = create<FeatureFlagStore>()(
  persist(
    (set) => ({
      flags: defaultFlags,
      setFlag: (key, value) =>
        set((state) => ({
          flags: { ...state.flags, [key]: value },
        })),
      resetFlags: () => set({ flags: defaultFlags }),
    }),
    {
      name: 'icdp-feature-flags',
    }
  )
);

export function isModuleEnabled(moduleKey: keyof FeatureFlags): boolean {
  return useFeatureFlags.getState().flags[moduleKey];
}
