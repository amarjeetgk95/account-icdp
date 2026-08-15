import type { ModuleDefinition } from '@/shared/types/module';
import { payrollRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'payroll',
  name: 'Salary TDS (24Q)',
  icon: 'payroll',
  navGroup: 'tds',
  permissions: ['office'],
  routes: payrollRoutes,
  sidebar: true,
  featureFlag: 'payroll_module',
  order: 1,
};

export default moduleDefinition;
