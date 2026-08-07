import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);

export const adminRoutes: RouteDefinition[] = [
  {
    path: '/admin',
    element: <AdminPage />,
  },
];
