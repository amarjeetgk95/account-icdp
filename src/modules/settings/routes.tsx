import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

export const settingsRoutes: RouteDefinition[] = [
  {
    path: '/settings',
    element: <SettingsPage />,
  },
];
