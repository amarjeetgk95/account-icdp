import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const GTR44SettingsPage = lazy(() =>
  import('./pages/GTR44SettingsPage').then((m) => ({ default: m.GTR44SettingsPage }))
);
const GTR44ListPage = lazy(() =>
  import('./pages/GTR44ListPage').then((m) => ({ default: m.GTR44ListPage }))
);
const GTR44CreatePage = lazy(() =>
  import('./pages/GTR44CreatePage').then((m) => ({ default: m.GTR44CreatePage }))
);
const GTR44ViewPage = lazy(() =>
  import('./pages/GTR44ViewPage').then((m) => ({ default: m.GTR44ViewPage }))
);

export const gtr44Routes: RouteDefinition[] = [
  {
    path: '/gtr44/settings',
    element: <GTR44SettingsPage />,
  },
  {
    path: '/gtr44/list',
    element: <GTR44ListPage />,
  },
  {
    path: '/gtr44/create',
    element: <GTR44CreatePage />,
  },
  {
    path: '/gtr44/edit/:id',
    element: <GTR44CreatePage />,
  },
  {
    path: '/gtr44/view/:id',
    element: <GTR44ViewPage />,
  },
];
