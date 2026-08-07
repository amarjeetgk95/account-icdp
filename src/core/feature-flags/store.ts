import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FeatureFlags {
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
  enableModule: (key: keyof FeatureFlags) => void;
  disableModule: (key: keyof FeatureFlags) => void;
  enableAllModules: () => void;
  disableAllModules: () => void;
  resetFlags: () => void;
  getModuleStatus: () => Record<keyof FeatureFlags, 'enabled' | 'disabled'>;
}

const defaultFlags: FeatureFlags = {
  auth_module: true,
  admin_module: true,
  dashboard_module: true,
  settings_module: true,
  payroll_module: true,
  parties_module: true,
  reports_module: true,
};

const allEnabledFlags: FeatureFlags = {
  auth_module: true,
  admin_module: true,
  dashboard_module: true,
  settings_module: true,
  payroll_module: true,
  parties_module: true,
  reports_module: true,
};

export const useFeatureFlags = create<FeatureFlagStore>()(
  persist(
    (set, get) => ({
      flags: defaultFlags,
      setFlag: (key, value) =>
        set((state) => ({
          flags: { ...state.flags, [key]: value },
        })),
      enableModule: (key) => set((state) => ({ flags: { ...state.flags, [key]: true } })),
      disableModule: (key) => set((state) => ({ flags: { ...state.flags, [key]: false } })),
      enableAllModules: () => set({ flags: allEnabledFlags }),
      disableAllModules: () => set({ flags: defaultFlags }),
      resetFlags: () => set({ flags: defaultFlags }),
      getModuleStatus: () => {
        const flags = get().flags;
        const status: Record<keyof FeatureFlags, 'enabled' | 'disabled'> = {} as any;
        (Object.keys(flags) as Array<keyof FeatureFlags>).forEach((key) => {
          status[key] = flags[key] ? 'enabled' : 'disabled';
        });
        return status;
      },
    }),
    {
      name: 'icdp-feature-flags',
    }
  )
);

export function isModuleEnabled(moduleKey: keyof FeatureFlags): boolean {
  return useFeatureFlags.getState().flags[moduleKey];
}

export function getModuleStatus(): Record<keyof FeatureFlags, 'enabled' | 'disabled'> {
  return useFeatureFlags.getState().getModuleStatus();
}
