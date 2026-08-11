import { lazy } from 'react';
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

export const adminRoutes: RouteDefinition[] = [
  {
    path: '/admin',
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
];
