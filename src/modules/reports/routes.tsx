import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteDefinition } from '@/shared/types/module';

const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);

export const reportsRoutes: RouteDefinition[] = [
  { path: '/reports', element: <Navigate to="/reports/24q" replace /> },
  { path: '/reports/:tab', element: <ReportsPage /> },
];
