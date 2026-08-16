import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteDefinition } from '@/shared/types/module';

const PayrollPage = lazy(() =>
  import('./pages/PayrollPage').then((m) => ({ default: m.PayrollPage }))
);

export const payrollRoutes: RouteDefinition[] = [
  { path: '/payroll', element: <Navigate to="/payroll/entry" replace /> },
  { path: '/payroll/:tab', element: <PayrollPage /> },
];
