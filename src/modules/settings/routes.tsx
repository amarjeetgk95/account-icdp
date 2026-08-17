import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const SettingsPage = lazyNamedExport(() => import('./pages/SettingsPage'), 'SettingsPage');

export const settingsRoutes: RouteDefinition[] = [
  { path: '/settings', element: <Navigate to="/settings/office" replace /> },
  { path: '/settings/:tab', element: <SettingsPage /> },
];
