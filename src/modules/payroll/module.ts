import type { ModuleDefinition } from '@/shared/types/module';
import { payrollRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'payroll',
  name: 'Payroll',
  icon: '💰',
  navGroup: 'main',
  routes: payrollRoutes,
  sidebar: true,
  featureFlag: 'payroll_module',
  order: 2,
};

export default moduleDefinition;
