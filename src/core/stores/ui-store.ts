import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type NavLayout = 'mega-menu' | 'ribbon';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

interface UIState {
  activeOfficeId: string | null;
  activeFinancialYear: number;
  mobileNavOpen: boolean;
  activeNavGroup: string | null;
  theme: Theme;
  navLayout: NavLayout;
  sidebarCollapsed: boolean;
  setActiveOfficeId: (id: string | null) => void;
  setActiveFinancialYear: (year: number) => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setActiveNavGroup: (group: string | null) => void;
  toggleTheme: () => void;
  setNavLayout: (layout: NavLayout) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
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
      mobileNavOpen: false,
      activeNavGroup: null,
      theme: 'light',
      navLayout: 'mega-menu',
      sidebarCollapsed: false,
      setActiveOfficeId: (id) => set({ activeOfficeId: id }),
      setActiveFinancialYear: (year) => set({ activeFinancialYear: year }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
      setActiveNavGroup: (group) => set({ activeNavGroup: group }),
      toggleTheme: () =>
        set((state) => {
          const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          return { theme: next };
        }),
      setNavLayout: (layout) => set({ navLayout: layout }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      initializeOffice: (officeId) => {
        set({ activeOfficeId: officeId });
      },
    }),
    {
       name: 'icdp-ui-store',
       partialize: (state) => ({
         activeFinancialYear: state.activeFinancialYear,
         activeNavGroup: state.activeNavGroup,
         theme: state.theme,
         navLayout: state.navLayout,
         sidebarCollapsed: state.sidebarCollapsed,
       }),
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? 'light');
      },
    }
  )
);
