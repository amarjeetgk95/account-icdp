import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  activeOfficeId: string | null;
  activeFinancialYear: number;
  sidebarCollapsed: boolean;
  setActiveOfficeId: (id: string | null) => void;
  setActiveFinancialYear: (year: number) => void;
  toggleSidebar: () => void;
  initializeOffice: (officeId: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeOfficeId: null,
      activeFinancialYear: (() => {
        const now = new Date();
        return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      })(),
      sidebarCollapsed: false,
      setActiveOfficeId: (id) => set({ activeOfficeId: id }),
      setActiveFinancialYear: (year) => set({ activeFinancialYear: year }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      initializeOffice: (officeId) => {
        set({ activeOfficeId: officeId });
      },
    }),
    {
      name: 'icdp-ui-store',
      partialize: (state) => ({
        activeFinancialYear: state.activeFinancialYear,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
