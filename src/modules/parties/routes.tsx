import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteDefinition } from '@/shared/types/module';

const PartiesPage = lazy(() =>
  import('./pages/PartiesPage').then((m) => ({ default: m.PartiesPage }))
);

export const partiesRoutes: RouteDefinition[] = [
  { path: '/parties', element: <Navigate to="/parties/overview" replace /> },
  { path: '/parties/:tab', element: <PartiesPage /> },
];
