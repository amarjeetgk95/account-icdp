import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import type { ModuleDefinition } from '@/shared/types/module';

vi.mock('@/core/feature-flags/store', () => ({
  isModuleEnabled: () => true,
}));

vi.mock('@/modules/settings/hooks/useOfficeName', () => ({
  useOfficeName: () => 'ICDP SURAT, GUJARAT',
}));

const mockModules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    icon: 'dashboard',
    navGroup: 'overview',
    routes: [{ path: '/dashboard', element: <div>Dashboard</div> }],
    sidebar: false,
    order: 0,
  },
  {
    id: 'gtr44',
    name: 'GTR-44 DC Bills',
    icon: 'receipt',
    navGroup: 'bills',
    routes: [{ path: '/gtr44/create', element: <div>Create DC Bill</div> }],
    sidebar: true,
    featureFlag: 'gtr44_module',
    order: 1,
    children: [
      { path: '/gtr44/create', label: 'Create DC Bill', icon: 'file-plus' },
      { path: '/gtr44/list', label: 'DC Bills Register', icon: 'list' },
    ],
  },
  {
    id: 'gtr30',
    name: 'GTR-30 Pay Bills',
    icon: 'receipt',
    navGroup: 'bills',
    routes: [{ path: '/gtr30/create', element: <div>New Pay Bill</div> }],
    sidebar: true,
    featureFlag: 'gtr30_module',
    order: 2,
    children: [
      { path: '/gtr30/create', label: 'New Pay Bill', icon: 'file-plus' },
    ],
  },
  {
    id: 'payroll',
    name: 'Salary TDS (24Q)',
    icon: 'payroll',
    navGroup: 'tds',
    routes: [{ path: '/payroll/entry', element: <div>Salary Entry</div> }],
    sidebar: true,
    featureFlag: 'payroll_module',
    order: 1,
    children: [
      { path: '/payroll/entry', label: 'Monthly Entry', icon: 'file-spreadsheet' },
    ],
  },

];

function renderWithProviders(ui: React.ReactElement, initialPath = '/dashboard') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Header Cascading Flyout Navigation', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'office-1',
        email: 'officer@account-icdp.gov.in',
        role: 'office',
      },
      isRoleLoaded: true,
      isLoading: false,
    });

    useUIStore.setState({
      activeFinancialYear: 2024,
      theme: 'light',
    });
  });

  it('renders department emblem and level 1 module navigation buttons', () => {
    renderWithProviders(<Header modules={mockModules} />, '/dashboard');

    expect(screen.getByText('ICDP ACCOUNT')).toBeDefined();
    expect(screen.getByText('ICDP SURAT, GUJARAT')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Bill Creation')).toBeDefined();
    expect(screen.getByText('TDS')).toBeDefined();
  });

  it('opens Level 2 dropdown and Level 3 cascading sub-flyout on multi-branch module click (Bill Creation)', () => {
    renderWithProviders(<Header modules={mockModules} />, '/dashboard');

    const billsBtn = screen.getByRole('button', { name: /bill creation/i });
    fireEvent.click(billsBtn);

    // Level 2 branches appear
    expect(screen.getByText('GTR-44 DC Bills')).toBeDefined();
    expect(screen.getByText('GTR-30 Pay Bills')).toBeDefined();

    // Level 3 child page appears in cascading flyout
    expect(screen.getByText('Create DC Bill')).toBeDefined();
    expect(screen.getByText('DC Bills Register')).toBeDefined();
  });

  it('renders TDS section branches correctly', () => {
    renderWithProviders(<Header modules={mockModules} />, '/dashboard');

    const tdsBtn = screen.getByRole('button', { name: /TDS/i });
    fireEvent.click(tdsBtn);

    // Single-branch TDS section renders child directly (Case A in Header.tsx:451)
    expect(screen.getByText('Monthly Entry')).toBeDefined();
  });

  it('renders financial year selector', () => {
    renderWithProviders(<Header modules={mockModules} />, '/dashboard');

    expect(screen.getByTitle('Financial Year')).toBeDefined();
    expect(screen.queryByRole('button', { name: /search/i })).toBeNull();
  });

  it('renders user profile menu with sign out button', () => {
    renderWithProviders(<Header modules={mockModules} />, '/dashboard');

    const userBtn = screen.getByTitle('User menu');
    fireEvent.click(userBtn);

    expect(screen.getByText('officer@account-icdp.gov.in')).toBeDefined();
    // Sign out is rendered as menuitem for a11y (role="menuitem") inside the user menu
    const signOut = screen.queryByRole('menuitem', { name: /sign out/i }) || screen.queryByRole('button', { name: /sign out/i });
    expect(signOut).toBeDefined();
    expect(signOut).not.toBeNull();
  });

  it('reflects financial year in top nav as a badge linking to settings and moves Master Settings to profile menu', () => {
    const modulesWithSettings: ModuleDefinition[] = [
      ...mockModules,
      {
        id: 'settings',
        name: 'Master Settings',
        icon: 'settings',
        navGroup: 'system',
        routes: [{ path: '/settings/office', element: <div>Settings</div> }],
        sidebar: true,
        featureFlag: 'settings_module',
        order: 9,
        children: [
          { path: '/settings/office', label: 'Office & DDO Master', icon: 'settings' },
        ],
      },
    ];

    renderWithProviders(<Header modules={modulesWithSettings} />, '/dashboard');

    // 1. Master Settings is NOT in the top nav buttons
    expect(screen.queryByRole('button', { name: /master settings/i })).toBeNull();

    // 2. Financial Year reflects in top nav as a link badge
    const fyBadge = screen.getByTitle('Financial Year');
    expect(fyBadge).toBeDefined();
    expect(fyBadge.textContent).toContain('FY 2024-25');
    expect(fyBadge.getAttribute('href')).toBe('/settings/office');

    // 3. Opening profile menu reveals Master Settings
    const userBtn = screen.getByTitle('User menu');
    fireEvent.click(userBtn);
    expect(screen.getByText('Master Settings')).toBeDefined();
    expect(screen.getByText('Office & DDO Master')).toBeDefined();
  });
});
