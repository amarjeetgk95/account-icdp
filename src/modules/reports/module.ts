import type { ModuleDefinition } from '@/shared/types/module';
import { reportsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'reports',
  name: 'Reports',
  navGroup: 'reports',
  routes: reportsRoutes,
  sidebar: true,
  featureFlag: 'reports_module',
  order: 4,
};

export default moduleDefinition;
