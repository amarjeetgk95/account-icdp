import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface UIState {
  activeOfficeId: string | null;
  activeFinancialYear: number;
  sidebarCollapsed: boolean;
  theme: Theme;
  setActiveOfficeId: (id: string | null) => void;
  setActiveFinancialYear: (year: number) => void;
  toggleSidebar: () => void;
  initializeOffice: (officeId: string | null) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      activeOfficeId: null,
      activeFinancialYear: (() => {
        const now = new Date();
        return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      })(),
      sidebarCollapsed: false,
      theme: 'light',
      setActiveOfficeId: (id) => set({ activeOfficeId: id }),
      setActiveFinancialYear: (year) => set({ activeFinancialYear: year }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      initializeOffice: (officeId) => {
        set({ activeOfficeId: officeId });
      },
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: nextTheme });
        applyTheme(nextTheme);
      },
    }),
    {
      name: 'icdp-ui-store',
      partialize: (state) => ({
        activeFinancialYear: state.activeFinancialYear,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);
