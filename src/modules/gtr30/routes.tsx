import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const GTR30ListPage = lazyNamedExport(() => import('./pages/GTR30ListPage'), 'GTR30ListPage');
const GTR30CreatePage = lazyNamedExport(() => import('./pages/GTR30CreatePage'), 'GTR30CreatePage');
const GTR30ViewPage = lazyNamedExport(() => import('./pages/GTR30ViewPage'), 'GTR30ViewPage');
const GTR30SettingsPage = lazyNamedExport(() => import('./pages/GTR30SettingsPage'), 'GTR30SettingsPage');
const GTR30EmployeeManagementPage = lazyNamedExport(
  () => import('./pages/GTR30EmployeeManagementPage'),
  'GTR30EmployeeManagementPage'
);
const GTR30EmployeeFormPage = lazyNamedExport(
  () => import('./pages/GTR30EmployeeFormPage'),
  'GTR30EmployeeFormPage'
);
const GTR30LaunchPage = lazyNamedExport(() => import('./pages/GTR30LaunchPage'), 'GTR30LaunchPage');

export const gtr30Routes: RouteDefinition[] = [
  { path: '/gtr30/list', element: <GTR30ListPage /> },
  { path: '/gtr30/create', element: <GTR30LaunchPage /> },
  { path: '/gtr30/edit/:id', element: <GTR30CreatePage /> },
  { path: '/gtr30/view/:id', element: <GTR30ViewPage /> },
  { path: '/gtr30/settings', element: <GTR30SettingsPage /> },
  { path: '/gtr30/employee-management', element: <GTR30EmployeeManagementPage /> },
  { path: '/gtr30/employee-management/new', element: <GTR30EmployeeFormPage /> },
  { path: '/gtr30/employee-management/edit/:employeeId', element: <GTR30EmployeeFormPage /> },
  // Legacy route redirects
  { path: '/gtr30/employee-registration', element: <Navigate to="/gtr30/employee-management" replace /> },
  { path: '/gtr30/employee-master', element: <Navigate to="/gtr30/employee-management" replace /> },
];
