import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const EstablishmentDirectoryPage = lazyNamedExport(
  () => import('./pages/EstablishmentDirectoryPage'),
  'EstablishmentDirectoryPage'
);
const EstablishmentEmployeePage = lazyNamedExport(
  () => import('./pages/EstablishmentEmployeePage'),
  'EstablishmentEmployeePage'
);
const EstablishmentPostsPage = lazyNamedExport(
  () => import('./pages/EstablishmentPostsPage'),
  'EstablishmentPostsPage'
);

export const establishmentRoutes: RouteDefinition[] = [
  { path: '/establishment', element: <EstablishmentDirectoryPage /> },
  { path: '/establishment/posts', element: <EstablishmentPostsPage /> },
  { path: '/establishment/employees/new', element: <EstablishmentEmployeePage /> },
  { path: '/establishment/employees/edit/:id', element: <EstablishmentEmployeePage /> },
];
