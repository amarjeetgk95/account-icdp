import type { ModuleDefinition } from '@/shared/types/module';
import { reportsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'reports',
  name: 'TDS Reports & Returns',
  icon: 'reports',
  navGroup: 'tds',
  permissions: ['office'],
  routes: reportsRoutes,
  sidebar: true,
  featureFlag: 'reports_module',
  order: 3,
};

export default moduleDefinition;
