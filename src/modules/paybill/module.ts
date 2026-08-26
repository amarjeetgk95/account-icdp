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
    { path: '/paybill/matrix', label: 'Monthly Register', icon: 'bar-chart' },
    { path: '/paybill/employee', label: 'Employee Ledger', icon: 'user' },
    { path: '/paybill/form16', label: 'Form-16', icon: 'file-text' },
    { path: '/paybill/history', label: 'Import History', icon: 'history' },
    { path: '/paybill/components', label: 'Component Master', icon: 'layers' },
  ],
};

export default moduleDefinition;
