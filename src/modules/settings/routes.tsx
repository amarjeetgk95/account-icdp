import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteDefinition } from '@/shared/types/module';

const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

export const settingsRoutes: RouteDefinition[] = [
  { path: '/settings', element: <Navigate to="/settings/office" replace /> },
  { path: '/settings/:tab', element: <SettingsPage /> },
];
