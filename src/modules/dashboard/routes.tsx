import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);

export const dashboardRoutes: RouteDefinition[] = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
];
