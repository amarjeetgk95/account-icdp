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
      subtitle: 'Create users, assign roles, and review admin activity',
    },
    {
      path: '/admin/offices',
      label: 'Office Management',
      icon: 'offices',
      subtitle: 'Register offices and edit office details',
    },
    {
      path: '/admin/reports',
      label: 'Data Entry & Reports',
      icon: 'reports',
      subtitle: 'Cross-office data-entry summary and report drill-down',
    },
  ],
};

export default moduleDefinition;
