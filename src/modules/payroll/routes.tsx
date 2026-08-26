import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const PayrollPage = lazyNamedExport(() => import('./pages/PayrollPage'), 'PayrollPage');

export const payrollRoutes: RouteDefinition[] = [
  { path: '/payroll', element: <Navigate to="/payroll/entry" replace /> },
  { path: '/payroll/:tab', element: <PayrollPage /> },
];
