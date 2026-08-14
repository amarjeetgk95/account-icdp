import type { ModuleDefinition } from '@/shared/types/module';
import { partiesRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'parties',
  name: 'Vendor',
  navGroup: 'tds',
  permissions: ['office'],
  routes: partiesRoutes,
  sidebar: true,
  featureFlag: 'parties_module',
  order: 3,
};

export default moduleDefinition;
