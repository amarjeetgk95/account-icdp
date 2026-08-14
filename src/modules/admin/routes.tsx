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
const AdminOfficesPage = lazy(() =>
  import('./pages/AdminOfficesPage').then((m) => ({ default: m.AdminOfficesPage }))
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
    path: '/admin/offices',
    element: <AdminOfficesPage />,
  },
  {
    path: '/admin/reports',
    element: <AdminReportsPage />,
  },
];