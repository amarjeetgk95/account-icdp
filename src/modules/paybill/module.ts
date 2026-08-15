import type { ModuleDefinition } from '@/shared/types/module';
import { paybillRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'paybill',
  name: 'Pay Bill PDF Import',
  navGroup: 'bills',
  permissions: ['office'],
  routes: paybillRoutes,
  sidebar: true,
  featureFlag: 'paybill_module',
  order: 2,
};

export default moduleDefinition;
