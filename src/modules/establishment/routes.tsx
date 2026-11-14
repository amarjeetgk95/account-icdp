import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const EstablishmentRegisterPage = lazyNamedExport(
  () => import('./pages/EstablishmentRegisterPage'),
  'EstablishmentRegisterPage'
);
const EstablishmentDirectoryPage = lazyNamedExport(
  () => import('./pages/EstablishmentDirectoryPage'),
  'EstablishmentDirectoryPage'
);
const EstablishmentReportPage = lazyNamedExport(
  () => import('./pages/EstablishmentReportPage'),
  'EstablishmentReportPage'
);
const EstablishmentParityPage = lazyNamedExport(
  () => import('./pages/EstablishmentParityPage'),
  'EstablishmentParityPage'
);
const EstablishmentEmployeePage = lazyNamedExport(
  () => import('./pages/EstablishmentEmployeePage'),
  'EstablishmentEmployeePage'
);
const EstablishmentPostMasterPage = lazyNamedExport(
  () => import('./pages/EstablishmentPostMasterPage'),
  'EstablishmentPostMasterPage'
);

export const establishmentRoutes: RouteDefinition[] = [
  // Section 1: Post Management (governed by Position No. 1..N)
  { path: '/establishment', element: <EstablishmentRegisterPage /> },
  { path: '/establishment/posts', element: <EstablishmentRegisterPage /> },
  { path: '/establishment/register', element: <EstablishmentRegisterPage /> },

  // Dedicated Post Name, Pay Scale & Cadre Class Master
  { path: '/establishment/posts/master', element: <EstablishmentPostMasterPage /> },
  { path: '/establishment/cadres', element: <EstablishmentPostMasterPage /> },

  // Section 2: Employee Registration (canonical HRPN, Form 16 / TDS preservation)
  { path: '/establishment/employees', element: <EstablishmentDirectoryPage /> },
  { path: '/establishment/employees/new', element: <EstablishmentEmployeePage /> },
  { path: '/establishment/employees/edit/:id', element: <EstablishmentEmployeePage /> },

  // Statutory Reports
  { path: '/establishment/reports', element: <EstablishmentReportPage /> },

  // Register Parity
  { path: '/establishment/parity', element: <EstablishmentParityPage /> },
];
