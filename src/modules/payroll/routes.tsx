import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const PayrollPage = lazyNamedExport(() => import('./pages/PayrollPage'), 'PayrollPage');

export const payrollRoutes: RouteDefinition[] = [
  { path: '/payroll', element: <Navigate to="/payroll/entry" replace /> },
  // Single integrated register lives in Establishment — the payroll duplicate
  // list is gone. Old bookmarks land on the canonical table.
  { path: '/payroll/employees', element: <Navigate to="/establishment" replace /> },
  { path: '/payroll/:tab', element: <PayrollPage /> },
];
