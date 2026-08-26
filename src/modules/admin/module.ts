import type { ModuleDefinition } from '@/shared/types/module';
import { adminRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'admin',
  name: 'Admin',
  navGroup: 'admin',
  permissions: ['admin'],
  routes: adminRoutes,
  sidebar: true,
  featureFlag: 'admin_module',
  order: 10,
  children: [
    {
      path: '/admin/overview',
      label: 'Overview',
      icon: 'overview',
      subtitle: 'System metrics, monthly completion, and office summaries',
    },
    {
      path: '/admin/users',
      label: 'User Management',
      icon: 'users',
      subtitle: 'Create users, assign roles and offices',
    },
    {
      path: '/admin/reports',
      label: 'Data Entry & Reports',
      icon: 'reports',
      subtitle: 'Cross-office data-entry summary and report drill-down',
    },
    {
      path: '/admin/imports',
      label: 'Import Monitoring',
      icon: 'upload',
      subtitle: 'Salary and paybill import health across all offices',
    },
    {
      path: '/admin/components',
      label: 'Component Master',
      icon: 'layers',
      subtitle: 'Global payroll component and alias management (admin only)',
    },
    {
      path: '/admin/audit',
      label: 'Audit Trail',
      icon: 'audit',
      subtitle: 'System-wide activity logs, user operations, and security audit trail',
    },
    {
      path: '/admin/settings',
      label: 'System Settings',
      icon: 'settings',
      subtitle: 'Global defaults and office configuration',
    },
  ],
};

export default moduleDefinition;
