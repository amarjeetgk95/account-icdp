import type { ModuleDefinition } from '@/shared/types/module';
import { isModuleEnabled } from '@/core/feature-flags/store';

/**
 * Three-level hierarchical navigation model:
 *   Level 1 — Top navigation section (NavSection)
 *   Level 2 — Branch (NavBranch): major functional area under a section
 *   Level 3 — Sub-branch (NavSubBranch): child options of a branch
 */

export type ColorFamily = 'blue' | 'emerald' | 'purple' | 'amber' | 'teal' | 'slate';

interface NavSubBranch {
  path: string;
  label: string;
  icon?: string;
  subtitle?: string;
}

export interface NavBranch {
  key: string;
  label: string;
  icon?: string;
  colorFamily?: ColorFamily;
  defaultPath: string;
  routePaths: string[];
  subBranches: NavSubBranch[];
}

export interface NavSection {
  key: string;
  label: string;
  icon: string;
  colorFamily: ColorFamily;
  branches: NavBranch[];
}

export interface NavigationModel {
  sections: NavSection[];
  dashboardEnabled: boolean;
}

interface NavGroupConfig {
  key: string;
  label: string;
  icon: string;
  colorFamily: ColorFamily;
  match: (m: ModuleDefinition) => boolean;
}

const NAV_GROUPS: NavGroupConfig[] = [
  { key: 'bills', label: 'Bill Creation', icon: 'receipt', colorFamily: 'emerald', match: (m) => m.navGroup === 'bills' },
  { key: 'tds', label: 'TDS', icon: 'calculator', colorFamily: 'blue', match: (m) => m.navGroup === 'tds' },
  { key: 'it-employee', label: 'Employee IT', icon: 'file-spreadsheet', colorFamily: 'purple', match: (m) => m.navGroup === 'it-employee' },
  { key: 'tools', label: 'Doc Tools', icon: 'file-text', colorFamily: 'teal', match: (m) => m.navGroup === 'tools' },
];

const SYSTEM_GROUP: NavGroupConfig = { key: 'system', label: 'System', icon: 'settings', colorFamily: 'slate', match: () => true };
const ADMIN_GROUP: NavGroupConfig = { key: 'admin', label: 'Admin Console', icon: 'users', colorFamily: 'amber', match: () => true };

export function matchesRoute(routePath: string, currentBasePath: string): boolean {
  if (routePath === currentBasePath) return true;
  const paramIndex = routePath.indexOf(':');
  if (paramIndex > 0 && currentBasePath.startsWith(routePath.slice(0, paramIndex))) return true;
  return false;
}

function toBranch(module: ModuleDefinition): NavBranch {
  const subBranches: NavSubBranch[] = (module.children ?? []).map((child) => ({
    path: child.path,
    label: child.label,
    icon: child.icon,
    subtitle: child.subtitle,
  }));
  const defaultPath = subBranches[0]?.path ?? module.routes[0]?.path ?? '';
  const routePaths = [...subBranches.map((s) => s.path), ...module.routes.map((r) => r.path)];
  return {
    key: module.id,
    label: module.name,
    icon: module.icon,
    defaultPath,
    routePaths,
    subBranches,
  };
}

function isModuleVisible(m: ModuleDefinition, isAdmin: boolean): boolean {
  if (m.sidebar === false) return false;
  if (m.navGroup === 'overview' || m.navGroup === 'main') return false;
  if (!m.featureFlag || !isModuleEnabled(m.featureFlag)) return false;
  if (m.permissions?.includes('admin') && !isAdmin) return false;
  if (isAdmin) return m.navGroup === 'admin';
  return true;
}

export function buildNavigationModel(
  modules: ModuleDefinition[],
  options: { isAdmin: boolean; isLoading: boolean }
): NavigationModel {
  if (options.isLoading) return { sections: [], dashboardEnabled: false };

  const visibleModules = modules.filter((m) => isModuleVisible(m, options.isAdmin));

  const sections: NavSection[] = NAV_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    icon: group.icon,
    colorFamily: group.colorFamily,
    branches: visibleModules.filter(group.match).map((m) => ({
      ...toBranch(m),
      colorFamily: group.colorFamily,
    })),
  })).filter((section) => section.branches.length > 0);

  const systemModules = visibleModules.filter((m) => m.navGroup === 'system');
  if (systemModules.length > 0) {
    sections.push({
      key: SYSTEM_GROUP.key,
      label: SYSTEM_GROUP.label,
      icon: SYSTEM_GROUP.icon,
      colorFamily: SYSTEM_GROUP.colorFamily,
      branches: systemModules.map((m) => ({
        ...toBranch(m),
        colorFamily: SYSTEM_GROUP.colorFamily,
      })),
    });
  }

  const adminModules = visibleModules.filter((m) => m.navGroup === 'admin');
  if (options.isAdmin && adminModules.length > 0) {
    sections.push({
      key: ADMIN_GROUP.key,
      label: ADMIN_GROUP.label,
      icon: ADMIN_GROUP.icon,
      colorFamily: ADMIN_GROUP.colorFamily,
      branches: adminModules.map((m) => ({
        ...toBranch(m),
        colorFamily: ADMIN_GROUP.colorFamily,
      })),
    });
  }

  const dashboardModule = modules.find((m) => m.id === 'dashboard');
  const dashboardEnabled =
    !options.isAdmin &&
    !!dashboardModule &&
    (!dashboardModule.featureFlag || isModuleEnabled(dashboardModule.featureFlag));

  return { sections, dashboardEnabled };
}

export interface ActiveNavigation {
  section: NavSection;
  branch: NavBranch;
  subBranch: NavSubBranch | null;
}

export function resolveActiveNavigation(
  sections: NavSection[],
  currentBasePath: string
): ActiveNavigation | null {
  for (const section of sections) {
    for (const branch of section.branches) {
      const subBranch = branch.subBranches.find((s) => matchesRoute(s.path, currentBasePath)) ?? null;
      if (subBranch) return { section, branch, subBranch };
      if (branch.routePaths.some((p) => matchesRoute(p, currentBasePath))) {
        return { section, branch, subBranch: null };
      }
    }
  }
  return null;
}

export function isBranchActive(branch: NavBranch, currentBasePath: string): boolean {
  return branch.routePaths.some((p) => matchesRoute(p, currentBasePath));
}

export function isSectionActive(section: NavSection, currentBasePath: string): boolean {
  return section.branches.some((b) => isBranchActive(b, currentBasePath));
}

export interface SubNavTab {
  path: string;
  label: string;
  icon?: string;
  isActive: boolean;
}

export function getActiveSubNavTabs(
  model: NavigationModel,
  currentPath: string
): { sectionTitle: string; tabs: SubNavTab[] } | null {
  const activeNav = resolveActiveNavigation(model.sections, currentPath);
  if (!activeNav) return null;

  const { section, branch } = activeNav;

  // Case 1: If branch has sub-branches (e.g., GTR-30, GTR-44, Admin, PayBill)
  if (branch.subBranches && branch.subBranches.length > 1) {
    return {
      sectionTitle: branch.label,
      tabs: branch.subBranches.map((sub) => ({
        path: sub.path,
        label: sub.label,
        icon: sub.icon,
        isActive: matchesRoute(sub.path, currentPath),
      })),
    };
  }

  // Case 2: If section has multiple branches (e.g., TDS with Payroll, Reports, Settings)
  if (section.branches && section.branches.length > 1) {
    return {
      sectionTitle: section.label,
      tabs: section.branches.map((b) => ({
        path: b.defaultPath,
        label: b.label,
        icon: b.icon,
        isActive: isBranchActive(b, currentPath),
      })),
    };
  }

  return null;
}

export interface BreadcrumbStep {
  label: string;
  path: string;
  icon?: string;
  colorFamily: ColorFamily;
  level: 1 | 2 | 3;
}

export function resolveBreadcrumbTrail(
  model: NavigationModel,
  currentPath: string
): BreadcrumbStep[] {
  const steps: BreadcrumbStep[] = [];

  if (currentPath === '/dashboard' || currentPath === '/') {
    return [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', colorFamily: 'blue', level: 1 },
    ];
  }

  const activeNav = resolveActiveNavigation(model.sections, currentPath);
  if (!activeNav) {
    return steps;
  }

  const { section, branch, subBranch } = activeNav;

  // Level 1: Section (Module)
  steps.push({
    label: section.label,
    path: section.branches[0]?.defaultPath ?? branch.defaultPath,
    icon: section.icon,
    colorFamily: section.colorFamily || 'blue',
    level: 1,
  });

  // Level 2: Primary Branch
  steps.push({
    label: branch.label,
    path: branch.defaultPath,
    icon: branch.icon,
    colorFamily: branch.colorFamily || 'emerald',
    level: 2,
  });

  // Level 3: Sub-Branch / Specific Action
  if (subBranch && subBranch.label !== branch.label) {
    steps.push({
      label: subBranch.label,
      path: subBranch.path,
      icon: subBranch.icon,
      colorFamily: 'blue',
      level: 3,
    });
  }

  return steps;
}