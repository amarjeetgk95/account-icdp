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
  {
    id: 'pdf-tools',
    name: 'OCR & PDF Tools',
    icon: 'scan-text',
    navGroup: 'tools',
    routes: [{ path: '/pdf-tools/ocr', element: <div>OCR</div> }],
    sidebar: true,
    featureFlag: 'pdf_tools_module',
    order: 1,
    children: [
      { path: '/pdf-tools/ocr', label: 'OCR Document Studio', icon: 'file-spreadsheet' },
      { path: '/pdf-tools/editor', label: 'PDF Workbench', icon: 'layers' },
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
        officeId: 'office-1',
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

    expect(screen.getByText('ACCOUNT BRANCH')).toBeDefined();
    expect(screen.getByText('ICDP SURAT, GUJARAT')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Bill Creation')).toBeDefined();
    expect(screen.getByText('TDS')).toBeDefined();
    expect(screen.getByText('Doc Tools')).toBeDefined();
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

  it('renders single-branch module (Doc Tools) directly in Level 2 without 3rd branch bifurcation', () => {
    renderWithProviders(<Header modules={mockModules} />, '/dashboard');

    const toolsBtn = screen.getByRole('button', { name: /doc tools/i });
    fireEvent.click(toolsBtn);

    // Direct items inside Level 2 dropdown
    expect(screen.getByText('OCR Document Studio')).toBeDefined();
    expect(screen.getByText('PDF Workbench')).toBeDefined();
  });

  it('renders financial year selector and search trigger', () => {
    const onOpenCommandPalette = vi.fn();
    renderWithProviders(<Header modules={mockModules} onOpenCommandPalette={onOpenCommandPalette} />, '/dashboard');

    expect(screen.getByTitle('Financial Year')).toBeDefined();
    const searchBtn = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchBtn);
    expect(onOpenCommandPalette).toHaveBeenCalled();
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
});
