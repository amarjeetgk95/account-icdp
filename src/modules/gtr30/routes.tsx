import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const GTR30ListPage = lazy(() =>
  import('./pages/GTR30ListPage').then((m) => ({ default: m.GTR30ListPage }))
);
const GTR30CreatePage = lazy(() =>
  import('./pages/GTR30CreatePage').then((m) => ({ default: m.GTR30CreatePage }))
);
const GTR30ViewPage = lazy(() =>
  import('./pages/GTR30ViewPage').then((m) => ({ default: m.GTR30ViewPage }))
);
const GTR30SettingsPage = lazy(() =>
  import('./pages/GTR30SettingsPage').then((m) => ({ default: m.GTR30SettingsPage }))
);
const GTR30EmployeeMasterPage = lazy(() =>
  import('./pages/GTR30EmployeeMasterPage').then((m) => ({ default: m.GTR30EmployeeMasterPage }))
);
const GTR30LaunchPage = lazy(() =>
  import('./pages/GTR30LaunchPage').then((m) => ({ default: m.GTR30LaunchPage }))
);

export const gtr30Routes: RouteDefinition[] = [
  { path: '/gtr30/list', element: <GTR30ListPage /> },
  { path: '/gtr30/create', element: <GTR30LaunchPage /> },
  { path: '/gtr30/edit/:id', element: <GTR30CreatePage /> },
  { path: '/gtr30/view/:id', element: <GTR30ViewPage /> },
  { path: '/gtr30/settings', element: <GTR30SettingsPage /> },
  { path: '/gtr30/employee-master', element: <GTR30EmployeeMasterPage /> },
];
