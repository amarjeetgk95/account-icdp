import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const PayBillImportPage = lazyNamedExport(() => import('./pages/PayBillImportPage'), 'PayBillImportPage');
const PayBillHistoryPage = lazyNamedExport(() => import('./pages/PayBillHistoryPage'), 'PayBillHistoryPage');
const Form16Page = lazyNamedExport(() => import('./pages/Form16Page'), 'Form16Page');
const PayBillLegacyDataEditor = lazyNamedExport(() => import('./components/PayBillLegacyDataEditor'), 'PayBillLegacyDataEditor');

export const paybillRoutes: RouteDefinition[] = [
  { path: '/paybill-import', element: <Navigate to="/paybill/matrix" replace /> },
  { path: '/paybill/history', element: <PayBillHistoryPage /> },
  { path: '/paybill/legacy-edit', element: <PayBillLegacyDataEditor /> },
  // Explicit route must precede the /paybill/:tab catch-all
  { path: '/paybill/form16', element: <Form16Page /> },
  { path: '/paybill/:tab', element: <PayBillImportPage /> },
];
