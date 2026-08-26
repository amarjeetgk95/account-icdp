import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const PartiesPage = lazyNamedExport(() => import('./pages/PartiesPage'), 'PartiesPage');

export const partiesRoutes: RouteDefinition[] = [
  { path: '/parties', element: <Navigate to="/parties/overview" replace /> },
  { path: '/parties/:tab', element: <PartiesPage /> },
];
