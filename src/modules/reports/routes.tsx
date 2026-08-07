import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);

export const reportsRoutes: RouteDefinition[] = [
  {
    path: '/reports',
    element: <ReportsPage />,
  },
];
