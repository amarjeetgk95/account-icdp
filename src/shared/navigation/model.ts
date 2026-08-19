import type { ModuleDefinition } from '@/shared/types/module';
import { isModuleEnabled } from '@/core/feature-flags/store';

/**
 * Three-level hierarchical navigation model:
 *   Level 1 — Top navigation section (NavSection)
 *   Level 2 — Branch (NavBranch): major functional area under a section
 *   Level 3 — Sub-branch (NavSubBranch): child options of a branch
 */

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
  defaultPath: string;
  routePaths: string[];
  subBranches: NavSubBranch[];
}

export interface NavSection {
  key: string;
  label: string;
  icon: string;
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
  match: (m: ModuleDefinition) => boolean;
}

const NAV_GROUPS: NavGroupConfig[] = [
  { key: 'bills', label: 'Bill Creation', icon: 'receipt', match: (m) => m.navGroup === 'bills' },
  { key: 'tds', label: 'TDS', icon: 'calculator', match: (m) => m.navGroup === 'tds' },
  { key: 'it-employee', label: 'Employee IT', icon: 'file-spreadsheet', match: (m) => m.navGroup === 'it-employee' },
  { key: 'tools', label: 'Doc Tools', icon: 'file-text', match: (m) => m.navGroup === 'tools' },
];

const SYSTEM_GROUP: NavGroupConfig = { key: 'system', label: 'System', icon: 'settings', match: () => true };
const ADMIN_GROUP: NavGroupConfig = { key: 'admin', label: 'Admin Console', icon: 'users', match: () => true };

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
    branches: visibleModules.filter(group.match).map(toBranch),
  })).filter((section) => section.branches.length > 0);

  const systemModules = visibleModules.filter((m) => m.navGroup === 'system');
  if (systemModules.length > 0) {
    sections.push({
      key: SYSTEM_GROUP.key,
      label: SYSTEM_GROUP.label,
      icon: SYSTEM_GROUP.icon,
      branches: systemModules.map(toBranch),
    });
  }

  const adminModules = visibleModules.filter((m) => m.navGroup === 'admin');
  if (options.isAdmin && adminModules.length > 0) {
    sections.push({
      key: ADMIN_GROUP.key,
      label: ADMIN_GROUP.label,
      icon: ADMIN_GROUP.icon,
      branches: adminModules.map(toBranch),
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