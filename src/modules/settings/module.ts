import type { ModuleDefinition } from '@/shared/types/module';
import { settingsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'settings',
  name: 'Settings',
  navGroup: 'main',
  permissions: ['office'],
  routes: settingsRoutes,
  sidebar: true,
  featureFlag: 'settings_module',
  order: 5,
};

export default moduleDefinition;
