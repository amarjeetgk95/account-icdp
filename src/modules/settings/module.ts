import type { ModuleDefinition } from '@/shared/types/module';
import { settingsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'settings',
  name: 'Settings',
  navGroup: 'system',
  permissions: ['office'],
  routes: settingsRoutes,
  sidebar: true,
  featureFlag: 'settings_module',
  order: 5,
  children: [
    { path: '/settings/office', label: 'Office Details', icon: 'settings' },
  ],
};

export default moduleDefinition;
