import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const ReportsPage = lazyNamedExport(() => import('./pages/ReportsPage'), 'ReportsPage');

export const reportsRoutes: RouteDefinition[] = [
  { path: '/reports', element: <Navigate to="/reports/24q" replace /> },
  { path: '/reports/:tab', element: <ReportsPage /> },
];
