import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  activeOfficeId: string | null;
  activeFinancialYear: number;
  sidebarCollapsed: boolean;
  setActiveOfficeId: (id: string) => void;
  setActiveFinancialYear: (year: number) => void;
  toggleSidebar: () => void;
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
    }),
    {
      name: 'icdp-ui-store',
      partialize: (state) => ({
        activeOfficeId: state.activeOfficeId,
        activeFinancialYear: state.activeFinancialYear,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
