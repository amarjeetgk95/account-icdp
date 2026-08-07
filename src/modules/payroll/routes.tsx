import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const PayrollPage = lazy(() =>
  import('./pages/PayrollPage').then((m) => ({ default: m.PayrollPage }))
);

export const payrollRoutes: RouteDefinition[] = [
  {
    path: '/payroll',
    element: <PayrollPage />,
  },
];
