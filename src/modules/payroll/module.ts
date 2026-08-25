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
  children: [
    { path: '/payroll/entry', label: 'Monthly Entry', icon: 'file-spreadsheet' },
    { path: '/payroll/report', label: 'Quarterly Report', icon: 'file-text' },
    { path: '/payroll/reconciliation', label: 'Tax Reconciliation', icon: 'file-text' },
    { path: '/payroll/budget', label: 'Budget Head Report', icon: 'layers' },
    { path: '/payroll/lookup', label: 'Employee Lookup', icon: 'users' },
    { path: '/payroll/employees', label: 'Employee Registration', icon: 'users' },
  ],
};

export default moduleDefinition;
