import type { ModuleDefinition } from '@/shared/types/module';
import { settingsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'settings',
  name: 'Settings',
  icon: '⚙️',
  navGroup: 'main',
  routes: settingsRoutes,
  sidebar: true,
  featureFlag: 'settings_module',
};

export default moduleDefinition;
