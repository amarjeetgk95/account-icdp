import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteDefinition } from '@/shared/types/module';

const PayBillImportPage = lazy(() =>
  import('./pages/PayBillImportPage').then((m) => ({ default: m.PayBillImportPage }))
);

export const paybillRoutes: RouteDefinition[] = [
  { path: '/paybill-import', element: <Navigate to="/paybill/matrix" replace /> },
  { path: '/paybill/:tab', element: <PayBillImportPage /> },
];
