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
  ShieldCheck,
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
import { usePermissions } from '@/core/permissions/hooks';
import type { ModuleDefinition } from '@/shared/types/module';
import {
  buildNavigationModel,
  isBranchActive,
  isSectionActive,
  matchesRoute,
  type NavBranch,
  type NavSection,
} from '@/shared/navigation/model';

function getAvailableFinancialYears(activeFY: number): number[] {
  // Center around the active FY (Indian FY = April-March, stored as start year)
  // Show 2 behind, current, 2 ahead = 5 options, keeps the current always visible
  if (!Number.isInteger(activeFY) || activeFY < 2000) {
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return [fy - 2, fy - 1, fy, fy + 1, fy + 2];
  }
  return [activeFY - 2, activeFY - 1, activeFY, activeFY + 1, activeFY + 2];
}

const SECTION_SVG_ICONS: Record<string, React.ElementType> = {
  overview: LayoutDashboard,
  bills: Receipt,
  tds: Calculator,
  'it-employee': FileSpreadsheet,
  establishment: Users,
  tools: ScanText,
  settings: SettingsIcon,
  system: SettingsIcon,
  admin: Users,
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
  admin: ShieldCheck,
  'file-plus': FilePlus,
  list: List,
  'file-text': FileText,
  users: Users,
  user: Users,
  edit: Edit3,
};

function getBranchIcon(key: string, iconName?: string): React.ElementType {
  if (iconName && BRANCH_SVG_ICONS[iconName]) return BRANCH_SVG_ICONS[iconName];
  if (BRANCH_SVG_ICONS[key]) return BRANCH_SVG_ICONS[key];
  return FileText;
}

interface HeaderProps {
  modules: ModuleDefinition[];
}

export function Header({ modules }: HeaderProps) {
  const { user, signOut } = useAuthStore();
  const { isAdmin, isLoading } = usePermissions();
  const location = useLocation();
  const officeName = useOfficeName();

  const activeFinancialYear = useUIStore((s) => s.activeFinancialYear);
  const setActiveFinancialYear = useUIStore((s) => s.setActiveFinancialYear);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

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

  const availableFYs = useMemo(() => getAvailableFinancialYears(activeFinancialYear), [activeFinancialYear]);

  const navModel = useMemo(
    () => buildNavigationModel(modules, { isAdmin, isLoading }),
    [modules, isAdmin, isLoading],
  );

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

  if (isLoading) return null;

  return (
    <header
      ref={headerRef}
      className={`
        h-[56px] lg:h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md backdrop-saturate-150
        border-b border-slate-200/60 dark:border-slate-800/60
        flex items-center justify-between px-3 sm:px-4 lg:px-6 shrink-0 z-40
        transition-shadow select-none
        ${scrolled ? 'shadow-md' : 'shadow-sm'}
      `}
    >
      {/* Left: Department Identity */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="lg:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-drawer"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link
          to={isAdmin ? '/admin' : '/dashboard'}
          className="flex items-center gap-2 sm:gap-2.5 group min-w-0"
          title="Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-slate-800 dark:to-slate-800 ring-1 ring-indigo-100/50 dark:ring-slate-700/50 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            <img
              src="/logo.svg"
              alt="Department Emblem Logo"
              className="w-5 h-5 object-contain transition-transform group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col min-w-0 hidden sm:flex">
            <span className="text-[11px] sm:text-xs font-bold font-heading text-slate-900 dark:text-slate-100 tracking-tight uppercase leading-tight">
              ACCOUNT BRANCH
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide truncate max-w-[140px] sm:max-w-none">
              {officeName || 'ICDP SURAT, GUJARAT'}
            </span>
          </div>
        </Link>

        {/* Visual separator between brand and nav */}
        <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
      </div>

      {/* Center: Horizontal Top Navigation with Cascading Flyout Menus */}
      <nav
        ref={navRef}
        aria-label="Primary navigation"
        className="hidden lg:flex items-center min-w-0 h-full flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
        {/* Financial Year Selector - FY centered around active FY */}
        <div className="relative flex items-center shrink-0">
          <Calendar size={12} className="absolute left-2.5 text-emerald-600/70 dark:text-emerald-400/70 pointer-events-none" aria-hidden="true" />
          <select
            value={activeFinancialYear}
            onChange={(e) => setActiveFinancialYear(Number(e.target.value))}
            className="cursor-pointer pl-7 pr-7 sm:pr-8 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors appearance-none shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Financial Year"
            aria-label="Financial Year"
          >
            {availableFYs.map((year) => (
              <option key={year} value={year}>
                FY {year}-{(year + 1).toString().slice(2)}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 text-emerald-600/60 dark:text-emerald-400/60 pointer-events-none" aria-hidden="true" />
        </div>

        {/* Dark/Light Mode Switcher - hidden on very small, visible sm+ to reduce crowding */}
        <button
          type="button"
          onClick={toggleTheme}
          className="hidden sm:inline-flex p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[90px] xl:max-w-[110px]">
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize leading-tight">
                {user?.role || 'Officer'}
              </span>
            </div>
            <ChevronDown size={12} className={`text-slate-400 shrink-0 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {userMenuOpen && (
            <div
              id="user-menu"
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] w-60 bg-white dark:bg-slate-900 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Signed in as
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {user?.email}
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 capitalize block mt-0.5">
                  ● {user?.role || 'Office User'}
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                {isAdmin && (
                  <Link
                    to="/admin/overview"
                    onClick={() => setUserMenuOpen(false)}
                    role="menuitem"
                    className="w-full text-left px-2.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg font-semibold transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <ShieldCheck size={13} aria-hidden="true" />
                    <span>Admin Console</span>
                  </Link>
                )}

                {/* Theme toggle inside user menu to reduce header crowding - visible on all, but especially useful on mobile */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleTheme();
                    // keep menu open to show feedback
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

      {/* Mobile Drawer - with backdrop */}
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
            className="fixed inset-x-0 top-[56px] lg:top-16 bottom-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 overflow-y-auto app-scroll scroll-smooth lg:hidden shadow-xl animate-in slide-in-from-top-2 duration-200"
          >
            <div className="space-y-4 max-w-md mx-auto">
              {navModel.dashboardEnabled && (
                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <LayoutDashboard size={16} className="text-indigo-600" aria-hidden="true" />
                  <span>Dashboard</span>
                </NavLink>
              )}

              {navModel.sections.map((section) => (
                <div key={section.key} className="space-y-1">
                  <div className="px-3 pt-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {section.label}
                  </div>
                  <div className="pl-2 space-y-0.5">
                    {section.branches.map((branch) => {
                      const BranchIcon = getBranchIcon(branch.key, branch.icon);
                      const isActive = isBranchActive(branch, location.pathname);
                      return (
                        <div key={branch.key}>
                          <Link
                            to={branch.defaultPath}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                              isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <BranchIcon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} aria-hidden="true" />
                            <span>{branch.label}</span>
                          </Link>
                          {branch.subBranches.length > 0 && (
                            <div className="ml-5 pl-2 border-l border-slate-200 dark:border-slate-700 space-y-0.5 mt-1">
                              {branch.subBranches.map((sub) => {
                                const isSubActive = matchesRoute(sub.path, location.pathname);
                                return (
                                  <Link
                                    key={sub.path}
                                    to={sub.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`block px-3 py-1.5 rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                      isSubActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
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
                </div>
              ))}

              {/* Mobile-only FY + Theme in drawer footer for quick access */}
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 sm:hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Financial Year</span>
                  <div className="relative flex items-center">
                    <Calendar size={12} className="absolute left-2.5 text-emerald-600/70 dark:text-emerald-400/70 pointer-events-none" aria-hidden="true" />
                    <select
                      value={activeFinancialYear}
                      onChange={(e) => setActiveFinancialYear(Number(e.target.value))}
                      className="cursor-pointer pl-7 pr-7 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      title="Financial Year"
                      aria-label="Financial Year"
                    >
                      {availableFYs.map((year) => (
                        <option key={year} value={year}>
                          FY {year}-{(year + 1).toString().slice(2)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 text-emerald-600/60 pointer-events-none" aria-hidden="true" />
                  </div>
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
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    {theme}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
