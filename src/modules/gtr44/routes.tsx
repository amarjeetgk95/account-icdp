import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const GTR44ModulePage = lazy(() =>
  import('./pages/GTR44ModulePage').then((m) => ({ default: m.GTR44ModulePage }))
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
    path: '/gtr44',
    element: <GTR44ModulePage />,
  },
  {
    path: '/gtr44/entry',
    element: <GTR44ModulePage />,
  },
  {
    path: '/gtr44/preview',
    element: <GTR44ModulePage />,
  },
  {
    path: '/gtr44/pdf',
    element: <GTR44ModulePage />,
  },
  {
    path: '/gtr44/settings',
    element: <GTR44ModulePage />,
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
