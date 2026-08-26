import type { ModuleDefinition } from '@/shared/types/module';
import { dashboardRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'dashboard',
  name: 'Dashboard Overview',
  icon: 'dashboard',
  navGroup: 'overview',
  permissions: ['office'],
  routes: dashboardRoutes,
  sidebar: true,
  featureFlag: 'dashboard_module',
  order: 1,
};

export default moduleDefinition;
