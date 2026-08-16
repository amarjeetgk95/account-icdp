import { describe, it, expect } from 'vitest';
import type { ModuleDefinition } from '@/shared/types/module';
import {
  buildNavigationModel,
  resolveActiveNavigation,
  isSectionActive,
  isBranchActive,
  matchesRoute,
  type NavSection,
} from './model';

function makeModule(overrides: Partial<ModuleDefinition> & { id: string }): ModuleDefinition {
  return {
    name: overrides.id,
    navGroup: 'tds',
    routes: [{ path: `/${overrides.id}`, element: null }],
    sidebar: true,
    featureFlag: 'payroll_module',
    ...overrides,
  } as ModuleDefinition;
}

const modules: ModuleDefinition[] = [
  makeModule({
    id: 'payroll',
    name: 'Salary TDS (24Q)',
    icon: 'payroll',
    navGroup: 'tds',
    featureFlag: 'payroll_module',
    order: 1,
    children: [
      { path: '/payroll/entry', label: 'Monthly Entry', icon: 'file-spreadsheet' },
      { path: '/payroll/report', label: 'Quarterly Report', icon: 'file-text' },
    ],
  }),
  makeModule({
    id: 'parties',
    name: 'Vendor TDS (26Q)',
    icon: 'parties',
    navGroup: 'tds',
    featureFlag: 'parties_module',
    order: 2,
    children: [{ path: '/parties/overview', label: 'Overview', icon: 'overview' }],
  }),
  makeModule({
    id: 'gtr44',
    name: 'GTR-44 DC Bills',
    icon: 'receipt',
    navGroup: 'bills',
    featureFlag: 'gtr44_module',
    order: 1,
    routes: [
      { path: '/gtr44/create', element: null },
      { path: '/gtr44/list', element: null },
      { path: '/gtr44/edit/:id', element: null },
      { path: '/gtr44/view/:id', element: null },
    ],
    children: [
      { path: '/gtr44/create', label: 'Create DC Bill', icon: 'file-plus' },
      { path: '/gtr44/list', label: 'Bills Register', icon: 'receipt' },
    ],
  }),
  makeModule({
    id: 'dashboard',
    name: 'Dashboard Overview',
    icon: 'dashboard',
    navGroup: 'overview',
    featureFlag: 'dashboard_module',
    order: 1,
  }),
  makeModule({
    id: 'admin',
    name: 'Admin',
    icon: 'admin',
    navGroup: 'admin',
    permissions: ['admin'],
    featureFlag: 'admin_module',
    order: 10,
    children: [
      { path: '/admin/overview', label: 'Overview', icon: 'overview' },
      { path: '/admin/users', label: 'User Management', icon: 'users' },
    ],
  }),
  makeModule({
    id: 'hidden',
    name: 'Hidden Module',
    icon: 'settings',
    navGroup: 'tds',
    sidebar: false,
    featureFlag: 'payroll_module',
  }),
];

describe('buildNavigationModel', () => {
  it('builds three-level sections grouped by navGroup, skipping overview/main', () => {
    const model = buildNavigationModel(modules, { isAdmin: false, isLoading: false });
    const keys = model.sections.map((s) => s.key);
    expect(keys).toEqual(['bills', 'tds']);

    const tds = model.sections.find((s) => s.key === 'tds') as NavSection;
    expect(tds.label).toBe('TDS');
    expect(tds.branches.map((b) => b.key)).toEqual(['payroll', 'parties']);

    const payroll = tds.branches[0];
    expect(payroll.subBranches.map((s) => s.label)).toEqual(['Monthly Entry', 'Quarterly Report']);
    expect(payroll.defaultPath).toBe('/payroll/entry');
  });

  it('skips hidden modules (sidebar: false)', () => {
    const model = buildNavigationModel(modules, { isAdmin: false, isLoading: false });
    const tds = model.sections.find((s) => s.key === 'tds') as NavSection;
    expect(tds.branches.map((b) => b.key)).not.toContain('hidden');
  });

  it('exposes the dashboard only for non-admin roles', () => {
    const office = buildNavigationModel(modules, { isAdmin: false, isLoading: false });
    expect(office.dashboardEnabled).toBe(true);

    const admin = buildNavigationModel(modules, { isAdmin: true, isLoading: false });
    expect(admin.dashboardEnabled).toBe(false);
    expect(admin.sections.map((s) => s.key)).toEqual(['admin']);
  });

  it('returns an empty model while role info is loading', () => {
    const model = buildNavigationModel(modules, { isAdmin: false, isLoading: true });
    expect(model.sections).toEqual([]);
    expect(model.dashboardEnabled).toBe(false);
  });

  it('drops sections with no visible branches', () => {
    const onlyAdmin = modules.filter((m) => m.id === 'admin');
    const model = buildNavigationModel(onlyAdmin, { isAdmin: false, isLoading: false });
    expect(model.sections).toEqual([]);
  });
});

describe('resolveActiveNavigation', () => {
  const model = buildNavigationModel(modules, { isAdmin: false, isLoading: false });

  it('resolves section, branch and sub-branch from a child path', () => {
    const active = resolveActiveNavigation(model.sections, '/payroll/report');
    expect(active?.section.key).toBe('tds');
    expect(active?.branch.key).toBe('payroll');
    expect(active?.subBranch?.path).toBe('/payroll/report');
  });

  it('resolves a branch when the path only matches the module route', () => {
    const active = resolveActiveNavigation(model.sections, '/gtr44/view/42');
    expect(active?.branch.key).toBe('gtr44');
    expect(active?.subBranch).toBeNull();
  });

  it('returns null for paths outside the navigation', () => {
    expect(resolveActiveNavigation(model.sections, '/unknown/page')).toBeNull();
  });

  it('matches parameterised routes by prefix', () => {
    const withParams = buildNavigationModel(
      [
        makeModule({
          id: 'gtr44',
          navGroup: 'bills',
          routes: [{ path: '/gtr44/edit/:id', element: null }],
        }),
      ],
      { isAdmin: false, isLoading: false }
    );
    const active = resolveActiveNavigation(withParams.sections, '/gtr44/edit/7');
    expect(active?.branch.key).toBe('gtr44');
  });
});

describe('matchesRoute', () => {
  it('matches exact and parameterised paths', () => {
    expect(matchesRoute('/payroll/entry', '/payroll/entry')).toBe(true);
    expect(matchesRoute('/payroll/:tab', '/payroll/entry')).toBe(true);
    expect(matchesRoute('/payroll/entry', '/payroll/report')).toBe(false);
    expect(matchesRoute('/gtr44/edit/:id', '/gtr44/edit/99')).toBe(true);
  });
});

describe('isSectionActive / isBranchActive', () => {
  const model = buildNavigationModel(modules, { isAdmin: false, isLoading: false });

  it('flags the section and branch containing the current path', () => {
    const tds = model.sections.find((s) => s.key === 'tds') as NavSection;
    expect(isSectionActive(tds, '/payroll/entry')).toBe(true);
    expect(isBranchActive(tds.branches[0], '/payroll/entry')).toBe(true);
    expect(isBranchActive(tds.branches[1], '/payroll/entry')).toBe(false);
  });

  it('flags routes with query strings via the caller-stripped base path', () => {
    const tds = model.sections.find((s) => s.key === 'tds') as NavSection;
    const basePath = '/payroll/entry?tab=employees'.split('?')[0];
    expect(isBranchActive(tds.branches[0], basePath)).toBe(true);
  });
});