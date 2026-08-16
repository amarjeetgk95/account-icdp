import type { ModuleDefinition } from '@/shared/types/module';
import { paybillRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'it-employee',
  name: 'Employee IT',
  icon: 'file-spreadsheet',
  navGroup: 'it-employee',
  permissions: ['office'],
  routes: paybillRoutes,
  sidebar: true,
  featureFlag: 'paybill_module',
  order: 1,
  children: [
    { path: '/paybill/matrix', label: '12-Month Matrix', icon: 'bar-chart' },
    { path: '/paybill/employee', label: 'Employee Ledger', icon: 'user' },
    { path: '/paybill/components', label: 'Component Master', icon: 'layers' },
  ],
};

export default moduleDefinition;
