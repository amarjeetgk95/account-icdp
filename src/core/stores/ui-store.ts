import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { currentFinancialYear } from '@/shared/utilities/date';

export type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

interface UIState {
  activeFinancialYear: number;
  theme: Theme;
  setActiveFinancialYear: (year: number) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeFinancialYear: currentFinancialYear(),
      theme: 'light',
      setActiveFinancialYear: (year) => set({ activeFinancialYear: year }),
      toggleTheme: () =>
        set((state) => {
          const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          return { theme: next };
        }),
    }),
    {
       name: 'icdp-ui-store',
       partialize: (state) => ({
         activeFinancialYear: state.activeFinancialYear,
         theme: state.theme,
       }),
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? 'light');
      },
    }
  )
);
