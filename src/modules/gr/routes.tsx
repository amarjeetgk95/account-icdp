import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const GRListPage = lazy(() =>
  import('./components/GRListPage').then((m) => ({ default: m.GRListPage }))
);

export const grRoutes: RouteDefinition[] = [
  {
    path: '/gr-repository',
    element: <GRListPage />,
  },
  {
    path: '/gr-repository/*',
    element: <GRListPage />,
  },
];
