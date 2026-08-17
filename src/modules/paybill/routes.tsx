import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const PayBillImportPage = lazyNamedExport(() => import('./pages/PayBillImportPage'), 'PayBillImportPage');

export const paybillRoutes: RouteDefinition[] = [
  { path: '/paybill-import', element: <Navigate to="/paybill/matrix" replace /> },
  { path: '/paybill/:tab', element: <PayBillImportPage /> },
];
