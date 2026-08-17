import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const AdminOverviewPage = lazyNamedExport(() => import('./pages/AdminOverviewPage'), 'AdminOverviewPage');
const AdminUsersPage = lazyNamedExport(() => import('./pages/AdminUsersPage'), 'AdminUsersPage');
const AdminReportsPage = lazyNamedExport(() => import('./pages/AdminReportsPage'), 'AdminReportsPage');
const AdminImportsPage = lazyNamedExport(() => import('./pages/AdminImportsPage'), 'AdminImportsPage');
const AdminComponentsPage = lazyNamedExport(() => import('./pages/AdminComponentsPage'), 'AdminComponentsPage');
const AdminSettingsPage = lazyNamedExport(() => import('./pages/AdminSettingsPage'), 'AdminSettingsPage');
const AdminAuditPage = lazyNamedExport(
  () => import('@/modules/adminaudit/pages/AdminAuditPage'),
  'AdminAuditPage'
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