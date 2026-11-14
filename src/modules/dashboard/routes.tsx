import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const DashboardPage = lazyNamedExport(() => import('./pages/DashboardPage'), 'DashboardPage');

export const dashboardRoutes: RouteDefinition[] = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
];
