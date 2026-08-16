import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteDefinition } from '@/shared/types/module';

const AdminOverviewPage = lazy(() =>
  import('./pages/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage }))
);
const AdminUsersPage = lazy(() =>
  import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminReportsPage = lazy(() =>
  import('./pages/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }))
);
const AdminImportsPage = lazy(() =>
  import('./pages/AdminImportsPage').then((m) => ({ default: m.AdminImportsPage }))
);
const AdminComponentsPage = lazy(() =>
  import('./pages/AdminComponentsPage').then((m) => ({ default: m.AdminComponentsPage }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);
const AdminAuditPage = lazy(() =>
  import('@/modules/adminaudit/pages/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage }))
);

export const adminRoutes: RouteDefinition[] = [
  {
    path: '/admin',
    element: <Navigate to="/admin/overview" replace />,
  },
  {
    path: '/admin/overview',
    element: <AdminOverviewPage />,
  },
  {
    path: '/admin/users',
    element: <AdminUsersPage />,
  },
  {
    path: '/admin/reports',
    element: <AdminReportsPage />,
  },
  {
    path: '/admin/imports',
    element: <AdminImportsPage />,
  },
  {
    path: '/admin/components',
    element: <AdminComponentsPage />,
  },
  {
    path: '/admin/audit',
    element: <AdminAuditPage />,
  },
  {
    path: '/admin/settings',
    element: <AdminSettingsPage />,
  },
];