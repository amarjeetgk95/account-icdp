/* eslint-disable react-hooks/set-state-in-effect -- intentional reset of open menus on route change */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  Moon,
  Sun,
  LogOut,
  LayoutDashboard,
  Receipt,
  Calculator,
  FileSpreadsheet,
  ScanText,
  Settings as SettingsIcon,
  Users,
  CircleDot,
  FileText,
  FilePlus,
  List,
  Wallet,
  FileBarChart,
  Edit3,
} from 'lucide-react';
import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';
import { useOfficeName } from '@/modules/settings/hooks/useOfficeName';
import { formatFinancialYear } from '@/shared/utilities/date';
import type { ModuleDefinition } from '@/shared/types/module';
import {
  buildNavigationModel,
  isBranchActive,
  isSectionActive,
  matchesRoute,
  type NavBranch,
  type NavSection,
} from '@/shared/navigation/model';

const SECTION_SVG_ICONS: Record<string, React.ElementType> = {
  overview: LayoutDashboard,
  bills: Receipt,
  tds: Calculator,
  'it-employee': FileSpreadsheet,
  establishment: Users,
  tools: ScanText,
  settings: SettingsIcon,
  system: SettingsIcon,
};

const BRANCH_SVG_ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  gtr44: Receipt,
  gtr30: FileSpreadsheet,
  establishment: Users,
  parties: Users,
  payroll: Wallet,
  reports: FileBarChart,
  settings: SettingsIcon,
  paybill: FileSpreadsheet,
  tools: ScanText,
  'file-plus': FilePlus,
  list: List,
  'file-text': FileText,
  users: Users,
  user: Users,
  edit: Edit3,
  gr: FileText,
  'gr-repository': FileText,
  gr_repository: FileText,
};

function getBranchIcon(key: string, iconName?: string): React.ElementType {
  if (iconName && BRANCH_SVG_ICONS[iconName]) return BRANCH_SVG_ICONS[iconName];
  if (BRANCH_SVG_ICONS[key]) return BRANCH_SVG_ICONS[key];
  return FileText;
}

/**
 * Collapsible module group for the mobile drawer. Sections default to open
 * only when they contain the active route, so the drawer stays short enough
 * to scan on a phone instead of showing the whole navigation tree at once.
 */
function MobileDrawerSection({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(() => isSectionActive(section, pathname));
  const SectionIcon = SECTION_SVG_ICONS[section.key] || SECTION_SVG_ICONS[section.icon] || FileText;
  const sectionActive = isSectionActive(section, pathname);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
          sectionActive
            ? 'bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
            : 'text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            sectionActive
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          <SectionIcon size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold">{section.label}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="space-y-0.5 border-t border-slate-100 bg-slate-50/60 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950/30">
          {section.branches.map((branch) => {
            const BranchIcon = getBranchIcon(branch.key, branch.icon);
            const isActive = isBranchActive(branch, pathname);
            return (
              <div key={branch.key}>
                <Link
                  to={branch.defaultPath}
                  onClick={onNavigate}
                  className={`flex min-h-[40px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <BranchIcon
                    size={14}
                    className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{branch.label}</span>
                </Link>
                {branch.subBranches.length > 0 && (
                  <div className="mt-0.5 ml-4 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700">
                    {branch.subBranches.map((sub) => {
                      const isSubActive = matchesRoute(sub.path, pathname);
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={onNavigate}
                          className={`flex min-h-[36px] items-center rounded-lg px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            isSubActive
                              ? 'bg-indigo-50 font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                              : 'text-slate-500 hover:bg-white hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  modules: ModuleDefinition[];
}

export function Header({ modules }: HeaderProps) {
  const { user, signOut } = useAuthStore();
  const location = useLocation();
  const officeName = useOfficeName();

  const activeFinancialYear = useUIStore((s) => s.activeFinancialYear);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  // Compact FY label for phones: "26-27" instead of "FY 2026-27".
  const fyCompactLabel = `${String(activeFinancialYear).slice(-2)}-${String(activeFinancialYear + 1).slice(-2)}`;

  // Dropdown & Cascading Flyout States
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number } | null>(null);
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll shadow state
  const [scrolled, setScrolled] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const dropdownCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const branchHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navModel = useMemo(() => buildNavigationModel(modules), [modules]);

  const clearCloseTimer = useCallback(() => {
    if (dropdownCloseTimerRef.current) {
      clearTimeout(dropdownCloseTimerRef.current);
      dropdownCloseTimerRef.current = null;
    }
  }, []);

  const clearBranchTimer = useCallback(() => {
    if (branchHoverTimerRef.current) {
      clearTimeout(branchHoverTimerRef.current);
      branchHoverTimerRef.current = null;
    }
  }, []);

  const scheduleDropdownClose = useCallback(() => {
    clearCloseTimer();
    dropdownCloseTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
      setDropdownPos(null);
      setHoveredBranch(null);
    }, 220); // grace period prevents collapsing on diagonal cursor motion
  }, [clearCloseTimer]);

  const closeDropdowns = useCallback(() => {
    clearCloseTimer();
    setOpenDropdown(null);
    setDropdownPos(null);
    setHoveredBranch(null);
  }, [clearCloseTimer]);

  const handleBranchMouseEnter = useCallback(
    (branchKey: string) => {
      clearBranchTimer();
      setHoveredBranch(branchKey);
    },
    [clearBranchTimer],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dropdownCloseTimerRef.current) clearTimeout(dropdownCloseTimerRef.current);
      if (branchHoverTimerRef.current) clearTimeout(branchHoverTimerRef.current);
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setDropdownPos(null);
        setHoveredBranch(null);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      // Close mobile drawer when clicking backdrop/header outside
      if (
        mobileMenuOpen &&
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        const drawer = document.getElementById('mobile-nav-drawer');
        if (drawer && !drawer.contains(event.target as Node)) {
          setMobileMenuOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Close menus on Escape key + manage body scroll lock for mobile
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setDropdownPos(null);
        setHoveredBranch(null);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close flyouts on any scroll/resize while open (fixed-position menu would desync)
  useEffect(() => {
    if (!openDropdown) return;
    const handleScrollOrResize = () => {
      setOpenDropdown(null);
      setDropdownPos(null);
      setHoveredBranch(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openDropdown]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close menus on navigation change - reset is intentional when route changes
  useEffect(() => {
    setOpenDropdown(null);
    setDropdownPos(null);
    setHoveredBranch(null);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Dynamic scroll shadow — listens to the main content area
  useEffect(() => {
    const main = document.querySelector('main.app-scroll') || document.querySelector('main .app-scroll') || document.querySelector('main');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 4);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  // Note: no early return on isLoading — AuthGate already gates the shell.
  // navModel renders empty sections while loading; officeName falls back.
  // This keeps brand/nav chrome visible instead of blanking the header.

  return (
    <>
    <header
      ref={headerRef}
      className={`
        h-[56px] lg:h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md backdrop-saturate-150
        border-b border-slate-200/60 dark:border-slate-800/60
        flex items-center justify-between px-2.5 min-[380px]:px-3 sm:px-4 lg:px-6 gap-1.5 min-[380px]:gap-2 shrink-0 z-40
        transition-shadow select-none
        ${scrolled ? 'shadow-md' : 'shadow-sm'}
      `}
    >
      {/* Left: Department Identity */}
      <div className="flex items-center gap-1.5 min-[380px]:gap-2 sm:gap-3.5 min-w-0 overflow-hidden">
        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="lg:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 shrink-0 cursor-pointer"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-drawer"
        >
          {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>

        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 sm:gap-3 group min-w-0 select-none py-1"
          title="Home - ICDP Account Branch"
        >
          {/* Emblem Icon Container */}
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-50/90 via-white to-indigo-100/70 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 border border-indigo-100/80 dark:border-slate-700/80 shadow-[0_2px_8px_-2px_rgba(99,102,241,0.15)] dark:shadow-none flex items-center justify-center overflow-hidden shrink-0 transition-all duration-200 group-hover:scale-[1.03] group-hover:border-indigo-300/80 dark:group-hover:border-slate-600">
            <img
              src="/logo.svg"
              alt="Department Emblem Logo"
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </div>

          {/* Department Titles */}
          <div className="flex flex-col min-w-0 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] min-[380px]:text-xs font-bold font-heading text-slate-900 dark:text-slate-100 tracking-tight leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                ICDP ACCOUNT
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-bold tracking-wider uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 rounded-md">
                SURAT
              </span>
            </div>
            {/* Phones keep the city context under the brand instead of the
                office name so the bar reads complete without crowding. */}
            <span className="min-[480px]:hidden mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 leading-none">
              SURAT
            </span>
            <span className="hidden min-[480px]:block text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide truncate max-w-[120px] sm:max-w-[160px] xl:max-w-[210px] mt-0.5 leading-tight">
              {officeName || 'Animal Husbandry Department'}
            </span>
          </div>
        </Link>

        {/* Visual separator between brand and nav */}
        <div className="hidden lg:block h-6 w-px bg-slate-200/80 dark:bg-slate-700/80 mx-1.5 shrink-0" />
      </div>

      {/* Center: Horizontal Top Navigation with Cascading Flyout Menus */}
      <nav
        ref={navRef}
        aria-label="Primary navigation"
        className="hidden lg:flex items-center min-w-0 h-full flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
      >
        <div className="flex items-center gap-0.5 xl:gap-1 h-full mx-auto">
        {/* Dashboard Direct Link */}
        {navModel.dashboardEnabled && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `
              relative flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 h-full text-xs font-semibold transition-colors whitespace-nowrap
              ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }
            `}
            aria-label="Dashboard"
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard size={14} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                <span>Dashboard</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-2 xl:inset-x-3 h-[2.5px] bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        )}

        {/* Level 1 Module Sections with Cascading Dropdown */}
        {navModel.sections.map((section: NavSection) => {
          const isSectionActiveNow = isSectionActive(section, location.pathname);
          const isOpen = openDropdown === section.key;
          const SectionIcon = SECTION_SVG_ICONS[section.key] || SECTION_SVG_ICONS[section.icon] || Calculator;

          // Default hovered branch is the active branch or the first branch
          const activeBranch = section.branches.find((b) => isBranchActive(b, location.pathname)) || section.branches[0];
          const currentHoveredBranchKey = hoveredBranch || activeBranch?.key;

          return (
            <div
              key={section.key}
              className="relative h-full flex items-center"
              onMouseEnter={(e) => {
                clearCloseTimer();
                const trigger = e.currentTarget.firstElementChild as HTMLElement | null;
                if (trigger) {
                  const rect = trigger.getBoundingClientRect();
                  setDropdownPos({ left: rect.left, top: rect.bottom + 6 });
                }
                setOpenDropdown(section.key);
                setHoveredBranch(activeBranch?.key || null);
              }}
              onMouseLeave={scheduleDropdownClose}
            >
              {/* Level 1 Trigger Button */}
              <button
                type="button"
                onClick={(e) => {
                  clearCloseTimer();
                  if (openDropdown === section.key) {
                    closeDropdowns();
                    return;
                  }
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDropdownPos({ left: rect.left, top: rect.bottom + 6 });
                  setOpenDropdown(section.key);
                  setHoveredBranch(activeBranch?.key || null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clearCloseTimer();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPos({ left: rect.left, top: rect.bottom + 6 });
                    setOpenDropdown(section.key);
                    setHoveredBranch(activeBranch?.key || null);
                  }
                  if (e.key === 'Escape') {
                    closeDropdowns();
                  }
                }}
                className={`
                  relative flex items-center gap-1 xl:gap-1.5 px-2.5 xl:px-3.5 h-full text-xs font-semibold transition-colors cursor-pointer select-none whitespace-nowrap
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 rounded-sm
                  ${
                    isSectionActiveNow || isOpen
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-controls={`dropdown-${section.key}`}
                id={`trigger-${section.key}`}
              >
                <SectionIcon
                  size={14}
                  className={isSectionActiveNow || isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                  aria-hidden="true"
                />
                <span>{section.label}</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                {isSectionActiveNow && (
                  <span className="absolute bottom-0 inset-x-2 xl:inset-x-3 h-[2.5px] bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </button>

              {/* Level 2: Dropdown Menu Card (fixed-position so it escapes the scrollable nav) */}
              {isOpen && dropdownPos && (
                <div
                  id={`dropdown-${section.key}`}
                  role="menu"
                  aria-labelledby={`trigger-${section.key}`}
                  onMouseEnter={clearCloseTimer}
                  onMouseLeave={scheduleDropdownClose}
                  style={{ left: dropdownPos.left, top: dropdownPos.top }}
                  className="fixed z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="w-60 bg-white dark:bg-slate-900 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] p-1.5">
                    {/* Dropdown section header */}
                    <div className="px-3 py-1.5 mb-0.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {section.label}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {/* Case A: Single-branch section -> Render sub-items directly with NO 3rd branch */}
                      {section.branches.length === 1 && section.branches[0].subBranches.length > 0 ? (
                        section.branches[0].subBranches.map((sub) => {
                          const isSubActive = matchesRoute(sub.path, location.pathname);
                          const SubIcon = getBranchIcon(sub.path, sub.icon);

                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              role="menuitem"
                              className={`
                                flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors font-medium select-none
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                                ${
                                  isSubActive
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }
                              `}
                            >
                              {isSubActive ? (
                                <CircleDot size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                              ) : (
                                <SubIcon size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                              )}
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          );
                        })
                      ) : (
                        /* Case B: Multi-branch section -> Render branches with cascading flyouts */
                        section.branches.map((branch: NavBranch) => {
                          const isBranchActiveNow = isBranchActive(branch, location.pathname);
                          const isBranchHovered = currentHoveredBranchKey === branch.key;
                          const hasSubBranches = branch.subBranches.length > 0;
                          const BranchIcon = getBranchIcon(branch.key, branch.icon);

                          return (
                            <div
                              key={branch.key}
                              className="relative"
                              onMouseEnter={() => handleBranchMouseEnter(branch.key)}
                              onFocus={() => handleBranchMouseEnter(branch.key)}
                            >
                              {/* Level 2 Branch Item */}
                              <Link
                                to={branch.defaultPath}
                                role="menuitem"
                                aria-haspopup={hasSubBranches ? 'menu' : undefined}
                                aria-expanded={hasSubBranches ? isBranchHovered : undefined}
                                className={`
                                  flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors font-medium select-none
                                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                                  ${
                                    isBranchHovered || isBranchActiveNow
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }
                                `}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <BranchIcon
                                    size={14}
                                    className={isBranchHovered || isBranchActiveNow ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">{branch.label}</span>
                                </div>
                                {hasSubBranches && (
                                  <ChevronRight
                                    size={13}
                                    className={isBranchHovered ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                                    aria-hidden="true"
                                  />
                                )}
                              </Link>

                              {/* Level 3: Nested Cascading Sub-Flyout Card */}
                              {hasSubBranches && isBranchHovered && (
                                <div
                                  role="menu"
                                  onMouseEnter={clearCloseTimer}
                                  className="absolute left-full top-0 pl-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 before:absolute before:-left-3 before:inset-y-0 before:w-3 before:content-['']"
                                >
                                  <div className="w-52 bg-white dark:bg-slate-900 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] p-1.5">
                                    <div className="space-y-0.5">
                                      {branch.subBranches.map((sub) => {
                                        const isSubActive = matchesRoute(sub.path, location.pathname);
                                        const SubIcon = getBranchIcon(sub.path, sub.icon);

                                        return (
                                          <Link
                                            key={sub.path}
                                            to={sub.path}
                                            role="menuitem"
                                            className={`
                                              flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors select-none
                                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                                              ${
                                                isSubActive
                                                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/30'
                                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                                              }
                                            `}
                                          >
                                            {isSubActive ? (
                                              <CircleDot size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                                            ) : (
                                              <SubIcon size={12} className="text-slate-400 shrink-0 opacity-70" aria-hidden="true" />
                                            )}
                                            <span className="truncate">{sub.label}</span>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </nav>

      {/* Right: Financial Year, Theme Switcher, User Account Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Financial Year Display (Governed in Master Settings) */}
        <Link
          to="/settings/office"
          className="relative inline-flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg hover:bg-emerald-100/90 dark:hover:bg-emerald-900/40 transition-colors shadow-2xs cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group"
          title="Financial Year"
          aria-label={`Active Financial Year: FY ${activeFinancialYear}-${(activeFinancialYear + 1).toString().slice(2)}. Governed in Master Settings.`}
        >
          <Calendar size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
          <span className="sm:hidden font-heading tracking-tight tabular-nums">
            {fyCompactLabel}
          </span>
          <span className="hidden sm:inline font-heading tracking-tight">
            {formatFinancialYear(activeFinancialYear)}
          </span>
        </Link>

        {/* Dark/Light Mode Switcher - hidden on very small, visible sm+ to reduce crowding */}
        <button
          type="button"
          onClick={toggleTheme}
          className="hidden min-[360px]:inline-flex p-2 sm:p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>

        {/* User Account Profile */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-1.5 sm:pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
            title="User menu"
            aria-label={`User menu${user?.email ? ` for ${user.email}` : ''}`}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-controls="user-menu"
          >
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-indigo-100/50 dark:ring-slate-700 shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
              {/* Online status indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" aria-hidden="true" />
            </div>
            <div className="hidden sm:flex flex-col text-left min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[90px] lg:max-w-[110px]">
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-xs text-slate-400 capitalize leading-tight">Officer</span>
            </div>
            <ChevronDown size={12} className={`hidden sm:block text-slate-400 shrink-0 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {userMenuOpen && (
            <div
              id="user-menu"
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] w-72 bg-white dark:bg-slate-900 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            >
              {/* User Identity Header */}
              <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Signed in as
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {user?.email}
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium capitalize block mt-0.5">
                  ● Office User &bull; {officeName || 'Animal Husbandry Dept'}
                </span>
              </div>

              {/* Master Settings Section in Profile Icon */}
              <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="px-2.5 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <SettingsIcon size={12} className="text-slate-400" />
                    Master Settings
                  </span>
                  <Link
                    to="/settings/office"
                    onClick={() => setUserMenuOpen(false)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Open Hub &rarr;
                  </Link>
                </div>

                <div className="space-y-0.5 mt-1">
                  {/* Financial Year Governance Item */}
                  <Link
                    to="/settings/office"
                    onClick={() => setUserMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Financial Year</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                      {formatFinancialYear(activeFinancialYear)}
                    </span>
                  </Link>

                  {/* Settings Module Branches */}
                  {navModel.systemSection?.branches.flatMap((branch) =>
                    branch.subBranches.length > 0
                      ? branch.subBranches.map((sub) => {
                          const SubIcon = getBranchIcon(sub.path, sub.icon);
                          const isSubActive = matchesRoute(sub.path, location.pathname);
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              role="menuitem"
                              onClick={() => setUserMenuOpen(false)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isSubActive
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <SubIcon size={13} className={isSubActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          );
                        })
                      : [
                          <Link
                            key={branch.key}
                            to={branch.defaultPath}
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <SettingsIcon size={13} className="text-slate-400" />
                            <span className="truncate">{branch.label}</span>
                          </Link>,
                        ]
                  )}
                </div>
              </div>

              {/* Preferences & Sign Out */}
              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {theme === 'dark' ? <Sun size={13} aria-hidden="true" /> : <Moon size={13} aria-hidden="true" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" role="separator" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    signOut();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg font-semibold transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <LogOut size={13} aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </header>
    {/* Mobile Drawer — rendered OUTSIDE <header> so `fixed` positions
        against the viewport. Inside the blurred header, backdrop-filter
        makes it a containing block and the drawer collapses to zero height. */}
    {mobileMenuOpen && (
      <>
        <div
          className="fixed inset-0 top-[56px] lg:top-16 bg-slate-950/20 dark:bg-slate-950/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-x-0 top-[56px] lg:top-16 bottom-0 z-50 overflow-y-auto overscroll-contain border-t border-slate-200 bg-white px-3 pb-8 pt-3 shadow-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 scroll-smooth animate-in slide-in-from-top-2 duration-200 lg:hidden dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mx-auto max-w-md space-y-3 pb-safe">
            <NavLink
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800/60'
                }`
              }
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <LayoutDashboard size={14} aria-hidden="true" />
              </span>
              <span>Dashboard</span>
            </NavLink>

            {navModel.sections.map((section) => (
              <MobileDrawerSection
                key={section.key}
                section={section}
                pathname={location.pathname}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            ))}

            {/* Master Settings in Mobile Drawer */}
            {navModel.systemSection && (
              <MobileDrawerSection
                section={navModel.systemSection}
                pathname={location.pathname}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            )}

            {/* Mobile-only FY + Theme in drawer footer */}
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Financial Year</span>
                <Link
                  to="/settings/office"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Calendar size={12} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{formatFinancialYear(activeFinancialYear)}</span>
                </Link>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  {theme}
                </span>
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  );
}
