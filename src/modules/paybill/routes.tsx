import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const PayBillImportPage = lazy(() =>
  import('./pages/PayBillImportPage').then((m) => ({ default: m.PayBillImportPage }))
);

export const paybillRoutes: RouteDefinition[] = [
  {
    path: '/paybill-import',
    element: <PayBillImportPage />,
  },
];