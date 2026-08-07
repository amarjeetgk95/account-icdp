import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const PartiesPage = lazy(() =>
  import('./pages/PartiesPage').then((m) => ({ default: m.PartiesPage }))
);

export const partiesRoutes: RouteDefinition[] = [
  {
    path: '/parties',
    element: <PartiesPage />,
  },
];
