import type { ModuleDefinition } from '@/shared/types/module';
import { adminRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'admin',
  name: 'Admin',
  icon: '🛡️',
  navGroup: 'admin',
  permissions: ['admin'],
  routes: adminRoutes,
  sidebar: true,
  featureFlag: 'admin_module',
  order: 10,
};

export default moduleDefinition;
