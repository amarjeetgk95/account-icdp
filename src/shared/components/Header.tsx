import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';
import { useOfficeName } from '@/modules/settings/hooks/useOfficeName';
import { financialYearRepository } from '@/modules/settings/repositories/financialYear.repository';
import { isAllOfficesMode } from '@/shared/utilities/office';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/core/permissions/hooks';
import { isModuleEnabled } from '@/core/feature-flags/store';
import { ModuleIcon, SectionIcon } from '@/shared/icons';
import type { ModuleDefinition } from '@/shared/types/module';
import { BranchMenu } from './BranchMenu';
import {
  useNavigationModel,
} from '@/shared/navigation/useNavigationModel';
import { resolveActiveNavigation, isSectionActive, isBranchActive, type NavSection } from '@/shared/navigation/model';
import {
  CalendarDays,
  ChevronDown,
  LogOut,
  Search,
  Shield,
  UserCheck,
  Menu,
  Building2,
  Sun,
  Moon,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from './Toast';
import { useEffect, useState, useRef, useMemo } from 'react';

interface HeaderProps {
  modules: ModuleDefinition[];
  onOpenCommandPalette?: () => void;
}

type Align = 'left' | 'right';

export function Header({ modules, onOpenCommandPalette }: HeaderProps) {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const officeName = useOfficeName();
  const { isAdmin, isLoading } = usePermissions();
  const location = useLocation();
  const activeFinancialYear = useUIStore((s) => s.activeFinancialYear);
  const setActiveFinancialYear = useUIStore((s) => s.setActiveFinancialYear);
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const { sections } = useNavigationModel(modules);

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [pinnedSection, setPinnedSection] = useState<string | null>(null);
  const [suppressAutoOpen, setSuppressAutoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMobileSection, setOpenMobileSection] = useState<string | null>(null);
  const [openMobileBranch, setOpenMobileBranch] = useState<string | null>(null);
  const [pendingFY, setPendingFY] = useState<number | null>(null);
  const [switchingFY, setSwitchingFY] = useState(false);
  const [alignments, setAlignments] = useState<Record<string, Align>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLDivElement>());
  const hoverTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const currentPath = location.pathname + location.search;
  const currentBasePath = currentPath.split('?')[0];

  const activeNav = resolveActiveNavigation(sections, currentBasePath);

  const dashboardModule = useMemo(() => {
    if (isAdmin || isLoading) return null;
    const m = modules.find((x) => x.id === 'dashboard');
    if (!m) return null;
    if (m.featureFlag && !isModuleEnabled(m.featureFlag)) return null;
    return m;
  }, [modules, isAdmin, isLoading]);

  /* Keep the branch panel open while the user works inside a module:
     every navigation (or the model becoming ready) re-anchors it to the
     section/branch matching the URL, EXCEPT navigations initiated from
     inside the dropdown (those already close the panel). Rendered as a
     render-phase adjustment so the panel follows navigation without
     effect-driven state churn. */
  const navIdentity = `${currentBasePath}|sections:${sections.length}`;
  const [lastNavIdentity, setLastNavIdentity] = useState('');
  if (lastNavIdentity !== navIdentity) {
    setLastNavIdentity(navIdentity);
    if (activeNav?.section && !suppressAutoOpen) {
      setOpenSection(activeNav.section.key);
      setPinnedSection(activeNav.section.key);
      const sectionIndex = sections.indexOf(activeNav.section);
      if (sectionIndex >= 3) {
        setAlignments((prev) => ({ ...prev, [activeNav.section.key]: 'right' }));
      }
    }
    if (suppressAutoOpen) setSuppressAutoOpen(false);
  }

  const fyLabel = (y: number) => `FY ${y}-${String(y + 1).slice(-2)}`;

  const nowYear = new Date().getFullYear();
  const fyOptions: number[] = [];
  for (let y = nowYear - 4; y <= nowYear + 1; y++) fyOptions.push(y);
  if (!fyOptions.includes(activeFinancialYear)) {
    fyOptions.push(activeFinancialYear);
    fyOptions.sort((a, b) => a - b);
  }

  useEffect(() => {
    let cancelled = false;
    financialYearRepository
      .getCurrent()
      .then((year) => {
        if (cancelled) return;
        if (Number.isInteger(year) && year !== useUIStore.getState().activeFinancialYear) {
          setActiveFinancialYear(year);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setActiveFinancialYear]);

  const handleFYChange = async (year: number) => {
    const previous = useUIStore.getState().activeFinancialYear;
    setActiveFinancialYear(year);
    if (isAllOfficesMode()) {
      toast.info(
        `Viewing merged data for FY ${fyLabel(year)}. The financial year is saved per office in Admin Settings.`
      );
      return;
    }
    try {
      await financialYearRepository.set(year);
      toast.success(`Financial year changed to ${fyLabel(year)}`);
    } catch (error) {
      setActiveFinancialYear(previous);
      toast.error(error instanceof Error ? error.message : 'Failed to change financial year');
    }
  };

  const handleFYSelect = (year: number) => {
    if (year === activeFinancialYear) return;
    setPendingFY(year);
  };

  const confirmFYChange = async () => {
    if (pendingFY === null) return;
    setSwitchingFY(true);
    await handleFYChange(pendingFY);
    setSwitchingFY(false);
    setPendingFY(null);
  };

  const initials = user?.email
    ? user.email
        .split('@')[0]
        .split(/[._-]/)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const clearTimer = (timerRef: { current: number | null }) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const openSectionPanel = (sectionKey: string) => {
    setOpenSection(sectionKey);
    /* Anchor the panel to its top-nav trigger and mirror it near the
       right edge of the viewport so the panel never clips. */
    const el = triggerRefs.current.get(sectionKey);
    if (el) {
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const align: Align = center > window.innerWidth / 2 ? 'right' : 'left';
      setAlignments((prev) => (prev[sectionKey] === align ? prev : { ...prev, [sectionKey]: align }));
    }
  };

  /* Hovering a top-nav item opens its branch panel (after a short delay
     when nothing is open, immediately when switching between sections).
     Clicking pins the panel open so it survives moving the mouse away. */
  const handleTriggerEnter = (sectionKey: string) => {
    clearTimer(closeTimerRef);
    if (pinnedSection !== sectionKey) setPinnedSection(null);
    if (openSection !== sectionKey) {
      clearTimer(hoverTimerRef);
      hoverTimerRef.current = window.setTimeout(() => openSectionPanel(sectionKey), 120);
    }
  };

  const handleTriggerLeave = () => {
    clearTimer(hoverTimerRef);
  };

  const handleNavEnter = () => {
    clearTimer(closeTimerRef);
  };

  const handleNavLeave = () => {
    clearTimer(hoverTimerRef);
    if (pinnedSection) return;
    closeTimerRef.current = window.setTimeout(() => setOpenSection(null), 220);
  };

  const handleTriggerClick = (sectionKey: string) => {
    clearTimer(hoverTimerRef);
    clearTimer(closeTimerRef);
    if (openSection === sectionKey && pinnedSection === sectionKey) {
      setPinnedSection(null);
      setOpenSection(null);
      return;
    }
    setPinnedSection(sectionKey);
    openSectionPanel(sectionKey);
  };

  /* Clicking a branch/sub-branch closes the dropdown and suppresses the
     auto-reopen for the navigation that follows. The timeout clears the
     suppression in case the navigation went to the current page (no URL
     change, so the render-phase adjustment never runs). */
  const closeBranchPanel = () => {
    clearTimer(hoverTimerRef);
    clearTimer(closeTimerRef);
    setPinnedSection(null);
    setOpenSection(null);
    setSuppressAutoOpen(true);
    window.setTimeout(() => setSuppressAutoOpen(false), 0);
  };

  const handleBranchNavigate = (path: string) => {
    closeBranchPanel();
    navigate(path);
  };

  const closeNavMenus = () => {
    setMobileNavOpen(false);
    clearTimer(hoverTimerRef);
    clearTimer(closeTimerRef);
    setPinnedSection(null);
    setOpenSection(null);
    setMenuOpen(false);
  };

  const handleMobileToggle = () => {
    const next = !mobileNavOpen;
    setMobileNavOpen(next);
    if (next) {
      const active = resolveActiveNavigation(sections, currentBasePath);
      if (active) {
        setOpenMobileSection(active.section.key);
        setOpenMobileBranch(active.branch.key);
      }
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setPinnedSection(null);
        setOpenSection(null);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        let closed = false;
        if (openSection) { setPinnedSection(null); setOpenSection(null); closed = true; }
        if (menuOpen) { setMenuOpen(false); closed = true; }
        if (mobileNavOpen) { setMobileNavOpen(false); closed = true; }
        if (closed) e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [openSection, menuOpen, mobileNavOpen, setMobileNavOpen]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const renderBranchPanel = (section: NavSection) => (
    <BranchMenu
      section={section}
      align={alignments[section.key] ?? 'left'}
      selectedBranchKey={activeNav?.branch.key ?? null}
      currentBasePath={currentBasePath}
      onNavigateTo={handleBranchNavigate}
      onClosePanel={closeBranchPanel}
    />
  );

  if (isLoading) {
    return null;
  }

  return (
    <>
      <header className="topnav-header">
        {/* Left: Brand + Office + Mobile toggle */}
        <div className="topnav-header-left">
          <button
            onClick={handleMobileToggle}
            className="topnav-mobile-toggle lg:hidden"
            title="Toggle Navigation Menu"
            aria-label="Toggle navigation"
          >
            <Menu size={19} />
          </button>

          <Link
            to="/"
            onClick={closeNavMenus}
            className="topnav-brand flex items-center gap-3"
            title="Go to Home"
          >
            <span className="topnav-brand-logo">
              <img src="/logo.svg" alt="Account Branch Logo" className="topnav-logo-icon" />
            </span>
            <span className="topnav-brand-text hidden sm:inline">Account Branch</span>
          </Link>

          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500">
            <Building2 size={13} className="text-indigo-500 shrink-0" />
            <span className="font-medium truncate max-w-[200px]">{officeName || 'ICDP Surat'}</span>
          </div>
        </div>

        {/* Center: Primary inline nav (desktop) */}
        <nav
          className="topnav-nav"
          ref={navRef}
          aria-label="Primary navigation"
          onMouseEnter={handleNavEnter}
          onMouseLeave={handleNavLeave}
        >
          {dashboardModule && (
            <NavLink
              to="/dashboard"
              onClick={closeNavMenus}
              className={({ isActive }) =>
                `topnav-nav-trigger ${isActive ? 'topnav-nav-trigger-active' : ''}`
              }
            >
              <SectionIcon id="overview" size={15} />
              <span>Dashboard</span>
            </NavLink>
          )}
          {sections.map((section) => {
            const isOpen = openSection === section.key;
            const isActive = isSectionActive(section, currentBasePath);
            return (
              <div
                key={section.key}
                ref={(el) => {
                  if (el) triggerRefs.current.set(section.key, el);
                  else triggerRefs.current.delete(section.key);
                }}
                className="topnav-nav-item"
              >
                <button
                  type="button"
                  onClick={() => handleTriggerClick(section.key)}
                  onMouseEnter={() => handleTriggerEnter(section.key)}
                  onMouseLeave={handleTriggerLeave}
                  onFocus={() => handleTriggerEnter(section.key)}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  className={`topnav-nav-trigger ${isActive ? 'topnav-nav-trigger-active' : ''}`}
                >
                  <SectionIcon id={section.icon} size={15} />
                  <span>{section.label}</span>
                  <ChevronDown size={13} className={`topnav-nav-chevron ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && renderBranchPanel(section)}
              </div>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="topnav-header-actions">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
            className="topnav-action-btn"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            className="topnav-action-btn topnav-search-btn"
            title="Search pages and employees (Ctrl+K)"
            onClick={() => onOpenCommandPalette?.()}
          >
            <Search size={13} className="text-indigo-500" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="topnav-kbd">Ctrl+K</kbd>
          </button>

          {activeFinancialYear && (
            <div className="relative inline-flex items-center">
              <CalendarDays size={13} className="pointer-events-none absolute left-3 text-emerald-600" />
              <select
                value={activeFinancialYear}
                onChange={(e) => handleFYSelect(Number(e.target.value))}
                className="topnav-fy-select"
                title="Select active financial year (applies across all modules)"
              >
                {fyOptions.map((y) => (
                  <option key={y} value={y} className="bg-white text-slate-800">
                    FY {y}-{String(y + 1).slice(-2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {user?.role === 'admin' && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">
              <Shield size={11} />
              Admin
            </span>
          )}
          {user?.role === 'office' && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border bg-teal-50 text-teal-700 border-teal-200">
              <UserCheck size={11} />
              Office
            </span>
          )}

          <div className="relative" ref={menuRef}>
            <button
              className="topnav-user-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title={user?.email || ''}
              aria-label="User menu"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="topnav-user-dropdown">
                <div className="topnav-user-dropdown-header">
                  <p className="topnav-user-dropdown-label">Signed in as</p>
                  <p className="topnav-user-dropdown-email">{user?.email}</p>
                  <div className="topnav-user-status">
                    <span className="topnav-user-status-dot" />
                    <span className="topnav-user-status-text capitalize">{user?.role || 'User'}</span>
                  </div>
                </div>
                <div className="topnav-user-dropdown-body">
                  <button
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    className="topnav-signout-btn"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      <div
        className={`topnav-mobile-panel ${mobileNavOpen ? 'topnav-mobile-panel-open' : ''}`}
        onMouseLeave={() => setMobileNavOpen(false)}
      >
        <nav className="topnav-mobile-nav">
          <ul className="topnav-mobile-nav-list">
            {dashboardModule && (
              <li>
                <NavLink to="/dashboard" onClick={closeNavMenus} className="topnav-mobile-subitem">
                  <span className="topnav-mobile-subitem-icon">
                    <SectionIcon id="overview" size={14} />
                  </span>
                  <span>Dashboard</span>
                </NavLink>
              </li>
            )}
            {sections.map((section) => {
              const sectionIsActive = isSectionActive(section, currentBasePath);
              const isOpen = openMobileSection === section.key;
              return (
                <li key={section.key}>
                  <button
                    type="button"
                    onClick={() => setOpenMobileSection(isOpen ? null : section.key)}
                    className={`topnav-mobile-group ${
                      sectionIsActive ? 'topnav-mobile-group-active' : ''
                    }`}
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      size={15}
                      className="transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    />
                  </button>
                  <ul
                    className={`topnav-mobile-submenu ${!isOpen ? 'topnav-mobile-submenu-closed' : ''}`}
                  >
                    {section.branches.map((branch) => {
                      const branchIsActive = isBranchActive(branch, currentBasePath);
                      const branchIsOpen = openMobileBranch === branch.key;
                      const hasChildren = branch.subBranches.length > 0;
                      return (
                        <li key={branch.key}>
                          <button
                            type="button"
                            onClick={() => setOpenMobileBranch(branchIsOpen ? null : branch.key)}
                            className={`topnav-mobile-branch ${
                              branchIsActive ? 'topnav-mobile-branch-active' : ''
                            }`}
                          >
                            <span className="topnav-mobile-subitem-icon">
                              <ModuleIcon id={branch.icon || 'dashboard'} size={14} />
                            </span>
                            <span>{branch.label}</span>
                            {hasChildren && (
                              <ChevronDown
                                size={14}
                                className="ml-auto transition-transform duration-200"
                                style={{ transform: branchIsOpen ? 'rotate(180deg)' : 'none' }}
                              />
                            )}
                          </button>
                          {hasChildren ? (
                            <ul
                              className={`topnav-mobile-submenu topnav-mobile-submenu-level3 ${
                                !branchIsOpen ? 'topnav-mobile-submenu-closed' : ''
                              }`}
                            >
                              {branch.subBranches.map((subBranch) => (
                                <li key={subBranch.path}>
                                  <NavLink
                                    to={subBranch.path}
                                    onClick={closeNavMenus}
                                    className="topnav-mobile-subitem"
                                  >
                                    {subBranch.icon && (
                                      <span className="topnav-mobile-subitem-icon">
                                        <ModuleIcon id={subBranch.icon} size={14} />
                                      </span>
                                    )}
                                    <span>{subBranch.label}</span>
                                  </NavLink>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <NavLink
                              to={branch.defaultPath}
                              onClick={closeNavMenus}
                              className="topnav-mobile-subitem"
                            >
                              <span className="topnav-mobile-subitem-icon">
                                <ModuleIcon id={branch.icon || 'dashboard'} size={14} />
                              </span>
                              <span>{branch.label}</span>
                            </NavLink>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <ConfirmDialog
        open={pendingFY !== null}
        title="Switch Financial Year"
        confirmLabel="Switch Year"
        busy={switchingFY}
        onConfirm={confirmFYChange}
        onCancel={() => setPendingFY(null)}
        message={
          <>
            Are you sure you want to switch the active financial year from{' '}
            <b>{fyLabel(activeFinancialYear)}</b> to <b>{pendingFY != null ? fyLabel(pendingFY) : ''}</b>?
            <br />
            <span className="text-slate-500">
              This applies across all modules (payroll, reports, and vendors).
            </span>
          </>
        }
      />
    </>
  );
}