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
    { path: '/paybill/employee', label: 'Pay Ledger (Treasury)', icon: 'user', subtitle: '12-month Treasury pay ledger by HRPN' },
    { path: '/paybill/self-assessment', label: 'Self Assessment Memo', icon: 'calculator', subtitle: 'Income-Tax computation & advance TDS projection memo' },
    { path: '/paybill/form16', label: 'Form-16', icon: 'file-text' },
    { path: '/paybill/history', label: 'Import History', icon: 'history' },
    { path: '/paybill/components', label: 'Component Master', icon: 'layers' },
  ],
};

export default moduleDefinition;
