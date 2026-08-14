import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  activeOfficeId: string | null;
  activeFinancialYear: number;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  setActiveOfficeId: (id: string | null) => void;
  setActiveFinancialYear: (year: number) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  initializeOffice: (officeId: string | null) => void;
}

function enforceLightTheme() {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => {
      enforceLightTheme();
      return {
        activeOfficeId: null,
        activeFinancialYear: (() => {
          const now = new Date();
          return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        })(),
        sidebarCollapsed: false,
        mobileMenuOpen: false,
        setActiveOfficeId: (id) => set({ activeOfficeId: id }),
        setActiveFinancialYear: (year) => set({ activeFinancialYear: year }),
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
        toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
        initializeOffice: (officeId) => {
          set({ activeOfficeId: officeId });
        },
      };
    },
    {
      name: 'icdp-ui-store',
      partialize: (state) => ({
        activeFinancialYear: state.activeFinancialYear,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => () => {
        enforceLightTheme();
      },
    }
  )
);
